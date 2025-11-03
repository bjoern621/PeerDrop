import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef } from "react";
import Button from "../Button/Button";
import css from "./AuthForms.module.scss";
import ArrowIcon from "../../assets/icons8-arrow-2.svg?react";
import SwitchIcon from "../../assets/icons8-reload.svg?react";
import { loginSchema } from "./types";
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
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, dirtyFields, touchedFields, isSubmitted },
    } = useForm<LoginFormFields>({
        resolver: zodResolver(loginSchema),
        mode: "onChange",
        defaultValues: {
            username: initialUsername,
            password: initialPassword,
        },
    });

    const lastUsernameError = useRef<string>("");
    const lastPasswordError = useRef<string>("");

    // Update cached error messages when there's a new error
    if (errors.username?.message) {
        lastUsernameError.current = errors.username.message;
    }
    if (errors.password?.message) {
        lastPasswordError.current = errors.password.message;
    }

    const onSubmitForm = (data: LoginFormFields) => {
        onSubmit(data.username, data.password);
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
            <h2 className={`${css.title} ${loginCss.title}`}>Anmelden</h2>

            <div>
                <label htmlFor="login-username" className={css.label}>
                    Benutzername
                </label>
                <input
                    id="login-username"
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
                <label htmlFor="login-password" className={css.label}>
                    Passwort
                </label>
                <input
                    id="login-password"
                    type="password"
                    {...register("password")}
                    className={css.input}
                    autoComplete="current-password"
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

            <div className={css.buttonContainer}>
                <Button type="submit" className={css.primaryButton}>
                    Anmelden
                    <ArrowIcon aria-hidden />
                </Button>
                <Button
                    type="button"
                    variant={"outline"}
                    onClick={onSwitchToRegister}
                >
                    <SwitchIcon aria-hidden />
                    Registrieren
                </Button>
            </div>
        </form>
    );
}
