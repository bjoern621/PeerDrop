import { ConnectError } from "../services/PeerConnectionManager";
import { CLIENT_TOKEN_LENGTH } from "./Constants";

interface ConnectErrorToast {
    message: string;
    toastId: string;
}

const CONNECT_ERROR_TOASTS: Record<ConnectError, ConnectErrorToast> = {
    "invalid-length": {
        message: `Peer Token muss ${CLIENT_TOKEN_LENGTH} Zeichen lang sein.`,
        toastId: "token-length-toast",
    },
    "own-token": {
        message: "Bitte gib einen fremden Token ein, nicht deinen eigenen.",
        toastId: "cannot-send-to-self-toast",
    },
};

/**
 * Maps a connect error to the user-facing German message and a stable toast id
 * for deduplication.
 */
export function connectErrorToast(error: ConnectError): ConnectErrorToast {
    return CONNECT_ERROR_TOASTS[error];
}
