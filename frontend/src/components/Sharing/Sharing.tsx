import Button from "../Button/Button";
import css from "./Sharing.module.scss";
import FileIcon from "../../assets/icons8-file.svg?react";
import FolderIcon from "../../assets/icons8-folder.svg?react";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";

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
                        <td>Beispiel-Datei.txt</td>
                        <td>75%</td>
                        <td>1.2 MB</td>
                        <td>12:34 PM</td>
                    </tr>
                    <tr>
                        <td>Urlaubsfotos.zip</td>
                        <td>100%</td>
                        <td>250 MB</td>
                        <td>11:20 AM</td>
                    </tr>
                </tbody>
            </table>
        </>
    );
}
