import { useLocation } from "react-router";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "react-toastify/unstyled";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import { assert } from "../../util/Assert";
import { AwaitConnectionDialog } from "../Popups/AwaitConnectionDialog";
import ConfirmConnectToast from "../ConfirmConnectToast/ConfirmConnectToast";

/**
 * Handles the global connection lifecycle UI: incoming connection request
 * toasts and the loading dialog shown while a connection is being
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

    const confirmConnection = useCallback(
        (remoteToken: string) => {
            assert(remoteToken, "Remote token is not set.");
            peerConnectionManager.acceptConnectionRequest(remoteToken);

            showLoadingDialog();
        },
        [peerConnectionManager, showLoadingDialog]
    );

    const declineConnection = useCallback(
        (remoteToken: string) => {
            assert(remoteToken, "Remote token is not set.");
            peerConnectionManager.rejectConnectionRequest(remoteToken);
        },
        [peerConnectionManager]
    );

    const dismissAllToasts = () => toast.dismiss();

    // Registered here (rather than in a page component) so incoming
    // connection requests, e.g. from the LAN discovery feature, are shown
    // regardless of which page the user is currently on.
    useEffect(() => {
        const confirmConnectionToastIdPrefix = "confirm-connection-toast-";

        peerConnectionManager.setOnConnectionRequestReceivedCallback(
            (requestingPeerToken: string) => {
                const toastId =
                    confirmConnectionToastIdPrefix + requestingPeerToken;

                toast.info(
                    <ConfirmConnectToast
                        requestingPeerToken={requestingPeerToken}
                        onAccept={() => {
                            dismissAllToasts();
                            confirmConnection(requestingPeerToken);
                        }}
                        onReject={() => declineConnection(requestingPeerToken)}
                        toastId={toastId}
                    />,
                    {
                        closeOnClick: false,
                        autoClose: false,
                        hideProgressBar: false,
                        progress: 1,
                        closeButton: false,
                        className: "confirm-connection-toast-style",
                        toastId: toastId,
                    }
                );
            }
        );
        peerConnectionManager.setOnConnectionRequestCancelledReceivedCallback(
            (remoteToken: string) => {
                const toastId = confirmConnectionToastIdPrefix + remoteToken;
                toast.dismiss(toastId);
            }
        );
    }, [confirmConnection, declineConnection, peerConnectionManager]);

    // Establishment can also be triggered without a local accept: our own
    // request was accepted by the remote peer, or a quick connect targeted
    // this device. Show the same loading dialog in all cases.
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

    return <AwaitConnectionDialog ref={awaitConnectionDialog} />;
}
