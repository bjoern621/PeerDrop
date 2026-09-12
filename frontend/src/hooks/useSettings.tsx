import { useSyncExternalStore } from "react";
import {
    AppSettings,
    getSettings,
    subscribeToSettings,
} from "../services/SettingsStore";

/**
 * Subscribes to the app settings; the component re-renders on every settings
 * change. Settings are changed via updateSettings() from the SettingsStore.
 */
export default function useSettings(): AppSettings {
    return useSyncExternalStore(subscribeToSettings, getSettings);
}
