/**
 * Response from backend when User fetches their devices
 * devices: List of devices that belong to the user.
 */

interface DeviceLoginDto {
    displayName: string;
    isCurrentDevice: boolean;
}

export interface DeviceResponse {
    devices: DeviceLoginDto[];
}
