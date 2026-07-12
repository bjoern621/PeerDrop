import Button from "../Button/Button";
import css from "./Sharing.module.scss";
import CodeFileIcon from "../../assets/filesystem/icons8-code-file.svg?react";
import ImageFileIcon from "../../assets/filesystem/icons8-image-file.svg?react";
import ZipFileIcon from "../../assets/filesystem/icons8-zip.svg?react";
import FolderIcon from "../../assets/filesystem/icons8-folder.svg?react";
import FolderOpenIcon from "../../assets/filesystem/icons8-folder-2.svg?react";
import { useDeviceHeartbeat } from "../../hooks/useDeviceHeartbeat";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { useMemo, useRef } from "react";
import RemoteTokenDisplay from "../RemoteTokenDisplay/RemoteTokenDisplay";
import FileRow from "./FileRow/FileRow";
import FolderRow from "./FolderRow/FolderRow";
import DragDropOverlay from "./DragDropOverlay/DragDropOverlay";
import useFileTransfer from "../../hooks/useFileTransfer";
import useConnectionLifecycle from "../../hooks/useConnectionLifecycle";
import { groupTransfers } from "./groupTransfers";

export default function Sharing() {
    useDeviceHeartbeat({ status: DeviceStatus.BUSY });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const { transfers, handleFileInputChange, sendSelection } =
        useFileTransfer();
    const { closeConnection } = useConnectionLifecycle();

    const transferItems = useMemo(() => groupTransfers(transfers), [transfers]);

    return (
        <div className={css.sharingContainer}>
            <div className={css.sharingHeader}>
                <div className={css.uploadButtons}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        onChange={handleFileInputChange}
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
                        Dateien hinzufügen
                    </Button>
                    <input
                        type="file"
                        ref={folderInputRef}
                        // @ts-expect-error - webkitdirectory is not in the types but is widely supported
                        webkitdirectory=""
                        directory=""
                        multiple
                        onChange={handleFileInputChange}
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
                        Ordner hinzufügen
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
                onItemsDropped={sendSelection}
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
                        {transferItems.map(item =>
                            item.kind === "folder" ? (
                                <FolderRow
                                    key={item.folderId}
                                    folder={item}
                                    folderId={item.folderId}
                                />
                            ) : (
                                <FileRow
                                    key={item.transfer.uuid}
                                    transfer={item.transfer}
                                />
                            )
                        )}
                    </tbody>
                </table>
            </DragDropOverlay>
        </div>
    );
}
