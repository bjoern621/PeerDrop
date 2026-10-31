import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

/**
 * Asks the other side of an offer to take it up again after a lost server
 * connection. A receiver answers it with one of its own, a sender by sending
 * the offer again.
 */
export class TransferOfferResumeMessage implements ITypedMessage {
    public readonly type = MessageType.TRANSFER_OFFER_RESUME;
    public msg: {
        offerId: string;
        to?: string;
        /** Set by the server when it forwards the request. */
        from?: string;
    };

    public constructor(msg: { offerId: string; to: string }) {
        this.msg = msg;
    }
}
