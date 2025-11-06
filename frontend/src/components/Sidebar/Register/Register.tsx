import errorAsValue from "../../../util/ErrorAsValue";
import { useState } from "react";
import { UserLoginDto } from "../../../util/dtos/UserLoginDto";
import css from "./Register.module.scss";
import { toast } from "react-toastify/unstyled";
import { getRuntimeEnvVars } from "../../../util/RuntimeEnvVars";

interface RegisterProps {
    onSwitchToLogin: () => void;
    onLogin: () => void;
}

export const Register = ({ onSwitchToLogin, onLogin }: RegisterProps) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [passwordRepeat, setPasswordRepeat] = useState("");

    const [usernameError, setUsernameError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordRepeatError, setPasswordRepeatError] = useState("");

    const [buttonDisabled, setButtonDisabled] = useState(false);

    const validateUsername = () => {
        if (!username.match(/^\S{3,}$/)) {
            setUsernameError("Benutzername ungültig.");
            return false;
        }

        setUsernameError("");
        return true;
    };

    const validatePassword = () => {
        if (!password.match(/^\S{6,}$/)) {
            setPasswordError("Passwort ungültig.");
            return false;
        }

        setPasswordError("");
        return true;
    };

    const validatePasswordRepeat = () => {
        if (!passwordRepeat) {
            setPasswordRepeatError("Passwortwiederholung ist erforderlich.");
            return false;
        }

        if (passwordRepeat !== password) {
            setPasswordRepeatError("Passwörter stimmen nicht überein.");
            return false;
        }

        setPasswordRepeatError("");
        return true;
    };

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const usernameValid = validateUsername();
        const passwordValid = validatePassword();
        const passwordRepeatValid = validatePasswordRepeat();

        if (!usernameValid || !passwordValid || !passwordRepeatValid) {
            return;
        }

        const userData: UserLoginDto = {
            username: username,
            password: password,
        };

        setButtonDisabled(true);
        await registerUser(userData);
        setButtonDisabled(false);
    }

    async function registerUser(userData: UserLoginDto) {
        const [response, err1] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/accounts`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            })
        );

        if (err1) {
            toast.error(
                "Fehler beim Registrieren. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Registrieren:", err1);
            return;
        } else if (response.status == 409) {
            setUsernameError("Benutzername bereits vergeben.");
            return;
        } else if (!response.ok) {
            setUsernameError("Ungültiger Benutzername.");
            setPasswordError("Ungültiges Passwort.");
            return;
        }

        onLogin();
    }

    return (
        <div className={css.container}>
            <form
                onSubmit={e => {
                    void onSubmit(e);
                }}
                noValidate
            >
                <input
                    type="text"
                    placeholder="Benutzername"
                    name="username"
                    value={username}
                    className={[
                        usernameError ? css.errorField : "",
                        css.inputfield,
                    ].join(" ")}
                    onChange={e => setUsername(e.target.value)}
                />
                {usernameError && (
                    <small className={css.error}>{usernameError}</small>
                )}
                <input
                    type="password"
                    placeholder="Passwort"
                    name="password"
                    value={password}
                    className={[
                        passwordError ? css.errorField : "",
                        css.inputfield,
                    ].join(" ")}
                    onChange={e => setPassword(e.target.value)}
                />
                {passwordError && (
                    <small className={css.error}>{passwordError}</small>
                )}
                <input
                    type="password"
                    placeholder="Passwort wiederholen"
                    name="passwordRepeat"
                    value={passwordRepeat}
                    className={[
                        passwordRepeatError ? css.errorField : "",
                        css.inputfield,
                    ].join(" ")}
                    onChange={e => setPasswordRepeat(e.target.value)}
                />
                {passwordRepeatError && (
                    <small className={css.error}>{passwordRepeatError}</small>
                )}
                <button
                    type="submit"
                    disabled={buttonDisabled}
                    className={css.submitbutton}
                >
                    Registrieren
                </button>
            </form>
            <p className={css.loginlink}>
                oder <a onClick={onSwitchToLogin}>Login</a>
            </p>
        </div>
    );
};
