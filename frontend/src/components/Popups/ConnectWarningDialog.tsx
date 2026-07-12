import { useEffect, useId, useRef, useState } from "react";
import Button from "../Button/Button";
import css from "./ConnectWarningDialog.module.scss";
import sharedCss from "./Popups.module.scss";

type ConnectWarningDialogProps = {
    onConfirm: (dontShowAgain: boolean) => void;
    onCancel: () => void;
};

/**
 * Modal warning about the risks of connecting to another peer.
 *
 * Opens on mount. Escape triggers onCancel, matching the cancel button.
 */
export function ConnectWarningDialog({
    onConfirm,
    onCancel,
}: ConnectWarningDialogProps) {
    const dialogRef = useRef<HTMLDialogElement | null>(null);
    const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
    const headingId = useId();
    const checkboxId = useId();

    const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

    useEffect(() => {
        dialogRef.current!.showModal();
        confirmButtonRef.current!.focus();
    }, []);

    return (
        <dialog
            ref={dialogRef}
            className={`${sharedCss.dialog} ${css.dialog}`}
            aria-labelledby={headingId}
            onCancel={onCancel}
        >
            <div className={css.container}>
                <h2 id={headingId} className={css.heading}>
                    Sicherheitshinweis
                </h2>

                <p className={css.text}>
                    PeerDrop baut eine direkte Verbindung zum anderen Gerät auf.
                    Übertragene Dateien stammen unmittelbar vom Gegenüber und
                    werden nicht geprüft. Verbinde Dich nur mit Tokens von
                    Personen, denen Du vertraust.
                </p>

                <label className={css.dontShowAgain} htmlFor={checkboxId}>
                    <input
                        id={checkboxId}
                        type="checkbox"
                        checked={dontShowAgain}
                        onChange={event =>
                            setDontShowAgain(event.target.checked)
                        }
                    />
                    Nicht wieder anzeigen
                </label>

                <div className={css.buttonBar}>
                    <Button variant="outline" onClick={onCancel}>
                        Abbrechen
                    </Button>
                    <Button
                        variant="filled"
                        ref={confirmButtonRef}
                        onClick={() => onConfirm(dontShowAgain)}
                    >
                        Verstanden, verbinden
                    </Button>
                </div>
            </div>
        </dialog>
    );
}
