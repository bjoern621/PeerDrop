import { expect, test, type Peer } from "./peers";

function blockButton(receiver: Peer, sender: Peer, name: string) {
    return receiver
        .row(name)
        .getByRole("button", { name: `Block ${sender.token}` });
}

function unblockButton(receiver: Peer, sender: Peer, name: string) {
    return receiver
        .row(name)
        .getByRole("button", { name: `Unblock ${sender.token}` });
}

test("blocking declines the open offer for good", async ({ alice, bob }) => {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
    await blockButton(bob, alice, "notes.txt").click();

    await expect(bob.row("notes.txt")).toContainText("Declined");
    await expect(alice.row("notes.txt")).toContainText("Declined");

    await unblockButton(bob, alice, "notes.txt").click();
    await expect(blockButton(bob, alice, "notes.txt")).toBeVisible();
    await expect(
        bob.row("notes.txt").getByRole("button", { name: "ACCEPT" })
    ).toHaveCount(0);
});

test("a blocked sender's offers wait without reaching the receiver", async ({
    alice,
    bob,
}) => {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "first.txt", content: "one" });
    await blockButton(bob, alice, "first.txt").click();

    await alice.sendFiles({ name: "second.txt", content: "two" });

    await expect(alice.row("second.txt")).toContainText(
        "Waiting for acceptance"
    );
    // Longer than the connect timeout, after which a direct send would fail.
    await alice.page.waitForTimeout(12_000);
    await expect(alice.row("second.txt")).toContainText(
        "Waiting for acceptance"
    );
    await expect(bob.row("second.txt")).toHaveCount(0);
});

test("blocking a trusted sender makes its next offer wait", async ({
    alice,
    bob,
}) => {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "first.txt", content: "one" });
    await bob.accept("first.txt");
    await expect(bob.row("first.txt")).toContainText("Done");
    await blockButton(bob, alice, "first.txt").click();

    await alice.sendFiles({ name: "second.txt", content: "two" });

    await alice.page.waitForTimeout(12_000);
    await expect(alice.row("second.txt")).toContainText(
        "Waiting for acceptance"
    );
    await expect(
        alice.row("second.txt").getByRole("button", { name: "Send again" })
    ).toHaveCount(0);
    await expect(bob.row("second.txt")).toHaveCount(0);
});

test("after unblocking, the next offer asks again", async ({ alice, bob }) => {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "first.txt", content: "one" });
    await bob.accept("first.txt");
    await expect(bob.row("first.txt")).toContainText("Done");
    await blockButton(bob, alice, "first.txt").click();
    await unblockButton(bob, alice, "first.txt").click();

    await alice.sendFiles({ name: "second.txt", content: "two" });

    await expect(
        bob.row("second.txt").getByRole("button", { name: "ACCEPT" })
    ).toBeVisible();
    await bob.accept("second.txt");
    await expect(alice.row("second.txt")).toContainText("Done");
    await expect(bob.row("second.txt")).toContainText("Done");
});

test("a blocked sender's texts never arrive", async ({ alice, bob }) => {
    await alice.connectTo(bob);
    await alice.sendText("first");
    await expect(bob.row("first")).toBeVisible();
    await blockButton(bob, alice, "first").click();

    await alice.sendText("second");

    await expect(alice.row("second")).toContainText("Sent");
    await bob.page.waitForTimeout(2_000);
    await expect(bob.row("second")).toHaveCount(0);

    await unblockButton(bob, alice, "first").click();
    await alice.sendText("third");
    await expect(bob.row("third")).toBeVisible();
});

test("the sender cannot pick a peer it blocked", async ({ alice, bob }) => {
    await bob.connectTo(alice);
    await bob.sendText("hi alice");
    await blockButton(alice, bob, "hi alice").click();

    await alice.recipientInput().fill(bob.token.toLowerCase());

    await expect(alice.hint()).toHaveText(
        `You blocked ${bob.token} until you reload the page.`
    );
    await expect(alice.textField()).toBeDisabled();
});
