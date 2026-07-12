import { useSyncExternalStore } from "react";
import { usePeerConnectionManager } from "../context/connection/PeerConnectionContext";
import { TransferSnapshot } from "../services/TransferTracker";

/**
 * Custom hook for managing file transfers between peers.
 *
 * Exposes the transfer snapshots from the TransferTracker (the single source
 * of truth for progress, speed and status) and functions to send files.
 */
export default function useFileTransfer() {
    const peerConnectionManager = usePeerConnectionManager();
    const transferTracker = peerConnectionManager.getTransferTracker();

    const transfers: TransferSnapshot[] = useSyncExternalStore(
        listener => transferTracker.subscribe(listener),
        () => transferTracker.getSnapshot()
    );

    /**
     * Handles file input change events (e.g., from file picker dialogs).
     * Processes the selected files and initiates upload.
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
     * Sends multiple files to the connected peer.
     * Creates a unique UUID for each file; the transfer tracker picks the
     * transfer up as soon as sending starts.
     *
     * @param {FileList} filesList - The list of files to send
     */
    const sendFiles = (filesList: FileList) => {
        for (const file of filesList) {
            const uuid = crypto.randomUUID();

            // Useful for development/testing without connection
            if (!peerConnectionManager.getConnection()) {
                transferTracker.start(uuid, {
                    name: file.name,
                    size: file.size,
                    direction: "up",
                });
                continue;
            }

            peerConnectionManager.sendFile(file, uuid);
        }
    };

    return {
        transfers,
        handleFileInputChange,
        sendFiles,
    };
}
