import Button from "../Button/Button";
import css from "./Sharing.module.scss";
import CodeFileIcon from "../../assets/icons8-code-file.svg?react";
import ImageFileIcon from "../../assets/icons8-image-file.svg?react";
import ZipFileIcon from "../../assets/icons8-zip.svg?react";
import FolderIcon from "../../assets/icons8-folder.svg?react";
import FolderOpenIcon from "../../assets/icons8-folder-2.svg?react";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import StableText from "../StableText/StableText";

export default function Sharing() {
    const peerConnectionManager = usePeerConnectionManager();

    const getRemoteTokenIfAvailable = () => {
        if (
            !peerConnectionManager.getConnection() ||
            peerConnectionManager.getConnection()?.getPeerConnection()
                .connectionState !== "connected"
        ) {
            return undefined;
        } else {
            return peerConnectionManager.getRemoteToken();
        }
    };

    return (
        <>
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
                            {getRemoteTokenIfAvailable() || "?????"}
                        </span>
                    </p>
                    <Button color_scheme={"neutral"} variant={"outline"}>
                        Verbindung trennen
                    </Button>
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
                    <tr>
                        <td>
                            <StableText
                                text="Beispiel-Datei.txt"
                                fontWeight="var(--font-weight-medium)"
                            />
                        </td>
                        <td>
                            <StableText
                                text="75%"
                                fontWeight="var(--font-weight-medium)"
                            />
                        </td>
                        <td>
                            <StableText
                                text="1.2 MB"
                                fontWeight="var(--font-weight-medium)"
                            />
                        </td>
                        <td>
                            <StableText
                                text="12:34 PM"
                                fontWeight="var(--font-weight-medium)"
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <StableText
                                text="Urlaubsfotos.zip"
                                fontWeight="var(--font-weight-medium)"
                            />
                        </td>
                        <td>
                            <StableText
                                text="100%"
                                fontWeight="var(--font-weight-medium)"
                            />
                        </td>
                        <td>
                            <StableText
                                text="250 MB"
                                fontWeight="var(--font-weight-medium)"
                            />
                        </td>
                        <td>
                            <StableText
                                text="11:20 AM"
                                fontWeight="var(--font-weight-medium)"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </>
    );
}
