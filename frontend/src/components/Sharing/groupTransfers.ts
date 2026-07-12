import { TransferSnapshot } from "../../services/TransferTracker";

export interface FileTransferItem {
    kind: "file";
    transfer: TransferSnapshot;
}

export interface FolderTransferItem {
    kind: "folder";
    folderId: string;
    name: string;
    files: TransferSnapshot[];
}

export type TransferListItem = FileTransferItem | FolderTransferItem;

/**
 * Groups transfer snapshots for the sharing table: files that share a
 * folderId become one folder item, everything else stays an individual file
 * item. Order follows the first appearance of each item.
 */
export function groupTransfers(
    transfers: TransferSnapshot[]
): TransferListItem[] {
    const items: TransferListItem[] = [];
    const folderItems = new Map<string, FolderTransferItem>();

    for (const transfer of transfers) {
        if (!transfer.folderId) {
            items.push({ kind: "file", transfer });
            continue;
        }

        let folder = folderItems.get(transfer.folderId);
        if (!folder) {
            folder = {
                kind: "folder",
                folderId: transfer.folderId,
                name: transfer.folderName ?? transfer.name,
                files: [],
            };
            folderItems.set(transfer.folderId, folder);
            items.push(folder);
        }
        folder.files.push(transfer);
    }

    return items;
}
