import { assert } from "../util/Assert";
import errorAsValue from "../util/ErrorAsValue";
import {
    ClientToken,
    TypedMessage,
    WebSocketService,
} from "./WebSocketService";
import { MessageType } from "./MessageType";
import { Logger } from "../util/Logger";
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
    private readonly logger = new Logger("WebRTCConnection");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);
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
    // TODO:
    // allocatet RAM from receiver freigeben bei Beendigung der Übertragung
    // Progressbar beim Sender hängt der vom Empfänger hinterher, und die vom Empfänger geht smoother als Sender Bar
    public constructor(
        signalingChannel: WebSocketService,
        remoteToken: ClientToken
    ) {
        this.logger.setEnabled(true); // Disable logging by default, can be enabled later if needed
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
                        this.log(
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
                            // 100% Progress-Event senden
                            this.emitEvent("fileProgress", {
                                uuid: uuid,
                                progress: 1.0, // 100% progress
                            });
                            dataChannel.send("EOF");
                            this.log(
                                "File sent, EOF reached, closing data channel"
                            );
                            dataChannel.close();
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
                    this.log(
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
                this.emitEvent("fileProgress", {
                    uuid: uuid,
                    progress: Math.min(offset / file.size, 1).toFixed(2),
                });
            }, 100);

            sendNextChunk(); // Start reading and sending first chunk
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                    this.log("Received file metadata:", fileMeta);
                    this.emitEvent("fileMetaReceived", {
                        name: fileMeta.name,
                        size: fileMeta.size,
                        uuid: fileMeta.uuid,
                    });

                    // Progress-Interval starten
                    progressInterval = setInterval(() => {
                        /*    this.emitEvent("fileProgress", {
                            uuid: fileMeta!.uuid,
                            progress: Math.min(
                                receivedBytes / fileMeta!.size,
                                1
                            ),
                        });*/
                    }, 100);
                    return;
                }

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
                    this.log("File downloaded");
                    this.log("clearing now interval");
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
                this.log("Data channel is open");
            };
            dataChannel.onclose = () => {
                if (progressInterval) clearInterval(progressInterval);
                this.log("Data channel is closed");
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

                const iceCandidateMessage = message.msg as IceCandidateMessage;
                const candidate = iceCandidateMessage.iceCandidate;

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
                const sdpMessage = message.msg as SDPMessage;
                const description = sdpMessage.description;

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
                    const descriptionMessage: TypedMessage<SDPMessage> = {
                        type: MessageType.SDP,
                        msg: {
                            remoteToken: this.remoteToken,
                            description: this.peerConnection.localDescription!,
                        },
                    };

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
                const descriptionMessage: TypedMessage<SDPMessage> = {
                    type: MessageType.SDP,
                    msg: {
                        remoteToken: this.remoteToken,
                        description: this.peerConnection.localDescription!,
                    },
                };

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
