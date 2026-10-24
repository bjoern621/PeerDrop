import { LookupState, SendLock } from "../../services/MessagingService";
import { CLIENT_TOKEN_LENGTH } from "../../util/Constants";

export type HintKind = "left" | "type" | "pick" | "wait" | "warn" | "err";

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
    /** On the phone the devices sit below, not to the left. */
    stacked: boolean;
}

/** The one thing to do next in the send panel, from the current state. */
export function nextStep(input: NextStepInput): Hint {
    const { recipient, lock, stacked } = input;
    const token = recipient.toUpperCase();

    if (lock?.reason === "tokens") {
        const minutes = Math.max(
            1,
            Math.ceil((lock.until - input.now) / 60000)
        );
        return {
            kind: "warn",
            text: `Du hast zu oft einen unbekannten Token eingegeben. Bitte warte ${minutes} ${minutes === 1 ? "Minute" : "Minuten"}.`,
        };
    }
    if (lock) {
        return {
            kind: "warn",
            text: "Du schickst zu viele Texte. Bitte warte ein paar Sekunden.",
        };
    }
    if (recipient.length === 0) {
        return stacked
            ? {
                  kind: "type",
                  text: "Gib den Token des Empfängers ein oder wähle unter „Geräte“ ein Gerät.",
              }
            : {
                  kind: "left",
                  text: "Wähle links ein Gerät oder gib oben den Token des Empfängers ein.",
              };
    }
    const missing = CLIENT_TOKEN_LENGTH - recipient.length;
    if (missing > 0) {
        return {
            kind: "type",
            text:
                missing === 1
                    ? "Gib das letzte Zeichen des Tokens ein."
                    : `Gib die restlichen ${missing} Zeichen des Tokens ein.`,
        };
    }
    if (recipient === input.ownToken) {
        return {
            kind: "warn",
            text: `${token} ist dein eigener Token. Gib den Token eines anderen Geräts ein.`,
        };
    }
    if (input.blocked) {
        return {
            kind: "warn",
            text: `Du hast ${token} blockiert, bis du die Seite neu lädst.`,
        };
    }
    if (!input.lookup || input.lookup.status === "checking") {
        return { kind: "wait", text: `Prüfe, ob ${token} online ist...` };
    }
    if (input.lookup.status === "offline") {
        return {
            kind: "err",
            text: `${token} ist nicht online. Bitte überprüfe den Token.`,
        };
    }
    if (input.tooBig) {
        return {
            kind: "warn",
            text: "Der Text ist größer als 1 MB. Schicke ihn als Datei.",
        };
    }
    return {
        kind: "pick",
        text: `Schreibe einen Text an ${token} oder teile Dateien und Ordner.`,
    };
}
