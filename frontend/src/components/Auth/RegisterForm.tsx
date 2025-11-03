import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef } from "react";
import Button from "../Button/Button";
import css from "./AuthForms.module.scss";
import registerCss from "./RegisterForm.module.scss";
import ArrowIcon from "../../assets/icons8-arrow-2.svg?react";
import SwitchIcon from "../../assets/icons8-reload.svg?react";
import { registerSchema } from "./types";

type RegisterFormFields = z.infer<typeof registerSchema>;

interface RegisterFormProps {
    onSubmit: (email: string, password: string, passwordRetype: string) => void;
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
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, dirtyFields, touchedFields, isSubmitted },
    } = useForm<RegisterFormFields>({
        resolver: zodResolver(registerSchema),
        mode: "onChange",
        defaultValues: {
            username: initialUsername,
            password: initialPassword,
        },
    });

    const lastUsernameError = useRef<string>("");
    const lastPasswordError = useRef<string>("");
    const lastPasswordRetypeError = useRef<string>("");

    // Update cached error messages when there's a new error
    if (errors.username?.message) {
        lastUsernameError.current = errors.username.message;
    }
    if (errors.password?.message) {
        lastPasswordError.current = errors.password.message;
    }
    if (errors.passwordRetype?.message) {
        lastPasswordRetypeError.current = errors.passwordRetype.message;
    }

    const onSubmitForm = (data: RegisterFormFields) => {
        onSubmit(data.username, data.password, data.passwordRetype);
    };

    // Watch fields and sync it with parent component
    const username = watch("username");
    useEffect(() => {
        onUsernameChange(username);
    }, [username, onUsernameChange]);

    const password = watch("password");
    useEffect(() => {
        onPasswordChange(password);
    }, [password, onPasswordChange]);

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
                Registrieren
            </h2>

            <div>
                <label htmlFor="register-username" className={css.label}>
                    Benutzername
                </label>
                <input
                    id="register-username"
                    type="text"
                    {...register("username")}
                    className={css.input}
                    autoComplete="username"
                    aria-invalid={
                        shouldShowError("username") ? "true" : "false"
                    }
                />
                <div
                    className={`${css.errorWrapper} ${!shouldShowError("username") ? css.hidden : ""}`}
                >
                    <div className={css.error}>{lastUsernameError.current}</div>
                </div>
            </div>

            <div>
                <label htmlFor="register-password" className={css.label}>
                    Passwort
                </label>
                <input
                    id="register-password"
                    type="password"
                    {...register("password")}
                    className={css.input}
                    autoComplete="new-password"
                    aria-invalid={
                        shouldShowError("password") ? "true" : "false"
                    }
                />
                <div
                    className={`${css.errorWrapper} ${!shouldShowError("password") ? css.hidden : ""}`}
                >
                    <div className={css.error}>{lastPasswordError.current}</div>
                </div>
            </div>

            <div className={registerCss.confirmPasswordField}>
                <label htmlFor="register-passwordRetype" className={css.label}>
                    Passwort wiederholen
                </label>
                <input
                    id="register-passwordRetype"
                    type="password"
                    {...register("passwordRetype")}
                    className={css.input}
                    autoComplete="new-password"
                    aria-invalid={
                        shouldShowError("passwordRetype") ? "true" : "false"
                    }
                />
                <div
                    className={`${css.errorWrapper} ${!shouldShowError("passwordRetype") ? css.hidden : ""}`}
                >
                    <div className={css.error}>
                        {lastPasswordRetypeError.current}
                    </div>
                </div>
            </div>

            <div className={css.buttonContainer}>
                <Button
                    type="button"
                    variant={"outline"}
                    onClick={onSwitchToLogin}
                >
                    <SwitchIcon aria-hidden />
                    Anmelden
                </Button>
                <Button type="submit" className={css.primaryButton}>
                    Registrieren
                    <ArrowIcon aria-hidden />
                </Button>
            </div>
        </form>
    );
}
