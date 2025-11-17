import { useThemeContext } from "../../context/ThemeContext";
import css from "./ThemeToggle.module.scss";

export default function ThemeToggle() {
    const { themePreference, colorScheme, setThemePreference } =
        useThemeContext();

    const cycleTheme = () => {
        if (themePreference === "light") {
            setThemePreference("dark");
        } else if (themePreference === "dark") {
            setThemePreference("system");
        } else {
            setThemePreference("light");
        }
    };

    const getThemeLabel = () => {
        if (themePreference === "system")
            return `System (${colorScheme === "light" ? "Hell" : "Dunkel"})`;
        return themePreference === "light" ? "Hell" : "Dunkel";
    };

    return (
        <button onClick={cycleTheme} className={css.themeToggle}>
            Design: {getThemeLabel()}
        </button>
    );
}
