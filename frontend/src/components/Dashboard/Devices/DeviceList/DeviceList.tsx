import { useDevices } from "../../../../hooks/useDevices";
import Button from "../../../Button/Button";
import DeviceDisplay from "../DeviceDisplay/DeviceDisplay";
import css from "./DeviceList.module.scss";
import PlusIcon from "../../../../assets/actions/icons8-plus.svg?react";

export default function DeviceList() {
    const {
        devices,
        currentDeviceRegistered,
        registerCurrentDevice,
        connectToDevice,
        deleteDevice,
        renameDevice,
    } = useDevices();

    return (
        <div className={css.deviceList}>
            {!currentDeviceRegistered && (
                <Button
                    color_scheme={"neutral"}
                    variant={"outline"}
                    className={css.registerButton}
                    onClick={() => void registerCurrentDevice()}
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
                    onRename={(device, newName) =>
                        void renameDevice(device, newName)
                    }
                />
            ))}
        </div>
    );
}
