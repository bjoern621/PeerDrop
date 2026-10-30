import { FolderInfo, WebRTCConnection } from "./WebRTCConnection";
import {
    WebSocketService,
    ClientToken,
    normalizeClientToken,
} from "./WebSocketService";
import { MessageType } from "../types/MessageType";
import { Logger } from "../util/Logger";
import { EstablishConnectionMessage } from "../types/connection/EstablishConnectionMessage";
import { CloseConnectionMessage } from "../types/connection/CloseConnectionMessage";
import { PeerConnectMessage } from "../types/messaging/PeerConnectMessage";
import { ResumeConnectionMessage } from "../types/connection/ResumeConnectionMessage";
import { TransferTracker } from "./TransferTracker";
import { ReceivedFiles } from "./ReceivedFiles";

const CONNECT_TIMEOUT_MS = 10_000;

/** One file on its way to a peer. */
export interface OutgoingFile {
    file: File;
    uuid: string;
    folder?: FolderInfo;
}

interface PeerConnection {
    connection: WebRTCConnection;
    ownDevice: boolean;
    connected: boolean;
    // Whether the server pairs the two and forwards their signaling. A link
    // that outlived a server connection runs unpaired until both sides
    // claimed it again.
    paired: boolean;
}

interface QueuedFile extends OutgoingFile {
    startedAt: Date;
}

/**
 * Holds one WebRTC connection per peer. The server sets a connection up only
 * between peers that may exchange files: after the receiver accepted an offer,
 * or between two devices of the same account. Files for a peer without an open
 * connection wait in a queue until it is connected.
 *
 * A connection outlives a lost server connection while its direct link stays
 * up, so running transfers go on. Once both peers hold a server connection
 * again under their tokens, each claims the connection with a
 * ResumeConnectionMessage and the server pairs them again.
 */
export class PeerConnectionManager {
    private readonly logger = new Logger("PeerConnectionManager");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);

    private readonly peers = new Map<ClientToken, PeerConnection>();
    private readonly queues = new Map<ClientToken, QueuedFile[]>();
    // Peers asked for a connection that has not arrived yet, with the timer
    // that gives up on them.
    private readonly requested = new Map<
        ClientToken,
        ReturnType<typeof setTimeout>
    >();
    // Outgoing files kept for a restart after a failure.
    private readonly sentFiles = new Map<
        string,
        OutgoingFile & { remoteToken: ClientToken }
    >();

    /** Single source of truth for transfer progress, speed and status. */
    private readonly transferTracker = new TransferTracker();

    private readonly receivedFiles = new ReceivedFiles();

    private incomingGate: (remoteToken: ClientToken) => boolean = () => false;

    public constructor(private readonly signaling: WebSocketService) {
        this.logger.setEnabled(false);

        this.signaling.subscribeMessage<EstablishConnectionMessage>(
            MessageType.ESTABLISH_CONNECTION,
            message => this.handleEstablishConnection(message)
        );
        this.signaling.subscribeMessage<CloseConnectionMessage>(
            MessageType.CLOSE_CONNECTION,
            message => {
                const remoteToken = normalizeClientToken(
                    message.msg.remoteToken
                );
                const peer = this.peers.get(remoteToken);
                if (message.msg.gone && peer && hasLiveLink(peer)) {
                    this.log("Peer lost the server:", remoteToken);
                    peer.paired = false;
                    return;
                }
                this.log("Peer closed the connection:", remoteToken);
                this.dropPeer(remoteToken);
            }
        );
        this.signaling.subscribeMessage<ResumeConnectionMessage>(
            MessageType.RESUME_CONNECTION,
            message =>
                this.handleResumeClaim(
                    normalizeClientToken(message.msg.remoteToken)
                )
        );
    }

    /**
     * Decides whether a peer that is not an own device may send files here.
     * Asked for every incoming data channel.
     */
    public setIncomingGate(gate: (remoteToken: ClientToken) => boolean) {
        this.incomingGate = gate;
    }

    /**
     * Sends files to a peer. They start right away on an open connection;
     * otherwise they wait while the connection is set up.
     */
    public sendFiles(remoteToken: ClientToken, files: OutgoingFile[]) {
        remoteToken = normalizeClientToken(remoteToken);
        files.forEach(file =>
            this.sentFiles.set(file.uuid, { ...file, remoteToken })
        );
        this.enqueue(
            remoteToken,
            files.map(file => ({ ...file, startedAt: new Date() }))
        );
    }

    /** Restarts a failed outgoing transfer under its original row. */
    public retryTransfer(uuid: string) {
        const sent = this.sentFiles.get(uuid);
        const snapshot = this.transferTracker.get(uuid);
        if (!sent || !snapshot) {
            return;
        }
        this.enqueue(sent.remoteToken, [
            { ...sent, startedAt: snapshot.startedAt },
        ]);
    }

    /** Stops a transfer in either direction, queued or running. */
    public cancelTransfer(uuid: string) {
        const snapshot = this.transferTracker.get(uuid);
        if (!snapshot) {
            return;
        }

        const queue = this.queues.get(snapshot.remoteToken);
        const queued = queue?.findIndex(file => file.uuid === uuid) ?? -1;
        if (queue && queued >= 0) {
            queue.splice(queued, 1);
            this.transferTracker.setStatus(uuid, "canceled");
            return;
        }

        this.peers.get(snapshot.remoteToken)?.connection.cancelTransfer(uuid);
    }

    /** Closes the connection to a peer, e.g. after blocking it. */
    public closePeer(remoteToken: ClientToken) {
        remoteToken = normalizeClientToken(remoteToken);
        if (!this.peers.has(remoteToken)) {
            return;
        }
        this.signaling.sendMessage(new CloseConnectionMessage({ remoteToken }));
        this.dropPeer(remoteToken);
    }

    /** Closes every connection and tells the server, e.g. before this client signs in. */
    public closeAll() {
        Array.from(this.peers.keys()).forEach(token => this.closePeer(token));
    }

    /**
     * Forgets every connection without telling the server, which already
     * dropped them together with this client's previous token.
     */
    public reset() {
        Array.from(this.peers.keys()).forEach(token => this.dropPeer(token));
        this.forgetPending();
    }

    /**
     * Carries the connections whose direct link is up over to a new server
     * connection under the same token, and claims each of them at the server.
     * Forgets every other connection without telling the server, which
     * dropped them together with the previous server connection.
     * Returns the tokens of the peers kept.
     */
    public resumeLinks(): ClientToken[] {
        const kept: ClientToken[] = [];
        this.peers.forEach((peer, token) => {
            if (!hasLiveLink(peer)) {
                this.dropPeer(token);
                return;
            }
            peer.paired = false;
            kept.push(token);
            this.signaling.sendMessage(
                new ResumeConnectionMessage({ remoteToken: token })
            );
        });
        this.forgetPending();
        return kept;
    }

    /** Central transfer state consumed by the UI. */
    public getTransferTracker(): TransferTracker {
        return this.transferTracker;
    }

    /**
     * Saves a received file by UUID.
     * @returns true if the file was found and the download was triggered.
     */
    public redownloadFile(uuid: string): boolean {
        return this.receivedFiles.save(uuid);
    }

    /**
     * Saves all completed files of a received folder transfer, either into a
     * user-picked directory (Chromium) or as individual downloads.
     * @returns true if saving was started.
     */
    public async saveFolder(folderId: string): Promise<boolean> {
        return this.receivedFiles.saveFolder(folderId);
    }

    private enqueue(remoteToken: ClientToken, files: QueuedFile[]) {
        files.forEach(file =>
            this.transferTracker.start(file.uuid, {
                name: file.file.name,
                size: file.file.size,
                direction: "up",
                remoteToken,
                folderId: file.folder?.folderId,
                relativePath: file.folder?.relativePath,
                startedAt: file.startedAt,
            })
        );

        const queue = this.queues.get(remoteToken) ?? [];
        queue.push(...files);
        this.queues.set(remoteToken, queue);

        const peer = this.peers.get(remoteToken);
        if (peer?.connected) {
            this.flushQueue(remoteToken);
        } else if (!peer && !this.requested.has(remoteToken)) {
            // The server ignores the request when the peer left or never
            // allowed this client, so no connection ever arrives.
            this.requested.set(
                remoteToken,
                setTimeout(() => {
                    this.requested.delete(remoteToken);
                    if (!this.peers.has(remoteToken)) {
                        this.failQueue(remoteToken);
                    }
                }, CONNECT_TIMEOUT_MS)
            );
            this.signaling.sendMessage(
                new PeerConnectMessage({ to: remoteToken })
            );
        }
    }

    /** Files for an unpaired peer wait, since its token may name another client by now. */
    private flushQueue(remoteToken: ClientToken) {
        const peer = this.peers.get(remoteToken);
        const queue = this.queues.get(remoteToken);
        if (!peer || !queue || !peer.paired) {
            return;
        }
        this.queues.delete(remoteToken);
        queue.forEach(file =>
            peer.connection.sendFileOverDataChannel(
                file.file,
                file.uuid,
                file.folder,
                file.startedAt
            )
        );
    }

    private forgetPending() {
        Array.from(this.queues.keys()).forEach(token => this.failQueue(token));
        this.requested.forEach(timer => clearTimeout(timer));
        this.requested.clear();
    }

    /**
     * Answers the peer's claim of a live link and sends the files that waited
     * meanwhile. The server pairs the two on the second claim, so an answer
     * to a claim that confirms an own one goes unused.
     */
    private handleResumeClaim(remoteToken: ClientToken) {
        const peer = this.peers.get(remoteToken);
        if (!peer || peer.paired || !hasLiveLink(peer)) {
            return;
        }
        this.signaling.sendMessage(
            new ResumeConnectionMessage({ remoteToken })
        );
        peer.paired = true;
        this.flushQueue(remoteToken);
    }

    private failQueue(remoteToken: ClientToken) {
        this.queues
            .get(remoteToken)
            ?.forEach(file =>
                this.transferTracker.setStatus(file.uuid, "failed")
            );
        this.queues.delete(remoteToken);
    }

    private handleEstablishConnection(message: EstablishConnectionMessage) {
        const remoteToken = normalizeClientToken(message.msg.remoteToken);
        clearTimeout(this.requested.get(remoteToken));
        this.requested.delete(remoteToken);
        this.peers.get(remoteToken)?.connection.closeConnection();

        const ownDevice = message.msg.ownDevice;
        const connection = new WebRTCConnection(
            this.signaling,
            remoteToken,
            this.transferTracker,
            this.receivedFiles,
            message.msg.iceServers,
            () => ownDevice || this.incomingGate(remoteToken)
        );
        const peer: PeerConnection = {
            connection,
            ownDevice,
            connected: false,
            paired: true,
        };
        this.peers.set(remoteToken, peer);

        connection.subscribeTo("connectionstatechange", state => {
            this.log("Connection to", remoteToken, "is", state);
            if (state === "connected") {
                peer.connected = true;
                this.flushQueue(remoteToken);
            } else if (
                (state === "failed" ||
                    // An unpaired peer gets no close from the server.
                    // Its link going quiet counts as one.
                    (state === "disconnected" && !peer.paired)) &&
                this.peers.get(remoteToken) === peer
            ) {
                this.closePeer(remoteToken);
            }
        });
    }

    private dropPeer(remoteToken: ClientToken) {
        const peer = this.peers.get(remoteToken);
        this.peers.delete(remoteToken);
        peer?.connection.closeConnection();
        this.failQueue(remoteToken);
    }
}

function hasLiveLink(peer: PeerConnection): boolean {
    return peer.connection.getPeerConnection().connectionState === "connected";
}
