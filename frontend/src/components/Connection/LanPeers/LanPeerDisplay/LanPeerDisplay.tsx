import { LanPeer } from "../../../../types/lan/LanPeer";
import css from "./LanPeerDisplay.module.scss";
import FakeButton from "../../../FakeButton/FakeButton";
import Tooltip from "../../../Tooltip/Tooltip";

interface LanPeerDisplayProps {
    peer: LanPeer;
    /** True while a connection request to this peer is awaiting a response. */
    pending: boolean;
    onClick: (peer: LanPeer) => void;
}

export default function LanPeerDisplay({
    peer,
    pending,
    onClick,
}: LanPeerDisplayProps) {
    const busy = peer.status === "busy";

    const deviceInfo =
        peer.browser && peer.os
            ? `${peer.browser} · ${peer.os}`
            : peer.browser || peer.os || "Unbekanntes Gerät";

    const getTooltipContent = () => {
        if (pending) {
            return "Warte auf Bestätigung. Klicken zum Abbrechen.";
        }
        if (busy) {
            return "Dieses Gerät ist gerade beschäftigt.";
        }
        return "Dieses Gerät ist bereit für eine Verbindung.";
    };

    return (
        <FakeButton
            className={css.peerDisplay}
            onClick={() => onClick(peer)}
            disabled={busy}
        >
            <Tooltip content={getTooltipContent()} showArrow={true}>
                {pending ? (
                    <div className={css.spinner} />
                ) : (
                    <div
                        className={`${css.statusIndicator} ${busy ? css.peerBusy : css.peerOnline}`}
                    />
                )}
            </Tooltip>
            <span className={css.peerName}>{peer.token}</span>
            <span className={css.deviceInfo}>{deviceInfo}</span>
        </FakeButton>
    );
}
