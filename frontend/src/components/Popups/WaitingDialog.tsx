import { forwardRef, useRef } from "react";
import css from "./Popups.module.scss";

type WaitingDialogProps = {
    onCancel: () => void;
};

export const WaitingDialog = forwardRef<HTMLDialogElement, WaitingDialogProps>(
    ({ onCancel }: WaitingDialogProps, ref) => {
        return (
            <dialog ref={ref} className={css.dialog}>
                <div className={css.container}>
                    <span className={css.message}>
                        Warte auf Bestätigung des Partners...
                    </span>
                    <span className={css.buttonBar}>
                        <button className={css.button} onClick={onCancel}>
                            Abbruch
                        </button>
                    </span>
                </div>
            </dialog>
        );
    }
);
