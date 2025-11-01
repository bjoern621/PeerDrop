import Button from "../Button/Button";
import css from "./Sharing.module.scss";
import CodeFileIcon from "../../assets/icons8-code-file.svg?react";
import ImageFileIcon from "../../assets/icons8-image-file.svg?react";
import ZipFileIcon from "../../assets/icons8-zip.svg?react";
import FolderIcon from "../../assets/icons8-folder.svg?react";
import FolderOpenIcon from "../../assets/icons8-folder-2.svg?react";
import DragDropIcon from "../../assets/drag_and_drop.svg?react";
import { useDeviceHeartbeat } from "../../hooks/useDeviceHeartbeat";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { useEffect, useState } from "react";
import RemoteTokenDisplay from "../RemoteTokenDisplay/RemoteTokenDisplay";
import FileRow from "./FileRow";
import { FileDirection, FileDisplay } from "./types";

export default function Sharing() {
    useDeviceHeartbeat({ status: DeviceStatus.BUSY });

    const [files, setFiles] = useState<Map<string, FileDisplay>>(new Map());

    useEffect(() => {
        // Dummy data for demonstration purposes
        const dummyFiles = new Map<string, FileDisplay>([
            [
                "1",
                {
                    name: "example_image.png",
                    direction: FileDirection.UP,
                    progress: 0.75,
                    size: 2048000,
                    time: new Date(),
                },
            ],
            [
                "2",
                {
                    name: "document.pdf",
                    direction: FileDirection.DOWN,
                    progress: 0.5,
                    size: 512000,
                    time: new Date(),
                },
            ],
            [
                "3",
                {
                    name: "archive.zip",
                    direction: FileDirection.UP,
                    progress: 1.0,
                    size: 10485760,
                    time: new Date(),
                },
            ],
        ]);
        setFiles(dummyFiles);
    }, []);

    return (
        <div className={css.sharingContainer}>
            <div className={css.sharingHeader}>
                <div className={css.uploadButtons}>
                    <Button
                        variant="outline"
                        color_scheme="primary"
                        alignment="vertical"
                        className={css.fileButton}
                    >
                        <div className={css.fileIconContainer}>
                            <CodeFileIcon className={css.fileIcon1} />
                            <ImageFileIcon className={css.fileIcon2} />
                            <ZipFileIcon className={css.fileIcon3} />
                        </div>
                        Datei teilen
                    </Button>
                    <Button
                        variant="outline"
                        color_scheme="primary"
                        alignment="vertical"
                        className={css.folderButton}
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
                    <Button color_scheme={"neutral"} variant={"outline"}>
                        Verbindung trennen
                    </Button>
                </div>
            </div>

            <div className={css.dropArea}>
                <div>
                    <DragDropIcon className={css.dragDropIcon} />
                    <p className={css.dropAreaMessage}>Drag and Drop</p>
                </div>
            </div>

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
                        <FileRow key={uuid} file={file} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
