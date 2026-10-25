/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { AuthService } from "../services/AuthService";

const LOGGED_IN_KEY = "loggedIn";

interface AuthContextType {
    isLoggedIn: boolean;
    isStatusKnown: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    register: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<boolean>;
    refreshStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

// The first render shows the last known status while the status request runs.
function rememberedLoginStatus(): boolean | null {
    const stored = localStorage.getItem(LOGGED_IN_KEY);
    return stored === null ? null : stored === "true";
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [status, setIsLoggedIn] = useState(rememberedLoginStatus);

    const refreshStatus = async () => {
        setIsLoggedIn(await AuthService.getLoggedInStatus());
    };

    useEffect(() => {
        void refreshStatus();
    }, []);

    useEffect(() => {
        if (status !== null) {
            localStorage.setItem(LOGGED_IN_KEY, String(status));
        }
    }, [status]);

    const login = async (
        username: string,
        password: string
    ): Promise<boolean> => {
        const success = await AuthService.login(username, password);
        if (success) {
            setIsLoggedIn(true);
        }
        return success;
    };

    const register = async (
        username: string,
        password: string
    ): Promise<boolean> => {
        const success = await AuthService.register(username, password);
        if (success) {
            setIsLoggedIn(true);
        }
        return success;
    };

    const logout = async (): Promise<boolean> => {
        const success = await AuthService.logout();
        if (success) {
            setIsLoggedIn(false);
        }
        return success;
    };

    const value: AuthContextType = {
        isLoggedIn: status === true,
        isStatusKnown: status !== null,
        login,
        register,
        logout,
        refreshStatus,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
