import Button from "../Button/Button";
import css from "./Sharing.module.scss";
import CodeFileIcon from "../../assets/icons8-code-file.svg?react";
import ImageFileIcon from "../../assets/icons8-image-file.svg?react";
import ZipFileIcon from "../../assets/icons8-zip.svg?react";
import FolderIcon from "../../assets/icons8-folder.svg?react";
import FolderOpenIcon from "../../assets/icons8-folder-2.svg?react";
import { useDeviceHeartbeat } from "../../hooks/useDeviceHeartbeat";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { useEffect, useRef, useState } from "react";
import RemoteTokenDisplay from "../RemoteTokenDisplay/RemoteTokenDisplay";
import FileRow from "./FileRow/FileRow";
import { FileDirection, FileDisplay } from "./types";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import { useNavigate, useBeforeUnload, useBlocker } from "react-router";
import { toast } from "react-toastify/unstyled";
import { CloseInitiator } from "../../services/PeerConnectionManager";
import DragDropOverlay from "./DragDropOverlay/DragDropOverlay";

export default function Sharing() {
    useDeviceHeartbeat({ status: DeviceStatus.BUSY });
    const peerConnectionManager = usePeerConnectionManager();
    const navigate = useNavigate();

    const shouldBlock = () => {
        return peerConnectionManager.getConnection() !== undefined;
    };
    const blocker = useBlocker(shouldBlock);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<Map<string, FileDisplay>>(new Map());

    // Redirect to /connect on page load if there's no active connection (disabled for debug)
    useEffect(() => {
        if (import.meta.env.DEV) {
            // In development mode, skip the redirect
            return;
        }

        if (!peerConnectionManager.getConnection()) {
            void navigate("/connect");
        }
    }, []);

    // Block all navigation attempts
    useEffect(() => {
        if (blocker.state === "blocked") {
            toast.warning(
                "Navigation ist blockiert. Bitte trenne zuerst die Verbindung.",
                {
                    toastId: "navigation-blocked-toast",
                    updateId: "navigation-blocked-toast",
                }
            );
            blocker.reset();
        }
    }, [blocker]);

    // Close the peer connection when the tab is closed / refreshed
    useBeforeUnload(() => {
        peerConnectionManager.closePeerConnection();
    });

    // Navigate to /connect when the peer connection is closed
    useEffect(() => {
        const onConnectionClosed = (initiator: CloseInitiator) => {
            if (initiator === "local") {
                toast.success("Verbindung erfolgreich getrennt.");
            } else {
                toast.info("Die Verbindung wurde vom Peer getrennt.");
            }

            void navigate("/connect");
        };

        peerConnectionManager.subscribeToConnectionClosed(onConnectionClosed);

        return () => {
            peerConnectionManager.unsubscribeFromConnectionClosed(
                onConnectionClosed
            );
        };
    }, []);

    useEffect(() => {
        peerConnectionManager.setOnReceivedFileCallback(onReceivedFile);
    }, []);

    const addFilesForUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const filesList = event.target.files;
        if (!filesList) return;

        uploadFiles(filesList);

        // Reset input to allow re-adding the same file
        if (event.target) {
            event.target.value = "";
        }
    };

    const uploadFiles = (filesList: FileList) => {
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

    const onReceivedFile = (name: string, size: number, uuid: string) => {
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

    const closeConnection = () => {
        peerConnectionManager.closePeerConnection();
        // Will not navigate here, as the navigation is handled in the useEffect listening for connection closed events
    };

    return (
        <div className={css.sharingContainer}>
            <div className={css.sharingHeader}>
                <div className={css.uploadButtons}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        onChange={addFilesForUpload}
                        hidden={true}
                        style={{ display: "none" }}
                    />
                    <Button
                        variant="outline"
                        color_scheme="primary"
                        alignment="vertical"
                        className={css.fileButton}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className={css.fileIconContainer}>
                            <CodeFileIcon className={css.fileIcon1} />
                            <ImageFileIcon className={css.fileIcon2} />
                            <ZipFileIcon className={css.fileIcon3} />
                        </div>
                        Datei teilen
                    </Button>
                    <input
                        type="file"
                        ref={folderInputRef}
                        // @ts-expect-error - webkitdirectory is not in the types but is widely supported
                        webkitdirectory=""
                        directory=""
                        multiple
                        onChange={addFilesForUpload}
                        hidden={true}
                        style={{ display: "none" }}
                    />
                    <Button
                        variant="outline"
                        color_scheme="primary"
                        alignment="vertical"
                        className={css.folderButton}
                        onClick={() => folderInputRef.current?.click()}
                    >
                        <div className={css.folderIconContainer}>
                            <FolderIcon className={css.folderClosed} />
                            <FolderOpenIcon className={css.folderOpen} />
                        </div>
                        Ordner teilen
                    </Button>
                </div>

                <div className={css.informationTopRight}>
                    <p>
                        Aktuell verbunden mit:{" "}
                        <span className={css.remoteToken}>
                            <RemoteTokenDisplay />
                        </span>
                    </p>
                    <Button
                        color_scheme={"neutral"}
                        variant={"outline"}
                        onClick={() => void closeConnection()}
                    >
                        Verbindung trennen
                    </Button>
                </div>
            </div>

            <DragDropOverlay
                onFilesDropped={uploadFiles}
                className={css.dragDropOverlay}
            >
                <table className={css.table}>
                    <thead>
                        <tr>
                            <th>Dateiname</th>
                            <th>Fortschritt</th>
                            <th>Größe</th>
                            <th>Zeitstempel</th>
                        </tr>
                    </thead>

                    <tbody>
                        {Array.from(files.entries()).map(([uuid, file]) => (
                            <FileRow key={uuid} fileUUID={uuid} file={file} />
                        ))}
                    </tbody>
                </table>
            </DragDropOverlay>
        </div>
    );
}
