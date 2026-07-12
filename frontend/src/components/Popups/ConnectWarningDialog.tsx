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
                    Du bist dabei, eine direkte Verbindung zu einem anderen
                    Gerät herzustellen. Bitte beachte:
                </p>

                <ul className={css.hints}>
                    <li>
                        Du verbindest dich direkt mit dem Besitzer des
                        eingegebenen Tokens
                    </li>
                    <li>
                        Deine Dateien werden verschlüsselt übertragen, aber
                        nicht auf Viren gescannt
                    </li>
                    <li>
                        Du solltest dich nur mit Personen verbinden, denen du
                        vertraust
                    </li>
                </ul>

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
