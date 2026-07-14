import { useEffect, useRef } from "react";
import { toast } from "react-toastify/unstyled";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import { useConnectionRequestState } from "../../hooks/useConnectionRequestState";
import ConfirmConnectToast from "../ConfirmConnectToast/ConfirmConnectToast";

const TOAST_ID_PREFIX = "confirm-connection-toast-";

/**
 * Shows one toast per pending incoming connection request, driven entirely by
 * the server-pushed connection-request state. A toast appears when the server
 * reports a new requester and is dismissed as soon as the server drops the
 * request (answered, cancelled, requester disconnected, or this client joined
 * another connection). Renders nothing itself.
 */
export default function IncomingConnectionRequests() {
    const peerConnectionManager = usePeerConnectionManager();
    const { incomingRequesters } = useConnectionRequestState();

    // Tokens currently backed by a visible toast, so the snapshot can be
    // diffed against them to add and remove toasts.
    const shownTokensRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const current = new Set(incomingRequesters);

        // Dismiss toasts for requests the server no longer reports.
        for (const token of shownTokensRef.current) {
            if (!current.has(token)) {
                toast.dismiss(TOAST_ID_PREFIX + token);
                shownTokensRef.current.delete(token);
            }
        }

        // Show a toast for each newly reported request.
        for (const token of incomingRequesters) {
            if (shownTokensRef.current.has(token)) {
                continue;
            }

            shownTokensRef.current.add(token);

            const toastId = TOAST_ID_PREFIX + token;
            toast.info(
                <ConfirmConnectToast
                    requestingPeerToken={token}
                    onAccept={() =>
                        peerConnectionManager.acceptConnectionRequest(token)
                    }
                    onReject={() =>
                        peerConnectionManager.rejectConnectionRequest(token)
                    }
                    toastId={toastId}
                />,
                {
                    closeOnClick: false,
                    autoClose: false,
                    hideProgressBar: false,
                    progress: 1,
                    closeButton: false,
                    className: "confirm-connection-toast-style", // Set in ConfirmConnectToast.module.scss
                    toastId: toastId,
                }
            );
        }
    }, [incomingRequesters, peerConnectionManager]);

    // Clear any remaining toasts if this controller unmounts.
    useEffect(() => {
        const shownTokens = shownTokensRef.current;
        return () => {
            shownTokens.forEach(token => toast.dismiss(TOAST_ID_PREFIX + token));
            shownTokens.clear();
        };
    }, []);

    return null;
}
