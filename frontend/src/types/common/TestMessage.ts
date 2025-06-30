import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class TestMessage implements ITypedMessage {
    public readonly type = MessageType.TEST;
    public msg: {
        message: string;
    };

    public constructor(msg: { message: string }) {
        this.msg = msg;
    }
}
