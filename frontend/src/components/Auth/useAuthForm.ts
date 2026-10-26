import { KeyboardEvent } from "react";
import { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ValidationMessage } from "./types";

/** Submit, key and error handling shared by the login and register forms. */
export function useAuthForm<T extends FieldValues>(
    form: UseFormReturn<T>,
    onValid: (data: T) => void
) {
    const { t } = useTranslation("auth");
    const {
        handleSubmit,
        formState: { errors, dirtyFields, touchedFields, isSubmitted },
    } = form;
    const submit = handleSubmit(onValid);

    // Enter in a field submits the form here, so the dialog around it stays open.
    const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            void submit();
        }
    };

    /** Error props of a FormField: shown once the field was edited and left, or the form was submitted. */
    const errorProps = (field: Path<T>) => {
        const message = errors[field]?.message as ValidationMessage | undefined;
        const edited =
            (touchedFields as Record<string, boolean | undefined>)[field] &&
            (dirtyFields as Record<string, boolean | undefined>)[field];
        return {
            error: message && t(message),
            showError: Boolean(message && (edited || isSubmitted)),
        };
    };

    return { submit, handleKeyDown, errorProps };
}
