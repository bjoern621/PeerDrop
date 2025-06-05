export let LOG_ENABLED = true;

export function setLogEnabled(enabled: boolean) {
    LOG_ENABLED = enabled;
}

export function log(...args: unknown[]) {
    if (LOG_ENABLED) {
        console.log(...args);
    }
}
