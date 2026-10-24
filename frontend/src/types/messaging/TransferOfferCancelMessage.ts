import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class TransferOfferCancelMessage implements ITypedMessage {
    public readonly type = MessageType.TRANSFER_OFFER_CANCEL;
    public msg: {
        offerId: string;
        /** Set by the server when it forwards the cancellation. */
        from?: string;
    };

    public constructor(msg: { offerId: string; from?: string }) {
        this.msg = msg;
    }
}
