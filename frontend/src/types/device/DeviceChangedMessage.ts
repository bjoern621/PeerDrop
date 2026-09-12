import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";
import { DeviceStatus } from "./DeviceStatus";

export interface DeviceInfo {
    uuid: string;
    displayName: string;
    status: DeviceStatus;
}

export class DeviceChangedMessage implements ITypedMessage {
    public readonly type = MessageType.DEVICE_CHANGED;
    public msg: {
        action: "added" | "removed" | "renamed";
        deviceInfo: DeviceInfo;
    };

    public constructor(msg: {
        action: "added" | "removed" | "renamed";
        deviceInfo: DeviceInfo;
    }) {
        this.msg = msg;
    }
}
