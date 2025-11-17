import { DeviceStatus } from "./DeviceStatus";

/**
 * Represents a device in the system with its current state
 */
export interface Device {
    uuid: string;
    name: string;
    status: DeviceStatus;
    current: boolean;
}
