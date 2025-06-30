import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class ConnectionRequestMessage implements ITypedMessage {
    public readonly type = MessageType.CONNECTION_REQUEST;
    public msg: {
        remoteToken: string;
    };

    public constructor(msg: { remoteToken: string }) {
        this.msg = msg;
    }
}
