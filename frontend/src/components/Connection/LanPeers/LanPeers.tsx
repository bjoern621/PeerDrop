import css from "./LanPeers.module.scss";
import QuestionIcon from "../../../assets/icons8-question.svg?react";
import { useLanPeers } from "../../../hooks/useLanPeers";
import { LanPeer } from "../../../types/lan/LanPeer";
import LanPeerDisplay from "./LanPeerDisplay/LanPeerDisplay";
import Tooltip from "../../Tooltip/Tooltip";
import { useOutgoingConnectionRequest } from "../../../hooks/useOutgoingConnectionRequest";
import { CLIENT_TOKEN_LENGTH } from "../../../util/Constants";

export default function LanPeers() {
    const { peers } = useLanPeers();
    const { target, switchTo } = useOutgoingConnectionRequest();

    // Token of the peer our pending outgoing connection request is addressed
    // to, regardless of where the request was initiated (chip or token input).
    const pendingToken = target ?? undefined;

    const handlePeerClick = (peer: LanPeer) => {
        // Ignore entries without a real token (e.g. the loading placeholder).
        if (peer.token.length !== CLIENT_TOKEN_LENGTH) {
            return;
        }

        switchTo(peer.token);
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
