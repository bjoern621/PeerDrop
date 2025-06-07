import { assert } from "../util/Assert";
import errorAsValue from "../util/ErrorAsValue";
import {
    ClientToken,
    TypedMessage,
    WebSocketService,
} from "./WebSocketService";
import { MessageType } from "./MessageType";
import { log, setLogEnabled } from "../util/Logger";
import { Observable } from "../util/observer/Observable";

const iceServers: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export type IceCandidateMessage = {
    remoteToken: ClientToken;
    iceCandidate: RTCIceCandidateInit;
};

export type SDPMessage = {
    remoteToken: ClientToken;
    description: RTCSessionDescriptionInit;
};

export class WebRTCConnection {
    private readonly remoteToken: ClientToken;
    private readonly signalingChannel: WebSocketService;
    private readonly peerConnection: RTCPeerConnection;

    private readonly eventHandlers: Map<string, Observable<unknown>> =
        new Map();

    // Perfect Negotiation Pattern variables
    private makingOffer: boolean = false;
    private ignoreOffer: boolean = false;
    private isSettingRemoteAnswerPending: boolean = false;
    private readonly polite: boolean;

    public constructor(
        signalingChannel: WebSocketService,
        remoteToken: ClientToken
    ) {
        setLogEnabled(false); // Disable logging by default, can be enabled later if needed
        this.remoteToken = remoteToken;
        this.signalingChannel = signalingChannel;
        this.polite =
            signalingChannel.getLocalClientToken()! < this.remoteToken;
        this.peerConnection = new RTCPeerConnection(iceServers);

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
     * This method creates a new DataChannel for the given file and transmits the file in 16 KB chunks.
     * Each chunk is read asynchronously using a FileReader and sent as an ArrayBuffer.
     * After the entire file has been sent, an "EOF" message is transmitted to signal the end of the file,
     * and the DataChannel is closed.
     *
     * @param file The file to be sent to the remote peer.
     */
    public sendFileOverDataChannel(file: File, uuid: string) {
        log(
            `File is ${[
                file.name,
                file.type,
                file.size,
                file.lastModified,
            ].join(" ")}`
        );
        const dataChannel = this.peerConnection.createDataChannel(uuid);

        dataChannel.binaryType = "arraybuffer";
        const chunkSize = 16 * 1024; //16 KB
        let offset = 0;

        // Set a buffer threshold - if bufferedAmount exceeds this, wait before sending more
        const bufferThreshold = 1024 * 1024 * 4; // 4MB buffer threshold
        let waitingForBuffer = false;

        let progressInterval: ReturnType<typeof setInterval> | null = null;

        dataChannel.onopen = () => {
            // Send first Metadata about the file
            const meta = JSON.stringify({
                name: file.name,
                size: file.size,
                uuid: uuid,
            });
            dataChannel.send(meta);

            const reader = new FileReader();

            reader.onload = e => {
                if (e.target && e.target.result) {
                    dataChannel.send(e.target.result as ArrayBuffer);
                    offset += (e.target.result as ArrayBuffer).byteLength;
                    sendNextChunk(); //reads the next chunk, which triggers again the onload event
                }
            };

            const sendNextChunk = () => {
                if (offset < file.size) {
                    // Check if buffer is getting full before sending more data
                    if (dataChannel.bufferedAmount > bufferThreshold) {
                        waitingForBuffer = true;
                        log(
                            `Buffer full (${dataChannel.bufferedAmount} bytes), waiting...`
                        );
                        return; // Exit and wait for the bufferedamountlow event
                    }

                    const slice = file.slice(offset, offset + chunkSize);
                    reader.readAsArrayBuffer(slice);
                } else {
                    // Warten darauf, dass der Buffer leer ist, bevor EOF gesendet wird
                    const waitForBuffer = () => {
                        if (dataChannel.bufferedAmount > 0) {
                            setTimeout(waitForBuffer, 10);
                        } else {
                            dataChannel.send("EOF");
                            log("File sent, EOF reached, closing data channel");
                            dataChannel.close();
                            // evtl. 100% Progress-Event senden
                        }
                    };
                    waitForBuffer();
                }
            };

            // Set up bufferedamountlow event to continue when buffer decreases
            dataChannel.bufferedAmountLowThreshold = 512; // 512 KB

            dataChannel.onbufferedamountlow = () => {
                if (waitingForBuffer) {
                    waitingForBuffer = false;
                    log(
                        `Content in buffer decreased to ${dataChannel.bufferedAmount} bytes, continuing...`
                    );
                    sendNextChunk();
                }
            };

            dataChannel.onclose = () => {
                if (progressInterval) clearInterval(progressInterval);
            };

            // Progress-Interval starten
            progressInterval = setInterval(() => {
                const progress = Math.min(offset / file.size, 1).toFixed(2);

                this.emitEvent("fileProgress", {
                    uuid: uuid,
                    progress: parseFloat(progress),
                });
            }, 100);

            sendNextChunk(); // Start reading and sending first chunk
        };
    }

    private setupReceivingDataChannel() {
        this.peerConnection.ondatachannel = event => {
            log("Received data channel");

            const dataChannel = event.channel;
            const receivedChunks: (ArrayBuffer | Blob)[] = [];
            let fileMeta: { name: string; size: number; uuid: string } | null =
                null;
            let firstMessage = true;
            let receivedBytes = 0;
            let progressInterval: ReturnType<typeof setInterval> | null = null;

            dataChannel.onmessage = event => {
                if (firstMessage && typeof event.data === "string") {
                    fileMeta = JSON.parse(event.data) as {
                        name: string;
                        size: number;
                        uuid: string;
                    };
                    firstMessage = false;
                    log("Received file metadata:", fileMeta);
                    this.emitEvent("fileMetaReceived", {
                        name: fileMeta.name,
                        size: fileMeta.size,
                        uuid: fileMeta.uuid,
                    });
                    return;
                }

                // Progress-Interval starten
                progressInterval = setInterval(() => {
                    assert(
                        fileMeta,
                        "fileMeta should be defined when progress is emitted"
                    );
                    this.emitEvent("fileProgress", {
                        uuid: fileMeta.uuid,
                        progress: Math.min(receivedBytes / fileMeta.size, 1),
                    });
                }, 100);

                if (typeof event.data === "string" && event.data === "EOF") {
                    const blob = new Blob(receivedChunks);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = fileMeta?.name ?? "received-file";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    log("File downloaded");
                } else if (event.data instanceof ArrayBuffer) {
                    receivedChunks.push(event.data);
                    receivedBytes += event.data.byteLength;
                    log(
                        "Chunk empfangen, Größe:",
                        event.data.byteLength,
                        "Bytes (ArrayBuffer)"
                    );
                } else if (event.data instanceof Blob) {
                    receivedChunks.push(event.data);
                    receivedBytes += event.data.size;
                    log(
                        "Chunk empfangen, Größe:",
                        event.data.size,
                        "Bytes (Blob)"
                    );
                } else {
                    log("Unbekannter Nachrichtentyp:", event.data);
                }
            };

            dataChannel.onopen = () => {
                log("Data channel is open");
            };
            dataChannel.onclose = () => {
                if (progressInterval) clearInterval(progressInterval);
                log("Data channel is closed");
            };
            dataChannel.onerror = error => {
                if (progressInterval) clearInterval(progressInterval);
                log("Data channel error: ", error);
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
                log("Received REMOTE ICE candidate message");

                const iceCandidateMessage = message.msg as IceCandidateMessage;
                const candidate = iceCandidateMessage.iceCandidate;

                log("Adding ICE candidate");

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
                        log("Error: ", err);
                    } else {
                        log(
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
                const sdpMessage = message.msg as SDPMessage;
                const description = sdpMessage.description;

                log("Received SDP ", description.type, " message");

                const readyForOffer =
                    !this.makingOffer &&
                    (this.peerConnection.signalingState === "stable" ||
                        this.isSettingRemoteAnswerPending);

                const offerCollision =
                    description.type === "offer" && !readyForOffer;

                // ignoreOffer is true, if offerCollision occurs and if this peer is impolite (ignoring SDP and all incoming ICE candidates)
                this.ignoreOffer = !this.polite && offerCollision;
                if (this.ignoreOffer) {
                    log(
                        "IGNORING offer, because this peer is impolite and offerCollision occurred"
                    );

                    return;
                }

                this.isSettingRemoteAnswerPending =
                    description.type === "answer";

                log("Setting REMOTE DESCRIPTION");

                const [,] = await errorAsValue(
                    this.peerConnection.setRemoteDescription(description)
                );
                this.isSettingRemoteAnswerPending = false;

                if (description.type === "offer") {
                    log("Creating ANSWER...");
                    log("Setting LOCAL DESCRIPTION");

                    await this.peerConnection.setLocalDescription();
                    const descriptionMessage: TypedMessage<SDPMessage> = {
                        type: MessageType.SDP,
                        msg: {
                            remoteToken: this.remoteToken,
                            description: this.peerConnection.localDescription!,
                        },
                    };

                    log("Sending SDP answer...");

                    this.signalingChannel.sendMessage(descriptionMessage);
                }
            }
        );
    }

    private handleNegotiationNeeded() {
        this.peerConnection.onnegotiationneeded = async () => {
            log("Making SDP offer...");

            this.makingOffer = true;

            log("Setting local description");

            const [, err] = await errorAsValue(
                this.peerConnection.setLocalDescription()
            );

            if (!err) {
                const descriptionMessage: TypedMessage<SDPMessage> = {
                    type: MessageType.SDP,
                    msg: {
                        remoteToken: this.remoteToken,
                        description: this.peerConnection.localDescription!,
                    },
                };

                log("Sending SDP offer...");

                this.signalingChannel.sendMessage(descriptionMessage);
            } else {
                log("Error during setting local description: ", err);
            }

            this.makingOffer = false;
        };
    }

    private handleIncomingICECandidates() {
        this.peerConnection.onicecandidate = event => {
            log("STUN Server ICE Candidate received, forwarding");

            if (event.candidate) {
                const iceCandidateMessage: TypedMessage<IceCandidateMessage> = {
                    type: MessageType.ICE_CANDIDATE,
                    msg: {
                        remoteToken: this.remoteToken,
                        iceCandidate: event.candidate,
                    },
                };
                this.signalingChannel.sendMessage(iceCandidateMessage);
            }
        };
    }

    public closePeerConnection() {
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
    }

    /**
     * Sets up the event listeners for emitted WebRTC events from the peer connection.
     */
    private setupEmittedWebRTCEvents() {
        this.peerConnection.onconnectionstatechange = ev => {
            log("Event triggered", ev);
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
