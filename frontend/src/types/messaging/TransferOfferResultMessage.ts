import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class TransferOfferResultMessage implements ITypedMessage {
    public readonly type = MessageType.TRANSFER_OFFER_RESULT;
    public msg: {
        offerId: string;
        status: "delivered" | "unknown" | "rate-limited";
        retryAfterMs: number | null;
    };

    public constructor(msg: {
        offerId: string;
        status: "delivered" | "unknown" | "rate-limited";
        retryAfterMs: number | null;
    }) {
        this.msg = msg;
    }
}
