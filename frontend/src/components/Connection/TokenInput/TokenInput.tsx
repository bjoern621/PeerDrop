import { OTPInput, SlotProps } from "input-otp";
import css from "./TokenInput.module.scss";
import { normalizeClientToken } from "../../../services/WebSocketService";

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

export default function TokenInput({
    value,
    onChange,
}: {
    value?: string;
    onChange?: (value: string) => void;
}) {
    return (
        <OTPInput
            maxLength={5}
            value={value}
            inputMode="text"
            data-bwignore="true"
            data-lpignore="true"
            data-1p-ignore="true"
            onChange={value => onChange?.(normalizeClientToken(value))}
            render={({ slots }) => (
                <>
                    <div className={css.slotsContainer}>
                        {slots.map((slot, idx) => (
                            <Slot key={idx} {...slot} />
                        ))}
                    </div>
                </>
            )}
            autoComplete="off"
            aria-label="Token eingeben"
            name="peer-token-input"
        ></OTPInput>
    );
}
