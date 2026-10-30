import errorAsValue from "../util/ErrorAsValue";
import { Route } from "../types/telemetry/Route";
import {
    findSelectedCandidatePair,
    IceCandidateStats,
    routeOf,
} from "./TransferStats";

/** One end of the selected candidate pair. */
export interface CandidateEnd {
    /** ICE candidate type: "host", "srflx", "prflx" or "relay". */
    type: string;
    /** "udp" or "tcp". */
    protocol: string | null;
    /** Null where the browser withholds the address, such as behind an mDNS name. */
    address: string | null;
    port: number | null;
    /** Protocol towards the TURN server; null unless the end is a relay candidate. */
    relayProtocol: string | null;
}

/** Statistics of the selected candidate pair of one peer connection. */
export interface LaneReading {
    route: Route;
    local: CandidateEnd | null;
    remote: CandidateEnd | null;
    /** ms, of the latest ICE check. Null before the first check got answered. */
    roundTripTimeMs: number | null;
    /** s, summed over every answered ICE check. Divided by responsesReceived, it gives the mean. */
    totalRoundTripTime: number;
    responsesReceived: number;
    bytesSent: number;
    bytesReceived: number;
}

/** Statistics of all peer connections to one peer at one moment. */
export interface ConnectionReading {
    /** Lane 0. Null while ICE has selected no candidate pair. */
    main: LaneReading | null;
    /** Lanes with a selected candidate pair. */
    activeLanes: number;
    /** Payload bytes over all lanes. */
    bytesSent: number;
    bytesReceived: number;
    /** performance.now() of the reading, ms. */
    readAt: number;
}

/**
 * Reads the selected candidate pair of every lane, lane 0 first.
 * A lane whose statistics cannot be read counts as inactive.
 */
export async function readConnection(
    lanes: RTCPeerConnection[]
): Promise<ConnectionReading> {
    const readings = await Promise.all(lanes.map(readLane));
    const active = readings.filter(reading => reading !== null);

    return {
        main: readings[0] ?? null,
        activeLanes: active.length,
        bytesSent: active.reduce((sum, lane) => sum + lane.bytesSent, 0),
        bytesReceived: active.reduce(
            (sum, lane) => sum + lane.bytesReceived,
            0
        ),
        readAt: performance.now(),
    };
}

/** Selected candidate pair of a peer connection. Null before ICE selected one. */
export async function readLane(
    peerConnection: RTCPeerConnection
): Promise<LaneReading | null> {
    const [stats, err] = await errorAsValue(peerConnection.getStats());
    if (err) {
        return null;
    }

    const pair = findSelectedCandidatePair(stats);
    if (!pair) {
        return null;
    }

    const local = stats.get(pair.localCandidateId) as
        | IceCandidateStats
        | undefined;
    const remote = stats.get(pair.remoteCandidateId) as
        | IceCandidateStats
        | undefined;
    const rtt = pair.currentRoundTripTime;

    return {
        route: routeOf([local?.candidateType, remote?.candidateType]),
        local: local ? candidateEnd(local) : null,
        remote: remote ? candidateEnd(remote) : null,
        roundTripTimeMs: rtt !== undefined ? rtt * 1000 : null,
        totalRoundTripTime: pair.totalRoundTripTime ?? 0,
        responsesReceived: pair.responsesReceived ?? 0,
        bytesSent: pair.bytesSent ?? 0,
        bytesReceived: pair.bytesReceived ?? 0,
    };
}

function candidateEnd(candidate: IceCandidateStats): CandidateEnd {
    return {
        type: candidate.candidateType,
        protocol: candidate.protocol ?? null,
        // Firefox writes "(redacted)" in place of a withheld address.
        address:
            candidate.address && candidate.address !== "(redacted)"
                ? candidate.address
                : null,
        port: candidate.port ?? null,
        relayProtocol: candidate.relayProtocol ?? null,
    };
}
