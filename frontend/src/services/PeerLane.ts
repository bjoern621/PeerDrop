import errorAsValue from "../util/ErrorAsValue";
import { ClientToken, WebSocketService } from "./WebSocketService";
import { IceCandidateMessage } from "../types/rtc/IceCandidateMessage";
import { SdpMessage } from "../types/rtc/SdpMessage";
import { Logger } from "../util/Logger";

/**
 * One RTCPeerConnection to a remote peer, negotiated with the perfect
 * negotiation pattern over the signaling channel. Every SDP and ICE message
 * carries the lane index, so two peers keep several connections apart.
 * Each lane runs its own SCTP association with its own congestion control.
 */
export class PeerLane {
    private readonly logger = new Logger("PeerLane");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);

    public readonly peerConnection: RTCPeerConnection;

    private makingOffer = false;
    private ignoreOffer = false;
    private isSettingRemoteAnswerPending = false;

    public constructor(
        public readonly index: number,
        private readonly signaling: WebSocketService,
        private readonly remoteToken: ClientToken,
        private readonly polite: boolean,
        iceServers: RTCIceServer[]
    ) {
        this.logger.setEnabled(false);
        this.peerConnection = new RTCPeerConnection({ iceServers });
        this.peerConnection.onnegotiationneeded = () => void this.sendOffer();
        this.peerConnection.onicecandidate = event => {
            if (event.candidate) {
                this.signaling.sendMessage(
                    new IceCandidateMessage({
                        remoteToken: this.remoteToken,
                        iceCandidate: event.candidate,
                        lane: this.index,
                    })
                );
            }
        };
    }

    /**
     * Applies a description the remote peer sent for this lane and answers an
     * offer. The impolite peer drops an offer that collides with its own.
     */
    public async handleRemoteDescription(
        description: RTCSessionDescriptionInit
    ) {
        this.log("Received SDP", description.type, "on lane", this.index);

        const readyForOffer =
            !this.makingOffer &&
            (this.peerConnection.signalingState === "stable" ||
                this.isSettingRemoteAnswerPending);
        const offerCollision = description.type === "offer" && !readyForOffer;

        this.ignoreOffer = !this.polite && offerCollision;
        if (this.ignoreOffer) {
            this.log("Ignoring colliding offer on lane", this.index);
            return;
        }

        this.isSettingRemoteAnswerPending = description.type === "answer";
        await errorAsValue(
            this.peerConnection.setRemoteDescription(description)
        );
        this.isSettingRemoteAnswerPending = false;

        if (description.type === "offer") {
            await this.peerConnection.setLocalDescription();
            this.sendLocalDescription();
        }
    }

    /**
     * Adds a candidate the remote peer sent for this lane. A candidate of an
     * offer this peer ignored fails silently.
     */
    public async handleRemoteCandidate(candidate: RTCIceCandidateInit) {
        const [, err] = await errorAsValue(
            this.peerConnection.addIceCandidate(candidate)
        );
        if (err && !this.ignoreOffer) {
            this.log("Failed to add ICE candidate:", err);
        }
    }

    public close() {
        this.peerConnection.close();
    }

    private async sendOffer() {
        this.makingOffer = true;
        const [, err] = await errorAsValue(
            this.peerConnection.setLocalDescription()
        );
        if (err) {
            this.log("Error during setting local description:", err);
        } else {
            this.sendLocalDescription();
        }
        this.makingOffer = false;
    }

    private sendLocalDescription() {
        this.signaling.sendMessage(
            new SdpMessage({
                remoteToken: this.remoteToken,
                description: this.peerConnection.localDescription!,
                lane: this.index,
            })
        );
    }
}
