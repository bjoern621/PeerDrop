import { TFunction } from "i18next";
import { LookupState, SendLock } from "../../services/MessagingService";
import { CLIENT_TOKEN_LENGTH } from "../../util/Constants";

export type HintKind = "type" | "pick" | "wait" | "warn" | "err";

export interface Hint {
    kind: HintKind;
    text: string;
}

interface NextStepInput {
    recipient: string;
    ownToken: string | undefined;
    lookup: LookupState | undefined;
    blocked: boolean;
    tooBig: boolean;
    lock: SendLock | null;
    now: number;
}

/** The one thing to do next in the send panel, from the current state. */
export function nextStep(
    input: NextStepInput,
    t: TFunction<"dashboard">
): Hint {
    const { recipient, lock } = input;
    const token = recipient.toUpperCase();

    if (lock?.reason === "tokens") {
        const minutes = Math.max(
            1,
            Math.ceil((lock.until - input.now) / 60000)
        );
        return {
            kind: "warn",
            text: t("hint.tokensLocked", { count: minutes }),
        };
    }
    if (lock) {
        return { kind: "warn", text: t("hint.textsLocked") };
    }
    if (recipient.length === 0) {
        return { kind: "type", text: t("hint.enterToken") };
    }
    const missing = CLIENT_TOKEN_LENGTH - recipient.length;
    if (missing > 0) {
        return {
            kind: "type",
            text: t("hint.missingChars", { count: missing }),
        };
    }
    if (recipient === input.ownToken) {
        return { kind: "warn", text: t("hint.ownToken", { token }) };
    }
    if (input.blocked) {
        return { kind: "warn", text: t("hint.blocked", { token }) };
    }
    if (!input.lookup || input.lookup.status === "checking") {
        return { kind: "wait", text: t("hint.checking", { token }) };
    }
    if (input.lookup.status === "offline") {
        return { kind: "err", text: t("hint.offline", { token }) };
    }
    if (input.tooBig) {
        return { kind: "warn", text: t("hint.tooBig") };
    }
    return { kind: "pick", text: t("hint.ready", { token }) };
}
