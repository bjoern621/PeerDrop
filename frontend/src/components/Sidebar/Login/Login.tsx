import errorAsValue from "../../../util/ErrorAsValue";
import { useState } from "react";
import { UserLoginDto } from "../../dtos/UserLoginDto";
import css from "./Login.module.scss";

interface LoginProps {
    onSwitchToRegister: () => void;
}

export const Login = ({ onSwitchToRegister }: LoginProps) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [usernameError, setUsernameError] = useState("");
    const [passwordError, setPasswordError] = useState("");

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

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const usernameValid = validateUsername();
        const passwordValid = validatePassword();

        if (!usernameValid || !passwordValid) {
            return;
        }

        const userData: UserLoginDto = {
            username: username,
            password: password,
        };

        setButtonDisabled(true);
        await loginUser(userData);
        setButtonDisabled(false);
    }

    async function loginUser(userData: UserLoginDto) {
        const [response, err1] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            })
        );

        if (err1) {
            console.error("Fehler beim Einloggen:", err1);
            return;
        } else if (!response.ok) {
            setUsernameError("Ungültiger Benutzername.");
            setPasswordError("Ungültiges Passwort.");
            return;
        }

        // TODO: Handle successful login
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
                <button
                    type="submit"
                    disabled={buttonDisabled}
                    className={css.submitbutton}
                >
                    Login
                </button>
            </form>
            <p className={css.loginlink}>
                oder{" "}
                <button type="button" onClick={onSwitchToRegister}>
                    Registrieren
                </button>
            </p>
        </div>
    );
};
