import errorAsValue from "../util/ErrorAsValue";
import { Logger } from "../util/Logger";

/** One received file, kept for saving after its transfer completed. */
export interface ReceivedFile {
    blob: Blob;
    filename: string;
    /** Path within the shared folder; absent for single files. */
    relativePath?: string;
    /** Groups files of the same folder transfer; absent for single files. */
    folderId?: string;
}

/**
 * Received files of the current peer session, kept for saving until the
 * session is left. Outlives the WebRTC connection, so the files stay saveable
 * after the peer closed the connection.
 */
export class ReceivedFiles {
    private readonly logger = new Logger("ReceivedFiles", false);
    private readonly log = (...args: unknown[]) => this.logger.log(...args);
    private readonly files: Map<string, ReceivedFile> = new Map();

    public add(uuid: string, file: ReceivedFile) {
        this.files.set(uuid, file);
    }

    /**
     * Saves a received file through the browser's download.
     * @param uuid The UUID of the file to save.
     * @returns true if the file was found and the download was triggered, false otherwise.
     */
    public save(uuid: string): boolean {
        const file = this.files.get(uuid);
        if (!file) {
            this.log("File not found for saving:", uuid);
            return false;
        }

        this.log("Saving file:", file.filename);
        triggerDownload(file.blob, file.filename);
        return true;
    }

    /**
     * Saves all completed files of a folder transfer.
     *
     * With the File System Access API (Chromium) the user picks a target
     * directory and the folder structure is recreated inside it. Without it
     * each file is downloaded individually via the regular download queue.
     *
     * @param folderId The folder ID of the transfer to save.
     * @returns true if saving was started, false when no completed files
     * exist for the folder or the user dismissed the directory picker.
     */
    public async saveFolder(folderId: string): Promise<boolean> {
        const entries = Array.from(this.files.values()).filter(
            entry => entry.folderId === folderId
        );
        if (entries.length === 0) {
            this.log("No completed files for folder:", folderId);
            return false;
        }

        if (!ReceivedFiles.isDirectoryPickerSupported()) {
            entries.forEach(entry =>
                triggerDownload(entry.blob, entry.filename)
            );
            return true;
        }

        const [directory, err] = await errorAsValue(
            window.showDirectoryPicker!({ mode: "readwrite" })
        );
        if (err) {
            // Usually the user closed the picker.
            this.log("Directory picker dismissed:", err);
            return false;
        }

        for (const entry of entries) {
            const [, writeErr] = await errorAsValue(
                writeFileToDirectory(
                    directory,
                    entry.relativePath ?? entry.filename,
                    entry.blob
                )
            );
            if (writeErr) {
                console.error(
                    "Failed to save file into directory:",
                    entry.relativePath ?? entry.filename,
                    writeErr
                );
                return false;
            }
        }
        return true;
    }

    /** Drops every held file, e.g. when the session is left. */
    public clear() {
        this.files.clear();
    }

    /** True when the browser exposes the File System Access directory picker. */
    public static isDirectoryPickerSupported(): boolean {
        return (
            typeof window !== "undefined" &&
            typeof window.showDirectoryPicker === "function"
        );
    }
}

/**
 * Writes a blob at the given slash-separated path below a directory,
 * creating intermediate subdirectories as needed.
 */
async function writeFileToDirectory(
    root: FileSystemDirectoryHandle,
    path: string,
    blob: Blob
): Promise<void> {
    const segments = path.split("/").filter(segment => segment.length > 0);
    const fileName = segments.pop()!;

    let directory = root;
    for (const segment of segments) {
        directory = await directory.getDirectoryHandle(segment, {
            create: true,
        });
    }

    const handle = await directory.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
}

/**
 * Triggers a download for a specific blob with the given filename.
 * Uses a queue system to prevent multiple simultaneous downloads.
 */
function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);

    downloadQueue.push(() => {
        a.click();
        // The browser needs a moment to pick the download up before the
        // link and URL go away.
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            downloadActive = false;
            processDownloadQueue();
        }, 200);
    });
    processDownloadQueue();
}

const downloadQueue: (() => void)[] = [];
let downloadActive = false;

function processDownloadQueue() {
    if (downloadActive || downloadQueue.length === 0) return;
    downloadActive = true;
    const nextDownload = downloadQueue.shift();
    if (nextDownload) nextDownload();
}
