import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Device } from "../../../../types/device/Device";
import { DeviceStatus } from "../../../../types/device/DeviceStatus";
import css from "./DeviceDisplay.module.scss";
import {
    IconTrash as TrashIcon,
    IconPencil as EditIcon,
} from "@tabler/icons-react";
import Badge from "../../../Badge/Badge";
import IconButton from "../../../IconButton/IconButton";
import Anchor from "../../../Anchor/Anchor";
import DeviceTile from "../DeviceTile/DeviceTile";
import TruncatedText from "../../../TruncatedText/TruncatedText";

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
    const { t } = useTranslation("dashboard");
    const [editing, setEditing] = useState(false);
    const [editedName, setEditedName] = useState("");
    const online = device.status === DeviceStatus.ONLINE;

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
        <DeviceTile
            online={online}
            statusTooltip={
                <>
                    {online ? t("devices.online") : t("devices.offline")}{" "}
                    <Anchor to={"/faq#device-status"}>
                        {t("devices.learnMore")}
                    </Anchor>
                </>
            }
            selected={selected}
            disabled={!online || device.current}
            onSelect={() => onSelect(device)}
            actions={
                <>
                    <IconButton
                        label={t("devices.rename")}
                        size="m"
                        onClick={e => {
                            e.stopPropagation();
                            startEditing();
                        }}
                    >
                        <EditIcon aria-hidden />
                    </IconButton>
                    <IconButton
                        label={t("devices.remove")}
                        size="m"
                        tone="error"
                        onClick={e => {
                            e.stopPropagation();
                            onDelete(device);
                        }}
                    >
                        <TrashIcon aria-hidden />
                    </IconButton>
                </>
            }
        >
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
                <TruncatedText className={css.deviceName}>
                    {device.name}
                </TruncatedText>
            )}
            {device.current && <Badge>{t("devices.currentBadge")}</Badge>}
        </DeviceTile>
    );
}
