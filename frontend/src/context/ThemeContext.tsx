/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    ReactNode,
    useContext,
    useLayoutEffect,
    useState,
} from "react";

const LOCAL_STORAGE_KEY = "theme";
type Theme = "light" | "dark";
const prefersDarkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme | "system") => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useThemeContext must be used within a ThemeProvider");
    }
    return context;
}

function isTheme(value: unknown): value is Theme {
    return value === "light" || value === "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (isTheme(storedTheme)) {
            return storedTheme;
        }

        return prefersDarkMediaQuery.matches ? "dark" : "light";
    });

    useLayoutEffect(() => {
        const handleChange = () => {
            if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
                setThemeState(prefersDarkMediaQuery.matches ? "dark" : "light");
            }
        };

        prefersDarkMediaQuery.addEventListener("change", handleChange);
        return () =>
            prefersDarkMediaQuery.removeEventListener("change", handleChange);
    }, []);

    useLayoutEffect(() => {
        document.body.setAttribute("data-theme", theme);
    }, [theme]);

    const setTheme = (newTheme: Theme | "system") => {
        if (newTheme === "system") {
            localStorage.removeItem(LOCAL_STORAGE_KEY);

            const systemTheme = prefersDarkMediaQuery.matches
                ? "dark"
                : "light";
            setThemeState(systemTheme);
        } else {
            localStorage.setItem(LOCAL_STORAGE_KEY, newTheme);
            setThemeState(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
