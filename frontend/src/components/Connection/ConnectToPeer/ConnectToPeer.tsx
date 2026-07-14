import Button from "../../Button/Button";
import TokenInput from "../TokenInput/TokenInput";
import css from "./ConnectToPeer.module.scss";
import ConnectIcon from "../../../assets/icons8-computers-connecting.svg?react";
import { useEffect, useRef, useState } from "react";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import { useConnectionRequestState } from "../../../hooks/useConnectionRequestState";
import { toast } from "react-toastify/unstyled";
import { connectErrorToast } from "../../../util/connectErrorToast";

/**
 * Minimum time the waiting UI stays visible after a request was sent, so
 * instant rejections do not feel abrupt.
 */
const MIN_WAITING_MS = 1000;

export default function ConnectToPeer() {
    const peerConnectionManager = usePeerConnectionManager();
    const requestState = useConnectionRequestState();

    const [remoteToken, setRemoteToken] = useState<string>("");
    const connectButtonRef = useRef<HTMLButtonElement | null>(null);

    // The waiting UI is derived from the server-pushed snapshot: a pending
    // outgoing request exists exactly while the server says so. The hold
    // below only stretches the displayed state to MIN_WAITING_MS.
    const serverWaiting = requestState.outgoingRequestTarget !== null;
    const [holdingWait, setHoldingWait] = useState(false);
    const requestStartRef = useRef<number>(0);

    // Mirror the outgoing target into the token input so requests initiated
    // elsewhere (e.g. by clicking a LAN peer) are visible and cancellable here.
    useEffect(() => {
        if (requestState.outgoingRequestTarget) {
            setRemoteToken(requestState.outgoingRequestTarget);
        }
    }, [requestState.outgoingRequestTarget]);

    useEffect(() => {
        if (serverWaiting) {
            requestStartRef.current = Date.now();
            setHoldingWait(true);
            return;
        }

        const remaining =
            MIN_WAITING_MS - (Date.now() - requestStartRef.current);

        if (remaining <= 0) {
            setHoldingWait(false);
            return;
        }

        const timeoutId = setTimeout(() => setHoldingWait(false), remaining);
        return () => clearTimeout(timeoutId);
    }, [serverWaiting]);

    const waitingForResponse = serverWaiting || holdingWait;

    // Rejections are transient feedback, not state: the waiting UI itself
    // clears via the snapshot. The toast is delayed to match the hold.
    useEffect(() => {
        const onResponse = (accepted: boolean) => {
            if (accepted) {
                // Navigation is handled in ConnectionProvider.
                return;
            }

            const remaining = Math.max(
                0,
                MIN_WAITING_MS - (Date.now() - requestStartRef.current)
            );

            setTimeout(() => {
                toast.error("Verbindungsanfrage wurde abgelehnt!", {
                    toastId: "connection-rejected-toast",
                    updateId: "connection-rejected-toast",
                });
            }, remaining);
        };

        peerConnectionManager.subscribeToConnectionResponse(onResponse);
        return () => {
            peerConnectionManager.unsubscribeFromConnectionResponse(onResponse);
        };
    }, [peerConnectionManager]);

    const interruptWaiting = () => {
        peerConnectionManager.cancelConnectionRequest(remoteToken);
        // A local cancel needs no minimum-wait hold.
        requestStartRef.current = 0;
    };

    const connectToPeer = () => {
        const result = peerConnectionManager.connect(remoteToken);

        if (!result.ok) {
            const { message, toastId } = connectErrorToast(result.error);
            toast.warn(message, { toastId, updateId: toastId });
            return false;
        }

        // Covers rejections that arrive before the first snapshot does
        // (e.g. the entered token does not exist).
        requestStartRef.current = Date.now();

        return true;
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
                        onChange={value => setRemoteToken(value.toUpperCase())}
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
