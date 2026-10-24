import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class PublicKeyMessage implements ITypedMessage {
    public readonly type = MessageType.PUBLIC_KEY;
    public msg: {
        /** Base64 of the raw uncompressed P-256 public key. */
        key: string;
    };

    public constructor(msg: { key: string }) {
        this.msg = msg;
    }
}
