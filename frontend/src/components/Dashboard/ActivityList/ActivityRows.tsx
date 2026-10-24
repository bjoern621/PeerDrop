import { ReactNode, useState } from "react";
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
import IconButton from "../../IconButton/IconButton";
import TruncatedText from "../../TruncatedText/TruncatedText";
import RowButton from "../RowButton/RowButton";
import StatusChip from "../StatusChip/StatusChip";
import { useMessagingService } from "../../../context/connection/MessagingContext";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import useSettings from "../../../hooks/useSettings";
import { useCopyToClipboard } from "../../../hooks/useCopyToClipboard";
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
                    <StatusChip tone="neutral">Wird gesendet</StatusChip>
                ) : entry.status === "delivered" ? (
                    <StatusChip tone="success">Gesendet</StatusChip>
                ) : (
                    <StatusChip
                        tone="error"
                        tooltip="Versuche es später noch einmal"
                    >
                        Fehlgeschlagen
                    </StatusChip>
                )
            ) : (
                <>
                    <CopyButton text={entry.text} />
                    <BlockButton
                        peer={entry.peer}
                        blocked={blocked.has(entry.peer)}
                        onBlock={() => messaging.block(entry.peer)}
                    />
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
                <span className={css.iconName}>
                    {folderName ? (
                        <FolderIcon className={css.icon} aria-hidden />
                    ) : (
                        <FileIcon className={css.icon} aria-hidden />
                    )}
                    <TruncatedText className={css.name}>
                        {offerName(entry)}
                    </TruncatedText>
                </span>
            }
            count={folderName ? count : undefined}
            direction={entry.direction}
            peer={entry.peer}
            size={entry.summary.bytes}
            at={entry.at}
        >
            {entry.status === "declined" ? (
                <StatusChip tone="error">Abgelehnt</StatusChip>
            ) : entry.status === "failed" ? (
                <StatusChip tone="error">Fehlgeschlagen</StatusChip>
            ) : entry.direction === "up" ? (
                <>
                    <div className={css.progress}>
                        <div className={css.progressInfo}>
                            <PauseIcon aria-hidden />
                            <TruncatedText className={css.waitingLabel}>
                                Wartet auf Bestätigung
                            </TruncatedText>
                        </div>
                        <div className={css.barIdle} />
                    </div>
                    <IconButton
                        variant="badge"
                        label="Abbrechen"
                        onClick={() => messaging.cancelOffer(entry.offerId)}
                    >
                        <CloseIcon aria-hidden />
                    </IconButton>
                </>
            ) : (
                <>
                    <RowButton
                        primary
                        tooltip="Klicken, um die Übertragung anzunehmen"
                        onClick={() =>
                            messaging.answerOffer(entry.offerId, true)
                        }
                    >
                        ANNEHMEN
                    </RowButton>
                    <IconButton
                        variant="badge"
                        label="Ablehnen"
                        onClick={() =>
                            messaging.answerOffer(entry.offerId, false)
                        }
                    >
                        <CloseIcon aria-hidden />
                    </IconButton>
                    <BlockButton
                        peer={entry.peer}
                        blocked={blocked.has(entry.peer)}
                        onBlock={() => messaging.block(entry.peer)}
                    />
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
                    className={css.iconName}
                    style={{ paddingLeft: depth * 24 }}
                >
                    <TruncatedText className={css.name}>
                        {transfer.name}
                    </TruncatedText>
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
                        <TruncatedText className={css.name}>
                            {folder.name}
                        </TruncatedText>
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
        top && direction === "down" ? (
            <BlockButton
                peer={remoteToken}
                blocked={blocked.has(remoteToken)}
                onBlock={() => messaging.block(remoteToken)}
            />
        ) : null;

    if (transfers.every(t => t.status === "done")) {
        return (
            <>
                <StatusChip tone="success">Fertig!</StatusChip>
                {top && direction === "down" && (
                    <RowButton
                        tooltip={
                            autoSaveDownloads
                                ? `Klicken, um ${saveHint} erneut zu speichern`
                                : `Klicken, um ${saveHint} zu speichern`
                        }
                        onClick={() => save(pcm)}
                    >
                        SPEICHERN
                    </RowButton>
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
                    <StatusChip
                        tone="error"
                        tooltip={`Die Verbindung zu ${remoteToken.toUpperCase()} ist abgebrochen`}
                    >
                        Fehlgeschlagen
                    </StatusChip>
                    {top && direction === "up" && (
                        <IconButton
                            variant="badge"
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
                <StatusChip
                    tone="warning"
                    tooltip="Die Übertragung wurde abgebrochen"
                >
                    Abgebrochen
                </StatusChip>
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
                        <TruncatedText>Verbindet...</TruncatedText>
                    ) : (
                        <>
                            <span>{Math.floor(progress * 100)} %</span>
                            <TruncatedText>{info}</TruncatedText>
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
                    variant="badge"
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
            <div role="cell" className={css.timeCell}>
                <span className={css.time}>
                    {time.slice(0, 5)}
                    <span className={css.seconds}>{time.slice(5)}</span>
                </span>
            </div>
        </div>
    );
}

/** Blocks a sender until reload. Once blocked, it stays in red and does nothing. */
export function BlockButton({
    peer,
    blocked,
    onBlock,
}: {
    peer: string;
    blocked: boolean;
    onBlock: () => void;
}) {
    const token = peer.toUpperCase();
    return blocked ? (
        <IconButton
            variant="badge"
            tone="error"
            label={`${token} blockiert`}
            tooltip={`${token} ist blockiert, bis du die Seite neu lädst`}
            aria-disabled
        >
            <BlockIcon aria-hidden />
        </IconButton>
    ) : (
        <IconButton
            variant="badge"
            label={`${token} blockieren`}
            onClick={onBlock}
        >
            <BlockIcon aria-hidden />
        </IconButton>
    );
}

export function CopyButton({ text }: { text: string }) {
    const [copied, copy] = useCopyToClipboard();

    return (
        <RowButton
            tooltip="Klicken, um den Text zu kopieren"
            onClick={() => void copy(text)}
        >
            {copied ? "KOPIERT" : "KOPIEREN"}
        </RowButton>
    );
}
