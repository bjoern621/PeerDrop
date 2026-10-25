import { useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import css from "./DevicePanel.module.scss";
import { IconDevices as DevicesIcon } from "@tabler/icons-react";
import { useLanPeers } from "../../hooks/useLanPeers";
import useSettings from "../../hooks/useSettings";
import { useSettingsDialog } from "../../context/SettingsDialogContext";
import { useAuth } from "../../context/AuthContext";
import { useScrollShadows } from "../../hooks/useScrollShadows";
import { LanPeer } from "../../types/lan/LanPeer";
import { Device } from "../../types/device/Device";
import HelpTip from "../HelpTip/HelpTip";
import TruncatedText from "../TruncatedText/TruncatedText";
import Anchor from "../Anchor/Anchor";
import CardHeading from "./CardHeading/CardHeading";
import DeviceList from "./Devices/DeviceList/DeviceList";
import DeviceTile from "./Devices/DeviceTile/DeviceTile";

interface DevicePanelProps {
    recipient: string;
    selectedDeviceUuid: string | null;
    onPickToken: (token: string) => void;
    onPickDevice: (device: Device) => void;
}

/** Recipients to pick with one click: devices in the same network and own devices. */
export default function DevicePanel({
    recipient,
    selectedDeviceUuid,
    onPickToken,
    onPickDevice,
}: DevicePanelProps) {
    const { t } = useTranslation("dashboard");
    const { peers } = useLanPeers();
    const { lanDiscovery } = useSettings();
    const { openSettings } = useSettingsDialog();
    const { isLoggedIn, isLoading } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);
    const shadows = useScrollShadows(scrollRef);

    return (
        <aside className={css.panel} aria-labelledby="devices-heading">
            <CardHeading id="devices-heading" icon={DevicesIcon} tone="primary">
                {t("devices.title")}
            </CardHeading>
            <div className={css.scrollFrame}>
                <div ref={scrollRef} className={css.scroll}>
                    <span className={css.label}>
                        {t("devices.network")}
                        <HelpTip>{t("devices.networkHelp")}</HelpTip>
                    </span>
                    {lanDiscovery ? (
                        <>
                            {peers.map(peer => (
                                <LanTile
                                    key={peer.token}
                                    peer={peer}
                                    selected={peer.token === recipient}
                                    onPick={onPickToken}
                                />
                            ))}
                            <span className={css.searching}>
                                <span className={css.pulse} aria-hidden />
                                {peers.length > 0
                                    ? t("devices.searchingMore")
                                    : t("devices.searching")}
                            </span>
                        </>
                    ) : (
                        <p className={css.discoveryOff}>
                            <Trans
                                t={t}
                                i18nKey="devices.discoveryOff"
                                components={{
                                    settingsLink: (
                                        <button
                                            type="button"
                                            className={css.settingsLink}
                                            onClick={() => openSettings()}
                                        />
                                    ),
                                }}
                            />
                        </p>
                    )}

                    {!isLoading && (
                        <>
                            <span className={css.label}>
                                {t("devices.own")}
                            </span>
                            {isLoggedIn ? (
                                <DeviceList
                                    selectedUuid={selectedDeviceUuid}
                                    onSelect={onPickDevice}
                                />
                            ) : (
                                <span className={css.signIn}>
                                    {t("devices.loginToRegister")}
                                    <HelpTip hoverable>
                                        <Trans
                                            t={t}
                                            i18nKey="devices.faqHint"
                                            components={{
                                                faqLink: (
                                                    <Anchor to="/faq#device-management" />
                                                ),
                                            }}
                                        />
                                    </HelpTip>
                                </span>
                            )}
                        </>
                    )}
                </div>
                <div
                    className={`${css.shadowTop} ${shadows.top ? css.visible : ""}`}
                    style={{
                        right: `calc(${shadows.scrollbar}px - var(--space-8))`,
                    }}
                    aria-hidden
                />
                <div
                    className={`${css.shadowBottom} ${shadows.bottom ? css.visible : ""}`}
                    style={{
                        right: `calc(${shadows.scrollbar}px - var(--space-8))`,
                    }}
                    aria-hidden
                />
            </div>
        </aside>
    );
}

function LanTile({
    peer,
    selected,
    onPick,
}: {
    peer: LanPeer;
    selected: boolean;
    onPick: (token: string) => void;
}) {
    const { t } = useTranslation("dashboard");
    const deviceInfo =
        peer.browser && peer.os
            ? `${peer.browser} · ${peer.os}`
            : peer.browser || peer.os || t("devices.unknown");

    return (
        <DeviceTile
            online
            selected={selected}
            onSelect={() => onPick(peer.token)}
        >
            <span className={css.tileToken}>{peer.token.toUpperCase()}</span>
            <TruncatedText className={css.tileInfo}>{deviceInfo}</TruncatedText>
        </DeviceTile>
    );
}
