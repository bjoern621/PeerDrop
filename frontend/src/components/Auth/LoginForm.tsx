import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import Button from "../Button/Button";
import FormField from "../FormField/FormField";
import css from "./AuthForms.module.scss";
import {
    IconArrowRight as ArrowIcon,
    IconRefresh as SwitchIcon,
} from "@tabler/icons-react";
import { loginSchema } from "./types";
import { useAuthForm } from "./useAuthForm";
import loginCss from "./LoginForm.module.scss";

type LoginFormFields = z.infer<typeof loginSchema>;

interface LoginFormProps {
    onSubmit: (username: string, password: string) => void;
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
    const form = useForm<LoginFormFields>({
        resolver: zodResolver(loginSchema),
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
            className={css.form}
        >
            <h2 className={`${css.title} ${loginCss.title}`}>{t("login")}</h2>

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
                autoComplete="current-password"
                {...errorProps("password")}
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
