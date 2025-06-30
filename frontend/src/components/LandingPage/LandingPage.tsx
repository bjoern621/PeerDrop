import { useCallback, useEffect, useRef, useState } from "react";
import { TypedMessage } from "../../services/WebSocketService";
import { assert } from "../../util/Assert";
import css from "./LandingPage.module.scss";
import bannerLogo from "../../assets/banner_logo.png";
import checkmark from "../../assets/checkmark.svg";
import copyContent from "../../assets/copy_content.svg";
import forwardarrow from "../../assets/forwardarrow_light.svg";
import { OTPInput, SlotProps } from "input-otp";
import { WaitingDialog } from "../Popups/WaitingDialog";
import { ConfirmDialog } from "../Popups/ConfirmDialog";
import { AwaitConnectionDialog } from "../Popups/AwaitConnectionDialog";
import { MessageType } from "../../services/MessageType";
import { useWebSocketService } from "../../context/WebSocketContext";
import { usePeerConnectionManager } from "../../context/PeerConnectionContext";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { DeviceHeartbeatMessage } from "../../types/device/DeviceHeartbeatMessage";

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
    const confirmDialog = useRef<HTMLDialogElement | null>(null);
    const awaitConnectionDialog = useRef<HTMLDialogElement | null>(null);
    const [showSnackbar, setShowSnackbar] = useState(false);
    const snackbarTimeout = useRef<number | null>(null);
    const [tokenCopyStatus, setTokenCopyStatus] = useState(
        TokenCopyStatus.IDLE
    );

    const [remoteTokenOfRequestingPeer, setRemoteTokenOfRequestingPeer] =
        useState<string | undefined>(undefined);

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

        const heartbeat: TypedMessage<DeviceHeartbeatMessage> = {
            type: MessageType.DEVICE_HEARTBEAT,
            msg: {
                uuid: deviceUuid,
                status: DeviceStatus.ONLINE,
            },
        };

        websocket.sendMessage(heartbeat);
    }, [websocket]);

    useEffect(() => {
        console.log("useEffect triggered");

        assert(websocket, "WebSocketService is not initialized.");

        const handler = (message: unknown) => {
            console.log("Received message:", message);
        };
        websocket.subscribeMessage(MessageType.TEST, handler);

        type TestMessage = {
            message: string;
        };

        const testMessage: TypedMessage<TestMessage> = {
            type: MessageType.TEST,
            msg: {
                message: "Hallo Server",
            },
        };

        setTimeout(() => {
            websocket.sendMessage(testMessage);
        }, 1000);

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
                }
            }
        );
        peerConnectionManager.setOnConnectionRequestReceivedCallback(
            (requestingPeerToken: string) => {
                setRemoteTokenOfRequestingPeer(requestingPeerToken);
                confirmDialog.current!.showModal();
            }
        );
        peerConnectionManager.setOnConnectionRequestCancelledReceivedCallback(
            () => {
                confirmDialog.current!.close();
                waitingDialog.current!.close();
            }
        );

        sendHeartbeatIfPossible();

        return () => {
            clearInterval(checkToken);
            websocket.unsubscribeMessage(MessageType.TEST, handler);
        };
    }, [websocket, peerConnectionManager, sendHeartbeatIfPossible]);

    const connectToPeer = () => {
        const successfullySent =
            peerConnectionManager.requestConnectionToRemotePeer(remoteToken);

        if (successfullySent) {
            waitingDialog.current!.showModal();
        }
    };

    const copyTokenToClipboard = () => {
        // Force hide first to reset animation
        setShowSnackbar(false);
        if (clientToken) {
            navigator.clipboard
                .writeText(clientToken)
                .then(() => {
                    setTokenCopyStatus(TokenCopyStatus.COPIED);

                    if (snackbarTimeout.current) {
                        clearTimeout(snackbarTimeout.current);
                    }
                    // Then re-show in next tick
                    setShowSnackbar(true);
                    snackbarTimeout.current = window.setTimeout(() => {
                        setShowSnackbar(false);
                    }, 3000);
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

    const declineConnection = () => {
        // console.log(`NO ${remoteTokenOfRequestingPeer}`);

        confirmDialog.current!.close();

        assert(remoteTokenOfRequestingPeer, "Remote token is not set.");
        peerConnectionManager.rejectConnectionRequest(
            remoteTokenOfRequestingPeer
        );
    };

    const confirmConnection = () => {
        // console.log(`YES ${remoteTokenOfRequestingPeer}`);

        confirmDialog.current!.close();

        assert(remoteTokenOfRequestingPeer, "Remote token is not set.");
        peerConnectionManager.acceptConnectionRequest(
            remoteTokenOfRequestingPeer
        );

        showLoadingDialog();
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
            <button
                className={`${css.ownTokenContainer} ${clientToken ? css.tokenLoaded : ""
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
                            src={copyContent}
                            alt="Token kopieren"
                            className={css.tokenOverlayIcon}
                        />
                    ) : (
                        <img
                            src={checkmark}
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
                            src={forwardarrow}
                            alt="Verbinden"
                            className={css.connectButtonIcon}
                        />
                    </button>
                </div>
                <div>Anderes Token eingeben, um Verbindung aufzubauen</div>
            </div>
            <WaitingDialog
                ref={waitingDialog}
                onCancel={() => interruptWaiting()}
            />
            <ConfirmDialog
                ref={confirmDialog}
                onCancel={() => declineConnection()}
                onConfirm={() => confirmConnection()}
                token={remoteTokenOfRequestingPeer}
            />
            <AwaitConnectionDialog ref={awaitConnectionDialog} />
            {showSnackbar && (
                <div className={css.snackbar}>
                    Token in die Zwischenablage kopiert!
                </div>
            )}
        </div>
    );
}
