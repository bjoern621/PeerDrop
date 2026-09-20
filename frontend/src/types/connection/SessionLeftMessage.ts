import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

/**
 * Tells the server that this client left the transfer screen, so other devices
 * stop seeing it as busy. Sent after a close by the peer, where the screen
 * outlives the connection. Carries no payload.
 */
export class SessionLeftMessage implements ITypedMessage {
    public readonly type = MessageType.SESSION_LEFT;
    public msg: Record<string, never> = {};
}
