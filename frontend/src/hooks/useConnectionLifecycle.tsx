import { RefObject, useEffect, useRef, useState } from "react";
import {
    NavigateFunction,
    useNavigate,
    useBeforeUnload,
    useBlocker,
} from "react-router";
import { toast } from "react-toastify/unstyled";
import { usePeerConnectionManager } from "../context/connection/PeerConnectionContext";
import { CloseInitiator } from "../services/PeerConnectionManager";
import { getSettings } from "../services/SettingsStore";

/**
 * Reacts to the end of the peer connection. A local close leaves the
 * transfer screen right away. A close by the peer keeps the screen in its
 * disconnected state, where received files stay saveable, unless the
 * stayAfterDisconnect setting is switched off.
 */
function handleConnectionClosed(
    initiator: CloseInitiator,
    navigate: NavigateFunction,
    setPeerDisconnected: (disconnected: boolean) => void,
    sessionHeld: RefObject<boolean>
) {
    if (initiator === "local") {
        toast.success("Verbindung erfolgreich getrennt.");
        void navigate("/connect");
        return;
    }

    toast.info("Die Verbindung wurde vom Peer getrennt.");

    // The close message of the peer frees the peer alone. This client keeps the
    // session until it leaves the screen.
    sessionHeld.current = true;

    if (!getSettings().stayAfterDisconnect) {
        void navigate("/connect");
        return;
    }

    setPeerDisconnected(true);
}

/**
 * Custom hook for managing the peer connection lifecycle.
 *
 * Handles:
 * - Redirecting to /connect if no active connection exists (disabled in dev mode)
 * - Blocking navigation attempts when a connection is active
 * - Cleaning up the connection (disconnecting) when the tab is closed or refreshed
 * - Navigating to /connect when the local user closes the peer connection
 * - Keeping the transfer screen open when the peer closes the connection, with the
 *   received files held until the screen is left
 *
 * Basically is responsible for ensuring that the user cannot navigate away or leave
 * the page while a connection is active, and handles cleanup and redirection when
 * the connection state changes.
 */
export default function useConnectionLifecycle() {
    const peerConnectionManager = usePeerConnectionManager();
    const navigate = useNavigate();

    // True after the peer closed the connection, until a new session starts.
    const [peerDisconnected, setPeerDisconnected] = useState(false);

    // True while the server still counts this client as busy after a close by
    // the peer. A ref, as the unmount cleanup below reads it.
    const sessionHeld = useRef(false);

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

        // Page load only: a later connection loss is handled by the closed listener below.
        // exhaustive-deps-exclude [navigate, peerConnectionManager]
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

    // Follow the connection's end, and leave the disconnected state once a
    // new session starts on this screen.
    useEffect(() => {
        const onConnectionClosed = (initiator: CloseInitiator) =>
            handleConnectionClosed(
                initiator,
                navigate,
                setPeerDisconnected,
                sessionHeld
            );
        const onConnectionEstablishing = () => {
            sessionHeld.current = false;
            setPeerDisconnected(false);
        };

        peerConnectionManager.subscribeToConnectionClosed(onConnectionClosed);
        peerConnectionManager.subscribeToConnectionEstablishing(
            onConnectionEstablishing
        );

        return () => {
            peerConnectionManager.unsubscribeFromConnectionClosed(
                onConnectionClosed
            );
            peerConnectionManager.unsubscribeFromConnectionEstablishing(
                onConnectionEstablishing
            );
        };

        // exhaustive-deps-exclude [navigate, peerConnectionManager]
    }, []);

    // Leaving the screen after a close by the peer releases the held files and
    // frees the device for the other devices in the network.
    useEffect(() => {
        return () => {
            if (sessionHeld.current) {
                peerConnectionManager.endSession();
            }
        };

        // exhaustive-deps-exclude [peerConnectionManager]
    }, []);

    /**
     * Manually closes the peer connection.
     * Will navigate to /connect via the connection closed listener afterwards.
     */
    const closeConnection = () => {
        peerConnectionManager.closePeerConnection();
        // Will not navigate here, as the navigation is handled in the useEffect listening for connection closed events
    };

    /**
     * Leaves the disconnected transfer screen. The held files are released
     * when the screen unmounts.
     */
    const leaveSession = () => {
        void navigate("/connect");
    };

    return {
        closeConnection,
        leaveSession,
        peerDisconnected,
    };
}
