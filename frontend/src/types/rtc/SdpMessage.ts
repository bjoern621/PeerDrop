import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class SdpMessage implements ITypedMessage {
    public readonly type = MessageType.SDP;
    public msg: {
        remoteToken: string;
        description: RTCSessionDescription;
    };

    public constructor(msg: {
        remoteToken: string;
        description: RTCSessionDescription;
    }) {
        this.msg = msg;
    }
}
