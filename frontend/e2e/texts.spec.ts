import { expect, test } from "./peers";

test("a text arrives and can be copied", async ({
    alice,
    bob,
    browserName,
}) => {
    await alice.connectTo(bob);
    await alice.sendText("hello bob");

    await expect(alice.row("hello bob")).toContainText("Sent");
    await expect(alice.textField()).toHaveValue("");
    await expect(bob.row("hello bob")).toContainText(alice.token);

    // Firefox grants no clipboard read permission to a test context.
    test.skip(browserName !== "chromium", "clipboard needs Chromium");
    await bob.page
        .context()
        .grantPermissions(["clipboard-read", "clipboard-write"]);
    await bob.row("hello bob").getByRole("button", { name: "COPY" }).click();
    await expect(
        bob.row("hello bob").getByRole("button", { name: "COPIED" })
    ).toBeVisible();
    expect(await bob.page.evaluate(() => navigator.clipboard.readText())).toBe(
        "hello bob"
    );
});

test("the read view shows the whole text", async ({ alice, bob }) => {
    const text = "first line\nsecond line\n\nfourth line";
    await alice.connectTo(bob);
    await alice.sendText(text);

    await bob.row("first line").getByRole("button").first().click();

    const view = bob.page.getByRole("dialog", {
        name: `Text from ${alice.token}`,
    });
    await expect(view).toBeVisible();
    await expect(view.getByRole("textbox")).toHaveValue(text);
    await bob.page.keyboard.press("Escape");
    await expect(view).toBeHidden();
});

test("Ctrl+Enter sends the draft", async ({ alice, bob }) => {
    await alice.connectTo(bob);
    await alice.textField().fill("sent by keyboard");
    await alice.textField().press("Control+Enter");

    await expect(bob.row("sent by keyboard")).toBeVisible();
});

test("a burst of texts locks sending for a moment", async ({ alice, bob }) => {
    await alice.connectTo(bob);
    for (let i = 1; i <= 5; i++) {
        await alice.sendText(`text ${i}`);
        await expect(bob.row(`text ${i}`)).toBeVisible();
    }

    await alice.textField().fill("text 6");
    await alice.page.getByRole("button", { name: "Send text" }).click();

    await expect(alice.hint()).toHaveText(
        "You are sending too many texts. Please wait a few seconds."
    );
    await expect(alice.textField()).toHaveValue("text 6");
    await expect(
        alice.page.getByRole("button", { name: "Send text" })
    ).toBeEnabled({ timeout: 10_000 });
    await alice.page.getByRole("button", { name: "Send text" }).click();
    await expect(bob.row("text 6")).toBeVisible();
});

test("texts flow both ways", async ({ alice, bob }) => {
    await alice.connectTo(bob);
    await bob.connectTo(alice);
    await alice.sendText("ping");
    await expect(bob.row("ping")).toBeVisible();
    await bob.sendText("pong");
    await expect(alice.row("pong")).toBeVisible();
});
