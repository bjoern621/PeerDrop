import Button from "../../Button/Button";
import TokenInput from "../TokenInput/TokenInput";
import css from "./ConnectToPeer.module.scss";
import ConnectIcon from "../../../assets/icons8-computers-connecting.svg?react";
import { useEffect, useRef, useState } from "react";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import { OutgoingRequestEvent } from "../../../services/PeerConnectionManager";
import { toast } from "react-toastify/unstyled";

export default function ConnectToPeer() {
    const peerConnectionManager = usePeerConnectionManager();

    const [remoteToken, setRemoteToken] = useState<string>("");
    const [waitingForResponse, setWaitingForResponse] =
        useState<boolean>(false);
    const [connectionRequestTimestamp, setConnectionRequestTimestamp] =
        useState<number>(0);
    const delayTimeoutIdRef = useRef<number | null>(null);

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

    // Waiting state is set by the outgoing-request subscription above.
    const connectToPeer = () => {
        return peerConnectionManager.requestConnectionToRemotePeer(remoteToken);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!waitingForResponse) {
            const successfullySent = connectToPeer();

            if (successfullySent) {
                connectButtonRef.current!.focus();
            }
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
                    onClick={connectToPeer}
                    variant={"filled"}
                    ref={connectButtonRef}
                >
                    Verbinden
                </Button>
            )}
        </div>
    );
}
