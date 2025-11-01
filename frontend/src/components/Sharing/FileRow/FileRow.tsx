import StableText from "../../StableText/StableText";
import css from "./FileRow.module.scss";
import { FileDirection, FileDisplay } from "../types";
import DownloadIcon from "../../../assets/icons8-download.svg?react";
import UploadIcon from "../../../assets/icons8-upload.svg?react";

interface FileRowProps {
    file: FileDisplay;
}

const getSizeInHumanReadableFormat = (size: number): string => {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(0)} ${units[unitIndex]}`;
};

const getTimeInHumanReadableFormat = (date: Date): string => {
    return (
        ("0" + date.getHours()).slice(-2) +
        ":" +
        ("0" + date.getMinutes()).slice(-2) +
        ":" +
        ("0" + date.getSeconds()).slice(-2)
    );
};

export default function FileRow({ file }: FileRowProps) {
    return (
        <tr className={css.fileRow}>
            <td>
                <StableText
                    text={file.name}
                    fontWeight="var(--font-weight-medium)"
                />
            </td>
            <td className={css.progressCell}>
                {file.direction === FileDirection.UP ? (
                    <UploadIcon className={css.uploadIcon} />
                ) : (
                    <DownloadIcon className={css.downloadIcon} />
                )}

                {file.progress >= 1 ? (
                    <>
                        <div className={css.progressComplete}>Fertig!</div>
                        <button
                            className={`tooltip-on-hover ${css.retryDownload}`}
                        >
                            DOWNLOAD
                            <div className="tooltip top">
                                Klicken, um erneut herunterzuladen
                            </div>
                        </button>
                    </>
                ) : (
                    <div className={css.progressContainer}>
                        <div className={css.progressInfo}>
                            <span>{file.progress * 100} %</span>

                            <span>12 Sekunden</span>
                        </div>

                        <progress
                            className={css.progressBar}
                            value={file.progress}
                            max={1}
                        />
                    </div>
                )}
            </td>
            <td>
                <StableText
                    text={getSizeInHumanReadableFormat(file.size)}
                    fontWeight="var(--font-weight-medium)"
                />
            </td>
            <td>
                <StableText
                    text={getTimeInHumanReadableFormat(file.time)}
                    fontWeight="var(--font-weight-medium)"
                />
            </td>
        </tr>
    );
}
