import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const LOCAL_STORAGE_KEY = "theme";

export function useTheme() {
    const [theme, setTheme] = useState<Theme>("light");

    useEffect(() => {
        const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEY) as Theme;
        if (storedTheme) {
            setTheme(storedTheme);
            return;
        }

        const prefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;
        if (prefersDark) {
            setTheme("dark");
        } else {
            setTheme("light");
        }
    }, []);

    useEffect(() => {
        document.body.setAttribute("data-theme", theme);
    }, [theme]);

    return { theme, setTheme };
}
