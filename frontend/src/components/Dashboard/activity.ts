import { TFunction } from "i18next";
import { OfferEntry, TextEntry } from "../../services/MessagingService";
import { TransferSnapshot } from "../../services/TransferTracker";
import {
    FileTransferItem,
    FolderTransferItem,
    groupTransfers,
} from "./groupTransfers";

export type SortKey = "name" | "progress" | "size" | "time";

export interface Sort {
    key: SortKey;
    direction: "asc" | "desc";
}

export const DEFAULT_SORT: Sort = { key: "time", direction: "desc" };

/** One top-level row of the transfer list: a text, an offer, a file or a folder. */
export type ActivityItem =
    | { kind: "text"; key: string; entry: TextEntry }
    | { kind: "offer"; key: string; entry: OfferEntry }
    | (FileTransferItem & { key: string })
    | (FolderTransferItem & { key: string });

/**
 * Merges texts, offers and transfers into one list in the given order. Ties
 * fall back to the newest first. Names compare by the rules of `locale`.
 */
export function buildActivity(
    texts: TextEntry[],
    offers: OfferEntry[],
    transfers: TransferSnapshot[],
    sort: Sort,
    t: TFunction<"dashboard">,
    locale: string
): ActivityItem[] {
    const items: ActivityItem[] = [
        ...texts.map(entry => ({
            kind: "text" as const,
            key: entry.id,
            entry,
        })),
        ...offers.map(entry => ({
            kind: "offer" as const,
            key: entry.offerId,
            entry,
        })),
        ...groupTransfers(transfers).map(item =>
            item.kind === "file"
                ? { ...item, key: item.transfer.uuid }
                : { ...item, key: item.folderId }
        ),
    ];

    const sign = sort.direction === "asc" ? 1 : -1;
    const compare = (a: ActivityItem, b: ActivityItem): number => {
        switch (sort.key) {
            case "name":
                return nameOf(a, t).localeCompare(nameOf(b, t), locale);
            case "size":
                return bytesOf(a) - bytesOf(b);
            case "progress":
                return progressRank(a) - progressRank(b);
            case "time":
                return timeOf(a) - timeOf(b);
        }
    };

    return items.sort((a, b) => sign * compare(a, b) || timeOf(b) - timeOf(a));
}

export function itemTransfers(item: ActivityItem): TransferSnapshot[] {
    if (item.kind === "file") return [item.transfer];
    if (item.kind === "folder") return item.transfers;
    return [];
}

/** Display name of an offer: its folder, its single file or a file count. */
export function offerName(
    entry: OfferEntry,
    t: TFunction<"dashboard">
): string {
    const { folderName, fileName, count } = entry.summary;
    if (folderName) return folderName;
    if (count === 1 && fileName) return fileName;
    return t("files", { count });
}

function nameOf(item: ActivityItem, t: TFunction<"dashboard">): string {
    switch (item.kind) {
        case "text":
            return item.entry.text;
        case "offer":
            return offerName(item.entry, t);
        case "file":
            return item.transfer.name;
        case "folder":
            return item.name;
    }
}

function bytesOf(item: ActivityItem): number {
    switch (item.kind) {
        case "text":
            return new Blob([item.entry.text]).size;
        case "offer":
            return item.entry.summary.bytes;
        default:
            return itemTransfers(item).reduce((sum, t) => sum + t.size, 0);
    }
}

function timeOf(item: ActivityItem): number {
    switch (item.kind) {
        case "text":
        case "offer":
            return item.entry.at.getTime();
        default:
            return Math.min(
                ...itemTransfers(item).map(t => t.startedAt.getTime())
            );
    }
}

/**
 * Open requests first, then waiting, running by progress, finished, and
 * declined, failed or canceled last.
 */
function progressRank(item: ActivityItem): number {
    switch (item.kind) {
        case "text":
            return item.entry.status === "failed" ? 4 : 3;
        case "offer":
            if (item.entry.status !== "waiting") return 4;
            return item.entry.direction === "down" ? 0 : 1;
        default: {
            const transfers = itemTransfers(item);
            if (transfers.every(t => t.status === "done")) return 3;
            if (
                transfers.some(
                    t => t.status === "failed" || t.status === "canceled"
                )
            ) {
                return 4;
            }
            const size = transfers.reduce((sum, t) => sum + t.size, 0);
            const done = transfers.reduce(
                (sum, t) => sum + t.bytesTransferred,
                0
            );
            return 2 + (size > 0 ? (done / size) * 0.9 : 0);
        }
    }
}
