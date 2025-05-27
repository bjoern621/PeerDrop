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
    const wsRef = useRef(new WebSocketService());
    console.log("Now Calling Constructor of PeerConnectionManager");
    const pcmRef = useRef(new PeerConnectionManager(wsRef.current));

    pcmRef.current.setOnConnectedCallback(() => {
        void navigate("/share");
    });
    pcmRef.current.setOnDisconnectedCallback(() => {
        void navigate("/");
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).ws = wsRef.current; // For debugging purposes, remove in production
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).pcm = pcmRef.current; // For debugging purposes, remove in production
    return (
        <WebSocketContext.Provider value={wsRef.current}>
            <PeerConnectionContext.Provider value={pcmRef.current}>
                {children}
            </PeerConnectionContext.Provider>
        </WebSocketContext.Provider>
    );
}
