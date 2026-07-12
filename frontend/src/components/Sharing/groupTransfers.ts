import { TransferSnapshot } from "../../services/TransferTracker";

export interface FileTransferItem {
    kind: "file";
    transfer: TransferSnapshot;
}

/**
 * One folder level of a folder transfer. Subfolder nodes are derived from
 * the relativePath segments of the contained files.
 */
export interface FolderNode {
    /** Stable key: the folderId extended by the path of this level. */
    id: string;
    name: string;
    /** Every transfer in this folder's subtree, used for aggregation. */
    transfers: TransferSnapshot[];
    /** Files directly inside this folder level. */
    files: TransferSnapshot[];
    subfolders: FolderNode[];
}

export interface FolderTransferItem extends FolderNode {
    kind: "folder";
    folderId: string;
}

export type TransferListItem = FileTransferItem | FolderTransferItem;

/**
 * Groups transfer snapshots for the sharing table: files that share a
 * folderId become one folder item with subfolder nodes derived from their
 * relative paths, everything else stays an individual file item. Order
 * follows the first appearance of each item.
 */
export function groupTransfers(
    transfers: TransferSnapshot[]
): TransferListItem[] {
    const items: TransferListItem[] = [];
    const folderItems = new Map<string, FolderTransferItem>();
    const nodesById = new Map<string, FolderNode>();

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
                id: transfer.folderId,
                name: transfer.folderName ?? transfer.name,
                transfers: [],
                files: [],
                subfolders: [],
            };
            folderItems.set(transfer.folderId, folder);
            items.push(folder);
        }

        insertTransfer(folder, transfer, nodesById);
    }

    return items;
}

/**
 * Adds a transfer below its top-level folder. The relativePath segments
 * between the folder name and the file name become nested folder nodes.
 */
function insertTransfer(
    folder: FolderTransferItem,
    transfer: TransferSnapshot,
    nodesById: Map<string, FolderNode>
) {
    // First segment is the top-level folder, last segment the file name.
    const subfolderNames = transfer.relativePath?.split("/").slice(1, -1) ?? [];

    let node: FolderNode = folder;
    node.transfers.push(transfer);

    for (const name of subfolderNames) {
        const id = `${node.id}/${name}`;
        let child = nodesById.get(id);
        if (!child) {
            child = { id, name, transfers: [], files: [], subfolders: [] };
            nodesById.set(id, child);
            node.subfolders.push(child);
        }
        child.transfers.push(transfer);
        node = child;
    }

    node.files.push(transfer);
}
