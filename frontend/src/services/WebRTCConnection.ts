import { assert } from "../util/Assert";
import errorAsValue from "../util/ErrorAsValue";
import { ClientToken, WebSocketService } from "./WebSocketService";
import { MessageType } from "../types/MessageType";
import { Logger } from "../util/Logger";
import { Observable } from "../util/observer/Observable";
import { IceCandidateMessage } from "../types/rtc/IceCandidateMessage";
import { SdpMessage } from "../types/rtc/SdpMessage";
import { TransferStatsMonitor } from "./TransferStats";
import { OpfsFileWriter } from "./OpfsFileWriter";
import { TransferTracker } from "./TransferTracker";

/** Bytes of the little-endian chunk sequence number prefixing each binary message. */
const SEQUENCE_HEADER_BYTES = 4;

const FILE_CHUNK_READ_SIZE = 8 * 1024 * 1024; // 8 MB
const HIGH_WATER_MARK = 8 * 1024 * 1024; // 8 MB
const LOW_WATER_MARK = 2 * 1024 * 1024; // 2 MB

const serversConfig: RTCConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302",
        },
    ],
};

interface FileMeta {
    name: string;
    size: number;
    uuid: string;
    chunkCount: number;
    /** Payload bytes per full chunk; positions writes of unordered chunks. */
    chunkSize: number;
}

/** Reassembly state of one incoming file transfer. */
interface ReceiveState {
    fileMeta: FileMeta | null;
    /** In-memory chunks; only used when OPFS is unavailable. */
    receivedChunks: ArrayBuffer[];
    /** Disk-backed writer; null when falling back to in-memory buffering. */
    opfsWriter: OpfsFileWriter | null;
    receivedBytes: number;
    receivedChunkCount: number;
    /** Chunks that arrived before the metadata message (the channel is unordered). */
    earlyChunks: ArrayBuffer[];
    finished: boolean;
}

export class WebRTCConnection {
    private readonly logger = new Logger("WebRTCConnection");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);
    private readonly remoteToken: ClientToken;
    private readonly signalingChannel: WebSocketService;
    private readonly peerConnection: RTCPeerConnection;
    private readonly transferStats: TransferStatsMonitor;

    private readonly eventHandlers: Map<string, Observable<unknown>> =
        new Map();

    // Reassembly state of incoming transfers, keyed by file UUID (= channel label).
    private readonly incomingTransfers: Map<string, ReceiveState> = new Map();

    // Store completed downloads for re-download capability
    private readonly completedDownloads: Map<
        string, // File UUID
        { blob: Blob; filename: string }
    > = new Map();

    // Perfect Negotiation Pattern variables
    private makingOffer: boolean = false;
    private ignoreOffer: boolean = false;
    private isSettingRemoteAnswerPending: boolean = false;
    private readonly polite: boolean;

    public constructor(
        signalingChannel: WebSocketService,
        remoteToken: ClientToken,
        private readonly transferTracker: TransferTracker
    ) {
        this.logger.setEnabled(false); // Disable logging by default, can be enabled later if needed
        this.remoteToken = remoteToken;
        this.signalingChannel = signalingChannel;
        this.polite =
            signalingChannel.getLocalClientToken()! < this.remoteToken;
        this.peerConnection = new RTCPeerConnection(serversConfig);
        this.transferStats = new TransferStatsMonitor(this.peerConnection);

        this.peerConnection.onconnectionstatechange = () => {
            this.emitEvent(
                "connectionstatechange",
                this.peerConnection.connectionState
            );
        };

        this.peerConnection.ondatachannel = event => {
            this.handleIncomingDataChannel(event.channel);
        };

        this.handleNegotiationNeeded();
        this.handleIncomingICECandidates();
        this.handleSDPPackage();
        this.handleRemoteICECandidates();

        void OpfsFileWriter.cleanupStaleFiles();

        this.initializePeerConnection();
    }

    /**
     * Sends a file to the remote peer over a dedicated RTCDataChannel.
     *
     * The channel is reliable but unordered, which avoids SCTP head-of-line
     * blocking. Each binary message carries a 4-byte little-endian sequence
     * number followed by the payload; the receiver reassembles chunks by
     * sequence number and completes when all chunks announced in the metadata
     * have arrived. The channel is closed once the send buffer has drained.
     *
     * The file is read in READ_SIZE slices via Blob.arrayBuffer() and sent in
     * messages as large as the negotiated SCTP maximum message size allows,
     * capped at 256 KB (16 KB fallback when the limit is unknown). Sending
     * pauses when more than HIGH_WATER_MARK bytes are buffered and resumes
     * once the buffer drains to LOW_WATER_MARK.
     *
     * @param file The file to be sent to the remote peer.
     */
    public sendFileOverDataChannel(file: File, uuid: string) {
        this.log(
            `File is ${[
                file.name,
                file.type,
                file.size,
                file.lastModified,
            ].join(" ")}`
        );

        this.transferTracker.start(uuid, {
            name: file.name,
            size: file.size,
            direction: "up",
        });

        const dataChannel = this.peerConnection.createDataChannel(uuid, {
            ordered: false,
        });
        dataChannel.binaryType = "arraybuffer";
        dataChannel.bufferedAmountLowThreshold = LOW_WATER_MARK;

        // Bytes handed to the channel so far; the progress interval reads it.
        let offset = 0;
        let progressInterval: ReturnType<typeof setInterval> | null = null;
        let finished = false;

        // Resolves when the send buffer drains to LOW_WATER_MARK or the
        // channel closes, whichever comes first.
        const waitForBufferedAmountLow = () =>
            new Promise<void>(resolve => {
                const done = () => {
                    dataChannel.removeEventListener("bufferedamountlow", done);
                    dataChannel.removeEventListener("close", done);
                    resolve();
                };
                dataChannel.addEventListener("bufferedamountlow", done);
                dataChannel.addEventListener("close", done);
            });

        const pump = async () => {
            // The SCTP maximum message size is negotiated per connection.
            // Chrome and Safari advertise 256 KB, Firefox considerably more.
            const maxMessageSize = this.peerConnection.sctp?.maxMessageSize;
            const messageSize = Math.min(
                maxMessageSize && maxMessageSize > 0
                    ? maxMessageSize
                    : 16 * 1024,
                256 * 1024
            );
            // 4 bytes of each message hold the chunk sequence number.
            const payloadSize = messageSize - SEQUENCE_HEADER_BYTES;
            const chunkCount = Math.ceil(file.size / payloadSize);
            // Read whole multiples of the payload size. Otherwise every read
            // boundary would produce a short fragment chunk, breaking both
            // the announced chunk count and the position-based reassembly.
            const readSize =
                Math.max(Math.floor(FILE_CHUNK_READ_SIZE / payloadSize), 1) *
                payloadSize;

            // Send metadata first so the receiver can set up reassembly.
            dataChannel.send(
                JSON.stringify({
                    name: file.name,
                    size: file.size,
                    uuid: uuid,
                    chunkCount: chunkCount,
                    chunkSize: payloadSize,
                })
            );

            let sequence = 0;
            let readOffset = 0;
            while (readOffset < file.size) {
                const buffer = await file
                    .slice(readOffset, readOffset + readSize)
                    .arrayBuffer();

                for (
                    let chunkStart = 0;
                    chunkStart < buffer.byteLength;
                    chunkStart += payloadSize
                ) {
                    if (dataChannel.bufferedAmount > HIGH_WATER_MARK) {
                        await waitForBufferedAmountLow();
                    }
                    if (dataChannel.readyState !== "open") {
                        this.log("Data channel closed during transfer:", uuid);
                        return;
                    }

                    const length = Math.min(
                        payloadSize,
                        buffer.byteLength - chunkStart
                    );
                    const message = new ArrayBuffer(
                        SEQUENCE_HEADER_BYTES + length
                    );
                    new DataView(message).setUint32(0, sequence, true);
                    new Uint8Array(message, SEQUENCE_HEADER_BYTES).set(
                        new Uint8Array(buffer, chunkStart, length)
                    );
                    dataChannel.send(message);
                    sequence++;
                    offset += length;
                }

                readOffset += buffer.byteLength;
            }

            // Warten darauf, dass der Buffer leer ist, bevor der Channel geschlossen wird
            while (dataChannel.bufferedAmount > 0) {
                if (dataChannel.readyState !== "open") {
                    this.log("Data channel closed during transfer:", uuid);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            if (progressInterval) clearInterval(progressInterval);
            finished = true;
            this.transferTracker.setStatus(uuid, "done");
            this.log("File sent for Transfer:", uuid, " closing data channel");
            dataChannel.close();
        };

        dataChannel.onclose = () => {
            if (progressInterval) clearInterval(progressInterval);
            if (!finished) {
                this.transferTracker.setStatus(uuid, "failed");
            }
            this.transferStats.release();
        };

        dataChannel.onopen = () => {
            this.transferStats.acquire();

            // Samples the bytes actually sent (handed to the channel minus
            // what is still buffered) for the transfer tracker.
            progressInterval = setInterval(() => {
                const sentBytes = Math.max(
                    offset - dataChannel.bufferedAmount,
                    0
                );
                this.transferTracker.updateBytes(uuid, sentBytes);
            }, 100);

            pump().catch((err: unknown) => {
                this.log("Error during file transfer:", uuid, err);
                if (progressInterval) clearInterval(progressInterval);
                this.transferTracker.setStatus(uuid, "failed");
            });
        };
    }

    /**
     * Handles a data channel opened by the remote peer. The reassembly state
     * is keyed by the channel label (the file UUID). The "init" channel used
     * to kick off negotiation is ignored.
     */
    private handleIncomingDataChannel(dataChannel: RTCDataChannel) {
        if (dataChannel.label === "init") {
            return;
        }

        this.log("Received data channel", dataChannel.label);
        dataChannel.binaryType = "arraybuffer";

        const state = this.getOrCreateReceiveState(dataChannel.label);
        let statsAcquired = false;

        const handleSequencedChunk = (data: ArrayBuffer) => {
            const sequence = new DataView(data).getUint32(0, true);
            const payload = data.slice(SEQUENCE_HEADER_BYTES);
            if (state.opfsWriter) {
                state.opfsWriter.write(
                    sequence * state.fileMeta!.chunkSize,
                    payload
                );
            } else {
                state.receivedChunks[sequence] = payload;
            }
            state.receivedBytes += payload.byteLength;
            state.receivedChunkCount++;
            this.transferTracker.updateBytes(
                state.fileMeta!.uuid,
                state.receivedBytes
            );

            if (
                !state.finished &&
                state.receivedChunkCount === state.fileMeta?.chunkCount
            ) {
                void this.finishDownload(state);
            }
        };

        dataChannel.onmessage = event => {
            if (state.fileMeta === null && typeof event.data === "string") {
                state.fileMeta = JSON.parse(event.data) as FileMeta;

                // Chunks arrive unordered and are placed by sequence number:
                // written to disk at their absolute position when OPFS is
                // available, buffered in memory otherwise.
                if (OpfsFileWriter.isSupported()) {
                    state.opfsWriter = new OpfsFileWriter(state.fileMeta.uuid);
                } else {
                    state.receivedChunks = new Array<ArrayBuffer>(
                        state.fileMeta.chunkCount
                    );
                }

                this.log("Received file metadata:", state.fileMeta);
                this.transferTracker.start(state.fileMeta.uuid, {
                    name: state.fileMeta.name,
                    size: state.fileMeta.size,
                    direction: "down",
                });

                state.earlyChunks.forEach(handleSequencedChunk);
                state.earlyChunks.length = 0;
                return;
            }

            if (event.data instanceof ArrayBuffer) {
                if (state.fileMeta === null) {
                    state.earlyChunks.push(event.data);
                } else {
                    handleSequencedChunk(event.data);
                }
            } else {
                this.log("Unbekannter Nachrichtentyp:", event.data);
            }
        };

        dataChannel.onopen = () => {
            this.transferStats.acquire();
            statsAcquired = true;
        };
        dataChannel.onclose = () => {
            if (statsAcquired) {
                this.transferStats.release();
                statsAcquired = false;
            }
            if (state.fileMeta && !state.finished) {
                this.transferTracker.setStatus(state.fileMeta.uuid, "failed");
            }
        };
        dataChannel.onerror = error => {
            this.log("Data channel error: ", error);
        };
    }

    private getOrCreateReceiveState(uuid: string): ReceiveState {
        let state = this.incomingTransfers.get(uuid);
        if (!state) {
            state = {
                fileMeta: null,
                receivedChunks: [],
                opfsWriter: null,
                receivedBytes: 0,
                receivedChunkCount: 0,
                earlyChunks: [],
                finished: false,
            };
            this.incomingTransfers.set(uuid, state);
        }
        return state;
    }

    /**
     * Assembles the received file, stores it for re-download and triggers the
     * browser download. Called once all chunks have arrived.
     *
     * With OPFS the file is finalized on disk and downloaded as a disk-backed
     * File; otherwise the buffered chunks are assembled into an in-memory Blob.
     */
    private async finishDownload(state: ReceiveState) {
        state.finished = true;

        const uuid = state.fileMeta!.uuid;
        const filename = state.fileMeta?.name ?? "received-file";

        // All chunks have arrived; disk finalization may still take a moment.
        this.transferTracker.setStatus(uuid, "finalizing");

        let blob: Blob;
        if (state.opfsWriter) {
            const [file, err] = await errorAsValue(state.opfsWriter.finish());
            if (err) {
                console.error(
                    "Failed to finalize received file on disk:",
                    filename,
                    err
                );
                this.transferTracker.setStatus(uuid, "failed");
                return;
            }
            blob = file;
        } else {
            blob = new Blob(state.receivedChunks);
        }

        this.transferTracker.setStatus(uuid, "done");

        // Store the blob for potential re-download
        if (state.fileMeta?.uuid) {
            this.completedDownloads.set(state.fileMeta.uuid, {
                blob,
                filename,
            });
            this.incomingTransfers.delete(state.fileMeta.uuid);
        }

        // Yield to the event loop so the UI can render the completed state
        // before the (possible) download prompt ("where do you want to save this file?") opens.
        await new Promise(resolve => setTimeout(resolve, 100));

        // Trigger initial download
        this.triggerDownload(blob, filename);

        this.log("File downloaded with TransferID:", state.fileMeta?.uuid);
    }

    /**
     * To trigger the negotiationneeded event, we create a data channel.
     * After that, the WebRTC Connection is goint to start (handshake).
     */
    private initializePeerConnection() {
        if (this.polite) {
            this.peerConnection.createDataChannel("init");
        }
    }

    private handleRemoteICECandidates() {
        this.signalingChannel.subscribeMessage(
            MessageType.ICE_CANDIDATE,
            async message => {
                const iceCandidateMessage = message as IceCandidateMessage;
                const candidate = iceCandidateMessage.msg.iceCandidate;

                const [, err] = await errorAsValue(
                    this.peerConnection.addIceCandidate(candidate)
                );

                if (err && !this.ignoreOffer) {
                    this.log("Failed to add ICE candidate:", err);
                }
            }
        );
    }

    private handleSDPPackage() {
        this.signalingChannel.subscribeMessage(
            MessageType.SDP,
            async message => {
                const sdpMessage = message as SdpMessage;
                const description = sdpMessage.msg.description;

                this.log("Received SDP ", description.type, " message");

                const readyForOffer =
                    !this.makingOffer &&
                    (this.peerConnection.signalingState === "stable" ||
                        this.isSettingRemoteAnswerPending);

                const offerCollision =
                    description.type === "offer" && !readyForOffer;

                // ignoreOffer is true, if offerCollision occurs and if this peer is impolite (ignoring SDP and all incoming ICE candidates)
                this.ignoreOffer = !this.polite && offerCollision;
                if (this.ignoreOffer) {
                    this.log(
                        "IGNORING offer, because this peer is impolite and offerCollision occurred"
                    );
                    return;
                }

                this.isSettingRemoteAnswerPending =
                    description.type === "answer";

                const [,] = await errorAsValue(
                    this.peerConnection.setRemoteDescription(description)
                );
                this.isSettingRemoteAnswerPending = false;

                if (description.type === "offer") {
                    await this.peerConnection.setLocalDescription();
                    this.signalingChannel.sendMessage(
                        new SdpMessage({
                            remoteToken: this.remoteToken,
                            description: this.peerConnection.localDescription!,
                        })
                    );
                }
            }
        );
    }

    private handleNegotiationNeeded() {
        this.peerConnection.onnegotiationneeded = async () => {
            this.makingOffer = true;

            const [, err] = await errorAsValue(
                this.peerConnection.setLocalDescription()
            );

            if (!err) {
                this.signalingChannel.sendMessage(
                    new SdpMessage({
                        remoteToken: this.remoteToken,
                        description: this.peerConnection.localDescription!,
                    })
                );
            } else {
                this.log("Error during setting local description: ", err);
            }

            this.makingOffer = false;
        };
    }

    private handleIncomingICECandidates() {
        this.peerConnection.onicecandidate = event => {
            if (event.candidate) {
                this.signalingChannel.sendMessage(
                    new IceCandidateMessage({
                        remoteToken: this.remoteToken,
                        iceCandidate: event.candidate,
                    })
                );
            }
        };
    }

    /**
     * Triggers a download for a specific blob with the given filename.
     * Uses a queue system to prevent multiple simultaneous downloads.
     */
    private triggerDownload(blob: Blob, filename: string) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);

        // Download in die Queue legen:
        downloadQueue.push(() => {
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                downloadActive = false;
                processDownloadQueue(); // Nächsten Download starten
            }, 200); // 200ms warten, damit der Download sicher startet
        });
        processDownloadQueue();
    }

    /**
     * Re-downloads a previously received file by UUID.
     * @param uuid The UUID of the file to re-download.
     * @returns true if the file was found and download was triggered, false otherwise.
     */
    public redownloadFile(uuid: string): boolean {
        const fileData = this.completedDownloads.get(uuid);
        if (!fileData) {
            this.log("File not found for re-download:", uuid);
            return false;
        }

        this.log("Re-downloading file:", fileData.filename);
        this.triggerDownload(fileData.blob, fileData.filename);
        return true;
    }

    public closeConnection() {
        this.incomingTransfers.forEach(state => {
            void state.opfsWriter?.abort();
        });
        this.incomingTransfers.clear();

        this.transferStats.stop();
        this.peerConnection.close();

        const iceHandlers = this.signalingChannel.getHandlers(
            MessageType.ICE_CANDIDATE
        );

        if (iceHandlers) {
            iceHandlers.forEach(handler =>
                this.signalingChannel.unsubscribeMessage(
                    MessageType.ICE_CANDIDATE,
                    handler
                )
            );
        }

        const sdpHandlers = this.signalingChannel.getHandlers(MessageType.SDP);

        if (sdpHandlers) {
            sdpHandlers.forEach(handler =>
                this.signalingChannel.unsubscribeMessage(
                    MessageType.SDP,
                    handler
                )
            );
        }

        assert(this.peerConnection.connectionState === "closed");
        this.emitEvent("connectionstatechange", "closed");

        this.unsubscribeAllHandlers();

        this.completedDownloads.clear();
    }

    public getPeerConnection(): RTCPeerConnection {
        return this.peerConnection;
    }

    public subscribeTo(event: string, handler: (data: unknown) => void) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Observable<unknown>());
        }
        this.eventHandlers.get(event)?.subscribe(handler);
    }

    public unsubscribeFrom(event: string, handler: (data: unknown) => void) {
        assert(
            this.eventHandlers.has(event),
            `Event ${event} not found in eventHandlers`
        );
        this.eventHandlers.get(event)?.unsubscribe(handler);
    }

    private emitEvent(event: string, data: unknown) {
        assert(
            this.eventHandlers.has(event),
            `Event ${event} not found in eventHandlers`
        );
        this.eventHandlers.get(event)?.notify(data);
    }

    private unsubscribeAllHandlers() {
        this.eventHandlers.forEach(observable => {
            observable.unsubscribeAll();
        });
    }
}

const downloadQueue: (() => void)[] = [];
let downloadActive = false;

function processDownloadQueue() {
    if (downloadActive || downloadQueue.length === 0) return;
    downloadActive = true;
    const nextDownload = downloadQueue.shift();
    if (nextDownload) nextDownload();
}
