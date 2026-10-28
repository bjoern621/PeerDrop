import { useEffect } from "react";
import { useWebSocketService } from "../context/connection/WebSocketContext";
import { MessageType } from "../types/MessageType";
import { ITypedMessage } from "../types/ITypedMessage";
import { useLatest } from "./useLatest";

/** Calls the latest `handler` for every server message of `type` while `active` is true. */
export function useWebSocketMessage<M extends ITypedMessage>(
    type: MessageType,
    handler: (message: M) => void,
    active = true
) {
    const webSocketService = useWebSocketService();
    const latest = useLatest(handler);

    useEffect(() => {
        if (!active) {
            return;
        }
        return webSocketService.subscribeMessage<M>(type, message =>
            latest.current(message)
        );
    }, [webSocketService, type, active, latest]);
}
