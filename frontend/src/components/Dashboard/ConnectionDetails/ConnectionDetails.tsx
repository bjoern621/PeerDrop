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
import Button from "../../Button/Button";
import {
    ConnectionDetailsEntry,
    useConnectionDetails,
} from "../../../hooks/useConnectionDetails";
import { useCpuPressure } from "../../../hooks/useCpuPressure";
import { useTransfers } from "../../../hooks/useTransfers";
import { usePeerConnectionManager } from "../../../context/connection/PeerConnectionContext";
import { updateSettings } from "../../../services/SettingsStore";
import { isCpuPressureSupported } from "../../../services/CpuPressure";
import { CandidateEnd } from "../../../services/ConnectionDetails";
import {
    speedLimitOf,
    SpeedTestOutcome,
    SpeedTestResult,
} from "../../../services/SpeedTest";
import { ClientToken, displayToken } from "../../../services/WebSocketService";
import { peerColor } from "../../../util/peerColor";
import { SPEED_TEST_DURATION_MS } from "../../../util/Constants";

/** "running" while the test sends, the outcome once it ended. */
type SpeedTestState = "running" | SpeedTestOutcome;

/**
 * Panel over the dashboard with route, round trip time and speed of every
 * peer connection, and a speed test per peer. Shown while the
 * connectionDetails setting is on.
 */
export default function ConnectionDetails() {
    const { t } = useTranslation("dashboard");
    const peerConnectionManager = usePeerConnectionManager();
    const connections = useConnectionDetails();
    const cpuPressure = useCpuPressure();
    const transfers = useTransfers();
    const [collapsed, setCollapsed] = useState(false);
    const [speedTests, setSpeedTests] = useState<
        ReadonlyMap<ClientToken, SpeedTestState>
    >(new Map());

    const busyPeers = new Set(
        transfers
            .filter(
                transfer =>
                    transfer.status === "active" ||
                    transfer.status === "finalizing"
            )
            .map(transfer => transfer.remoteToken)
    );

    const measureSpeed = (remoteToken: ClientToken) => {
        setSpeedTests(tests => new Map(tests).set(remoteToken, "running"));
        void peerConnectionManager
            .measureSpeed(remoteToken)
            .then(outcome =>
                setSpeedTests(tests => new Map(tests).set(remoteToken, outcome))
            );
    };

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
                                speedTest={speedTests.get(
                                    connection.remoteToken
                                )}
                                busy={busyPeers.has(connection.remoteToken)}
                                onMeasureSpeed={() =>
                                    measureSpeed(connection.remoteToken)
                                }
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
    speedTest,
    busy,
    onMeasureSpeed,
}: {
    connection: ConnectionDetailsEntry;
    speedTest: SpeedTestState | undefined;
    busy: boolean;
    onMeasureSpeed: () => void;
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
            <SpeedTestSection
                token={token}
                state={speedTest}
                busy={busy}
                connected={connection.state === "connected"}
                onMeasure={onMeasureSpeed}
            />
        </article>
    );
}

function SpeedTestSection({
    token,
    state,
    busy,
    connected,
    onMeasure,
}: {
    token: string;
    state: SpeedTestState | undefined;
    busy: boolean;
    connected: boolean;
    onMeasure: () => void;
}) {
    const { t } = useTranslation("dashboard");
    const running = state === "running";

    return (
        <div className={css.speedTest}>
            <Button
                size="small"
                variant="outline"
                disabled={running || busy || !connected}
                onClick={onMeasure}
            >
                {running
                    ? t("connections.speed.measuring")
                    : t("connections.speed.measure")}
            </Button>
            {busy ? (
                <p className={css.muted}>
                    {t("connections.speed.busy", { token })}
                </p>
            ) : (
                (state === undefined || running) && (
                    <p className={css.muted}>
                        {t("connections.speed.hint", {
                            token,
                            seconds: SPEED_TEST_DURATION_MS / 1000,
                        })}
                    </p>
                )
            )}
            {state !== undefined &&
                state !== "running" &&
                (state.ok ? (
                    <SpeedTestReport token={token} result={state.result} />
                ) : (
                    <p className={css.problem}>
                        {t(`connections.speed.${state.reason}`, { token })}
                    </p>
                ))}
        </div>
    );
}

function SpeedTestReport({
    token,
    result,
}: {
    token: string;
    result: SpeedTestResult;
}) {
    const { t, i18n } = useTranslation("dashboard");
    const limit = speedLimitOf(result);
    const formatRtt = (ms: number | null) =>
        ms !== null ? formatMs(ms, i18n.language) : "?";

    return (
        <>
            <p>
                <span className={css.speed}>
                    {formatMbps(result.mbps, i18n.language)}
                </span>{" "}
                {t("connections.speed.result", { token })}
            </p>
            <p>
                <span className={css.label}>
                    {t("connections.speed.limitLabel")}:
                </span>{" "}
                {t(`connections.speed.limit.${limit}`, {
                    idle: Math.round(result.idleRttMs ?? 0),
                    load: Math.round(result.loadRttMs ?? 0),
                })}
            </p>
            <dl className={css.facts}>
                <dt>{t("connections.speed.buffer")}</dt>
                <dd>
                    {t("connections.speed.bufferValue", {
                        percent: Math.round(result.bufferFilledShare * 100),
                    })}
                </dd>
                <dt>{t("connections.speed.pingIdleLoad")}</dt>
                <dd>
                    {formatRtt(result.idleRttMs)} /{" "}
                    {formatRtt(result.loadRttMs)}
                </dd>
                {result.cpuPressure && (
                    <>
                        <dt>{t("connections.speed.cpuPeak")}</dt>
                        <dd>{t(`connections.cpu.${result.cpuPressure}`)}</dd>
                    </>
                )}
            </dl>
        </>
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
