/**
 * Languages that the interface offers, in the order that the language toggle
 * cycles through. Each name stands in its own language, so a reader finds it
 * without reading the current one.
 */
export const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "de", name: "Deutsch" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

const FALLBACK_LANGUAGE: Language = "en";

export function isLanguage(value: unknown): value is Language {
    return LANGUAGES.some(language => language.code === value);
}

export function languageName(code: Language): string {
    return LANGUAGES.find(language => language.code === code)!.name;
}

/** The language after `code` in the toggle order, wrapping around at the end. */
export function nextLanguage(code: Language): Language {
    const index = LANGUAGES.findIndex(language => language.code === code);
    return LANGUAGES[(index + 1) % LANGUAGES.length].code;
}

/**
 * The first browser language that the interface offers, compared by primary
 * subtag ("de-AT" picks "de"). Falls back to English.
 */
export function detectLanguage(): Language {
    for (const tag of navigator.languages) {
        const primary = tag.split("-")[0].toLowerCase();
        if (isLanguage(primary)) {
            return primary;
        }
    }
    return FALLBACK_LANGUAGE;
}
