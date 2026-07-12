import { useEffect, useRef, useState } from "react";
import StableText from "../../StableText/StableText";
import css from "./FileRow.module.scss";
import DownloadIcon from "../../../assets/icons8-download.svg?react";
import UploadIcon from "../../../assets/icons8-upload.svg?react";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import Badge from "../../Badge/Badge";
import Tooltip from "../../Tooltip/Tooltip";
import { TransferSnapshot } from "../../../services/TransferTracker";

interface FileRowProps {
    transfer: TransferSnapshot;
}

const getSizeInHumanReadableFormat = (size: number): string => {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(0)} ${units[unitIndex]}`;
};

const getTimeInHumanReadableFormat = (date: Date): string => {
    return (
        ("0" + date.getHours()).slice(-2) +
        ":" +
        ("0" + date.getMinutes()).slice(-2) +
        ":" +
        ("0" + date.getSeconds()).slice(-2)
    );
};

const getSpeedInHumanReadableFormat = (bytesPerSecond: number): string => {
    const units = ["B/s", "KB/s", "MB/s", "GB/s"];
    let unitIndex = 0;
    let speed = bytesPerSecond;

    while (speed >= 1024 && unitIndex < units.length - 1) {
        speed /= 1024;
        unitIndex++;
    }

    return `${speed.toFixed(1)} ${units[unitIndex]}`;
};

const formatRemainingTime = (seconds: number): string => {
    if (seconds > 3600) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    } else if (seconds > 60) {
        const minutes = Math.floor(seconds / 60);
        const rest = Math.ceil(seconds % 60);
        return `${minutes}m ${rest}s`;
    }
    return `${Math.ceil(seconds)}s`;
};

const getTransferInfo = (transfer: TransferSnapshot): string => {
    if (transfer.status === "finalizing") {
        return "Speichern...";
    }
    if (transfer.speedBps === null || transfer.speedBps <= 0) {
        return "Berechne...";
    }

    const speedText = getSpeedInHumanReadableFormat(transfer.speedBps);
    if (transfer.etaSeconds === null) {
        return speedText;
    }
    return `${speedText} · ${formatRemainingTime(transfer.etaSeconds)}`;
};

export default function FileRow({ transfer }: FileRowProps) {
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
                    title={isOverflowing ? transfer.name : undefined}
                >
                    <StableText
                        text={transfer.name}
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
