import Button from "../../Button/Button";
import TokenInput from "../TokenInput/TokenInput";
import css from "./ConnectToPeer.module.scss";
import ConnectIcon from "../../../assets/icons8-computers-connecting.svg?react";
import { useEffect, useState } from "react";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import { toast } from "react-toastify/unstyled";
import { useWebSocketService } from "../../../context/connection/WebSocketContext";
import { DeviceHeartbeatMessage } from "../../../types/device/DeviceHeartbeatMessage";
import { DeviceStatus } from "../../../types/device/DeviceStatus";

export default function ConnectToPeer() {
    const peerConnectionManager = usePeerConnectionManager();
    const websocket = useWebSocketService();

    const [remoteToken, setRemoteToken] = useState<string>("");
    const [waitingForResponse, setWaitingForResponse] =
        useState<boolean>(false);

    useEffect(() => {
        peerConnectionManager.setOnConnectionResponseReceivedCallback(
            (accepted: boolean) => {
                void (async () => {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Prevent spamming toasts

                    setWaitingForResponse(false);

                    if (accepted) {
                        // showLoadingDialog();
                        // dismissAllToasts();
                    } else {
                        toast.error("Verbindungsanfrage wurde abgelehnt!", {
                            toastId: "connection-rejected-toast",
                            updateId: "connection-rejected-toast",
                        });
                    }
                })();
            }
        );

        const deviceUuid: string | undefined = document.cookie
            .split("; ")
            .find(row => row.startsWith("deviceUuid="))
            ?.split("=")[1];

        if (!deviceUuid) {
            return; // The user might not have registered the device
        }

        const heartbeat = new DeviceHeartbeatMessage({
            uuid: deviceUuid,
            status: DeviceStatus.ONLINE,
        });

        websocket.sendMessage(heartbeat);

        // exhaustive-deps-exclude: peerConnectionManager
    }, []);

    const interruptWaiting = () => {
        if (peerConnectionManager.cancelConnectionRequest(remoteToken)) {
            setWaitingForResponse(false);
        }
    };

    const connectToPeer = () => {
        const successfullySent =
            peerConnectionManager.requestConnectionToRemotePeer(remoteToken);

        if (successfullySent) {
            setWaitingForResponse(true);
        }
    };

    return (
        <div className={css.connectToPeerContainer}>
            <h2 className={css.heading}>
                <ConnectIcon />
                Mit Peer verbinden
            </h2>

            <div className={css.tokenInputContainer}>
                {waitingForResponse && (
                    <p className={`${css.mutedText} ${css.fadeInScale}`}>
                        Warte auf Bestätigung von:
                    </p>
                )}
                <TokenInput
                    value={remoteToken}
                    onChange={value => setRemoteToken(value.toUpperCase())}
                />
                {!waitingForResponse && (
                    <p className={css.mutedText}>
                        Fremden Token eingeben, um Verbindung aufzubauen
                    </p>
                )}
            </div>

            <Button
                onClick={() => {
                    if (waitingForResponse) {
                        interruptWaiting();
                    } else {
                        connectToPeer();
                    }
                }}
                variant={waitingForResponse ? "outline" : "filled"}
            >
                {waitingForResponse ? "Abbrechen" : "Verbinden"}
            </Button>
        </div>
    );
}
