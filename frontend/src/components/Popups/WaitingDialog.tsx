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
            <button className={css.cancelButton} onClick={onCancel}>
                Abbruch
            </button>
        </div>
    );
};
