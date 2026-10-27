import { WebSocketService } from "../../services/WebSocketService";
import { PeerConnectionManager } from "../../services/PeerConnectionManager";
import { PeerConnectionContext } from "./PeerConnectionContext";
import { useRef, useState } from "react";
import { ResetContext } from "./ResetContext";
import { WebSocketContext } from "./WebSocketContext";
import { MessagingService } from "../../services/MessagingService";
import { MessagingContext } from "./MessagingContext";

export function ConnectionProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const wsRef = useRef<WebSocketService | undefined>(undefined);
    if (!wsRef.current) {
        wsRef.current = new WebSocketService();
    }

    const pcmRef = useRef<PeerConnectionManager | undefined>(undefined);
    if (!pcmRef.current) {
        pcmRef.current = new PeerConnectionManager(wsRef.current);
    }

    const messagingRef = useRef<MessagingService | undefined>(undefined);
    if (!messagingRef.current) {
        messagingRef.current = new MessagingService(
            wsRef.current,
            pcmRef.current
        );
    }

    const [, forceUpdate] = useState(0);

    /**
     * Resets the WebSocket connection by closing the current connection and opening a new one.
     * The new connection asks for `requestedToken`, or else for the token held so far.
     *
     * When a new WebSocket connection is established, the server reads the UserId from the session cookie
     * and associates it with the client token. This allows the server to link the authenticated
     * user account with the WebSocket connection for features like device management and connection history.
     */
    const resetWebsocketConnection = (requestedToken?: string) => {
        wsRef.current?.closeActiveConnection();
        wsRef.current?.openWebSocket(requestedToken);

        forceUpdate(n => n + 1); // Inform React that the state has changed to trigger a re-render. This effectively updates the context values.
    };

    return (
        <WebSocketContext.Provider value={wsRef.current}>
            <PeerConnectionContext.Provider value={pcmRef.current}>
                <MessagingContext.Provider value={messagingRef.current}>
                    <ResetContext.Provider value={{ resetWebsocketConnection }}>
                        {children}
                    </ResetContext.Provider>
                </MessagingContext.Provider>
            </PeerConnectionContext.Provider>
        </WebSocketContext.Provider>
    );
}
