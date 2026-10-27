import { expect, test } from "./peers";

test("the hint walks through entering a token", async ({ alice, bob }) => {
    await expect(alice.hint()).toHaveText(
        'First open PeerDrop on another device and enter its token. Or pick the device under "Devices".'
    );
    await expect(alice.textField()).toBeDisabled();

    await alice.recipientInput().fill(bob.token.slice(0, 3).toLowerCase());
    await expect(alice.hint()).toHaveText(
        "Enter the remaining 2 characters of the token."
    );

    await alice.recipientInput().fill(bob.token.slice(0, 4).toLowerCase());
    await expect(alice.hint()).toHaveText(
        "Enter the last character of the token."
    );

    await alice.recipientInput().fill(bob.token.toLowerCase());
    await expect(alice.hint()).toHaveText(
        `Write a text to ${bob.token} or share files and folders.`
    );
    await expect(alice.textField()).toBeEnabled();
    await expect(
        alice.page.getByRole("button", { name: "Share file" })
    ).toBeEnabled();
});

test("the own token is refused", async ({ alice }) => {
    await alice.recipientInput().fill(alice.token.toLowerCase());

    await expect(alice.hint()).toHaveText(
        `${alice.token} is your own token. Enter the token of another device.`
    );
    await expect(alice.textField()).toBeDisabled();
});

test("a token link fills in the recipient", async ({ alice, bob }) => {
    await alice.page.goto(`/connect?token=${bob.token.toLowerCase()}`);

    await expect(alice.hint()).toHaveText(
        `Write a text to ${bob.token} or share files and folders.`
    );
});

test("a pasted token link fills in the recipient", async ({
    alice,
    bob,
    baseURL,
    browserName,
}) => {
    test.skip(
        browserName === "firefox",
        "Firefox drops the clipboardData of a synthetic paste event"
    );
    await alice.recipientInput().focus();
    await alice.recipientInput().evaluate((input, text) => {
        const data = new DataTransfer();
        data.setData("text/plain", text);
        input.dispatchEvent(
            new ClipboardEvent("paste", {
                clipboardData: data,
                bubbles: true,
                cancelable: true,
            })
        );
    }, `${baseURL}/connect?token=${bob.token.toLowerCase()}`);

    await expect(alice.hint()).toHaveText(
        `Write a text to ${bob.token} or share files and folders.`
    );
});

test("a text to a peer that left is not delivered", async ({
    alice,
    openPeer,
}) => {
    // Each text to an unknown token counts towards the miss budget that locks the whole machine.
    test.skip(
        test.info().project.name !== "chromium" ||
            test.info().repeatEachIndex > 0,
        "runs once per suite"
    );
    const bob = await openPeer();
    await alice.connectTo(bob);
    await bob.close();

    await alice.sendText("anyone there?");

    await expect(alice.row("anyone there?")).toContainText("Not delivered");
});
