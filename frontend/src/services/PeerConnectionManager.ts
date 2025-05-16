import errorAsValue from "../util/ErrorAsValue";
import { WebRTCConnection } from "./WebRTCConnection";
import {
    MessageHandler,
    TypedMessage,
    WebSocketService,
    ClientToken,
} from "./WebSocketService";

export type RemoteTokenMessage = {
    requestID: string;
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

const REMOTE_TOKEN_MESSAGE_TYPE: string = "remote-token";
const ERROR_MESSAGE_TYPE: string = "error-message";
const SUCCESS_MESSAGE_TYPE: string = "success-message";

export class PeerConnectionManager {
    private remoteToken: ClientToken | undefined;
    private connection: WebRTCConnection | undefined;

    public constructor(private readonly signaling: WebSocketService) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
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

            // Verbindungsbestätigung muss hier hin, dass der Peer die Verbindungsanfrage akzeptieren oder ablehnen kann
            // (später dann auch, dass falls der andere Peer den Verbindungsaufbau abbricht, dass die Anfrage hier dann auch abbricht mit
            // einer passenden Nachricht)

            this.signaling.unsubscribeMessage(
                REMOTE_TOKEN_MESSAGE_TYPE,
                handleRemoteTokenMessage as MessageHandler
            );

            this.connection = new WebRTCConnection(
                this.signaling,
                this.remoteToken
            );
        };

        this.signaling.subscribeMessage(
            REMOTE_TOKEN_MESSAGE_TYPE,
            handleRemoteTokenMessage as MessageHandler
        );
    }

    /**
     * Speichert das Token des entfernten Peers lokal und sendet eine Nachricht mit diesem Token an den Signaling-Server.
     * Der Signaling-Server tauscht daraufhin das `msg.remoteToken` mit dem Token des Senders aus, sodass der Empfänger
     * das Token des Senders als `msg.remoteToken` erhält.
     *
     * Um Race Conditions zu vermeiden, wird jeder Anfrage eine eindeutige `requestID` zugewiesen. Die Antwortnachrichten
     * (Success oder Error) enthalten dieselbe `requestID`, sodass nur die Antwort zur passenden Anfrage verarbeitet wird.
     * Alle anderen Antworten werden ignoriert.
     *
     * Nach erfolgreicher Antwort werden alle Handler für den Nachrichtentyp `REMOTE_TOKEN_MESSAGE_TYPE` entfernt.
     *
     * @param otherPeerToken Das Token des anderen Peers als String.
     */
    public async sendTokenToRemotePeer(otherPeerToken: string) {
        const otherToken: ClientToken = otherPeerToken;

        const requestID: string = crypto.randomUUID();

        const tokenMessage: TypedMessage<RemoteTokenMessage> = {
            type: REMOTE_TOKEN_MESSAGE_TYPE,
            msg: {
                requestID: requestID,
                remoteToken: otherToken,
            },
        };

        const [, err] = await errorAsValue(
            this.sendMessageAndWaitForResponse(tokenMessage)
        );
        if (err) {
            console.error("Error sending remote token:", err.message);
            return;
        }

        // Verbindungsbestätigung muss hier hin, ein Fenster, bei dem er warten muss auf Bestätigung des anderen Peers
        // (später dann auch dass er die Verbindungsanfrage abbrechne kann)

        this.remoteToken = otherToken;

        console.log("Sent remote token to signaling server:", otherToken);

        //unsubscribe all handlers for the REMOTE_TOKEN_MESSAGE_TYPE
        const handlersRemoteToken = this.signaling.getHandlers(
            REMOTE_TOKEN_MESSAGE_TYPE
        );
        if (handlersRemoteToken) {
            handlersRemoteToken.forEach(handler => {
                this.signaling.unsubscribeMessage(
                    REMOTE_TOKEN_MESSAGE_TYPE,
                    handler
                );
            });

            this.connection = new WebRTCConnection(
                this.signaling,
                this.remoteToken
            );

            this.connection.testMethodDataChannelInitializier();
        }
    }

    /**
     * Sendet eine Nachricht an den Signaling-Server und wartet auf eine Antwort (Success oder Error).
     * Die Methode verwendet eine eindeutige `requestID`, um sicherzustellen, dass nur die Antwort mit
     * passender `requestID` verarbeitet wird. Dadurch werden Race Conditions vermieden, falls mehrere
     * Anfragen gleichzeitig laufen.
     *
     * Nach Empfang der passenden Antwort werden die zugehörigen Message-Handler deregistriert.
     *
     * @param message Die zu sendende Nachricht, die eine eindeutige `requestID` enthält.
     * @returns Promise, das mit der Antwortnachricht (Success oder Error) aufgelöst oder abgelehnt wird.
     */
    public sendMessageAndWaitForResponse(
        message: TypedMessage<RemoteTokenMessage>
    ): Promise<TypedMessage<ErrorMessage | SuccessMessage>> {
        return new Promise((resolve, reject) => {
            const handlerResponse = (
                response: TypedMessage<ErrorMessage | SuccessMessage>
            ) => {
                const requestID = message.msg.requestID;
                if (response.msg.requestID !== requestID) {
                    return; // Ignore this response
                }

                this.signaling.unsubscribeMessage(
                    SUCCESS_MESSAGE_TYPE,
                    handlerResponse as MessageHandler
                );
                this.signaling.unsubscribeMessage(
                    ERROR_MESSAGE_TYPE,
                    handlerResponse as MessageHandler
                );

                if (response.type == ERROR_MESSAGE_TYPE) {
                    reject(
                        new Error((response.msg as ErrorMessage).description)
                    );
                }
                if (response.type == SUCCESS_MESSAGE_TYPE) {
                    resolve(response as TypedMessage<SuccessMessage>);
                }
            };

            this.signaling.subscribeMessage(
                SUCCESS_MESSAGE_TYPE,
                handlerResponse as MessageHandler
            );
            this.signaling.subscribeMessage(
                ERROR_MESSAGE_TYPE,
                handlerResponse as MessageHandler
            );

            this.signaling.sendMessage(message);
        });
    }

    public getConnection() {
        return this.connection;
    }
}
