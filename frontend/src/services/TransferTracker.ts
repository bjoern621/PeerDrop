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
    /** All bytes arrived, file is being finalized (e.g. written to disk). */
    | "finalizing"
    | "done"
    | "failed";

/** Immutable view of one transfer, rebuilt on every notification. */
export interface TransferSnapshot {
    uuid: string;
    name: string;
    size: number;
    direction: TransferDirection;
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
    startedAt: Date;
    bytesTransferred: number;
    status: TransferStatus;
    /** Sliding window of byte samples for the speed estimate. */
    samples: { time: number; bytes: number }[];
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
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private snapshotCache: TransferSnapshot[] = [];
    private snapshotDirty = true;

    public start(
        uuid: string,
        info: { name: string; size: number; direction: TransferDirection }
    ) {
        this.entries.set(uuid, {
            uuid,
            name: info.name,
            size: info.size,
            direction: info.direction,
            startedAt: new Date(),
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

        entry.status = status;
        if (status === "done") {
            entry.bytesTransferred = entry.size;
        }
        this.notify();
        this.syncInterval();
    }

    /** Removes all transfers, e.g. when a new peer session starts. */
    public clear() {
        this.entries.clear();
        this.notify();
        this.syncInterval();
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
