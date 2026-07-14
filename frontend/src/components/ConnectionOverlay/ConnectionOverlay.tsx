import { useLocation } from "react-router";
import { useCallback, useEffect, useRef } from "react";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import { AwaitConnectionDialog } from "../Popups/AwaitConnectionDialog";
import IncomingConnectionRequests from "../IncomingConnectionRequests/IncomingConnectionRequests";

/**
 * Handles the global connection lifecycle UI: incoming connection request
 * banners and the loading dialog shown while a connection is being
 * established. Mounted at the layout level so these are shown regardless of
 * which page the user is currently on.
 */
export default function ConnectionOverlay() {
    const peerConnectionManager = usePeerConnectionManager();
    const location = useLocation();

    const awaitConnectionDialog = useRef<HTMLDialogElement | null>(null);

    /**
     * Shows a loading dialog while the connection is being established.
     */
    const showLoadingDialog = useCallback(() => {
        const dialog = awaitConnectionDialog.current!;

        if (!dialog.open) {
            dialog.showModal();
        }
    }, []);

    // The dialog opens on the establishing event (the server told both peers
    // to connect) rather than on the local accept click. This covers every
    // path: accepting an incoming request, our own request being accepted,
    // and quick connect. It also cannot get stuck open after an accept the
    // server ignored as stale, because it only opens once establishment
    // really starts.
    useEffect(() => {
        const onConnectionEstablishing = () => showLoadingDialog();

        peerConnectionManager.subscribeToConnectionEstablishing(
            onConnectionEstablishing
        );

        return () => {
            peerConnectionManager.unsubscribeFromConnectionEstablishing(
                onConnectionEstablishing
            );
        };
    }, [peerConnectionManager, showLoadingDialog]);

    // The dialog lives above the routed pages and survives route changes,
    // so it must be closed explicitly once navigation away from the
    // establishing flow happens (e.g. to the DataSharingPage).
    useEffect(() => {
        if (awaitConnectionDialog.current?.open) {
            awaitConnectionDialog.current.close();
        }
    }, [location.pathname]);

    return (
        <>
            <IncomingConnectionRequests />
            <AwaitConnectionDialog ref={awaitConnectionDialog} />
        </>
    );
}
