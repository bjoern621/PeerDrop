import { expect, SocketRelay, test } from "./peers";

const SHARE = "Anyone sending to you enters this token.";
const LOST =
    "The connection to the server dropped. Nobody can find you under this token. Reload the page.";

test("a dropped connection marks the own token as lost", async ({
    openPeer,
}) => {
    const relay = new SocketRelay();
    const alice = await openPeer(relay);
    await expect(alice.tokenStatus()).toHaveText(SHARE);

    await relay.drop();

    await expect(alice.tokenStatus()).toHaveText(LOST);
    await expect(
        alice.page.getByRole("button", { name: "Copy token", exact: true })
    ).toBeDisabled();
});

test("a server that answers pings keeps the token", async ({ openPeer }) => {
    const relay = new SocketRelay();
    const alice = await openPeer(relay);

    await alice.page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect
        .poll(() => relay.fromServer.some(message => message.includes("pong")))
        .toBe(true);
    await expect(alice.tokenStatus()).toHaveText(SHARE);
});

test("a connection that goes silent marks the own token as lost", async ({
    openPeer,
}) => {
    const relay = new SocketRelay();
    const alice = await openPeer(relay);
    await expect(alice.tokenStatus()).toHaveText(SHARE);

    relay.goSilent();
    // Coming back online makes the page check the connection.
    await alice.page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect(alice.tokenStatus()).toHaveText(LOST);
});
