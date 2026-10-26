import { useEffect } from "react";
import { useWebSocketService } from "../context/connection/WebSocketContext";
import { MessageType } from "../types/MessageType";
import { LanDiscoveryStateMessage } from "../types/lan/LanDiscoveryStateMessage";
import useSettings from "./useSettings";
import { useWebSocketMessage } from "./useWebSocketMessage";

/**
 * Reports the LAN discovery setting to the server and keeps it reported.
 *
 * A fresh connection starts out discoverable on the server side, so the state
 * is sent again whenever a new client token announces a new connection. Mounted
 * app-wide, because the device is discoverable on every page.
 */
export const useLanDiscoveryState = () => {
    const webSocketService = useWebSocketService();
    const { lanDiscovery } = useSettings();

    const reportState = () => {
        webSocketService.sendMessage(
            new LanDiscoveryStateMessage({ enabled: lanDiscovery })
        );
    };

    useEffect(reportState, [lanDiscovery, webSocketService]);
    useWebSocketMessage(MessageType.CLIENT_TOKEN, reportState);
};
