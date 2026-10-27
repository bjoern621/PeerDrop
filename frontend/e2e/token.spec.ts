import { expect, randomRequestableToken, test } from "./peers";

test("a requested token stays after a reload", async ({ openPeer }) => {
    const alice = await openPeer();
    const token = randomRequestableToken();

    await alice.requestToken(token);
    await expect.poll(() => alice.currentToken()).toBe(token);

    await alice.page.reload();
    await expect.poll(() => alice.currentToken()).toBe(token);
});

test("a token that another device holds stays with it", async ({
    openPeer,
}) => {
    const alice = await openPeer();
    const bob = await openPeer();
    const token = randomRequestableToken();
    await alice.requestToken(token);
    await expect.poll(() => alice.currentToken()).toBe(token);

    await bob.requestToken(token);

    const taken = bob.page.getByRole("img", {
        name: `Token ${token} is taken. Reload later.`,
    });
    await expect(taken).toBeVisible();
    expect(await bob.currentToken()).not.toBe(token);
    expect(await alice.currentToken()).toBe(token);

    await bob.page.reload();
    await expect(taken).toBeVisible();
});
