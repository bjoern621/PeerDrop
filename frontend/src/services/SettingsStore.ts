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
}

const AUTO_SAVE_STORAGE_KEY = "autoSaveDownloads";

const DEFAULT_SETTINGS: AppSettings = {
    autoSaveDownloads: true,
};

function readBooleanSetting(key: string, defaultValue: boolean): boolean {
    const raw = localStorage.getItem(key);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return defaultValue;
}

let settings: AppSettings = {
    autoSaveDownloads: readBooleanSetting(
        AUTO_SAVE_STORAGE_KEY,
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
    localStorage.setItem(
        AUTO_SAVE_STORAGE_KEY,
        String(settings.autoSaveDownloads)
    );
    listeners.forEach(listener => listener());
}

export function subscribeToSettings(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
