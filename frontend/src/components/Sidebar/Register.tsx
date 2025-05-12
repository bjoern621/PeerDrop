import errorAsValue from "../../util/ErrorAsValue";
import { useState } from "react";
import { UserLoginDto } from "../dtos/UserLoginDto";

export const Register = () => {
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
    }

    const validatePassword = () => {
        if (!password.match(/^\S{6,}$/)) {
            setPasswordError("Passwort ungültig.");
            return false;
        }

        setPasswordError("");
        return true;
    }

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
    }

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
            fetch(`${import.meta.env.VITE_BACKEND_URL}/accounts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            })
        )
        if (err1) {
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
        console.log("Benutzer registriert:", response);
    }

    function onSwitchToLogin() {
        throw new Error("Login-Funktion ist noch nicht implementiert.");
    }

    return (
        <div className="form-container">
            <form onSubmit={onSubmit} noValidate>
                <p>
                    <input
                        type="text" 
                        placeholder="Benutzername" 
                        name="username" 
                        value={username}
                        className={usernameError ? "errorField" : ""}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    {usernameError && <small className="error">{usernameError}</small>}
                    <input 
                        type="password" 
                        placeholder="Passwort" 
                        name="password" 
                        value={password}
                        className={passwordError ? "errorField" : ""}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {passwordError && <small className="error">{passwordError}</small>}
                    <input
                        type="password"
                        placeholder="Passwort wiederholen"
                        name="passwordRepeat"
                        value={passwordRepeat}
                        className={passwordRepeatError ? "errorField" : ""}
                        onChange={(e) => setPasswordRepeat(e.target.value)}
                    />
                    {passwordRepeatError && <small className="error">{passwordRepeatError}</small>}
                </p>
                <button type="submit">Registrieren</button>
            </form>
            <p>oder <button type="button" onClick={onSwitchToLogin}>Login</button></p>
        </div>
    )
}