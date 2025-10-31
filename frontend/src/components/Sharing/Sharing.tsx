import Button from "../Button/Button";
import css from "./Sharing.module.scss";
import FileIcon from "../../assets/icons8-file.svg?react";
import FolderIcon from "../../assets/icons8-folder.svg?react";
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
                    >
                        <FileIcon />
                        Datei teilen
                    </Button>
                    <Button
                        variant="outline"
                        color_scheme="primary"
                        alignment="vertical"
                    >
                        <FolderIcon />
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
