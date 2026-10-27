import { expect, SocketRelay, test } from "./peers";

test("a dropped connection shows a toast that stays", async ({ openPeer }) => {
    const relay = new SocketRelay();
    const alice = await openPeer(relay);
    await expect(alice.lostConnectionToast()).toBeHidden();

    await relay.drop();

    await expect(alice.lostConnectionToast()).toBeVisible();
    // Outlasts the autoClose that the other toasts get.
    await alice.page.waitForTimeout(4_000);
    await expect(alice.lostConnectionToast()).toBeVisible();
});

test("a server that answers pings shows no toast", async ({ openPeer }) => {
    const relay = new SocketRelay();
    const alice = await openPeer(relay);

    await alice.page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect
        .poll(() => relay.fromServer.some(message => message.includes("pong")))
        .toBe(true);
    await expect(alice.lostConnectionToast()).toBeHidden();
});

test("a connection that goes silent shows a toast", async ({ openPeer }) => {
    const relay = new SocketRelay();
    const alice = await openPeer(relay);

    relay.goSilent();
    // Coming back online makes the page check the connection.
    await alice.page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect(alice.lostConnectionToast()).toBeVisible();
});
