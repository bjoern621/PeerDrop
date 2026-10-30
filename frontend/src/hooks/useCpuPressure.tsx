import { useSyncExternalStore } from "react";
import {
    CpuPressure,
    getCpuPressure,
    subscribeToCpuPressure,
} from "../services/CpuPressure";

/** CPU load of the device, observed while the component is mounted. */
export function useCpuPressure(): CpuPressure | null {
    return useSyncExternalStore(subscribeToCpuPressure, getCpuPressure);
}
