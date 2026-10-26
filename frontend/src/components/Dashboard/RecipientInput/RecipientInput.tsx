import { KeyboardEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { OTPInput, SlotProps } from "input-otp";
import css from "./RecipientInput.module.scss";
import { normalizeClientToken } from "../../../services/WebSocketService";
import { CLIENT_TOKEN_LENGTH } from "../../../util/Constants";

/** Result of the server's check of a complete token. */
export type RecipientCheck = "online" | "offline" | null;

// Letters of the server's proquint tokens, from ClientTokenFormat in the backend.
const SAMPLE_CONSONANTS = "bdfghjklmnprstvz";
const SAMPLE_VOWELS = "aiou";
const SAMPLE_TYPE_MS = 220;
const SAMPLE_HOLD_MS = 1600;
const SAMPLE_GAP_MS = 700;

const Slot = ({
    char,
    hasFakeCaret,
    isActive,
    sample,
}: SlotProps & { sample?: string }) => {
    return (
        <div
            className={`${css.otpSlot} ${isActive ? css.otpSlotActive : ""}`}
            data-state={!char ? "empty" : "filled"}
            data-active={isActive || undefined}
        >
            {/* Tokens are stored lowercase; presentation is uppercase. */}
            {char?.toUpperCase()}
            {hasFakeCaret && "_"}
            {!char && sample && (
                <span className={css.sample} aria-hidden>
                    {sample.toUpperCase()}
                </span>
            )}
        </div>
    );
};

function randomSampleToken(): string {
    const pick = (letters: string) =>
        letters[Math.floor(Math.random() * letters.length)];
    return Array.from({ length: CLIENT_TOKEN_LENGTH }, (_, index) =>
        pick(index % 2 === 0 ? SAMPLE_CONSONANTS : SAMPLE_VOWELS)
    ).join("");
}

/**
 * Types made-up tokens into the empty field one letter at a time, to show where a token goes.
 * Returns the letters typed so far, or "" while `active` is false.
 */
function useSampleToken(active: boolean): string {
    const [typed, setTyped] = useState("");

    useEffect(() => {
        if (!active) {
            setTyped("");
            return;
        }
        let timer: number | undefined;
        const typeToken = (token: string, length: number) => {
            setTyped(token.slice(0, length));
            timer =
                length < token.length
                    ? window.setTimeout(
                          () => typeToken(token, length + 1),
                          SAMPLE_TYPE_MS
                      )
                    : window.setTimeout(() => {
                          setTyped("");
                          timer = window.setTimeout(
                              () => typeToken(randomSampleToken(), 1),
                              SAMPLE_GAP_MS
                          );
                      }, SAMPLE_HOLD_MS);
        };
        timer = window.setTimeout(
            () => typeToken(randomSampleToken(), 1),
            SAMPLE_GAP_MS
        );
        return () => window.clearTimeout(timer);
    }, [active]);

    return typed;
}

function prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Ctrl+Backspace (Alt or Cmd on macOS) deletes everything before the caret.
 * input-otp keeps the last slot selected in a full field.
 * The browser would delete only that selection.
 */
function deleteWordBackward(
    event: KeyboardEvent<HTMLInputElement>,
    value: string,
    onChange: (value: string) => void
) {
    if (
        event.key !== "Backspace" ||
        !(event.ctrlKey || event.altKey || event.metaKey)
    ) {
        return;
    }
    event.preventDefault();
    onChange(value.slice(event.currentTarget.selectionEnd ?? value.length));
}

/**
 * Delete removes the selected slot and selects the slot that moves into its place.
 * input-otp treats every deletion like Backspace and would select the slot before.
 */
function deleteForward(
    event: KeyboardEvent<HTMLInputElement>,
    value: string,
    onChange: (value: string) => void
) {
    const input = event.currentTarget;
    const start = input.selectionStart ?? value.length;
    const end = Math.max(input.selectionEnd ?? start, start + 1);
    if (event.key !== "Delete" || start >= value.length) {
        return;
    }
    event.preventDefault();
    onChange(value.slice(0, start) + value.slice(end));
    // React moves the caret to the end when it writes the new value.
    window.setTimeout(() => input.setSelectionRange(start, start + 1));
}

/** A pasted token link (".../connect?token=abcde") gives its token. Other text drops its whitespace. */
function tokenFromPaste(text: string): string {
    const link = /[?&]token=([^&#\s]+)/.exec(text);
    return normalizeClientToken(link ? link[1] : text.replace(/\s+/g, ""));
}

export default function RecipientInput({
    value,
    onChange,
    check,
}: {
    value: string;
    onChange: (value: string) => void;
    check: RecipientCheck;
}) {
    const { t } = useTranslation("dashboard");
    const [focused, setFocused] = useState(false);
    const sample = useSampleToken(
        value === "" && !focused && !prefersReducedMotion()
    );

    return (
        <OTPInput
            maxLength={CLIENT_TOKEN_LENGTH}
            value={value}
            inputMode="text"
            // Bitwarden reads "totp" in the data-input-otp attributes and offers a code.
            // It never collects search fields.
            type="search"
            enterKeyHint="done"
            className={css.input}
            containerClassName={css.container}
            data-bwignore="true"
            data-lpignore="true"
            data-1p-ignore="true"
            onChange={value => onChange(normalizeClientToken(value))}
            pasteTransformer={tokenFromPaste}
            onKeyDown={event => {
                deleteWordBackward(event, value, onChange);
                deleteForward(event, value, onChange);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            render={({ slots }) => (
                <div
                    className={`${css.slotsContainer} ${check === "online" ? css.online : ""} ${check === "offline" ? css.offline : ""}`}
                >
                    {slots.map((slot, idx) => (
                        <Slot key={idx} {...slot} sample={sample[idx]} />
                    ))}
                </div>
            )}
            autoComplete="off"
            aria-label={t("send.recipientToken")}
            name="recipient-token"
        ></OTPInput>
    );
}
