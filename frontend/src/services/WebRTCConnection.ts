import { assert } from "../util/Assert";
import errorAsValue from "../util/ErrorAsValue";
import {
    ClientToken,
    TypedMessage,
    WebSocketService,
} from "./WebSocketService";

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

const ICE_CANDIDATE_MESSAGE_TYPE: string = "ice-candidate";
const SDP_MESSAGE_TYPE: string = "sdp-message";

export class WebRTCConnection {
    private readonly remoteToken: ClientToken;
    private readonly signalingChannel: WebSocketService;
    private readonly peerConnection: RTCPeerConnection;

    private makingOffer: boolean = false;
    private ignoreOffer: boolean = false;
    private isSettingRemoteAnswerPending: boolean = false;
    private readonly polite: boolean;

    public constructor(
        signalingChannel: WebSocketService,
        remoteToken: ClientToken
    ) {
        this.remoteToken = remoteToken;
        this.signalingChannel = signalingChannel;
        this.polite =
            signalingChannel.getLocalClientToken()! < this.remoteToken;
        this.peerConnection = new RTCPeerConnection(iceServers);
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
        console.log(
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

                    console.log("File sent, EOF reached, closing data channel");

                    dataChannel.close();
                }
            };

            sendNextChunk(); //start reading and sending first chunk
        };
    }

    private setupReceivingDataChannel() {
        this.peerConnection.ondatachannel = event => {
            console.log("Received data channel");

            const dataChannel = event.channel;
            const receivedChunks: ArrayBuffer[] = [];

            dataChannel.onmessage = event => {
                if (typeof event.data === "string" && event.data === "EOF") {
                    const blob = new Blob(receivedChunks);

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
                    (window as any).lastReceivedFile = blob;
                    console.log(
                        "Empfangener Blob im window.lastReceivedFile:",
                        blob
                    );
                    // Optional: Direkt als Text oder URL anzeigen
                    blob.text()
                        .then(text =>
                            console.log("Datei-Inhalt als Text:", text)
                        )
                        .catch(error =>
                            console.error("Error reading blob as text:", error)
                        );
                    // Oder als URL anzeigen
                    const url = URL.createObjectURL(blob);
                    console.log("Blob-URL:", url);
                } else if (event.data instanceof ArrayBuffer) {
                    receivedChunks.push(event.data);
                    console.log(
                        "Chunk empfangen, Größe:",
                        event.data.byteLength
                    );
                } else {
                    console.log("Unbekannter Nachrichtentyp:", event.data);
                }
            };
            dataChannel.onopen = () => {
                console.log("Data channel is open");
            };
            dataChannel.onclose = () => {
                console.log("Data channel is closed");
            };
            dataChannel.onerror = error => {
                console.error("Data channel error: ", error);
            };
        };
    }

    /**
     * To trigger the negotiationneeded event, we create a data channel.
     * After that, the WebRTC Connection is goint to start (handshake).
     */
    private initializePeerConnection() {
        this.peerConnection.createDataChannel("init");
    }

    private handleRemoteICECandidates() {
        this.signalingChannel.subscribeMessage(
            ICE_CANDIDATE_MESSAGE_TYPE,
            async message => {
                console.log("Received REMOTE ICE candidate message");

                const iceCandidateMessage = message.msg as IceCandidateMessage;
                const candidate = iceCandidateMessage.iceCandidate;

                console.log("Adding ICE candidate");

                const [, err] = await errorAsValue(
                    this.peerConnection.addIceCandidate(candidate)
                );
                if (err) {
                    console.error("Error adding ICE candidate: ", err);
                }
            }
        );
    }

    private handleSDPPackage() {
        this.signalingChannel.subscribeMessage(
            SDP_MESSAGE_TYPE,
            async message => {
                const sdpMessage = message.msg as SDPMessage;
                const description = sdpMessage.description;

                console.log("Received SDP ", description.type, " message");

                const readyForOffer =
                    !this.makingOffer &&
                    (this.peerConnection.signalingState === "stable" ||
                        this.isSettingRemoteAnswerPending);

                const offerCollision =
                    description.type === "offer" && !readyForOffer;

                // ignoreOffer is true, if offerCollision occurs and if this peer is impolite (ignoring SDP and all incoming ICE candidates)
                this.ignoreOffer = !this.polite && offerCollision;
                if (this.ignoreOffer) {
                    console.log(
                        "IGNORING offer, because this peer is impolite and offerCollision occurred"
                    );

                    return;
                }

                this.isSettingRemoteAnswerPending =
                    description.type === "answer";

                console.log("Setting REMOTE DESCRIPTION");

                const [,] = await errorAsValue(
                    this.peerConnection.setRemoteDescription(description)
                );
                this.isSettingRemoteAnswerPending = false;

                if (description.type === "offer") {
                    console.log("Creating ANSWER...");
                    console.log("Setting LOCAL DESCRIPTION");

                    await this.peerConnection.setLocalDescription();
                    const descriptionMessage: TypedMessage<SDPMessage> = {
                        type: SDP_MESSAGE_TYPE,
                        msg: {
                            remoteToken: this.remoteToken,
                            description: this.peerConnection.localDescription!,
                        },
                    };

                    console.log("Sending SDP answer...");

                    this.signalingChannel.sendMessage(descriptionMessage);
                }
            }
        );
    }

    private handleNegotiationNeeded() {
        this.peerConnection.onnegotiationneeded = async () => {
            console.log("Making SDP offer...");

            this.makingOffer = true;

            console.log("Setting local description");

            await this.peerConnection.setLocalDescription();

            const descriptionMessage: TypedMessage<SDPMessage> = {
                type: SDP_MESSAGE_TYPE,
                msg: {
                    remoteToken: this.remoteToken,
                    description: this.peerConnection.localDescription!,
                },
            };

            console.log("Sending SDP offer...");

            this.signalingChannel.sendMessage(descriptionMessage);

            this.makingOffer = false;
        };
    }

    private handleIncomingICECandidates() {
        this.peerConnection.onicecandidate = event => {
            console.log("STUN Server ICE Candidate received, forwarding");

            if (event.candidate) {
                const iceCandidateMessage: TypedMessage<IceCandidateMessage> = {
                    type: ICE_CANDIDATE_MESSAGE_TYPE,
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
        console.log("Closing peer connection");

        this.peerConnection.close();

        assert(this.peerConnection.connectionState === "closed");

        this.peerConnection.onicecandidate = null;
        this.peerConnection.onnegotiationneeded = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.ondatachannel = null;

        const iceHandlers = this.signalingChannel.getHandlers(
            ICE_CANDIDATE_MESSAGE_TYPE
        );

        if (iceHandlers) {
            iceHandlers.forEach(handler => {
                this.signalingChannel.unsubscribeMessage(
                    ICE_CANDIDATE_MESSAGE_TYPE,
                    handler
                );
            });
        }

        const spdHandlers = this.signalingChannel.getHandlers(SDP_MESSAGE_TYPE);

        if (spdHandlers) {
            spdHandlers.forEach(handler => {
                this.signalingChannel.unsubscribeMessage(
                    SDP_MESSAGE_TYPE,
                    handler
                );
            });
        }
    }
}
