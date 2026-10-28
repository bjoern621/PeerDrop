import { useSyncExternalStore } from "react";
import { useWebSocketService } from "../context/connection/WebSocketContext";
import { ServerConnection } from "../services/WebSocketService";

/** State of the connection to the server, kept current. */
export function useServerConnection(): ServerConnection {
    const websocket = useWebSocketService();
    return useSyncExternalStore(
        listener => websocket.subscribeConnection(listener),
        () => websocket.getConnection()
    );
}
