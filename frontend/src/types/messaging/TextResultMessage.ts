import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export type TextDeliveryStatus =
    | "delivered"
    | "undelivered"
    | "rate-limited"
    | "too-large"
    | "unknown";

export class TextResultMessage implements ITypedMessage {
    public readonly type = MessageType.TEXT_RESULT;
    public msg: {
        id: string;
        status: TextDeliveryStatus;
        retryAfterMs: number | null;
    };

    public constructor(msg: {
        id: string;
        status: TextDeliveryStatus;
        retryAfterMs: number | null;
    }) {
        this.msg = msg;
    }
}
