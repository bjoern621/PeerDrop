import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class OutgoingTextMessage implements ITypedMessage {
    public readonly type = MessageType.TEXT;
    public msg: {
        id: string;
        to: string;
        iv: string;
        ciphertext: string;
    };

    public constructor(msg: {
        id: string;
        to: string;
        iv: string;
        ciphertext: string;
    }) {
        this.msg = msg;
    }
}
