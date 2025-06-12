export class Logger {
    private enabled = false;
    private readonly prefix: string;

    public constructor(prefix: string, enabled = true) {
        this.prefix = prefix;
        this.enabled = enabled;
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    public log(...args: unknown[]) {
        if (this.enabled) {
            console.log(`[${this.prefix}]`, ...args);
        }
    }
}
