import { useCallback, useEffect, useRef, useState } from "react";
import { assert } from "../../util/Assert";
import css from "./LandingPage.module.scss";
import bannerLogo from "../../assets/banner_logo.png";
import checkmarkIcon from "../../assets/checkmark.svg";
import copyContentIcon from "../../assets/copy_content.svg";
import rightArrow from "../../assets/right_arrow_light.svg";
import { OTPInput, SlotProps } from "input-otp";
import { WaitingDialog } from "../Popups/WaitingDialog";
import { AwaitConnectionDialog } from "../Popups/AwaitConnectionDialog";
import { useWebSocketService } from "../../context/WebSocketContext";
import { usePeerConnectionManager } from "../../context/PeerConnectionContext";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { DeviceHeartbeatMessage } from "../../types/device/DeviceHeartbeatMessage";
import { toast } from "react-toastify";
import { HEARTBEAT_INTERVAL_MS } from "../../util/Constants";
import gitHubIcon from "../../assets/github-mark.svg";
import gitHubIconBlack from "../../assets/github-mark-black.svg";
import ConfirmConnectToast from "./ConfirmConnectToast/ConfirmConnectToast";

const Slot = ({ char, hasFakeCaret, isActive }: SlotProps) => {
    return (
        <div
            className={`${css.otpSlot} ${isActive ? css.otpSlotActive : ""}`}
            data-state={!char ? "empty" : "filled"}
            data-active={isActive || undefined}
        >
            {char}
            {hasFakeCaret && <div className={css.otpSlotCaret} />}
        </div>
    );
};

enum TokenCopyStatus {
    IDLE,
    HOVER,
    COPIED,
}

export default function LandingPage() {
    const websocket = useWebSocketService();
    const peerConnectionManager = usePeerConnectionManager();

    const [clientToken, setClientToken] = useState<string | null>(null);
    const [remoteToken, setRemoteToken] = useState<string>("");
    const waitingDialog = useRef<HTMLDialogElement | null>(null);
    const awaitConnectionDialog = useRef<HTMLDialogElement | null>(null);
    const [tokenCopyStatus, setTokenCopyStatus] = useState(
        TokenCopyStatus.IDLE
    );

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
            // console.log(`YES ${remoteToken}`);

            assert(remoteToken, "Remote token is not set.");
            peerConnectionManager.acceptConnectionRequest(remoteToken);

            showLoadingDialog();
        },
        [peerConnectionManager]
    );

    const declineConnection = useCallback(
        (remoteToken: string) => {
            // console.log(`NO ${remoteToken}`);

            assert(remoteToken, "Remote token is not set.");
            peerConnectionManager.rejectConnectionRequest(remoteToken);
        },
        [peerConnectionManager]
    );

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
                    // console.log("ACCEPTED");
                    waitingDialog.current!.close();
                    showLoadingDialog();
                } else {
                    // console.log("REJECTED");
                    waitingDialog.current!.close();
                    toast.error("Verbindungsanfrage wurde abgelehnt!");
                }
            }
        );

        const confirmConnectionToastId = "confirm-connection-toast";

        peerConnectionManager.setOnConnectionRequestReceivedCallback(
            (requestingPeerToken: string) => {
                toast.info(
                    <ConfirmConnectToast
                        requestingPeerToken={requestingPeerToken}
                        onAccept={() => confirmConnection(requestingPeerToken)}
                        onReject={() => declineConnection(requestingPeerToken)}
                        toastId={confirmConnectionToastId}
                    />,
                    {
                        closeOnClick: false,
                        autoClose: false,
                        hideProgressBar: false,
                        progress: 1,
                        closeButton: false,
                        className: "confirm-connection-toast-style", // Set in toast-styles.scss
                        toastId: confirmConnectionToastId,
                    }
                );
            }
        );
        peerConnectionManager.setOnConnectionRequestCancelledReceivedCallback(
            () => {
                toast.dismiss(confirmConnectionToastId);
                waitingDialog.current!.close();
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

    const connectToPeer = () => {
        const successfullySent =
            peerConnectionManager.requestConnectionToRemotePeer(remoteToken);

        if (successfullySent) {
            waitingDialog.current!.showModal();
        }
    };

    const copyTokenToClipboard = () => {
        if (clientToken) {
            navigator.clipboard
                .writeText(clientToken)
                .then(() => {
                    setTokenCopyStatus(TokenCopyStatus.COPIED);

                    toast.success("Token in die Zwischenablage kopiert!", {
                        toastId: "token-copied-toast",
                        updateId: "token-copied-toast",
                    });
                })
                .catch(err => {
                    console.error("Failed to copy token:", err);
                    setTokenCopyStatus(TokenCopyStatus.HOVER);
                });
        }
    };

    // Shows a loading dialog while the connection is being established
    // Will be automatically closed by navigation to DataSharingPage
    const showLoadingDialog = () => {
        awaitConnectionDialog.current!.showModal();
    };

    const interruptWaiting = () => {
        if (peerConnectionManager.cancelConnectionRequest(remoteToken)) {
            waitingDialog.current!.close();
        }
    };

    const onTokenHover = () => {
        setTokenCopyStatus(TokenCopyStatus.HOVER);
    };

    const onTokenHoverLeave = () => {
        setTokenCopyStatus(TokenCopyStatus.IDLE);
    };

    return (
        <div className={css.container}>
            <img
                src={bannerLogo}
                className={css.logo}
                alt="Banner Logo von PeerDrop"
                loading="eager"
            />

            <div className={css.quickLinks}>
                <a
                    href="https://github.com/bjoern621/PeerDrop"
                    className={`tooltip-on-hover ${css.quickLinkAnchor}`}
                >
                    <img
                        src={gitHubIcon}
                        alt="GitHub Logo"
                        className={css.quickLinkIcon}
                    />
                    <img
                        src={gitHubIconBlack}
                        alt="GitHub Logo"
                        className={css.quickLinkIconHover}
                    />
                    <div className="tooltip left">Auf GitHub ansehen</div>
                </a>
            </div>

            <button
                className={`${css.ownTokenContainer} ${
                    clientToken ? css.tokenLoaded : ""
                }`}
                onMouseEnter={onTokenHover}
                onMouseLeave={onTokenHoverLeave}
                onClick={copyTokenToClipboard}
            >
                <span className={css.tooltip}>Dein Token</span>
                <div className={css.tokenOverlay}>
                    {!clientToken ||
                    tokenCopyStatus === TokenCopyStatus.IDLE ? (
                        <></>
                    ) : tokenCopyStatus === TokenCopyStatus.HOVER ? (
                        <img
                            src={copyContentIcon}
                            alt="Token kopieren"
                            className={css.tokenOverlayIcon}
                        />
                    ) : (
                        <img
                            src={checkmarkIcon}
                            alt="Token kopiert"
                            className={css.tokenOverlayIcon}
                        />
                    )}
                </div>
                <span className={css.token}>
                    {clientToken ? clientToken : "_____"}
                </span>
            </button>
            <div className={css.peerTokenContainer}>
                <div className={css.inputContainer}>
                    <OTPInput
                        maxLength={5}
                        value={remoteToken}
                        inputMode="text"
                        data-bwignore="true"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        onChange={value => setRemoteToken(value.toUpperCase())}
                        render={({ slots }) => (
                            <>
                                <div className={css.slotsContainer}>
                                    {slots.map((slot, idx) => (
                                        <Slot key={idx} {...slot} />
                                    ))}
                                </div>
                            </>
                        )}
                    ></OTPInput>
                    <button
                        onClick={() => void connectToPeer()}
                        className={css.connectButton}
                    >
                        <img
                            src={rightArrow}
                            alt="Verbinden"
                            className={css.connectButtonIcon}
                        />
                    </button>
                </div>
                <div>Fremdes Token eingeben, um Verbindung aufzubauen</div>
            </div>
            <WaitingDialog
                ref={waitingDialog}
                onCancel={() => interruptWaiting()}
            />
            <AwaitConnectionDialog ref={awaitConnectionDialog} />
        </div>
    );
}
