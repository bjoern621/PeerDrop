import { useEffect, useRef, useState } from "react";
import {
    TypedMessage,
    WebSocketService,
} from "../../services/WebSocketService";
import { assert } from "../../util/Assert";
import css from "./LandingPage.module.scss";
import bannerLogo from "../../assets/banner_logo.png";
import { OTPInput, SlotProps } from "input-otp";
import { PeerConnectionManager } from "../../services/PeerConnectionManager";
import { WaitingDialog } from "../Popups/WaitingDialog";
import { ConfirmDialog } from "../Popups/ConfirmDialog";
import { MessageType } from "../../services/MessageType";

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

    const webSocketServiceRef = useRef<WebSocketService | undefined>(undefined);
    if (!webSocketServiceRef.current) {
        webSocketServiceRef.current = new WebSocketService();
    }

    const PeerConnectionManagerRef = useRef<PeerConnectionManager | undefined>(
        undefined
    );
    if (!PeerConnectionManagerRef.current) {
        assert(
            webSocketServiceRef.current,
            "WebSocketService is not initialized."
        );
        PeerConnectionManagerRef.current = new PeerConnectionManager(
            webSocketServiceRef.current
        );
    }

    const [clientToken, setClientToken] = useState<string | null>(null);
    const [remoteToken, setRemoteToken] = useState<string>("");
    const waitingDialog = useRef<HTMLDialogElement | null>(null);
    const confirmDialog = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        const websocket = webSocketServiceRef.current;

        assert(websocket, "WebSocketService is not initialized.");

        websocket.subscribeMessage(MessageType.TEST, message => {
            console.log("Received message:", message);
        });

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

            return () => clearInterval(checkToken);
        }

        console.log("LandingPage component mounted");
    }, []);

    const connectToPeer = async () => {
        if (remoteToken.length !== 5) {
            console.warn("Peer token must be 5 characters long.");
            return;
        }


        waitingDialog.current?.showModal();

        const peerConnectionManager = PeerConnectionManagerRef.current;
        assert(
            peerConnectionManager,
            "PeerConnectionManager is not initialized."
        );

        console.log("Trying to connect to peer with token:", remoteToken);

        await peerConnectionManager.sendTokenToRemotePeer(remoteToken);

        //void navigate("/share");
    };

    const interruptWaiting = () => {
        waitingDialog.current?.close();
        console.log("interrupted");
    }

    const interruptConfirming = () => {
        console.log("interrupted");
    }

    const confirmConnection = () => {
    }

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
            <WaitingDialog ref={waitingDialog} onCancel={() => interruptWaiting()} />
            <ConfirmDialog ref={confirmDialog} onCancel={() => interruptConfirming()} onConfirm={() => confirmConnection()} token={"88888"} />
        </div>
    );
}
