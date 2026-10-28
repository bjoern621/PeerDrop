import { useEffect } from "react";
import { useWebSocketService } from "../context/connection/WebSocketContext";
import { MessageType } from "../types/MessageType";
import { LanDiscoveryStateMessage } from "../types/lan/LanDiscoveryStateMessage";
import { WebSocketService } from "../services/WebSocketService";
import useSettings from "./useSettings";
import { useWebSocketMessage } from "./useWebSocketMessage";

/**
 * Reports the LAN discovery setting to the server and keeps it reported.
 *
 * A fresh connection starts out hidden on the server side, so the state
 * is sent again whenever a new client token announces a new connection. Mounted
 * app-wide, because the device is discoverable on every page.
 */
export const useLanDiscoveryState = () => {
    const webSocketService = useWebSocketService();
    const { lanDiscovery } = useSettings();

    // A connection still opening gets the state with its client token.
    useEffect(() => {
        if (webSocketService.getConnection() === "open") {
            reportState(webSocketService, lanDiscovery);
        }
        // exhaustive-deps-exclude [webSocketService]
    }, [lanDiscovery]);
    useWebSocketMessage(MessageType.CLIENT_TOKEN, () =>
        reportState(webSocketService, lanDiscovery)
    );
};

function reportState(webSocketService: WebSocketService, enabled: boolean) {
    webSocketService.sendMessage(new LanDiscoveryStateMessage({ enabled }));
}
