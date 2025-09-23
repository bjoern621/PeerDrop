import { toast } from "react-toastify";
import css from "./ConfirmConnectToast.module.scss";

interface ConnectionRequestToastProps {
    requestingPeerToken: string;
    onAccept: () => void;
    onReject: () => void;
    toastId: string;
}

export default function ConnectionRequestToast({
    requestingPeerToken,
    onAccept,
    onReject,
    toastId,
}: ConnectionRequestToastProps) {
    const handleAccept = () => {
        onAccept();
        toast.dismiss(toastId);
    };

    const handleReject = () => {
        onReject();
        toast.dismiss(toastId);
    };

    return (
        <div className={css.container}>
            <div className={css.message}>
                Verbindungsanfrage von {requestingPeerToken}.
            </div>
            <div className={css.buttonContainer}>
                <button onClick={handleAccept} className={css.acceptButton}>
                    Akzeptieren
                </button>
                <button onClick={handleReject} className={css.rejectButton}>
                    Ablehnen
                </button>
            </div>
        </div>
    );
}
