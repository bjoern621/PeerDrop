import errorAsValue from "../../util/ErrorAsValue";

export const Register = () => {
    function handleRegisterUser(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;
        const passwordRepeat = formData.get('passwordRepeat') as string;

        if (password !== passwordRepeat) {
            alert("Die Passwörter stimmen nicht überein.");
            return;
        }

        const userData = {
            DisplayName: username,
            Password: password,
        };

        postRegisterUser(userData);
    }

    async function postRegisterUser(userData: { DisplayName: string; Password: string }) {
        const [response, err1] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/accounts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                },
                body: JSON.stringify(userData),
            })
        )
        if (err1) {
            console.error("Fehler beim Registrieren:", err1);
            return;
        }
        console.log("Benutzer registriert:", response);
    }

    function onSwitchToLogin() {
        throw new Error("Login-Funktion ist noch nicht implementiert.");
    }

    return (
        <div className="form-container">
            <form onSubmit={handleRegisterUser}>
                <p>
                    <input type="text" placeholder="Benutzername" name="username" required />
                    <input type="password" placeholder="Passwort" name="password" required />
                    <input type="password" placeholder="Passwort wiederholen" name="passwordRepeat" required />
                </p>
                <button type="submit">Registrieren</button>
            </form>
            <p>oder <button type="button" onClick={onSwitchToLogin}>Login</button></p>
        </div>
    )
}