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
        action: "added" | "removed";
        device: DeviceInfo;
    };

    public constructor(msg: {
        action: "added" | "removed";
        device: DeviceInfo;
    }) {
        this.msg = msg;
    }
}
