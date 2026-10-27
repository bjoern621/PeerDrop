import { assert, never } from "../util/Assert";
import { MessageType } from "../types/MessageType";
import { Logger } from "../util/Logger";
import { ITypedMessage } from "../types/ITypedMessage";
import { ClientTokenMessage } from "../types/token/ClientTokenMessage";
import { getRuntimeEnvVars } from "../util/RuntimeEnvVars";
import { PingMessage } from "../types/server/PingMessage";
import {
    RECONNECT_DELAYS_MS,
    SERVER_CHECK_INTERVAL_MS,
    SERVER_PONG_TIMEOUT_MS,
} from "../util/Constants";

export type MessageHandler = (typedMessage: ITypedMessage) => unknown;

export type ClientToken = string;

/** "lost" once the socket closed or stopped answering pings. */
export type ServerConnection = "connecting" | "open" | "lost";

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

/** Uppercase form of a token, as the interface shows it. */
export function displayToken(token: ClientToken): string {
    return token.toUpperCase();
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

    private connection: ServerConnection = "connecting";
    private readonly connectionListeners = new Set<() => void>();
    // Set while a ping waits for its pong.
    private pongTimer: number | undefined;
    // Set while a reconnect waits for its delay.
    private reconnectTimer: number | undefined;
    private reconnectAttempt = 0;

    /**
     * Initializes a new instance of the WebSocketService class.
     * It connects to the server.
     */
    public constructor() {
        this.logger.setEnabled(false); // Disable logging by default, can be enabled later if needed

        this.subscribeMessage(MessageType.PONG, () => this.clearPongTimer());
        window.setInterval(() => this.checkServer(), SERVER_CHECK_INTERVAL_MS);
        // A device waking up or rejoining a network often holds a socket that died in the meantime.
        window.addEventListener("online", () => this.checkOrReconnect());
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                this.checkOrReconnect();
            }
        });

        this.openWebSocket();
    }

    public openWebSocket(): void {
        assert(!this.socket, "WebSocket is already open.");
        window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
        this.connectToServer();
        this.waitForLocalClientToken();
    }

    private connectToServer() {
        const socket = new WebSocket(
            `${getRuntimeEnvVars().wsBackendUrl}/connect`
        );
        this.socket = socket;
        // Attempts to reconnect leave the connection lost until one of them succeeds.
        if (this.connection !== "lost") {
            this.setConnection("connecting");
        }

        // A socket replaced by closeActiveConnection reports nothing.
        socket.addEventListener("close", () => {
            if (socket === this.socket) {
                this.loseConnection();
            }
        });

        this.listenToMessages();
    }

    /** Sends a ping. Counts the connection as lost when no pong follows in time. */
    private checkServer() {
        if (this.connection !== "open" || this.pongTimer !== undefined) {
            return;
        }
        this.sendMessage(new PingMessage());
        this.pongTimer = window.setTimeout(
            () => this.loseConnection(),
            SERVER_PONG_TIMEOUT_MS
        );
    }

    private clearPongTimer() {
        window.clearTimeout(this.pongTimer);
        this.pongTimer = undefined;
    }

    private loseConnection() {
        this.clearPongTimer();
        // A half-open socket can take minutes to report its close by itself.
        this.socket?.close();
        this.setConnection("lost");
        this.scheduleReconnect();
    }

    /** Waits longer after every failed attempt, up to the last of RECONNECT_DELAYS_MS. */
    private scheduleReconnect() {
        if (this.reconnectTimer !== undefined) {
            return;
        }
        const delay =
            RECONNECT_DELAYS_MS[
                Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)
            ];
        this.reconnectAttempt++;
        this.reconnectTimer = window.setTimeout(() => this.reconnect(), delay);
    }

    /** Opens a new connection, which brings a new token. */
    private reconnect() {
        this.closeActiveConnection();
        this.openWebSocket();
    }

    private checkOrReconnect() {
        if (this.connection === "lost") {
            this.reconnect();
        } else {
            this.checkServer();
        }
    }

    private setConnection(connection: ServerConnection) {
        if (connection === this.connection) {
            return;
        }
        this.connection = connection;
        this.connectionListeners.forEach(listener => listener());
    }

    public getConnection(): ServerConnection {
        return this.connection;
    }

    /** Calls `listener` whenever the connection state changes. Returns the unsubscribe. */
    public subscribeConnection(listener: () => void): () => void {
        this.connectionListeners.add(listener);
        return () => {
            this.connectionListeners.delete(listener);
        };
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

            // Notifies a copy of the subscribers, since a handler may
            // unsubscribe itself while they run.
            const handlers = [
                ...(this.messageHandlers.get(typedMessage.type) ?? []),
            ];
            await Promise.allSettled(
                handlers.map(handler => handler(typedMessage))
            );
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
        const unsubscribe = this.subscribeMessage<ClientTokenMessage>(
            MessageType.CLIENT_TOKEN,
            message => {
                this.log("Received client token:", message.msg.token);
                this.localToken = normalizeClientToken(message.msg.token);
                this.reconnectAttempt = 0;
                this.setConnection("open");
                unsubscribe();
            }
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
        this.clearPongTimer();

        switch (this.socket.readyState) {
            case WebSocket.CONNECTING: {
                // Closes once open, since closing during the handshake logs an error in the browser.
                const socket = this.socket;
                socket.addEventListener("open", () => socket.close());
                this.socket = undefined;
                return true;
            }
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
     * Calls `handler` for every message of `messageType`, which the caller declares as `M`.
     * Returns the unsubscribe.
     */
    public subscribeMessage<M extends ITypedMessage = ITypedMessage>(
        messageType: MessageType,
        handler: (message: M) => unknown
    ): () => void {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }

        const handlers = this.messageHandlers.get(messageType);
        assert(handlers);

        const typedHandler = handler as MessageHandler;
        handlers.push(typedHandler);
        return () => this.unsubscribeMessage(messageType, typedHandler);
    }

    /** The handler must be subscribed to the message type. */
    private unsubscribeMessage(
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
