import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";
import { Route } from "./Route";

export class PeerConnectionReportMessage implements ITypedMessage {
    public readonly type = MessageType.PEER_CONNECTION_REPORT;
    public msg: {
        outcome: "connected" | "failed";
        /** Null when no candidate pair was selected. */
        route: Route | null;
        setupMs: number;
    };

    public constructor(msg: {
        outcome: "connected" | "failed";
        route: Route | null;
        setupMs: number;
    }) {
        this.msg = msg;
    }
}
