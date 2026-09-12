import { useSyncExternalStore } from "react";
import { usePeerConnectionManager } from "../context/connection/PeerConnectionContext";
import { TransferSnapshot } from "../services/TransferTracker";
import { ShareSelection, SharedFolder } from "../types/transfer/ShareSelection";

/**
 * Custom hook for managing file transfers between peers.
 *
 * Exposes the transfer snapshots from the TransferTracker (the single source
 * of truth for progress, speed and status) and functions to send files and
 * folders.
 */
export default function useFileTransfer() {
    const peerConnectionManager = usePeerConnectionManager();
    const transferTracker = peerConnectionManager.getTransferTracker();

    const transfers: TransferSnapshot[] = useSyncExternalStore(
        listener => transferTracker.subscribe(listener),
        () => transferTracker.getSnapshot()
    );

    /**
     * Handles change events of both the file and the folder input.
     * Files picked via the folder input carry a webkitRelativePath and are
     * grouped into folder transfers; plain files are sent individually.
     * Resets the input to allow re-selecting the same file.
     *
     * @param {React.ChangeEvent<HTMLInputElement>} event - The input change event
     */
    const handleFileInputChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const filesList = event.target.files;
        if (!filesList) return;

        sendFiles(filesList);

        // Reset input to allow re-adding the same file
        if (event.target) {
            event.target.value = "";
        }
    };

    /**
     * Sends multiple files to the connected peer. Files with a
     * webkitRelativePath (folder picker) are grouped by their top-level
     * folder and sent as folder transfers; all other files are sent
     * individually.
     *
     * @param {FileList | File[]} filesList - The list of files to send
     */
    const sendFiles = (filesList: FileList | File[]) => {
        const files: File[] = [];
        const folders = new Map<string, SharedFolder>();

        for (const file of filesList) {
            const relativePath = file.webkitRelativePath;
            if (!relativePath) {
                files.push(file);
                continue;
            }

            const folderName = relativePath.split("/")[0];
            let folder = folders.get(folderName);
            if (!folder) {
                folder = { name: folderName, files: [] };
                folders.set(folderName, folder);
            }
            folder.files.push({ file, relativePath });
        }

        sendSelection({ files, folders: Array.from(folders.values()) });
    };

    /**
     * Sends a selection of loose files and whole folders (e.g. from drag
     * and drop) to the connected peer.
     */
    const sendSelection = (selection: ShareSelection) => {
        selection.files.forEach(sendSingleFile);
        selection.folders.forEach(sendFolder);
    };

    const sendSingleFile = (file: File) => {
        const uuid = crypto.randomUUID();

        // Useful for development/testing without connection
        if (!peerConnectionManager.getConnection()) {
            transferTracker.start(uuid, {
                name: file.name,
                size: file.size,
                direction: "up",
            });
            return;
        }

        peerConnectionManager.sendFile(file, uuid);
    };

    /**
     * Sends all files of a folder. A shared folder ID ties the individual
     * file transfers together so both peers can show the folder as one
     * grouped entry.
     */
    const sendFolder = (folder: SharedFolder) => {
        const folderId = crypto.randomUUID();

        for (const { file, relativePath } of folder.files) {
            const uuid = crypto.randomUUID();

            // Useful for development/testing without connection
            if (!peerConnectionManager.getConnection()) {
                transferTracker.start(uuid, {
                    name: file.name,
                    size: file.size,
                    direction: "up",
                    folderId,
                    relativePath,
                });
                continue;
            }

            peerConnectionManager.sendFile(file, uuid, {
                folderId,
                relativePath,
            });
        }
    };

    return {
        transfers,
        handleFileInputChange,
        sendFiles,
        sendSelection,
    };
}
