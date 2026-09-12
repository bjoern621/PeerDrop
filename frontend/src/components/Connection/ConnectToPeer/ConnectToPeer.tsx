import Button from "../../Button/Button";
import TokenInput from "../TokenInput/TokenInput";
import css from "./ConnectToPeer.module.scss";
import ConnectIcon from "../../../assets/icons8-computers-connecting.svg?react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import { OutgoingRequestEvent } from "../../../services/PeerConnectionManager";
import { toast } from "react-toastify/unstyled";
import { ConnectWarningDialog } from "../../Popups/ConnectWarningDialog";
import {
    dismissConnectWarning,
    isConnectWarningDismissed,
} from "../../../util/ConnectWarningPreference";

export default function ConnectToPeer() {
    const peerConnectionManager = usePeerConnectionManager();
    const [searchParams] = useSearchParams();
    const urlToken = searchParams.get("token") ?? undefined;

    const [remoteToken, setRemoteToken] = useState<string>(
        urlToken?.toUpperCase() ?? ""
    );
    const [showConnectWarning, setShowConnectWarning] =
        useState<boolean>(false);
    const [waitingForResponse, setWaitingForResponse] =
        useState<boolean>(false);
    const [connectionRequestTimestamp, setConnectionRequestTimestamp] =
        useState<number>(0);
    const delayTimeoutIdRef = useRef<number | null>(null);
    const autoConnectAttemptedRef = useRef<boolean>(false);

    const connectButtonRef = useRef<HTMLButtonElement | null>(null);

    // Mirror the shared outgoing-request state so requests initiated elsewhere
    // (e.g. by clicking a LAN peer) show the same waiting UI and can be
    // cancelled here. Responses are handled by the response callback below to
    // preserve the minimum-delay behavior.
    useEffect(() => {
        const onOutgoingRequestChanged = (event: OutgoingRequestEvent) => {
            if (event.state === "requested") {
                setRemoteToken(event.remoteToken);
                setConnectionRequestTimestamp(Date.now());
                setWaitingForResponse(true);
            } else if (event.state === "cancelled") {
                setWaitingForResponse(false);
            }
        };

        peerConnectionManager.subscribeToOutgoingRequestChanged(
            onOutgoingRequestChanged
        );

        return () => {
            peerConnectionManager.unsubscribeFromOutgoingRequestChanged(
                onOutgoingRequestChanged
            );
        };
    }, [peerConnectionManager]);

    useEffect(() => {
        /**
         * Wait for the minimum delay before processing the connection response.
         * This prevents instant rejections from feeling abrupt.
         */
        const waitForMinimumDelay = async () => {
            const elapsedTime = Date.now() - connectionRequestTimestamp;
            const remainingDelay = Math.max(0, 1000 - elapsedTime);

            if (remainingDelay > 0) {
                await new Promise<void>(resolve => {
                    delayTimeoutIdRef.current = setTimeout(
                        resolve,
                        remainingDelay
                    );
                });
            }
        };

        peerConnectionManager.setOnConnectionResponseReceivedCallback(
            (accepted: boolean) => {
                void (async () => {
                    if (!accepted) {
                        // If remote peer accepted, we can skip the delay
                        await waitForMinimumDelay();
                    }

                    delayTimeoutIdRef.current = null;
                    setWaitingForResponse(false);

                    if (!accepted) {
                        toast.error("Verbindungsanfrage wurde abgelehnt!", {
                            toastId: "connection-rejected-toast",
                            updateId: "connection-rejected-toast",
                        });
                    }

                    // Navigation is handled in ConnectionProvider
                })();
            }
        );

        return () => {
            if (delayTimeoutIdRef.current !== null) {
                clearTimeout(delayTimeoutIdRef.current);
            }
        };
    }, [peerConnectionManager, connectionRequestTimestamp]);

    const interruptWaiting = () => {
        if (delayTimeoutIdRef.current !== null) {
            clearTimeout(delayTimeoutIdRef.current);
            delayTimeoutIdRef.current = null;
        }

        setWaitingForResponse(false);
        peerConnectionManager.cancelConnectionRequest(remoteToken);
    };

    const connectToPeer = useCallback(() => {
        const successfullySent =
            peerConnectionManager.requestConnectionToRemotePeer(remoteToken);

        if (successfullySent) {
            setConnectionRequestTimestamp(Date.now());
            setWaitingForResponse(true);
            connectButtonRef.current?.focus();
        }

        return successfullySent;
    }, [peerConnectionManager, remoteToken]);

    const requestConnect = useCallback(() => {
        // Token checks (length, own token) run first, so the warning is
        // only shown for tokens that can actually be connected to.
        if (!peerConnectionManager.validateRemoteToken(remoteToken)) {
            return;
        }

        if (isConnectWarningDismissed()) {
            connectToPeer();
            return;
        }

        setShowConnectWarning(true);
    }, [peerConnectionManager, connectToPeer, remoteToken]);

    // Tokens opened via /connect?token=<TOKEN> trigger the regular connect flow,
    // including the warning dialog and token validation, once per page load.
    useEffect(() => {
        if (!urlToken || autoConnectAttemptedRef.current) {
            return;
        }

        autoConnectAttemptedRef.current = true;
        requestConnect();
    }, [urlToken, requestConnect]);

    const confirmConnectWarning = (dontShowAgain: boolean) => {
        if (dontShowAgain) {
            dismissConnectWarning();
        }

        setShowConnectWarning(false);
        connectToPeer();
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!waitingForResponse) {
            requestConnect();
        }
    };

    return (
        <div className={css.connectToPeerContainer}>
            <h2 className={css.heading}>
                <ConnectIcon />
                Mit Peer verbinden
            </h2>

            <form onSubmit={handleSubmit}>
                <div className={css.tokenInputContainer}>
                    {waitingForResponse && (
                        <p
                            className={`${css.mutedText} ${css.fadeInScale} ${css.waitingText}`}
                        >
                            Warte auf Bestätigung von:
                        </p>
                    )}
                    <TokenInput
                        value={remoteToken}
                        onChange={value => setRemoteToken(value)}
                    />
                    {!waitingForResponse && (
                        <p className={css.mutedText}>
                            Fremden Token eingeben, um Verbindung aufzubauen
                        </p>
                    )}
                </div>
            </form>

            {waitingForResponse ? (
                <Button onClick={interruptWaiting} variant={"outline"}>
                    Abbrechen
                </Button>
            ) : (
                <Button
                    onClick={requestConnect}
                    variant={"filled"}
                    ref={connectButtonRef}
                >
                    Verbinden
                </Button>
            )}

            {showConnectWarning && (
                <ConnectWarningDialog
                    onConfirm={confirmConnectWarning}
                    onCancel={() => setShowConnectWarning(false)}
                />
            )}
        </div>
    );
}
