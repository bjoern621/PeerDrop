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
}

const STORAGE_KEYS: Record<keyof AppSettings, string> = {
    autoSaveDownloads: "autoSaveDownloads",
    lanDiscovery: "lanDiscovery",
};

const DEFAULT_SETTINGS: AppSettings = {
    autoSaveDownloads: true,
    lanDiscovery: true,
};

function readBooleanSetting(key: string, defaultValue: boolean): boolean {
    const raw = localStorage.getItem(key);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return defaultValue;
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
