import css from "./Connection.module.scss";
import ProfileIcon from "../../assets/icons8-name-tag.svg?react";
import ConnectIcon from "../../assets/icons8-computers-connecting.svg?react";
import Button from "../Button/Button";
import GroupIcon from "../../assets/icons8-group.svg?react";
import CopyIcon from "../../assets/icons8-copy.svg?react";
import CopyLinkIcon from "../../assets/icons8-copy-link.svg?react";
import TokenInput from "./TokenInput/TokenInput";
import { useCallback, useEffect, useState } from "react";
import { useWebSocketService } from "../../context/connection/WebSocketContext";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import { DeviceHeartbeatMessage } from "../../types/device/DeviceHeartbeatMessage";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { HEARTBEAT_INTERVAL_MS } from "../../util/Constants";
import { assert } from "../../util/Assert";
import { toast } from "react-toastify/unstyled";
import "react-toastify/dist/ReactToastify.css";

export default function Connection() {
    const websocket = useWebSocketService();
    const peerConnectionManager = usePeerConnectionManager();

    const [clientToken, setClientToken] = useState<string>("_____");
    const [remoteToken, setRemoteToken] = useState<string>("");
    const [waitingForResponse, setWaitingForResponse] =
        useState<boolean>(false);

    /**
     * Sends a heartbeat message if the user has registered the device.
     */
    const sendHeartbeatIfPossible = useCallback(() => {
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
    }, [websocket]);

    /**
     * Sends a heartbeat message every HEARTBEAT_INTERVAL_MS.
     */
    const sendContinuousHeartbeat = useCallback(() => {
        const timer = setInterval(() => {
            sendHeartbeatIfPossible();
        }, HEARTBEAT_INTERVAL_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [sendHeartbeatIfPossible]);

    useEffect(() => {
        assert(websocket, "WebSocketService is not initialized.");

        const token = websocket.getLocalClientToken();
        let checkToken: number | undefined = undefined;
        if (token) {
            setClientToken(token);
        } else {
            // If not available immediately, set up polling
            checkToken = setInterval(() => {
                const token = websocket.getLocalClientToken();
                if (token) {
                    setClientToken(token);
                    clearInterval(checkToken);
                }
            }, 500);
        }

        peerConnectionManager.setOnConnectionResponseReceivedCallback(
            (accepted: boolean) => {
                if (accepted) {
                    // console.log("ACCEPTED");
                    // waitingDialog.current!.close();
                    // showLoadingDialog();
                } else {
                    // console.log("REJECTED");
                    // waitingDialog.current!.close();
                    toast.error("Verbindungsanfrage wurde abgelehnt!");
                }
            }
        );
        // peerConnectionManager.setOnConnectionRequestReceivedCallback(
        //     (requestingPeerToken: string) => {
        //         // setRemoteTokenOfRequestingPeer(requestingPeerToken);
        //         // confirmDialog.current!.showModal();
        //     }
        // );
        peerConnectionManager.setOnConnectionRequestCancelledReceivedCallback(
            () => {
                // confirmDialog.current!.close();
                // waitingDialog.current!.close();
            }
        );

        sendHeartbeatIfPossible();

        const cleanupHeartbeats = sendContinuousHeartbeat();

        return () => {
            cleanupHeartbeats();
        };
    }, [
        websocket,
        peerConnectionManager,
        sendHeartbeatIfPossible,
        sendContinuousHeartbeat,
    ]);

    const connectToPeer = () => {
        const successfullySent =
            peerConnectionManager.requestConnectionToRemotePeer(remoteToken);

        if (successfullySent) {
            setWaitingForResponse(true);
            // waitingDialog.current!.showModal();
        }
    };

    return (
        <div className={css.container}>
            <div className={css.ownTokenContainer}>
                <h2 className={css.heading}>
                    <ProfileIcon />
                    Dein Token
                </h2>

                <div className={css.tokenBox}>
                    <div className={css.token}>{clientToken}</div>
                    <p className={css.mutedText}>
                        Teile diesen Token mit anderen
                    </p>
                </div>

                <div>
                    <Button
                        variant={"outline"}
                        color_scheme={"neutral"}
                        className={css.openGroupRoomButton}
                    >
                        <GroupIcon />
                        Gruppenraum öffnen
                    </Button>
                    <div className={css.copyButtons}>
                        <Button variant={"outline"} color_scheme={"neutral"}>
                            <CopyIcon />
                            Token kopieren
                        </Button>
                        <Button variant={"outline"} color_scheme={"neutral"}>
                            <CopyLinkIcon />
                            Token als Link kopieren
                        </Button>
                    </div>
                </div>
            </div>

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
                        connectToPeer();
                    }}
                    disabled={waitingForResponse}
                >
                    Verbinden
                </Button>
            </div>
        </div>
    );
}
