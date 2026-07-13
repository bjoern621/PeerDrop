import { LanPeer } from "../../../../types/lan/LanPeer";
import css from "./LanPeerDisplay.module.scss";
import FakeButton from "../../../FakeButton/FakeButton";
import Tooltip from "../../../Tooltip/Tooltip";

interface LanPeerDisplayProps {
    peer: LanPeer;
    onConnect: (peer: LanPeer) => void;
}

export default function LanPeerDisplay({
    peer,
    onConnect,
}: LanPeerDisplayProps) {
    return (
        <FakeButton className={css.peerDisplay} onClick={() => onConnect(peer)}>
            <Tooltip
                content={"Dieses Gerät ist bereit für eine Verbindung."}
                showArrow={true}
            >
                <div className={css.statusIndicator} />
            </Tooltip>
            <span className={css.peerName}>{peer.displayName}</span>
            <span className={css.deviceInfo}>{peer.deviceInfo}</span>
        </FakeButton>
    );
}
