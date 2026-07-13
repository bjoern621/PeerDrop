import css from "./LanPeers.module.scss";
import QuestionIcon from "../../../assets/icons8-question.svg?react";
import { toast } from "react-toastify/unstyled";
import { useLanPeers } from "../../../hooks/useLanPeers";
import { LanPeer } from "../../../types/lan/LanPeer";
import LanPeerDisplay from "./LanPeerDisplay/LanPeerDisplay";
import Tooltip from "../../Tooltip/Tooltip";

export default function LanPeers() {
    const { peers, isSearching } = useLanPeers();

    const connectToPeer = (peer: LanPeer) => {
        // TODO: Request a connection via PeerConnectionManager once LAN
        // discovery delivers real peer tokens.
        toast.info(
            `Lokale Geräteerkennung ist noch in Arbeit (${peer.displayName}).`,
            {
                toastId: "lan-discovery-wip-toast",
                updateId: "lan-discovery-wip-toast",
            }
        );
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

            {isSearching ? (
                <div className={css.searchState}>
                    <div className={css.pulse} />
                    Suche nach Geräten in deinem Netzwerk...
                </div>
            ) : peers.length > 0 ? (
                <div className={css.peerList}>
                    {peers.map(peer => (
                        <LanPeerDisplay
                            key={peer.token}
                            peer={peer}
                            onConnect={connectToPeer}
                        />
                    ))}
                </div>
            ) : (
                <div className={css.emptyText}>
                    Keine Geräte in deinem Netzwerk gefunden
                </div>
            )}
        </div>
    );
}
