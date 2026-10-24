import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class IncomingTextMessage implements ITypedMessage {
    public readonly type = MessageType.TEXT;
    public msg: {
        from: string;
        fromKey: string | null;
        iv: string;
        ciphertext: string;
    };

    public constructor(msg: {
        from: string;
        fromKey: string | null;
        iv: string;
        ciphertext: string;
    }) {
        this.msg = msg;
    }
}
