import { detectLanguage, isLanguage, Language } from "../i18n/languages";
import {
    CLIENT_TOKEN_CHARACTERS,
    CLIENT_TOKEN_LENGTH,
} from "../util/Constants";

/**
 * User-facing app settings, persisted in localStorage (one key per setting).
 * The module keeps a single mutable snapshot; React components subscribe via
 * useSettings, non-React code reads the current value with getSettings().
 */
export interface AppSettings {
    /**
     * Starts saving received files automatically when true; otherwise a
     * received file is only saved after an explicit click.
     */
    autoSaveDownloads: boolean;

    /**
     * Announces the device to other devices in the same network and lists them
     * when true; otherwise the device stays hidden and no devices are listed.
     */
    lanDiscovery: boolean;

    /**
     * Spreads each outgoing file over several peer connections when true.
     * Faster over Wi-Fi, at the cost of more CPU on both peers.
     */
    parallelTransfers: boolean;

    /**
     * Shows route, round trip time and speed of every peer connection on the
     * dashboard when true.
     */
    connectionDetails: boolean;

    /** Language of the interface. Follows the browser until the user picks one. */
    language: Language;

    /**
     * Token that the device asks the server for when the page loads. The
     * server may hand out another one. Null asks for none.
     */
    requestedToken: string | null;
}

const STORAGE_KEYS: Record<keyof AppSettings, string> = {
    autoSaveDownloads: "autoSaveDownloads",
    lanDiscovery: "lanDiscovery",
    parallelTransfers: "parallelTransfers",
    connectionDetails: "connectionDetails",
    language: "language",
    requestedToken: "requestedToken",
};

const DEFAULT_SETTINGS: AppSettings = {
    autoSaveDownloads: true,
    lanDiscovery: true,
    parallelTransfers: false,
    connectionDetails: false,
    language: detectLanguage(),
    requestedToken: null,
};

function readBooleanSetting(key: string, defaultValue: boolean): boolean {
    const raw = localStorage.getItem(key);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return defaultValue;
}

function readTokenSetting(key: string): string | null {
    const raw = localStorage.getItem(key);
    return raw !== null &&
        raw.length === CLIENT_TOKEN_LENGTH &&
        [...raw].every(character => CLIENT_TOKEN_CHARACTERS.includes(character))
        ? raw
        : null;
}

function readLanguageSetting(key: string, defaultValue: Language): Language {
    const raw = localStorage.getItem(key);
    return isLanguage(raw) ? raw : defaultValue;
}

let settings: AppSettings = {
    autoSaveDownloads: readBooleanSetting(
        STORAGE_KEYS.autoSaveDownloads,
        DEFAULT_SETTINGS.autoSaveDownloads
    ),
    lanDiscovery: readBooleanSetting(
        STORAGE_KEYS.lanDiscovery,
        DEFAULT_SETTINGS.lanDiscovery
    ),
    parallelTransfers: readBooleanSetting(
        STORAGE_KEYS.parallelTransfers,
        DEFAULT_SETTINGS.parallelTransfers
    ),
    connectionDetails: readBooleanSetting(
        STORAGE_KEYS.connectionDetails,
        DEFAULT_SETTINGS.connectionDetails
    ),
    language: readLanguageSetting(
        STORAGE_KEYS.language,
        DEFAULT_SETTINGS.language
    ),
    requestedToken: readTokenSetting(STORAGE_KEYS.requestedToken),
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

    for (const key of Object.keys(update) as (keyof AppSettings)[]) {
        const value = settings[key];
        if (value === null) {
            localStorage.removeItem(STORAGE_KEYS[key]);
        } else {
            localStorage.setItem(STORAGE_KEYS[key], String(value));
        }
    }

    listeners.forEach(listener => listener());
}

export function subscribeToSettings(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
