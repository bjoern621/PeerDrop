import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class SuccessMessage implements ITypedMessage {
    public readonly type = MessageType.SUCCESS;
    public msg: {
        requestID: string;
        description: string;
    };

    public constructor(msg: { requestID: string; description: string }) {
        this.msg = msg;
    }
}
