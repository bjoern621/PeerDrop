import css from "./LanPeers.module.scss";
import NetworkIcon from "../../../assets/icons8-connect.svg?react";
import { toast } from "react-toastify/unstyled";
import { useLanPeers } from "../../../hooks/useLanPeers";
import { LanPeer } from "../../../types/lan/LanPeer";
import LanPeerDisplay from "./LanPeerDisplay/LanPeerDisplay";

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
        <div className={css.lanPeersContainer}>
            <h2 className={css.heading}>
                <NetworkIcon />
                In deinem Netzwerk
            </h2>

            {peers.length > 0 ? (
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
                <div className={css.searchState}>
                    <div className={css.pulse} />
                    <p className={css.mutedText}>
                        {isSearching
                            ? "Suche nach Geräten in deinem Netzwerk..."
                            : "Keine Geräte in deinem Netzwerk gefunden"}
                    </p>
                </div>
            )}

            <p className={css.mutedText}>
                Geräte im selben Netzwerk erscheinen hier automatisch
            </p>
        </div>
    );
}
