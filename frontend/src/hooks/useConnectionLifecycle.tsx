import { useEffect } from "react";
import { useNavigate, useBeforeUnload, useBlocker } from "react-router";
import { toast } from "react-toastify/unstyled";
import { usePeerConnectionManager } from "../context/connection/PeerConnectionContext";
import { CloseInitiator } from "../services/PeerConnectionManager";

/**
 * Custom hook for managing the peer connection lifecycle.
 *
 * Handles:
 * - Redirecting to /connect if no active connection exists (disabled in dev mode)
 * - Blocking navigation attempts when a connection is active
 * - Cleaning up the connection (disconnecting) when the tab is closed or refreshed
 * - Navigating to /connect when the peer connection is closed
 *
 * Basically is responsible for ensuring that the user cannot navigate away or leave
 * the page while a connection is active, and handles cleanup and redirection when
 * the connection state changes.
 */
export default function useConnectionLifecycle() {
    const peerConnectionManager = usePeerConnectionManager();
    const navigate = useNavigate();

    const shouldBlock = () => {
        return peerConnectionManager.getConnection() !== undefined;
    };
    const blocker = useBlocker(shouldBlock);

    // Redirect to /connect on page load if there's no active connection (disabled in dev mode)
    useEffect(() => {
        if (import.meta.env.DEV) {
            // In development mode, skip the redirect
            return;
        }

        if (!peerConnectionManager.getConnection()) {
            void navigate("/connect");
        }
    }, []);

    // Block all navigation attempts
    useEffect(() => {
        if (blocker.state === "blocked") {
            toast.warning(
                "Navigation ist blockiert. Bitte trenne zuerst die Verbindung.",
                {
                    toastId: "navigation-blocked-toast",
                    updateId: "navigation-blocked-toast",
                }
            );
            blocker.reset();
        }
    }, [blocker]);

    // Close the peer connection when the tab is closed / refreshed
    useBeforeUnload(() => {
        peerConnectionManager.closePeerConnection();
    });

    // Navigate to /connect when the peer connection is closed
    useEffect(() => {
        const onConnectionClosed = (initiator: CloseInitiator) => {
            if (initiator === "local") {
                toast.success("Verbindung erfolgreich getrennt.");
            } else {
                toast.info("Die Verbindung wurde vom Peer getrennt.");
            }

            void navigate("/connect");
        };

        peerConnectionManager.subscribeToConnectionClosed(onConnectionClosed);

        return () => {
            peerConnectionManager.unsubscribeFromConnectionClosed(
                onConnectionClosed
            );
        };
    }, []);

    /**
     * Manually closes the peer connection.
     * Will navigate to /connect via the connection closed listener afterwards.
     */
    const closeConnection = () => {
        peerConnectionManager.closePeerConnection();
        // Will not navigate here, as the navigation is handled in the useEffect listening for connection closed events
    };

    return {
        closeConnection,
    };
}
