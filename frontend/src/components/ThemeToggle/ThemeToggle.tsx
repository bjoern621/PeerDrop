import { useTranslation } from "react-i18next";
import { THEME_PREFERENCES, useThemeContext } from "../../context/ThemeContext";
import css from "./ThemeToggle.module.scss";

export default function ThemeToggle() {
    const { t } = useTranslation();
    const { themePreference, colorScheme, setThemePreference } =
        useThemeContext();

    const cycleTheme = () => {
        const next = THEME_PREFERENCES.indexOf(themePreference) + 1;
        setThemePreference(THEME_PREFERENCES[next % THEME_PREFERENCES.length]);
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
