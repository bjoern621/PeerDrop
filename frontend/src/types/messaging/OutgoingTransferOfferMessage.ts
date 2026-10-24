import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class OutgoingTransferOfferMessage implements ITypedMessage {
    public readonly type = MessageType.TRANSFER_OFFER;
    public msg: {
        offerId: string;
        to: string;
        iv: string;
        ciphertext: string;
    };

    public constructor(msg: {
        offerId: string;
        to: string;
        iv: string;
        ciphertext: string;
    }) {
        this.msg = msg;
    }
}
