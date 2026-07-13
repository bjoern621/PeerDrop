import { useEffect, useState } from "react";
import { LanPeer } from "../types/lan/LanPeer";
import { MessageType } from "../types/MessageType";
import { LanPeersMessage } from "../types/lan/LanPeersMessage";
import { LanPeersRequestMessage } from "../types/lan/LanPeersRequestMessage";
import { useWebSocketService } from "../context/connection/WebSocketContext";
import { MessageHandler } from "../services/WebSocketService";

/**
 * Provides the list of peers discovered in the local network.
 *
 * The backend groups clients by public IP (same IP = same network) and pushes
 * the full peer list over the existing WebSocket connection whenever it
 * changes. On mount, the current list is requested explicitly so peers that
 * were already present are shown immediately. Discovery runs continuously;
 * the list grows and shrinks as peers appear and disappear.
 */
export const useLanPeers = () => {
    const webSocketService = useWebSocketService();
    const [peers, setPeers] = useState<LanPeer[]>([]);

    useEffect(() => {
        const handleLanPeers = (message: LanPeersMessage) => {
            setPeers(message.msg.peers);
        };

        // A new client token means a fresh WebSocket connection (e.g. after a
        // token reset). The previous peer list belongs to the old connection;
        // the server pushes the current list right after.
        const handleClientToken = () => {
            setPeers([]);
        };

        webSocketService.subscribeMessage(
            MessageType.LAN_PEERS,
            handleLanPeers as MessageHandler
        );
        webSocketService.subscribeMessage(
            MessageType.CLIENT_TOKEN,
            handleClientToken as MessageHandler
        );

        webSocketService.sendMessage(new LanPeersRequestMessage());

        return () => {
            webSocketService.unsubscribeMessage(
                MessageType.LAN_PEERS,
                handleLanPeers as MessageHandler
            );
            webSocketService.unsubscribeMessage(
                MessageType.CLIENT_TOKEN,
                handleClientToken as MessageHandler
            );
        };
    }, [webSocketService]);

    return { peers };
};
