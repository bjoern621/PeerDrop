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
