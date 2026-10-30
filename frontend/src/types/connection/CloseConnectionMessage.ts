import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class CloseConnectionMessage implements ITypedMessage {
    public readonly type = MessageType.CLOSE_CONNECTION;
    public msg: {
        remoteToken: string;
        /** Set by the server when the peer lost its server connection. The direct link may outlive it. */
        gone?: boolean;
    };

    public constructor(msg: { remoteToken: string }) {
        this.msg = msg;
    }
}
