import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class CloseConnectionMessage implements ITypedMessage {
    public readonly type = MessageType.CLOSE_CONNECTION;
    public msg: {
        requestID?: string;
        remoteToken: string;
    };

    public constructor(msg: { requestID?: string; remoteToken: string }) {
        this.msg = msg;
    }
}
