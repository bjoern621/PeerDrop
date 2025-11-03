import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
}

export default function RegisterForm({
    onSubmit,
    onSwitchToLogin,
}: RegisterFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors, dirtyFields, touchedFields, isSubmitted },
    } = useForm<RegisterFormFields>({
        resolver: zodResolver(registerSchema),
        mode: "onChange",
    });

    const onSubmitForm = (data: RegisterFormFields) => {
        onSubmit(data.username, data.password, data.passwordRetype);
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
                        errors.passwordRetype &&
                        ((touchedFields.passwordRetype &&
                            dirtyFields.passwordRetype) ||
                            isSubmitted)
                            ? "true"
                            : "false"
                    }
                />
                {errors.passwordRetype &&
                    ((touchedFields.passwordRetype &&
                        dirtyFields.passwordRetype) ||
                        isSubmitted) && (
                        <div className={css.error}>
                            {errors.passwordRetype.message}
                        </div>
                    )}
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
