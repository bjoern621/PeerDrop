import { assert } from "../util/Assert";
import { WebRTCConnection } from "./WebRTCConnection";
import {
    MessageHandler,
    TypedMessage,
    WebSocketService,
    ClientToken,
} from "./WebSocketService";
import { MessageType } from "./MessageType";
import { IObservable, Observable } from "../util/observer/Observable";
import { Observer } from "../util/observer/Observer";

export type RemoteTokenMessage = {
    requestID?: string;
    remoteToken: ClientToken;
};

type ErrorMessage = {
    requestID: string;
    description: string;
    expected?: string;
    actual?: string;
};

type SuccessMessage = {
    requestID: string;
    description: string;
};

// This message is sent to a remote peer to request a connection.
type ConnectionRequestMessage = {
    remoteToken: ClientToken;
};

// This message is the response to a connection request. It may be successful or not.
type ConnectionResponseMessage = {
    accepted: boolean; // true if the connection request was accepted by the remote peer, false otherwise or if the remote peer is not available.
    remoteToken: ClientToken;
};

// This message signals that the local client should immediately establish a WebRTC connection to the specified remote peer. Both peers will receive this message when the server decides they should connect.
type EstablishConnectionMessage = {
    remoteToken: ClientToken;
};

export class PeerConnectionManager implements IObservable<boolean> {
    private expectedRemoteToken: ClientToken | undefined; // The token of the remote peer we accept connections from.
    private webrtcConnection: WebRTCConnection | undefined;

    private readonly waitingObservable: IObservable<boolean> =
        new Observable<boolean>();

    public constructor(private readonly signaling: WebSocketService) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (window as any).PeerConnectionManager = this;

        this.handleConnectionEstablishmentMessages();

        this.handleConnectionRequestMessages();

        this.waitForCloseConnectionRequest();
    }

    public subscribe(observer: Observer<boolean>): void {
        this.waitingObservable.subscribe(observer);
    }

    public unsubscribe(observer: Observer<boolean>): void {
        this.waitingObservable.unsubscribe(observer);
    }

    public notify(data: boolean): void {
        this.waitingObservable.notify(data);
    }

    private handleConnectionResponseMessages() {
        const onConnectionResponseReceived = (
            message: TypedMessage<ConnectionResponseMessage>
        ) => {
            if (this.expectedRemoteToken !== message.msg.remoteToken) {
                return;
            }

            this.signaling.unsubscribeMessage(
                MessageType.CONNECTION_RESPONSE,
                onConnectionResponseReceived as MessageHandler
            );

            if (message.msg.accepted) {
                console.log("ACCEPTED:", message.msg.remoteToken);
                // this.waitingObservable.notify(false);
            } else {
                console.log("REJECTED:", message.msg.remoteToken);
                this.waitingObservable.notify(false);
            }
        };

        this.signaling.subscribeMessage(
            MessageType.CONNECTION_RESPONSE,
            onConnectionResponseReceived as MessageHandler
        );
    }

    private handleConnectionRequestMessages() {
        const onConnectionRequestReceived = (
            message: TypedMessage<EstablishConnectionMessage>
        ) => {
            console.log("DO YOU WANT TO CONNECT TO:", message.msg.remoteToken);

            setTimeout(() => {
                console.log("YES");

                const connectionResponseMessage: TypedMessage<ConnectionResponseMessage> =
                    {
                        type: MessageType.CONNECTION_RESPONSE,
                        msg: {
                            accepted: true,
                            remoteToken: message.msg.remoteToken,
                        },
                    };

                this.signaling.sendMessage(connectionResponseMessage);
            }, 3000);
        };

        this.signaling.subscribeMessage(
            MessageType.CONNECTION_REQUEST,
            onConnectionRequestReceived as MessageHandler
        );
    }

    /**
     * Instantly aborts the current WebRTC connection (if there is one) and establishes a new one with the remote peer.
     */
    private handleConnectionEstablishmentMessages() {
        const onEstablishConnectionReceived = (
            message: TypedMessage<EstablishConnectionMessage>
        ) => {
            this.closePeerConnection();

            this.webrtcConnection = new WebRTCConnection(
                this.signaling,
                message.msg.remoteToken
            );
        };

        this.signaling.subscribeMessage(
            MessageType.ESTABLISH_CONNECTION,
            onEstablishConnectionReceived as MessageHandler
        );
    }

    public requestConnectionToRemotePeer(remoteToken: ClientToken) {
        if (remoteToken.length !== 5) {
            console.warn("Peer token must be 5 characters long.");
            return;
        }

        if (this.signaling.getLocalClientToken() === remoteToken) {
            console.error("Cannot send token to self.");
            return;
        }

        this.expectedRemoteToken = remoteToken;

        const connectionRequestMessage: TypedMessage<ConnectionRequestMessage> =
            {
                type: MessageType.CONNECTION_REQUEST,
                msg: {
                    remoteToken: remoteToken,
                },
            };

        this.handleConnectionResponseMessages();

        this.signaling.sendMessage(connectionRequestMessage);

        console.log("WAITING FOR RESPONSE");

        this.waitingObservable.notify(true);
    }

    /**
     * Sends a message to the signaling server and asynchronously waits for a response.
     *
     * This method:
     * - Sends the provided message (`message`) to the signaling server.
     * - Registers temporary handlers for success and error messages (`SUCCESS_MESSAGE_TYPE` and `ERROR_MESSAGE_TYPE`).
     * - Compares the `requestID` of incoming responses with the sent message to ensure only the matching response is processed.
     * - Removes the handlers after receiving the matching response.
     * - Resolves the promise with the success message or rejects it with an error message.
     *
     * @param message The message to send, including a unique `requestID`.
     * @returns A promise that resolves with the response message (success or error).
     */
    private sendMessageAndWaitForResponse(
        message: TypedMessage<RemoteTokenMessage>
    ): Promise<TypedMessage<ErrorMessage | SuccessMessage>> {
        return new Promise((resolve, reject) => {
            const handlerResponse = (
                response: TypedMessage<ErrorMessage | SuccessMessage>
            ) => {
                const requestID = message.msg.requestID;
                if (response.msg.requestID !== requestID) {
                    console.error(
                        "Received response with different requestID:",
                        response.msg.requestID,
                        "so ignoring it"
                    );
                    return; // Ignore this response
                }

                console.log(
                    "Received response with requestID:",
                    response.msg.requestID
                );

                this.signaling.unsubscribeMessage(
                    MessageType.SUCCESS,
                    handlerResponse as MessageHandler
                );
                this.signaling.unsubscribeMessage(
                    MessageType.ERROR,
                    handlerResponse as MessageHandler
                );

                if (response.type == MessageType.ERROR) {
                    reject(
                        new Error((response.msg as ErrorMessage).description)
                    );
                }
                if (response.type == MessageType.SUCCESS) {
                    resolve(response as TypedMessage<SuccessMessage>);
                }
            };

            this.signaling.subscribeMessage(
                MessageType.SUCCESS,
                handlerResponse as MessageHandler
            );
            this.signaling.subscribeMessage(
                MessageType.ERROR,
                handlerResponse as MessageHandler
            );

            this.signaling.sendMessage(message);
        });
    }

    /**
     * Closes the current WebRTC connection and cleans up all related resources.
     * The connection may already be closed, in which case this method does nothing because all related resources are already cleaned up.
     */
    public closePeerConnection() {
        if (!this.webrtcConnection) {
            return;
        }

        console.log("Closing peer connection");

        this.webrtcConnection.closePeerConnection();

        const closeConnectionMessage: TypedMessage<RemoteTokenMessage> = {
            type: MessageType.CLOSE_CONNECTION,
            msg: {
                remoteToken: this.expectedRemoteToken!,
            },
        };

        this.signaling.sendMessage(closeConnectionMessage);
        console.log("Sent close connection message to signaling server");

        this.expectedRemoteToken = undefined;
        this.webrtcConnection = undefined;
    }

    /**
     * Waits for a close connection request from the remote peer via a message of type `CLOSE_CONNECTION_MESSAGE_TYPE`.
     *
     * This method subscribes to messages of the specified type and, upon receiving a close connection request,
     * closes the current WebRTC connection by calling `closePeerConnection()`, resets the `remoteToken` and `connection`
     * properties, and starts waiting for a new remote client token by invoking `waitForRemoteClientToken()`.
     * The subscription to the message type remains active to handle future close requests.
     */
    private waitForCloseConnectionRequest() {
        const handleCloseConnectionRequest = (
            message: TypedMessage<RemoteTokenMessage>
        ) => {
            console.log(
                "Received close connection request:",
                message.msg.remoteToken
            );

            assert(this.webrtcConnection, "No active connection to close.");

            console.log("Closing peer connection");

            this.webrtcConnection.closePeerConnection();

            this.expectedRemoteToken = undefined;
            this.webrtcConnection = undefined;
        };

        this.signaling.subscribeMessage(
            MessageType.CLOSE_CONNECTION,
            handleCloseConnectionRequest as MessageHandler
        );
    }

    public getConnection() {
        return this.webrtcConnection;
    }
}
