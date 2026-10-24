/**
 * Single source of truth for file transfer metrics.
 *
 * Senders and receivers report raw byte counts; the tracker derives progress,
 * transfer speed (sliding window) and remaining time, and notifies UI
 * subscribers. While at least one transfer is active, subscribers are
 * notified on a fixed interval so speed and remaining time keep updating
 * even when no new bytes arrive (a stalled transfer decays towards zero).
 */

export type TransferDirection = "up" | "down";

export type TransferStatus =
    /** Created, data channel not transferring yet. */
    | "waiting"
    /** Bytes are flowing. */
    | "active"
    /**
     * All bytes handed over. Receiver: file is being finalized (e.g. written
     * to disk). Sender: waiting for the receiver's acknowledgement.
     */
    | "finalizing"
    | "done"
    | "failed"
    /** Stopped on purpose by either side. */
    | "canceled";

/** Immutable view of one transfer, rebuilt on every notification. */
export interface TransferSnapshot {
    uuid: string;
    name: string;
    size: number;
    direction: TransferDirection;
    /** Token of the peer on the other end. */
    remoteToken: string;
    /** Groups files that belong to the same folder transfer. */
    folderId?: string;
    /** Folder display name, derived from the first segment of relativePath. */
    folderName?: string;
    /** Path within the shared folder, including the folder name. */
    relativePath?: string;
    startedAt: Date;
    bytesTransferred: number;
    /** 0..1 */
    progress: number;
    /** Bytes per second over the recent window; null until measurable. */
    speedBps: number | null;
    /** Estimated seconds until completion; null until measurable. */
    etaSeconds: number | null;
    status: TransferStatus;
}

interface TransferEntry {
    uuid: string;
    name: string;
    size: number;
    direction: TransferDirection;
    remoteToken: string;
    folderId?: string;
    relativePath?: string;
    startedAt: Date;
    bytesTransferred: number;
    status: TransferStatus;
    /** Sliding window of byte samples for the speed estimate. */
    samples: { time: number; bytes: number }[];
}

type EndedStatus = "done" | "failed" | "canceled";

/** A transfer that reached done, failed or canceled, handed once to each ended listener. */
export interface EndedTransfer {
    remoteToken: string;
    direction: TransferDirection;
    status: EndedStatus;
    bytesTransferred: number;
}

/** Samples older than this are dropped from the speed window. */
const SPEED_WINDOW_MS = 5000;
/** Minimum spacing between two stored byte samples. */
const SAMPLE_MIN_INTERVAL_MS = 100;
/** Notification cadence while transfers are running. */
const NOTIFY_INTERVAL_MS = 250;

export class TransferTracker {
    private readonly entries: Map<string, TransferEntry> = new Map();
    private readonly listeners: Set<() => void> = new Set();
    private readonly endedListeners: Set<(ended: EndedTransfer) => void> =
        new Set();
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private snapshotCache: TransferSnapshot[] = [];
    private snapshotDirty = true;

    public start(
        uuid: string,
        info: {
            name: string;
            size: number;
            direction: TransferDirection;
            remoteToken: string;
            folderId?: string;
            relativePath?: string;
            /** Keeps the original time when a failed transfer restarts. */
            startedAt?: Date;
        }
    ) {
        this.entries.set(uuid, {
            uuid,
            name: info.name,
            size: info.size,
            direction: info.direction,
            remoteToken: info.remoteToken,
            folderId: info.folderId,
            relativePath: info.relativePath,
            startedAt: info.startedAt ?? new Date(),
            bytesTransferred: 0,
            status: "waiting",
            samples: [],
        });
        this.notify();
        this.syncInterval();
    }

    /** Reports the total bytes transferred so far for a transfer. */
    public updateBytes(uuid: string, bytesTransferred: number) {
        const entry = this.entries.get(uuid);
        if (!entry) return;

        entry.bytesTransferred = bytesTransferred;
        if (entry.status === "waiting") {
            entry.status = "active";
            this.syncInterval();
        }

        const now = Date.now();
        const samples = entry.samples;
        const latest = samples[samples.length - 1];
        if (!latest || now - latest.time >= SAMPLE_MIN_INTERVAL_MS) {
            samples.push({ time: now, bytes: bytesTransferred });
            while (
                samples.length > 1 &&
                samples[0].time < now - SPEED_WINDOW_MS
            ) {
                samples.shift();
            }
        }
        // No notify: the running interval publishes byte updates.
        this.snapshotDirty = true;
    }

    public setStatus(uuid: string, status: TransferStatus) {
        const entry = this.entries.get(uuid);
        if (!entry || entry.status === status) return;
        // An ended transfer stays ended; a later report cannot revive it.
        if (isEnded(entry.status)) return;

        entry.status = status;
        // Both states follow the last byte, while the last sample can lag.
        if (status === "finalizing" || status === "done") {
            entry.bytesTransferred = entry.size;
        }
        this.notify();
        this.syncInterval();
        if (isEnded(status)) {
            this.notifyEnded(entry, status as EndedStatus);
        }
    }

    /** Marks every transfer with the peer still in flight as failed, e.g. when its connection closes. */
    public failUnfinished(remoteToken: string) {
        const failed: TransferEntry[] = [];
        for (const entry of this.entries.values()) {
            if (entry.remoteToken !== remoteToken || isEnded(entry.status)) {
                continue;
            }
            entry.status = "failed";
            failed.push(entry);
        }
        if (failed.length > 0) {
            this.notify();
            this.syncInterval();
            failed.forEach(entry => this.notifyEnded(entry, "failed"));
        }
    }

    public subscribeEnded(
        listener: (ended: EndedTransfer) => void
    ): () => void {
        this.endedListeners.add(listener);
        return () => {
            this.endedListeners.delete(listener);
        };
    }

    public get(uuid: string): TransferSnapshot | undefined {
        const entry = this.entries.get(uuid);
        return entry && this.buildSnapshot(entry);
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Returns the current snapshots. The returned array is referentially
     * stable between notifications, as required by useSyncExternalStore.
     */
    public getSnapshot(): TransferSnapshot[] {
        if (this.snapshotDirty) {
            this.snapshotCache = Array.from(this.entries.values()).map(entry =>
                this.buildSnapshot(entry)
            );
            this.snapshotDirty = false;
        }
        return this.snapshotCache;
    }

    private buildSnapshot(entry: TransferEntry): TransferSnapshot {
        const speedBps = this.computeSpeed(entry);
        const remainingBytes = Math.max(entry.size - entry.bytesTransferred, 0);

        return {
            uuid: entry.uuid,
            name: entry.name,
            size: entry.size,
            direction: entry.direction,
            remoteToken: entry.remoteToken,
            folderId: entry.folderId,
            folderName: entry.relativePath?.split("/")[0],
            relativePath: entry.relativePath,
            startedAt: entry.startedAt,
            bytesTransferred: entry.bytesTransferred,
            progress:
                entry.status === "done"
                    ? 1
                    : entry.size > 0
                      ? Math.min(entry.bytesTransferred / entry.size, 1)
                      : 0,
            speedBps,
            etaSeconds:
                speedBps !== null && speedBps > 0 && entry.status === "active"
                    ? remainingBytes / speedBps
                    : null,
            status: entry.status,
        };
    }

    /**
     * Speed over the sample window in bytes per second, measured against the
     * current time so a stalled transfer decays towards zero.
     */
    private computeSpeed(entry: TransferEntry): number | null {
        if (entry.status !== "active" && entry.status !== "finalizing") {
            return null;
        }
        const samples = entry.samples;
        if (samples.length < 2) {
            return null;
        }

        const oldest = samples[0];
        const elapsedSeconds = (Date.now() - oldest.time) / 1000;
        if (elapsedSeconds <= 0) {
            return null;
        }

        return (entry.bytesTransferred - oldest.bytes) / elapsedSeconds;
    }

    private notifyEnded(entry: TransferEntry, status: EndedTransfer["status"]) {
        const ended: EndedTransfer = {
            remoteToken: entry.remoteToken,
            direction: entry.direction,
            status,
            bytesTransferred: entry.bytesTransferred,
        };
        this.endedListeners.forEach(listener => listener(ended));
    }

    private notify() {
        this.snapshotDirty = true;
        this.listeners.forEach(listener => listener());
    }

    /** Runs the notification interval only while transfers are in flight. */
    private syncInterval() {
        const anyRunning = Array.from(this.entries.values()).some(
            entry => entry.status === "active" || entry.status === "finalizing"
        );

        if (anyRunning && this.intervalId === null) {
            this.intervalId = setInterval(() => {
                this.notify();
                this.syncInterval();
            }, NOTIFY_INTERVAL_MS);
        } else if (!anyRunning && this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

function isEnded(status: TransferStatus): boolean {
    return status === "done" || status === "failed" || status === "canceled";
}
