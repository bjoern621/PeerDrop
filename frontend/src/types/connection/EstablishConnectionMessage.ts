import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

export class EstablishConnectionMessage implements ITypedMessage {
    public readonly type = MessageType.ESTABLISH_CONNECTION;
    public msg: {
        remoteToken: string;
        /** Carries short-lived TURN credentials minted for this connection. */
        iceServers: RTCIceServer[];
        /** Both clients are signed in to the same account. */
        ownDevice: boolean;
    };

    public constructor(msg: {
        remoteToken: string;
        iceServers: RTCIceServer[];
        ownDevice: boolean;
    }) {
        this.msg = msg;
    }
}
