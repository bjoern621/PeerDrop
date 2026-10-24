import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class TokenStatusMessage implements ITypedMessage {
    public readonly type = MessageType.TOKEN_STATUS;
    public msg: {
        token: string;
        deviceUuid: string | null;
        online: boolean;
        publicKey: string | null;
        ownDevice: boolean;
        /** Set while the unknown-token budget is locked. */
        retryAfterMs: number | null;
    };

    public constructor(msg: {
        token: string;
        deviceUuid: string | null;
        online: boolean;
        publicKey: string | null;
        ownDevice: boolean;
        retryAfterMs: number | null;
    }) {
        this.msg = msg;
    }
}
