/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { AuthService } from "../services/AuthService";

interface AuthContextType {
    isLoggedIn: boolean;
    isLoading: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const refreshStatus = async () => {
        setIsLoading(true);
        const status = await AuthService.getLoggedInStatus();
        setIsLoggedIn(status);
        setIsLoading(false);
    };

    useEffect(() => {
        void refreshStatus();
    }, []);

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
        isLoggedIn,
        isLoading,
        login,
        register,
        logout,
        refreshStatus,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
