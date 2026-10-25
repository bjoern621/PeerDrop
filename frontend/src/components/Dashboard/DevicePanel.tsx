import { RefObject, useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import css from "./DevicePanel.module.scss";
import {
    IconChevronDown as ChevronIcon,
    IconDevices as DevicesIcon,
} from "@tabler/icons-react";
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
    /** Shows the heading alone, which opens the panel over the content below. */
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
    const openButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const isOpen = floating && open;
    // A close by keyboard or by a pick inside the panel hands focus back to the card below it.
    const returnFocus = useRef(false);

    const close = (focusCard: boolean) => {
        returnFocus.current = focusCard;
        setOpen(false);
    };

    useEffect(() => {
        if (isOpen) {
            closeButtonRef.current?.focus();
        } else if (returnFocus.current) {
            returnFocus.current = false;
            openButtonRef.current?.focus();
        }
    }, [isOpen]);

    useDismiss(isOpen, close, panelRef);

    const pickToken = (token: string) => {
        onPickToken(token);
        close(true);
    };

    const pickDevice = (device: Device) => {
        onPickDevice(device);
        close(true);
    };

    const panelState = floating
        ? `${css.floating} ${open ? "" : css.closed}`
        : "";

    return (
        <>
            {floating && (
                <div className={css.toggleCard} inert={isOpen}>
                    <DevicesToggleHeading
                        id="devices-heading"
                        open={false}
                        buttonRef={openButtonRef}
                        onToggle={() => setOpen(true)}
                    />
                </div>
            )}
            <aside
                ref={panelRef}
                id="devices-panel"
                className={`${css.panel} ${panelState}`}
                aria-labelledby={
                    floating ? "devices-panel-heading" : "devices-heading"
                }
            >
                {floating ? (
                    <DevicesToggleHeading
                        id="devices-panel-heading"
                        open
                        buttonRef={closeButtonRef}
                        onToggle={() => close(true)}
                    />
                ) : (
                    <CardHeading
                        id="devices-heading"
                        icon={DevicesIcon}
                        tone="primary"
                    >
                        {t("devices.title")}
                    </CardHeading>
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
        </>
    );
}

/** Card heading as a button that opens or closes the floating panel. */
function DevicesToggleHeading({
    id,
    open,
    buttonRef,
    onToggle,
}: {
    id: string;
    open: boolean;
    buttonRef: RefObject<HTMLButtonElement | null>;
    onToggle: () => void;
}) {
    const { t } = useTranslation("dashboard");

    return (
        <CardHeading id={id} icon={DevicesIcon} tone="primary">
            <button
                ref={buttonRef}
                type="button"
                className={css.toggle}
                aria-expanded={open}
                aria-controls="devices-panel"
                onClick={onToggle}
            >
                {t("devices.title")}
                <ChevronIcon
                    className={`${css.chevron} ${open ? css.chevronOpen : ""}`}
                    aria-hidden
                />
            </button>
        </CardHeading>
    );
}

/**
 * Calls `close` while `open` on Escape, asking for focus back, and on a press
 * outside the given elements, leaving focus where the press put it.
 */
function useDismiss(
    open: boolean,
    close: (returnFocus: boolean) => void,
    ...insideRefs: RefObject<HTMLElement | null>[]
) {
    const latest = useRef({ close, insideRefs });

    useEffect(() => {
        latest.current = { close, insideRefs };
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            const inside = latest.current.insideRefs.some(ref =>
                ref.current?.contains(target)
            );
            if (!inside) {
                latest.current.close(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                latest.current.close(true);
            }
        };

        window.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);
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
