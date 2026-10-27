import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify/unstyled";
import { useServerConnection } from "./useServerConnection";

const LOST_CONNECTION_TOAST_ID = "lost-connection";

/** Shows an error toast while the connection to the server is lost. It stays until the connection returns. */
export function useLostConnectionToast() {
    const { t } = useTranslation("common");
    const lost = useServerConnection() === "lost";

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
}
