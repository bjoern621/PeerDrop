import { WebSocketService } from "../../services/WebSocketService";
import { PeerConnectionManager } from "../../services/PeerConnectionManager";
import { PeerConnectionContext } from "./PeerConnectionContext";
import { useNavigate } from "react-router";
import { useRef, useState } from "react";
import { ResetContext } from "./ResetContext";
import { WebSocketContext } from "./WebSocketContext";

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
    }

    const [, forceUpdate] = useState(0);

    /**
     * Resets the WebSocket connection by closing the current connection and opening a new one.
     * This gets the user a new client token.
     *
     * When a new WebSocket connection is established, the server reads the UserId from the session cookie
     * and associates it with the newly generated client token. This allows the server to link the authenticated
     * user account with the WebSocket connection for features like device management and connection history.
     */
    const resetWebsocketConnection = () => {
        wsRef.current?.closeActiveConnection();
        wsRef.current?.openWebSocket();

        forceUpdate(n => n + 1); // Inform React that the state has changed to trigger a re-render. This effectively updates the context values.
    };

    return (
        <WebSocketContext.Provider value={wsRef.current}>
            <PeerConnectionContext.Provider value={pcmRef.current}>
                <ResetContext.Provider value={{ resetWebsocketConnection }}>
                    {children}
                </ResetContext.Provider>
            </PeerConnectionContext.Provider>
        </WebSocketContext.Provider>
    );
}
