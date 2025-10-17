/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    ReactNode,
    useContext,
    useLayoutEffect,
    useState,
} from "react";

const LOCAL_STORAGE_KEY = "theme";
type ColorScheme = "light" | "dark";
type ThemePreference = ColorScheme | "system";
const prefersDarkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

interface ThemeContextType {
    themePreference: ThemePreference;
    colorScheme: ColorScheme;
    setThemePreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useThemeContext must be used within a ThemeProvider");
    }
    return context;
}

function isColorScheme(value: unknown): value is ColorScheme {
    return value === "light" || value === "dark";
}

function isThemePreference(value: unknown): value is ThemePreference {
    return isColorScheme(value) || value === "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [themePreference, setThemePreferenceState] =
        useState<ThemePreference>(() => {
            const storedPreference = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (isThemePreference(storedPreference)) {
                return storedPreference;
            }
            return "system";
        });

    const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
        const storedPreference = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (isColorScheme(storedPreference)) {
            return storedPreference;
        }
        return prefersDarkMediaQuery.matches ? "dark" : "light";
    });

    useLayoutEffect(() => {
        const handleChange = () => {
            if (themePreference === "system") {
                setColorScheme(
                    prefersDarkMediaQuery.matches ? "dark" : "light"
                );
            }
        };

        prefersDarkMediaQuery.addEventListener("change", handleChange);
        return () =>
            prefersDarkMediaQuery.removeEventListener("change", handleChange);
    }, [themePreference]);

    useLayoutEffect(() => {
        document.documentElement.setAttribute("data-theme", colorScheme);
    }, [colorScheme]);

    const setThemePreference = (newPreference: ThemePreference) => {
        setThemePreferenceState(newPreference);

        if (newPreference === "system") {
            localStorage.setItem(LOCAL_STORAGE_KEY, "system");
            const systemScheme = prefersDarkMediaQuery.matches
                ? "dark"
                : "light";
            setColorScheme(systemScheme);
        } else {
            localStorage.setItem(LOCAL_STORAGE_KEY, newPreference);
            setColorScheme(newPreference);
        }
    };

    return (
        <ThemeContext.Provider
            value={{ themePreference, colorScheme, setThemePreference }}
        >
            {children}
        </ThemeContext.Provider>
    );
}
