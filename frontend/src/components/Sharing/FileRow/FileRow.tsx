import { useEffect, useState } from "react";
import StableText from "../../StableText/StableText";
import css from "./FileRow.module.scss";
import { FileDirection, FileDisplay } from "../types";
import DownloadIcon from "../../../assets/icons8-download.svg?react";
import UploadIcon from "../../../assets/icons8-upload.svg?react";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";

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

export default function FileRow({ fileUUID, file }: FileRowProps) {
    const peerConnectionManager = usePeerConnectionManager();
    const [progress, setProgress] = useState(0);
    const [, setNow] = useState(Date.now());

    useEffect(() => {
        const onFileProgressUpdate = (data: {
            uuid: string;
            progress: number;
        }) => {
            if (data.uuid !== fileUUID) {
                return;
            }

            setProgress(data.progress);
        };

        peerConnectionManager.subscribeToFileProgress(onFileProgressUpdate);

        return () => {
            peerConnectionManager.unsubscribeFromFileProgress(
                onFileProgressUpdate
            );
        };
    }, []);

    // Update every second to refresh the remaining time display
    useEffect(() => {
        if (progress >= 1) return; // Don't update if transfer is complete

        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [progress]);

    const getRemainingTime = (): string => {
        const totalSize = file.size;
        const transferredSize = totalSize * progress;
        const timeElapsed = Date.now() - file.time.getTime(); // in milliseconds

        // Prevent division by zero
        if (transferredSize === 0) {
            return "Berechne...";
        }

        const averageSpeed = transferredSize / (timeElapsed / 1000); // in bytes per second
        const remainingSize = totalSize - transferredSize;
        const estimatedTimeRemaining = remainingSize / averageSpeed; // in seconds

        if (estimatedTimeRemaining > 3600) {
            const hours = Math.floor(estimatedTimeRemaining / 3600);
            const minutes = Math.floor((estimatedTimeRemaining % 3600) / 60);
            return `${hours}h ${minutes}m`;
        } else if (estimatedTimeRemaining > 60) {
            const minutes = Math.floor(estimatedTimeRemaining / 60);
            const seconds = Math.ceil(estimatedTimeRemaining % 60);
            return `${minutes}m ${seconds}s`;
        } else if (estimatedTimeRemaining === 1) {
            return `1 Sekunde`;
        } else {
            return `${Math.ceil(estimatedTimeRemaining)} Sekunden`;
        }
    };

    return (
        <tr className={css.fileRow}>
            <td>
                <StableText
                    text={file.name}
                    fontWeight="var(--font-weight-medium)"
                />
            </td>
            <td className={css.progressCell}>
                {file.direction === FileDirection.UP ? (
                    <UploadIcon className={css.uploadIcon} />
                ) : (
                    <DownloadIcon className={css.downloadIcon} />
                )}

                {progress >= 1 ? (
                    <>
                        <div className={css.progressComplete}>Fertig!</div>
                        <button
                            className={`tooltip-on-hover ${css.retryDownload}`}
                        >
                            DOWNLOAD
                            <div className="tooltip top">
                                Klicken, um erneut herunterzuladen
                            </div>
                        </button>
                    </>
                ) : (
                    <div className={css.progressContainer}>
                        <div className={css.progressInfo}>
                            <span>{progress * 100} %</span>

                            <span>{getRemainingTime()}</span>
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
