import { useEffect, useState } from "react";
import { useWebSocketService } from "../context/connection/WebSocketContext";
import { MessageType } from "../types/MessageType";
import { ClientTokenMessage } from "../types/token/ClientTokenMessage";
import {
    ClientToken,
    MessageHandler,
    normalizeClientToken,
} from "../services/WebSocketService";

/** This client's token, updated when the server hands out a new one. */
export function useOwnToken(): ClientToken | undefined {
    const websocket = useWebSocketService();
    const [token, setToken] = useState(() => websocket.getLocalClientToken());

    useEffect(() => {
        const handleToken = (message: ClientTokenMessage) => {
            setToken(normalizeClientToken(message.msg.token));
        };
        websocket.subscribeMessage(
            MessageType.CLIENT_TOKEN,
            handleToken as MessageHandler
        );
        setToken(websocket.getLocalClientToken());
        return () =>
            websocket.unsubscribeMessage(
                MessageType.CLIENT_TOKEN,
                handleToken as MessageHandler
            );
        // exhaustive-deps-exclude [websocket]
    }, []);

    return token;
}
