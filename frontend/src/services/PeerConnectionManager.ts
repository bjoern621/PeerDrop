import { assert } from "../util/Assert";
import errorAsValue from "../util/ErrorAsValue";
import { WebRTCConnection } from "./WebRTCConnection";
import {
    MessageHandler,
    TypedMessage,
    WebSocketService,
    ClientToken,
} from "./WebSocketService";
import { MessageType } from "./MessageType";

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

export class PeerConnectionManager {
    private remoteToken: ClientToken | undefined;
    private connection: WebRTCConnection | undefined;
    private onConnectedCallback?: () => void;
    private onDisconnectedCallback?: () => void;

    public constructor(private readonly signaling: WebSocketService) {
        this.waitForRemoteClientToken();
        console.log("Executing PeerConnectionManager constructor");
        this.waitForCloseConnectionRequest();
    }

    /**
     * Waits for the remote peer token to be received via a message of type `REMOTE_TOKEN_MESSAGE_TYPE`.
     *
     * This method subscribes to messages of the specified type and sets the `remoteToken` property
     * when a message containing the remote peer token is received. Once the remote token is obtained, the
     * subscription to the message type is automatically removed.
     */
    private waitForRemoteClientToken() {
        const handleRemoteTokenMessage = (
            message: TypedMessage<RemoteTokenMessage>
        ) => {
            console.log("Received remote token:", message.msg.remoteToken);

            this.remoteToken = message.msg.remoteToken;

            // Verbindungsbestätigung muss hier hin, dass der Peer die Verbindungsanfrage akzeptieren oder ablehnen kann
            // (später dann auch, dass falls der andere Peer den Verbindungsaufbau abbricht, dass die Anfrage hier dann auch abbricht mit
            // einer passenden Nachricht)

            this.signaling.unsubscribeMessage(
                MessageType.REMOTE_TOKEN,
                handleRemoteTokenMessage as MessageHandler
            );

            this.connection = new WebRTCConnection(
                this.signaling,
                this.remoteToken
            );

            this.setCallbackForPeer();
        };

        this.signaling.subscribeMessage(
            MessageType.REMOTE_TOKEN,
            handleRemoteTokenMessage as MessageHandler
        );
    }

    /**
     * Stores the remote peer's token locally and sends a message with this token to the signaling server.
     * The signaling server then swaps the `msg.remoteToken` with the sender's token, so that the recipient
     * receives the sender's token as `msg.remoteToken`.
     *
     * To avoid race conditions, each request is assigned a unique `requestID`. The response messages
     * (success or error) contain the same `requestID`, ensuring that only the response matching the request is processed.
     * All other responses are ignored.
     *
     * After a successful response, all handlers for the message type `REMOTE_TOKEN_MESSAGE_TYPE` are removed.
     *
     * @param otherPeerToken The token of the other peer as a string.
     */
    public async sendTokenToRemotePeer(otherPeerToken: string) {
        const otherToken: ClientToken = otherPeerToken;

        if (this.signaling.getLocalClientToken() === otherToken) {
            console.error("Cannot send token to self:", otherToken);
            return;
        }

        const requestID: string = crypto.randomUUID();

        const tokenMessage: TypedMessage<RemoteTokenMessage> = {
            type: MessageType.REMOTE_TOKEN,
            msg: {
                requestID: requestID,
                remoteToken: otherToken,
            },
        };

        console.log(
            "Created and sending TypedMessage with requestID:",
            requestID
        );

        const [, err] = await errorAsValue(
            this.sendMessageAndWaitForResponse(tokenMessage)
        );
        if (err) {
            console.error("Error sending remote token:", err.message);
            return;
        }

        // Verbindungsbestätigung muss hier hin, ein Fenster, bei dem er warten muss auf Bestätigung des anderen Peers
        // (später dann auch dass er die Verbindungsanfrage abbrechne kann)

        this.remoteToken = otherToken;

        console.log("Sent remote token to signaling server:", otherToken);

        //unsubscribe all handlers for the REMOTE_TOKEN_MESSAGE_TYPE
        const handlersRemoteToken = this.signaling.getHandlers(
            MessageType.REMOTE_TOKEN
        );
        if (handlersRemoteToken) {
            handlersRemoteToken.forEach(handler => {
                this.signaling.unsubscribeMessage(
                    MessageType.REMOTE_TOKEN,
                    handler
                );
            });

            this.connection = new WebRTCConnection(
                this.signaling,
                this.remoteToken
            );

            this.setCallbackForPeer();
        }
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
                    console.error(
                        "Received response with different requestID:",
                        response.msg.requestID,
                        "so ignoring it"
                    );
                    return; // Ignore this response
                }

                console.log(
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
     *
     * This method closes the active connection (if any), sends a close connection message to the remote peer,
     * resets the `remoteToken` and `connection` properties, and starts waiting for a new remote client token.
     * This ensures both peers close their connections and are ready for a new connection.
     */
    public closePeerConnection() {
        if (!this.connection) {
            console.warn("No active connection to close.");
            return;
        }

        console.log("Closing peer connection");

        this.connection.closePeerConnection();

        const closeConnectionMessage: TypedMessage<CloseConnectionMessage> = {
            type: MessageType.CLOSE_CONNECTION,
            msg: {
                remoteToken: this.remoteToken!,
            },
        };

        this.signaling.sendMessage(closeConnectionMessage);
        console.log("Sent close connection message to signaling server");

        this.remoteToken = undefined;
        this.connection = undefined;

        this.waitForRemoteClientToken();
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
        console.log("Executing waitForCloseConnectionRequest Method");
        const handleCloseConnectionRequest = (
            message: TypedMessage<CloseConnectionMessage>
        ) => {
            console.log(
                "Received close connection request:",
                message.msg.remoteToken
            );

            if (!this.connection) {
                console.warn("No active connection to close.");
                return;
            }

            console.log("Closing peer connection");

            this.connection.closePeerConnection();

            this.remoteToken = undefined;
            this.connection = undefined;
            this.waitForRemoteClientToken();

            /*this.signaling.unsubscribeMessage(
                MessageType.CLOSE_CONNECTION,
                handleCloseConnectionRequest as MessageHandler
            );*/
        };

        this.signaling.subscribeMessage(
            MessageType.CLOSE_CONNECTION,
            handleCloseConnectionRequest as MessageHandler
        );
    }

    // Sets a callback for when the peer connection state changes to "connected".
    private setCallbackForPeer() {
        assert(this.connection, "PeerConnection is not initialized.");
        this.connection.subscribe(state => {
            if (state === "connected") {
                console.log(
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
                console.log(
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
        console.log(
            "PEERCONNECTIONMANAGER ::: Set OnConnectedCallback to:",
            this.onConnectedCallback
        );
    }

    public setOnDisconnectedCallback(cb: () => void) {
        this.onDisconnectedCallback = cb;
        console.log(
            "PEERCONNECTIONMANAGER ::: Set OnDisconnectedCallback to:",
            this.onDisconnectedCallback
        );
    }

    public getConnection() {
        return this.connection;
    }

    public getRemoteToken() {
        assert(
            this.remoteToken,
            "Remote token is not set. Ensure you have received the remote token."
        );
        return this.remoteToken;
    }
}
