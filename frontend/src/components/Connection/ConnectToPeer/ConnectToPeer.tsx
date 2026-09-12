import Button from "../../Button/Button";
import TokenInput from "../TokenInput/TokenInput";
import css from "./ConnectToPeer.module.scss";
import ConnectIcon from "../../../assets/icons8-computers-connecting.svg?react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useOutgoingConnectionRequest } from "../../../hooks/useOutgoingConnectionRequest";
import { normalizeClientToken } from "../../../services/WebSocketService";
import { ConnectWarningDialog } from "../../Popups/ConnectWarningDialog";
import {
    dismissConnectWarning,
    isConnectWarningDismissed,
} from "../../../util/ConnectWarningPreference";

export default function ConnectToPeer() {
    const { target, waitingForResponse, connect, validate, cancel } =
        useOutgoingConnectionRequest();
    const [searchParams] = useSearchParams();
    const urlToken = searchParams.get("token") ?? undefined;

    const [remoteToken, setRemoteToken] = useState<string>(
        urlToken ? normalizeClientToken(urlToken) : ""
    );
    const [showConnectWarning, setShowConnectWarning] =
        useState<boolean>(false);
    const connectButtonRef = useRef<HTMLButtonElement | null>(null);
    const autoConnectAttemptedRef = useRef<boolean>(false);

    // Mirror the outgoing target into the token input so requests initiated
    // elsewhere (e.g. by clicking a LAN peer) are visible and cancellable here.
    useEffect(() => {
        if (target) {
            setRemoteToken(target);
        }
    }, [target]);

    const submitConnect = () => {
        if (connect(remoteToken)) {
            connectButtonRef.current?.focus();
        }
    };

    const requestConnect = () => {
        // Token checks (length, own token) run first, so the warning is
        // only shown for tokens that can actually be connected to.
        if (!validate(remoteToken)) {
            return;
        }

        if (isConnectWarningDismissed()) {
            submitConnect();
            return;
        }

        setShowConnectWarning(true);
    };

    // Tokens opened via /connect?token=<TOKEN> trigger the regular connect flow,
    // including the warning dialog and token validation, once per page load.
    useEffect(() => {
        if (!urlToken || autoConnectAttemptedRef.current) {
            return;
        }

        autoConnectAttemptedRef.current = true;
        requestConnect();

        // The token from the URL is the only trigger. requestConnect closes over
        // the token state, which the ref guard keeps out of a second attempt.
        // exhaustive-deps-exclude [requestConnect]
    }, [urlToken]);

    const confirmConnectWarning = (dontShowAgain: boolean) => {
        if (dontShowAgain) {
            dismissConnectWarning();
        }

        setShowConnectWarning(false);
        submitConnect();
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
                <Button onClick={cancel} variant={"outline"}>
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
