import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class ConnectionRequestCancelledMessage implements ITypedMessage {
    public readonly type = MessageType.CONNECTION_REQUEST_CANCELLED;
    public msg: {
        remoteToken?: string;
    };

    public constructor(msg: { remoteToken?: string }) {
        this.msg = msg;
    }
}
