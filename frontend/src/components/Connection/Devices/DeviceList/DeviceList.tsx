import { useDevices } from "../../../../hooks/useDevices";
import Button from "../../../Button/Button";
import DeviceDisplay from "../DeviceDisplay/DeviceDisplay";
import css from "./DeviceList.module.scss";
import PlusIcon from "../../../../assets/icons8-plus.svg?react";

export default function DeviceList() {
    const {
        devices,
        currentDeviceRegistered,
        registerCurrentDevice,
        connectToDevice,
        deleteDevice,
    } = useDevices();

    return (
        <div className={css.deviceList}>
            {!currentDeviceRegistered && (
                <Button
                    color_scheme={"neutral"}
                    variant={"outline"}
                    className={css.registerButton}
                    onClick={() => {
                        console.log("register");
                        void registerCurrentDevice();
                    }}
                >
                    <PlusIcon />
                    Gerät registrieren
                </Button>
            )}
            {devices.map(device => (
                <DeviceDisplay
                    key={device.uuid}
                    device={device}
                    onConnect={connectToDevice}
                    onDelete={() => void deleteDevice(device)}
                />
            ))}
        </div>
    );
}
