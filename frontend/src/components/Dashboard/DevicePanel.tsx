import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import css from "./DevicePanel.module.scss";
import {
    IconArrowsDiagonal as ExpandIcon,
    IconArrowsDiagonalMinimize2 as CollapseIcon,
    IconDevices as DevicesIcon,
} from "@tabler/icons-react";
import { useLanPeers } from "../../hooks/useLanPeers";
import useSettings from "../../hooks/useSettings";
import { useSettingsDialog } from "../../context/SettingsDialogContext";
import { useAuth } from "../../context/AuthContext";
import { useScrollShadows } from "../../hooks/useScrollShadows";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { useOutsidePress } from "../../hooks/useOutsidePress";
import { useTimeout } from "../../hooks/useTimeout";
import { LanPeer } from "../../types/lan/LanPeer";
import { Device } from "../../types/device/Device";
import HelpTip from "../HelpTip/HelpTip";
import TruncatedText from "../TruncatedText/TruncatedText";
import EdgeShadows from "./EdgeShadows/EdgeShadows";
import Anchor from "../Anchor/Anchor";
import IconButton from "../IconButton/IconButton";
import CardHeading from "./CardHeading/CardHeading";
import DeviceList from "./Devices/DeviceList/DeviceList";
import DeviceTile from "./Devices/DeviceTile/DeviceTile";

// Matches the transition of .moving in DevicePanel.module.scss.
const MOVE_MS = 200;

interface DevicePanelProps {
    recipient: string;
    selectedDeviceUuid: string | null;
    onPickToken: (token: string) => void;
    onPickDevice: (device: Device) => void;
    /** Offers to enlarge the list over the content below. */
    floating: boolean;
}

/** Recipients to pick with one click: devices in the same network and own devices. */
export default function DevicePanel({
    recipient,
    selectedDeviceUuid,
    onPickToken,
    onPickDevice,
    floating,
}: DevicePanelProps) {
    const { t } = useTranslation("dashboard");
    const { peers } = useLanPeers();
    const { lanDiscovery } = useSettings();
    const { openSettings } = useSettingsDialog();
    const { isLoggedIn, isStatusKnown } = useAuth();
    const pending = isStatusKnown ? "" : css.pending;
    const scrollRef = useRef<HTMLDivElement>(null);
    const shadows = useScrollShadows(scrollRef);
    const panelRef = useRef<HTMLElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const isOpen = floating && open;
    const [moving, setMoving] = useState(false);
    const moveEnd = useTimeout();
    // A close by keyboard or by a pick inside the panel hands focus back to the toggle.
    const returnFocus = useRef(false);

    // The transition runs only while opening or closing, so the panel follows a resize at once.
    const changeOpen = (next: boolean) => {
        setOpen(next);
        setMoving(true);
        moveEnd.set(() => setMoving(false), MOVE_MS);
    };

    const close = (focusToggle: boolean) => {
        returnFocus.current = focusToggle;
        changeOpen(false);
    };

    useEffect(() => {
        if (!isOpen && returnFocus.current) {
            returnFocus.current = false;
            toggleRef.current?.focus();
        }
    }, [isOpen]);

    useEscapeKey(() => close(true), isOpen);
    useOutsidePress(panelRef, () => close(false), isOpen);

    const pickToken = (token: string) => {
        onPickToken(token);
        close(true);
    };

    const pickDevice = (device: Device) => {
        onPickDevice(device);
        close(true);
    };

    return (
        <>
            {floating && <div className={css.placeholder} aria-hidden />}
            <aside
                ref={panelRef}
                id="devices-panel"
                className={`${css.panel} ${floating ? css.compact : ""} ${isOpen ? css.floating : ""} ${moving ? css.moving : ""}`}
                aria-labelledby="devices-heading"
            >
                <CardHeading
                    id="devices-heading"
                    icon={DevicesIcon}
                    tone="primary"
                >
                    <span className={css.title}>{t("devices.title")}</span>
                    {floating && (
                        <IconButton
                            ref={toggleRef}
                            className={css.toggle}
                            label={t(
                                isOpen ? "devices.collapse" : "devices.expand"
                            )}
                            size="m"
                            aria-expanded={isOpen}
                            onClick={() =>
                                isOpen ? close(false) : changeOpen(true)
                            }
                        >
                            {isOpen ? (
                                <CollapseIcon aria-hidden />
                            ) : (
                                <ExpandIcon aria-hidden />
                            )}
                        </IconButton>
                    )}
                </CardHeading>
                {floating && (
                    <button
                        type="button"
                        className={css.expandHint}
                        onClick={() => changeOpen(true)}
                    >
                        {t("devices.expandHint")}
                    </button>
                )}
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
                                        onPick={pickToken}
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

                        <span className={css.label}>{t("devices.own")}</span>
                        {isLoggedIn ? (
                            <DeviceList
                                selectedUuid={selectedDeviceUuid}
                                onSelect={pickDevice}
                            />
                        ) : (
                            <span className={`${css.signIn} ${pending}`}>
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
                    </div>
                    <EdgeShadows
                        shadows={shadows}
                        className={css.edgeShadows}
                    />
                </div>
            </aside>
        </>
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
