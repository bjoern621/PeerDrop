import errorAsValue from "../util/ErrorAsValue";
import { WebRTCConnection } from "./WebRTCConnection";
import { MessageHandler, TypedMessage, WebSocketService, ClientToken } from "./WebSocketService";

export type RemoteTokenMessage = {
    remoteToken: ClientToken;
};

const REMOTE_TOKEN_MESSAGE_TYPE: string = "remote-token";

export class PeerConnectionManager {

    private remoteToken: ClientToken | undefined;
    private connection: WebRTCConnection | undefined;

    constructor(private readonly signaling: WebSocketService) {

        (window as any).PeerConnectionManager = this;

        this.waitForRemoteClientToken();
    }


    /**
     * Waits for the remote peer token to be received via a message of type `REMOTE_TOKEN_MESSAGE_TYPE`.
     *
     * This method subscribes to messages of the specified type and sets the `remoteToken` property
     * when a message containing the remote peer token is received. Once the remote token is obtained, the
     * subscription to the message type is automatically removed.
     */
    private waitForRemoteClientToken() {
        const handleRemoteTokenMessage = (
            message: TypedMessage<RemoteTokenMessage>
        ) => {
            console.log("Received remote token:", message.msg.remoteToken);

            this.remoteToken = message.msg.remoteToken;

            this.signaling.unsubscribeMessage(
                REMOTE_TOKEN_MESSAGE_TYPE,
                handleRemoteTokenMessage as MessageHandler
            );

            this.connection = new WebRTCConnection(this.signaling, this.remoteToken);
        };

        this.signaling.subscribeMessage(
            REMOTE_TOKEN_MESSAGE_TYPE,
            handleRemoteTokenMessage as MessageHandler
        );
    }


    /**
     * Stores the remote peer's token locally and sends a message to the signaling server containing this token.
     * The signaling server then swaps the `msg.remoteToken` with the token of the sender (the peer that sent the message),
     * effectively making the sender's token the `msg.remoteToken` for the recipient.
     * Finally all (only one) handlers for the `REMOTE_TOKEN_MESSAGE_TYPE` are unsubscribed fot this instance.
     *
     * @param otherPeerToken The token of the other peer as a strring.
     */
    public async sendTokenToRemotePeer(otherPeerToken: string) {
        const otherToken: ClientToken = otherPeerToken;

        const tokenMessage: TypedMessage<RemoteTokenMessage> = {
            type: REMOTE_TOKEN_MESSAGE_TYPE,
            msg: {
                remoteToken: otherToken,
            },
        };

        const [, err] = await errorAsValue(
            this.signaling.sendMessageAndWaitForResponse<RemoteTokenMessage>(tokenMessage)
        );
        if (err) {
            console.error("Error sending remote token:", err.message);
            return;
        }

        this.remoteToken = otherToken;

        console.log("Sent remote token to signaling server:", otherToken);

        //unsubscribe all handlers for the REMOTE_TOKEN_MESSAGE_TYPE
        const handlersRemoteToken = this.signaling.getHandlers(REMOTE_TOKEN_MESSAGE_TYPE);
        if (handlersRemoteToken) {
            handlersRemoteToken.forEach(handler => {
                this.signaling.unsubscribeMessage(REMOTE_TOKEN_MESSAGE_TYPE, handler);
            });

        this.connection = new WebRTCConnection(this.signaling, this.remoteToken);

        this.connection.testMethodDataChannelInitializier();
    }

    }

    public getConnection() {
        return this.connection;
    }
}