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
 * changes. On mount, the current list is requested explicitly so peers that
 * were already present are shown immediately. Discovery runs continuously;
 * the list grows and shrinks as peers appear and disappear.
 *
 * The list stays empty while the LAN discovery setting is off. Switching the
 * setting back on requests the current list again.
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

    useEffect(() => {
        if (lanDiscovery) {
            webSocketService.sendMessage(new LanPeersRequestMessage());
        } else {
            setPeers([]);
        }
    }, [lanDiscovery, webSocketService]);

    return { peers };
};
