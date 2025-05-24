import { useRef } from "react";
import { WebSocketService } from "../services/WebSocketService";
import { PeerConnectionManager } from "../services/PeerConnectionManager";
import { PeerConnectionContext } from "./PeerConnectionContext";
import { WebSocketContext } from "./WebSocketContext";

export function ConnectionProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const wsRef = useRef(new WebSocketService());
    const pcmRef = useRef(new PeerConnectionManager(wsRef.current));
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
