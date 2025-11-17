import { useDeviceHeartbeat } from "../../hooks/useDeviceHeartbeat";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import CallToAction from "./CallToAction/CallToAction";
import Hero from "./Hero/Hero";
import css from "./Landing.module.scss";
import Tutorial from "./Tutorial/Tutorial";
import UnderTheHood from "./UnderTheHood/UnderTheHood";
import Why from "./Why/Why";

export default function Landing() {
    useDeviceHeartbeat({ status: DeviceStatus.ONLINE });

    return (
        <div className={css.container}>
            <Hero />
            <Tutorial />
            <Why />
            <UnderTheHood />
            <CallToAction />
        </div>
    );
}
