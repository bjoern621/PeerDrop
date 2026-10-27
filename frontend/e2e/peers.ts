import { readFile } from "node:fs/promises";
import {
    test as base,
    expect,
    type Browser,
    type Download,
    type Page,
} from "@playwright/test";

export { expect };

export type Settings = Partial<
    Record<
        "autoSaveDownloads" | "lanDiscovery" | "parallelTransfers",
        "true" | "false"
    >
>;

type PeerOptions = {
    settings: Settings;
    // Without the picker, Chromium saves folders file by file, which Playwright sees as downloads.
    directoryPicker: boolean;
};

/** One browser context with its own PeerDrop session and token. */
export class Peer {
    private constructor(
        public readonly page: Page,
        public readonly token: string
    ) {}

    public static async open(
        browser: Browser,
        { settings, directoryPicker }: PeerOptions
    ): Promise<Peer> {
        const context = await browser.newContext();
        await context.addInitScript(
            ({ settings, directoryPicker }) => {
                // LAN discovery would list every other test peer of this machine.
                localStorage.setItem("lanDiscovery", "false");
                localStorage.setItem("language", "en");
                for (const [key, value] of Object.entries(settings)) {
                    localStorage.setItem(key, value);
                }
                if (!directoryPicker) {
                    delete (window as { showDirectoryPicker?: unknown })
                        .showDirectoryPicker;
                }
            },
            { settings, directoryPicker }
        );
        const page = await context.newPage();
        await page.goto("/connect");
        return new Peer(page, await readOwnToken(page));
    }

    public async close() {
        await this.page.context().close();
    }

    public hint() {
        return this.page
            .getByRole("region", { name: "Send" })
            .getByRole("status");
    }

    public recipientInput() {
        return this.page.getByRole("searchbox", { name: "Recipient's token" });
    }

    public async connectTo(other: Peer) {
        await this.recipientInput().fill(other.token.toLowerCase());
        await expect(this.hint()).toHaveText(
            `Write a text to ${other.token} or share files and folders.`
        );
    }

    public rows() {
        return this.page
            .getByRole("table", { name: "Transfers" })
            .getByRole("row")
            .filter({ hasNot: this.page.getByRole("columnheader") })
            .filter({ hasNotText: "No transfers yet" });
    }

    /** The row whose name or preview holds the text. */
    public row(name: string) {
        return this.rows().filter({
            has: this.page.getByRole("cell").first().filter({ hasText: name }),
        });
    }

    public async sendFiles(...files: { name: string; content: string }[]) {
        await this.page
            .locator("input[type=file]:not([webkitdirectory])")
            .setInputFiles(
                files.map(({ name, content }) => ({
                    name,
                    mimeType: "text/plain",
                    buffer: Buffer.from(content),
                }))
            );
    }

    public async sendFilePath(path: string) {
        await this.page
            .locator("input[type=file]:not([webkitdirectory])")
            .setInputFiles(path);
    }

    public async sendFolder(path: string) {
        await this.page
            .locator("input[type=file][webkitdirectory]")
            .setInputFiles(path);
    }

    public textField() {
        return this.page.getByRole("textbox", { name: "Text", exact: true });
    }

    public async sendText(text: string) {
        await this.textField().fill(text);
        await this.page.getByRole("button", { name: "Send text" }).click();
    }

    public async accept(name: string) {
        await this.row(name).getByRole("button", { name: "ACCEPT" }).click();
    }
}

async function readOwnToken(page: Page): Promise<string> {
    const token = page
        .getByRole("region", { name: "Your token" })
        .getByText(/^[A-Z]{5}$/);
    await expect(token).toBeVisible();
    return (await token.textContent()) ?? "";
}

export async function contentOf(download: Download): Promise<string> {
    return readFile(await download.path(), "utf8");
}

export function downloadNamed(page: Page, name: string): Promise<Download> {
    return page.waitForEvent("download", {
        predicate: download => download.suggestedFilename() === name,
    });
}

/** Collects every download of the page from now on. */
export function collectDownloads(page: Page): Download[] {
    const downloads: Download[] = [];
    page.on("download", download => downloads.push(download));
    return downloads;
}

export const test = base.extend<
    { alice: Peer; bob: Peer; openPeer: () => Promise<Peer> } & PeerOptions
>({
    settings: [{}, { option: true }],
    directoryPicker: [true, { option: true }],
    openPeer: async ({ browser, settings, directoryPicker }, provide) => {
        const peers: Peer[] = [];
        await provide(async () => {
            const peer = await Peer.open(browser, {
                settings,
                directoryPicker,
            });
            peers.push(peer);
            return peer;
        });
        await Promise.all(peers.map(peer => peer.close()));
    },
    alice: async ({ openPeer }, provide) => provide(await openPeer()),
    bob: async ({ openPeer }, provide) => provide(await openPeer()),
});
