import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class PeerConnectMessage implements ITypedMessage {
    public readonly type = MessageType.PEER_CONNECT;
    public msg: {
        to: string;
    };

    public constructor(msg: { to: string }) {
        this.msg = msg;
    }
}
