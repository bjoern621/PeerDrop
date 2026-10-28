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
import { useInlineEdit } from "../../../../hooks/useInlineEdit";
import { useServerConnection } from "../../../../hooks/useServerConnection";

const MAX_DEVICE_NAME_LENGTH = 64; // Linked to the backend DisplayNameValidator

interface DeviceDisplayProps {
    device: Device;
    /** Picks the device as recipient. */
    onSelect: (device: Device) => void;
    selected: boolean;
    /** The server resolves the device's token or checks whether it is online. */
    checking: boolean;
    onDelete: (device: Device) => void;
    onRename: (device: Device, newName: string) => void;
}

export default function DeviceDisplay({
    device,
    onSelect,
    selected,
    checking,
    onDelete,
    onRename,
}: DeviceDisplayProps) {
    const { t } = useTranslation("dashboard");
    const online = device.status === DeviceStatus.ONLINE;
    const lost = useServerConnection() === "lost";
    const nameEdit = useInlineEdit(draft => {
        const newName = draft.trim();
        if (newName.length > 0 && newName !== device.name) {
            onRename(device, newName);
        }
    });

    return (
        <DeviceTile
            online={online}
            statusTooltip={
                <>
                    {lost
                        ? t("devices.statusUnknown")
                        : online
                          ? t("devices.online")
                          : t("devices.offline")}{" "}
                    <Anchor to={"/faq#device-status"}>
                        {t("devices.learnMore")}
                    </Anchor>
                </>
            }
            selected={selected}
            checking={checking}
            disabled={!online || device.current}
            onSelect={() => onSelect(device)}
            actions={
                <>
                    <IconButton
                        label={t("devices.rename")}
                        size="m"
                        onClick={e => {
                            e.stopPropagation();
                            nameEdit.start(device.name);
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
            {nameEdit.editing ? (
                <input
                    {...nameEdit.fieldProps}
                    className={css.nameInput}
                    maxLength={MAX_DEVICE_NAME_LENGTH}
                    onChange={e => nameEdit.setDraft(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                        // Prevents FakeButton from treating Enter/Space as a connect click
                        e.stopPropagation();
                        nameEdit.fieldProps.onKeyDown(e);
                    }}
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
