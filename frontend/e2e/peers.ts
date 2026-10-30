import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { connect, type Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";
import {
    test as base,
    expect,
    type APIRequestContext,
    type Browser,
    type Download,
    type Page,
    type WebSocketRoute,
} from "@playwright/test";

export { expect };

export type Settings = Partial<
    Record<
        | "autoSaveDownloads"
        | "lanDiscovery"
        | "parallelTransfers"
        | "connectionDetails",
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
        { settings, directoryPicker }: PeerOptions,
        relay?: SocketRelay
    ): Promise<Peer> {
        const context = await browser.newContext();
        if (relay) {
            await context.routeWebSocket(/\/connect(\?|$)/, page =>
                relay.attach(page)
            );
        }
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

    /** The token that the page shows at the moment. {@link token} keeps the first one. */
    public currentToken() {
        return readOwnToken(this.page);
    }

    /** Asks the server for `token` through the token card. */
    public async requestToken(token: string) {
        await this.page.getByRole("button", { name: "Change token" }).click();
        await this.page
            .getByRole("textbox", { name: "New token" })
            .fill(token.toLowerCase());
        await this.page
            .getByRole("textbox", { name: "New token" })
            .press("Enter");
    }

    public lostConnectionToast() {
        return this.page
            .getByRole("alert")
            .filter({ hasText: "The connection to the server dropped." });
    }

    public hint() {
        return this.page
            .getByRole("region", { name: "Send" })
            .getByRole("status");
    }

    public recipientInput() {
        return this.page.getByRole("searchbox", { name: "Recipient's token" });
    }

    /** The slots of the recipient input, colored by whether the recipient is online. */
    public recipientCheck() {
        return this.page.locator("[class*=_slots-container_]");
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

/**
 * Sits between a page and the backend on the WebSocket and forwards every message both ways.
 * It can drop, cut or stall the connection or go silent, as a dead network does.
 */
export class SocketRelay {
    private page: WebSocketRoute | undefined;
    private server: WebSocketRoute | undefined;
    private silent = false;
    private refused = false;
    private stalledPage: WebSocketRoute | undefined;
    public readonly fromServer: string[] = [];

    public attach(page: WebSocketRoute) {
        if (this.refused) {
            void page.close();
            return;
        }
        const server = page.connectToServer();
        const forwards = () => !this.silent && page !== this.stalledPage;
        page.onMessage(message => {
            if (forwards()) {
                server.send(message);
            }
        });
        server.onMessage(message => {
            if (forwards()) {
                this.fromServer.push(message.toString());
                page.send(message);
            }
        });
        this.page = page;
        this.server = server;
    }

    /** Closes both sides, as a server restart does. */
    public async drop() {
        await this.server?.close();
        await this.page?.close();
    }

    /** Drops the connection and turns away every later one, as an unreachable server does. */
    public async cut() {
        this.refused = true;
        await this.drop();
    }

    /** Lets connections through again after {@link cut}. */
    public reopen() {
        this.refused = false;
    }

    /** Swallows every message from here on, both ways, and keeps the connection open. */
    public goSilent() {
        this.silent = true;
    }

    /**
     * Swallows every message of the current connection, both ways.
     * The server keeps that connection open even after the page closes it, as on a half-open connection.
     * Later connections pass.
     */
    public stall() {
        this.stalledPage = this.page;
        // A close handler stops Playwright from passing the close on to the server.
        this.page?.onClose(() => {});
    }
}

/** A token of digits and letters, which no generated token matches, in the form that the page shows. */
export function randomRequestableToken(): string {
    return `0${randomBytes(4).toString("hex").slice(0, 4)}`.toUpperCase();
}

async function readOwnToken(page: Page): Promise<string> {
    const token = page
        .getByRole("region", { name: "Your token" })
        .getByText(/^[A-Z0-9]{5}$/);
    await expect(token).toBeVisible();
    return (await token.textContent()) ?? "";
}

/**
 * A client that connects to the backend, reads its token and then answers nothing, pings included.
 * It stands in for a device that drops off the network without closing its connection.
 * The caller destroys the socket.
 */
async function connectSilentPeer(
    request: APIRequestContext
): Promise<{ token: string; socket: Socket }> {
    const { wsBackendUrl } = (await (
        await request.get("/envvars.json")
    ).json()) as { wsBackendUrl: string };
    const url = new URL(`${wsBackendUrl}/connect`);
    const socket =
        url.protocol === "wss:"
            ? tlsConnect({
                  host: url.hostname,
                  port: Number(url.port || 443),
                  servername: url.hostname,
              })
            : connect(Number(url.port || 80), url.hostname);
    socket.write(
        [
            `GET ${url.pathname} HTTP/1.1`,
            `Host: ${url.host}`,
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Key: ${randomBytes(16).toString("base64")}`,
            "Sec-WebSocket-Version: 13",
            "",
            "",
        ].join("\r\n")
    );
    // The server hands out no token before the hello.
    socket.write(
        maskedTextFrame(
            JSON.stringify({
                type: "hello",
                msg: { requestedToken: null, reclaimKey: null },
            })
        )
    );

    const token = await new Promise<string>((resolve, reject) => {
        let received = "";
        const onData = (chunk: Buffer) => {
            // The token message travels as one unmasked text frame, short enough to read as plain bytes.
            received += chunk.toString("latin1");
            const token = /"token":"([a-z]{5})"/.exec(received)?.[1];
            if (token) {
                socket.off("data", onData);
                socket.pause();
                resolve(token);
            }
        };
        socket.on("data", onData);
        socket.once("error", reject);
    });
    return { token: token.toUpperCase(), socket };
}

/** A client text frame of up to 125 bytes, masked as RFC 6455 requires from clients. */
function maskedTextFrame(text: string): Buffer {
    const payload = Buffer.from(text);
    const mask = randomBytes(4);
    const masked = payload.map((byte, index) => byte ^ mask[index % 4]);
    return Buffer.concat([
        Buffer.from([0x81, 0x80 | payload.length]),
        mask,
        masked,
    ]);
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
    {
        alice: Peer;
        bob: Peer;
        /** With a relay, the peer reaches the backend through it. */
        openPeer: (relay?: SocketRelay) => Promise<Peer>;
        /** Connects a peer that goes silent, see connectSilentPeer. Returns its uppercase token. */
        openSilentPeer: () => Promise<string>;
    } & PeerOptions
>({
    settings: [{}, { option: true }],
    directoryPicker: [true, { option: true }],
    openPeer: async ({ browser, settings, directoryPicker }, provide) => {
        const peers: Peer[] = [];
        await provide(async relay => {
            const peer = await Peer.open(
                browser,
                { settings, directoryPicker },
                relay
            );
            peers.push(peer);
            return peer;
        });
        await Promise.all(peers.map(peer => peer.close()));
    },
    openSilentPeer: async ({ request }, provide) => {
        const sockets: Socket[] = [];
        await provide(async () => {
            const { token, socket } = await connectSilentPeer(request);
            sockets.push(socket);
            return token;
        });
        sockets.forEach(socket => socket.destroy());
    },
    alice: async ({ openPeer }, provide) => provide(await openPeer()),
    bob: async ({ openPeer }, provide) => provide(await openPeer()),
});
