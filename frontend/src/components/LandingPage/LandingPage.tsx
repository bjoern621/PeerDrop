import { useEffect, useState } from "react";
import { TypedMessage } from "../../services/WebSocketService";
import { assert } from "../../util/Assert";
import css from "./LandingPage.module.scss";
import bannerLogo from "../../assets/banner_logo.png";
import { OTPInput, SlotProps } from "input-otp";
//import { useNavigate } from "react-router";
import { MessageType } from "../../services/MessageType";
import { useWebSocketService } from "../../context/WebSocketContext";
import { usePeerConnectionManager } from "../../context/PeerConnectionContext";

const Slot = ({ char, hasFakeCaret, isActive }: SlotProps) => {
    return (
        <div
            className={`${css.otpSlot} ${isActive ? css.otpSlotActive : ""}`}
            data-state={!char ? "empty" : "filled"}
            data-active={isActive || undefined}
        >
            {char}
            {hasFakeCaret && <div className={css.otpSlotCaret} />}
        </div>
    );
};

export default function LandingPage() {
    //const navigate = useNavigate();

    const websocket = useWebSocketService();
    const peerConnectionManager = usePeerConnectionManager();

    const [clientToken, setClientToken] = useState<string | null>(null);
    const [remoteToken, setRemoteToken] = useState<string>("");

    useEffect(() => {
        console.log("useEffect triggered");

        assert(websocket, "WebSocketService is not initialized.");

        const handler = (message: unknown) => {
            console.log("Received message:", message);
        };
        websocket.subscribeMessage(MessageType.TEST, handler);

        type TestMessage = {
            message: string;
        };

        const testMessage: TypedMessage<TestMessage> = {
            type: MessageType.TEST,
            msg: {
                message: "Hallo Server",
            },
        };

        setTimeout(() => {
            websocket.sendMessage(testMessage);
        }, 1000);

        const token = websocket.getLocalClientToken();
        if (token) {
            setClientToken(token);
        } else {
            // If not available immediately, set up polling
            const checkToken = setInterval(() => {
                const token = websocket.getLocalClientToken();
                if (token) {
                    setClientToken(token);
                    clearInterval(checkToken);
                }
            }, 500);

            return () => {
                clearInterval(checkToken);
                websocket.unsubscribeMessage(MessageType.TEST, handler);
            };
        }

        return () => {
            websocket.unsubscribeMessage(MessageType.TEST, handler);
        };
    }, [websocket]);
    /*
    // Initialize PeerConnectionManager and set up callback
    useEffect(() => {
        assert(
            peerConnectionManager,
            "PeerConnectionManager is not initialized."
        );
        peerConnectionManager.setOnConnectedCallback(() => {
            void navigate("/share");
        });

        console.log("PeerConnectionManager onConnectedCallback set");
    }, [navigate, peerConnectionManager]);*/

    const connectToPeer = async () => {
        if (remoteToken.length !== 5) {
            console.warn("Peer token must be 5 characters long.");
            return;
        }
        console.log("Trying to connect to peer with token:", remoteToken);

        await peerConnectionManager.sendTokenToRemotePeer(remoteToken);
    };

    return (
        <div className={css.container}>
            <img
                src={bannerLogo}
                className={css.logo}
                alt="Banner Logo von PeerDrop"
            />
            <div className={css.ownTokenContainer}>
                <span className={css.tooltip}>Dein Token</span>
                <span className={css.token}>
                    {clientToken ? clientToken : "_____"}
                </span>
            </div>
            <div className={css.peerTokenContainer}>
                <div className={css.inputContainer}>
                    <OTPInput
                        maxLength={5}
                        value={remoteToken}
                        inputMode="text"
                        data-bwignore="true"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        onChange={value => setRemoteToken(value.toUpperCase())}
                        render={({ slots }) => (
                            <>
                                <div className={css.slotsContainer}>
                                    {slots.map((slot, idx) => (
                                        <Slot key={idx} {...slot} />
                                    ))}
                                </div>
                            </>
                        )}
                    ></OTPInput>
                    <button
                        onClick={() => void connectToPeer()}
                        className={css.button}
                    >
                        &gt;
                    </button>
                </div>
                <div>Anderes Token eingeben, um Verbindung aufzubauen</div>
            </div>
        </div>
    );
}
