import css from "./ReadView.module.scss";
import { IconX as CloseIcon } from "@tabler/icons-react";
import { TextEntry } from "../../../services/MessagingService";
import { useMessagingService } from "../../../context/connection/MessagingContext";
import {
    getSizeInHumanReadableFormat,
    getTimeInHumanReadableFormat,
} from "../transferFormat";
import { BlockButton, CopyButton } from "./ActivityRows";
import IconButton from "../../IconButton/IconButton";

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
    const messaging = useMessagingService();
    const peer = entry.peer.toUpperCase();
    const title =
        entry.direction === "down" ? `Text von ${peer}` : `Text an ${peer}`;
    const lines = entry.text.split("\n").length;

    return (
        <div
            className={css.overlay}
            onClick={event => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={css.dialog}
            >
                <div className={css.bar}>
                    <span className={css.title}>{title}</span>
                    <span className={css.meta}>
                        {lines} {lines === 1 ? "Zeile" : "Zeilen"} ·{" "}
                        {getSizeInHumanReadableFormat(
                            new Blob([entry.text]).size
                        )}{" "}
                        · {getTimeInHumanReadableFormat(entry.at)}
                    </span>
                    <CopyButton text={entry.text} />
                    {entry.direction === "down" && !blocked && (
                        <BlockButton
                            peer={entry.peer}
                            onBlock={() => {
                                messaging.block(entry.peer);
                                onClose();
                            }}
                        />
                    )}
                    <IconButton
                        label="Text schließen"
                        tooltip="Schließen (Esc)"
                        size="m"
                        onClick={onClose}
                    >
                        <CloseIcon aria-hidden />
                    </IconButton>
                </div>
                <label htmlFor="read-text" className={css.label}>
                    {title}
                </label>
                <textarea
                    id="read-text"
                    className={css.text}
                    value={entry.text}
                    readOnly
                    autoFocus
                    spellCheck={false}
                    wrap="off"
                    onKeyDown={event => {
                        if (event.key === "Escape") {
                            event.preventDefault();
                            onClose();
                        }
                    }}
                />
            </div>
        </div>
    );
}
