import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";
import { DeviceStatus } from "./DeviceStatus";

export class DeviceHeartbeatMessage implements ITypedMessage {
    public readonly type = MessageType.DEVICE_HEARTBEAT;
    public msg: {
        uuid: string; // The device UUID
        status: DeviceStatus;
    };

    public constructor(msg: { uuid: string; status: DeviceStatus }) {
        this.msg = msg;
    }
}
