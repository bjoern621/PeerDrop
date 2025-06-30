import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class IceCandidateMessage implements ITypedMessage {
    public readonly type = MessageType.ICE_CANDIDATE;
    public msg: {
        remoteToken: string;
        iceCandidate: RTCIceCandidate;
    };

    public constructor(msg: {
        remoteToken: string;
        iceCandidate: RTCIceCandidate;
    }) {
        this.msg = msg;
    }
}
