import { TypedMessage, WebSocketService } from "./WebSocketService";

const iceServers: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ],
};


export class WebRTCConnection {
    
    private peerConnection: RTCPeerConnection;
    private makingOffer: boolean = false;
    private ignoreOffer: boolean = false;
    private isSettingRemoteAnswerPending: boolean = false;
    private polite: boolean;


    constructor(private signalingChannel: WebSocketService, polite: boolean) {

        this.polite = polite;

        this.peerConnection = new RTCPeerConnection(iceServers);
        this.handleIncomingICECandidates(); 
        this.handleNegotiationNeeded();
        this.setupSignalListeners();
        this.handleRemoteICECandidates();
    }


    private handleRemoteICECandidates() {
        this.signalingChannel.subscribeMessage("candidate", async (message) => {
                const candidate = message.msg as RTCIceCandidateInit;

                try {
                    await this.peerConnection.addIceCandidate(candidate);
                } catch(err) {
                    console.error("Error adding ICE candidate: ", err);
                }
            }
        );
    }

    private setupSignalListeners() {
        this.signalingChannel.subscribeMessage("sdp-message", async (message) => {
                try {
                    //Getting the value of the msg from TypedMessage<RTCSessionDescriptionInit> (offer or answer)
                    const description = message.msg as RTCSessionDescriptionInit;

                    const readyForOffer =
                        !this.makingOffer &&
                        (this.peerConnection.signalingState === "stable" || this.isSettingRemoteAnswerPending);

                    const offerCollision = description.type === "offer" && !readyForOffer;

                    // ignoreOffer is true, if offerCollision occurs and if this peer is impolite (ignoring SDP and all incoming ICE candidates)
                    this.ignoreOffer = !this.polite && offerCollision;
                    if(this.ignoreOffer) {
                        return;
                    }

                    this.isSettingRemoteAnswerPending = description.type === "answer";
                    await this.peerConnection.setRemoteDescription(description);
                    this.isSettingRemoteAnswerPending = false;

                    if(description.type === "offer") {
                        await this.peerConnection.setLocalDescription();
                        const descriptionMessage: TypedMessage<RTCSessionDescriptionInit> = {
                            type: "sdp-message",
                            msg: this.peerConnection.localDescription!
                        };

                        this.signalingChannel.sendMessage(descriptionMessage);
                    }

                } catch(err) {
                    console.error(err);
                }

            }
        );
    }

    private handleNegotiationNeeded() {
        this.peerConnection.onnegotiationneeded = async () => {
            try{
                this.makingOffer = true;
                await this.peerConnection.setLocalDescription();

                const descriptionMessage: TypedMessage<RTCSessionDescriptionInit> = {
                    type: "offer",
                    msg: this.peerConnection.localDescription!  //RTCSessionDescription implements RTCSessionDescriptionInit
                };

                this.signalingChannel.sendMessage(descriptionMessage);
            } catch(err) {
                console.error("Error setting local description", err);
            } finally {
                this.makingOffer = false;
            }
        };
    }


    private handleIncomingICECandidates() {
        this.peerConnection.onicecandidate = (event) => {
            if(event.candidate) {
                const iceCandidateMessage: TypedMessage<RTCIceCandidateInit> = {
                    type: "new-ice-candidate",
                    msg: event.candidate
                };
                this.signalingChannel.sendMessage(iceCandidateMessage);
            }
        };
    }




}



