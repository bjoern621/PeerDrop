import { forwardRef, Ref, useId } from "react";
import css from "./AwaitConnectionDialog.module.scss";
import sharedCss from "./Popups.module.scss";

export const AwaitConnectionDialog = forwardRef<HTMLDialogElement>(
    (_: unknown, ref: Ref<HTMLDialogElement>) => {
        const headingId = useId();

        return (
            <dialog
                ref={ref}
                className={`${sharedCss.dialog} ${css.dialog}`}
                aria-labelledby={headingId}
            >
                <div className={css.container}>
                    <div className={css.spinner} aria-hidden="true" />
                    <h2 id={headingId} className={css.heading}>
                        Verbindung wird hergestellt
                    </h2>
                    <p className={css.text}>
                        Das kann ein paar Sekunden dauern.
                    </p>
                </div>
            </dialog>
        );
    }
);
