import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class ClientTokenMessage implements ITypedMessage {
    public readonly type = MessageType.CLIENT_TOKEN;
    public msg: {
        token: string;
    };

    public constructor(msg: { token: string }) {
        this.msg = msg;
    }
}
