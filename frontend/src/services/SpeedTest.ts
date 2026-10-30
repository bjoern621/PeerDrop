import { errorAsValueSync } from "../util/ErrorAsValue";
import { Route } from "../types/telemetry/Route";
import {
    SPEED_TEST_DURATION_MS,
    SPEED_TEST_FILLED_SHARE,
    SPEED_TEST_READY_TIMEOUT_MS,
    SPEED_TEST_RESULT_TIMEOUT_MS,
    SPEED_TEST_RTT_GROWTH_FACTOR,
    SPEED_TEST_RTT_GROWTH_MS,
} from "../util/Constants";
import { LaneReading, readLane } from "./ConnectionDetails";
import {
    CpuPressure,
    getCpuPressure,
    subscribeToCpuPressure,
    worseCpuPressure,
} from "./CpuPressure";

/**
 * Label of the data channel that carries a speed test. A file channel
 * carries the file's UUID as label, so the two never collide.
 *
 * Protocol on the channel, control messages as JSON strings:
 * 1. The sender opens the channel on lane 0.
 * 2. The receiver confirms with {"ready": true}.
 * 3. The sender sends binary test data for SPEED_TEST_DURATION_MS, then {"sent": <bytes>}.
 * 4. Once that many bytes arrived, the receiver answers {"received": <bytes>, "ms": <first to last test data>}.
 * The channel is unordered like the file channels, so the sent count can overtake test data.
 */
export const SPEED_TEST_LABEL = "peerdrop-speed-test";

// Same water marks as the file channels in WebRTCConnection, so the test meets the same buffer limits.
const HIGH_WATER_MARK_BYTES = 8 * 1024 * 1024;
const LOW_WATER_MARK_BYTES = 2 * 1024 * 1024;

// Below this, the buffer ran dry before the sender refilled it at the low water mark.
const BUFFER_FILLED_BYTES = LOW_WATER_MARK_BYTES / 2;
const BUFFER_SAMPLE_INTERVAL_MS = 100;

const BITS_PER_MBIT = 1_000_000;

export interface SpeedTestResult {
    /** Mbit/s, as the receiver counted the test data. */
    mbps: number;
    /** Null while ICE had selected no candidate pair. */
    route: Route | null;
    /** Share of the test, 0 to 1, in which the send buffer held data waiting for the transport. */
    bufferFilledShare: number;
    /** ms, before the test data started. */
    idleRttMs: number | null;
    /** ms, mean of the ICE checks answered while the test data ran. */
    loadRttMs: number | null;
    /** Highest CPU load during the test. Null without the Compute Pressure API. */
    cpuPressure: CpuPressure | null;
}

/**
 * unsupported: the peer never confirmed (an older version).
 * refused: the peer closed the channel, since it takes no data from this peer.
 * closed: the connection dropped during the test.
 */
export type SpeedTestOutcome =
    | { ok: true; result: SpeedTestResult }
    | { ok: false; reason: "unsupported" | "refused" | "closed" };

/**
 * Likely bottleneck of a measured speed.
 * relay: the data passes a TURN server.
 * cpu: the device reported high CPU load.
 * tab: the send buffer ran dry, so the sending tab handed over data slower than the transport took it.
 * queue: the round trip time grew under load, so a queue on the path filled.
 * browser: none of these, which leaves the browser's own WebRTC stack (#218).
 */
export type SpeedLimit = "relay" | "cpu" | "tab" | "queue" | "browser";

/**
 * Sends test data to the peer for SPEED_TEST_DURATION_MS and reports the
 * speed that arrived. Closes its channel before it returns.
 */
export async function runSpeedTest(
    peerConnection: RTCPeerConnection
): Promise<SpeedTestOutcome> {
    let cpuPressure = getCpuPressure();
    const unsubscribeCpu = subscribeToCpuPressure(() => {
        cpuPressure = worseCpuPressure(cpuPressure, getCpuPressure());
    });

    const channel = peerConnection.createDataChannel(SPEED_TEST_LABEL, {
        ordered: false,
    });
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = LOW_WATER_MARK_BYTES;

    const outcome = await measure(peerConnection, channel);
    unsubscribeCpu();
    channel.close();

    if (!outcome.ok) {
        return outcome;
    }
    return {
        ok: true,
        result: {
            ...outcome.result,
            cpuPressure: worseCpuPressure(cpuPressure, getCpuPressure()),
        },
    };
}

/** Likely bottleneck of a measured speed, by the first signal that names one. */
export function speedLimitOf(result: SpeedTestResult): SpeedLimit {
    if (result.route === "relay") {
        return "relay";
    }
    if (result.cpuPressure === "serious" || result.cpuPressure === "critical") {
        return "cpu";
    }
    if (result.bufferFilledShare < SPEED_TEST_FILLED_SHARE) {
        return "tab";
    }
    if (
        result.idleRttMs !== null &&
        result.loadRttMs !== null &&
        result.loadRttMs >= result.idleRttMs * SPEED_TEST_RTT_GROWTH_FACTOR &&
        result.loadRttMs - result.idleRttMs >= SPEED_TEST_RTT_GROWTH_MS
    ) {
        return "queue";
    }
    return "browser";
}

/**
 * Answers a speed test that the peer opened: confirms it, counts the test
 * data and reports the count once the sender's total arrived.
 */
export function answerSpeedTest(channel: RTCDataChannel) {
    channel.binaryType = "arraybuffer";

    let received = 0;
    let firstAt: number | null = null;
    let lastAt = 0;
    let expected: number | null = null;

    const confirm = () => channel.send(JSON.stringify({ ready: true }));
    if (channel.readyState === "open") {
        confirm();
    } else {
        channel.onopen = confirm;
    }

    channel.onmessage = event => {
        if (event.data instanceof ArrayBuffer) {
            const now = performance.now();
            firstAt ??= now;
            lastAt = now;
            received += event.data.byteLength;
        } else if (typeof event.data === "string") {
            const sent = readJson(event.data)?.sent;
            expected = typeof sent === "number" ? sent : expected;
        }

        if (
            expected !== null &&
            received >= expected &&
            channel.readyState === "open"
        ) {
            channel.send(
                JSON.stringify({
                    received,
                    ms: firstAt === null ? 0 : lastAt - firstAt,
                })
            );
            expected = null;
        }
    };
}

async function measure(
    peerConnection: RTCPeerConnection,
    channel: RTCDataChannel
): Promise<
    | { ok: true; result: Omit<SpeedTestResult, "cpuPressure"> }
    | { ok: false; reason: "unsupported" | "refused" | "closed" }
> {
    const ready = await waitForReply(
        channel,
        message => (message.ready === true ? true : null),
        SPEED_TEST_READY_TIMEOUT_MS
    );
    if (ready === "timeout") {
        return { ok: false, reason: "unsupported" };
    }
    if (ready === "closed") {
        return { ok: false, reason: "refused" };
    }

    const before = await readLane(peerConnection);

    let samples = 0;
    let filledSamples = 0;
    const sampler = setInterval(() => {
        samples++;
        if (channel.bufferedAmount >= BUFFER_FILLED_BYTES) {
            filledSamples++;
        }
    }, BUFFER_SAMPLE_INTERVAL_MS);
    const sent = await sendTestData(channel, messageSize(peerConnection));
    clearInterval(sampler);

    const after = await readLane(peerConnection);
    if (sent === null) {
        return { ok: false, reason: "closed" };
    }

    channel.send(JSON.stringify({ sent }));
    const report = await waitForReply(
        channel,
        message =>
            typeof message.received === "number" &&
            typeof message.ms === "number"
                ? { received: message.received, ms: message.ms }
                : null,
        SPEED_TEST_RESULT_TIMEOUT_MS
    );
    if (report === "timeout" || report === "closed") {
        return { ok: false, reason: "closed" };
    }

    return {
        ok: true,
        result: {
            mbps:
                report.ms > 0
                    ? (report.received * 8) / BITS_PER_MBIT / (report.ms / 1000)
                    : 0,
            route: after?.route ?? before?.route ?? null,
            bufferFilledShare: samples > 0 ? filledSamples / samples : 0,
            idleRttMs: before?.roundTripTimeMs ?? null,
            loadRttMs: meanRoundTripTimeMs(before, after),
        },
    };
}

/**
 * Keeps the send buffer between the water marks until the test time ends.
 * Returns the bytes handed to the channel, null once the channel closed.
 */
async function sendTestData(
    channel: RTCDataChannel,
    size: number
): Promise<number | null> {
    const message = new ArrayBuffer(size);
    const deadline = performance.now() + SPEED_TEST_DURATION_MS;
    let sent = 0;
    let sentSinceYield = 0;

    while (performance.now() < deadline) {
        if (channel.readyState !== "open") {
            return null;
        }
        if (channel.bufferedAmount > HIGH_WATER_MARK_BYTES) {
            await waitForBufferedAmountLow(channel);
            sentSinceYield = 0;
            continue;
        }

        channel.send(message);
        sent += size;
        sentSinceYield += size;

        // A transport that drains faster than this loop fills never pauses
        // it, which would freeze the tab for the whole test.
        if (sentSinceYield >= HIGH_WATER_MARK_BYTES) {
            await new Promise(resolve => setTimeout(resolve, 0));
            sentSinceYield = 0;
        }
    }

    return channel.readyState === "open" ? sent : null;
}

/** Message size that the file channels use as well: the SCTP maximum, capped at 256 KB. */
function messageSize(peerConnection: RTCPeerConnection): number {
    const maxMessageSize = peerConnection.sctp?.maxMessageSize;
    return Math.min(
        maxMessageSize && maxMessageSize > 0 ? maxMessageSize : 16 * 1024,
        256 * 1024
    );
}

/** ms, mean of the ICE checks answered between two readings. Falls back to the latest check. */
function meanRoundTripTimeMs(
    before: LaneReading | null,
    after: LaneReading | null
): number | null {
    if (!before || !after) {
        return after?.roundTripTimeMs ?? null;
    }
    const responses = after.responsesReceived - before.responsesReceived;
    if (responses <= 0) {
        return after.roundTripTimeMs;
    }
    return (
        ((after.totalRoundTripTime - before.totalRoundTripTime) / responses) *
        1000
    );
}

/**
 * Resolves with the first JSON message that `read` accepts, or with
 * "timeout" or "closed", whichever comes first.
 */
function waitForReply<T>(
    channel: RTCDataChannel,
    read: (message: Record<string, unknown>) => T | null,
    timeoutMs: number
): Promise<T | "timeout" | "closed"> {
    return new Promise(resolve => {
        const finish = (value: T | "timeout" | "closed") => {
            clearTimeout(timer);
            channel.removeEventListener("message", onMessage);
            channel.removeEventListener("close", onClose);
            resolve(value);
        };
        const onMessage = (event: MessageEvent) => {
            if (typeof event.data !== "string") {
                return;
            }
            const message = readJson(event.data);
            const value = message ? read(message) : null;
            if (value !== null) {
                finish(value);
            }
        };
        const onClose = () => finish("closed");
        const timer = setTimeout(() => finish("timeout"), timeoutMs);

        channel.addEventListener("message", onMessage);
        channel.addEventListener("close", onClose);
    });
}

/** Resolves when the send buffer drains to the low water mark or the channel closes. */
function waitForBufferedAmountLow(channel: RTCDataChannel) {
    return new Promise<void>(resolve => {
        const done = () => {
            channel.removeEventListener("bufferedamountlow", done);
            channel.removeEventListener("close", done);
            resolve();
        };
        channel.addEventListener("bufferedamountlow", done);
        channel.addEventListener("close", done);
    });
}

/** Object that a JSON string holds, null for anything else. */
function readJson(data: string): Record<string, unknown> | null {
    const [message] = errorAsValueSync(() => JSON.parse(data) as unknown);
    return typeof message === "object" && message !== null
        ? (message as Record<string, unknown>)
        : null;
}
