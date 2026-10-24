import { useState } from "react";
import { Device } from "../../../../types/device/Device";
import { DeviceStatus } from "../../../../types/device/DeviceStatus";
import css from "./DeviceDisplay.module.scss";
import TrashIcon from "../../../../assets/actions/icons8-trash.svg?react";
import EditIcon from "../../../../assets/actions/icons8-edit.svg?react";
import Badge from "../../../Badge/Badge";
import Button from "../../../Button/Button";
import Tooltip from "../../../Tooltip/Tooltip";
import Anchor from "../../../Anchor/Anchor";
import FakeButton from "../../../FakeButton/FakeButton";
import CheckIcon from "../../../../assets/actions/check.svg?react";

const MAX_DEVICE_NAME_LENGTH = 64; // Linked to the backend DisplayNameValidator

interface DeviceDisplayProps {
    device: Device;
    /** Picks the device as recipient. */
    onSelect: (device: Device) => void;
    selected: boolean;
    onDelete: (device: Device) => void;
    onRename: (device: Device, newName: string) => void;
}

export default function DeviceDisplay({
    device,
    onSelect,
    selected,
    onDelete,
    onRename,
}: DeviceDisplayProps) {
    const [editing, setEditing] = useState(false);
    const [editedName, setEditedName] = useState("");

    const getDeviceStatusClass = () => {
        switch (device.status) {
            case DeviceStatus.ONLINE:
                return css.deviceOnline;
            default:
                return css.deviceOffline;
        }
    };

    const getTooltipContent = () => {
        switch (device.status) {
            case DeviceStatus.ONLINE:
                return "Dieses Gerät ist online.";
            default:
                return "Dieses Gerät ist nicht online.";
        }
    };

    const startEditing = () => {
        setEditedName(device.name);
        setEditing(true);
    };

    const commitRename = () => {
        setEditing(false);
        const newName = editedName.trim();
        if (newName.length === 0 || newName === device.name) {
            return;
        }
        onRename(device, newName);
    };

    return (
        <FakeButton
            className={`${css.deviceDisplay} ${selected ? css.selected : ""}`}
            aria-pressed={selected}
            onClick={() => onSelect(device)}
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
            {editing ? (
                <input
                    className={css.nameInput}
                    value={editedName}
                    maxLength={MAX_DEVICE_NAME_LENGTH}
                    autoFocus
                    onChange={e => setEditedName(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                        // Prevents FakeButton from treating Enter/Space as a connect click
                        e.stopPropagation();
                        if (e.key === "Enter") {
                            commitRename();
                        } else if (e.key === "Escape") {
                            setEditing(false);
                        }
                    }}
                    onBlur={commitRename}
                />
            ) : (
                <span className={css.deviceName}>{device.name}</span>
            )}
            {device.current && <Badge>DIESES GERÄT</Badge>}
            {selected && <CheckIcon className={css.check} aria-hidden />}
            <Tooltip content={"Gerät umbenennen"}>
                <Button
                    color_scheme={"neutral"}
                    className={css.renameButton}
                    onClick={e => {
                        e.stopPropagation();
                        startEditing();
                    }}
                >
                    <EditIcon />
                </Button>
            </Tooltip>
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
