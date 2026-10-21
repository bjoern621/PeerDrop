import errorAsValue from "../util/ErrorAsValue";
import { WebSocketService } from "./WebSocketService";
import { findSelectedCandidatePair, IceCandidateStats } from "./TransferStats";
import { Route } from "../types/telemetry/Route";
import { PeerConnectionReportMessage } from "../types/telemetry/PeerConnectionReportMessage";
import { TransferReportMessage } from "../types/telemetry/TransferReportMessage";

/**
 * Tells the server how a peer connection and its transfers went, for the
 * usage metrics. Reports carry outcome, route, duration and byte count;
 * never a token, file name or address.
 *
 * Exactly one of the two peers reports the connection, or the server would
 * count it twice. Each transfer is reported by its sender.
 */
export class UsageReporter {
    private readonly createdAt = performance.now();
    private connectionReported = false;
    private route: Route | null = null;

    public constructor(
        private readonly peerConnection: RTCPeerConnection,
        private readonly signaling: WebSocketService,
        private readonly reportsConnection: boolean
    ) {}

    public handleConnectionState(state: RTCPeerConnectionState) {
        if (state === "connected") {
            void this.reportConnected();
        } else if (state === "failed") {
            this.reportConnection("failed", performance.now());
        }
    }

    public reportTransfer(outcome: "completed" | "failed", bytes: number) {
        this.signaling.sendMessage(
            new TransferReportMessage({ outcome, route: this.route, bytes })
        );
    }

    private async reportConnected() {
        const connectedAt = performance.now();
        this.route = await readRoute(this.peerConnection);
        this.reportConnection("connected", connectedAt);
    }

    private reportConnection(
        outcome: "connected" | "failed",
        settledAt: number
    ) {
        if (!this.reportsConnection || this.connectionReported) {
            return;
        }
        this.connectionReported = true;

        this.signaling.sendMessage(
            new PeerConnectionReportMessage({
                outcome,
                route: this.route,
                setupMs: Math.round(settledAt - this.createdAt),
            })
        );
    }
}

async function readRoute(
    peerConnection: RTCPeerConnection
): Promise<Route | null> {
    const [stats, err] = await errorAsValue(peerConnection.getStats());
    if (err) {
        return null;
    }

    const pair = findSelectedCandidatePair(stats);
    if (!pair) {
        return null;
    }

    const candidateTypes = [pair.localCandidateId, pair.remoteCandidateId].map(
        id => (stats.get(id) as IceCandidateStats | undefined)?.candidateType
    );

    if (candidateTypes.includes("relay")) {
        return "relay";
    }
    if (candidateTypes.includes("srflx") || candidateTypes.includes("prflx")) {
        return "reflexive";
    }
    return "host";
}
