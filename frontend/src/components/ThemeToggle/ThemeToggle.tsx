import { useTranslation } from "react-i18next";
import { useThemeContext } from "../../context/ThemeContext";
import css from "./ThemeToggle.module.scss";

export default function ThemeToggle() {
    const { t } = useTranslation();
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
            return t("theme.systemResolved", {
                scheme: t(`theme.${colorScheme}`),
            });
        return t(`theme.${themePreference}`);
    };

    return (
        <button onClick={cycleTheme} className={css.themeToggle}>
            {t("theme.toggle", { theme: getThemeLabel() })}
        </button>
    );
}
