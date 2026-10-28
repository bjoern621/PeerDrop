import { useEffect, useState } from "react";
import { LanPeer } from "../types/lan/LanPeer";
import { MessageType } from "../types/MessageType";
import { LanPeersMessage } from "../types/lan/LanPeersMessage";
import { LanPeersRequestMessage } from "../types/lan/LanPeersRequestMessage";
import { useWebSocketService } from "../context/connection/WebSocketContext";
import useSettings from "./useSettings";
import { useWebSocketMessage } from "./useWebSocketMessage";

/**
 * Provides the list of peers discovered in the local network.
 *
 * The backend groups clients by public IP (same IP = same network) and pushes
 * the full peer list over the existing WebSocket connection whenever it
 * changes. Mounted on an open connection, it requests the current list, since
 * the report of the setting went out before. Discovery runs continuously;
 * the list grows and shrinks as peers appear and disappear.
 *
 * The list stays empty while the LAN discovery setting is off. Reporting the
 * setting as on brings the current list, on every new connection and whenever
 * the setting switches on.
 */
export const useLanPeers = () => {
    const webSocketService = useWebSocketService();
    const { lanDiscovery } = useSettings();
    const [peers, setPeers] = useState<LanPeer[]>([]);

    useWebSocketMessage<LanPeersMessage>(
        MessageType.LAN_PEERS,
        message => setPeers(message.msg.peers),
        lanDiscovery
    );
    // A new client token means a fresh WebSocket connection (e.g. after a
    // token reset). The previous peer list belongs to the old connection;
    // the server pushes the current list right after.
    useWebSocketMessage(
        MessageType.CLIENT_TOKEN,
        () => setPeers([]),
        lanDiscovery
    );

    // Runs once, for a connection that reported the setting before this hook mounted.
    useEffect(() => {
        if (lanDiscovery && webSocketService.getConnection() === "open") {
            webSocketService.sendMessage(new LanPeersRequestMessage());
        }
        // exhaustive-deps-exclude [webSocketService, lanDiscovery]
    }, []);
    useEffect(() => {
        if (!lanDiscovery) {
            setPeers([]);
        }
    }, [lanDiscovery]);

    return { peers };
};
