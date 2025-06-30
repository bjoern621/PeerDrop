import { MessageType } from "./MessageType";

export interface ITypedMessage {
    readonly type: MessageType;
    msg: Record<string, unknown>;
}
