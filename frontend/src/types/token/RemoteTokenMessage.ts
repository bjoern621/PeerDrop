import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class RemoteTokenMessage implements ITypedMessage {
    public readonly type = MessageType.REMOTE_TOKEN;
    public msg: {
        requestID?: string;
        remoteToken: string;
    };

    public constructor(msg: { requestID?: string; remoteToken: string }) {
        this.msg = msg;
    }
}
