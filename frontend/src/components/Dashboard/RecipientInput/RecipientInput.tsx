import { KeyboardEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { OTPInput, SlotProps } from "input-otp";
import css from "./RecipientInput.module.scss";
import {
    displayToken,
    normalizeClientToken,
} from "../../../services/WebSocketService";
import { CLIENT_TOKEN_LENGTH } from "../../../util/Constants";
import { REDUCED_MOTION_QUERY } from "../../../util/mediaQueries";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { cx } from "class-variance-authority";

/** Result of the server's check of a complete token. */
export type RecipientCheck = "online" | "offline" | null;

// Letters of the server's proquint tokens, from ClientTokenFormat in the backend.
const PROQUINT_CONSONANTS = "bdfghjklmnprstvz";
const PROQUINT_VOWELS = "aiou";
const SAMPLE_TYPE_MS = 380;
const SAMPLE_HOLD_MS = 3000;
// Matches the fade-out in RecipientInput.module.scss.
const SAMPLE_FADE_MS = 200;
const SAMPLE_GAP_MS = 500;

const Slot = ({
    char,
    hasFakeCaret,
    isActive,
    sample,
    sampleFading,
}: SlotProps & { sample?: string; sampleFading: boolean }) => {
    return (
        <div
            className={cx(css.otpSlot, isActive && css.otpSlotActive)}
            data-state={!char ? "empty" : "filled"}
            data-active={isActive || undefined}
        >
            {/* Tokens are stored lowercase; presentation is uppercase. */}
            {char?.toUpperCase()}
            {hasFakeCaret && "_"}
            {!char && sample && (
                <span
                    className={cx(css.sample, sampleFading && css.sampleFading)}
                    aria-hidden
                >
                    {displayToken(sample)}
                </span>
            )}
        </div>
    );
};

/** Encodes a random 16-bit value as the backend's GenerateClientToken does. */
function randomSampleToken(): string {
    const value = Math.floor(Math.random() * 0x10000);
    return (
        PROQUINT_CONSONANTS[(value >> 12) & 0xf] +
        PROQUINT_VOWELS[(value >> 10) & 0x3] +
        PROQUINT_CONSONANTS[(value >> 6) & 0xf] +
        PROQUINT_VOWELS[(value >> 4) & 0x3] +
        PROQUINT_CONSONANTS[value & 0xf]
    );
}

/**
 * Types made-up tokens into the empty field one letter at a time, to show where a token goes.
 * Returns the letters typed so far, "" while `active` is false, and whether the full token fades out.
 */
function useSampleToken(active: boolean): {
    typed: string;
    fading: boolean;
} {
    const [typed, setTyped] = useState("");
    const [fading, setFading] = useState(false);

    useEffect(() => {
        if (!active) {
            setTyped("");
            setFading(false);
            return;
        }
        let timer: number | undefined;
        const later = (step: () => void, ms: number) => {
            timer = window.setTimeout(step, ms);
        };
        const startToken = () => typeToken(randomSampleToken(), 1);
        const typeToken = (token: string, length: number) => {
            setTyped(token.slice(0, length));
            if (length < token.length) {
                later(() => typeToken(token, length + 1), SAMPLE_TYPE_MS);
                return;
            }
            later(() => {
                setFading(true);
                later(() => {
                    setTyped("");
                    setFading(false);
                    later(startToken, SAMPLE_GAP_MS);
                }, SAMPLE_FADE_MS);
            }, SAMPLE_HOLD_MS);
        };
        later(startToken, SAMPLE_GAP_MS);
        return () => window.clearTimeout(timer);
    }, [active]);

    return { typed, fading };
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
    const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
    const sample = useSampleToken(value === "" && !focused && !reducedMotion);

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
                    className={cx(
                        css.slotsContainer,
                        check === "online" && css.online,
                        check === "offline" && css.offline
                    )}
                >
                    {slots.map((slot, idx) => (
                        <Slot
                            key={idx}
                            {...slot}
                            sample={sample.typed[idx]}
                            sampleFading={sample.fading}
                        />
                    ))}
                </div>
            )}
            autoComplete="off"
            aria-label={t("send.recipientToken")}
            name="recipient-token"
        ></OTPInput>
    );
}
