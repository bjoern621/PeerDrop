import { getCookie, setCookie } from "../util/Cookies";

/**
 * User-facing app settings, persisted in cookies (one cookie per setting).
 * The module keeps a single mutable snapshot; React components subscribe via
 * useSettings, non-React code reads the current value with getSettings().
 */
export interface AppSettings {
    /**
     * Starts saving received files automatically when true; otherwise a
     * received file is only saved after an explicit click.
     */
    autoSaveDownloads: boolean;
}

const COOKIE_MAX_AGE_DAYS = 365;

const DEFAULT_SETTINGS: AppSettings = {
    autoSaveDownloads: true,
};

function readBooleanCookie(name: string, defaultValue: boolean): boolean {
    const raw = getCookie(name);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return defaultValue;
}

let settings: AppSettings = {
    autoSaveDownloads: readBooleanCookie(
        "autoSaveDownloads",
        DEFAULT_SETTINGS.autoSaveDownloads
    ),
};

const listeners = new Set<() => void>();

/**
 * Returns the current settings. The returned object is referentially stable
 * between updates, as required by useSyncExternalStore.
 */
export function getSettings(): AppSettings {
    return settings;
}

/** Applies and persists the given settings, then notifies subscribers. */
export function updateSettings(update: Partial<AppSettings>) {
    settings = { ...settings, ...update };
    setCookie(
        "autoSaveDownloads",
        String(settings.autoSaveDownloads),
        COOKIE_MAX_AGE_DAYS
    );
    listeners.forEach(listener => listener());
}

export function subscribeToSettings(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
