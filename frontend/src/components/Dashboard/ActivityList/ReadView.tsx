import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import css from "./ReadView.module.scss";
import { IconX as CloseIcon } from "@tabler/icons-react";
import { TextEntry } from "../../../services/MessagingService";
import { useMessagingService } from "../../../context/connection/MessagingContext";
import { useModalView } from "../../../hooks/useModalView";
import {
    getSizeInHumanReadableFormat,
    getTimeInHumanReadableFormat,
} from "../transferFormat";
import { BlockButton, CopyButton } from "./ActivityRows";
import IconButton from "../../IconButton/IconButton";

// Matches the shrink-out in ReadView.module.scss.
const CLOSE_MS = 120;

/** Shows a whole text read-only over the transfer list. */
export default function ReadView({
    entry,
    blocked,
    onClose,
}: {
    entry: TextEntry;
    blocked: boolean;
    onClose: () => void;
}) {
    const { t } = useTranslation("dashboard");
    const messaging = useMessagingService();
    const [closing, setClosing] = useState(false);
    const closeTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(closeTimer.current), []);

    const close = () => {
        if (closing) {
            return;
        }
        setClosing(true);
        closeTimer.current = window.setTimeout(onClose, CLOSE_MS);
    };
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalView(dialogRef, close);
    const peer = entry.peer.toUpperCase();
    const title =
        entry.direction === "down"
            ? t("transfers.read.from", { token: peer })
            : t("transfers.read.to", { token: peer });
    const lines = entry.text.split("\n").length;

    return (
        <div className={css.overlay}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`${css.dialog} ${closing ? css.closing : ""}`}
            >
                <div className={css.bar}>
                    <span className={css.title}>{title}</span>
                    <span className={css.meta}>
                        {t("lines", { count: lines })} ·{" "}
                        {getSizeInHumanReadableFormat(
                            new Blob([entry.text]).size
                        )}{" "}
                        · {getTimeInHumanReadableFormat(entry.at)}
                    </span>
                    <CopyButton text={entry.text} />
                    {entry.direction === "down" && (
                        <BlockButton
                            peer={entry.peer}
                            blocked={blocked}
                            onBlock={() => messaging.block(entry.peer)}
                        />
                    )}
                    <IconButton
                        label={t("transfers.read.close")}
                        tooltip={t("transfers.read.closeShortcut")}
                        size="m"
                        onClick={close}
                    >
                        <CloseIcon aria-hidden />
                    </IconButton>
                </div>
                <label htmlFor="read-text" className={css.label}>
                    {title}
                </label>
                <div className={css.scroller}>
                    <textarea
                        id="read-text"
                        className={css.text}
                        value={entry.text}
                        readOnly
                        autoFocus
                        spellCheck={false}
                        wrap="off"
                    />
                </div>
            </div>
        </div>
    );
}
