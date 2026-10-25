import { Language } from "./languages";
import deAuth from "./locales/de/auth.json";
import deCommon from "./locales/de/common.json";
import deDashboard from "./locales/de/dashboard.json";
import deLanding from "./locales/de/landing.json";
import deSettings from "./locales/de/settings.json";
import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enDashboard from "./locales/en/dashboard.json";
import enLanding from "./locales/en/landing.json";
import enSettings from "./locales/en/settings.json";

export const defaultNS = "common";

// German holds the source texts and fixes the key set for every language.
const de = {
    common: deCommon,
    auth: deAuth,
    settings: deSettings,
    landing: deLanding,
    dashboard: deDashboard,
};

export type Translations = typeof de;

// A missing key fails the type check here.
const en: Translations = {
    common: enCommon,
    auth: enAuth,
    settings: enSettings,
    landing: enLanding,
    dashboard: enDashboard,
};

export const resources: Record<Language, Translations> = { de, en };
