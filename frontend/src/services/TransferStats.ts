/**
 * Samples WebRTC connection statistics while file transfers are active.
 *
 * Answers two questions for issue #217:
 * - Which network path carries the data (direct host/srflx or TURN relay)?
 * - What throughput, RTT and available bitrate does the connection reach?
 *
 * Results are logged to the browser console once per second while at least
 * one transfer is running. A TURN-relayed path is a strong hint for slow
 * transfers because relay servers add latency and are bandwidth-limited.
 */

export interface TransferStatsSample {
    /** Candidate types of the selected pair, e.g. "host->host" or "relay->host". */
    path: string | null;
    /** Transport protocol of the local candidate ("udp" or "tcp"). */
    protocol: string | null;
    /** Protocol used towards the TURN server, if the local candidate is a relay. */
    relayProtocol: string | null;
    /** Round trip time of the selected candidate pair in milliseconds. */
    roundTripTimeMs: number | null;
    /** Estimated available outgoing bitrate in Mbit/s. */
    availableOutgoingMbps: number | null;
    /** Measured send throughput since the last sample in Mbit/s. */
    sendMbps: number | null;
    /** Measured receive throughput since the last sample in Mbit/s. */
    receiveMbps: number | null;
}

/**
 * Shape of "local-candidate" / "remote-candidate" stats reports.
 * Not part of the TypeScript DOM lib.
 */
interface IceCandidateStats {
    candidateType: string;
    protocol?: string;
    relayProtocol?: string;
}

const SAMPLE_INTERVAL_MS = 1000;
const BITS_PER_MBIT = 1_000_000;

export class TransferStatsMonitor {
    private readonly peerConnection: RTCPeerConnection;
    private activeTransfers = 0;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private lastBytesSent: number | null = null;
    private lastBytesReceived: number | null = null;
    private lastSampleTime: number | null = null;
    private readonly onSample?: (sample: TransferStatsSample) => void;

    public constructor(
        peerConnection: RTCPeerConnection,
        onSample?: (sample: TransferStatsSample) => void
    ) {
        this.peerConnection = peerConnection;
        this.onSample = onSample;
    }

    /**
     * Marks the start of a file transfer. Sampling starts with the first
     * active transfer.
     */
    public acquire() {
        this.activeTransfers++;
        if (this.activeTransfers === 1) {
            this.start();
        }
    }

    /**
     * Marks the end of a file transfer. Sampling stops when no transfer
     * is active anymore.
     */
    public release() {
        this.activeTransfers = Math.max(this.activeTransfers - 1, 0);
        if (this.activeTransfers === 0) {
            this.stop();
        }
    }

    public stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.lastBytesSent = null;
        this.lastBytesReceived = null;
        this.lastSampleTime = null;
    }

    private start() {
        if (this.intervalId !== null) {
            return;
        }
        this.intervalId = setInterval(() => {
            void this.sample();
        }, SAMPLE_INTERVAL_MS);
    }

    private async sample() {
        const stats = await this.peerConnection.getStats();

        const pair = this.findSelectedCandidatePair(stats);
        if (!pair) {
            return;
        }

        const local = stats.get(pair.localCandidateId) as
            | IceCandidateStats
            | undefined;
        const remote = stats.get(pair.remoteCandidateId) as
            | IceCandidateStats
            | undefined;

        const now = performance.now();
        const bytesSent = pair.bytesSent ?? null;
        const bytesReceived = pair.bytesReceived ?? null;

        let sendMbps: number | null = null;
        let receiveMbps: number | null = null;
        if (
            this.lastSampleTime !== null &&
            this.lastBytesSent !== null &&
            this.lastBytesReceived !== null &&
            bytesSent !== null &&
            bytesReceived !== null
        ) {
            const elapsedSeconds = (now - this.lastSampleTime) / 1000;
            if (elapsedSeconds > 0) {
                sendMbps =
                    ((bytesSent - this.lastBytesSent) * 8) /
                    BITS_PER_MBIT /
                    elapsedSeconds;
                receiveMbps =
                    ((bytesReceived - this.lastBytesReceived) * 8) /
                    BITS_PER_MBIT /
                    elapsedSeconds;
            }
        }
        this.lastSampleTime = now;
        this.lastBytesSent = bytesSent;
        this.lastBytesReceived = bytesReceived;

        const rtt = pair.currentRoundTripTime;
        const availableOut = pair.availableOutgoingBitrate;

        const sample: TransferStatsSample = {
            path:
                local && remote
                    ? `${local.candidateType}->${remote.candidateType}`
                    : null,
            protocol: local?.protocol ?? null,
            relayProtocol: local?.relayProtocol ?? null,
            roundTripTimeMs: rtt !== undefined ? rtt * 1000 : null,
            availableOutgoingMbps:
                availableOut !== undefined
                    ? availableOut / BITS_PER_MBIT
                    : null,
            sendMbps,
            receiveMbps,
        };

        this.logSample(sample);
        this.onSample?.(sample);
    }

    /**
     * Returns the currently selected ICE candidate pair.
     *
     * Chrome exposes it via the transport's selectedCandidatePairId.
     * Firefox marks the pair itself with selected = true.
     */
    private findSelectedCandidatePair(
        stats: RTCStatsReport
    ): RTCIceCandidatePairStats | null {
        let selectedPairId: string | null = null;
        stats.forEach((report: unknown) => {
            const transport = report as RTCStats & {
                selectedCandidatePairId?: string;
            };
            if (
                transport.type === "transport" &&
                transport.selectedCandidatePairId
            ) {
                selectedPairId = transport.selectedCandidatePairId;
            }
        });

        let selectedPair: RTCIceCandidatePairStats | null = null;
        stats.forEach((report: unknown) => {
            const pair = report as RTCIceCandidatePairStats & {
                selected?: boolean;
            };
            if (pair.type !== "candidate-pair") {
                return;
            }
            if (
                (selectedPairId !== null && pair.id === selectedPairId) ||
                (selectedPairId === null && pair.selected === true) ||
                (selectedPairId === null &&
                    pair.state === "succeeded" &&
                    pair.nominated === true)
            ) {
                selectedPair = pair;
            }
        });

        return selectedPair;
    }

    private logSample(sample: TransferStatsSample) {
        const format = (value: number | null, unit: string) =>
            value !== null ? `${value.toFixed(1)}${unit}` : "n/a";

        const relayInfo = sample.relayProtocol
            ? ` (TURN via ${sample.relayProtocol})`
            : "";

        console.info(
            `[TransferStats] path=${sample.path ?? "n/a"}/${sample.protocol ?? "n/a"}${relayInfo}` +
                ` rtt=${format(sample.roundTripTimeMs, "ms")}` +
                ` send=${format(sample.sendMbps, "Mbps")}` +
                ` recv=${format(sample.receiveMbps, "Mbps")}` +
                ` availableOut=${format(sample.availableOutgoingMbps, "Mbps")}`
        );
    }
}
