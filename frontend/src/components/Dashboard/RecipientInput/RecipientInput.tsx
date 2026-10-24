import { KeyboardEvent } from "react";
import { OTPInput, SlotProps } from "input-otp";
import css from "./RecipientInput.module.scss";
import { normalizeClientToken } from "../../../services/WebSocketService";
import { CLIENT_TOKEN_LENGTH } from "../../../util/Constants";

/** Result of the server's check of a complete token. */
export type RecipientCheck = "online" | "offline" | null;

const Slot = ({ char, hasFakeCaret, isActive }: SlotProps) => {
    return (
        <div
            className={`${css.otpSlot} ${isActive ? css.otpSlotActive : ""}`}
            data-state={!char ? "empty" : "filled"}
            data-active={isActive || undefined}
        >
            {/* Tokens are stored lowercase; presentation is uppercase. */}
            {char?.toUpperCase()}
            {hasFakeCaret && "_"}
        </div>
    );
};

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

export default function RecipientInput({
    value,
    onChange,
    check,
}: {
    value: string;
    onChange: (value: string) => void;
    check: RecipientCheck;
}) {
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
            data-bwignore="true"
            data-lpignore="true"
            data-1p-ignore="true"
            onChange={value => onChange(normalizeClientToken(value))}
            onKeyDown={event => deleteWordBackward(event, value, onChange)}
            render={({ slots }) => (
                <div
                    className={`${css.slotsContainer} ${check === "online" ? css.online : ""} ${check === "offline" ? css.offline : ""}`}
                >
                    {slots.map((slot, idx) => (
                        <Slot key={idx} {...slot} />
                    ))}
                </div>
            )}
            autoComplete="off"
            aria-label="Token des Empfängers"
            name="recipient-token"
        ></OTPInput>
    );
}
