import errorAsValue from "../util/ErrorAsValue";
import { CPU_PRESSURE_SAMPLE_INTERVAL_MS } from "../util/Constants";

/**
 * Load of the device's CPU as the Compute Pressure API reports it, from idle
 * to overloaded (https://www.w3.org/TR/compute-pressure/#pressure-states).
 */
export const CPU_PRESSURES = [
    "nominal",
    "fair",
    "serious",
    "critical",
] as const;
export type CpuPressure = (typeof CPU_PRESSURES)[number];

// The Compute Pressure API is not part of the TypeScript DOM lib.
interface PressureRecord {
    state: CpuPressure;
}
interface PressureObserver {
    observe(source: "cpu", options: { sampleInterval: number }): Promise<void>;
    disconnect(): void;
}
type PressureObserverConstructor = new (
    callback: (records: PressureRecord[]) => void
) => PressureObserver;

const PressureObserverClass = (
    globalThis as { PressureObserver?: PressureObserverConstructor }
).PressureObserver;

let pressure: CpuPressure | null = null;
let observer: PressureObserver | null = null;
const listeners = new Set<() => void>();

/** Returns false in browsers without the Compute Pressure API, such as Firefox and Safari. */
export function isCpuPressureSupported(): boolean {
    return PressureObserverClass !== undefined;
}

/** Latest CPU load. Null without a subscriber, without support or before the first report. */
export function getCpuPressure(): CpuPressure | null {
    return pressure;
}

/**
 * Observes the CPU load while at least one listener is subscribed. The
 * listener runs on every change.
 */
export function subscribeToCpuPressure(listener: () => void): () => void {
    listeners.add(listener);
    if (listeners.size === 1) {
        void startObserving();
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
            stopObserving();
        }
    };
}

async function startObserving() {
    if (!PressureObserverClass || observer) {
        return;
    }
    const started = new PressureObserverClass(records => {
        const latest = records.at(-1);
        if (latest && latest.state !== pressure) {
            pressure = latest.state;
            listeners.forEach(notify => notify());
        }
    });
    observer = started;

    // Refused in a frame without the compute-pressure permission policy.
    const [, err] = await errorAsValue(
        started.observe("cpu", {
            sampleInterval: CPU_PRESSURE_SAMPLE_INTERVAL_MS,
        })
    );
    if (err && observer === started) {
        stopObserving();
    }
}

function stopObserving() {
    observer?.disconnect();
    observer = null;
    pressure = null;
}
