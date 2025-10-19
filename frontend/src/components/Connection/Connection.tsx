import css from "./Connection.module.scss";
import ProfileIcon from "../../assets/icons8-name-tag.svg?react";
import ConnectIcon from "../../assets/icons8-computers-connecting.svg?react";
import Button from "../Button/Button";
import GroupIcon from "../../assets/icons8-group.svg?react";
import CopyIcon from "../../assets/icons8-copy.svg?react";
import CopyLinkIcon from "../../assets/icons8-copy-link.svg?react";
import TokenInput from "./TokenInput/TokenInput";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWebSocketService } from "../../context/connection/WebSocketContext";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import { DeviceHeartbeatMessage } from "../../types/device/DeviceHeartbeatMessage";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { HEARTBEAT_INTERVAL_MS } from "../../util/Constants";
import { assert } from "../../util/Assert";
import { toast } from "react-toastify/unstyled";
import "react-toastify/dist/ReactToastify.css";
import errorAsValue from "../../util/ErrorAsValue";
import { WaitingDialog } from "../Popups/WaitingDialog";
import { AwaitConnectionDialog } from "../Popups/AwaitConnectionDialog";
import ConfirmConnectToast from "../ConfirmConnectToast/ConfirmConnectToast";

export default function Connection() {
    const websocket = useWebSocketService();
    const peerConnectionManager = usePeerConnectionManager();

    const [clientToken, setClientToken] = useState<string | undefined>(
        undefined
    );
    const [remoteToken, setRemoteToken] = useState<string>("");
    const [waitingForResponse, setWaitingForResponse] =
        useState<boolean>(false);

    const waitingDialog = useRef<HTMLDialogElement | null>(null);
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
        assert(websocket, "WebSocketService is not initialized.");

        const token = websocket.getLocalClientToken();
        let checkToken: number | undefined = undefined;
        if (token) {
            setClientToken(token);
        } else {
            // If not available immediately, set up polling
            checkToken = setInterval(() => {
                const token = websocket.getLocalClientToken();
                if (token) {
                    setClientToken(token);
                    clearInterval(checkToken);
                }
            }, 500);
        }

        peerConnectionManager.setOnConnectionResponseReceivedCallback(
            (accepted: boolean) => {
                if (accepted) {
                    waitingDialog.current!.close();
                    showLoadingDialog();
                    dismissAllToasts();
                } else {
                    waitingDialog.current!.close();
                    toast.error("Verbindungsanfrage wurde abgelehnt!");
                }
            }
        );

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
                        className: "confirm-connection-toast-style", // Set in toast-styles.scss
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

    const copyToken = async () => {
        if (!clientToken) {
            return;
        }

        const [, err] = await errorAsValue(
            navigator.clipboard.writeText(clientToken)
        );

        if (err) {
            console.error("Failed to copy token:", err);
            return;
        }

        toast.success("Token in die Zwischenablage kopiert!");

        // navigator.clipboard
        //     .writeText(clientToken)
        //     .then(() => {
        //         toast.success("Token in die Zwischenablage kopiert!", {
        //             toastId: "token-copied-toast",
        //             updateId: "token-copied-toast",
        //         });
        //     })
        //     .catch(err => {
        //         console.error("Failed to copy token:", err);
        //     });
    };

    const copyTokenLink = async () => {
        if (!clientToken) {
            return;
        }

        const [, err] = await errorAsValue(
            navigator.clipboard.writeText(
                `${import.meta.env.VITE_FRONTEND_DOMAIN}/connect/${clientToken}`
            )
        );

        if (err) {
            console.error("Failed to copy token:", err);
            return;
        }

        toast.success("Token-Link in die Zwischenablage kopiert!");
    };

    const openGroupRoom = () => {
        toast.info(
            <ConfirmConnectToast
                requestingPeerToken={"12345"}
                onAccept={() => {
                    dismissAllToasts();
                }}
                onReject={() => {}}
                toastId={"12345"}
            />,
            {
                closeOnClick: false,
                autoClose: false,
                hideProgressBar: false,
                progress: 1,
                closeButton: false,
                className: "confirm-connection-toast-style", // Set in toast-styles.scss
                toastId: "12345",
            }
        );
    };

    const connectToPeer = () => {
        const successfullySent =
            peerConnectionManager.requestConnectionToRemotePeer(remoteToken);

        if (successfullySent) {
            setWaitingForResponse(true);
            // waitingDialog.current!.showModal();
        }
    };

    /**
     * Shows a loading dialog while the connection is being established.
     *
     * Will be automatically closed by navigation to DataSharingPage.
     */
    const showLoadingDialog = () => {
        awaitConnectionDialog.current!.showModal();
    };

    const interruptWaiting = () => {
        if (peerConnectionManager.cancelConnectionRequest(remoteToken)) {
            waitingDialog.current!.close();
        }
    };

    return (
        <div className={css.container}>
            <div className={css.ownTokenContainer}>
                <h2 className={css.heading}>
                    <ProfileIcon />
                    Dein Token
                </h2>

                <div className={css.tokenBox}>
                    <div className={css.token}>{clientToken ?? "_____"}</div>
                    <p className={css.mutedText}>
                        Teile diesen Token mit anderen
                    </p>
                </div>

                <div>
                    <Button
                        variant={"outline"}
                        color_scheme={"neutral"}
                        className={css.openGroupRoomButton}
                        onClick={() => openGroupRoom()}
                    >
                        <GroupIcon />
                        Gruppenraum öffnen
                    </Button>
                    <div className={css.copyButtons}>
                        <Button
                            variant={"outline"}
                            color_scheme={"neutral"}
                            disabled={!clientToken}
                            onClick={() => void copyToken()}
                        >
                            <CopyIcon />
                            Token kopieren
                        </Button>
                        <Button
                            variant={"outline"}
                            color_scheme={"neutral"}
                            disabled={!clientToken}
                            onClick={() => void copyTokenLink()}
                        >
                            <CopyLinkIcon />
                            Token als Link kopieren
                        </Button>
                    </div>
                </div>
            </div>

            <div className={css.connectToPeerContainer}>
                <h2 className={css.heading}>
                    <ConnectIcon />
                    Mit Peer verbinden
                </h2>

                <div className={css.tokenInputContainer}>
                    {waitingForResponse && (
                        <p className={`${css.mutedText} ${css.fadeInScale}`}>
                            Warte auf Bestätigung von:
                        </p>
                    )}
                    <TokenInput
                        value={remoteToken}
                        onChange={value => setRemoteToken(value.toUpperCase())}
                    />
                    {!waitingForResponse && (
                        <p className={css.mutedText}>
                            Fremden Token eingeben, um Verbindung aufzubauen
                        </p>
                    )}
                </div>

                <Button
                    onClick={() => {
                        connectToPeer();
                    }}
                    disabled={waitingForResponse}
                >
                    Verbinden
                </Button>
            </div>

            <WaitingDialog
                ref={waitingDialog}
                onCancel={() => interruptWaiting()}
            />
            <AwaitConnectionDialog ref={awaitConnectionDialog} />
        </div>
    );
}
