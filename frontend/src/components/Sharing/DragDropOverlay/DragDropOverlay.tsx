import { useRef, useState } from "react";
import DragDropIcon from "../../../assets/illustrations/drag_and_drop.svg?react";
import css from "./DragDropOverlay.module.scss";
import {
    FolderFile,
    ShareSelection,
} from "../../../types/transfer/ShareSelection";

interface DragDropOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
    onItemsDropped: (selection: ShareSelection) => void;
    children: React.ReactNode;
}

/** Reads all entries of a directory; readEntries returns batches (100 in Chromium) until an empty one marks the end. */
const readAllEntries = async (
    directory: FileSystemDirectoryEntry
): Promise<FileSystemEntry[]> => {
    const reader = directory.createReader();
    const entries: FileSystemEntry[] = [];
    for (;;) {
        const batch = await new Promise<FileSystemEntry[]>(
            (resolve, reject) => {
                reader.readEntries(resolve, reject);
            }
        );
        if (batch.length === 0) break;
        entries.push(...batch);
    }
    return entries;
};

const entryToFile = (entry: FileSystemFileEntry): Promise<File> =>
    new Promise((resolve, reject) => {
        entry.file(resolve, reject);
    });

/** Collects all files below a directory entry; paths include the folder name. */
async function collectFolderFiles(
    directory: FileSystemDirectoryEntry,
    path: string,
    out: FolderFile[]
): Promise<void> {
    for (const entry of await readAllEntries(directory)) {
        if (entry.isDirectory) {
            await collectFolderFiles(
                entry as FileSystemDirectoryEntry,
                `${path}/${entry.name}`,
                out
            );
        } else if (entry.isFile) {
            out.push({
                file: await entryToFile(entry as FileSystemFileEntry),
                relativePath: `${path}/${entry.name}`,
            });
        }
    }
}

/**
 * Turns the DataTransfer of a drop event into a ShareSelection. Dropped
 * directories are traversed recursively via their filesystem entries.
 * Entry and file handles are taken synchronously before the first await
 * because the DataTransfer is only valid during the drop event.
 */
async function collectSelection(
    dataTransfer: DataTransfer
): Promise<ShareSelection> {
    const selection: ShareSelection = { files: [], folders: [] };

    const pending = Array.from(dataTransfer.items)
        .filter(item => item.kind === "file")
        .map(item => ({
            entry:
                typeof item.webkitGetAsEntry === "function"
                    ? item.webkitGetAsEntry()
                    : null,
            file: item.getAsFile(),
        }));

    if (pending.length === 0) {
        // Browsers without DataTransferItem entries only expose flat files.
        selection.files.push(...Array.from(dataTransfer.files));
        return selection;
    }

    for (const { entry, file } of pending) {
        if (entry?.isDirectory) {
            const files: FolderFile[] = [];
            await collectFolderFiles(
                entry as FileSystemDirectoryEntry,
                entry.name,
                files
            );
            if (files.length > 0) {
                selection.folders.push({ name: entry.name, files });
            }
        } else if (file) {
            selection.files.push(file);
        }
    }

    return selection;
}

export default function DragDropOverlay({
    onItemsDropped,
    children,
    className,
}: DragDropOverlayProps) {
    const [isDragging, setIsDragging] = useState(false);
    const dragCounterRef = useRef(0); // Counter for drag depth to handle nested element enter/leave events

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (dragCounterRef.current >= 1) {
            setIsDragging(true);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current <= 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragging(false);

        void collectSelection(e.dataTransfer)
            .then(selection => {
                if (
                    selection.files.length === 0 &&
                    selection.folders.length === 0
                ) {
                    return;
                }
                onItemsDropped(selection);
            })
            .catch((err: unknown) => {
                console.error("Failed to read dropped items:", err);
            });
    };

    return (
        <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`${css.dropAreaContainer} ${className || ""}`}
        >
            {children}

            <div
                className={`${css.dropArea} ${isDragging ? css.dropAreaActive : ""}`}
            >
                <div>
                    <DragDropIcon className={css.dragDropIcon} />
                    <p className={css.dropAreaMessage}>Drag and Drop</p>
                </div>
            </div>
        </div>
    );
}
