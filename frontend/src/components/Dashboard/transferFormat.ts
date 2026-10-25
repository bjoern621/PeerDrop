/** Formatting helpers shared by the rows of the transfer list. */

import { TFunction } from "i18next";
import {
    TransferDirection,
    TransferStatus,
} from "../../services/TransferTracker";

export const getSizeInHumanReadableFormat = (size: number): string => {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(0)} ${units[unitIndex]}`;
};

export const getTimeInHumanReadableFormat = (date: Date): string => {
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

/** Speed and remaining time line shown next to a running progress bar. */
export const getTransferInfo = (
    transfer: {
        status: TransferStatus;
        direction: TransferDirection;
        speedBps: number | null;
        etaSeconds: number | null;
    },
    t: TFunction<"dashboard">
): string => {
    if (transfer.status === "finalizing") {
        // The sender waits for the acknowledgement, the receiver stores the file.
        return transfer.direction === "up"
            ? t("transfers.status.awaitingAck")
            : t("transfers.status.storing");
    }
    if (transfer.speedBps === null || transfer.speedBps <= 0) {
        return t("transfers.status.measuring");
    }

    const speedText = getSpeedInHumanReadableFormat(transfer.speedBps);
    if (transfer.etaSeconds === null) {
        return speedText;
    }
    return `${speedText} · ${formatRemainingTime(transfer.etaSeconds)}`;
};
