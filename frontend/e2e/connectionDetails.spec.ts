import { expect, test, type Peer } from "./peers";

test.use({
    settings: { autoSaveDownloads: "false", connectionDetails: "true" },
});

function connectionTo(peer: Peer, other: Peer) {
    return peer.page
        .getByRole("region", { name: "Connection details" })
        .getByRole("article", { name: other.token });
}

async function transferOneFile(alice: Peer, bob: Peer) {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "notes.txt", content: "hello" });
    await bob.accept("notes.txt");
    await expect(alice.row("notes.txt")).toContainText("Done");
}

test("the details show the route of a connection", async ({ alice, bob }) => {
    await expect(
        alice.page.getByRole("region", { name: "Connection details" })
    ).toContainText("No connection to another device.");

    await transferOneFile(alice, bob);

    const details = connectionTo(alice, bob);
    await expect(details).toContainText("Connected");
    // Firefox picks a peer-reflexive candidate on one side, Chromium two host candidates.
    await expect(details).toContainText(
        /Direct (in the local network|to the other device)/
    );
    await expect(details).toContainText(/Ping\s*\d+ ms/);
});

test("the speed test reports a speed and its likely limit", async ({
    alice,
    bob,
}) => {
    await transferOneFile(alice, bob);

    const details = connectionTo(alice, bob);
    await details.getByRole("button", { name: "Measure speed" }).click();

    await expect(details).toContainText(
        new RegExp(`[\\d.,]+ Mbit/s from you to ${bob.token}`),
        { timeout: 30_000 }
    );
    await expect(details).toContainText("Likely limit:");
});

test("the speed test stops at a peer that takes no data", async ({
    alice,
    bob,
}) => {
    await transferOneFile(alice, bob);

    const details = connectionTo(bob, alice);
    await details.getByRole("button", { name: "Measure speed" }).click();

    await expect(details).toContainText(
        `${alice.token} takes no data from you until it accepts a transfer from you.`
    );
});
