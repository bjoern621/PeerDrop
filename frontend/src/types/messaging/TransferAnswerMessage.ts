import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class TransferAnswerMessage implements ITypedMessage {
    public readonly type = MessageType.TRANSFER_ANSWER;
    public msg: {
        offerId: string;
        accepted: boolean;
        /** Set by the server when it forwards the answer. */
        from?: string;
        /** The receiver left before answering. */
        gone?: boolean;
        /** Set by the server: the receiver lost its server connection and may take the offer up again. */
        mayReturn?: boolean;
    };

    public constructor(msg: {
        offerId: string;
        accepted: boolean;
        from?: string;
        gone?: boolean;
    }) {
        this.msg = msg;
    }
}
