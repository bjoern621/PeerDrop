import { CSSProperties, memo, useState } from "react";
import rowCss from "../FileRow/FileRow.module.scss";
import css from "./FolderRow.module.scss";
import DownloadIcon from "../../../assets/icons8-download.svg?react";
import UploadIcon from "../../../assets/icons8-upload.svg?react";
import FolderIcon from "../../../assets/filesystem/icons8-folder.svg?react";
import ChevronIcon from "../../../assets/actions/icons8-arrow-3.svg?react";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import Badge from "../../Badge/Badge";
import Tooltip from "../../Tooltip/Tooltip";
import FileRow from "../FileRow/FileRow";
import { FolderNode } from "../groupTransfers";
import {
    getSizeInHumanReadableFormat,
    getTimeInHumanReadableFormat,
    getTransferInfo,
} from "../transferFormat";

interface FolderRowProps {
    folder: FolderNode;
    /**
     * Identifier of the whole folder transfer. Only set on the top-level
     * row, where it enables saving the received folder.
     */
    folderId?: string;
    /** Nesting level of the row, 0 for a top-level folder. */
    depth?: number;
}

/**
 * One folder level in the sharing table: a group row with aggregated size,
 * progress and status of its subtree, expandable to the contained subfolder
 * and file rows.
 */
function FolderRowComponent({ folder, folderId, depth = 0 }: FolderRowProps) {
    const peerConnectionManager = usePeerConnectionManager();
    const [expanded, setExpanded] = useState(false);

    const transfers = folder.transfers;
    const direction = transfers[0].direction;

    const totalSize = transfers.reduce((sum, file) => sum + file.size, 0);
    const totalBytes = transfers.reduce(
        (sum, file) => sum + file.bytesTransferred,
        0
    );
    const progress = totalSize > 0 ? Math.min(totalBytes / totalSize, 1) : 0;
    const startedAt = transfers.reduce(
        (earliest, file) =>
            file.startedAt < earliest ? file.startedAt : earliest,
        transfers[0].startedAt
    );

    const allDone = transfers.every(file => file.status === "done");
    const anyFailed = transfers.some(file => file.status === "failed");
    const anyFinalizing = transfers.some(file => file.status === "finalizing");

    const speedBps = transfers.reduce<number | null>(
        (sum, file) =>
            file.speedBps !== null ? (sum ?? 0) + file.speedBps : sum,
        null
    );
    const etaSeconds =
        speedBps !== null && speedBps > 0
            ? Math.max(totalSize - totalBytes, 0) / speedBps
            : null;

    return (
        <>
            <tr className={rowCss.fileRow}>
                <td>
                    <button
                        type="button"
                        className={css.folderToggle}
                        style={{ "--nesting-depth": depth } as CSSProperties}
                        onClick={() => setExpanded(value => !value)}
                        aria-expanded={expanded}
                    >
                        <ChevronIcon
                            className={`${css.chevron} ${expanded ? css.chevronOpen : ""}`}
                        />
                        <FolderIcon className={css.folderIcon} />
                        <span className={css.folderName}>{folder.name}</span>
                        <span className={css.fileCount}>
                            {transfers.length === 1
                                ? "1 Datei"
                                : `${transfers.length} Dateien`}
                        </span>
                    </button>
                </td>
                <td className={rowCss.progressCell}>
                    {direction === "up" ? (
                        <UploadIcon className={rowCss.uploadIcon} />
                    ) : (
                        <DownloadIcon className={rowCss.downloadIcon} />
                    )}

                    {allDone ? (
                        <>
                            <Badge color_scheme="success" size={"m"}>
                                Fertig!
                            </Badge>
                            {direction === "down" && folderId && (
                                <Tooltip
                                    content="Klicken, um den Ordner zu speichern"
                                    position="top"
                                >
                                    <Badge
                                        size="s"
                                        color_scheme="neutral"
                                        clickable
                                        onClick={() => {
                                            void peerConnectionManager.saveFolder(
                                                folderId
                                            );
                                        }}
                                    >
                                        SPEICHERN
                                    </Badge>
                                </Tooltip>
                            )}
                        </>
                    ) : anyFailed ? (
                        <Badge color_scheme="neutral" size={"m"}>
                            Fehlgeschlagen
                        </Badge>
                    ) : (
                        <div className={rowCss.progressContainer}>
                            <div className={rowCss.progressInfo}>
                                <span>{(progress * 100).toFixed(2)} %</span>

                                <span>
                                    {getTransferInfo({
                                        status: anyFinalizing
                                            ? "finalizing"
                                            : "active",
                                        speedBps,
                                        etaSeconds,
                                    })}
                                </span>
                            </div>

                            <progress
                                className={rowCss.progressBar}
                                value={progress}
                                max={1}
                            />
                        </div>
                    )}
                </td>
                <td>{getSizeInHumanReadableFormat(totalSize)}</td>
                <td>{getTimeInHumanReadableFormat(startedAt)}</td>
            </tr>

            {expanded && (
                <>
                    {folder.subfolders.map(subfolder => (
                        <FolderRow
                            key={subfolder.id}
                            folder={subfolder}
                            depth={depth + 1}
                        />
                    ))}
                    {folder.files.map(transfer => (
                        <FileRow
                            key={transfer.uuid}
                            transfer={transfer}
                            depth={depth + 1}
                        />
                    ))}
                </>
            )}
        </>
    );
}

/** Memoized so toggling a folder does not re-render unchanged sibling rows. */
const FolderRow = memo(FolderRowComponent);
export default FolderRow;
