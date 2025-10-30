import { toast } from "react-toastify/unstyled";
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
                Ein Peer möchte sich mit Dir verbinden: {requestingPeerToken}.
            </div>
            <div className={css.buttonContainer}>
                <button onClick={handleAccept}>Verbinden</button>
                <button onClick={handleReject}>Ablehnen</button>
            </div>
        </div>
    );
}
