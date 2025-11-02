import Button from "../../Button/Button";
import TokenInput from "../TokenInput/TokenInput";
import css from "./ConnectToPeer.module.scss";
import ConnectIcon from "../../../assets/icons8-computers-connecting.svg?react";
import { useEffect, useState } from "react";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import { toast } from "react-toastify/unstyled";

export default function ConnectToPeer() {
    const peerConnectionManager = usePeerConnectionManager();

    const [remoteToken, setRemoteToken] = useState<string>("");
    const [waitingForResponse, setWaitingForResponse] =
        useState<boolean>(false);
    const [connectionRequestTimestamp, setConnectionRequestTimestamp] =
        useState<number>(0);
    const [delayTimeoutId, setDelayTimeoutId] = useState<number | null>(null);

    useEffect(() => {
        /**
         * Wait for the minimum delay before processing the connection response.
         * This prevents instant rejections from feeling abrupt.
         */
        const waitForMinimumDelay = async () => {
            const elapsedTime = Date.now() - connectionRequestTimestamp;
            const remainingDelay = Math.max(0, 1000 - elapsedTime);

            if (remainingDelay > 0) {
                await new Promise(resolve => {
                    const timeoutId = setTimeout(resolve, remainingDelay);
                    setDelayTimeoutId(timeoutId);
                });
            }
        };

        peerConnectionManager.setOnConnectionResponseReceivedCallback(
            (accepted: boolean) => {
                void (async () => {
                    await waitForMinimumDelay();

                    setDelayTimeoutId(null);
                    setWaitingForResponse(false);

                    if (accepted) {
                        // showLoadingDialog();
                        // dismissAllToasts();
                    } else {
                        toast.error("Verbindungsanfrage wurde abgelehnt!", {
                            toastId: "connection-rejected-toast",
                            updateId: "connection-rejected-toast",
                        });
                    }
                })();
            }
        );
    }, [peerConnectionManager, connectionRequestTimestamp]);

    const interruptWaiting = () => {
        console.log("Interrupting connection request...");

        if (delayTimeoutId !== null) {
            clearTimeout(delayTimeoutId);
            setDelayTimeoutId(null);
        }

        setWaitingForResponse(false);
        peerConnectionManager.cancelConnectionRequest(remoteToken);
    };

    const connectToPeer = () => {
        const successfullySent =
            peerConnectionManager.requestConnectionToRemotePeer(remoteToken);

        if (successfullySent) {
            setConnectionRequestTimestamp(Date.now());
            setWaitingForResponse(true);
        }
    };

    return (
        <div className={css.connectToPeerContainer}>
            <h2 className={css.heading}>
                <ConnectIcon />
                Mit Peer verbinden
            </h2>

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
                    if (waitingForResponse) {
                        interruptWaiting();
                    } else {
                        connectToPeer();
                    }
                }}
                variant={waitingForResponse ? "outline" : "filled"}
            >
                {waitingForResponse ? "Abbrechen" : "Verbinden"}
            </Button>
        </div>
    );
}
