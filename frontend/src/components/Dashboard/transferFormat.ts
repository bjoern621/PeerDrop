/** Formatting helpers for the texts and transfers on the dashboard. */

import { TFunction } from "i18next";
import {
    TransferDirection,
    TransferStatus,
} from "../../services/TransferTracker";

/** Divides `value` by 1024 until it fits the unit, up to the last of `units`. */
const formatScaled = (
    value: number,
    units: string[],
    fractionDigits: number
): string => {
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
};

export const getSizeInHumanReadableFormat = (size: number): string =>
    formatScaled(size, ["B", "KB", "MB", "GB", "TB"], 0);

const getSpeedInHumanReadableFormat = (bytesPerSecond: number): string =>
    formatScaled(bytesPerSecond, ["B/s", "KB/s", "MB/s", "GB/s"], 1);

export const getTimeInHumanReadableFormat = (date: Date): string =>
    [date.getHours(), date.getMinutes(), date.getSeconds()]
        .map(part => String(part).padStart(2, "0"))
        .join(":");

/** Size of `text` in bytes once encoded as UTF-8, as it travels to the peer. */
export const textBytes = (text: string): number =>
    new TextEncoder().encode(text).length;

/** Line count and size of a text message, such as "3 Zeilen · 1 KB". */
export const getTextSummary = (
    text: string,
    t: TFunction<"dashboard">
): string =>
    `${t("lines", { count: text.split("\n").length })} · ${getSizeInHumanReadableFormat(textBytes(text))}`;

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
