import css from "./DataSharingPage.module.scss";
import { useRef, useState } from "react";
import dragdropicon from "../../assets/dragdropicon.svg";
import { useNavigate } from "react-router";

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

const mockData: FileDisplay[] = [
    {
        name: "Datei01-final.png",
        direction: FileDirection.DOWN,
        progress: 0.01,
        size: 200_000,
        time: new Date(),
    },
    {
        name: "Datei02.pdf",
        direction: FileDirection.DOWN,
        progress: 1,
        size: 147_000,
        time: new Date(),
    },
    {
        name: "File-XYZ.txt",
        direction: FileDirection.UP,
        progress: 0.7,
        size: 30,
        time: new Date(),
    },
    {
        name: "super_log_filename_12345678901234567890_a\
            bcdefghijklmnopqrstuvwxyzilename_12345678901\
            234567890_abcdefghijklmnopqrstuvwxyz.txt",
        direction: FileDirection.UP,
        progress: 0.7,
        size: 30,
        time: new Date(),
    },
];

export function DataSharingPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const [files, setFiles] = useState<FileDisplay[]>(mockData);

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

    const getPartnerName = () => {
        return "7 0 K 3 N";
    };

    const onAddFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;

        if (!files) {
            return;
        }

        const newFiles: FileDisplay[] = [];
        for (const file of event.target.files!) {
            newFiles.push({
                name: file.name,
                direction: FileDirection.UP,
                progress: 0,
                size: file.size,
                time: new Date(),
            });
        }

        setFiles(prevFiles => [...prevFiles, ...newFiles]);
        // TODO: Implement file upload logic here

        // Reset input to allow re-adding the same file
        if (event.target) {
            event.target.value = "";
        }
    };

    const onDisconnect = () => {
        void navigate("/"); // Redirect to home page
        throw new Error("Cleanup not implemented yet");
    };

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
                        Partner: {getPartnerName()}
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
                                Fortschritt
                            </th>
                            <th className={css.fileTableHeaderCell}>Größe</th>
                            <th className={css.fileTableHeaderCell}>
                                Zeitstempel
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((file, index) => (
                            <tr key={index}>
                                <td
                                    className={`${css.fileTableCell} ${css.longColumn}`}
                                >
                                    {file.name}
                                </td>
                                <td
                                    className={`${css.fileTableCell} ${css.smallColumn}`}
                                >
                                    {file.direction === FileDirection.DOWN
                                        ? "↓"
                                        : "↑"}
                                    {file.progress === 1 ? (
                                        <span
                                            className={css.progressStatusText}
                                        >
                                            Fertig!
                                        </span>
                                    ) : (
                                        <progress
                                            className={css.fileProgress}
                                            value={file.progress}
                                            max={1}
                                        />
                                    )}
                                </td>
                                <td
                                    className={`${css.fileTableCell} ${css.smallColumn}`}
                                >
                                    {getSizeInHumanReadableFormat(file.size)}
                                </td>
                                <td
                                    className={`${css.fileTableCell} ${css.smallColumn}`}
                                >
                                    {getTimeInHumanReadableFormat(file.time)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className={css.dropAreaTextContainer}>
                    <img
                        src={dragdropicon}
                        alt="Drag and drop icon"
                        className={css.dropAreaIcon}
                    />
                    <p className={css.dropAreaMessage}>Drag and Drop</p>
                </div>
            </div>
        </div>
    );
}
