import { assert } from "../util/Assert";
import { WebRTCConnection } from "./WebRTCConnection";
import {
    MessageHandler,
    WebSocketService,
    ClientToken,
    normalizeClientToken,
} from "./WebSocketService";
import { MessageType } from "../types/MessageType";
import { IObservable, Observable } from "../util/observer/Observable";
import { Logger } from "../util/Logger";
import { ConnectionRequestCancelledMessage } from "../types/connection/ConnectionRequestCancelledMessage";
import { ConnectionRequestMessage } from "../types/connection/ConnectionRequestMessage";
import { ConnectionResponseMessage } from "../types/connection//ConnectionResponseMessage";
import { EstablishConnectionMessage } from "../types/connection//EstablishConnectionMessage";
import { CloseConnectionMessage } from "../types/connection//CloseConnectionMessage";
import { toast } from "react-toastify/unstyled";
import { TransferTracker } from "./TransferTracker";

/**
 * Indicates who initiated the closing of the peer connection.
 */
export type CloseInitiator = "local" | "remote";

/**
 * State change of the locally initiated (outgoing) connection request.
 *
 * - "requested": a request to `remoteToken` was sent and is awaiting a response.
 * - "cancelled": the request was cancelled locally before a response arrived.
 * - "responded": the remote peer (or the server) answered the request; the
 *   outcome is delivered via the connection response callback.
 */
export interface OutgoingRequestEvent {
    remoteToken: ClientToken;
    state: "requested" | "cancelled" | "responded";
}

export class PeerConnectionManager {
    private readonly logger = new Logger("PeerConnectionManager");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);
    private expectedRemoteToken: ClientToken | undefined; // The token of the remote peer we accept connections from.
    private outgoingRequestToken: ClientToken | undefined; // The token of the peer our own pending connection request is addressed to.
    private webrtcConnection: WebRTCConnection | undefined;

    private readonly onConnectionResponseReceivedObservable: IObservable<boolean> =
        new Observable<boolean>(); // Boolean is true if the connection request was accepted, false otherwise.
    private readonly onConnectionRequestReceivedObservable: IObservable<string> =
        new Observable<string>(); // String is the remote token of the requesting peer.
    private readonly onConnectionRequestCancelledReceivedObservable: IObservable<string> =
        new Observable<string>(); // String is the remote token of the requesting peer.

    public setOnConnectionResponseReceivedCallback(
        callback: (accepted: boolean) => void
    ) {
        this.onConnectionResponseReceivedObservable.unsubscribeAll();
        this.onConnectionResponseReceivedObservable.subscribe(callback);
    }
    public setOnConnectionRequestReceivedCallback(
        callback: (remoteToken: string) => void
    ) {
        this.onConnectionRequestReceivedObservable.unsubscribeAll();
        this.onConnectionRequestReceivedObservable.subscribe(callback);
    }
    public setOnConnectionRequestCancelledReceivedCallback(
        callback: (remoteToken: string) => void
    ) {
        this.onConnectionRequestCancelledReceivedObservable.unsubscribeAll();
        this.onConnectionRequestCancelledReceivedObservable.subscribe(callback);
    }

    private readonly onOutgoingRequestChangedObservable: IObservable<OutgoingRequestEvent> =
        new Observable<OutgoingRequestEvent>();
    private readonly onConnectionEstablishingObservable: IObservable<ClientToken> =
        new Observable<ClientToken>(); // Notified with the remote token when the WebRTC connection setup starts.

    /**
     * Subscribes to state changes of the locally initiated connection request.
     * Supports multiple subscribers; each must unsubscribe itself.
     */
    public subscribeToOutgoingRequestChanged(
        callback: (event: OutgoingRequestEvent) => void
    ) {
        this.onOutgoingRequestChangedObservable.subscribe(callback);
    }

    public unsubscribeFromOutgoingRequestChanged(
        callback: (event: OutgoingRequestEvent) => void
    ) {
        this.onOutgoingRequestChangedObservable.unsubscribe(callback);
    }

    /**
     * Returns the token of the peer the pending outgoing connection request is
     * addressed to, or undefined if no request is pending.
     */
    public getOutgoingRequestToken(): ClientToken | undefined {
        return this.outgoingRequestToken;
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

    private setOutgoingRequest(
        remoteToken: ClientToken | undefined,
        state: OutgoingRequestEvent["state"]
    ) {
        const previousToken = this.outgoingRequestToken;
        this.outgoingRequestToken = remoteToken;

        const eventToken = remoteToken ?? previousToken;
        if (eventToken) {
            this.onOutgoingRequestChangedObservable.notify({
                remoteToken: eventToken,
                state,
            });
        }
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

        this.handleConnectionEstablishmentMessage();

        this.handleConnectionRequestMessage();

        this.handleConnectionRequestCancelledMessage();

        this.waitForCloseConnectionRequest();

        this.handleConnectionResponseMessages();
    }

    private handleConnectionRequestCancelledMessage() {
        const onConnectionRequestCancelledReceived = (
            message: ConnectionRequestCancelledMessage
        ) => {
            this.log("Received remote token:", message.msg.remoteToken);

            if (!message.msg.remoteToken) {
                console.error(
                    "Received connection request cancelled message without remote token by server."
                );
                return;
            }

            const requestingPeerToken = normalizeClientToken(
                message.msg.remoteToken
            );

            this.onConnectionRequestCancelledReceivedObservable.notify(
                requestingPeerToken
            );
        };

        this.signaling.subscribeMessage(
            MessageType.CONNECTION_REQUEST_CANCELLED,
            onConnectionRequestCancelledReceived as MessageHandler
        );
    }

    /**
     * Returns true if the connection request was successfully cancelled, false otherwise.
     */
    public cancelConnectionRequest(remoteToken: ClientToken): boolean {
        remoteToken = normalizeClientToken(remoteToken);

        if (!this.expectedRemoteToken) {
            console.warn("No connection request to cancel.");
            return false;
        }

        if (remoteToken !== this.expectedRemoteToken) {
            console.warn(
                "Cannot cancel connection request to a different remote token."
            );
            return false;
        }

        const connectionRequestCancelMessage =
            new ConnectionRequestCancelledMessage({});

        this.signaling.sendMessage(connectionRequestCancelMessage);

        this.expectedRemoteToken = undefined;
        this.setOutgoingRequest(undefined, "cancelled");

        return true;
    }

    private handleConnectionResponseMessages() {
        const onConnectionResponseReceived = (
            message: ConnectionResponseMessage
        ) => {
            // Match against the outgoing request token, not expectedRemoteToken:
            // an incoming request received while waiting overwrites the latter,
            // which would strand the pending request forever.
            const responseToken = normalizeClientToken(message.msg.remoteToken);

            if (this.outgoingRequestToken !== responseToken) {
                return;
            }

            if (this.expectedRemoteToken === responseToken) {
                this.expectedRemoteToken = undefined;
            }
            this.setOutgoingRequest(undefined, "responded");

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
            remoteToken: normalizeClientToken(remoteToken),
        });

        this.signaling.sendMessage(connectionResponseMessage);
    }

    public rejectConnectionRequest(remoteToken: ClientToken) {
        const connectionResponseMessage = new ConnectionResponseMessage({
            accepted: false,
            remoteToken: normalizeClientToken(remoteToken),
        });

        this.signaling.sendMessage(connectionResponseMessage);
    }

    private handleConnectionRequestMessage() {
        const onConnectionRequestReceived = (
            message: EstablishConnectionMessage
        ) => {
            //Before Processing the connection request, check if we are already in a WebRTC connection.
            if (this.webrtcConnection && this.expectedRemoteToken) {
                this.log(
                    "Received connection request while already in a WebRTC connection. Sending cancel message."
                );

                const cancelMessage = new ConnectionResponseMessage({
                    accepted: false,
                    remoteToken: message.msg.remoteToken,
                });

                this.log(
                    "Token in ConnectionRequestCancelledMessage:",
                    message.msg.remoteToken
                );
                this.signaling.sendMessage(cancelMessage);
                return;
            }

            const requestingToken = normalizeClientToken(
                message.msg.remoteToken
            );
            this.expectedRemoteToken = requestingToken;

            this.onConnectionRequestReceivedObservable.notify(requestingToken);
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

            // A quick connect (or an incoming accept) can establish a
            // connection while an outgoing request is still pending elsewhere.
            if (this.outgoingRequestToken) {
                this.setOutgoingRequest(undefined, "responded");
            }

            const establishToken = normalizeClientToken(
                message.msg.remoteToken
            );
            this.expectedRemoteToken = establishToken;

            this.transferTracker.clear();
            this.webrtcConnection = new WebRTCConnection(
                this.signaling,
                establishToken,
                this.transferTracker
            );

            this.setupListeners();

            this.onConnectionEstablishingObservable.notify(establishToken);
        };

        this.signaling.subscribeMessage(
            MessageType.ESTABLISH_CONNECTION,
            onEstablishConnectionReceived as MessageHandler
        );
    }

    /**
     * Returns true if the connection request was successfully sent, false otherwise.
     */
    public requestConnectionToRemotePeer(remoteToken: ClientToken): boolean {
        remoteToken = normalizeClientToken(remoteToken);

        if (remoteToken.length !== 5) {
            toast.warn("Peer Token muss 5 Zeichen lang sein.", {
                toastId: "token-length-toast",
                updateId: "token-length-toast",
            });
            return false;
        }

        if (this.signaling.getLocalClientToken() === remoteToken) {
            toast.warn(
                "Bitte gib einen fremden Token ein, nicht deinen eigenen.",
                {
                    toastId: "cannot-send-to-self-toast",
                    updateId: "cannot-send-to-self-toast",
                }
            );
            return false;
        }

        this.expectedRemoteToken = remoteToken;
        this.setOutgoingRequest(remoteToken, "requested");

        const connectionRequestMessage = new ConnectionRequestMessage({
            remoteToken: remoteToken,
        });

        this.signaling.sendMessage(connectionRequestMessage);

        return true;
    }

    /**
     * Clears the current WebRTC connection.
     */
    private clearWebRTCConnection() {
        this.webrtcConnection?.closeConnection();

        this.webrtcConnection = undefined;
        this.expectedRemoteToken = undefined;
    }

    /**
     * Closes the current WebRTC connection, cleans up all related resources, and notifies observers about the connection closure.
     * The connection may already be closed, in which case this method does nothing because all related resources are already cleaned up.
     */
    public closePeerConnection() {
        if (!this.webrtcConnection) {
            return;
        }

        const expectedRemoteToken = this.expectedRemoteToken!;

        const closeConnectionMessage = new CloseConnectionMessage({
            remoteToken: expectedRemoteToken,
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
            this.expectedRemoteToken,
            "Remote token is not set. Ensure you have received the remote token."
        );
        return this.expectedRemoteToken;
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
