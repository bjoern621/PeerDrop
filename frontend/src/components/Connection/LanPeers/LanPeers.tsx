import css from "./LanPeers.module.scss";
import QuestionIcon from "../../../assets/icons8-question.svg?react";
import { useEffect, useState } from "react";
import { useLanPeers } from "../../../hooks/useLanPeers";
import { LanPeer } from "../../../types/lan/LanPeer";
import LanPeerDisplay from "./LanPeerDisplay/LanPeerDisplay";
import Tooltip from "../../Tooltip/Tooltip";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";

export default function LanPeers() {
    const { peers } = useLanPeers();
    const peerConnectionManager = usePeerConnectionManager();

    // Token of the peer our pending outgoing connection request is addressed
    // to, regardless of where the request was initiated (chip or token input).
    const [pendingToken, setPendingToken] = useState<string | undefined>(
        peerConnectionManager.getOutgoingRequestToken()
    );

    useEffect(() => {
        const onOutgoingRequestChanged = () => {
            setPendingToken(peerConnectionManager.getOutgoingRequestToken());
        };

        peerConnectionManager.subscribeToOutgoingRequestChanged(
            onOutgoingRequestChanged
        );

        return () => {
            peerConnectionManager.unsubscribeFromOutgoingRequestChanged(
                onOutgoingRequestChanged
            );
        };
    }, [peerConnectionManager]);

    const handlePeerClick = (peer: LanPeer) => {
        // Ignore entries without a real token (e.g. the loading placeholder).
        if (peer.token.length !== 5) {
            return;
        }

        // Clicking the pending peer again cancels the request.
        if (peer.token === pendingToken) {
            peerConnectionManager.cancelConnectionRequest(peer.token);
            return;
        }

        // Only one outgoing request at a time: switch to the new peer.
        if (pendingToken) {
            peerConnectionManager.cancelConnectionRequest(pendingToken);
        }

        peerConnectionManager.requestConnectionToRemotePeer(peer.token);
    };

    return (
        <div className={css.lanPeers}>
            <div className={css.label}>
                In deinem Netzwerk{" "}
                <Tooltip
                    content={
                        "Geräte im selben Netzwerk erscheinen hier automatisch"
                    }
                >
                    <QuestionIcon className={css.icon} />
                </Tooltip>
            </div>

            <div className={css.peerList}>
                {peers.map(peer => (
                    <LanPeerDisplay
                        key={peer.token}
                        peer={peer}
                        pending={peer.token === pendingToken}
                        onClick={handlePeerClick}
                    />
                ))}
                {/* Stays mounted in both states so the pulse animation is not
                    restarted when the text switches. */}
                <div className={css.searchState}>
                    <div className={css.pulse} />
                    {peers.length > 0
                        ? "Suche weiter..."
                        : "Suche nach Geräten in deinem Netzwerk..."}
                </div>
            </div>
        </div>
    );
}
