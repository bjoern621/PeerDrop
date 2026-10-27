import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import css from "./Dashboard.module.scss";
import TokenCard from "./TokenCard";
import DevicePanel from "./DevicePanel";
import SendPanel from "./SendPanel";
import ActivityList from "./ActivityList/ActivityList";
import CardHeading from "./CardHeading/CardHeading";
import { IconArrowsTransferUpDown as TransferIcon } from "@tabler/icons-react";
import { nextStep } from "./nextStep";
import { useMessaging } from "../../hooks/useMessaging";
import { useOwnToken } from "../../hooks/useOwnToken";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { COMPACT_QUERY, PHONE_QUERY } from "../../util/mediaQueries";
import { useDeviceHeartbeat } from "../../hooks/useDeviceHeartbeat";
import { useMessagingService } from "../../context/connection/MessagingContext";
import { useTransfers } from "../../hooks/useTransfers";
import { LookupState, MAX_TEXT_BYTES } from "../../services/MessagingService";
import {
    displayToken,
    normalizeClientToken,
} from "../../services/WebSocketService";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { Device } from "../../types/device/Device";
import { ShareSelection } from "../../types/transfer/ShareSelection";
import { CLIENT_TOKEN_LENGTH } from "../../util/Constants";
import { textBytes } from "./transferFormat";

const LOCK_TICK_MS = 250;
// Shortest time the hint shows the online check, so it does not flash by.
const MIN_CHECK_MS = 600;

export default function Dashboard() {
    useDeviceHeartbeat({ status: DeviceStatus.ONLINE });

    const { t } = useTranslation("dashboard");
    const messagingService = useMessagingService();
    const messaging = useMessaging();
    const transfers = useTransfers();
    const ownToken = useOwnToken();
    const stacked = useMediaQuery(PHONE_QUERY);
    const compact = useMediaQuery(COMPACT_QUERY);
    const [searchParams] = useSearchParams();

    const [recipient, setRecipient] = useState(() =>
        normalizeClientToken(searchParams.get("token") ?? "").slice(
            0,
            CLIENT_TOKEN_LENGTH
        )
    );
    const [selectedDeviceUuid, setSelectedDeviceUuid] = useState<string | null>(
        null
    );
    const [draft, setDraft] = useState("");
    const [now, setNow] = useState(() => Date.now());
    const dashboardRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);

    const complete =
        recipient.length === CLIENT_TOKEN_LENGTH && recipient !== ownToken;

    const lock = messaging.lock;
    // The server answers every lookup during the lock with the lock itself,
    // so the check waits for its end and runs then.
    const tokensLocked = lock?.reason === "tokens";
    useEffect(() => {
        if (complete && !tokensLocked) {
            messagingService.lookup(recipient);
        }
        // exhaustive-deps-exclude [messagingService]
    }, [recipient, complete, tokensLocked]);

    useEffect(() => {
        if (!lock) {
            return;
        }
        const tick = window.setInterval(() => setNow(Date.now()), LOCK_TICK_MS);
        return () => window.clearInterval(tick);
    }, [lock]);

    const lookup = useSteadyLookup(
        recipient,
        complete ? messaging.lookups.get(recipient) : undefined
    );
    const blocked = messaging.blocked.has(recipient);
    const ready = complete && lookup?.status === "online" && !blocked;
    const hasText = draft.trim().length > 0;
    const tooBig = useMemo(() => textBytes(draft) > MAX_TEXT_BYTES, [draft]);

    const hint = nextStep(
        {
            recipient,
            ownToken,
            lookup,
            blocked,
            tooBig,
            lock,
            now,
        },
        t
    );

    const pickToken = (token: string) => {
        const picked = normalizeClientToken(token);
        setSelectedDeviceUuid(null);
        setRecipient(picked === recipient ? "" : picked);
    };

    const pickDevice = (device: Device) => {
        if (device.status !== DeviceStatus.ONLINE || device.current) {
            return;
        }
        if (device.uuid === selectedDeviceUuid) {
            setSelectedDeviceUuid(null);
            setRecipient("");
            return;
        }
        void messagingService.lookupDevice(device.uuid).then(token => {
            if (token) {
                setRecipient(token);
                setSelectedDeviceUuid(device.uuid);
            }
        });
    };

    const sendText = () => {
        if (!ready || !hasText || tooBig || lock) {
            return;
        }
        if (messagingService.sendText(recipient, draft)) {
            setDraft("");
        }
    };

    const sendSelection = (selection: ShareSelection) => {
        if (ready) {
            void messagingService.sendSelection(recipient, selection);
        }
    };

    return (
        <div ref={dashboardRef} className={css.dashboard}>
            <div className={css.left}>
                <TokenCard />
                <DevicePanel
                    recipient={recipient}
                    selectedDeviceUuid={selectedDeviceUuid}
                    onPickToken={pickToken}
                    onPickDevice={pickDevice}
                    floating={compact}
                />
            </div>
            <div ref={rightRef} className={css.right}>
                <SendPanel
                    recipient={recipient}
                    onRecipientChange={token => {
                        setSelectedDeviceUuid(null);
                        setRecipient(token);
                    }}
                    check={
                        !complete ||
                        blocked ||
                        !lookup ||
                        lookup.status === "checking"
                            ? null
                            : lookup.status
                    }
                    hint={hint}
                    draft={draft}
                    onDraftChange={setDraft}
                    canWriteText={ready}
                    canSendText={ready && hasText && !tooBig && !lock}
                    pauseProgress={
                        lock?.reason === "texts"
                            ? Math.min(
                                  1,
                                  Math.max(
                                      0,
                                      (now - lock.from) /
                                          (lock.until - lock.from || 1)
                                  )
                              )
                            : null
                    }
                    onSendText={sendText}
                    filesRecipient={ready ? displayToken(recipient) : null}
                    onSelection={sendSelection}
                    // The phone and compact layouts dissolve the column box.
                    boundsRef={stacked || compact ? dashboardRef : rightRef}
                />
                <section
                    className={css.transfers}
                    aria-labelledby="transfers-heading"
                >
                    <CardHeading
                        id="transfers-heading"
                        icon={TransferIcon}
                        tone="primary"
                        className={css.transfersHeading}
                    >
                        {t("transfers.title")}
                    </CardHeading>
                    <ActivityList messaging={messaging} transfers={transfers} />
                </section>
            </div>
        </div>
    );
}

/** Reports a fresh lookup as still checking until MIN_CHECK_MS have passed. */
function useSteadyLookup(
    token: string,
    lookup: LookupState | undefined
): LookupState | undefined {
    const [held, setHeld] = useState<string | null>(null);
    const checking = lookup?.status === "checking";

    useEffect(() => {
        if (checking) {
            setHeld(token);
        }
    }, [token, checking]);

    // Keyed on the held token alone, so the lookup answering early keeps the timer.
    useEffect(() => {
        if (held === null) {
            return;
        }
        const timer = window.setTimeout(() => setHeld(null), MIN_CHECK_MS);
        return () => window.clearTimeout(timer);
    }, [held]);

    return held === token && lookup ? { status: "checking" } : lookup;
}
