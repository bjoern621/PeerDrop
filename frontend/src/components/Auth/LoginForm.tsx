import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import Button from "../Button/Button";
import FormField from "../FormField/FormField";
import css from "./AuthForms.module.scss";
import {
    IconArrowRight as ArrowIcon,
    IconRefresh as SwitchIcon,
} from "@tabler/icons-react";
import { loginSchema, ValidationMessage } from "./types";
import loginCss from "./LoginForm.module.scss";

type LoginFormFields = z.infer<typeof loginSchema>;

interface LoginFormProps {
    onSubmit: (email: string, password: string) => void;
    onSwitchToRegister: () => void;
    initialUsername: string;
    onUsernameChange: (username: string) => void;
    initialPassword: string;
    onPasswordChange: (password: string) => void;
}

export default function LoginForm({
    onSubmit,
    onSwitchToRegister,
    initialUsername,
    onUsernameChange,
    initialPassword,
    onPasswordChange,
}: LoginFormProps) {
    const { t } = useTranslation("auth");
    const {
        register,
        handleSubmit,
        formState: { errors, dirtyFields, touchedFields, isSubmitted },
    } = useForm<LoginFormFields>({
        resolver: zodResolver(loginSchema),
        mode: "onChange",
        defaultValues: {
            username: initialUsername,
            password: initialPassword,
        },
    });

    const lastUsernameError = useRef<ValidationMessage | null>(null);
    const lastPasswordError = useRef<ValidationMessage | null>(null);

    // Update cached error messages when there's a new error
    if (errors.username?.message) {
        lastUsernameError.current = errors.username
            .message as ValidationMessage;
    }
    if (errors.password?.message) {
        lastPasswordError.current = errors.password
            .message as ValidationMessage;
    }

    const onSubmitForm = (data: LoginFormFields) => {
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
    const shouldShowError = (field: keyof LoginFormFields) => {
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
            className={css.form}
        >
            <h2 className={`${css.title} ${loginCss.title}`}>{t("login")}</h2>

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
                autoComplete="current-password"
                error={
                    lastPasswordError.current
                        ? t(lastPasswordError.current)
                        : undefined
                }
                showError={shouldShowError("password")}
                {...register("password", {
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        onPasswordChange(event.target.value),
                })}
            />

            <div className={css.buttonContainer}>
                <Button type="submit" className={css.primaryButton}>
                    {t("login")}
                    <ArrowIcon aria-hidden />
                </Button>
                <Button
                    type="button"
                    variant={"outline"}
                    onClick={onSwitchToRegister}
                >
                    <SwitchIcon aria-hidden />
                    {t("register")}
                </Button>
            </div>
        </form>
    );
}
