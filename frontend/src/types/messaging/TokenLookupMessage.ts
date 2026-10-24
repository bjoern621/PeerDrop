import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class TokenLookupMessage implements ITypedMessage {
    public readonly type = MessageType.TOKEN_LOOKUP;
    public msg: {
        token?: string;
        deviceUuid?: string;
    };

    public constructor(msg: { token?: string; deviceUuid?: string }) {
        this.msg = msg;
    }
}
