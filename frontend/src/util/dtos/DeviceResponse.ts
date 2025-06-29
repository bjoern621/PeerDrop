/**
 * Response from backend when User fetches their devices
 * devices: List of devices that belong to the user.
 */

import { DeviceStatus } from "../../types/device/DeviceStatus";

export interface DeviceResponse {
    devices: {
        displayName: string;
        isCurrentDevice: boolean;
        uuid: string;
        status: DeviceStatus;
    }[];
}
