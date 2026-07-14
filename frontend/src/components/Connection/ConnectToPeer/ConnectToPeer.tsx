import Button from "../../Button/Button";
import TokenInput from "../TokenInput/TokenInput";
import css from "./ConnectToPeer.module.scss";
import ConnectIcon from "../../../assets/icons8-computers-connecting.svg?react";
import { useEffect, useRef, useState } from "react";
import { useOutgoingConnectionRequest } from "../../../hooks/useOutgoingConnectionRequest";

export default function ConnectToPeer() {
    const { target, waitingForResponse, connect, cancel } =
        useOutgoingConnectionRequest();

    const [remoteToken, setRemoteToken] = useState<string>("");
    const connectButtonRef = useRef<HTMLButtonElement | null>(null);

    // Mirror the outgoing target into the token input so requests initiated
    // elsewhere (e.g. by clicking a LAN peer) are visible and cancellable here.
    useEffect(() => {
        if (target) {
            setRemoteToken(target);
        }
    }, [target]);

    const submitConnect = () => connect(remoteToken);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!waitingForResponse && submitConnect()) {
            connectButtonRef.current!.focus();
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
                <Button onClick={cancel} variant={"outline"}>
                    Abbrechen
                </Button>
            ) : (
                <Button
                    onClick={submitConnect}
                    variant={"filled"}
                    ref={connectButtonRef}
                >
                    Verbinden
                </Button>
            )}
        </div>
    );
}
