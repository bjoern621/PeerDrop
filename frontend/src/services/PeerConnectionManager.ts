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
import { ConnectionRequestMessage } from "../types/connection/ConnectionRequestMessage";
import { ConnectionResponseMessage } from "../types/connection//ConnectionResponseMessage";
import { EstablishConnectionMessage } from "../types/connection//EstablishConnectionMessage";
import { CloseConnectionMessage } from "../types/connection//CloseConnectionMessage";
import { toast } from "react-toastify/unstyled";

export class PeerConnectionManager {
    private readonly logger = new Logger("PeerConnectionManager");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);
    private expectedRemoteToken: ClientToken | undefined; // The token of the remote peer we accept connections from.
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

    private onConnectedCallback?: () => void;
    private onDisconnectedCallback?: () => void;
    private onReceivedFileCallback?: (
        name: string,
        size: number,
        uuid: string
    ) => void;
    private onFileProgressCallback?: (uuid: string, progress: number) => void;

    public constructor(private readonly signaling: WebSocketService) {
        this.logger.setEnabled(false);

        this.handleConnectionEstablishmentMessage();

        this.handleConnectionRequestMessage();

        this.handleConnectionRequestCancelledMessage();

        this.waitForCloseConnectionRequest();
    }

    private handleConnectionRequestCancelledMessage() {
        const onConnectionRequestCancelledReceived = (
            message: ConnectionRequestCancelledMessage
        ) => {
            const requestingPeerToken = message.msg.remoteToken;
            this.log("Received remote token:", message.msg.remoteToken);

            if (!requestingPeerToken) {
                console.error(
                    "Received connection request cancelled message without remote token by server."
                );
                return;
            }

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

        return true;
    }

    private handleConnectionResponseMessages() {
        const onConnectionResponseReceived = (
            message: ConnectionResponseMessage
        ) => {
            if (this.expectedRemoteToken !== message.msg.remoteToken) {
                return;
            }

            this.signaling.unsubscribeMessage(
                MessageType.CONNECTION_RESPONSE,
                onConnectionResponseReceived as MessageHandler
            );

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

            this.expectedRemoteToken = message.msg.remoteToken;

            this.onConnectionRequestReceivedObservable.notify(
                message.msg.remoteToken
            );
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

            this.expectedRemoteToken = message.msg.remoteToken;

            this.webrtcConnection = new WebRTCConnection(
                this.signaling,
                message.msg.remoteToken
            );

            this.setupListeners();
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
        if (remoteToken.length !== 5) {
            toast.warn("Peer Token muss 5 Zeichen lang sein.", {
                toastId: "instant-message-toast",
                updateId: "instant-message-toast",
            });
            return false;
        }

        if (this.signaling.getLocalClientToken() === remoteToken) {
            toast.warn("Kann Token nicht an sich selbst senden.", {
                toastId: "instant-message-toast",
                updateId: "instant-message-toast",
            });
            return false;
        }

        this.expectedRemoteToken = remoteToken;

        const connectionRequestMessage = new ConnectionRequestMessage({
            remoteToken: remoteToken,
        });

        this.handleConnectionResponseMessages();

        this.signaling.sendMessage(connectionRequestMessage);

        return true;
    }

    /**
     * Closes the current WebRTC connection and cleans up all related resources.
     * The connection may already be closed, in which case this method does nothing because all related resources are already cleaned up.
     */
    public closePeerConnection() {
        if (!this.webrtcConnection) {
            return;
        }

        this.log("Closing peer connection");

        this.webrtcConnection.closePeerConnection();

        const closeConnectionMessage = new CloseConnectionMessage({
            remoteToken: this.expectedRemoteToken!,
        });

        this.signaling.sendMessage(closeConnectionMessage);
        this.log("Sent close connection message to signaling server");

        this.expectedRemoteToken = undefined;
        this.webrtcConnection = undefined;
    }

    /**
     * Waits for a close connection request from the remote peer via a message of type `CLOSE_CONNECTION_MESSAGE_TYPE`.
     *
     * This method subscribes to messages of the specified type and, upon receiving a close connection request,
     * closes the current WebRTC connection by calling `closePeerConnection()`, resets the `remoteToken` and `connection`
     * properties, and starts waiting for a new remote client token by invoking `waitForRemoteClientToken()`.
     * The subscription to the message type remains active to handle future close requests.
     */
    private waitForCloseConnectionRequest() {
        const handleCloseConnectionRequest = (
            message: CloseConnectionMessage
        ) => {
            this.log(
                "Received close connection request:",
                message.msg.remoteToken
            );

            assert(this.webrtcConnection, "No active connection to close.");

            this.log("Closing peer connection");

            this.webrtcConnection.closePeerConnection();

            this.expectedRemoteToken = undefined;
            this.webrtcConnection = undefined;

            toast.info("Der Peer hat die Verbindung geschlossen.");
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
                this.log(
                    "PEERCONNECTIONMANAGER ::: state:",
                    state,
                    " and onDisconnectedCallback is:",
                    this.onDisconnectedCallback
                );
                assert(
                    this.onDisconnectedCallback,
                    "onDisconnectedCallback is not set."
                );
                this.onDisconnectedCallback();
            }
        });

        this.webrtcConnection.subscribeTo(
            "fileMetaReceived",
            (data: unknown) => {
                const { name, size, uuid } = data as {
                    name: string;
                    size: number;
                    uuid: string;
                };
                this.log(
                    "PEERCONNECTIONMANAGER ::: Received file:",
                    name,
                    "of size:",
                    size
                );
                assert(
                    this.onReceivedFileCallback,
                    "onReceivedFileCallback is not set."
                );
                this.onReceivedFileCallback(name, size, uuid);
            }
        );

        this.webrtcConnection.subscribeTo("fileProgress", (data: unknown) => {
            const { uuid, progress } = data as {
                uuid: string;
                progress: number;
            };
            this.log(
                "PEERCONNECTIONMANAGER ::: File progress:",
                uuid,
                "with new progress:",
                progress
            );
            assert(
                this.onFileProgressCallback,
                "onFileProgressCallback is not set."
            );
            this.onFileProgressCallback(uuid, progress);
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

    public setOnDisconnectedCallback(cb: () => void) {
        this.onDisconnectedCallback = cb;
        this.log(
            "PEERCONNECTIONMANAGER ::: Set OnDisconnectedCallback to:",
            this.onDisconnectedCallback
        );
    }

    public setOnReceivedFileCallback(
        cb: (name: string, size: number, uuid: string) => void
    ) {
        this.onReceivedFileCallback = cb;
        this.log(
            "PEERCONNECTIONMANAGER ::: Set OnReceivedFileCallback to:",
            this.onReceivedFileCallback
        );
    }

    public setOnFileProgressCallback(
        cb: (uuid: string, progress: number) => void
    ) {
        this.onFileProgressCallback = cb;
        this.log(
            "PEERCONNECTIONMANAGER ::: Set OnFileProgressCallback to:",
            this.onFileProgressCallback
        );
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
}
