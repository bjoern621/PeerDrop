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
     * Shows the security warning before every connection attempt when true;
     * otherwise the connection is established right away.
     */
    showConnectWarning: boolean;

    /**
     * Announces the device to other devices in the same network and lists them
     * when true; otherwise the device stays hidden and no devices are listed.
     */
    lanDiscovery: boolean;
}

const STORAGE_KEYS: Record<keyof AppSettings, string> = {
    autoSaveDownloads: "autoSaveDownloads",
    showConnectWarning: "showConnectWarning",
    lanDiscovery: "lanDiscovery",
};

// Written by the warning dialog's "Nicht wieder anzeigen" before the setting existed.
const LEGACY_HIDE_CONNECT_WARNING_KEY = "hideConnectWarning";

const DEFAULT_SETTINGS: AppSettings = {
    autoSaveDownloads: true,
    showConnectWarning: true,
    lanDiscovery: true,
};

function readBooleanSetting(key: string, defaultValue: boolean): boolean {
    const raw = localStorage.getItem(key);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return defaultValue;
}

/**
 * Carries a dismissal made before the setting existed over to it, then drops
 * the old key. An explicit setting already stored wins.
 */
function migrateLegacyConnectWarning(): void {
    const dismissed = localStorage.getItem(LEGACY_HIDE_CONNECT_WARNING_KEY);
    if (dismissed === null) {
        return;
    }

    if (localStorage.getItem(STORAGE_KEYS.showConnectWarning) === null) {
        localStorage.setItem(
            STORAGE_KEYS.showConnectWarning,
            String(dismissed !== "true")
        );
    }

    localStorage.removeItem(LEGACY_HIDE_CONNECT_WARNING_KEY);
}

migrateLegacyConnectWarning();

let settings: AppSettings = {
    autoSaveDownloads: readBooleanSetting(
        STORAGE_KEYS.autoSaveDownloads,
        DEFAULT_SETTINGS.autoSaveDownloads
    ),
    showConnectWarning: readBooleanSetting(
        STORAGE_KEYS.showConnectWarning,
        DEFAULT_SETTINGS.showConnectWarning
    ),
    lanDiscovery: readBooleanSetting(
        STORAGE_KEYS.lanDiscovery,
        DEFAULT_SETTINGS.lanDiscovery
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

    for (const key of Object.keys(update) as (keyof AppSettings)[]) {
        localStorage.setItem(STORAGE_KEYS[key], String(settings[key]));
    }

    listeners.forEach(listener => listener());
}

export function subscribeToSettings(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
