import StableText from "../../StableText/StableText";
import css from "./FileRow.module.scss";
import { FileDisplay } from "../types";

interface FileRowProps {
    file: FileDisplay;
}

export default function FileRow({ file }: FileRowProps) {
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

    return (
        <tr className={css.fileRow}>
            <td>
                <StableText
                    text={file.name}
                    fontWeight="var(--font-weight-medium)"
                />
            </td>
            <td>
                <StableText
                    text={`${file.progress * 100}%`}
                    fontWeight="var(--font-weight-medium)"
                />
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
