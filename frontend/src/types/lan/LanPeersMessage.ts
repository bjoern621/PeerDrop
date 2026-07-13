import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";
import { LanPeer } from "./LanPeer";

export class LanPeersMessage implements ITypedMessage {
    public readonly type = MessageType.LAN_PEERS;
    public msg: {
        peers: LanPeer[];
    };

    public constructor(msg: { peers: LanPeer[] }) {
        this.msg = msg;
    }
}
