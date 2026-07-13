import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

/**
 * Requests the current LAN peer list from the server. The server answers with
 * a LanPeersMessage. Carries no payload.
 */
export class LanPeersRequestMessage implements ITypedMessage {
    public readonly type = MessageType.LAN_PEERS_REQUEST;
    public msg: Record<string, never> = {};
}
