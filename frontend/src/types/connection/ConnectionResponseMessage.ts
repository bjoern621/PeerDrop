import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class ConnectionResponseMessage implements ITypedMessage {
    public readonly type = MessageType.CONNECTION_RESPONSE;
    public msg: {
        accepted: boolean;
        remoteToken: string;
    };

    public constructor(msg: { accepted: boolean; remoteToken: string }) {
        this.msg = msg;
    }
}
