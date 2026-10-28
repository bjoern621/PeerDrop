import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class ClientTokenMessage implements ITypedMessage {
    public readonly type = MessageType.CLIENT_TOKEN;
    public msg: {
        token: string;
        /** Lets a later connection take the token back, see HelloMessage. */
        reclaimKey: string;
    };

    public constructor(msg: { token: string; reclaimKey: string }) {
        this.msg = msg;
    }
}
