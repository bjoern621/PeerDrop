import { WebSocketService } from "../services/WebSocketService";
import { PeerConnectionManager } from "../services/PeerConnectionManager";
import { PeerConnectionContext } from "./PeerConnectionContext";
import { WebSocketContext } from "./WebSocketContext";
import { useNavigate } from "react-router";
import { useState } from "react";
import { ResetContext } from "./ResetContext";

export function ConnectionProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const navigate = useNavigate();
    const [wsService, setWsService] = useState(() => new WebSocketService());
    const [pcm, setPcm] = useState(() => {
        const manager = new PeerConnectionManager(wsService);
        manager.setOnConnectedCallback(() => {
            void navigate("/share");
        });
        manager.setOnDisconnectedCallback(() => {
            void navigate("/");
        });
        return manager;
    });

    /**
     * Resets the WebSocket and PeerConnectionManager instances.
     * A new client token is requested from the server.
     */
    const resetConnections = () => {
        wsService.closeActiveConnection();
        const newWs = new WebSocketService();
        setWsService(newWs);

        const newPcm = new PeerConnectionManager(newWs);
        newPcm.setOnConnectedCallback(() => {
            void navigate("/share");
        });
        newPcm.setOnDisconnectedCallback(() => {
            void navigate("/");
        });
        setPcm(newPcm);
    };

    return (
        <WebSocketContext.Provider value={wsService}>
            <PeerConnectionContext.Provider value={pcm}>
                <ResetContext.Provider value={{ resetConnections }}>
                    {children}
                </ResetContext.Provider>
            </PeerConnectionContext.Provider>
        </WebSocketContext.Provider>
    );
}
