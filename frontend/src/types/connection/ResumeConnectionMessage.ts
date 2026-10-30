import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

/**
 * Asks the server to pair this client with the peer again, whose direct link
 * outlived a server connection. Arrives from the server when the peer asks.
 */
export class ResumeConnectionMessage implements ITypedMessage {
    public readonly type = MessageType.RESUME_CONNECTION;
    public msg: {
        remoteToken: string;
    };

    public constructor(msg: { remoteToken: string }) {
        this.msg = msg;
    }
}
