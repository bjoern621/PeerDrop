const LOCAL_STORAGE_KEY = "hideConnectWarning";

/**
 * Returns whether the connect warning dialog was permanently dismissed
 * via "Nicht wieder anzeigen".
 */
export function isConnectWarningDismissed(): boolean {
    return localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
}

/**
 * Persists the "Nicht wieder anzeigen" preference so the connect warning
 * dialog is skipped on future connection attempts.
 */
export function dismissConnectWarning(): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, "true");
}
