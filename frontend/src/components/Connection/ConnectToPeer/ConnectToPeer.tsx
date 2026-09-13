import Button from "../../Button/Button";
import TokenInput from "../TokenInput/TokenInput";
import css from "./ConnectToPeer.module.scss";
import ConnectIcon from "../../../assets/icons8-computers-connecting.svg?react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useOutgoingConnectionRequest } from "../../../hooks/useOutgoingConnectionRequest";
import { normalizeClientToken } from "../../../services/WebSocketService";
import { ConnectWarningDialog } from "../../Popups/ConnectWarningDialog";
import { getSettings, updateSettings } from "../../../services/SettingsStore";

export default function ConnectToPeer() {
    const { target, waitingForResponse, connect, validate, cancel } =
        useOutgoingConnectionRequest();
    const [searchParams] = useSearchParams();
    const urlToken = searchParams.get("token") ?? undefined;

    const [remoteToken, setRemoteToken] = useState<string>(
        urlToken ? normalizeClientToken(urlToken) : ""
    );
    const [warningDialogOpen, setWarningDialogOpen] = useState<boolean>(false);
    const connectButtonRef = useRef<HTMLButtonElement | null>(null);
    const autoConnectAttemptedRef = useRef<boolean>(false);

    // Mirror the outgoing target into the token input so requests initiated
    // elsewhere (e.g. by clicking a LAN peer) are visible and cancellable here.
    useEffect(() => {
        if (target) {
            setRemoteToken(target);
        }
    }, [target]);

    // The token is passed in rather than read from state, so both stay stable
    // and the auto-connect effect below runs on the URL token alone.
    const submitConnect = useCallback(
        (token: string) => {
            if (connect(token)) {
                connectButtonRef.current?.focus();
            }
        },
        [connect]
    );

    const requestConnect = useCallback(
        (token: string) => {
            // Token checks (length, own token) run first, so the warning is
            // only shown for tokens that can actually be connected to.
            if (!validate(token)) {
                return;
            }

            if (!getSettings().showConnectWarning) {
                submitConnect(token);
                return;
            }

            setWarningDialogOpen(true);
        },
        [validate, submitConnect]
    );

    // Tokens opened via /connect?token=<TOKEN> trigger the regular connect flow,
    // including the warning dialog and token validation, once per page load.
    // The ref guard covers the second mount StrictMode performs in development.
    useEffect(() => {
        if (!urlToken || autoConnectAttemptedRef.current) {
            return;
        }

        autoConnectAttemptedRef.current = true;
        requestConnect(normalizeClientToken(urlToken));
    }, [urlToken, requestConnect]);

    const confirmConnectWarning = (dontShowAgain: boolean) => {
        if (dontShowAgain) {
            updateSettings({ showConnectWarning: false });
        }

        setWarningDialogOpen(false);
        submitConnect(remoteToken);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!waitingForResponse) {
            requestConnect(remoteToken);
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
                    onClick={() => requestConnect(remoteToken)}
                    variant={"filled"}
                    ref={connectButtonRef}
                >
                    Verbinden
                </Button>
            )}

            {warningDialogOpen && (
                <ConnectWarningDialog
                    onConfirm={confirmConnectWarning}
                    onCancel={() => setWarningDialogOpen(false)}
                />
            )}
        </div>
    );
}
