import { expect, SocketRelay, test } from "./peers";

test("a cut connection shows a toast that stays", async ({ openPeer }) => {
    const relay = new SocketRelay();
    const alice = await openPeer(relay);
    await expect(alice.lostConnectionToast()).toBeHidden();

    await relay.cut();

    await expect(alice.lostConnectionToast()).toBeVisible();
    await expect(
        alice.page
            .getByRole("region", { name: "Your token" })
            .getByText(alice.token, { exact: true })
    ).toHaveClass(/_lost_/);
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

test("a lost connection locks sending and leaves the recipient unknown", async ({
    openPeer,
}) => {
    const relay = new SocketRelay();
    const alice = await openPeer(relay);
    const bob = await openPeer();
    await alice.connectTo(bob);

    await relay.cut();

    await expect(alice.hint()).toHaveText(
        "Without a connection to the server, you cannot send anything."
    );
    await expect(alice.recipientCheck()).toHaveClass(/_unknown_/);
    await expect(alice.textField()).toBeDisabled();
    await expect(alice.textField()).toHaveAttribute(
        "placeholder",
        "No connection to the server"
    );
    await expect(
        alice.page.getByRole("button", { name: "Share file" })
    ).toBeDisabled();
});

test("a dropped connection comes back under the same token", async ({
    openPeer,
}) => {
    const relay = new SocketRelay();
    const alice = await openPeer(relay);
    const bob = await openPeer();
    await alice.connectTo(bob);

    await relay.drop();

    await expect(alice.lostConnectionToast()).toBeVisible();
    await expect(alice.lostConnectionToast()).toBeHidden();
    expect(await alice.currentToken()).toBe(alice.token);
    await expect(
        alice.page.getByText("Connected to the server again.", { exact: true })
    ).toBeVisible();
    await expect(alice.hint()).toHaveText(
        `Write a text to ${bob.token} or share files and folders.`
    );
    await expect(alice.textField()).toBeEnabled();
});

test("a half-open connection hands its token to the reconnect", async ({
    openPeer,
}) => {
    const relay = new SocketRelay();
    const bob = await openPeer(relay);
    const alice = await openPeer();
    await alice.connectTo(bob);

    relay.stall();
    // Coming back online makes the page check the connection.
    await bob.page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect(bob.lostConnectionToast()).toBeVisible();
    await expect(bob.lostConnectionToast()).toBeHidden();
    expect(await bob.currentToken()).toBe(bob.token);
    await expect(alice.hint()).toHaveText(
        `Write a text to ${bob.token} or share files and folders.`
    );
});

test("a recipient that comes back shows as online again", async ({
    openPeer,
}) => {
    const relay = new SocketRelay();
    const bob = await openPeer(relay);
    const alice = await openPeer();
    await alice.connectTo(bob);

    await relay.cut();
    await expect(alice.recipientCheck()).toHaveClass(/_offline_/);

    relay.reopen();
    await bob.page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect(alice.recipientCheck()).toHaveClass(/_online_/);
    await expect(alice.hint()).toHaveText(
        `Write a text to ${bob.token} or share files and folders.`
    );
});
