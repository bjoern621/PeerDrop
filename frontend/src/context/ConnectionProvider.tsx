import { useRef } from "react";
import { WebSocketService } from "../services/WebSocketService";
import { PeerConnectionManager } from "../services/PeerConnectionManager";
import { PeerConnectionContext } from "./PeerConnectionContext";
import { WebSocketContext } from "./WebSocketContext";
import { useNavigate } from "react-router";

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

    return (
        <WebSocketContext.Provider value={wsRef.current}>
            <PeerConnectionContext.Provider value={pcmRef.current}>
                {children}
            </PeerConnectionContext.Provider>
        </WebSocketContext.Provider>
    );
}
