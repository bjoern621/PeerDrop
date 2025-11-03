import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
}

export default function LoginForm({
    onSubmit,
    onSwitchToRegister,
}: LoginFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors, dirtyFields, touchedFields, isSubmitted },
    } = useForm<LoginFormFields>({
        resolver: zodResolver(loginSchema),
        mode: "onChange",
    });

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
                        errors.username &&
                        ((touchedFields.username && dirtyFields.username) ||
                            isSubmitted)
                            ? "true"
                            : "false"
                    }
                />
                {errors.username &&
                    ((touchedFields.username && dirtyFields.username) ||
                        isSubmitted) && (
                        <div className={css.error}>
                            {errors.username.message}
                        </div>
                    )}
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
                        errors.password &&
                        ((touchedFields.password && dirtyFields.password) ||
                            isSubmitted)
                            ? "true"
                            : "false"
                    }
                />
                {errors.password &&
                    ((touchedFields.password && dirtyFields.password) ||
                        isSubmitted) && (
                        <div className={css.error}>
                            {errors.password.message}
                        </div>
                    )}
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
