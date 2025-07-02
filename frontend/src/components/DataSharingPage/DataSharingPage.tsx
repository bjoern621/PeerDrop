import css from "./DataSharingPage.module.scss";
import { useCallback, useEffect, useRef, useState } from "react";
import dragdropIcon from "../../assets/drag_and_drop.svg";
import percentIcon from "../../assets/percent.svg";
import barChartIcon from "../../assets/bar_chart.svg";
import { useNavigate } from "react-router";
import { usePeerConnectionManager } from "../../context/PeerConnectionContext";
import { assert } from "../../util/Assert";
import { DeviceHeartbeatMessage } from "../../types/device/DeviceHeartbeatMessage";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { useWebSocketService } from "../../context/WebSocketContext";
import { HEARTBEAT_INTERVAL_MS } from "../../util/Constants";

enum FileDirection {
    UP = "up",
    DOWN = "down",
}

enum FileProgressDisplay {
    SIMPLE,
    DETAILED,
}

interface FileDisplay {
    name: string;
    direction: FileDirection;
    progress: number;
    size: number;
    time: Date;
}

export function DataSharingPage() {
    const fileProgressDisplayLocalStorageKey = "detailedProgress";
    const navigate = useNavigate();

    const peerConnectionManager = usePeerConnectionManager();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<Map<string, FileDisplay>>(new Map());
    const [partnerName, setPartnerName] = useState<string | null>(null);
    const [progressDisplay, setProgressDisplay] = useState(() => {
        const saved = localStorage.getItem(fileProgressDisplayLocalStorageKey);
        return saved
            ? (JSON.parse(saved) as FileProgressDisplay)
            : FileProgressDisplay.SIMPLE;
    });

    const websocketService = useWebSocketService();

    /**
     * Sends a heartbeat message if the user has registered the device.
     */
    const sendHeartbeatIfPossible = useCallback(() => {
        const deviceUuid: string | undefined = document.cookie
            .split("; ")
            .find(row => row.startsWith("deviceUuid="))
            ?.split("=")[1];

        if (!deviceUuid) {
            return; // The user might not have registered the device
        }

        const heartbeat = new DeviceHeartbeatMessage({
            uuid: deviceUuid,
            status: DeviceStatus.BUSY,
        });

        websocketService.sendMessage(heartbeat);
    }, [websocketService]);

    /**
     * Sends a heartbeat message every HEARTBEAT_INTERVAL_MS.
     */
    const sendContinuousHeartbeat = useCallback(() => {
        const timer = setInterval(() => {
            sendHeartbeatIfPossible();
        }, HEARTBEAT_INTERVAL_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [sendHeartbeatIfPossible]);

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

        const handleTabClose = () => {
            // Close the peer connection when the tab is closed
            peerConnectionManager.closePeerConnection();
            window.removeEventListener("beforeunload", handleTabClose);
        };

        window.addEventListener("beforeunload", handleTabClose);

        // set up callback functions
        peerConnectionManager.setOnReceivedFileCallback(onReceivedFile);
        peerConnectionManager.setOnFileProgressCallback(onFileProgressUpdate);

        sendHeartbeatIfPossible();

        sendContinuousHeartbeat();
    }, [
        peerConnectionManager,
        navigate,
        sendHeartbeatIfPossible,
        sendContinuousHeartbeat,
    ]);

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
        }

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
        setProgressDisplay(prev => {
            const newValue =
                prev === FileProgressDisplay.SIMPLE
                    ? FileProgressDisplay.DETAILED
                    : FileProgressDisplay.SIMPLE;
            localStorage.setItem(
                fileProgressDisplayLocalStorageKey,
                JSON.stringify(newValue)
            );
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
                    ) : progressDisplay ? (
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
                                        <div
                                            className={
                                                css.detailProgressIconContainer
                                            }
                                        >
                                            {progressDisplay ===
                                            FileProgressDisplay.DETAILED ? (
                                                <>
                                                    <img
                                                        src={percentIcon}
                                                        alt="Detailed view icon"
                                                        className={
                                                            css.detailProgressIcon
                                                        }
                                                    />
                                                    <span
                                                        className={
                                                            css.detailProgressTooltip
                                                        }
                                                    >
                                                        Zu einfacher Ansicht
                                                        wechseln
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <img
                                                        src={barChartIcon}
                                                        alt="Simple view icon"
                                                        className={
                                                            css.detailProgressIcon
                                                        }
                                                    />
                                                    <span
                                                        className={
                                                            css.detailProgressTooltip
                                                        }
                                                    >
                                                        Zu detaillierter Ansicht
                                                        wechseln
                                                    </span>
                                                </>
                                            )}
                                        </div>
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
