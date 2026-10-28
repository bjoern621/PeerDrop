import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify/unstyled";
import { useServerConnection } from "./useServerConnection";
import { useOwnToken } from "./useOwnToken";
import { displayToken } from "../services/WebSocketService";

const LOST_CONNECTION_TOAST_ID = "lost-connection";

/**
 * Shows an error toast while the connection to the server is lost.
 * A success toast follows the reconnect and names the token if it changed.
 */
export function useLostConnectionToast() {
    const { t } = useTranslation("common");
    const lost = useServerConnection() === "lost";
    const token = useOwnToken();
    const tokenBeforeLoss = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!lost) {
            return;
        }
        toast.error(t("connection.lost"), {
            toastId: LOST_CONNECTION_TOAST_ID,
            autoClose: false,
            closeOnClick: false,
        });
        return () => toast.dismiss(LOST_CONNECTION_TOAST_ID);
    }, [lost, t]);

    useEffect(() => {
        if (lost) {
            tokenBeforeLoss.current ??= token;
            return;
        }
        if (tokenBeforeLoss.current === undefined || token === undefined) {
            return;
        }
        toast.success(
            token === tokenBeforeLoss.current
                ? t("connection.restored")
                : t("connection.restoredNewToken", {
                      token: displayToken(token),
                  })
        );
        tokenBeforeLoss.current = undefined;
    }, [lost, token, t]);
}
