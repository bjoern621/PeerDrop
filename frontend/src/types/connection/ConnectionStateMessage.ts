import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

/**
 * Full snapshot of this client's connection-request state, pushed by the
 * server whenever the state changes. The UI renders from the latest snapshot.
 */
export class ConnectionStateMessage implements ITypedMessage {
    public readonly type = MessageType.CONNECTION_STATE;
    public msg: {
        outgoingRequestTarget: string | null;
        incomingRequesters: string[];
    };

    public constructor(msg: {
        outgoingRequestTarget: string | null;
        incomingRequesters: string[];
    }) {
        this.msg = msg;
    }
}
