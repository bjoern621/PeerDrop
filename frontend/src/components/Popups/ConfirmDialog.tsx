import css from "./Popups.module.scss";

type ConfirmDialogProps = {
    token: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export const ConfirmDialog = ({
    token,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) => {
    return (
        <div className={css.container}>
            <span className={css.message}>
                Ein User möchte sich mit Ihnen verbinden:
            </span>
            <div className={css.tokenContainer}>
                <span className={css.token}>{token}</span>
            </div>
            <span className={css.buttonBar}>
                <button className={css.button} onClick={onCancel}>
                    Abbruch
                </button>
                <button className={css.button} onClick={onConfirm}>
                    Zulassen
                </button>
            </span>
        </div>
    );
};
