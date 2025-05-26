import { assert } from "../util/Assert";
import errorAsValue from "../util/ErrorAsValue";
import {
    ClientToken,
    TypedMessage,
    WebSocketService,
} from "./WebSocketService";
import { MessageType } from "./MessageType";
import mitt, { Emitter } from "mitt";
import { log, setLogEnabled } from "../util/Logger";

const iceServers: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Define the events that can be emitted by the WebRTCConnection class
type WebRTCConnectionEvents = {
    connectionstatechange: string;
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
    private readonly emitter: Emitter<WebRTCConnectionEvents> =
        mitt<WebRTCConnectionEvents>();

    private makingOffer: boolean = false;
    private ignoreOffer: boolean = false;
    private isSettingRemoteAnswerPending: boolean = false;
    private readonly polite: boolean;

    public constructor(
        signalingChannel: WebSocketService,
        remoteToken: ClientToken
    ) {
        setLogEnabled(true); // Disable logging by default, can be enabled later if needed
        this.remoteToken = remoteToken;
        this.signalingChannel = signalingChannel;
        this.polite =
            signalingChannel.getLocalClientToken()! < this.remoteToken;
        this.peerConnection = new RTCPeerConnection(iceServers);

        this.setupEmittedEvents();

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
    public sendFileOverDataChannel(file: File) {
        log(
            `File is ${[
                file.name,
                file.size,
                file.type,
                file.lastModified,
            ].join(" ")}`
        );
        const dataChannel = this.peerConnection.createDataChannel(
            `file-${file.name}`
        );

        dataChannel.binaryType = "arraybuffer";
        const chunkSize = 16 * 1024; //16 KB
        let offset = 0;

        dataChannel.onopen = () => {
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
                    const slice = file.slice(offset, offset + chunkSize);
                    reader.readAsArrayBuffer(slice); //triggers the onload event on the reader
                } else {
                    dataChannel.send("EOF");

                    log("File sent, EOF reached, closing data channel");

                    dataChannel.close();
                }
            };

            sendNextChunk(); //start reading and sending first chunk
        };
    }

    private setupReceivingDataChannel() {
        this.peerConnection.ondatachannel = event => {
            log("Received data channel");

            const dataChannel = event.channel;
            const receivedChunks: ArrayBuffer[] = [];

            dataChannel.onmessage = event => {
                if (typeof event.data === "string" && event.data === "EOF") {
                    const blob = new Blob(receivedChunks);

                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "received-file";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    log("File downloaded");
                } else if (event.data instanceof ArrayBuffer) {
                    receivedChunks.push(event.data);
                    log("Chunk empfangen, Größe:", event.data.byteLength);
                } else {
                    log("Unbekannter Nachrichtentyp:", event.data);
                }
            };
            dataChannel.onopen = () => {
                log("Data channel is open");
            };
            dataChannel.onclose = () => {
                log("Data channel is closed");
            };
            dataChannel.onerror = error => {
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
        this.emitter.emit("connectionstatechange", "closed");
    }

    /**
     * Sets up the event listeners for emitted events from the peer connection.
     * This includes listening for changes in the connection state.
     */
    private setupEmittedEvents() {
        this.peerConnection.onconnectionstatechange = ev => {
            log("Event triggered", ev);
            this.emitter.emit(
                "connectionstatechange",
                this.peerConnection.connectionState
            );
        };
    }

    public on<K extends keyof WebRTCConnectionEvents>(
        event: K,
        handler: (event: WebRTCConnectionEvents[K]) => void
    ) {
        this.emitter.on(event, handler);
    }

    public off<K extends keyof WebRTCConnectionEvents>(
        event: K,
        handler: (event: WebRTCConnectionEvents[K]) => void
    ) {
        this.emitter.off(event, handler);
    }

    public emit<K extends keyof WebRTCConnectionEvents>(
        event: K,
        data: WebRTCConnectionEvents[K]
    ) {
        this.emitter.emit(event, data);
    }

    public getPeerConnection(): RTCPeerConnection {
        return this.peerConnection;
    }
}
