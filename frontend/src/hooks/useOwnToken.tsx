import { useEffect, useState } from "react";
import { useWebSocketService } from "../context/connection/WebSocketContext";
import { MessageType } from "../types/MessageType";
import { ClientTokenMessage } from "../types/token/ClientTokenMessage";
import {
    ClientToken,
    normalizeClientToken,
} from "../services/WebSocketService";
import { useWebSocketMessage } from "./useWebSocketMessage";

/** This client's token, updated when the server hands out a new one. */
export function useOwnToken(): ClientToken | undefined {
    const websocket = useWebSocketService();
    const [token, setToken] = useState(() => websocket.getLocalClientToken());

    useWebSocketMessage<ClientTokenMessage>(MessageType.CLIENT_TOKEN, message =>
        setToken(normalizeClientToken(message.msg.token))
    );
    // Catches a token that arrived between the first render and the subscription.
    useEffect(() => setToken(websocket.getLocalClientToken()), [websocket]);

    return token;
}
