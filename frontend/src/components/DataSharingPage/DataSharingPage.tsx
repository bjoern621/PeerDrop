import css from "./DataSharingPage.module.scss";
import { useEffect, useRef, useState } from "react";
import dragdropIcon from "../../assets/dragdropicon.svg";
import percentIcon from "../../assets/percent_icon.svg";
import barchartIcon from "../../assets/barchart_icon.svg";
import { useNavigate } from "react-router";
import { usePeerConnectionManager } from "../../context/PeerConnectionContext";
import { assert } from "../../util/Assert";

enum FileDirection {
    UP = "up",
    DOWN = "down",
}

interface FileDisplay {
    name: string;
    direction: FileDirection;
    progress: number;
    size: number;
    time: Date;
}

export function DataSharingPage() {
    const navigate = useNavigate();

    const peerConnectionManager = usePeerConnectionManager();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<Map<string, FileDisplay>>(new Map());
    const [partnerName, setPartnerName] = useState<string | null>(null);
    const [detailedProgress, setDetailedProgress] = useState(() => {
        const saved = localStorage.getItem("detailedProgress");
        return saved ? (JSON.parse(saved) as boolean) : false;
    });

    useEffect(() => {
        assert(
            peerConnectionManager,
            "PeerConnectionManager is not initialized."
        );
        if (
            !peerConnectionManager.getConnection() ||
            peerConnectionManager.getConnection()?.getPeerConnection()
                .connectionState !== "connected"
        ) {
            void navigate("/");
            return;
        } else {
            setPartnerName(peerConnectionManager.getRemoteToken());
        }

        // set up callback functions
        peerConnectionManager.setOnReceivedFileCallback(onReceivedFile);
        peerConnectionManager.setOnFileProgressCallback(onFileProgressUpdate);
    }, [peerConnectionManager, navigate]);

    function getSizeInHumanReadableFormat(size: number): string {
        const units = ["B", "KB", "MB", "GB", "TB"];
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(0)} ${units[unitIndex]}`;
    }

    function getTimeInHumanReadableFormat(date: Date): string {
        return (
            ("0" + date.getHours()).slice(-2) +
            ":" +
            ("0" + date.getMinutes()).slice(-2) +
            ":" +
            ("0" + date.getSeconds()).slice(-2)
        );
    }

    const onAddFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const filesList = event.target.files;
        if (!filesList) return;

        for (const file of filesList) {
            const uuid = crypto.randomUUID();
            const fileDisplay: FileDisplay = {
                name: file.name,
                direction: FileDirection.UP,
                progress: 0,
                size: file.size,
                time: new Date(),
            };

            setFiles(prevFiles => new Map(prevFiles.set(uuid, fileDisplay)));

            peerConnectionManager.sendFile(file, uuid);
            console.log("DATASHARINGPAGE: sendFile triggered with uuid:", uuid);
        }

        /*        const newFiles = new Map<string, FileDisplay>();
        const fileUuidPairs: Array<[File, string]> = [];

        for (const file of filesList) {
            const uuid = crypto.randomUUID();
            newFiles.set(uuid, {
                name: file.name,
                direction: FileDirection.UP,
                progress: 0,
                size: file.size,
                time: new Date(),
            });
            fileUuidPairs.push([file, uuid]);
            console.log("DATASHARINGPAGE: sendFile triggered with uuid:", uuid);
        }

        setFiles(prevFiles => {
            const merged = new Map(prevFiles);
            for (const [uuid, fileDisplay] of newFiles.entries()) {
                merged.set(uuid, fileDisplay);
            }
            return merged;
        });

        for (const [file, uuid] of fileUuidPairs) {
            peerConnectionManager.sendFile(file, uuid);
        }*/

        // Reset input to allow re-adding the same file
        if (event.target) {
            event.target.value = "";
        }
    };

    const onReceivedFile = (name: string, size: number, uuid: string) => {
        setFiles(
            prevFiles =>
                new Map(
                    prevFiles.set(uuid, {
                        name: name,
                        direction: FileDirection.DOWN,
                        progress: 0,
                        size: size,
                        time: new Date(),
                    })
                )
        );
    };

    const onDisconnect = () => {
        peerConnectionManager.closePeerConnection();
    };

    const onFileProgressUpdate = (uuid: string, progress: number) => {
        setFiles(prevFiles => {
            const newFiles = new Map(prevFiles);
            const file = newFiles.get(uuid);

            if (file) {
                file.progress = progress;
                newFiles.set(uuid, file);
            }

            return newFiles;
        });
    };

    const onToggleDetailedProgress = () => {
        setDetailedProgress(prev => {
            const newValue = !prev;
            localStorage.setItem("detailedProgress", JSON.stringify(newValue));
            return newValue;
        });
    };

    // need to convert Map to an array for rendering
    const fileRows = Array.from(files.entries()).map(([uuid, file]) => (
        <tr key={uuid}>
            <td className={`${css.fileTableCell} ${css.longColumn}`}>
                {file.name}
            </td>
            <td className={`${css.fileTableCell} ${css.smallColumn}`}>
                <div className={css.fileProgress}>
                    {file.direction === FileDirection.DOWN ? "↓" : "↑"}
                    {file.progress >= 1 ? (
                        <span className={css.progressStatusText}>Fertig!</span>
                    ) : detailedProgress ? (
                        <span className={css.progressStatusText}>
                            {getSizeInHumanReadableFormat(
                                file.progress * file.size
                            )}{" "}
                            {"(" + Math.round(file.progress * 100) + "%)"}
                        </span>
                    ) : (
                        <progress
                            className={css.progressBar}
                            value={file.progress}
                            max={1}
                        />
                    )}
                </div>
            </td>
            <td className={`${css.fileTableCell} ${css.smallColumn}`}>
                {getSizeInHumanReadableFormat(file.size)}
            </td>
            <td className={`${css.fileTableCell} ${css.smallColumn}`}>
                {getTimeInHumanReadableFormat(file.time)}
            </td>
        </tr>
    ));

    return (
        <div className={css.container}>
            <div className={css.header}>
                <div className={css.headerLeft}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        onChange={onAddFile}
                        hidden={true}
                        style={{ display: "none" }}
                    />
                    <button
                        type="button"
                        className={css.headerButton}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Datei hinzufügen
                    </button>
                    <p className={css.headerPartnerText}>
                        Partner: {partnerName ?? "Unbekannt"}
                    </p>
                </div>
                <button
                    type="button"
                    className={css.headerButton}
                    onClick={onDisconnect}
                >
                    Verbindung trennen
                </button>
            </div>
            <div
                onDrop={e => {
                    e.preventDefault();
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        onAddFile({
                            target: { files },
                        } as React.ChangeEvent<HTMLInputElement>);
                    }
                }}
                onDragOver={e => {
                    e.preventDefault();
                }}
                className={css.dropArea}
            >
                <table className={css.fileTable}>
                    <thead className={css.fileTableHeader}>
                        <tr>
                            <th className={css.fileTableHeaderCell}>Name</th>
                            <th className={css.fileTableHeaderCell}>
                                <div className={css.fileProgressHeaderCell}>
                                    Fortschritt
                                    <button
                                        onClick={onToggleDetailedProgress}
                                        className={css.detailProgressButton}
                                    >
                                        {detailedProgress ? (
                                            <img
                                                src={barchartIcon}
                                                alt="Simple view icon"
                                                className={
                                                    css.detailProgressIcon
                                                }
                                            />
                                        ) : (
                                            <img
                                                src={percentIcon}
                                                alt="Detailed view icon"
                                                className={
                                                    css.detailProgressIcon
                                                }
                                            />
                                        )}
                                    </button>
                                </div>
                            </th>
                            <th className={css.fileTableHeaderCell}>Größe</th>
                            <th className={css.fileTableHeaderCell}>
                                Zeitstempel
                            </th>
                        </tr>
                    </thead>
                    <tbody>{fileRows}</tbody>
                </table>
                <div className={css.dropAreaTextContainer}>
                    <img
                        src={dragdropIcon}
                        alt="Drag and drop icon"
                        className={css.dropAreaIcon}
                    />
                    <p className={css.dropAreaMessage}>Drag and Drop</p>
                </div>
            </div>
        </div>
    );
}
