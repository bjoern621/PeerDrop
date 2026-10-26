import { assert } from "../util/Assert";
import errorAsValue, { errorAsValueSync } from "../util/ErrorAsValue";
import {
    ClientToken,
    MessageHandler,
    WebSocketService,
} from "./WebSocketService";
import { MessageType } from "../types/MessageType";
import { ITypedMessage } from "../types/ITypedMessage";
import { Logger } from "../util/Logger";
import { Observable } from "../util/observer/Observable";
import { IceCandidateMessage } from "../types/rtc/IceCandidateMessage";
import { SdpMessage } from "../types/rtc/SdpMessage";
import { TransferStatsMonitor } from "./TransferStats";
import { OpfsFileWriter } from "./OpfsFileWriter";
import { TransferTracker } from "./TransferTracker";
import { ReceivedFiles } from "./ReceivedFiles";
import { getSettings } from "./SettingsStore";
import { UsageReporter } from "./UsageReporter";
import { PeerLane } from "./PeerLane";
import { MAX_TRANSFER_LANES, PARALLEL_TRANSFER_LANES } from "../util/Constants";

/** Bytes of the little-endian chunk sequence number prefixing each binary message. */
const SEQUENCE_HEADER_BYTES = 4;

const FILE_CHUNK_READ_SIZE = 8 * 1024 * 1024; // 8 MB
const HIGH_WATER_MARK = 8 * 1024 * 1024; // 8 MB
const LOW_WATER_MARK = 2 * 1024 * 1024; // 2 MB

interface FileMeta {
    name: string;
    size: number;
    uuid: string;
    chunkCount: number;
    /** Payload bytes per full chunk; positions writes of unordered chunks. */
    chunkSize: number;
    /**
     * Path within a shared folder, including the folder name as first
     * segment. Absent for single-file transfers.
     */
    relativePath?: string;
    /** Groups files of the same folder transfer. Absent for single files. */
    folderId?: string;
}

/** Folder membership of an outgoing file. */
export interface FolderInfo {
    folderId: string;
    relativePath: string;
}

/** Reply the receiver sends on the file's channel once the file is complete. */
interface AckMessage {
    ack: string;
}

/** Either side stops the transfer of the file on its channel. */
interface CancelMessage {
    cancel: string;
}

/** Reassembly state of one incoming file transfer. */
interface ReceiveState {
    /**
     * Channel on lane 0; carries the metadata and the acknowledgement back.
     * Null while only chunks on further lanes have arrived.
     */
    dataChannel: RTCDataChannel | null;
    /** Channels of the same file on further lanes; they carry chunks only. */
    laneChannels: RTCDataChannel[];
    fileMeta: FileMeta | null;
    /** In-memory chunks; only used when OPFS is unavailable. */
    receivedChunks: ArrayBuffer[];
    /** Disk-backed writer; null when falling back to in-memory buffering. */
    opfsWriter: OpfsFileWriter | null;
    receivedBytes: number;
    receivedChunkCount: number;
    /** Chunks that arrived before the metadata message (the channel is unordered). */
    earlyChunks: ArrayBuffer[];
    finished: boolean;
}

export class WebRTCConnection {
    private readonly logger = new Logger("WebRTCConnection");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);
    private readonly remoteToken: ClientToken;
    private readonly signalingChannel: WebSocketService;
    private readonly peerConnection: RTCPeerConnection;
    private readonly transferStats: TransferStatsMonitor;
    private readonly usageReporter: UsageReporter;
    private readonly unsubscribeTransferEnded: () => void;

    private readonly eventHandlers: Map<string, Observable<unknown>> =
        new Map();

    // Reassembly state of incoming transfers, keyed by file UUID (= channel label).
    private readonly incomingTransfers: Map<string, ReceiveState> = new Map();
    // Channels of outgoing transfers still running, keyed by file UUID.
    private readonly outgoingChannels: Map<string, RTCDataChannel> = new Map();
    // Transfers stopped on purpose; their channel close is no failure.
    private readonly canceledTransfers: Set<string> = new Set();
    private readonly signalingUnsubscribes: (() => void)[] = [];

    // Peer connections to the remote peer by lane index. Lane 0 carries the
    // connection state, metadata and acknowledgements; further lanes carry
    // chunks of parallel transfers.
    private readonly lanes: Map<number, PeerLane> = new Map();
    private readonly iceServers: RTCIceServer[];
    // Set once a signaling message from the peer names its lane; peers
    // without lane support never get a second lane.
    private remoteSupportsLanes = false;
    private readonly polite: boolean;

    public constructor(
        signalingChannel: WebSocketService,
        remoteToken: ClientToken,
        private readonly transferTracker: TransferTracker,
        private readonly receivedFiles: ReceivedFiles,
        iceServers: RTCIceServer[],
        // Whether this peer may send files here; asked for every incoming channel.
        private readonly acceptsIncoming: () => boolean
    ) {
        this.logger.setEnabled(false); // Disable logging by default, can be enabled later if needed
        this.remoteToken = remoteToken;
        this.signalingChannel = signalingChannel;
        this.polite =
            signalingChannel.getLocalClientToken()! < this.remoteToken;
        this.iceServers = iceServers;
        this.peerConnection = this.createLane(0).peerConnection;
        this.transferStats = new TransferStatsMonitor(this.peerConnection);
        this.usageReporter = new UsageReporter(
            this.peerConnection,
            signalingChannel,
            this.polite
        );
        this.unsubscribeTransferEnded = transferTracker.subscribeEnded(
            ended => {
                if (
                    ended.remoteToken === this.remoteToken &&
                    ended.direction === "up" &&
                    ended.status !== "canceled"
                ) {
                    this.usageReporter.reportTransfer(
                        ended.status === "done" ? "completed" : "failed",
                        ended.bytesTransferred
                    );
                }
            }
        );

        this.peerConnection.onconnectionstatechange = () => {
            this.usageReporter.handleConnectionState(
                this.peerConnection.connectionState
            );
            this.emitEvent(
                "connectionstatechange",
                this.peerConnection.connectionState
            );
        };

        this.handleSDPPackage();
        this.handleRemoteICECandidates();

        void OpfsFileWriter.cleanupStaleFiles();

        this.initializePeerConnection();
    }

    /**
     * Sends a file to the remote peer over dedicated RTCDataChannels.
     *
     * The channels are reliable but unordered, which avoids SCTP head-of-line
     * blocking. Each binary message carries a 4-byte little-endian sequence
     * number followed by the payload; the receiver reassembles chunks by
     * sequence number and completes when all chunks announced in the metadata
     * have arrived. It then acknowledges the file on the lane 0 channel, and
     * the sender closes all channels of the file. A channel that closes before
     * the acknowledgement fails the transfer on the sender's side.
     *
     * With the parallelTransfers setting on and a peer that supports lanes,
     * the file gets one channel on each of PARALLEL_TRANSFER_LANES peer
     * connections. Metadata, acknowledgement and cancellation stay on lane 0.
     * Each chunk goes to the open channel with the fewest buffered bytes, so
     * lanes that are still connecting join the transfer once they open.
     *
     * The file is read in READ_SIZE slices via Blob.arrayBuffer() and sent in
     * messages as large as the negotiated SCTP maximum message size allows,
     * capped at 256 KB (16 KB fallback when the limit is unknown). Sending
     * pauses while every open channel buffers more than HIGH_WATER_MARK bytes
     * and resumes once one of them drains to LOW_WATER_MARK.
     *
     * @param file The file to be sent to the remote peer.
     * @param folder Folder membership when the file is part of a folder
     * transfer; carried in the metadata message so the receiver can rebuild
     * the folder structure.
     */
    public sendFileOverDataChannel(
        file: File,
        uuid: string,
        folder?: FolderInfo,
        startedAt?: Date
    ) {
        this.log(
            `File is ${[
                file.name,
                file.type,
                file.size,
                file.lastModified,
            ].join(" ")}`
        );

        this.transferTracker.start(uuid, {
            name: file.name,
            size: file.size,
            direction: "up",
            remoteToken: this.remoteToken,
            folderId: folder?.folderId,
            relativePath: folder?.relativePath,
            startedAt,
        });

        const dataChannel = createTransferChannel(this.peerConnection, uuid);
        this.outgoingChannels.set(uuid, dataChannel);
        const laneChannels = this.transferLanes().map(lane =>
            createTransferChannel(lane.peerConnection, uuid)
        );
        const channels = [dataChannel, ...laneChannels];
        // Lane channels that carried chunks; losing one loses its chunks.
        const usedLaneChannels = new Set<RTCDataChannel>();

        // Bytes handed to the channels so far; the progress interval reads it.
        let offset = 0;
        let progressInterval: ReturnType<typeof setInterval> | null = null;
        let acknowledged = false;

        const bufferedBytes = () =>
            channels.reduce(
                (sum, channel) =>
                    channel.readyState === "open"
                        ? sum + channel.bufferedAmount
                        : sum,
                0
            );

        const pump = async () => {
            // The SCTP maximum message size is negotiated per connection.
            // Chrome and Safari advertise 256 KB, Firefox considerably more.
            const maxMessageSize = this.peerConnection.sctp?.maxMessageSize;
            const messageSize = Math.min(
                maxMessageSize && maxMessageSize > 0
                    ? maxMessageSize
                    : 16 * 1024,
                256 * 1024
            );
            // 4 bytes of each message hold the chunk sequence number.
            const payloadSize = messageSize - SEQUENCE_HEADER_BYTES;
            const chunkCount = Math.ceil(file.size / payloadSize);
            // Read whole multiples of the payload size. Otherwise every read
            // boundary would produce a short fragment chunk, breaking both
            // the announced chunk count and the position-based reassembly.
            const readSize =
                Math.max(Math.floor(FILE_CHUNK_READ_SIZE / payloadSize), 1) *
                payloadSize;

            // Send metadata first so the receiver can set up reassembly.
            dataChannel.send(
                JSON.stringify({
                    name: file.name,
                    size: file.size,
                    uuid: uuid,
                    chunkCount: chunkCount,
                    chunkSize: payloadSize,
                    relativePath: folder?.relativePath,
                    folderId: folder?.folderId,
                })
            );

            let sequence = 0;
            let readOffset = 0;
            while (readOffset < file.size) {
                const buffer = await file
                    .slice(readOffset, readOffset + readSize)
                    .arrayBuffer();

                for (
                    let chunkStart = 0;
                    chunkStart < buffer.byteLength;
                    chunkStart += payloadSize
                ) {
                    let channel = leastBufferedChannel(channels);
                    if (channel.bufferedAmount > HIGH_WATER_MARK) {
                        await waitForBufferedAmountLow(channels);
                        channel = leastBufferedChannel(channels);
                    }
                    if (dataChannel.readyState !== "open") {
                        this.log("Data channel closed during transfer:", uuid);
                        return;
                    }

                    const length = Math.min(
                        payloadSize,
                        buffer.byteLength - chunkStart
                    );
                    const message = new ArrayBuffer(
                        SEQUENCE_HEADER_BYTES + length
                    );
                    new DataView(message).setUint32(0, sequence, true);
                    new Uint8Array(message, SEQUENCE_HEADER_BYTES).set(
                        new Uint8Array(buffer, chunkStart, length)
                    );
                    channel.send(message);
                    if (channel !== dataChannel) {
                        usedLaneChannels.add(channel);
                    }
                    sequence++;
                    offset += length;
                }

                readOffset += buffer.byteLength;
            }

            // A drained buffer means handed to the local transport. The
            // receiver's acknowledgement marks the file as delivered.
            while (bufferedBytes() > 0) {
                if (dataChannel.readyState !== "open") {
                    this.log("Data channel closed during transfer:", uuid);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // The acknowledgement can land while the last bytes drain.
            if (acknowledged) {
                return;
            }

            // A channel closed while the last bytes drained already failed
            // the transfer in onclose.
            if (dataChannel.readyState !== "open") {
                this.log("Data channel closed during transfer:", uuid);
                return;
            }

            if (progressInterval) clearInterval(progressInterval);
            this.transferTracker.setStatus(uuid, "finalizing");
            this.log("File handed to transport for Transfer:", uuid);
        };

        dataChannel.onmessage = event => {
            if (typeof event.data !== "string") {
                return;
            }
            if (readCanceledUuid(event.data) === uuid) {
                this.markCanceled(uuid);
                dataChannel.close();
                return;
            }
            if (readAckedUuid(event.data) !== uuid) {
                return;
            }

            acknowledged = true;
            if (progressInterval) clearInterval(progressInterval);
            this.transferTracker.setStatus(uuid, "done");
            this.log(
                "File acknowledged for Transfer:",
                uuid,
                " closing data channel"
            );
            dataChannel.close();
        };

        dataChannel.onclose = () => {
            if (progressInterval) clearInterval(progressInterval);
            this.outgoingChannels.delete(uuid);
            laneChannels.forEach(channel => channel.close());
            if (!acknowledged && !this.canceledTransfers.has(uuid)) {
                this.transferTracker.setStatus(uuid, "failed");
            }
            this.transferStats.release();
        };

        // The chunks a closed lane still buffered never arrive, so the
        // receiver would wait forever. Closing lane 0 fails the transfer.
        laneChannels.forEach(channel => {
            channel.onclose = () => {
                if (usedLaneChannels.has(channel) && !acknowledged) {
                    dataChannel.close();
                }
            };
        });

        dataChannel.onopen = () => {
            this.transferStats.acquire();

            // Samples the bytes actually sent (handed to the channels minus
            // what is still buffered) for the transfer tracker.
            progressInterval = setInterval(() => {
                const sentBytes = Math.max(offset - bufferedBytes(), 0);
                this.transferTracker.updateBytes(uuid, sentBytes);
            }, 100);

            pump().catch((err: unknown) => {
                this.log("Error during file transfer:", uuid, err);
                if (progressInterval) clearInterval(progressInterval);
                this.transferTracker.setStatus(uuid, "failed");
            });
        };
    }

    /**
     * Lanes besides lane 0 that an outgoing file spreads over. Opens the
     * missing ones on first use. Empty while the parallelTransfers setting is
     * off or the peer has not shown lane support.
     */
    private transferLanes(): PeerLane[] {
        if (!getSettings().parallelTransfers || !this.remoteSupportsLanes) {
            return [];
        }
        const lanes: PeerLane[] = [];
        for (let index = 1; index < PARALLEL_TRANSFER_LANES; index++) {
            lanes.push(this.lanes.get(index) ?? this.createLane(index));
        }
        return lanes;
    }

    /**
     * Opens the peer connection of a lane. Lane 0 reports its state to the
     * subscribers of this connection; channels the peer opens on any lane
     * reach handleIncomingDataChannel.
     */
    private createLane(index: number): PeerLane {
        assert(
            Number.isInteger(index) && index >= 0 && index < MAX_TRANSFER_LANES,
            `lane must be an integer in [0, ${MAX_TRANSFER_LANES})`
        );
        assert(!this.lanes.has(index), `lane ${index} exists already`);

        const lane = new PeerLane(
            index,
            this.signalingChannel,
            this.remoteToken,
            this.polite,
            this.iceServers
        );
        lane.peerConnection.ondatachannel = event => {
            this.handleIncomingDataChannel(event.channel, index);
        };
        this.lanes.set(index, lane);
        return lane;
    }

    /**
     * Handles a data channel opened by the remote peer. The reassembly state
     * is keyed by the channel label (the file UUID) and shared by the
     * channels of one file on all lanes. The "init" channel used to kick off
     * negotiation is ignored. The sender closes the channels once the file is
     * acknowledged; a close of the lane 0 channel before that fails the
     * transfer. The sender closes lane 0 as well when another lane fails.
     */
    private handleIncomingDataChannel(
        dataChannel: RTCDataChannel,
        lane: number
    ) {
        if (dataChannel.label === "init") {
            return;
        }

        if (!this.acceptsIncoming()) {
            this.log("Refused data channel from", this.remoteToken);
            dataChannel.close();
            return;
        }

        this.log("Received data channel", dataChannel.label, "on lane", lane);
        dataChannel.binaryType = "arraybuffer";

        const state = this.getOrCreateReceiveState(dataChannel.label);
        if (lane === 0) {
            this.attachMainChannel(state, dataChannel);
        } else {
            this.attachLaneChannel(state, dataChannel);
        }
    }

    /** Wires the lane 0 channel of an incoming file: metadata, chunks, cancellation. */
    private attachMainChannel(
        state: ReceiveState,
        dataChannel: RTCDataChannel
    ) {
        state.dataChannel = dataChannel;
        let statsAcquired = false;

        dataChannel.onmessage = event => {
            if (state.fileMeta === null && typeof event.data === "string") {
                state.fileMeta = JSON.parse(event.data) as FileMeta;

                // Chunks arrive unordered and are placed by sequence number:
                // written to disk at their absolute position when OPFS is
                // available, buffered in memory otherwise.
                if (OpfsFileWriter.isSupported()) {
                    state.opfsWriter = new OpfsFileWriter(state.fileMeta.uuid);
                } else {
                    state.receivedChunks = new Array<ArrayBuffer>(
                        state.fileMeta.chunkCount
                    );
                }

                this.log("Received file metadata:", state.fileMeta);
                this.transferTracker.start(state.fileMeta.uuid, {
                    name: state.fileMeta.name,
                    size: state.fileMeta.size,
                    direction: "down",
                    remoteToken: this.remoteToken,
                    folderId: state.fileMeta.folderId,
                    relativePath: state.fileMeta.relativePath,
                });

                state.earlyChunks.forEach(chunk =>
                    this.storeChunk(state, chunk)
                );
                state.earlyChunks.length = 0;

                // An empty file announces no chunks, so no chunk completes it.
                if (state.fileMeta.chunkCount === 0) {
                    void this.finishDownload(state);
                }
                return;
            }

            if (event.data instanceof ArrayBuffer) {
                this.receiveChunk(state, event.data);
            } else if (
                state.fileMeta &&
                typeof event.data === "string" &&
                readCanceledUuid(event.data) === state.fileMeta.uuid
            ) {
                this.abortIncoming(state);
            } else {
                this.log("Unbekannter Nachrichtentyp:", event.data);
            }
        };

        dataChannel.onopen = () => {
            this.transferStats.acquire();
            statsAcquired = true;
        };
        dataChannel.onclose = () => {
            if (statsAcquired) {
                this.transferStats.release();
                statsAcquired = false;
            }
            if (
                state.fileMeta &&
                !state.finished &&
                !this.canceledTransfers.has(state.fileMeta.uuid)
            ) {
                this.transferTracker.setStatus(state.fileMeta.uuid, "failed");
            }
        };
        dataChannel.onerror = error => {
            this.log("Data channel error: ", error);
        };
    }

    /** Wires a channel of an incoming file on a further lane; it carries chunks only. */
    private attachLaneChannel(state: ReceiveState, channel: RTCDataChannel) {
        state.laneChannels.push(channel);
        channel.onmessage = event => {
            if (event.data instanceof ArrayBuffer) {
                this.receiveChunk(state, event.data);
            }
        };
        // A file whose lane 0 channel never arrived leaves no state behind.
        channel.onclose = () => {
            if (
                state.dataChannel === null &&
                this.incomingTransfers.get(channel.label) === state
            ) {
                this.incomingTransfers.delete(channel.label);
            }
        };
    }

    /** Stores a chunk, or holds it back until the metadata arrives. */
    private receiveChunk(state: ReceiveState, data: ArrayBuffer) {
        if (state.fileMeta === null) {
            state.earlyChunks.push(data);
        } else {
            this.storeChunk(state, data);
        }
    }

    /**
     * Places a chunk by its sequence number and finishes the download with
     * the last one. Requires the metadata.
     */
    private storeChunk(state: ReceiveState, data: ArrayBuffer) {
        assert(state.fileMeta, "chunks get stored after the metadata");
        const sequence = new DataView(data).getUint32(0, true);
        const payload = data.slice(SEQUENCE_HEADER_BYTES);
        if (state.opfsWriter) {
            state.opfsWriter.write(
                sequence * state.fileMeta.chunkSize,
                payload
            );
        } else {
            state.receivedChunks[sequence] = payload;
        }
        state.receivedBytes += payload.byteLength;
        state.receivedChunkCount++;
        this.transferTracker.updateBytes(
            state.fileMeta.uuid,
            state.receivedBytes
        );

        if (
            !state.finished &&
            state.receivedChunkCount === state.fileMeta.chunkCount
        ) {
            void this.finishDownload(state);
        }
    }

    private getOrCreateReceiveState(uuid: string): ReceiveState {
        let state = this.incomingTransfers.get(uuid);
        if (!state) {
            state = {
                dataChannel: null,
                laneChannels: [],
                fileMeta: null,
                receivedChunks: [],
                opfsWriter: null,
                receivedBytes: 0,
                receivedChunkCount: 0,
                earlyChunks: [],
                finished: false,
            };
            this.incomingTransfers.set(uuid, state);
        }
        return state;
    }

    /**
     * Assembles the received file and hands it to the received files store.
     * Called once all chunks have arrived. The browser download starts
     * automatically when the autoSaveDownloads setting is enabled; otherwise
     * the file is only saved after an explicit click.
     *
     * With OPFS the file is finalized on disk and downloaded as a disk-backed
     * File; otherwise the buffered chunks are assembled into an in-memory Blob.
     *
     * A finalized file is acknowledged to the sender on its channel. A failed
     * finalization closes the channel instead, which fails the sender's side.
     */
    private async finishDownload(state: ReceiveState) {
        state.finished = true;
        const dataChannel = state.dataChannel;
        assert(dataChannel, "the metadata arrives on the lane 0 channel");

        const uuid = state.fileMeta!.uuid;
        const filename = state.fileMeta?.name ?? "received-file";

        // All chunks have arrived; disk finalization may still take a moment.
        this.transferTracker.setStatus(uuid, "finalizing");

        let blob: Blob;
        if (state.opfsWriter) {
            const [file, err] = await errorAsValue(state.opfsWriter.finish());
            if (err) {
                console.error(
                    "Failed to finalize received file on disk:",
                    filename,
                    err
                );
                this.transferTracker.setStatus(uuid, "failed");
                dataChannel.close();
                return;
            }
            blob = file;
        } else {
            blob = new Blob(state.receivedChunks);
        }

        this.transferTracker.setStatus(uuid, "done");
        if (dataChannel.readyState === "open") {
            dataChannel.send(JSON.stringify({ ack: uuid } as AckMessage));
        }

        this.receivedFiles.add(uuid, {
            blob,
            filename,
            relativePath: state.fileMeta?.relativePath,
            folderId: state.fileMeta?.folderId,
        });
        this.incomingTransfers.delete(uuid);

        // Files of a folder transfer are saved together via saveFolder()
        // when the browser has a directory picker; individual downloads
        // would land flat in the download folder.
        if (
            state.fileMeta?.folderId &&
            ReceivedFiles.isDirectoryPickerSupported()
        ) {
            this.log(
                "File ready for folder save with TransferID:",
                state.fileMeta.uuid
            );
            return;
        }

        if (getSettings().autoSaveDownloads) {
            // Yield to the event loop so the UI can render the completed state
            // before the (possible) download prompt ("where do you want to save this file?") opens.
            await new Promise(resolve => setTimeout(resolve, 100));

            this.receivedFiles.save(uuid);
        }

        this.log("File received with TransferID:", state.fileMeta?.uuid);
    }

    /**
     * Stops a running transfer in either direction. The other side learns it
     * on the file's channel and shows the transfer as canceled, too.
     */
    public cancelTransfer(uuid: string) {
        const channel =
            this.outgoingChannels.get(uuid) ??
            this.incomingTransfers.get(uuid)?.dataChannel;
        if (!channel) {
            return;
        }

        this.markCanceled(uuid);
        if (channel.readyState === "open") {
            channel.send(JSON.stringify({ cancel: uuid } as CancelMessage));
        }

        const incoming = this.incomingTransfers.get(uuid);
        if (incoming) {
            this.abortIncoming(incoming);
        } else {
            channel.close();
        }
    }

    private markCanceled(uuid: string) {
        this.canceledTransfers.add(uuid);
        this.transferTracker.setStatus(uuid, "canceled");
    }

    private abortIncoming(state: ReceiveState) {
        if (state.fileMeta) {
            this.markCanceled(state.fileMeta.uuid);
            this.incomingTransfers.delete(state.fileMeta.uuid);
        }
        state.finished = true;
        void state.opfsWriter?.abort();
        state.dataChannel?.close();
        state.laneChannels.forEach(channel => channel.close());
    }

    /**
     * To trigger the negotiationneeded event, we create a data channel.
     * After that, the WebRTC Connection is goint to start (handshake).
     */
    private initializePeerConnection() {
        if (this.polite) {
            this.peerConnection.createDataChannel("init");
        }
    }

    /** Subscribes to signaling messages of this connection's peer only. */
    private subscribeSignaling(
        type: MessageType,
        handler: (message: ITypedMessage) => Promise<void>
    ) {
        const scoped: MessageHandler = message => {
            const from = (message.msg as { remoteToken?: string }).remoteToken;
            if (from?.toLowerCase() !== this.remoteToken) {
                return;
            }
            return handler(message);
        };
        this.signalingUnsubscribes.push(
            this.signalingChannel.subscribeMessage(type, scoped)
        );
    }

    private handleRemoteICECandidates() {
        this.subscribeSignaling(MessageType.ICE_CANDIDATE, async message => {
            const { iceCandidate, lane } = (message as IceCandidateMessage).msg;
            await this.laneFor(lane)?.handleRemoteCandidate(iceCandidate);
        });
    }

    private handleSDPPackage() {
        this.subscribeSignaling(MessageType.SDP, async message => {
            const { description, lane } = (message as SdpMessage).msg;
            await this.laneFor(lane)?.handleRemoteDescription(description);
        });
    }

    /**
     * Lane a signaling message of the peer names, opened on first mention.
     * A message without a lane belongs to lane 0 and comes from a peer
     * without lane support. Null for an index outside MAX_TRANSFER_LANES.
     */
    private laneFor(index: number | undefined): PeerLane | null {
        if (index === undefined || index === null) {
            return this.lanes.get(0)!;
        }
        this.remoteSupportsLanes = true;
        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= MAX_TRANSFER_LANES
        ) {
            this.log("Dropped signaling for unknown lane", index);
            return null;
        }
        return this.lanes.get(index) ?? this.createLane(index);
    }

    /**
     * Tears the connection down. Unfinished transfers in both directions are
     * marked failed; their data channels close without an event once the
     * peer connection is closed. Received files stay in their store.
     */
    public closeConnection() {
        this.incomingTransfers.forEach(state => {
            void state.opfsWriter?.abort();
        });
        this.incomingTransfers.clear();
        this.outgoingChannels.clear();
        this.transferTracker.failUnfinished(this.remoteToken);
        this.unsubscribeTransferEnded();

        this.transferStats.stop();
        this.lanes.forEach(lane => lane.close());
        this.lanes.clear();

        this.signalingUnsubscribes.forEach(unsubscribe => unsubscribe());
        this.signalingUnsubscribes.length = 0;

        assert(this.peerConnection.connectionState === "closed");
        this.emitEvent("connectionstatechange", "closed");

        this.unsubscribeAllHandlers();
    }

    public getPeerConnection(): RTCPeerConnection {
        return this.peerConnection;
    }

    public subscribeTo(event: string, handler: (data: unknown) => void) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Observable<unknown>());
        }
        this.eventHandlers.get(event)?.subscribe(handler);
    }

    public unsubscribeFrom(event: string, handler: (data: unknown) => void) {
        assert(
            this.eventHandlers.has(event),
            `Event ${event} not found in eventHandlers`
        );
        this.eventHandlers.get(event)?.unsubscribe(handler);
    }

    private emitEvent(event: string, data: unknown) {
        assert(
            this.eventHandlers.has(event),
            `Event ${event} not found in eventHandlers`
        );
        this.eventHandlers.get(event)?.notify(data);
    }

    private unsubscribeAllHandlers() {
        this.eventHandlers.forEach(observable => {
            observable.unsubscribeAll();
        });
    }
}

/**
 * UUID an acknowledgement names, null for every other string on the channel.
 * A peer speaking a different protocol version reaches this with anything.
 */
function readAckedUuid(data: string): string | null {
    const [message] = errorAsValueSync(
        () => JSON.parse(data) as Partial<AckMessage> | null
    );

    return typeof message?.ack === "string" ? message.ack : null;
}

/** UUID a cancellation names, null for every other string on the channel. */
function readCanceledUuid(data: string): string | null {
    const [message] = errorAsValueSync(
        () => JSON.parse(data) as Partial<CancelMessage> | null
    );

    return typeof message?.cancel === "string" ? message.cancel : null;
}

/** Opens the reliable, unordered channel of one outgoing file on a peer connection. */
function createTransferChannel(
    peerConnection: RTCPeerConnection,
    uuid: string
): RTCDataChannel {
    const channel = peerConnection.createDataChannel(uuid, { ordered: false });
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = LOW_WATER_MARK;
    return channel;
}

/**
 * Open channel with the fewest buffered bytes. The first channel counts as
 * open whenever no channel is, so the caller finds it closed and stops.
 */
function leastBufferedChannel(channels: RTCDataChannel[]): RTCDataChannel {
    const open = channels.filter(channel => channel.readyState === "open");
    if (open.length === 0) {
        return channels[0];
    }
    return open.reduce((least, channel) =>
        channel.bufferedAmount < least.bufferedAmount ? channel : least
    );
}

/**
 * Resolves when the send buffer of any of the channels drains to
 * LOW_WATER_MARK or any of them closes, whichever comes first.
 */
function waitForBufferedAmountLow(channels: RTCDataChannel[]) {
    return new Promise<void>(resolve => {
        const done = () => {
            channels.forEach(channel => {
                channel.removeEventListener("bufferedamountlow", done);
                channel.removeEventListener("close", done);
            });
            resolve();
        };
        channels.forEach(channel => {
            channel.addEventListener("bufferedamountlow", done);
            channel.addEventListener("close", done);
        });
    });
}
