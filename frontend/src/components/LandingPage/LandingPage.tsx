import { useEffect, useRef, useState } from "react";
import {
    TypedMessage,
    WebSocketService,
} from "../../services/WebSocketService";
import { assert } from "../../util/Assert";

export default function LandingPage() {
    const webSocketServiceRef = useRef<WebSocketService | undefined>(undefined);
    if (!webSocketServiceRef.current) {
        webSocketServiceRef.current = new WebSocketService();
    }

    // Make the WebSocketService globally accessible for debugging
    (window as any).webSocketServiceRef = webSocketServiceRef;

    const [clientToken, setClientToken] = useState<string | null>(null);

    useEffect(() => {
        const websocket = webSocketServiceRef.current;

        assert(websocket, "WebSocketService is not initialized.");

        const TEST_MESSAGE_TYPE = "test";

        websocket.subscribeMessage(TEST_MESSAGE_TYPE, message => {
            console.log("Received message:", message);
        });

        type TestMessage = {
            nachricht: string;
        };

        const testMessage: TypedMessage<TestMessage> = {
            type: TEST_MESSAGE_TYPE,
            msg: {
                nachricht: "Hallo Server",
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

    return (
        <div>
            <h1>Welcome to the Landing Page</h1>
            <p>This is a simple landing page.</p>
            Client token: {clientToken ? clientToken : "Lädt..."}
        </div>
    );
}
