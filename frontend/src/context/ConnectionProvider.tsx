import { WebSocketService } from "../services/WebSocketService";
import { PeerConnectionManager } from "../services/PeerConnectionManager";
import { PeerConnectionContext } from "./PeerConnectionContext";
import { WebSocketContext } from "./WebSocketContext";
import { useNavigate } from "react-router";
import { useRef, useState } from "react";
import { ResetContext } from "./ResetContext";

export function ConnectionProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const navigate = useNavigate();
    const wsRef = useRef<WebSocketService | undefined>(undefined);
    if (!wsRef.current) {
        wsRef.current = new WebSocketService();
    }

    const pcmRef = useRef<PeerConnectionManager | undefined>(undefined);
    if (!pcmRef.current) {
        pcmRef.current = new PeerConnectionManager(wsRef.current);

        pcmRef.current.setOnConnectedCallback(() => {
            void navigate("/share");
        });
        pcmRef.current.setOnDisconnectedCallback(() => {
            void navigate("/");
        });
    }

    const [, forceUpdate] = useState(0);

    const resetConnections = () => {
        wsRef.current?.closeActiveConnection();
        wsRef.current?.openWebSocket();

        forceUpdate(n => n + 1);
    };

    return (
        <WebSocketContext.Provider value={wsRef.current}>
            <PeerConnectionContext.Provider value={pcmRef.current}>
                <ResetContext.Provider value={{ resetConnections }}>
                    {children}
                </ResetContext.Provider>
            </PeerConnectionContext.Provider>
        </WebSocketContext.Provider>
    );
}
