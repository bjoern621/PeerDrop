/**
 * Response from backend when User fetches their devices
 * devices: List of devices that belong to the user.
 */
export interface DeviceResponse {
    message: string;
    devices: string[];
}
