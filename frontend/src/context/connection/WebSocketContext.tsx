import { createContext, useContext } from "react";
import { WebSocketService } from "../../services/WebSocketService";
import { assert } from "../../util/Assert";

export const WebSocketContext = createContext<WebSocketService | null>(null);

export function useWebSocketService() {
    const context = useContext(WebSocketContext);
    assert(context, "WebSocketService not available in context.");
    return context;
}
