import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class SdpMessage implements ITypedMessage {
    public readonly type = MessageType.SDP;
    public msg: {
        remoteToken: string;
        description: RTCSessionDescription;
        /** Peer connection between the two clients. Peers without lanes leave it out. */
        lane?: number;
    };

    public constructor(msg: {
        remoteToken: string;
        description: RTCSessionDescription;
        lane?: number;
    }) {
        this.msg = msg;
    }
}
