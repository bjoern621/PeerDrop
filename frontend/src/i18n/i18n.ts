import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getSettings, subscribeToSettings } from "../services/SettingsStore";
import { defaultNS, resources } from "./resources";

// Screen readers pick their pronunciation from the page's lang attribute.
i18n.on("languageChanged", language => {
    document.documentElement.lang = language;
});

void i18n.use(initReactI18next).init({
    resources,
    lng: getSettings().language,
    fallbackLng: "en",
    defaultNS,
    // React escapes interpolated values itself.
    interpolation: { escapeValue: false },
    // Every translation ships in the bundle, so the first render has them.
    initAsync: false,
});

subscribeToSettings(() => {
    const { language } = getSettings();
    if (language !== i18n.language) {
        void i18n.changeLanguage(language);
    }
});

export default i18n;
