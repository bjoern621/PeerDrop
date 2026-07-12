import { toast } from "react-toastify/unstyled";
import errorAsValue from "../util/ErrorAsValue";
import { UserLoginDto } from "../util/dtos/UserLoginDto";
import { StatusResponse } from "../util/dtos/StatusResponse";
import { assert } from "../util/Assert";
import { getRuntimeEnvVars } from "../util/RuntimeEnvVars";

export class AuthService {
    private static refreshRequest: Promise<boolean> | null = null;
    private static tokensRefreshed = false;

    /**
     * Requests a new token pair using the refresh token cookie.
     * Concurrent callers share a single request.
     */
    public static refreshAccessToken(): Promise<boolean> {
        AuthService.refreshRequest ??=
            AuthService.requestTokenRefresh().finally(
                () => (AuthService.refreshRequest = null)
            );
        return AuthService.refreshRequest;
    }

    /**
     * Whether a token refresh succeeded since the page was loaded.
     */
    public static hasRefreshedTokens(): boolean {
        return AuthService.tokensRefreshed;
    }

    private static async requestTokenRefresh(): Promise<boolean> {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/refresh`, {
                method: "POST",
                credentials: "include",
            })
        );

        if (err) {
            console.error("Fehler beim Erneuern des Login-Tokens:", err);
            return false;
        }

        if (response.ok) {
            AuthService.tokensRefreshed = true;
        }

        return response.ok;
    }

    /**
     * Performs a fetch and retries once after refreshing the access token
     * when the server responds with 401 (expired or missing access token).
     */
    public static async fetchWithRefresh(
        input: RequestInfo | URL,
        init?: RequestInit
    ): Promise<Response> {
        const response = await fetch(input, init);
        if (response.status !== 401) {
            return response;
        }

        if (!(await AuthService.refreshAccessToken())) {
            return response;
        }

        return fetch(input, init);
    }

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
        const status = await AuthService.requestLoggedInStatus();
        if (status !== false) {
            return status ?? false;
        }

        // The access token may have expired while the refresh token is still valid
        if (!(await AuthService.refreshAccessToken())) {
            return false;
        }

        return (await AuthService.requestLoggedInStatus()) ?? false;
    }

    private static async requestLoggedInStatus(): Promise<boolean | null> {
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
            return null;
        }

        if (!response.ok) {
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
            return null;
        }

        const [responseBody, parseError] = await errorAsValue(response.json());

        if (parseError) {
            toast.error(
                "Fehler beim Abrufen des Login-Status. Bitte versuche es später erneut."
            );
            console.error("Fehler beim Parsen der Antwort:", parseError);
            return null;
        }

        const statusData = responseBody as StatusResponse;
        assert(
            statusData && typeof statusData.status === "boolean",
            "Invalid user status response"
        );

        return statusData.status;
    }
}
