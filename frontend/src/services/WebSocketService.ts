import { assert, never } from "../util/Assert";

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

export type ClientTokenMessage = {
    token: ClientToken;
};

export type ClientToken = string;

const CLIENT_TOKEN_MESSAGE_TYPE: string = "client-token";
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

    /**
     * Initializes a new instance of the WebSocketService class.
     * It connects to the server.
     */
    public constructor() {
        this.connectToServer();

        this.waitForLocalClientToken();

        // WebSocketService global verfügbar machen für die Konsole im Browser (dev mode)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (window as any).webSocketService = this;
    }

    public sendMessageAndWaitForResponse<T>(
        message: TypedMessage<T>
    ): Promise<TypedMessage<ErrorMessage | SuccessMessage>> {
        return new Promise((resolve, reject) => {
            const handlerResponse = (
                response: TypedMessage<ErrorMessage | SuccessMessage>
            ) => {
                if (response.type == ERROR_MESSAGE_TYPE) {
                    this.unsubscribeMessage(
                        SUCCESS_MESSAGE_TYPE,
                        handlerResponse as MessageHandler
                    );
                    this.unsubscribeMessage(
                        ERROR_MESSAGE_TYPE,
                        handlerResponse as MessageHandler
                    );

                    reject(
                        new Error((response.msg as ErrorMessage).description)
                    );
                }
                if (response.type == SUCCESS_MESSAGE_TYPE) {
                    this.unsubscribeMessage(
                        SUCCESS_MESSAGE_TYPE,
                        handlerResponse as MessageHandler
                    );
                    this.unsubscribeMessage(
                        ERROR_MESSAGE_TYPE,
                        handlerResponse as MessageHandler
                    );

                    resolve(response as TypedMessage<SuccessMessage>);
                }
            };

            this.subscribeMessage(
                SUCCESS_MESSAGE_TYPE,
                handlerResponse as MessageHandler
            );
            this.subscribeMessage(
                ERROR_MESSAGE_TYPE,
                handlerResponse as MessageHandler
            );

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

    public getHandlers(messageType: MessageType): MessageHandler[] | undefined {
        return this.messageHandlers.get(messageType);
    }
}
