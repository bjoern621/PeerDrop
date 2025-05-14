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

        this.handleIncomingICECandidates();
        this.handleNegotiationNeeded();
        this.handleSDPPackage();
        this.handleRemoteICECandidates();

        this.testMethodDataChannelInitializier();
    }

    public testMethodDataChannelInitializier() {
        this.peerConnection.createDataChannel(
            "testing, testing, attention please"
        );
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
        this.peerConnection.onicecandidate = null;
        this.peerConnection.onnegotiationneeded = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.ondatachannel = null;

        this.signalingChannel.unsubscribeMessage(
            ICE_CANDIDATE_MESSAGE_TYPE,
            this.handleIncomingICECandidates
        );
        this.signalingChannel.unsubscribeMessage(
            SDP_MESSAGE_TYPE,
            this.handleSDPPackage
        );
    }
}
