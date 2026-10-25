import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import Button from "../Button/Button";
import FormField from "../FormField/FormField";
import css from "./AuthForms.module.scss";
import registerCss from "./RegisterForm.module.scss";
import {
    IconArrowRight as ArrowIcon,
    IconRefresh as SwitchIcon,
} from "@tabler/icons-react";
import { registerSchema, ValidationMessage } from "./types";

type RegisterFormFields = z.infer<typeof registerSchema>;

interface RegisterFormProps {
    onSubmit: (email: string, password: string) => void;
    onSwitchToLogin: () => void;
    initialUsername: string;
    onUsernameChange: (username: string) => void;
    initialPassword: string;
    onPasswordChange: (password: string) => void;
}

export default function RegisterForm({
    onSubmit,
    onSwitchToLogin,
    initialUsername,
    onUsernameChange,
    initialPassword,
    onPasswordChange,
}: RegisterFormProps) {
    const { t } = useTranslation("auth");
    const {
        register,
        handleSubmit,
        formState: { errors, dirtyFields, touchedFields, isSubmitted },
    } = useForm<RegisterFormFields>({
        resolver: zodResolver(registerSchema),
        mode: "onChange",
        defaultValues: {
            username: initialUsername,
            password: initialPassword,
        },
    });

    const lastUsernameError = useRef<ValidationMessage | null>(null);
    const lastPasswordError = useRef<ValidationMessage | null>(null);
    const lastPasswordRetypeError = useRef<ValidationMessage | null>(null);

    // Update cached error messages when there's a new error
    if (errors.username?.message) {
        lastUsernameError.current = errors.username
            .message as ValidationMessage;
    }
    if (errors.password?.message) {
        lastPasswordError.current = errors.password
            .message as ValidationMessage;
    }
    if (errors.passwordRetype?.message) {
        lastPasswordRetypeError.current = errors.passwordRetype
            .message as ValidationMessage;
    }

    const onSubmitForm = (data: RegisterFormFields) => {
        onSubmit(data.username, data.password);
    };

    /**
     * Prevents dialog from closing on Enter key press in input fields
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
            e.preventDefault();
            void handleSubmit(onSubmitForm)();
        }
    };

    /**
     * Determines if an error message should be shown for a given field
     */
    const shouldShowError = (field: keyof RegisterFormFields) => {
        return (
            errors[field] &&
            ((touchedFields[field] && dirtyFields[field]) || isSubmitted)
        );
    };

    return (
        <form
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onSubmit={handleSubmit(onSubmitForm)}
            onKeyDown={handleKeyDown}
            className={`${css.form} ${registerCss.registerForm}`}
        >
            <h2 className={`${css.title} ${registerCss.title}`}>
                {t("register")}
            </h2>

            <FormField
                type="text"
                label={t("username")}
                autoComplete="username"
                error={
                    lastUsernameError.current
                        ? t(lastUsernameError.current)
                        : undefined
                }
                showError={shouldShowError("username")}
                {...register("username", {
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        onUsernameChange(event.target.value),
                })}
            />

            <FormField
                type="password"
                label={t("password")}
                autoComplete="new-password"
                error={
                    lastPasswordError.current
                        ? t(lastPasswordError.current)
                        : undefined
                }
                showError={shouldShowError("password")}
                {...register("password", {
                    // Re-checks the retype field, so the mismatch error follows
                    // a corrected password.
                    deps: ["passwordRetype"],
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        onPasswordChange(event.target.value),
                })}
            />

            <div className={registerCss.confirmPasswordField}>
                <FormField
                    type="password"
                    label={t("passwordRetype")}
                    autoComplete="new-password"
                    error={
                        lastPasswordRetypeError.current
                            ? t(lastPasswordRetypeError.current)
                            : undefined
                    }
                    showError={shouldShowError("passwordRetype")}
                    {...register("passwordRetype")}
                />
            </div>

            <div className={css.buttonContainer}>
                <Button
                    type="button"
                    variant={"outline"}
                    onClick={onSwitchToLogin}
                >
                    <SwitchIcon aria-hidden />
                    {t("login")}
                </Button>
                <Button type="submit" className={css.primaryButton}>
                    {t("register")}
                    <ArrowIcon aria-hidden />
                </Button>
            </div>
        </form>
    );
}
