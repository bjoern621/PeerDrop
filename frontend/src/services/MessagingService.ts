import {
    ClientToken,
    WebSocketService,
    normalizeClientToken,
} from "./WebSocketService";
import { OutgoingFile, PeerConnectionManager } from "./PeerConnectionManager";
import { E2eCrypto, Sealed } from "./E2eCrypto";
import { MessageType } from "../types/MessageType";
import { ITypedMessage } from "../types/ITypedMessage";
import { ShareSelection } from "../types/transfer/ShareSelection";
import { PublicKeyMessage } from "../types/messaging/PublicKeyMessage";
import { TokenLookupMessage } from "../types/messaging/TokenLookupMessage";
import { TokenStatusMessage } from "../types/messaging/TokenStatusMessage";
import { OutgoingTextMessage } from "../types/messaging/OutgoingTextMessage";
import { IncomingTextMessage } from "../types/messaging/IncomingTextMessage";
import { TextResultMessage } from "../types/messaging/TextResultMessage";
import { OutgoingTransferOfferMessage } from "../types/messaging/OutgoingTransferOfferMessage";
import { IncomingTransferOfferMessage } from "../types/messaging/IncomingTransferOfferMessage";
import { TransferOfferResultMessage } from "../types/messaging/TransferOfferResultMessage";
import { TransferOfferCancelMessage } from "../types/messaging/TransferOfferCancelMessage";
import { TransferAnswerMessage } from "../types/messaging/TransferAnswerMessage";
import { EstablishConnectionMessage } from "../types/connection/EstablishConnectionMessage";
import errorAsValue from "../util/ErrorAsValue";
import { Logger } from "../util/Logger";
import { TransferDirection } from "./TransferTracker";

/** Largest text the server forwards, in UTF-8 bytes. */
export const MAX_TEXT_BYTES = 1024 * 1024;

const TEXT_BURST = 5;
const TEXT_REFILL_MS = 6000;

export type LookupState =
    | { status: "checking" }
    | { status: "online"; ownDevice: boolean }
    | { status: "offline" };

/** What a transfer offer announces. Travels encrypted. */
export interface OfferSummary {
    /** Set when the offer holds exactly one folder and no loose files. */
    folderName: string | null;
    /** Name of the first loose file, shown for a single file. */
    fileName: string | null;
    count: number;
    bytes: number;
}

export interface TextEntry {
    kind: "text";
    id: string;
    direction: TransferDirection;
    peer: ClientToken;
    text: string;
    at: Date;
    status: "sending" | "delivered" | "failed";
}

export interface OfferEntry {
    kind: "offer";
    offerId: string;
    direction: TransferDirection;
    peer: ClientToken;
    summary: OfferSummary;
    at: Date;
    /** waiting: no answer yet; declined: the receiver said no; failed: the receiver left. */
    status: "waiting" | "declined" | "failed";
}

export interface SendLock {
    reason: "texts" | "tokens";
    from: number;
    until: number;
}

export interface MessagingSnapshot {
    texts: TextEntry[];
    offers: OfferEntry[];
    lookups: ReadonlyMap<ClientToken, LookupState>;
    blocked: ReadonlySet<ClientToken>;
    lock: SendLock | null;
}

interface PeerInfo {
    publicKey: string | null;
    ownDevice: boolean;
}

interface PendingOffer {
    entry: OfferEntry;
    files: OutgoingFile[];
}

/**
 * Texts, transfer offers and recipient checks. Texts and offers travel
 * through the server end-to-end encrypted; files go directly between the
 * peers once the receiver accepted the sender's first offer, or right away
 * between devices of the same account.
 */
export class MessagingService {
    private readonly logger = new Logger("MessagingService");
    private readonly log = (...args: unknown[]) => this.logger.log(...args);

    private readonly crypto = new E2eCrypto();
    private readonly listeners = new Set<() => void>();
    private snapshot: MessagingSnapshot;

    private texts: TextEntry[] = [];
    private readonly outgoingOffers = new Map<string, PendingOffer>();
    private readonly incomingOffers = new Map<string, OfferEntry>();
    private readonly lookups = new Map<ClientToken, LookupState>();
    private readonly peerInfo = new Map<ClientToken, PeerInfo>();
    private readonly deviceLookups = new Map<
        string,
        (token: ClientToken | null) => void
    >();

    // Receivers that accepted an offer from this client.
    private readonly acceptedBy = new Set<ClientToken>();
    // Senders whose offer this client accepted.
    private readonly acceptedFrom = new Set<ClientToken>();
    private readonly blocked = new Set<ClientToken>();

    private lock: SendLock | null = null;
    private lockTimer: ReturnType<typeof setTimeout> | null = null;
    private textTokens = TEXT_BURST;
    private textRefilledAt = Date.now();

    private hadToken = false;

    public constructor(
        private readonly signaling: WebSocketService,
        private readonly peerConnections: PeerConnectionManager
    ) {
        this.logger.setEnabled(false);
        this.snapshot = this.buildSnapshot();

        this.peerConnections.setIncomingGate(
            token => this.acceptedFrom.has(token) && !this.blocked.has(token)
        );

        this.on(MessageType.CLIENT_TOKEN, () => void this.handleNewToken());
        this.on(MessageType.TOKEN_STATUS, message =>
            this.handleTokenStatus(message as TokenStatusMessage)
        );
        this.on(MessageType.TEXT, message => {
            void this.handleIncomingText(message as IncomingTextMessage);
        });
        this.on(MessageType.TEXT_RESULT, message =>
            this.handleTextResult(message as TextResultMessage)
        );
        this.on(MessageType.TRANSFER_OFFER, message => {
            void this.handleIncomingOffer(
                message as IncomingTransferOfferMessage
            );
        });
        this.on(MessageType.TRANSFER_OFFER_RESULT, message =>
            this.handleOfferResult(message as TransferOfferResultMessage)
        );
        this.on(MessageType.TRANSFER_OFFER_CANCEL, message =>
            this.handleOfferCancel(message as TransferOfferCancelMessage)
        );
        this.on(MessageType.TRANSFER_ANSWER, message =>
            this.handleAnswer(message as TransferAnswerMessage)
        );
        this.on(MessageType.ESTABLISH_CONNECTION, message => {
            const { remoteToken, ownDevice } = (
                message as EstablishConnectionMessage
            ).msg;
            if (ownDevice) {
                this.rememberPeer(normalizeClientToken(remoteToken), {
                    ownDevice: true,
                });
            }
        });
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /** Stable between changes, as useSyncExternalStore requires. */
    public getSnapshot(): MessagingSnapshot {
        return this.snapshot;
    }

    /** Asks the server whether a token is online. Own tokens are never asked. */
    public lookup(token: ClientToken) {
        token = normalizeClientToken(token);
        if (this.lookups.get(token)?.status === "checking") {
            return;
        }
        this.lookups.set(token, { status: "checking" });
        this.publish();
        this.signaling.sendMessage(new TokenLookupMessage({ token }));
    }

    /** Resolves the current token of an own device, null when it is offline. */
    public lookupDevice(deviceUuid: string): Promise<ClientToken | null> {
        return new Promise(resolve => {
            this.deviceLookups.set(deviceUuid, resolve);
            this.signaling.sendMessage(new TokenLookupMessage({ deviceUuid }));
        });
    }

    /** Whether files to this peer start without an offer. */
    public sendsDirectly(token: ClientToken): boolean {
        token = normalizeClientToken(token);
        return (
            this.acceptedBy.has(token) ||
            this.peerInfo.get(token)?.ownDevice === true
        );
    }

    public async sendText(to: ClientToken, text: string): Promise<void> {
        to = normalizeClientToken(to);
        if (this.isLocked() || !this.takeTextToken()) {
            return;
        }

        const entry: TextEntry = {
            kind: "text",
            id: crypto.randomUUID(),
            direction: "up",
            peer: to,
            text,
            at: new Date(),
            status: "sending",
        };
        this.texts = [entry, ...this.texts];
        this.publish();

        const sealed = await this.sealFor(to, { text });
        if (!sealed) {
            this.setTextStatus(entry.id, "failed");
            return;
        }
        this.signaling.sendMessage(
            new OutgoingTextMessage({ id: entry.id, to, ...sealed })
        );
    }

    /**
     * Sends a selection of loose files and folders. To a peer that accepted
     * before, or an own device, the files start right away; otherwise the
     * peer gets an offer first.
     */
    public async sendSelection(to: ClientToken, selection: ShareSelection) {
        to = normalizeClientToken(to);
        const files = toOutgoingFiles(selection);
        if (files.length === 0) {
            return;
        }

        if (this.sendsDirectly(to)) {
            this.peerConnections.sendFiles(to, files);
            return;
        }

        const entry: OfferEntry = {
            kind: "offer",
            offerId: crypto.randomUUID(),
            direction: "up",
            peer: to,
            summary: summarize(selection),
            at: new Date(),
            status: "waiting",
        };
        this.outgoingOffers.set(entry.offerId, { entry, files });
        this.publish();

        const sealed = await this.sealFor(to, entry.summary);
        if (!sealed) {
            this.setOfferStatus(entry.offerId, "failed");
            return;
        }
        this.signaling.sendMessage(
            new OutgoingTransferOfferMessage({
                offerId: entry.offerId,
                to,
                ...sealed,
            })
        );
    }

    /** Withdraws an offer that has no answer yet. */
    public cancelOffer(offerId: string) {
        const offer = this.outgoingOffers.get(offerId);
        if (!offer) {
            return;
        }
        this.outgoingOffers.delete(offerId);
        if (offer.entry.status === "waiting") {
            this.signaling.sendMessage(
                new TransferOfferCancelMessage({ offerId })
            );
        }
        this.publish();
    }

    /**
     * Answers an offer. Accepting trusts the sender for the rest of the
     * session, so its other open offers are accepted along with it.
     */
    public answerOffer(offerId: string, accepted: boolean) {
        const offer = this.incomingOffers.get(offerId);
        if (
            !offer ||
            offer.status !== "waiting" ||
            this.blocked.has(offer.peer)
        ) {
            return;
        }

        if (!accepted) {
            this.signaling.sendMessage(
                new TransferAnswerMessage({ offerId, accepted: false })
            );
            this.incomingOffers.set(offerId, { ...offer, status: "declined" });
            this.publish();
            return;
        }

        this.acceptedFrom.add(offer.peer);
        for (const other of Array.from(this.incomingOffers.values())) {
            if (other.peer === offer.peer && other.status === "waiting") {
                this.signaling.sendMessage(
                    new TransferAnswerMessage({
                        offerId: other.offerId,
                        accepted: true,
                    })
                );
                this.incomingOffers.delete(other.offerId);
            }
        }
        this.publish();
    }

    /**
     * Mutes a peer until unblock: its new texts and offers are dropped
     * without telling it, and its connection closes. Its open offers stay
     * listed and wait for an answer until then.
     */
    public block(token: ClientToken) {
        token = normalizeClientToken(token);
        this.blocked.add(token);
        this.acceptedFrom.delete(token);
        this.peerConnections.closePeer(token);
        this.publish();
    }

    /** Lets the peer send again. Its next offer asks once more, since blocking dropped the trust. */
    public unblock(token: ClientToken) {
        this.blocked.delete(normalizeClientToken(token));
        this.publish();
    }

    private on(type: MessageType, handler: (message: ITypedMessage) => void) {
        this.signaling.subscribeMessage(type, handler);
    }

    private async handleNewToken() {
        if (this.hadToken) {
            this.forgetSession();
        }
        this.hadToken = true;
        this.signaling.sendMessage(
            new PublicKeyMessage({ key: await this.crypto.getPublicKey() })
        );
    }

    /**
     * A new token ends every relation of the old one: the server dropped its
     * connections, offers and permissions together with it.
     */
    private forgetSession() {
        this.peerConnections.reset();
        this.acceptedBy.clear();
        this.acceptedFrom.clear();
        this.peerInfo.clear();
        this.lookups.clear();
        this.incomingOffers.clear();
        for (const offer of this.outgoingOffers.values()) {
            if (offer.entry.status === "waiting") {
                offer.entry = { ...offer.entry, status: "failed" };
            }
        }
        this.publish();
    }

    private handleTokenStatus(message: TokenStatusMessage) {
        const {
            token,
            deviceUuid,
            online,
            publicKey,
            ownDevice,
            retryAfterMs,
        } = message.msg;
        const normalized = normalizeClientToken(token);

        if (deviceUuid) {
            const resolve = this.deviceLookups.get(deviceUuid);
            this.deviceLookups.delete(deviceUuid);
            if (online) {
                this.rememberPeer(normalized, { publicKey, ownDevice });
                this.lookups.set(normalized, { status: "online", ownDevice });
                this.publish();
            }
            resolve?.(online ? normalized : null);
            return;
        }

        if (retryAfterMs !== null) {
            this.lookups.delete(normalized);
            this.lockFor("tokens", retryAfterMs);
            return;
        }

        if (online) {
            this.rememberPeer(normalized, { publicKey, ownDevice });
        }
        this.lookups.set(
            normalized,
            online ? { status: "online", ownDevice } : { status: "offline" }
        );
        this.publish();
    }

    private async handleIncomingText(message: IncomingTextMessage) {
        const from = normalizeClientToken(message.msg.from);
        if (this.blocked.has(from)) {
            return;
        }
        const payload = await this.openFrom<{ text: string }>(
            from,
            message.msg.fromKey,
            message.msg
        );
        if (typeof payload?.text !== "string") {
            return;
        }
        this.texts = [
            {
                kind: "text",
                id: crypto.randomUUID(),
                direction: "down",
                peer: from,
                text: payload.text,
                at: new Date(),
                status: "delivered",
            },
            ...this.texts,
        ];
        this.publish();
    }

    private handleTextResult(message: TextResultMessage) {
        const { id, status, retryAfterMs } = message.msg;
        this.setTextStatus(id, status === "delivered" ? "delivered" : "failed");

        if (status === "rate-limited" && retryAfterMs !== null) {
            this.textTokens = 0;
            this.lockFor("texts", retryAfterMs);
        } else if (status === "unknown" && retryAfterMs !== null) {
            this.lockFor("tokens", retryAfterMs);
        }
    }

    private async handleIncomingOffer(message: IncomingTransferOfferMessage) {
        const from = normalizeClientToken(message.msg.from);
        if (this.blocked.has(from)) {
            return;
        }
        const summary = await this.openFrom<OfferSummary>(
            from,
            message.msg.fromKey,
            message.msg
        );
        if (!summary || typeof summary.count !== "number") {
            return;
        }

        // An offer from a trusted sender passes without asking again.
        if (this.acceptedFrom.has(from)) {
            this.signaling.sendMessage(
                new TransferAnswerMessage({
                    offerId: message.msg.offerId,
                    accepted: true,
                })
            );
            return;
        }

        this.incomingOffers.set(message.msg.offerId, {
            kind: "offer",
            offerId: message.msg.offerId,
            direction: "down",
            peer: from,
            summary,
            at: new Date(),
            status: "waiting",
        });
        this.publish();
    }

    private handleOfferResult(message: TransferOfferResultMessage) {
        const { offerId, status, retryAfterMs } = message.msg;
        if (status === "delivered") {
            return;
        }
        this.setOfferStatus(offerId, "failed");
        if (status === "unknown" && retryAfterMs !== null) {
            this.lockFor("tokens", retryAfterMs);
        }
    }

    private handleOfferCancel(message: TransferOfferCancelMessage) {
        if (this.incomingOffers.delete(message.msg.offerId)) {
            this.publish();
        }
    }

    private handleAnswer(message: TransferAnswerMessage) {
        const { offerId, accepted, gone } = message.msg;
        const offer = this.outgoingOffers.get(offerId);
        if (!offer) {
            return;
        }

        if (!accepted) {
            this.setOfferStatus(offerId, gone ? "failed" : "declined");
            return;
        }

        this.outgoingOffers.delete(offerId);
        this.acceptedBy.add(offer.entry.peer);
        this.peerConnections.sendFiles(offer.entry.peer, offer.files);
        this.publish();
    }

    private async sealFor(
        to: ClientToken,
        payload: unknown
    ): Promise<Sealed | null> {
        const publicKey = this.peerInfo.get(to)?.publicKey;
        if (!publicKey) {
            this.log("No public key known for", to);
            return null;
        }
        const [sealed, err] = await errorAsValue(
            this.crypto.seal(publicKey, payload)
        );
        if (err) {
            this.log("Sealing failed for", to, err);
            return null;
        }
        return sealed;
    }

    private async openFrom<T>(
        from: ClientToken,
        fromKey: string | null,
        sealed: Sealed
    ): Promise<T | null> {
        const publicKey = fromKey ?? this.peerInfo.get(from)?.publicKey;
        if (!publicKey) {
            return null;
        }
        this.rememberPeer(from, { publicKey });
        const [payload, err] = await errorAsValue(
            this.crypto.open<T>(publicKey, sealed)
        );
        if (err) {
            this.log("Could not decrypt a message from", from, err);
            return null;
        }
        return payload;
    }

    private rememberPeer(token: ClientToken, info: Partial<PeerInfo>) {
        const known = this.peerInfo.get(token);
        this.peerInfo.set(token, {
            publicKey: info.publicKey ?? known?.publicKey ?? null,
            ownDevice: info.ownDevice ?? known?.ownDevice ?? false,
        });
    }

    private takeTextToken(): boolean {
        const now = Date.now();
        const refills = Math.floor(
            (now - this.textRefilledAt) / TEXT_REFILL_MS
        );
        if (refills > 0) {
            this.textTokens = Math.min(TEXT_BURST, this.textTokens + refills);
            this.textRefilledAt =
                this.textTokens === TEXT_BURST
                    ? now
                    : this.textRefilledAt + refills * TEXT_REFILL_MS;
        }
        if (this.textTokens < 1) {
            this.lockFor("texts", TEXT_REFILL_MS - (now - this.textRefilledAt));
            return false;
        }
        this.textTokens--;
        return true;
    }

    private isLocked(): boolean {
        return this.lock !== null && this.lock.until > Date.now();
    }

    private lockFor(reason: SendLock["reason"], ms: number) {
        const now = Date.now();
        this.lock = { reason, from: now, until: now + Math.max(ms, 0) };
        if (this.lockTimer) clearTimeout(this.lockTimer);
        this.lockTimer = setTimeout(
            () => {
                this.lock = null;
                this.lockTimer = null;
                this.publish();
            },
            Math.max(ms, 0)
        );
        this.publish();
    }

    private setTextStatus(id: string, status: TextEntry["status"]) {
        this.texts = this.texts.map(entry =>
            entry.id === id ? { ...entry, status } : entry
        );
        this.publish();
    }

    private setOfferStatus(offerId: string, status: OfferEntry["status"]) {
        const offer = this.outgoingOffers.get(offerId);
        if (!offer) {
            return;
        }
        offer.entry = { ...offer.entry, status };
        this.publish();
    }

    private buildSnapshot(): MessagingSnapshot {
        return {
            texts: this.texts,
            offers: [
                ...Array.from(
                    this.outgoingOffers.values(),
                    offer => offer.entry
                ),
                ...this.incomingOffers.values(),
            ],
            lookups: new Map(this.lookups),
            blocked: new Set(this.blocked),
            lock: this.isLocked() ? this.lock : null,
        };
    }

    private publish() {
        this.snapshot = this.buildSnapshot();
        this.listeners.forEach(listener => listener());
    }
}

function toOutgoingFiles(selection: ShareSelection): OutgoingFile[] {
    const loose = selection.files.map(file => ({
        file,
        uuid: crypto.randomUUID(),
    }));
    const inFolders = selection.folders.flatMap(folder => {
        const folderId = crypto.randomUUID();
        return folder.files.map(({ file, relativePath }) => ({
            file,
            uuid: crypto.randomUUID(),
            folder: { folderId, relativePath },
        }));
    });
    return [...loose, ...inFolders];
}

function summarize(selection: ShareSelection): OfferSummary {
    const all = [
        ...selection.files,
        ...selection.folders.flatMap(folder => folder.files.map(f => f.file)),
    ];
    return {
        folderName:
            selection.folders.length === 1 && selection.files.length === 0
                ? selection.folders[0].name
                : null,
        fileName: selection.files[0]?.name ?? null,
        count: all.length,
        bytes: all.reduce((sum, file) => sum + file.size, 0),
    };
}
