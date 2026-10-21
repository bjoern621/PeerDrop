import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";
import { Route } from "./Route";

export class TransferReportMessage implements ITypedMessage {
    public readonly type = MessageType.TRANSFER_REPORT;
    public msg: {
        outcome: "completed" | "failed";
        /** Null when no candidate pair was selected. */
        route: Route | null;
        bytes: number;
    };

    public constructor(msg: {
        outcome: "completed" | "failed";
        route: Route | null;
        bytes: number;
    }) {
        this.msg = msg;
    }
}
