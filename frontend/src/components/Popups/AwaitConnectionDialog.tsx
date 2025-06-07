import { forwardRef, Ref } from "react";
import css from "./Popups.module.scss";

export const AwaitConnectionDialog = forwardRef<HTMLDialogElement>(
    (_: unknown, ref: Ref<HTMLDialogElement>) => {
        return (
            <dialog ref={ref} className={css.dialog}>
                <div className={css.container}>
                    <span className={css.message}>
                        Verbindung wird hergestellt...
                    </span>
                </div>
            </dialog>
        );
    }
);
