import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class PingMessage implements ITypedMessage {
    public readonly type = MessageType.PING;
    public msg: Record<string, never> = {};
}
