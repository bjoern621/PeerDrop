import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify/unstyled";
import { usePeerConnectionManager } from "../context/connection/PeerConnectionContext";
import { useConnectionRequestState } from "./useConnectionRequestState";
import { ClientToken } from "../services/WebSocketService";
import { connectErrorToast } from "../util/connectErrorToast";

/**
 * Minimum time the waiting state stays active after a request was sent, so
 * instant rejections do not feel abrupt.
 */
const MIN_WAITING_MS = 1000;

export interface OutgoingConnectionRequest {
    /** Token the pending outgoing request is addressed to, or null. */
    target: ClientToken | null;
    /**
     * True while waiting for the peer to answer, including the minimum-wait
     * hold that outlasts an instant rejection.
     */
    waitingForResponse: boolean;
    /**
     * Sends a connection request to the given token. Shows a toast and returns
     * false if the token is rejected locally (wrong length or own token).
     */
    connect: (remoteToken: string) => boolean;
    /** Cancels the pending outgoing request. */
    cancel: () => void;
}

/**
 * Owns the client-side lifecycle of this client's own outgoing connection
 * request: the waiting state derived from the server snapshot, the minimum-wait
 * hold, the transient rejection toast, and the connect/cancel actions.
 *
 * The waiting state is derived from the server-pushed snapshot: a pending
 * outgoing request exists exactly while the server says so. The hold only
 * stretches the displayed state to MIN_WAITING_MS.
 */
export function useOutgoingConnectionRequest(): OutgoingConnectionRequest {
    const peerConnectionManager = usePeerConnectionManager();
    const requestState = useConnectionRequestState();

    const target = requestState.outgoingRequestTarget;
    const serverWaiting = target !== null;

    const [holdingWait, setHoldingWait] = useState(false);
    const requestStartRef = useRef<number>(0);

    useEffect(() => {
        if (serverWaiting) {
            requestStartRef.current = Date.now();
            setHoldingWait(true);
            return;
        }

        const remaining =
            MIN_WAITING_MS - (Date.now() - requestStartRef.current);

        if (remaining <= 0) {
            setHoldingWait(false);
            return;
        }

        const timeoutId = setTimeout(() => setHoldingWait(false), remaining);
        return () => clearTimeout(timeoutId);
    }, [serverWaiting]);

    // Rejections are transient feedback, not state: the waiting UI itself clears
    // via the snapshot. The toast is delayed to match the hold.
    useEffect(() => {
        const onResponse = (accepted: boolean) => {
            if (accepted) {
                // Navigation is handled in ConnectionProvider.
                return;
            }

            const remaining = Math.max(
                0,
                MIN_WAITING_MS - (Date.now() - requestStartRef.current)
            );

            setTimeout(() => {
                toast.error("Verbindungsanfrage wurde abgelehnt!", {
                    toastId: "connection-rejected-toast",
                    updateId: "connection-rejected-toast",
                });
            }, remaining);
        };

        peerConnectionManager.subscribeToConnectionResponse(onResponse);
        return () => {
            peerConnectionManager.unsubscribeFromConnectionResponse(onResponse);
        };
    }, [peerConnectionManager]);

    const connect = (remoteToken: string): boolean => {
        const result = peerConnectionManager.connect(remoteToken);

        if (!result.ok) {
            const { message, toastId } = connectErrorToast(result.error);
            toast.warn(message, { toastId, updateId: toastId });
            return false;
        }

        // Covers rejections that arrive before the first snapshot does
        // (e.g. the entered token does not exist).
        requestStartRef.current = Date.now();

        return true;
    };

    const cancel = () => {
        peerConnectionManager.cancelConnectionRequest();
        // A local cancel needs no minimum-wait hold.
        requestStartRef.current = 0;
    };

    return {
        target,
        waitingForResponse: serverWaiting || holdingWait,
        connect,
        cancel,
    };
}
