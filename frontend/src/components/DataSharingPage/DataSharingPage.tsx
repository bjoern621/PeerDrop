import css from "./DataSharingPage.module.scss";
import { useRef, useState } from "react";
import dragdropicon from "../../assets/dragdropicon.svg";

enum FileDirection {
    UP = 'up',
    DOWN = 'down',
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
        name: 'Datei01-final.png',
        direction: FileDirection.DOWN,
        progress: 0.01,
        size: 200_000,
        time: new Date(),
    },
    {
        name: 'Datei02.pdf',
        direction: FileDirection.DOWN,
        progress: 1,
        size: 147_000,
        time: new Date(),
    },
    {
        name: 'File-XYZ.txt',
        direction: FileDirection.UP,
        progress: 0.7,
        size: 30,
        time: new Date(),
    },
    {
        name: 'super_log_filename_12345678901234567890_abcdefghijklmnopqrstuvwxyzilename_12345678901234567890_abcdefghijklmnopqrstuvwxyz.txt',
        direction: FileDirection.UP,
        progress: 0.7,
        size: 30,
        time: new Date(),
    },
];

export function DataSharingPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [files, setFiles] = useState<FileDisplay[]>(mockData);

    function getSizeInHumanReadableFormat(size: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(0)} ${units[unitIndex]}`;
    }

    function getTimeInHumanReadableFormat(date: Date): string {
        return ("0" + date.getHours()).slice(-2) + ':' +
            ("0" + date.getMinutes()).slice(-2) + ':' +
            ("0" + date.getSeconds()).slice(-2);
    }

    const getPartnerName = () => {
        return '7 0 K 3 N';
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

        setFiles((prevFiles) => [...prevFiles, ...newFiles]);
        // TODO: Implement file upload logic here

        // Reset input to allow re-adding the same file
        if (event.target) {
            event.target.value = '';
        }
    };

    const onDisconnect = () => {
        throw new Error('Disconnect not implemented');
    };

    return (
        <div className={css.container}>
            <div className={css.header}>
                <div className={css.left}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        onChange={onAddFile}
                        hidden={true}
                        style={{ display: 'none' }}
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()}>Datei hinzufügen</button>
                    <p>Partner: {getPartnerName()}</p>
                </div>
                <button type="button" onClick={onDisconnect}>Verbindung trennen</button>
            </div>
            <div
                onDrop={(e) => {
                    e.preventDefault();
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        onAddFile({ target: { files } } as React.ChangeEvent<HTMLInputElement>);
                    }
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                }}
                className={css.dropArea}
            >
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Fortschritt</th>
                            <th>Größe</th>
                            <th>Zeitstempel</th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((file, index) => (
                            <tr key={index}>
                                <td className={css.longColumn}>{file.name}</td>
                                <td className={css.smallColumn}>
                                    {file.direction === FileDirection.DOWN ? '↓' : '↑'}
                                    {file.progress === 1 ? (
                                        <span>Fertig!</span>
                                    ) : (
                                        <progress value={file.progress} max={1} />
                                    )}
                                </td>
                                <td className={css.smallColumn}>{getSizeInHumanReadableFormat(file.size)}</td>
                                <td className={css.smallColumn}>{getTimeInHumanReadableFormat(file.time)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className={css.dropAreaText}>
                    <img src={dragdropicon} alt="Drag and drop icon" />
                    <p>Drag and Drop</p>
                </div>
            </div>
        </div>
    );
}