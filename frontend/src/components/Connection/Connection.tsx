import css from "./Connection.module.scss";
import OwnToken from "./OwnToken/OwnToken";
import ConnectToPeer from "./ConnectToPeer/ConnectToPeer";
import { useDeviceHeartbeat } from "../../hooks/useDeviceHeartbeat";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import Devices from "./Devices/Devices";
import LanPeers from "./LanPeers/LanPeers";

export default function Connection() {
    useDeviceHeartbeat({ status: DeviceStatus.ONLINE });

    return (
        <div className={css.container}>
            <Devices />

            <LanPeers />

            <div className={css.containerWrapper}>
                <OwnToken />

                <ConnectToPeer />
            </div>
        </div>
    );
}
