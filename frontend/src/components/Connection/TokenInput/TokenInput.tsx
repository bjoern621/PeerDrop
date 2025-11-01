import { OTPInput, SlotProps } from "input-otp";
import css from "./TokenInput.module.scss";

const Slot = ({ char, hasFakeCaret, isActive }: SlotProps) => {
    return (
        <div
            className={`${css.otpSlot} ${isActive ? css.otpSlotActive : ""}`}
            data-state={!char ? "empty" : "filled"}
            data-active={isActive || undefined}
        >
            {char}
            {hasFakeCaret && <div className={css.otpSlotCaret} />}
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
            onChange={onChange}
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
        ></OTPInput>
    );
}
