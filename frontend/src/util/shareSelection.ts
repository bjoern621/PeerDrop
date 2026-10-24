import {
    FolderFile,
    SharedFolder,
    ShareSelection,
} from "../types/transfer/ShareSelection";

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
export async function collectDroppedSelection(
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

/**
 * Turns the files of a file or folder input into a ShareSelection. Files
 * with a webkitRelativePath (folder picker) are grouped by their top-level
 * folder; all other files stay loose.
 */
export function selectionFromFileList(
    fileList: FileList | File[]
): ShareSelection {
    const files: File[] = [];
    const folders = new Map<string, SharedFolder>();

    for (const file of fileList) {
        const relativePath = file.webkitRelativePath;
        if (!relativePath) {
            files.push(file);
            continue;
        }

        const folderName = relativePath.split("/")[0];
        let folder = folders.get(folderName);
        if (!folder) {
            folder = { name: folderName, files: [] };
            folders.set(folderName, folder);
        }
        folder.files.push({ file, relativePath });
    }

    return { files, folders: Array.from(folders.values()) };
}
