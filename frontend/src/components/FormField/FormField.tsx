import { InputHTMLAttributes, Ref, useId } from "react";
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
                <div className={css.error}>{error}</div>
            </div>
        </div>
    );
}
