import { DeviceStatus } from "./DeviceStatus";

export type DeviceHeartbeatMessage = {
    uuid: string; // The device UUID
    status: DeviceStatus;
};
