import { useRef } from "react";
import css from "./DevicePanel.module.scss";
import {
    IconDevices as DevicesIcon,
    IconHelpCircle as QuestionIcon,
    IconCheck as CheckIcon,
} from "@tabler/icons-react";
import { useLanPeers } from "../../hooks/useLanPeers";
import useSettings from "../../hooks/useSettings";
import { useSettingsDialog } from "../../context/SettingsDialogContext";
import { useAuth } from "../../context/AuthContext";
import { useScrollShadows } from "../../hooks/useScrollShadows";
import { LanPeer } from "../../types/lan/LanPeer";
import { Device } from "../../types/device/Device";
import Tooltip from "../Tooltip/Tooltip";
import Anchor from "../Anchor/Anchor";
import DeviceList from "./Devices/DeviceList/DeviceList";

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
    const { peers } = useLanPeers();
    const { lanDiscovery } = useSettings();
    const { openSettings } = useSettingsDialog();
    const { isLoggedIn, isLoading } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);
    const shadows = useScrollShadows(scrollRef);

    return (
        <aside className={css.panel} aria-labelledby="devices-heading">
            <h2 id="devices-heading" className={css.heading}>
                <DevicesIcon aria-hidden />
                Geräte
            </h2>
            <div className={css.scrollFrame}>
                <div ref={scrollRef} className={css.scroll}>
                    <span className={css.label}>
                        In deinem Netzwerk
                        <Tooltip content="Geräte im selben Netzwerk erscheinen hier automatisch">
                            <QuestionIcon className={css.help} aria-hidden />
                        </Tooltip>
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
                                    ? "Suche weiter..."
                                    : "Suche nach Geräten in deinem Netzwerk..."}
                            </span>
                        </>
                    ) : (
                        <p className={css.discoveryOff}>
                            Die Suche nach Geräten im Netzwerk ist abgeschaltet.
                            Schalte sie{" "}
                            <button
                                type="button"
                                className={css.settingsLink}
                                onClick={() => openSettings()}
                            >
                                in den Einstellungen
                            </button>{" "}
                            wieder ein.
                        </p>
                    )}

                    {!isLoading && (
                        <>
                            <span className={css.label}>Deine Geräte</span>
                            {isLoggedIn ? (
                                <DeviceList
                                    selectedUuid={selectedDeviceUuid}
                                    onSelect={onPickDevice}
                                />
                            ) : (
                                <span className={css.signIn}>
                                    Melde dich an, um Geräte zu registrieren
                                    <Tooltip
                                        content={
                                            <>
                                                Zu FAQ wechseln:{" "}
                                                <Anchor to="/faq#device-management">
                                                    Geräteverwaltung
                                                </Anchor>
                                            </>
                                        }
                                        hoverable
                                    >
                                        <QuestionIcon
                                            className={css.help}
                                            aria-hidden
                                        />
                                    </Tooltip>
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
    const deviceInfo =
        peer.browser && peer.os
            ? `${peer.browser} · ${peer.os}`
            : peer.browser || peer.os || "Unbekanntes Gerät";

    return (
        <button
            type="button"
            className={css.tile}
            aria-pressed={selected}
            onClick={() => onPick(peer.token)}
        >
            <span className={css.online} aria-hidden />
            <span className={css.tileToken}>{peer.token.toUpperCase()}</span>
            <span className={css.tileInfo}>{deviceInfo}</span>
            {selected && <CheckIcon className={css.check} aria-hidden />}
        </button>
    );
}
