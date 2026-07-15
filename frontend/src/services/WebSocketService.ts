import { assert, never } from "../util/Assert";
import { MessageType } from "../types/MessageType";
import { Logger } from "../util/Logger";
import { ITypedMessage } from "../types/ITypedMessage";
import { ClientTokenMessage } from "../types/token/ClientTokenMessage";
import { getRuntimeEnvVars } from "../util/RuntimeEnvVars";

export type MessageHandler = (typedMessage: ITypedMessage) => unknown;

export type ClientToken = string;

/**
 * Normalizes a client token to its canonical form (lowercase).
 *
 * Tokens are proquints that the backend generates and matches in lowercase.
 * Lowercase is the canonical form everywhere in application state and in every
 * token comparison, so equality never depends on how a token was typed or
 * received. Uppercase is a presentation concern applied only at render time.
 */
export function normalizeClientToken(token: ClientToken): ClientToken {
    return token.toLowerCase();
}

/**
 * The `WebSocketService` class provides functionality for managing the WebSocket connection
 * to the server, sending and receiving typed messages, and subscribing to specific
 * message types for event handling.
 */
export class WebSocketService {
    private readonly logger = new Logger("WebSocketService");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);
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
        this.logger.setEnabled(false); // Disable logging by default, can be enabled later if needed

        this.openWebSocket();
    }

    public openWebSocket(): void {
        assert(!this.socket, "WebSocket is already open.");
        this.connectToServer();
        this.waitForLocalClientToken();
    }

    private connectToServer() {
        this.socket = new WebSocket(
            `${getRuntimeEnvVars().wsBackendUrl}/connect`
        );

        this.listenToMessages();
    }

    private listenToMessages() {
        assert(this.socket);

        this.socket.onmessage = async event => {
            this.log("response from server: " + event.data);

            if (typeof event.data !== "string") {
                console.error("Invalid message data type:", typeof event.data);
                return;
            }

            const typedMessage: ITypedMessage = JSON.parse(
                event.data
            ) as ITypedMessage;

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
        const handleClientTokenMessage = (message: ClientTokenMessage) => {
            this.log("Received client token:", message.msg.token);

            this.localToken = normalizeClientToken(message.msg.token);

            this.unsubscribeMessage(
                MessageType.CLIENT_TOKEN,
                handleClientTokenMessage as MessageHandler
            );
        };

        this.subscribeMessage(
            MessageType.CLIENT_TOKEN,
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
                // this.log("WebSocket is not yet open. Delaying close.");
                this.socket.addEventListener("open", () => {
                    assert(this.socket);
                    this.socket.close();
                    this.socket = undefined;
                });

                return true;
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

    public sendMessage(message: ITypedMessage) {
        assert(this.socket);

        if (this.socket.readyState !== WebSocket.OPEN) {
            // this.log("WebSocket is not yet open. Delaying message send.");
            this.socket.addEventListener("open", () => {
                this.sendMessage(message);
            });

            return;
        }

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
        this.log("Unsubscribed a handler from message type:", messageType);
    }

    /**
     * Returns the local client token in normalized (lowercase) form, or
     * undefined if it has not been received yet. See {@link normalizeClientToken}.
     */
    public getLocalClientToken(): ClientToken | undefined {
        return this.localToken;
    }

    public getHandlers(messageType: MessageType): MessageHandler[] | undefined {
        return this.messageHandlers.get(messageType);
    }
}
