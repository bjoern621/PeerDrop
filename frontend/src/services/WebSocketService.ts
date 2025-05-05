import { assert, never } from "../util/Assert";

export type MessageHandler = (typedMessage: TypedMessage<unknown>) => unknown;

export type MessageType = string;

export type TypedMessage<T = unknown> = {
    type: MessageType;
    msg: T;
};

export type ErrorMessage = {
    errorMessage: string;
    expected?: string;
    actual?: string;
};

type ClientIDMessage = {
    clientID: ClientID;
};

export const CLIENT_DISCONNECT_MESSAGE_TYPE: MessageType = "client-disconnect";

export type ClientDisconnectMessage = {
    clientID: ClientID;
};

export type ClientID = string;

const CLIENT_ID_MESSAGE_TYPE: string = "client-id";

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

    private localClientID: ClientID | undefined;

    /**
     * Initializes a new instance of the WebSocketService class.
     * It connects to the server.
     */
    public constructor() {
        this.connectToServer();

        // this.waitForLocalClientID();
    }

    private connectToServer() {
        this.socket = new WebSocket(
            `ws://${import.meta.env.VITE_BACKEND_HOST}:${
                import.meta.env.VITE_BACKEND_PORT
            }/connect`
        );

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

                // for (const handler of handlers) {
                //     handler(typedMessage);
                // }
            }
        };
    }

    /**
     * Waits for the local client ID to be received via a message of type `CLIENT_ID_MESSAGE_TYPE`.
     *
     * This method subscribes to messages of the specified type and sets the `localClientID` property
     * when a message containing the client ID is received. Once the client ID is obtained, the
     * subscription to the message type is automatically removed.
     */
    private waitForLocalClientID() {
        const handleClientIDMessage = (
            message: TypedMessage<ClientIDMessage>
        ) => {
            this.localClientID = message.msg.clientID;

            this.unsubscribeMessage(
                CLIENT_ID_MESSAGE_TYPE,
                handleClientIDMessage as MessageHandler
            );
        };

        this.subscribeMessage(
            CLIENT_ID_MESSAGE_TYPE,
            handleClientIDMessage as MessageHandler
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

    // TODO subscribe / unsubcribe: specify if one handler can be subscribed to the same mssage type multiple times

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
    }

    public getLocalClientID(): ClientID {
        assert(this.localClientID, "Local Client ID not set yet.");

        return this.localClientID;
    }
}
