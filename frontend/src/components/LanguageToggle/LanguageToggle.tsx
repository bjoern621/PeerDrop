import { DE, GB } from "country-flag-icons/react/3x2";
import useSettings from "../../hooks/useSettings";
import { updateSettings } from "../../services/SettingsStore";
import { Language, languageName, nextLanguage } from "../../i18n/languages";
import IconButton from "../IconButton/IconButton";
import css from "./LanguageToggle.module.scss";

const FLAGS: Record<Language, typeof GB> = {
    en: GB,
    de: DE,
};

/**
 * The current language with its flag and own name, and a switch to the next
 * language in the toggle order.
 */
function useLanguageToggle() {
    const { language } = useSettings();

    return {
        language,
        name: languageName(language),
        Flag: FLAGS[language],
        switchLanguage: () =>
            updateSettings({ language: nextLanguage(language) }),
    };
}

/**
 * Header button showing the flag of the current language. The button carries
 * the language's `lang`, so a screen reader speaks its name in that language.
 */
export function LanguageFlagButton() {
    const { language, name, Flag, switchLanguage } = useLanguageToggle();

    return (
        <IconButton
            className={css.flagButton}
            size={"m"}
            label={name}
            tooltip={<span lang={language}>{name}</span>}
            lang={language}
            onClick={switchLanguage}
        >
            <Flag className={css.flag} aria-hidden />
        </IconButton>
    );
}

/** Link-styled button showing flag and name of the current language. */
export default function LanguageToggle({
    className = "",
}: {
    className?: string;
}) {
    const { language, name, Flag, switchLanguage } = useLanguageToggle();

    return (
        <button
            type="button"
            className={`${css.languageToggle} ${className}`}
            onClick={switchLanguage}
        >
            <Flag className={css.flag} aria-hidden />
            <span lang={language}>{name}</span>
        </button>
    );
}
