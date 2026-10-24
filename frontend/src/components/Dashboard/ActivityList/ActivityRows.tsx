import { ReactNode, useEffect, useRef, useState } from "react";
import css from "./ActivityList.module.scss";
import {
    IconUpload as UploadIcon,
    IconDownload as DownloadIcon,
    IconFolder as FolderIcon,
    IconFile as FileIcon,
    IconChevronRight as ChevronIcon,
    IconX as CloseIcon,
    IconBan as BlockIcon,
    IconRefresh as RetryIcon,
    IconPlayerPauseFilled as PauseIcon,
    IconAlignLeft as LinesIcon,
} from "@tabler/icons-react";
import Badge from "../../Badge/Badge";
import Tooltip from "../../Tooltip/Tooltip";
import { useMessagingService } from "../../../context/connection/MessagingContext";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import useSettings from "../../../hooks/useSettings";
import { OfferEntry, TextEntry } from "../../../services/MessagingService";
import { TransferSnapshot } from "../../../services/TransferTracker";
import { peerColor } from "../../../util/peerColor";
import { FolderNode } from "../groupTransfers";
import { offerName } from "../activity";
import {
    getSizeInHumanReadableFormat,
    getTimeInHumanReadableFormat,
    getTransferInfo,
} from "../transferFormat";

const COPIED_MS = 2000;

interface RowProps {
    blocked: ReadonlySet<string>;
}

export function TextRow({
    entry,
    blocked,
    onOpen,
}: RowProps & { entry: TextEntry; onOpen: () => void }) {
    const messaging = useMessagingService();
    const preview = entry.text.replace(/\s+/g, " ").trim();

    return (
        <Row
            name={
                <button
                    type="button"
                    className={css.nameButton}
                    title="Klicken, um den ganzen Text zu lesen"
                    onClick={onOpen}
                >
                    <LinesIcon className={css.icon} aria-hidden />
                    <span className={css.textPreview}>{preview}</span>
                </button>
            }
            direction={entry.direction}
            peer={entry.peer}
            size={new Blob([entry.text]).size}
            at={entry.at}
        >
            {entry.direction === "up" ? (
                entry.status === "sending" ? (
                    <Badge size="m">Wird gesendet</Badge>
                ) : entry.status === "delivered" ? (
                    <Badge color_scheme="success" size="m">
                        Gesendet
                    </Badge>
                ) : (
                    <Tooltip content="Versuche es später noch einmal.">
                        <Badge color_scheme="error" size="m">
                            Fehlgeschlagen
                        </Badge>
                    </Tooltip>
                )
            ) : (
                <>
                    <CopyBadge text={entry.text} />
                    {!blocked.has(entry.peer) && (
                        <BlockButton
                            onBlock={() => messaging.block(entry.peer)}
                            peer={entry.peer}
                        />
                    )}
                </>
            )}
        </Row>
    );
}

export function OfferRow({ entry, blocked }: RowProps & { entry: OfferEntry }) {
    const messaging = useMessagingService();
    const { folderName, count } = entry.summary;

    return (
        <Row
            name={
                <span className={css.name}>
                    {folderName ? (
                        <FolderIcon className={css.icon} aria-hidden />
                    ) : (
                        <FileIcon className={css.icon} aria-hidden />
                    )}{" "}
                    {offerName(entry)}
                </span>
            }
            count={folderName ? count : undefined}
            direction={entry.direction}
            peer={entry.peer}
            size={entry.summary.bytes}
            at={entry.at}
        >
            {entry.status === "declined" ? (
                <Badge color_scheme="error" size="m">
                    Abgelehnt
                </Badge>
            ) : entry.status === "failed" ? (
                <Badge color_scheme="error" size="m">
                    Fehlgeschlagen
                </Badge>
            ) : entry.direction === "up" ? (
                <>
                    <div className={css.progress}>
                        <div className={css.progressInfo}>
                            <PauseIcon aria-hidden />
                            <span className={css.waitingLabel}>
                                Wartet auf Bestätigung
                            </span>
                        </div>
                        <div className={css.barIdle} />
                    </div>
                    <IconButton
                        label="Abbrechen"
                        onClick={() => messaging.cancelOffer(entry.offerId)}
                    >
                        <CloseIcon aria-hidden />
                    </IconButton>
                </>
            ) : (
                <>
                    <Badge
                        color_scheme="primary"
                        clickable
                        title="Klicken, um die Übertragung anzunehmen"
                        onClick={() =>
                            messaging.answerOffer(entry.offerId, true)
                        }
                    >
                        ANNEHMEN
                    </Badge>
                    <IconButton
                        label="Ablehnen"
                        onClick={() =>
                            messaging.answerOffer(entry.offerId, false)
                        }
                    >
                        <CloseIcon aria-hidden />
                    </IconButton>
                    {!blocked.has(entry.peer) && (
                        <BlockButton
                            onBlock={() => messaging.block(entry.peer)}
                            peer={entry.peer}
                        />
                    )}
                </>
            )}
        </Row>
    );
}

export function FileRow({
    transfer,
    blocked,
    depth = 0,
}: RowProps & { transfer: TransferSnapshot; depth?: number }) {
    return (
        <Row
            name={
                <span
                    className={css.name}
                    title={transfer.name}
                    style={{ paddingLeft: depth * 24 }}
                >
                    {transfer.name}
                </span>
            }
            direction={transfer.direction}
            peer={transfer.remoteToken}
            size={transfer.size}
            at={transfer.startedAt}
        >
            <TransferStatus
                transfers={[transfer]}
                top={depth === 0}
                blocked={blocked}
                save={pcm => pcm.redownloadFile(transfer.uuid)}
                saveHint="die Datei"
            />
        </Row>
    );
}

export function FolderRow({
    folder,
    folderId,
    blocked,
    depth = 0,
}: RowProps & { folder: FolderNode; folderId?: string; depth?: number }) {
    const [expanded, setExpanded] = useState(false);
    const transfers = folder.transfers;
    const first = transfers[0];
    const startedAt = transfers.reduce(
        (earliest, t) => (t.startedAt < earliest ? t.startedAt : earliest),
        first.startedAt
    );

    return (
        <>
            <Row
                name={
                    <button
                        type="button"
                        className={css.nameButton}
                        style={{ paddingLeft: depth * 24 }}
                        aria-expanded={expanded}
                        onClick={() => setExpanded(value => !value)}
                    >
                        <ChevronIcon
                            className={`${css.chevron} ${expanded ? css.chevronOpen : ""}`}
                            aria-hidden
                        />
                        <FolderIcon className={css.icon} aria-hidden />
                        <span className={css.name}>{folder.name}</span>
                    </button>
                }
                count={transfers.length}
                direction={first.direction}
                peer={first.remoteToken}
                size={transfers.reduce((sum, t) => sum + t.size, 0)}
                at={startedAt}
            >
                <TransferStatus
                    transfers={transfers}
                    top={depth === 0}
                    blocked={blocked}
                    save={pcm =>
                        folderId ? void pcm.saveFolder(folderId) : undefined
                    }
                    saveHint="den Ordner"
                />
            </Row>
            {expanded && (
                <>
                    {folder.subfolders.map(sub => (
                        <FolderRow
                            key={sub.id}
                            folder={sub}
                            blocked={blocked}
                            depth={depth + 1}
                        />
                    ))}
                    {folder.files.map(file => (
                        <FileRow
                            key={file.uuid}
                            transfer={file}
                            blocked={blocked}
                            depth={depth + 1}
                        />
                    ))}
                </>
            )}
        </>
    );
}

/** Status of one file or a whole folder, with the actions that fit it. */
function TransferStatus({
    transfers,
    top,
    blocked,
    save,
    saveHint,
}: {
    transfers: TransferSnapshot[];
    top: boolean;
    blocked: ReadonlySet<string>;
    save: (pcm: ReturnType<typeof usePeerConnectionManager>) => unknown;
    saveHint: string;
}) {
    const pcm = usePeerConnectionManager();
    const messaging = useMessagingService();
    const { autoSaveDownloads } = useSettings();
    const { direction, remoteToken } = transfers[0];

    const block =
        top && direction === "down" && !blocked.has(remoteToken) ? (
            <BlockButton
                onBlock={() => messaging.block(remoteToken)}
                peer={remoteToken}
            />
        ) : null;

    if (transfers.every(t => t.status === "done")) {
        return (
            <>
                <Badge color_scheme="success" size="m">
                    Fertig!
                </Badge>
                {top && direction === "down" && (
                    <Tooltip
                        content={
                            autoSaveDownloads
                                ? `Klicken, um ${saveHint} erneut zu speichern`
                                : `Klicken, um ${saveHint} zu speichern`
                        }
                    >
                        <Badge clickable onClick={() => save(pcm)}>
                            SPEICHERN
                        </Badge>
                    </Tooltip>
                )}
                {block}
            </>
        );
    }

    const running = transfers.filter(
        t =>
            t.status === "waiting" ||
            t.status === "active" ||
            t.status === "finalizing"
    );
    const failed = transfers.filter(t => t.status === "failed");

    if (running.length === 0) {
        if (failed.length > 0) {
            return (
                <>
                    <Tooltip
                        content={`Die Verbindung zu ${remoteToken.toUpperCase()} ist abgebrochen.`}
                    >
                        <Badge color_scheme="error" size="m">
                            Fehlgeschlagen
                        </Badge>
                    </Tooltip>
                    {top && direction === "up" && (
                        <IconButton
                            label="Erneut senden"
                            onClick={() =>
                                failed.forEach(t => pcm.retryTransfer(t.uuid))
                            }
                        >
                            <RetryIcon aria-hidden />
                        </IconButton>
                    )}
                    {block}
                </>
            );
        }
        return (
            <>
                <Tooltip content="Die Übertragung wurde abgebrochen.">
                    <Badge color_scheme="warning" size="m">
                        Abgebrochen
                    </Badge>
                </Tooltip>
                {block}
            </>
        );
    }

    const size = transfers.reduce((sum, t) => sum + t.size, 0);
    const bytes = transfers.reduce((sum, t) => sum + t.bytesTransferred, 0);
    const progress = size > 0 ? Math.min(bytes / size, 1) : 0;
    const connecting = running.every(t => t.status === "waiting");
    const speedBps = running.reduce<number | null>(
        (sum, t) => (t.speedBps !== null ? (sum ?? 0) + t.speedBps : sum),
        null
    );
    const info = getTransferInfo({
        status: running.some(t => t.status === "active")
            ? "active"
            : running[0].status,
        direction,
        speedBps,
        etaSeconds:
            speedBps !== null && speedBps > 0
                ? Math.max(size - bytes, 0) / speedBps
                : null,
    });

    return (
        <>
            <div className={css.progress}>
                <div className={css.progressInfo}>
                    {connecting ? (
                        <span>Verbindet...</span>
                    ) : (
                        <>
                            <span>{Math.floor(progress * 100)} %</span>
                            <span>{info}</span>
                        </>
                    )}
                </div>
                <div className={connecting ? css.barIdle : css.bar}>
                    {!connecting && (
                        <div
                            className={css.barFill}
                            style={{ width: `${progress * 100}%` }}
                        />
                    )}
                </div>
            </div>
            {top && (
                <IconButton
                    label="Abbrechen"
                    onClick={() =>
                        running.forEach(t => pcm.cancelTransfer(t.uuid))
                    }
                >
                    <CloseIcon aria-hidden />
                </IconButton>
            )}
            {block}
        </>
    );
}

function Row({
    name,
    count,
    direction,
    peer,
    size,
    at,
    children,
}: {
    name: ReactNode;
    count?: number;
    direction: "up" | "down";
    peer: string;
    size: number;
    at: Date;
    children: ReactNode;
}) {
    const time = getTimeInHumanReadableFormat(at);

    return (
        <div role="row" className={css.row}>
            <div role="cell" className={css.nameCell}>
                {name}
                {count !== undefined && (
                    <span className={css.count}>
                        {count === 1 ? "1 Datei" : `${count} Dateien`}
                    </span>
                )}
            </div>
            <div role="cell" className={css.progressCell}>
                {direction === "up" ? (
                    <UploadIcon
                        className={css.direction}
                        role="img"
                        aria-label="Gesendet"
                    />
                ) : (
                    <DownloadIcon
                        className={css.direction}
                        role="img"
                        aria-label="Empfangen"
                    />
                )}
                <span className={css.peer} style={{ color: peerColor(peer) }}>
                    {peer.toUpperCase()}
                </span>
                <div className={css.status}>{children}</div>
            </div>
            <div role="cell" className={css.sizeCell}>
                {getSizeInHumanReadableFormat(size)}
            </div>
            <div role="cell" className={`${css.timeCell} ${css.time}`}>
                {time.slice(0, 5)}
                <span className={css.seconds}>{time.slice(5)}</span>
            </div>
        </div>
    );
}

function IconButton({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            className={css.iconButton}
            aria-label={label}
            title={label}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function BlockButton({ peer, onBlock }: { peer: string; onBlock: () => void }) {
    return (
        <IconButton
            label={`${peer.toUpperCase()} blockieren`}
            onClick={onBlock}
        >
            <BlockIcon aria-hidden />
        </IconButton>
    );
}

export function CopyBadge({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    return (
        <Badge
            clickable
            title="Klicken, um den Text zu kopieren"
            onClick={() => {
                void navigator.clipboard.writeText(text).then(() => {
                    setCopied(true);
                    window.clearTimeout(timer.current);
                    timer.current = window.setTimeout(
                        () => setCopied(false),
                        COPIED_MS
                    );
                });
            }}
        >
            {copied ? "KOPIERT" : "KOPIEREN"}
        </Badge>
    );
}
