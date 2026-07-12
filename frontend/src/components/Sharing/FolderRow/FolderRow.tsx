import { useState } from "react";
import StableText from "../../StableText/StableText";
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
import { FolderTransferItem } from "../groupTransfers";
import {
    getSizeInHumanReadableFormat,
    getTimeInHumanReadableFormat,
    getTransferInfo,
} from "../transferFormat";

interface FolderRowProps {
    folder: FolderTransferItem;
}

/**
 * One folder transfer in the sharing table: a group row with aggregated
 * size, progress and status, expandable to the contained file rows.
 */
export default function FolderRow({ folder }: FolderRowProps) {
    const peerConnectionManager = usePeerConnectionManager();
    const [expanded, setExpanded] = useState(false);

    const files = folder.files;
    const direction = files[0].direction;

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalBytes = files.reduce(
        (sum, file) => sum + file.bytesTransferred,
        0
    );
    const progress = totalSize > 0 ? Math.min(totalBytes / totalSize, 1) : 0;
    const startedAt = files.reduce(
        (earliest, file) =>
            file.startedAt < earliest ? file.startedAt : earliest,
        files[0].startedAt
    );

    const allDone = files.every(file => file.status === "done");
    const anyFailed = files.some(file => file.status === "failed");
    const anyFinalizing = files.some(file => file.status === "finalizing");

    const speedBps = files.reduce<number | null>(
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
                        onClick={() => setExpanded(value => !value)}
                        aria-expanded={expanded}
                    >
                        <ChevronIcon
                            className={`${css.chevron} ${expanded ? css.chevronOpen : ""}`}
                        />
                        <FolderIcon className={css.folderIcon} />
                        <StableText
                            text={folder.name}
                            fontWeight="var(--font-weight-medium)"
                        />
                        <span className={css.fileCount}>
                            {files.length === 1
                                ? "1 Datei"
                                : `${files.length} Dateien`}
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
                            {direction === "down" && (
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
                                                folder.folderId
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
                <td>
                    <StableText
                        text={getSizeInHumanReadableFormat(totalSize)}
                        fontWeight="var(--font-weight-medium)"
                    />
                </td>
                <td>
                    <StableText
                        text={getTimeInHumanReadableFormat(startedAt)}
                        fontWeight="var(--font-weight-medium)"
                    />
                </td>
            </tr>

            {expanded &&
                files.map(transfer => (
                    <FileRow key={transfer.uuid} transfer={transfer} nested />
                ))}
        </>
    );
}
