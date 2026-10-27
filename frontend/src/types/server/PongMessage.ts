import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class PongMessage implements ITypedMessage {
    public readonly type = MessageType.PONG;
    public msg: Record<string, never> = {};
}
