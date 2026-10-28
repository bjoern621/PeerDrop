import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

/** First message of every connection. Asks the server for a token. */
export class HelloMessage implements ITypedMessage {
    public readonly type = MessageType.HELLO;
    public msg: {
        requestedToken: string | null;
        /** Takes the requested token from an earlier connection that still holds it. */
        reclaimKey: string | null;
    };

    public constructor(msg: {
        requestedToken: string | null;
        reclaimKey: string | null;
    }) {
        this.msg = msg;
    }
}
