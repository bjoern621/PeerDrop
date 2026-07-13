import { useState } from "react";
import css from "./IncomingConnectionRequests.module.scss";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import { useConnectionRequestState } from "../../hooks/useConnectionRequestState";

/**
 * Renders one banner per pending incoming connection request, driven entirely
 * by the server-pushed connection-request state. A banner disappears as soon
 * as the server drops the request (answered, cancelled, requester
 * disconnected, or this client joined another connection).
 */
export default function IncomingConnectionRequests() {
    const { incomingRequesters } = useConnectionRequestState();

    if (incomingRequesters.length === 0) {
        return null;
    }

    return (
        <div className={css.stack}>
            {incomingRequesters.map(token => (
                <IncomingRequestBanner key={token} requesterToken={token} />
            ))}
        </div>
    );
}

function IncomingRequestBanner({ requesterToken }: { requesterToken: string }) {
    const peerConnectionManager = usePeerConnectionManager();

    // Disables the buttons after answering; the banner itself is removed by
    // the next server snapshot.
    const [responded, setResponded] = useState(false);

    const accept = () => {
        setResponded(true);
        peerConnectionManager.acceptConnectionRequest(requesterToken);
    };

    const reject = () => {
        setResponded(true);
        peerConnectionManager.rejectConnectionRequest(requesterToken);
    };

    return (
        <div className={css.banner}>
            <div className={css.message}>
                Ein Peer möchte sich mit Dir verbinden: {requesterToken}
            </div>
            <div className={css.buttonContainer}>
                <button onClick={accept} disabled={responded}>
                    Verbinden
                </button>
                <button onClick={reject} disabled={responded}>
                    Ablehnen
                </button>
            </div>
        </div>
    );
}
