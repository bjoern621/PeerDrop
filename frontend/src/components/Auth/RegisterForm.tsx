import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import Button from "../Button/Button";
import FormField from "../FormField/FormField";
import css from "./AuthForms.module.scss";
import registerCss from "./RegisterForm.module.scss";
import {
    IconArrowRight as ArrowIcon,
    IconRefresh as SwitchIcon,
} from "@tabler/icons-react";
import { registerSchema } from "./types";
import { useAuthForm } from "./useAuthForm";
import { cx } from "class-variance-authority";

type RegisterFormFields = z.infer<typeof registerSchema>;

interface RegisterFormProps {
    onSubmit: (username: string, password: string) => void;
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
    const form = useForm<RegisterFormFields>({
        resolver: zodResolver(registerSchema),
        mode: "onChange",
        defaultValues: {
            username: initialUsername,
            password: initialPassword,
        },
    });

    const { register } = form;
    const { submit, handleKeyDown, errorProps } = useAuthForm(form, data =>
        onSubmit(data.username, data.password)
    );

    return (
        <form
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onSubmit={submit}
            onKeyDown={handleKeyDown}
            className={cx(css.form, registerCss.registerForm)}
        >
            <h2 className={cx(css.title, registerCss.title)}>
                {t("register")}
            </h2>

            <FormField
                type="text"
                label={t("username")}
                autoComplete="username"
                {...errorProps("username")}
                {...register("username", {
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                        onUsernameChange(event.target.value),
                })}
            />

            <FormField
                type="password"
                label={t("password")}
                autoComplete="new-password"
                {...errorProps("password")}
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
                    {...errorProps("passwordRetype")}
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
