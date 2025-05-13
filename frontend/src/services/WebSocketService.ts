import { assert, never } from "../util/Assert";
import errorAsValue from "../util/ErrorAsValue";
import { WebRTCConnection } from "./WebRTCConnection";

export type MessageHandler = (typedMessage: TypedMessage<unknown>) => unknown;

export type MessageType = string;

export type TypedMessage<T = unknown> = {
    type: MessageType;
    msg: T;
};

export type ErrorMessage = {
    description: string;
    expected?: string;
    actual?: string;
};

export type SuccessMessage = {
    description: string;
};

export type RemoteTokenMessage = {
    remoteToken: ClientToken;
};

export type ClientTokenMessage = {
    token: ClientToken;
};

export type ClientToken = string;

const CLIENT_TOKEN_MESSAGE_TYPE: string = "client-token";
const REMOTE_TOKEN_MESSAGE_TYPE: string = "remote-token";
const ERROR_MESSAGE_TYPE: string = "error-message";
const SUCCESS_MESSAGE_TYPE: string = "success-message";

/**
 * The `WebSocketService` class provides functionality for managing the WebSocket connection
 * to the server, sending and receiving typed messages, and subscribing to specific
 * message types for event handling.
 */
export class WebSocketService {
    // Represents the currently active WebSocket connection to the server.
    // The WebSocket connection state may be anything.
    private socket: WebSocket | undefined;

    private readonly messageHandlers: Map<MessageType, MessageHandler[]> =
        new Map();

    private localToken: ClientToken | undefined;

    private remoteToken: ClientToken | undefined;

    private peer: WebRTCConnection | undefined;

    /**
     * Initializes a new instance of the WebSocketService class.
     * It connects to the server.
     */
    public constructor() {
        this.connectToServer();

        this.waitForLocalClientToken();

        this.waitForRemoteClientToken();

        // WebSocketService global verfügbar machen für die Konsole im Browser (dev mode)
        //(window as any).webSocketService = this;
    }

    public sendMessageAndWaitForResponse<T>(message: TypedMessage<T>): Promise<TypedMessage<ErrorMessage | SuccessMessage>> {
        return new Promise((resolve, reject) => {
            const handlerResponse = (response: TypedMessage<ErrorMessage | SuccessMessage>) => {
                if(response.type == ERROR_MESSAGE_TYPE) {

                    this.unsubscribeMessage(SUCCESS_MESSAGE_TYPE, handlerResponse as MessageHandler);
                    this.unsubscribeMessage(ERROR_MESSAGE_TYPE, handlerResponse as MessageHandler);

                    reject(new Error((response.msg as ErrorMessage).description));
                }
                if(response.type == SUCCESS_MESSAGE_TYPE) {

                    this.unsubscribeMessage(SUCCESS_MESSAGE_TYPE, handlerResponse as MessageHandler);
                    this.unsubscribeMessage(ERROR_MESSAGE_TYPE, handlerResponse as MessageHandler);

                    resolve(response as TypedMessage<SuccessMessage>);
                }
            };

            this.subscribeMessage(SUCCESS_MESSAGE_TYPE, handlerResponse as MessageHandler);
            this.subscribeMessage(ERROR_MESSAGE_TYPE, handlerResponse as MessageHandler);

            this.sendMessage(message);
        });
    }

    private connectToServer() {
        this.socket = new WebSocket(
            `${import.meta.env.VITE_WS_BACKEND_URL}/connect`
        );

        this.listenToMessages();
    }

    private listenToMessages() {
        assert(this.socket);

        this.socket.onmessage = async event => {
            console.log("response from server: " + event.data);

            if (typeof event.data !== "string") {
                console.error("Invalid message data type:", typeof event.data);
                return;
            }

            const typedMessage: TypedMessage<unknown> = JSON.parse(
                event.data
            ) as TypedMessage<unknown>;

            // Notify all subscribers for this message type
            const handlers = this.messageHandlers.get(typedMessage.type);
            if (handlers) {
                await Promise.allSettled(
                    handlers.map(handler => handler(typedMessage))
                );
            }
        };
    }

    /**
     * Waits for the local client token to be received via a message of type `CLIENT_ID_MESSAGE_TYPE`.
     *
     * This method subscribes to messages of the specified type and sets the `localToken` property
     * when a message containing the client token is received. Once the client token is obtained, the
     * subscription to the message type is automatically removed.
     */
    private waitForLocalClientToken() {
        const handleClientTokenMessage = (
            message: TypedMessage<ClientTokenMessage>
        ) => {
            console.log("Received client token:", message.msg.token);

            this.localToken = message.msg.token;

            this.unsubscribeMessage(
                CLIENT_TOKEN_MESSAGE_TYPE,
                handleClientTokenMessage as MessageHandler
            );
        };

        this.subscribeMessage(
            CLIENT_TOKEN_MESSAGE_TYPE,
            handleClientTokenMessage as MessageHandler
        );
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

            this.unsubscribeMessage(
                REMOTE_TOKEN_MESSAGE_TYPE,
                handleRemoteTokenMessage as MessageHandler
            );

            this.peer = new WebRTCConnection(this);
        };

        this.subscribeMessage(
            REMOTE_TOKEN_MESSAGE_TYPE,
            handleRemoteTokenMessage as MessageHandler
        );
    }

    /**
     * Stores the remote peer's token locally and sends a message to the signaling server containing this token.
     * The signaling server then swaps the `msg.remoteToken` with the token of the sender (the peer that sent the message),
     * effectively making the sender's token the `msg.remoteToken` for the recipient.
     * Finally all (only one) handlers for the `REMOTE_TOKEN_MESSAGE_TYPE` are unsubscribed fot this instance.
     *
     * @param otherPeerToken The token of the other peer as a strring.
     */
    public async sendTokenToRemotePeer(otherPeerToken: string) {

        const otherToken: ClientToken = otherPeerToken;

        const tokenMessage: TypedMessage<RemoteTokenMessage> = {
            type: REMOTE_TOKEN_MESSAGE_TYPE,
            msg: {
                remoteToken: otherToken,
            },
        };

        const [, err] = await errorAsValue(this.sendMessageAndWaitForResponse<RemoteTokenMessage>(tokenMessage));
        if(err) {
            console.error("Error sending remote token:", err.message);
            return;
        }

        this.remoteToken = otherToken;


        console.log("Sent remote token to signaling server:", otherToken);

        //unsubscribe all handlers for the REMOTE_TOKEN_MESSAGE_TYPE
        const handlersRemoteToken = this.messageHandlers.get(
            REMOTE_TOKEN_MESSAGE_TYPE
        );
        if (handlersRemoteToken) {
            handlersRemoteToken.forEach(handler => {
                this.unsubscribeMessage(REMOTE_TOKEN_MESSAGE_TYPE, handler);
            });
        }

        this.peer = new WebRTCConnection(this);

        this.peer.testMethodDataChannelInitializier();
    }

    /**
     * Closes the currently active WebSocket connection if it exists and is open.
     * There must be an active connection (with any connection state).
     *
     * @returns {boolean}   `true` if the connection was successfully closed or was already closed, and `false` if the connection is still in the process of being established.
     *                      If `true`, a new connection can be established.
     */
    public closeActiveConnection(): boolean {
        assert(this.socket);

        switch (this.socket.readyState) {
            case WebSocket.CONNECTING:
                return false;
            case WebSocket.OPEN:
                this.socket.close();
                this.socket = undefined;
                break;
            case WebSocket.CLOSING:
            case WebSocket.CLOSED:
                this.socket = undefined;
                break;
            default:
                never();
        }

        return true;
    }

    public sendMessage<T>(message: TypedMessage<T>) {
        assert(this.socket);

        this.socket.send(JSON.stringify(message));
    }

    /**
     * Subscribe to a specific message type.
     */
    public subscribeMessage(
        messageType: MessageType,
        handler: MessageHandler
    ): void {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }

        const handlers = this.messageHandlers.get(messageType);
        assert(handlers);

        handlers.push(handler);
    }

    /**
     * Unsubscribe from a specific message type.
     * The handler must be subscribed to the message type.
     */
    public unsubscribeMessage(
        messageType: MessageType,
        handler: MessageHandler
    ): void {
        const handlers = this.messageHandlers.get(messageType);
        assert(handlers);
        assert(handlers.includes(handler));

        const index = handlers.indexOf(handler);
        assert(index != -1);

        handlers.splice(index, 1);
        console.log("Unsubscribed a handler from message type:", messageType);
    }

    public getLocalClientToken(): ClientToken | undefined {
        return this.localToken;
    }

    public getRemoteClientToken(): ClientToken | undefined {
        return this.remoteToken;
    }

    public getPeer(): WebRTCConnection | undefined {
        return this.peer;
    }
}
