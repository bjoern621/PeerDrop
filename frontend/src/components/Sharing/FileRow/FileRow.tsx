import { CSSProperties, memo, useEffect, useRef, useState } from "react";
import css from "./FileRow.module.scss";
import DownloadIcon from "../../../assets/icons8-download.svg?react";
import UploadIcon from "../../../assets/icons8-upload.svg?react";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import Badge from "../../Badge/Badge";
import Tooltip from "../../Tooltip/Tooltip";
import { TransferSnapshot } from "../../../services/TransferTracker";
import {
    getSizeInHumanReadableFormat,
    getTimeInHumanReadableFormat,
    getTransferInfo,
} from "../transferFormat";

interface FileRowProps {
    transfer: TransferSnapshot;
    /** Nesting level of the row, 0 for a file outside any folder. */
    depth?: number;
}

function FileRowComponent({ transfer, depth = 0 }: FileRowProps) {
    const peerConnectionManager = usePeerConnectionManager();
    const [isOverflowing, setIsOverflowing] = useState(false);
    const nameRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Check if the content overflows
        if (nameRef.current) {
            const isOverflow =
                nameRef.current.scrollWidth > nameRef.current.clientWidth;
            setIsOverflowing(isOverflow);
        }
    }, []);

    return (
        <tr className={css.fileRow}>
            <td>
                <div
                    ref={nameRef}
                    className={css.rowName}
                    style={{ "--nesting-depth": depth } as CSSProperties}
                    title={isOverflowing ? transfer.name : undefined}
                >
                    {transfer.name}
                </div>
            </td>
            <td className={css.progressCell}>
                {transfer.direction === "up" ? (
                    <UploadIcon className={css.uploadIcon} />
                ) : (
                    <DownloadIcon className={css.downloadIcon} />
                )}

                {transfer.status === "done" ? (
                    <>
                        <Badge color_scheme="success" size={"m"}>
                            Fertig!
                        </Badge>
                        {transfer.direction === "down" && (
                            <Tooltip
                                content="Klicken, um erneut zu speichern"
                                position="top"
                            >
                                <Badge
                                    size="s"
                                    color_scheme="neutral"
                                    clickable
                                    onClick={() => {
                                        peerConnectionManager.redownloadFile(
                                            transfer.uuid
                                        );
                                    }}
                                >
                                    SPEICHERN
                                </Badge>
                            </Tooltip>
                        )}
                    </>
                ) : transfer.status === "failed" ? (
                    <Badge color_scheme="neutral" size={"m"}>
                        Fehlgeschlagen
                    </Badge>
                ) : (
                    <div className={css.progressContainer}>
                        <div className={css.progressInfo}>
                            <span>
                                {(transfer.progress * 100).toFixed(2)} %
                            </span>

                            <span>{getTransferInfo(transfer)}</span>
                        </div>

                        <progress
                            className={css.progressBar}
                            value={transfer.progress}
                            max={1}
                        />
                    </div>
                )}
            </td>
            <td>{getSizeInHumanReadableFormat(transfer.size)}</td>
            <td>{getTimeInHumanReadableFormat(transfer.startedAt)}</td>
        </tr>
    );
}

/** Memoized so toggling a folder does not re-render unchanged sibling rows. */
const FileRow = memo(FileRowComponent);
export default FileRow;
