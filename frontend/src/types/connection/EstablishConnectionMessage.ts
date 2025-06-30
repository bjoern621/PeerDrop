import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class EstablishConnectionMessage implements ITypedMessage {
    public readonly type = MessageType.ESTABLISH_CONNECTION;
    public msg: {
        remoteToken: string;
    };

    public constructor(msg: { remoteToken: string }) {
        this.msg = msg;
    }
}
