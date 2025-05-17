import { assert } from "../util/Assert";
import errorAsValue from "../util/ErrorAsValue";
import {
    ClientToken,
    TypedMessage,
    WebSocketService,
} from "./WebSocketService";
import { MessageType } from "./MessageType";

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
            MessageType.ICE_CANDIDATE,
            async message => {
                console.log("Received REMOTE ICE candidate message");

                const iceCandidateMessage = message.msg as IceCandidateMessage;
                const candidate = iceCandidateMessage.iceCandidate;

                console.log("Adding ICE candidate");

                console.warn(candidate);

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
                        console.error("Error: ", err);
                    } else {
                        console.log(
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

                console.warn(description);

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
                        type: MessageType.SDP,
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
                type: MessageType.SDP,
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
    }
}
