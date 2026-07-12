import { useEffect, useRef, useState } from "react";
import StableText from "../../StableText/StableText";
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
    /**
     * Renders the row indented as part of an expanded folder, showing the
     * path within the folder instead of the bare file name.
     */
    nested?: boolean;
}

export default function FileRow({ transfer, nested = false }: FileRowProps) {
    const peerConnectionManager = usePeerConnectionManager();
    const [isOverflowing, setIsOverflowing] = useState(false);
    const nameRef = useRef<HTMLDivElement>(null);

    // Path within the folder, without the folder name shown on the group row.
    const displayName =
        nested && transfer.relativePath
            ? transfer.relativePath.split("/").slice(1).join("/") ||
              transfer.name
            : transfer.name;

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
                    className={nested ? css.nestedName : undefined}
                    title={isOverflowing ? displayName : undefined}
                >
                    <StableText
                        text={displayName}
                        fontWeight="var(--font-weight-medium)"
                    />
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
            <td>
                <StableText
                    text={getSizeInHumanReadableFormat(transfer.size)}
                    fontWeight="var(--font-weight-medium)"
                />
            </td>
            <td>
                <StableText
                    text={getTimeInHumanReadableFormat(transfer.startedAt)}
                    fontWeight="var(--font-weight-medium)"
                />
            </td>
        </tr>
    );
}
