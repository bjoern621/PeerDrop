import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class IceCandidateMessage implements ITypedMessage {
    public readonly type = MessageType.ICE_CANDIDATE;
    public msg: {
        remoteToken: string;
        iceCandidate: RTCIceCandidate;
        /** Peer connection between the two clients. Peers without lanes leave it out. */
        lane?: number;
    };

    public constructor(msg: {
        remoteToken: string;
        iceCandidate: RTCIceCandidate;
        lane?: number;
    }) {
        this.msg = msg;
    }
}
