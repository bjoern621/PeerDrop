import { useEffect, useRef, useState } from "react";
import StableText from "../../StableText/StableText";
import css from "./FileRow.module.scss";
import { FileDirection, FileDisplay } from "../types";
import DownloadIcon from "../../../assets/icons8-download.svg?react";
import UploadIcon from "../../../assets/icons8-upload.svg?react";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import Badge from "../../Badge/Badge";
import Tooltip from "../../Tooltip/Tooltip";

interface FileRowProps {
    fileUUID: string;
    file: FileDisplay;
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

/** Progress samples older than this are dropped from the speed window. */
const SPEED_WINDOW_MS = 5000;

export default function FileRow({ fileUUID, file }: FileRowProps) {
    const peerConnectionManager = usePeerConnectionManager();
    const [progress, setProgress] = useState(0);
    const [, setNow] = useState(Date.now());
    const [isOverflowing, setIsOverflowing] = useState(false);
    const nameRef = useRef<HTMLDivElement>(null);
    // Sliding window of recent progress samples for the speed estimate.
    const speedSamplesRef = useRef<{ time: number; bytes: number }[]>([]);

    useEffect(() => {
        // Check if the content overflows
        if (nameRef.current) {
            const isOverflow =
                nameRef.current.scrollWidth > nameRef.current.clientWidth;
            setIsOverflowing(isOverflow);
        }
    }, []);

    useEffect(() => {
        const onFileProgressUpdate = (data: {
            uuid: string;
            progress: number;
        }) => {
            if (data.uuid !== fileUUID) {
                return;
            }

            const samples = speedSamplesRef.current;
            const now = Date.now();
            samples.push({ time: now, bytes: data.progress * file.size });
            while (
                samples.length > 1 &&
                samples[0].time < now - SPEED_WINDOW_MS
            ) {
                samples.shift();
            }

            setProgress(data.progress);
        };

        peerConnectionManager.subscribeToFileProgress(onFileProgressUpdate);

        return () => {
            peerConnectionManager.unsubscribeFromFileProgress(
                onFileProgressUpdate
            );
        };
    }, [fileUUID, peerConnectionManager, file.size]); // TODO: use Exhaustive Deps Exclude

    // Update every second to refresh the remaining time display
    useEffect(() => {
        if (progress >= 1) return; // Don't update if transfer is complete

        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [progress]);

    /**
     * Transfer speed over the recent sample window in bytes per second.
     * Measured against the current time.
     */
    const getCurrentSpeed = (): number | null => {
        const samples = speedSamplesRef.current;
        if (samples.length < 2) {
            return null;
        }

        const oldest = samples[0];
        const newest = samples[samples.length - 1];
        const elapsedSeconds = (Date.now() - oldest.time) / 1000;
        if (elapsedSeconds <= 0) {
            return null;
        }

        return (newest.bytes - oldest.bytes) / elapsedSeconds;
    };

    const getTransferInfo = (): string => {
        const speed = getCurrentSpeed();
        if (speed === null || speed <= 0) {
            return "Berechne...";
        }

        const remainingSize = file.size * (1 - progress);
        const estimatedTimeRemainingSeconds = remainingSize / speed;

        return `${getSpeedInHumanReadableFormat(speed)} · ${formatRemainingTime(estimatedTimeRemainingSeconds)}`;
    };

    return (
        <tr className={css.fileRow}>
            <td>
                <div
                    ref={nameRef}
                    title={isOverflowing ? file.name : undefined}
                >
                    <StableText
                        text={file.name}
                        fontWeight="var(--font-weight-medium)"
                    />
                </div>
            </td>
            <td className={css.progressCell}>
                {file.direction === FileDirection.UP ? (
                    <UploadIcon className={css.uploadIcon} />
                ) : (
                    <DownloadIcon className={css.downloadIcon} />
                )}

                {progress >= 1 ? (
                    <>
                        <Badge color_scheme="success" size={"m"}>
                            Fertig!
                        </Badge>
                        {file.direction === FileDirection.DOWN && (
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
                                            fileUUID
                                        );
                                    }}
                                >
                                    SPEICHERN
                                </Badge>
                            </Tooltip>
                        )}
                    </>
                ) : (
                    <div className={css.progressContainer}>
                        <div className={css.progressInfo}>
                            <span>{(progress * 100).toFixed(2)} %</span>

                            <span>{getTransferInfo()}</span>
                        </div>

                        <progress
                            className={css.progressBar}
                            value={progress}
                            max={1}
                        />
                    </div>
                )}
            </td>
            <td>
                <StableText
                    text={getSizeInHumanReadableFormat(file.size)}
                    fontWeight="var(--font-weight-medium)"
                />
            </td>
            <td>
                <StableText
                    text={getTimeInHumanReadableFormat(file.time)}
                    fontWeight="var(--font-weight-medium)"
                />
            </td>
        </tr>
    );
}
