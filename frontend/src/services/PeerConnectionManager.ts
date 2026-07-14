import { assert } from "../util/Assert";
import { WebRTCConnection } from "./WebRTCConnection";
import {
    MessageHandler,
    WebSocketService,
    ClientToken,
} from "./WebSocketService";
import { MessageType } from "../types/MessageType";
import { IObservable, Observable } from "../util/observer/Observable";
import { Logger } from "../util/Logger";
import { ConnectionRequestCancelledMessage } from "../types/connection/ConnectionRequestCancelledMessage";
import { ConnectionStateMessage } from "../types/connection/ConnectionStateMessage";
import { ConnectionRequestMessage } from "../types/connection/ConnectionRequestMessage";
import { ConnectionResponseMessage } from "../types/connection//ConnectionResponseMessage";
import { EstablishConnectionMessage } from "../types/connection//EstablishConnectionMessage";
import { CloseConnectionMessage } from "../types/connection//CloseConnectionMessage";
import { TransferTracker } from "./TransferTracker";
import { CLIENT_TOKEN_LENGTH } from "../util/Constants";

/**
 * Indicates who initiated the closing of the peer connection.
 */
export type CloseInitiator = "local" | "remote";

/**
 * Reason a connection request was rejected locally before being sent.
 * `invalid-length`: the token does not have the required length.
 * `own-token`: the token is this client's own token.
 */
export type ConnectError = "invalid-length" | "own-token";

/** Outcome of a {@link PeerConnectionManager.connect} call. */
export type ConnectResult = { ok: true } | { ok: false; error: ConnectError };

/**
 * Server-pushed snapshot of this client's connection-request state. The
 * server sends a fresh snapshot on every change; the UI derives its display
 * from the latest one.
 */
export interface ConnectionRequestState {
    /** Token the client's own pending request is addressed to, or null. */
    outgoingRequestTarget: ClientToken | null;
    /** Tokens of peers with a pending request addressed to this client. */
    incomingRequesters: ClientToken[];
}

export class PeerConnectionManager {
    private readonly logger = new Logger("PeerConnectionManager");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);
    // Token of the peer of the current WebRTC connection. Set when
    // establishment starts and cleared when the connection is torn down. It is
    // the WebRTC peer identity only; pending request targets live in the
    // server-pushed snapshot, not here.
    private connectedRemoteToken: ClientToken | undefined;
    private webrtcConnection: WebRTCConnection | undefined;

    private connectionRequestState: ConnectionRequestState = {
        outgoingRequestTarget: null,
        incomingRequesters: [],
    };

    private readonly onConnectionResponseReceivedObservable: IObservable<boolean> =
        new Observable<boolean>(); // Boolean is true if the connection request was accepted, false otherwise.

    /**
     * Subscribes to responses to this client's own outgoing connection request.
     * The boolean is true if the request was accepted, false if rejected.
     * Rejections are transient and not part of the snapshot, so they are
     * delivered as events. Supports multiple subscribers; each must
     * unsubscribe itself.
     */
    public subscribeToConnectionResponse(
        callback: (accepted: boolean) => void
    ) {
        this.onConnectionResponseReceivedObservable.subscribe(callback);
    }

    public unsubscribeFromConnectionResponse(
        callback: (accepted: boolean) => void
    ) {
        this.onConnectionResponseReceivedObservable.unsubscribe(callback);
    }

    private readonly onConnectionRequestStateChangedObservable: IObservable<ConnectionRequestState> =
        new Observable<ConnectionRequestState>();
    private readonly onConnectionEstablishingObservable: IObservable<ClientToken> =
        new Observable<ClientToken>(); // Notified with the remote token when the WebRTC connection setup starts.

    /**
     * Subscribes to server-pushed connection-request state snapshots.
     * Supports multiple subscribers; each must unsubscribe itself.
     */
    public subscribeToConnectionRequestState(
        callback: (state: ConnectionRequestState) => void
    ) {
        this.onConnectionRequestStateChangedObservable.subscribe(callback);
    }

    public unsubscribeFromConnectionRequestState(
        callback: (state: ConnectionRequestState) => void
    ) {
        this.onConnectionRequestStateChangedObservable.unsubscribe(callback);
    }

    /**
     * Returns the latest server-pushed connection-request state snapshot.
     * The reference is stable until the next snapshot arrives.
     */
    public getConnectionRequestState(): ConnectionRequestState {
        return this.connectionRequestState;
    }

    /**
     * Subscribes to the start of the WebRTC connection setup (the server told
     * both peers to establish a connection). Supports multiple subscribers.
     */
    public subscribeToConnectionEstablishing(
        callback: (remoteToken: ClientToken) => void
    ) {
        this.onConnectionEstablishingObservable.subscribe(callback);
    }

    public unsubscribeFromConnectionEstablishing(
        callback: (remoteToken: ClientToken) => void
    ) {
        this.onConnectionEstablishingObservable.unsubscribe(callback);
    }

    private readonly onConnectionClosedObservable: IObservable<CloseInitiator> =
        new Observable<CloseInitiator>();

    public subscribeToConnectionClosed(
        callback: (initiator: CloseInitiator) => void
    ) {
        this.onConnectionClosedObservable.subscribe(callback);
    }

    public unsubscribeFromConnectionClosed(
        callback: (initiator: CloseInitiator) => void
    ) {
        this.onConnectionClosedObservable.unsubscribe(callback);
    }

    private onConnectedCallback?: () => void;

    /** Single source of truth for transfer progress, speed and status. */
    private readonly transferTracker = new TransferTracker();

    public constructor(private readonly signaling: WebSocketService) {
        this.logger.setEnabled(false);

        this.handleConnectionStateMessage();

        this.handleConnectionEstablishmentMessage();

        this.handleConnectionRequestMessage();

        this.waitForCloseConnectionRequest();

        this.handleConnectionResponseMessages();
    }

    private handleConnectionStateMessage() {
        const onConnectionStateReceived = (message: ConnectionStateMessage) => {
            this.connectionRequestState = {
                outgoingRequestTarget: message.msg.outgoingRequestTarget,
                incomingRequesters: message.msg.incomingRequesters,
            };

            this.onConnectionRequestStateChangedObservable.notify(
                this.connectionRequestState
            );
        };

        this.signaling.subscribeMessage(
            MessageType.CONNECTION_STATE,
            onConnectionStateReceived as MessageHandler
        );
    }

    /**
     * Asks the server to cancel the pending outgoing connection request. The
     * server removes the request and pushes fresh state snapshots to both
     * peers; the UI clears when the snapshot arrives.
     */
    public cancelConnectionRequest() {
        const connectionRequestCancelMessage =
            new ConnectionRequestCancelledMessage({});

        this.signaling.sendMessage(connectionRequestCancelMessage);
    }

    private handleConnectionResponseMessages() {
        const onConnectionResponseReceived = (
            message: ConnectionResponseMessage
        ) => {
            // The server only sends responses for this client's own request, so
            // no matching against local bookkeeping is needed.
            this.onConnectionResponseReceivedObservable.notify(
                message.msg.accepted
            );
        };

        this.signaling.subscribeMessage(
            MessageType.CONNECTION_RESPONSE,
            onConnectionResponseReceived as MessageHandler
        );
    }

    public acceptConnectionRequest(remoteToken: ClientToken) {
        const connectionResponseMessage = new ConnectionResponseMessage({
            accepted: true,
            remoteToken: remoteToken,
        });

        this.signaling.sendMessage(connectionResponseMessage);
    }

    public rejectConnectionRequest(remoteToken: ClientToken) {
        const connectionResponseMessage = new ConnectionResponseMessage({
            accepted: false,
            remoteToken: remoteToken,
        });

        this.signaling.sendMessage(connectionResponseMessage);
    }

    /**
     * Guards against incoming connection requests while a WebRTC connection is
     * already active: those are auto-rejected. This handler is only the
     * WebRTC-level gate. The UI list of pending incoming requests is driven by
     * the server-pushed snapshot (see {@link ConnectionRequestState}), not by
     * this message.
     */
    private handleConnectionRequestMessage() {
        const onConnectionRequestReceived = (
            message: EstablishConnectionMessage
        ) => {
            if (this.webrtcConnection) {
                this.log(
                    "Received connection request while already in a WebRTC connection. Auto-rejecting."
                );

                const rejectMessage = new ConnectionResponseMessage({
                    accepted: false,
                    remoteToken: message.msg.remoteToken,
                });

                this.signaling.sendMessage(rejectMessage);
                return;
            }

            // Otherwise nothing to record: the pending incoming request is
            // reflected in the server-pushed snapshot, and acceptance is driven
            // from the UI via acceptConnectionRequest. The connected peer is
            // recorded only once establishment starts.
        };

        this.signaling.subscribeMessage(
            MessageType.CONNECTION_REQUEST,
            onConnectionRequestReceived as MessageHandler
        );
    }

    /**
     * Instantly aborts the current WebRTC connection (if there is one) and establishes a new one with the remote peer.
     */
    private handleConnectionEstablishmentMessage() {
        const onEstablishConnectionReceived = (
            message: EstablishConnectionMessage
        ) => {
            this.closePeerConnection();

            this.connectedRemoteToken = message.msg.remoteToken;

            this.transferTracker.clear();
            this.webrtcConnection = new WebRTCConnection(
                this.signaling,
                message.msg.remoteToken,
                this.transferTracker
            );

            this.setupListeners();

            this.onConnectionEstablishingObservable.notify(
                message.msg.remoteToken
            );
        };

        this.signaling.subscribeMessage(
            MessageType.ESTABLISH_CONNECTION,
            onEstablishConnectionReceived as MessageHandler
        );
    }

    /**
     * Checks whether a connection request to the given token is allowed.
     * Returns the reason it is not, or null if the token is valid. Pure: no
     * side effects and no UI feedback.
     */
    public validateRemoteToken(remoteToken: ClientToken): ConnectError | null {
        if (remoteToken.length !== CLIENT_TOKEN_LENGTH) {
            return "invalid-length";
        }

        if (this.signaling.getLocalClientToken() === remoteToken) {
            return "own-token";
        }

        return null;
    }

    /**
     * Sends a connection request to the remote peer. Returns whether the
     * request was sent, or the reason it was rejected locally. UI feedback for
     * a rejection is the caller's responsibility.
     */
    public connect(remoteToken: ClientToken): ConnectResult {
        const error = this.validateRemoteToken(remoteToken);
        if (error) {
            return { ok: false, error };
        }

        const connectionRequestMessage = new ConnectionRequestMessage({
            remoteToken: remoteToken,
        });

        this.signaling.sendMessage(connectionRequestMessage);

        return { ok: true };
    }

    /**
     * Clears the current WebRTC connection.
     */
    private clearWebRTCConnection() {
        this.webrtcConnection?.closeConnection();

        this.webrtcConnection = undefined;
        this.connectedRemoteToken = undefined;
    }

    /**
     * Closes the current WebRTC connection, cleans up all related resources, and notifies observers about the connection closure.
     * The connection may already be closed, in which case this method does nothing because all related resources are already cleaned up.
     */
    public closePeerConnection() {
        if (!this.webrtcConnection) {
            return;
        }

        const connectedRemoteToken = this.connectedRemoteToken!;

        const closeConnectionMessage = new CloseConnectionMessage({
            remoteToken: connectedRemoteToken,
        });

        this.signaling.sendMessage(closeConnectionMessage);

        this.clearWebRTCConnection();

        this.onConnectionClosedObservable.notify("local");
    }

    /**
     * Waits for a close connection request from the remote peer via a message of type `CLOSE_CONNECTION_MESSAGE_TYPE`.
     *
     * This method subscribes to messages of the specified type and, upon receiving a close connection request,
     * closes the current connection and notifies observers about the connection closure.
     *
     * The subscription to the message type remains active to handle future close requests.
     */
    private waitForCloseConnectionRequest() {
        const handleCloseConnectionRequest = () => {
            assert(
                this.webrtcConnection,
                "No active connection to close. The server sent a CLOSE_CONNECTION message unexpectedly."
            );

            this.clearWebRTCConnection();

            this.onConnectionClosedObservable.notify("remote");
        };

        this.signaling.subscribeMessage(
            MessageType.CLOSE_CONNECTION,
            handleCloseConnectionRequest as MessageHandler
        );
    }

    // Sets up event listeners for WebRTCConnection and trigger corresponding callbacks
    private setupListeners() {
        assert(this.webrtcConnection, "PeerConnection is not initialized.");
        this.webrtcConnection.subscribeTo("connectionstatechange", state => {
            if (state === "connected") {
                this.log(
                    "PEERCONNECTIONMANAGER ::: state",
                    state,
                    "and onConnectedCallback is:",
                    this.onConnectedCallback
                );
                assert(
                    this.onConnectedCallback,
                    "onConnectedCallback is not set."
                );
                this.onConnectedCallback();
            } else if (state === "closed" || state === "disconnected") {
                this.log("PEERCONNECTIONMANAGER ::: state:", state);
            }
        });
    }

    /**
     * Sets a callback to be invoked when the peer connection is established and the state changes to "connected".
     *
     * This method allows external components to define a callback function that will be executed when the peer connection
     * successfully transitions to the "connected" state, indicating that the connection is ready for communication.
     *
     * @param cb The callback function to be called when the connection is established.
     */
    public setOnConnectedCallback(cb: () => void) {
        this.onConnectedCallback = cb;
        this.log(
            "PEERCONNECTIONMANAGER ::: Set OnConnectedCallback to:",
            this.onConnectedCallback
        );
    }

    /** Central transfer state consumed by the UI. */
    public getTransferTracker(): TransferTracker {
        return this.transferTracker;
    }

    public getConnection() {
        return this.webrtcConnection;
    }

    public getRemoteToken() {
        assert(
            this.connectedRemoteToken,
            "Remote token is not set. Ensure you have received the remote token."
        );
        return this.connectedRemoteToken;
    }

    /**
     * Sends a file to the remote peer using the underlying WebRTCConnection.
     * Throws if no active connection exists.
     * @param file The file to send.
     */
    public sendFile(file: File, uuid: string) {
        assert(this.webrtcConnection, "No active connection to send file.");
        this.webrtcConnection.sendFileOverDataChannel(file, uuid);
    }

    /**
     * Re-downloads a previously received file by UUID.
     * @param uuid The UUID of the file to re-download.
     * @returns true if the file was found and download was triggered, false otherwise.
     */
    public redownloadFile(uuid: string): boolean {
        if (!this.webrtcConnection) {
            this.log("No active connection to re-download file.");
            return false;
        }
        return this.webrtcConnection.redownloadFile(uuid);
    }
}
