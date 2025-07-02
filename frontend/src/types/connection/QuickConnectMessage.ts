import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class QuickConnectMessage implements ITypedMessage {
    public readonly type = MessageType.QUICK_CONNECT;
    public msg: {
        deviceUuid: string;
    };

    public constructor(msg: { deviceUuid: string }) {
        this.msg = msg;
    }
}
