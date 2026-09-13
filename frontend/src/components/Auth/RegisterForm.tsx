import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef } from "react";
import Button from "../Button/Button";
import FormField from "../FormField/FormField";
import css from "./AuthForms.module.scss";
import registerCss from "./RegisterForm.module.scss";
import ArrowIcon from "../../assets/actions/icons8-arrow-2.svg?react";
import SwitchIcon from "../../assets/actions/icons8-reload.svg?react";
import { registerSchema } from "./types";

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
                Registrieren
            </h2>

            <FormField
                type="text"
                label="Benutzername"
                autoComplete="username"
                error={lastUsernameError.current}
                showError={shouldShowError("username")}
                {...register("username", {
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        onUsernameChange(event.target.value),
                })}
            />

            <FormField
                type="password"
                label="Passwort"
                autoComplete="new-password"
                error={lastPasswordError.current}
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
                    label="Passwort wiederholen"
                    autoComplete="new-password"
                    error={lastPasswordRetypeError.current}
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
