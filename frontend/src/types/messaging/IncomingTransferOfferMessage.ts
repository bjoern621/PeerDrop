import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class IncomingTransferOfferMessage implements ITypedMessage {
    public readonly type = MessageType.TRANSFER_OFFER;
    public msg: {
        offerId: string;
        from: string;
        fromKey: string | null;
        iv: string;
        ciphertext: string;
    };

    public constructor(msg: {
        offerId: string;
        from: string;
        fromKey: string | null;
        iv: string;
        ciphertext: string;
    }) {
        this.msg = msg;
    }
}
