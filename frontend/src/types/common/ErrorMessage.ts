import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class ErrorMessage implements ITypedMessage {
    public readonly type = MessageType.ERROR;
    public msg: {
        requestID: string;
        description: string;
        expected?: string;
        actual?: string;
    };

    public constructor(msg: {
        requestID: string;
        description: string;
        expected?: string;
        actual?: string;
    }) {
        this.msg = msg;
    }
}
