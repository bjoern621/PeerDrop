import css from "./Popups.module.scss";

type WaitingDialogProps = {
    onCancel: () => void;
};

export const WaitingDialog = ({ onCancel }: WaitingDialogProps) => {
    return (
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
    );
};
