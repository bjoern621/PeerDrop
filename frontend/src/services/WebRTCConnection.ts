import { assert } from "../util/Assert";
import errorAsValue from "../util/ErrorAsValue";
import { ClientToken, WebSocketService } from "./WebSocketService";
import { MessageType } from "../types/MessageType";
import { Logger } from "../util/Logger";
import { Observable } from "../util/observer/Observable";
import { IceCandidateMessage } from "../types/rtc/IceCandidateMessage";
import { SdpMessage } from "../types/rtc/SdpMessage";
import { TransferStatsMonitor } from "./TransferStats";

const serversConfig: RTCConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "7cfed80f2da5f327b1e8a894",
            credential: "Uvb5QuG/FHIpdQYA",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "7cfed80f2da5f327b1e8a894",
            credential: "Uvb5QuG/FHIpdQYA",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "7cfed80f2da5f327b1e8a894",
            credential: "Uvb5QuG/FHIpdQYA",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "7cfed80f2da5f327b1e8a894",
            credential: "Uvb5QuG/FHIpdQYA",
        },
    ],
};

export class WebRTCConnection {
    private readonly logger = new Logger("WebRTCConnection");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);
    private readonly remoteToken: ClientToken;
    private readonly signalingChannel: WebSocketService;
    private readonly peerConnection: RTCPeerConnection;
    private transferStats: TransferStatsMonitor | undefined;

    private readonly eventHandlers: Map<string, Observable<unknown>> =
        new Map();

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
        remoteToken: ClientToken
    ) {
        this.logger.setEnabled(false); // Disable logging by default, can be enabled later if needed
        this.remoteToken = remoteToken;
        this.signalingChannel = signalingChannel;
        this.polite =
            signalingChannel.getLocalClientToken()! < this.remoteToken;
        this.peerConnection = new RTCPeerConnection(serversConfig);
        this.transferStats = new TransferStatsMonitor(this.peerConnection);

        this.setupEmittedWebRTCEvents();

        this.setupReceivingDataChannel();
        this.handleIncomingICECandidates();
        this.handleNegotiationNeeded();
        this.handleSDPPackage();
        this.handleRemoteICECandidates();

        this.initializePeerConnection();
    }

    /**
     * Sends a file to the remote peer over a dedicated RTCDataChannel.
     *
     * The file is read in READ_SIZE slices via Blob.arrayBuffer() and sent in
     * messages as large as the negotiated SCTP maximum message size allows,
     * capped at 256 KB (16 KB fallback when the limit is unknown).
     * Sending pauses when more than HIGH_WATER_MARK bytes are buffered and
     * resumes once the buffer drains to LOW_WATER_MARK. After the entire file
     * has been sent, an "EOF" message signals the end of the file and the
     * DataChannel is closed.
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
        const dataChannel = this.peerConnection.createDataChannel(uuid);

        dataChannel.binaryType = "arraybuffer";

        const READ_SIZE = 8 * 1024 * 1024;
        const HIGH_WATER_MARK = 8 * 1024 * 1024;
        const LOW_WATER_MARK = 2 * 1024 * 1024;
        dataChannel.bufferedAmountLowThreshold = LOW_WATER_MARK;

        // Bytes handed to the channel so far; the progress interval reads it.
        let offset = 0;
        let progressInterval: ReturnType<typeof setInterval> | null = null;

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
            const chunkSize = Math.min(
                maxMessageSize && maxMessageSize > 0
                    ? maxMessageSize
                    : 16 * 1024,
                256 * 1024
            );

            let readOffset = 0;
            while (readOffset < file.size) {
                const buffer = await file
                    .slice(readOffset, readOffset + READ_SIZE)
                    .arrayBuffer();

                for (
                    let chunkStart = 0;
                    chunkStart < buffer.byteLength;
                    chunkStart += chunkSize
                ) {
                    if (dataChannel.bufferedAmount > HIGH_WATER_MARK) {
                        await waitForBufferedAmountLow();
                    }
                    if (dataChannel.readyState !== "open") {
                        this.log("Data channel closed during transfer:", uuid);
                        return;
                    }

                    const chunk = buffer.slice(
                        chunkStart,
                        Math.min(chunkStart + chunkSize, buffer.byteLength)
                    );
                    dataChannel.send(chunk);
                    offset += chunk.byteLength;
                }

                readOffset += buffer.byteLength;
            }

            // Warten darauf, dass der Buffer leer ist, bevor EOF gesendet wird
            while (dataChannel.bufferedAmount > 0) {
                if (dataChannel.readyState !== "open") {
                    this.log("Data channel closed during transfer:", uuid);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            if (progressInterval) clearInterval(progressInterval);
            // 100% Progress-Event senden
            this.emitEvent("fileProgress", {
                uuid: uuid,
                progress: 1.0, // 100% progress
            });
            dataChannel.send("EOF");
            this.log(
                "File sent for Transfer:",
                uuid,
                " EOF reached, closing data channel"
            );
            dataChannel.close();
        };

        dataChannel.onclose = () => {
            if (progressInterval) clearInterval(progressInterval);
            this.transferStats?.release();
        };

        dataChannel.onopen = () => {
            this.transferStats?.acquire();

            // Send first Metadata about the file
            const meta = JSON.stringify({
                name: file.name,
                size: file.size,
                uuid: uuid,
            });
            dataChannel.send(meta);

            // Progress-Interval starten
            progressInterval = setInterval(() => {
                // Tatsächlich gesendete Bytes = offset - bufferedAmount
                const sentBytes = Math.max(
                    offset - dataChannel.bufferedAmount,
                    0
                );
                const progress = Math.min(sentBytes / file.size, 1);
                this.emitEvent("fileProgress", {
                    uuid: uuid,
                    progress: progress,
                });
            }, 100);

            pump().catch((err: unknown) => {
                this.log("Error during file transfer:", uuid, err);
                if (progressInterval) clearInterval(progressInterval);
            });
        };
    }

    private setupReceivingDataChannel() {
        this.peerConnection.ondatachannel = event => {
            this.log("Received data channel");

            const dataChannel = event.channel;
            const receivedChunks: (ArrayBuffer | Blob)[] = [];
            let fileMeta: { name: string; size: number; uuid: string } | null =
                null;
            let firstMessage = true;
            let receivedBytes = 0;
            let progressInterval: ReturnType<typeof setInterval> | null = null;
            let statsAcquired = false;

            dataChannel.onmessage = event => {
                if (firstMessage && typeof event.data === "string") {
                    fileMeta = JSON.parse(event.data) as {
                        name: string;
                        size: number;
                        uuid: string;
                    };
                    firstMessage = false;

                    this.transferStats?.acquire();
                    statsAcquired = true;
                    this.log("Received file metadata:", fileMeta);
                    this.emitEvent("fileMetaReceived", {
                        name: fileMeta.name,
                        size: fileMeta.size,
                        uuid: fileMeta.uuid,
                    });

                    // Progress-Interval starten
                    progressInterval = setInterval(() => {
                        this.emitEvent("fileProgress", {
                            uuid: fileMeta!.uuid,
                            progress: Math.min(
                                receivedBytes / fileMeta!.size,
                                1
                            ),
                        });
                    }, 100);
                    return;
                }

                if (typeof event.data === "string" && event.data === "EOF") {
                    const blob = new Blob(receivedChunks);
                    const filename = fileMeta?.name ?? "received-file";

                    // Store the blob for potential re-download
                    if (fileMeta?.uuid) {
                        this.completedDownloads.set(fileMeta.uuid, {
                            blob,
                            filename,
                        });
                    }

                    // Trigger initial download
                    this.triggerDownload(blob, filename);

                    this.log(
                        "File downloaded with TransferID:",
                        fileMeta?.uuid
                    );
                    //this.log("clearing now interval");
                    if (progressInterval) clearInterval(progressInterval);
                    // 100% Progress-Event senden
                    this.emitEvent("fileProgress", {
                        uuid: fileMeta!.uuid,
                        progress: 1.0, // 100% progress
                    });
                } else if (event.data instanceof ArrayBuffer) {
                    receivedChunks.push(event.data);
                    receivedBytes += event.data.byteLength;
                    this.log(
                        "Chunk empfangen, Größe:",
                        event.data.byteLength,
                        "Bytes (ArrayBuffer)"
                    );
                } else if (event.data instanceof Blob) {
                    receivedChunks.push(event.data);
                    receivedBytes += event.data.size;
                    this.log(
                        "Chunk empfangen, Größe:",
                        event.data.size,
                        "Bytes (Blob)"
                    );
                } else {
                    this.log("Unbekannter Nachrichtentyp:", event.data);
                }
            };

            dataChannel.onopen = () => {
                //this.log("Data channel is open");
            };
            dataChannel.onclose = () => {
                if (progressInterval) clearInterval(progressInterval);
                if (statsAcquired) {
                    this.transferStats?.release();
                    statsAcquired = false;
                }
                //this.log("Data channel is closed");
            };
            dataChannel.onerror = error => {
                if (progressInterval) clearInterval(progressInterval);
                this.log("Data channel error: ", error);
            };
        };
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
                this.log("Received REMOTE ICE candidate message");

                const iceCandidateMessage = message as IceCandidateMessage;
                const candidate = iceCandidateMessage.msg.iceCandidate;

                this.log("Adding ICE candidate");

                const [, err] = await errorAsValue(
                    this.peerConnection.addIceCandidate(candidate)
                );

                if (err) {
                    if (!this.ignoreOffer) {
                        new Error(
                            "Failed to add ICE candidate (not ignoring them, because ignoreOffer is " +
                                this.ignoreOffer +
                                ")"
                        );
                        this.log("Error: ", err);
                    } else {
                        this.log(
                            "Ignoring remote ICE candidate because ignoreOffer = " +
                                this.ignoreOffer +
                                " and the related SDP offer was rejected"
                        );
                    }
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

                this.log("Setting REMOTE DESCRIPTION");

                const [,] = await errorAsValue(
                    this.peerConnection.setRemoteDescription(description)
                );
                this.isSettingRemoteAnswerPending = false;

                if (description.type === "offer") {
                    this.log("Creating ANSWER...");
                    this.log("Setting LOCAL DESCRIPTION");

                    await this.peerConnection.setLocalDescription();
                    const descriptionMessage = new SdpMessage({
                        remoteToken: this.remoteToken,
                        description: this.peerConnection.localDescription!,
                    });

                    this.log("Sending SDP answer...");

                    this.signalingChannel.sendMessage(descriptionMessage);
                }
            }
        );
    }

    private handleNegotiationNeeded() {
        this.peerConnection.onnegotiationneeded = async () => {
            this.log("Making SDP offer...");

            this.makingOffer = true;

            this.log("Setting local description");

            const [, err] = await errorAsValue(
                this.peerConnection.setLocalDescription()
            );

            if (!err) {
                const descriptionMessage = new SdpMessage({
                    remoteToken: this.remoteToken,
                    description: this.peerConnection.localDescription!,
                });

                this.log("Sending SDP offer...");

                this.signalingChannel.sendMessage(descriptionMessage);
            } else {
                this.log("Error during setting local description: ", err);
            }

            this.makingOffer = false;
        };
    }

    private handleIncomingICECandidates() {
        this.peerConnection.onicecandidate = event => {
            this.log("STUN Server ICE Candidate received, forwarding");

            if (event.candidate) {
                const iceCandidateMessage = new IceCandidateMessage({
                    remoteToken: this.remoteToken,
                    iceCandidate: event.candidate,
                });
                this.signalingChannel.sendMessage(iceCandidateMessage);
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
        this.transferStats?.stop();
        this.transferStats = undefined;

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

    /**
     * Sets up the event listeners for emitted WebRTC events from the peer connection.
     */
    private setupEmittedWebRTCEvents() {
        this.peerConnection.onconnectionstatechange = ev => {
            this.log("Event triggered", ev);
            this.emitEvent(
                "connectionstatechange",
                this.peerConnection.connectionState
            );
        };
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
