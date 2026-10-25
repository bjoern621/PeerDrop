import { useTranslation } from "react-i18next";
import { useDevices } from "../../../../hooks/useDevices";
import Button from "../../../Button/Button";
import DeviceDisplay from "../DeviceDisplay/DeviceDisplay";
import css from "./DeviceList.module.scss";
import { Device } from "../../../../types/device/Device";
import { IconPlus as PlusIcon } from "@tabler/icons-react";

interface DeviceListProps {
    selectedUuid: string | null;
    onSelect: (device: Device) => void;
}

export default function DeviceList({
    selectedUuid,
    onSelect,
}: DeviceListProps) {
    const { t } = useTranslation("dashboard");
    const {
        devices,
        currentDeviceRegistered,
        registerCurrentDevice,
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
                    {t("devices.register")}
                </Button>
            )}
            {devices.map(device => (
                <DeviceDisplay
                    key={device.uuid}
                    device={device}
                    selected={device.uuid === selectedUuid}
                    onSelect={onSelect}
                    onDelete={() => void deleteDevice(device)}
                    onRename={(device, newName) =>
                        void renameDevice(device, newName)
                    }
                />
            ))}
        </div>
    );
}
