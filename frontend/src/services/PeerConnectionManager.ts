import { assert } from "../util/Assert";
import { WebRTCConnection } from "./WebRTCConnection";
import {
    MessageHandler,
    TypedMessage,
    WebSocketService,
    ClientToken,
} from "./WebSocketService";
import { MessageType } from "./MessageType";
import { IObservable, Observable } from "../util/observer/Observable";
import { log, setLogEnabled } from "../util/Logger";

export type RemoteTokenMessage = {
    requestID?: string;
    remoteToken: ClientToken;
};

type CloseConnectionMessage = {
    requestID?: string;
    remoteToken: ClientToken;
};

type ErrorMessage = {
    requestID: string;
    description: string;
    expected?: string;
    actual?: string;
};

type SuccessMessage = {
    requestID: string;
    description: string;
};

// This message is sent to a remote peer to request a connection.
type ConnectionRequestMessage = {
    remoteToken: ClientToken;
};

// This message is sent to the signaling server to cancel a connection request.
type ConnectionRequestCancelledMessage = {
    remoteToken?: ClientToken;
};

// This message is the response to a connection request. It may be successful or not.
type ConnectionResponseMessage = {
    accepted: boolean; // true if the connection request was accepted by the remote peer, false otherwise or if the remote peer is not available.
    remoteToken: ClientToken;
};

// This message signals that the local client should immediately establish a WebRTC connection to the specified remote peer. Both peers will receive this message when the server decides they should connect.
type EstablishConnectionMessage = {
    remoteToken: ClientToken;
};

export class PeerConnectionManager {
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
    private onReceivedFileCallback?: (name: string, size: number) => void;

    public constructor(private readonly signaling: WebSocketService) {
        setLogEnabled(false);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (window as any).PeerConnectionManager = this;

        this.handleConnectionEstablishmentMessage();

        this.handleConnectionRequestMessage();

        this.handleConnectionRequestCancelledMessage();

        this.waitForCloseConnectionRequest();
    }

    private handleConnectionRequestCancelledMessage() {
        const onConnectionRequestCancelledReceived = (
            message: TypedMessage<ConnectionRequestCancelledMessage>
        ) => {
            const requestingPeerToken = message.msg.remoteToken;
            log("Received remote token:", message.msg.remoteToken);

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

        const connectionRequestCancelMessage: TypedMessage<ConnectionRequestCancelledMessage> =
            {
                type: MessageType.CONNECTION_REQUEST_CANCELLED,
                msg: {},
            };

        this.signaling.sendMessage(connectionRequestCancelMessage);

        this.expectedRemoteToken = undefined;

        return true;
    }

    private handleConnectionResponseMessages() {
        const onConnectionResponseReceived = (
            message: TypedMessage<ConnectionResponseMessage>
        ) => {
            if (this.expectedRemoteToken !== message.msg.remoteToken) {
                return;
            }

            this.signaling.unsubscribeMessage(
                MessageType.CONNECTION_RESPONSE,
                onConnectionResponseReceived as MessageHandler
            );

            this.expectedRemoteToken = undefined;

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
        const connectionResponseMessage: TypedMessage<ConnectionResponseMessage> =
            {
                type: MessageType.CONNECTION_RESPONSE,
                msg: {
                    accepted: true,
                    remoteToken: remoteToken,
                },
            };

        this.signaling.sendMessage(connectionResponseMessage);
    }

    public rejectConnectionRequest(remoteToken: ClientToken) {
        const connectionResponseMessage: TypedMessage<ConnectionResponseMessage> =
            {
                type: MessageType.CONNECTION_RESPONSE,
                msg: {
                    accepted: false,
                    remoteToken: remoteToken,
                },
            };

        this.signaling.sendMessage(connectionResponseMessage);
    }

    private handleConnectionRequestMessage() {
        const onConnectionRequestReceived = (
            message: TypedMessage<EstablishConnectionMessage>
        ) => {
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
            message: TypedMessage<EstablishConnectionMessage>
        ) => {
            this.closePeerConnection();

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
            console.warn("Peer token must be 5 characters long.");
            return false;
        }

        if (this.signaling.getLocalClientToken() === remoteToken) {
            console.error("Cannot send token to self.");
            return false;
        }

        this.expectedRemoteToken = remoteToken;

        const connectionRequestMessage: TypedMessage<ConnectionRequestMessage> =
            {
                type: MessageType.CONNECTION_REQUEST,
                msg: {
                    remoteToken: remoteToken,
                },
            };

        this.handleConnectionResponseMessages();

        this.signaling.sendMessage(connectionRequestMessage);

        return true;
    }

    /**
     * Sends a message to the signaling server and asynchronously waits for a response.
     *
     * This method:
     * - Sends the provided message (`message`) to the signaling server.
     * - Registers temporary handlers for success and error messages (`SUCCESS_MESSAGE_TYPE` and `ERROR_MESSAGE_TYPE`).
     * - Compares the `requestID` of incoming responses with the sent message to ensure only the matching response is processed.
     * - Removes the handlers after receiving the matching response.
     * - Resolves the promise with the success message or rejects it with an error message.
     *
     * @param message The message to send, including a unique `requestID`.
     * @returns A promise that resolves with the response message (success or error).
     */
    private sendMessageAndWaitForResponse(
        message: TypedMessage<RemoteTokenMessage>
    ): Promise<TypedMessage<ErrorMessage | SuccessMessage>> {
        return new Promise((resolve, reject) => {
            const handlerResponse = (
                response: TypedMessage<ErrorMessage | SuccessMessage>
            ) => {
                const requestID = message.msg.requestID;
                if (response.msg.requestID !== requestID) {
                    console.warn(
                        "Received response with different requestID:",
                        response.msg.requestID,
                        "so ignoring it"
                    );
                    return; // Ignore this response
                }

                log(
                    "Received response with requestID:",
                    response.msg.requestID
                );

                this.signaling.unsubscribeMessage(
                    MessageType.SUCCESS,
                    handlerResponse as MessageHandler
                );
                this.signaling.unsubscribeMessage(
                    MessageType.ERROR,
                    handlerResponse as MessageHandler
                );

                if (response.type == MessageType.ERROR) {
                    reject(
                        new Error((response.msg as ErrorMessage).description)
                    );
                }
                if (response.type == MessageType.SUCCESS) {
                    resolve(response as TypedMessage<SuccessMessage>);
                }
            };

            this.signaling.subscribeMessage(
                MessageType.SUCCESS,
                handlerResponse as MessageHandler
            );
            this.signaling.subscribeMessage(
                MessageType.ERROR,
                handlerResponse as MessageHandler
            );

            this.signaling.sendMessage(message);
        });
    }

    /**
     * Closes the current WebRTC connection and cleans up all related resources.
     * The connection may already be closed, in which case this method does nothing because all related resources are already cleaned up.
     */
    public closePeerConnection() {
        if (!this.webrtcConnection) {
            return;
        }

        log("Closing peer connection");

        this.webrtcConnection.closePeerConnection();

        const closeConnectionMessage: TypedMessage<CloseConnectionMessage> = {
            type: MessageType.CLOSE_CONNECTION,
            msg: {
                remoteToken: this.expectedRemoteToken!,
            },
        };

        this.signaling.sendMessage(closeConnectionMessage);
        log("Sent close connection message to signaling server");

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
            message: TypedMessage<CloseConnectionMessage>
        ) => {
            log("Received close connection request:", message.msg.remoteToken);

            assert(this.webrtcConnection, "No active connection to close.");

            log("Closing peer connection");

            this.webrtcConnection.closePeerConnection();

            this.expectedRemoteToken = undefined;
            this.webrtcConnection = undefined;
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
                log(
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
                log(
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
                const { name, size } = data as {
                    name: string;
                    size: number;
                };
                log(
                    "PEERCONNECTIONMANAGER ::: Received file:",
                    name,
                    "of size:",
                    size
                );
                assert(
                    this.onReceivedFileCallback,
                    "onReceivedFileCallback is not set."
                );
                this.onReceivedFileCallback(name, size);
            }
        );
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
        log(
            "PEERCONNECTIONMANAGER ::: Set OnConnectedCallback to:",
            this.onConnectedCallback
        );
    }

    public setOnDisconnectedCallback(cb: () => void) {
        this.onDisconnectedCallback = cb;
        log(
            "PEERCONNECTIONMANAGER ::: Set OnDisconnectedCallback to:",
            this.onDisconnectedCallback
        );
    }

    public setOnReceivedFileCallback(cb: (name: string, size: number) => void) {
        this.onReceivedFileCallback = cb;
        log(
            "PEERCONNECTIONMANAGER ::: Set OnReceivedFileCallback to:",
            this.onReceivedFileCallback
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
    public sendFile(file: File) {
        assert(this.webrtcConnection, "No active connection to send file.");
        this.webrtcConnection.sendFileOverDataChannel(file);
    }
}
