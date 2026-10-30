import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    IconChevronDown as CollapseIcon,
    IconChevronUp as ExpandIcon,
    IconNetwork as ConnectionIcon,
    IconX as CloseIcon,
} from "@tabler/icons-react";
import css from "./ConnectionDetails.module.scss";
import CardHeading from "../CardHeading/CardHeading";
import IconButton from "../../IconButton/IconButton";
import {
    ConnectionDetailsEntry,
    useConnectionDetails,
} from "../../../hooks/useConnectionDetails";
import { useCpuPressure } from "../../../hooks/useCpuPressure";
import { updateSettings } from "../../../services/SettingsStore";
import { isCpuPressureSupported } from "../../../services/CpuPressure";
import { CandidateEnd } from "../../../services/ConnectionDetails";
import { displayToken } from "../../../services/WebSocketService";
import { peerColor } from "../../../util/peerColor";

/**
 * Panel over the dashboard with route, round trip time and speed of every
 * peer connection. Shown while the connectionDetails setting is on.
 */
export default function ConnectionDetails() {
    const { t } = useTranslation("dashboard");
    const connections = useConnectionDetails();
    const cpuPressure = useCpuPressure();
    const [collapsed, setCollapsed] = useState(false);
    return (
        <section
            className={css.panel}
            aria-labelledby="connection-details-heading"
        >
            <div className={css.header}>
                <CardHeading
                    id="connection-details-heading"
                    icon={ConnectionIcon}
                    tone="primary"
                    className={css.title}
                >
                    {t("connections.title")}
                </CardHeading>
                <IconButton
                    label={
                        collapsed
                            ? t("connections.expand")
                            : t("connections.collapse")
                    }
                    size="m"
                    aria-expanded={!collapsed}
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? (
                        <ExpandIcon aria-hidden />
                    ) : (
                        <CollapseIcon aria-hidden />
                    )}
                </IconButton>
                <IconButton
                    label={t("connections.close")}
                    size="m"
                    onClick={() => updateSettings({ connectionDetails: false })}
                >
                    <CloseIcon aria-hidden />
                </IconButton>
            </div>
            {!collapsed && (
                <div className={css.body}>
                    <dl className={css.facts}>
                        <dt>{t("connections.cpu.label")}</dt>
                        <dd>
                            {!isCpuPressureSupported()
                                ? t("connections.cpu.unsupported")
                                : cpuPressure
                                  ? t(`connections.cpu.${cpuPressure}`)
                                  : t("transfers.status.measuring")}
                        </dd>
                    </dl>
                    {connections.length === 0 ? (
                        <p className={css.muted}>{t("connections.empty")}</p>
                    ) : (
                        connections.map(connection => (
                            <ConnectionEntry
                                key={connection.remoteToken}
                                connection={connection}
                            />
                        ))
                    )}
                </div>
            )}
        </section>
    );
}

function ConnectionEntry({
    connection,
}: {
    connection: ConnectionDetailsEntry;
}) {
    const { t, i18n } = useTranslation("dashboard");
    const token = displayToken(connection.remoteToken);
    const { main } = connection;
    const measuring = t("transfers.status.measuring");

    return (
        <article className={css.connection} aria-label={token}>
            <div className={css.connectionHeader}>
                <span
                    className={css.token}
                    style={{ color: peerColor(connection.remoteToken) }}
                >
                    {token}
                </span>
                {connection.ownDevice && (
                    <span className={css.muted}>
                        {t("connections.ownDevice")}
                    </span>
                )}
                <span className={css.state}>
                    {t(`connections.state.${connection.state}`)}
                </span>
            </div>
            <dl className={css.facts}>
                <dt>{t("connections.route.label")}</dt>
                <dd>
                    {main
                        ? t(`connections.route.${main.route}`)
                        : t("connections.route.none")}
                    {main?.local && main.remote && (
                        <span className={css.detail}>
                            {t("connections.candidates", {
                                local: main.local.type,
                                remote: main.remote.type,
                                protocol: (
                                    main.local.protocol ?? ""
                                ).toUpperCase(),
                            })}
                        </span>
                    )}
                    {main?.local?.relayProtocol && (
                        <span className={css.detail}>
                            {t("connections.relayProtocol", {
                                protocol:
                                    main.local.relayProtocol.toUpperCase(),
                            })}
                        </span>
                    )}
                </dd>
                {main && (
                    <>
                        <dt>{t("connections.localAddress")}</dt>
                        <AddressCell end={main.local} />
                        <dt>{t("connections.remoteAddress")}</dt>
                        <AddressCell end={main.remote} />
                        <dt>{t("connections.ping")}</dt>
                        <dd>
                            {main.roundTripTimeMs !== null
                                ? formatMs(main.roundTripTimeMs, i18n.language)
                                : measuring}
                        </dd>
                    </>
                )}
                {connection.activeLanes > 1 && (
                    <>
                        <dt>{t("connections.lanes")}</dt>
                        <dd>{connection.activeLanes}</dd>
                    </>
                )}
                <dt>{t("connections.sending")}</dt>
                <dd>
                    {connection.sendMbps !== null
                        ? formatMbps(connection.sendMbps, i18n.language)
                        : measuring}
                </dd>
                <dt>{t("connections.receiving")}</dt>
                <dd>
                    {connection.receiveMbps !== null
                        ? formatMbps(connection.receiveMbps, i18n.language)
                        : measuring}
                </dd>
            </dl>
        </article>
    );
}

function AddressCell({ end }: { end: CandidateEnd | null }) {
    const { t } = useTranslation("dashboard");
    const address = formatAddress(end);
    return address ? (
        <dd className={css.mono}>{address}</dd>
    ) : (
        <dd className={css.muted}>{t("connections.hidden")}</dd>
    );
}

/** "address:port", IPv6 in brackets. Null while the browser withholds the address. */
function formatAddress(end: CandidateEnd | null): string | null {
    if (!end?.address) {
        return null;
    }
    const host = end.address.includes(":") ? `[${end.address}]` : end.address;
    return end.port !== null ? `${host}:${end.port}` : host;
}

function formatMbps(mbps: number, locale: string): string {
    const digits = mbps < 10 ? 1 : 0;
    return `${mbps.toLocaleString(locale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    })} Mbit/s`;
}

function formatMs(ms: number, locale: string): string {
    return `${Math.round(ms).toLocaleString(locale)} ms`;
}
