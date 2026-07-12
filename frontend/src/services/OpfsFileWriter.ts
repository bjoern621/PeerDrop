/**
 * Writes an incoming file transfer to the origin private file system (OPFS)
 * instead of buffering it in memory. Chunks may arrive in any order; each
 * write targets an absolute position in the file.
 */

import errorAsValue from "../util/ErrorAsValue";

/** OPFS directory holding in-progress and completed transfer files. */
const TRANSFERS_DIRECTORY = "transfers";

export class OpfsFileWriter {
    private queue: Promise<void>;
    private writable: FileSystemWritableFileStream | null = null;
    private handle: FileSystemFileHandle | null = null;
    private error: unknown = null;

    public constructor(fileName: string) {
        this.queue = this.open(fileName).catch((err: unknown) => {
            this.error = err;
        });
    }

    public static isSupported(): boolean {
        return (
            typeof navigator !== "undefined" &&
            typeof navigator.storage?.getDirectory === "function" &&
            typeof FileSystemFileHandle !== "undefined" &&
            "createWritable" in FileSystemFileHandle.prototype
        );
    }

    /**
     * Removes all transfer files left behind by previous sessions.
     * Best effort; failures are ignored.
     */
    public static async cleanupStaleFiles(): Promise<void> {
        const [root] = await errorAsValue(navigator.storage.getDirectory());
        if (!root) {
            return;
        }
        // The directory may not exist or entries may be locked.
        await errorAsValue(
            root.removeEntry(TRANSFERS_DIRECTORY, { recursive: true })
        );
    }

    private async open(fileName: string) {
        const root = await navigator.storage.getDirectory();
        const directory = await root.getDirectoryHandle(TRANSFERS_DIRECTORY, {
            create: true,
        });
        this.handle = await directory.getFileHandle(fileName, {
            create: true,
        });
        this.writable = await this.handle.createWritable({
            keepExistingData: false,
        });
    }

    /** Queues a write of the given data at an absolute file position. */
    public write(position: number, data: ArrayBuffer) {
        this.queue = this.queue
            .then(async () => {
                if (this.error || !this.writable) return;
                await this.writable.write({ type: "write", position, data });
            })
            .catch((err: unknown) => {
                this.error ??= err;
            });
    }

    /**
     * Waits for all queued writes, closes the file and returns it as a
     * disk-backed File. Throws if opening or any write failed.
     */
    public async finish(): Promise<File> {
        await this.queue;
        if (this.error) {
            throw this.error instanceof Error
                ? this.error
                : new Error("OPFS write failed");
        }
        await this.writable!.close();
        return this.handle!.getFile();
    }

    /** Discards the file. Safe to call at any point. */
    public async abort(): Promise<void> {
        await this.queue;
        if (this.writable) {
            // The stream may already be closed or errored.
            await errorAsValue(this.writable.abort());
        }
    }
}
