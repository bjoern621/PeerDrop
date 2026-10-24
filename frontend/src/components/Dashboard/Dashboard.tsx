import {
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import { useSearchParams } from "react-router";
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
import { useDeviceHeartbeat } from "../../hooks/useDeviceHeartbeat";
import { useMessagingService } from "../../context/connection/MessagingContext";
import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";
import { MAX_TEXT_BYTES } from "../../services/MessagingService";
import { normalizeClientToken } from "../../services/WebSocketService";
import { DeviceStatus } from "../../types/device/DeviceStatus";
import { Device } from "../../types/device/Device";
import { ShareSelection } from "../../types/transfer/ShareSelection";
import { CLIENT_TOKEN_LENGTH } from "../../util/Constants";

const LOCK_TICK_MS = 250;

export default function Dashboard() {
    useDeviceHeartbeat({ status: DeviceStatus.ONLINE });

    const messagingService = useMessagingService();
    const messaging = useMessaging();
    const transferTracker = usePeerConnectionManager().getTransferTracker();
    const transfers = useSyncExternalStore(
        listener => transferTracker.subscribe(listener),
        () => transferTracker.getSnapshot()
    );
    const ownToken = useOwnToken();
    const stacked = useMediaQuery("(width <= 760px)");
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

    useEffect(() => {
        if (complete) {
            messagingService.lookup(recipient);
        }
        // exhaustive-deps-exclude [messagingService]
    }, [recipient, complete]);

    const lock = messaging.lock;
    useEffect(() => {
        if (!lock) {
            return;
        }
        const tick = window.setInterval(() => setNow(Date.now()), LOCK_TICK_MS);
        return () => window.clearInterval(tick);
    }, [lock]);

    const lookup = complete ? messaging.lookups.get(recipient) : undefined;
    const blocked = messaging.blocked.has(recipient);
    const ready = complete && lookup?.status === "online" && !blocked;
    const hasText = draft.trim().length > 0;
    const tooBig = useMemo(
        () => new TextEncoder().encode(draft).length > MAX_TEXT_BYTES,
        [draft]
    );

    const hint = nextStep({
        recipient,
        ownToken,
        lookup,
        blocked,
        tooBig,
        lock,
        now,
    });

    const pickToken = (token: string) => {
        setSelectedDeviceUuid(null);
        setRecipient(normalizeClientToken(token));
    };

    const pickDevice = (device: Device) => {
        if (device.status !== DeviceStatus.ONLINE || device.current) {
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
        void messagingService.sendText(recipient, draft);
        setDraft("");
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
                    filesRecipient={ready ? recipient.toUpperCase() : null}
                    onSelection={sendSelection}
                    // The phone layout dissolves the column box.
                    boundsRef={stacked ? dashboardRef : rightRef}
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
                        Übertragungen
                    </CardHeading>
                    <ActivityList messaging={messaging} transfers={transfers} />
                </section>
            </div>
        </div>
    );
}
