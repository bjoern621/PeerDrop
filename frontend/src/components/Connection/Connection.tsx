import css from "./Connection.module.scss";
import { useCallback, useEffect, useRef } from "react";
import { useWebSocketService } from "../../context/connection/WebSocketContext";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import { DeviceHeartbeatMessage } from "../../types/device/DeviceHeartbeatMessage";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { HEARTBEAT_INTERVAL_MS } from "../../util/Constants";
import { assert } from "../../util/Assert";
import { toast } from "react-toastify/unstyled";
import { AwaitConnectionDialog } from "../Popups/AwaitConnectionDialog";
import ConfirmConnectToast from "../ConfirmConnectToast/ConfirmConnectToast";
import OwnToken from "./OwnToken/OwnToken";
import ConnectToPeer from "./ConnectToPeer/ConnectToPeer";

export default function Connection() {
    const websocket = useWebSocketService();
    const peerConnectionManager = usePeerConnectionManager();

    const awaitConnectionDialog = useRef<HTMLDialogElement | null>(null);

    /**
     * Sends a heartbeat message if the user has registered the device.
     */
    const sendHeartbeatIfPossible = useCallback(() => {
        const deviceUuid: string | undefined = document.cookie
            .split("; ")
            .find(row => row.startsWith("deviceUuid="))
            ?.split("=")[1];

        if (!deviceUuid) {
            return; // The user might not have registered the device
        }

        const heartbeat = new DeviceHeartbeatMessage({
            uuid: deviceUuid,
            status: DeviceStatus.ONLINE,
        });

        websocket.sendMessage(heartbeat);
    }, [websocket]);

    /**
     * Sends a heartbeat message every HEARTBEAT_INTERVAL_MS.
     */
    const sendContinuousHeartbeat = useCallback(() => {
        const timer = setInterval(() => {
            sendHeartbeatIfPossible();
        }, HEARTBEAT_INTERVAL_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [sendHeartbeatIfPossible]);

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

        sendHeartbeatIfPossible();

        const cleanupHeartbeats = sendContinuousHeartbeat();

        return () => {
            cleanupHeartbeats();
        };
    }, [
        websocket,
        peerConnectionManager,
        sendHeartbeatIfPossible,
        sendContinuousHeartbeat,
        confirmConnection,
        declineConnection,
    ]);

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
            <OwnToken />

            <ConnectToPeer />

            <AwaitConnectionDialog ref={awaitConnectionDialog} />
        </div>
    );
}
