import { InputHTMLAttributes, Ref, useId, useRef } from "react";
import css from "./FormField.module.scss";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    showError?: boolean;
    ref?: Ref<HTMLInputElement>;
}

export default function FormField({
    label,
    error,
    showError = false,
    className,
    ref,
    ...inputProps
}: FormFieldProps) {
    const inputId = useId();
    // Keeps the text of a cleared error while it slides out.
    const shownError = useRef(error);
    if (error) {
        shownError.current = error;
    }

    return (
        <div>
            <label htmlFor={inputId} className={css.label}>
                {label}
            </label>
            <input
                id={inputId}
                ref={ref}
                className={`${css.input} ${className || ""}`}
                aria-invalid={showError ? "true" : "false"}
                {...inputProps}
            />
            <div
                className={`${css.errorWrapper} ${!showError ? css.hidden : ""}`}
            >
                <div className={css.error}>{shownError.current}</div>
            </div>
        </div>
    );
}
