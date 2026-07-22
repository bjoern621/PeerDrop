import { Device } from "../../../../types/device/Device";
import { DeviceStatus } from "../../../../types/device/DeviceStatus";
import css from "./DeviceDisplay.module.scss";
import TrashIcon from "../../../../assets/actions/icons8-trash.svg?react";
import Badge from "../../../Badge/Badge";
import Button from "../../../Button/Button";
import Tooltip from "../../../Tooltip/Tooltip";
import Anchor from "../../../Anchor/Anchor";
import FakeButton from "../../../FakeButton/FakeButton";

interface DeviceDisplayProps {
    device: Device;
    onConnect: (device: Device) => void;
    onDelete: (device: Device) => void;
}

export default function DeviceDisplay({
    device,
    onConnect,
    onDelete,
}: DeviceDisplayProps) {
    const getDeviceStatusClass = () => {
        switch (device.status) {
            case DeviceStatus.ONLINE:
                return css.deviceOnline;
            case DeviceStatus.BUSY:
                return css.deviceBusy;
            default:
                return css.deviceOffline;
        }
    };

    const getTooltipContent = () => {
        switch (device.status) {
            case DeviceStatus.ONLINE:
                return "Dieses Gerät ist bereit für eine Verbindung.";
            case DeviceStatus.BUSY:
                return "Dieses Gerät ist gerade beschäftigt.";
            default:
                return "Dieses Gerät ist aktuell nicht verfügbar.";
        }
    };

    return (
        <FakeButton
            className={css.deviceDisplay}
            onClick={() => onConnect(device)}
            disabled={device.status !== DeviceStatus.ONLINE || device.current}
        >
            <Tooltip
                content={
                    <>
                        {getTooltipContent()}{" "}
                        <Anchor to={"/faq#device-status"}>Mehr erfahren</Anchor>
                    </>
                }
                showArrow={true}
                hoverable
            >
                <div
                    className={`${css.statusIndicator} ${getDeviceStatusClass()}`}
                />
            </Tooltip>
            <span className={css.deviceName}>{device.name}</span>
            {device.current && <Badge>DIESES GERÄT</Badge>}
            <Tooltip content={"Gerät aus registrierten Geräten entfernen"}>
                <Button
                    color_scheme={"error"}
                    className={css.deleteButton}
                    onClick={e => {
                        e.stopPropagation();
                        onDelete(device);
                    }}
                >
                    <TrashIcon />
                </Button>
            </Tooltip>
        </FakeButton>
    );
}
