import css from "./Connection.module.scss";
import { useCallback, useEffect, useRef } from "react";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import { assert } from "../../util/Assert";
import { toast } from "react-toastify/unstyled";
import { AwaitConnectionDialog } from "../Popups/AwaitConnectionDialog";
import ConfirmConnectToast from "../ConfirmConnectToast/ConfirmConnectToast";
import OwnToken from "./OwnToken/OwnToken";
import ConnectToPeer from "./ConnectToPeer/ConnectToPeer";
import { useDeviceHeartbeat } from "../../hooks/useDeviceHeartbeat";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import Devices from "./Devices/Devices";
import LanPeers from "./LanPeers/LanPeers";

export default function Connection() {
    useDeviceHeartbeat({ status: DeviceStatus.ONLINE });
    const peerConnectionManager = usePeerConnectionManager();

    const awaitConnectionDialog = useRef<HTMLDialogElement | null>(null);

    const confirmConnection = useCallback(
        (remoteToken: string) => {
            assert(remoteToken, "Remote token is not set.");
            peerConnectionManager.acceptConnectionRequest(remoteToken);

            showLoadingDialog();
        },
        [peerConnectionManager]
    );

    const declineConnection = useCallback(
        (remoteToken: string) => {
            assert(remoteToken, "Remote token is not set.");
            peerConnectionManager.rejectConnectionRequest(remoteToken);
        },
        [peerConnectionManager]
    );

    const dismissAllToasts = () => toast.dismiss();

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

    /**
     * Shows a loading dialog while the connection is being established.
     *
     * Will be automatically closed by navigation to DataSharingPage.
     */
    const showLoadingDialog = () => {
        awaitConnectionDialog.current!.showModal();
    };

    return (
        <div className={css.container}>
            <Devices />

            <LanPeers />

            <div className={css.containerWrapper}>
                <OwnToken />

                <ConnectToPeer />
            </div>

            <AwaitConnectionDialog ref={awaitConnectionDialog} />
        </div>
    );
}
