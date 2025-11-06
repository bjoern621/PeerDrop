import { useEffect, useState } from "react";
import { usePeerConnectionManager } from "../context/connection/PeerConnectionContext";
import { FileDirection, FileDisplay } from "../components/Sharing/types";

/**
 * Custom hook for managing file transfers between peers.
 *
 * Handles:
 * - Uploading files to the connected peer
 * - Receiving files from the connected peer
 * - Tracking all file transfers (sent and received)
 */
export default function useFileTransfer() {
    const peerConnectionManager = usePeerConnectionManager();
    const [files, setFiles] = useState<Map<string, FileDisplay>>(new Map());

    useEffect(() => {
        peerConnectionManager.setOnReceivedFileCallback(handleReceivedFile);
    }, [peerConnectionManager]); // TODO: use Exhaustive Deps Exclude

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
     * Creates a unique UUID for each file and tracks it in the files map.
     * If no connection exists, still adds files to the display (useful for development/testing).
     *
     * @param {FileList} filesList - The list of files to send
     */
    const sendFiles = (filesList: FileList) => {
        for (const file of filesList) {
            const uuid = crypto.randomUUID();
            const fileDisplay: FileDisplay = {
                name: file.name,
                direction: FileDirection.UP,
                size: file.size,
                time: new Date(),
            };

            setFiles(prevFiles => new Map(prevFiles.set(uuid, fileDisplay)));

            // Useful for development/testing without connection
            if (!peerConnectionManager.getConnection()) {
                continue;
            }

            peerConnectionManager.sendFile(file, uuid);
        }
    };

    /**
     * Callback invoked when a file is received from the peer.
     * Adds the received file to the files map for display.
     *
     * @param {string} name - The name of the received file
     * @param {number} size - The size of the received file in bytes
     * @param {string} uuid - The unique identifier for this file transfer
     */
    const handleReceivedFile = (name: string, size: number, uuid: string) => {
        setFiles(
            prevFiles =>
                new Map(
                    prevFiles.set(uuid, {
                        name: name,
                        direction: FileDirection.DOWN,
                        size: size,
                        time: new Date(),
                    })
                )
        );
    };

    return {
        files,
        handleFileInputChange,
        sendFiles,
    };
}
