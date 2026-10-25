import { toast } from "react-toastify/unstyled";
import errorAsValue from "../util/ErrorAsValue";
import { UserLoginDto } from "../util/dtos/UserLoginDto";
import { StatusResponse } from "../util/dtos/StatusResponse";
import { ChosenClientTokenResponse } from "../util/dtos/ChosenClientTokenResponse";
import { assert } from "../util/Assert";
import { getRuntimeEnvVars } from "../util/RuntimeEnvVars";

export class AuthService {
    public static async login(
        username: string,
        password: string
    ): Promise<boolean> {
        const userData: UserLoginDto = {
            username: username,
            password: password,
        };

        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/login`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Einloggen. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Einloggen:", err);
            return false;
        }

        if (!response.ok) {
            toast.error("Ungültiger Benutzername oder Passwort.");
            return false;
        }

        toast.success("Erfolgreich eingeloggt!");
        return true;
    }

    public static async register(
        username: string,
        password: string
    ): Promise<boolean> {
        const userData: UserLoginDto = {
            username: username,
            password: password,
        };

        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/accounts`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Registrieren. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Registrieren:", err);
            return false;
        }

        if (response.status === 409) {
            toast.error("Benutzername bereits vergeben.");
            return false;
        }

        if (!response.ok) {
            toast.error("Ungültiger Benutzername oder Passwort.");
            return false;
        }

        toast.success("Erfolgreich registriert!");
        return true;
    }

    public static async logout(): Promise<boolean> {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/logout`, {
                method: "POST",
                credentials: "include",
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Ausloggen. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Ausloggen:", err);
            return false;
        }

        if (!response.ok) {
            toast.error(
                "Fehler beim Ausloggen. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Ausloggen:", response.statusText);
            return false;
        }

        toast.success("Erfolgreich ausgeloggt");
        return true;
    }

    public static async getLoggedInStatus(): Promise<boolean> {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/me/status`, {
                method: "GET",
                credentials: "include",
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
            return false;
        }

        if (!response.ok) {
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
            return false;
        }

        const [responseBody, parseError] = await errorAsValue(response.json());

        if (parseError) {
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Parsen der Antwort:", parseError);
            return false;
        }

        const statusData = responseBody as StatusResponse;
        assert(
            statusData && typeof statusData.status === "boolean",
            "Invalid user status response"
        );

        return statusData.status;
    }

    /**
     * Stores the token that the signed-in account receives on every connect.
     * Returns null and shows a toast if the server could not store it.
     */
    public static async setChosenClientToken(
        token: string
    ): Promise<ChosenClientTokenResponse | null> {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/me/client-token`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            })
        );

        if (err) {
            toast.error(
                "Der Token konnte nicht geändert werden. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Ändern des Tokens:", err);
            return null;
        }

        if (!response.ok) {
            toast.error(
                "Der Token konnte nicht geändert werden. Bitte versuche es später erneut."
            );
            console.error(
                "Fehler beim Ändern des Tokens:",
                response.statusText
            );
            return null;
        }

        const [responseBody, parseError] = await errorAsValue(response.json());

        if (parseError) {
            toast.error(
                "Der Token konnte nicht geändert werden. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Parsen der Antwort:", parseError);
            return null;
        }

        const tokenData = responseBody as ChosenClientTokenResponse;
        assert(
            tokenData && typeof tokenData.inUse === "boolean",
            "Invalid chosen client token response"
        );

        return tokenData;
    }
}
