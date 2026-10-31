import { open } from "node:fs/promises";
import { expect, type Peer, SocketRelay, test } from "./peers";

const MB = 1024 ** 2;

// Sparse, so the file costs no disk space and keeps a transfer running for seconds.
async function bigFile(path: string, bytes = 2 * 1024 ** 3) {
    const file = await open(path, "w");
    await file.truncate(bytes);
    await file.close();
    return path;
}

test.describe("running transfers", () => {
    test.use({ settings: { autoSaveDownloads: "false" } });

    test("the sender can cancel a running transfer", async ({
        alice,
        bob,
    }, info) => {
        await alice.connectTo(bob);
        await alice.sendFilePath(await bigFile(info.outputPath("big.bin")));
        await bob.accept("big.bin");
        await expect(alice.row("big.bin")).toContainText("%");

        await alice
            .row("big.bin")
            .getByRole("button", { name: "Cancel" })
            .click();

        await expect(alice.row("big.bin")).toContainText("Canceled");
        await expect(bob.row("big.bin")).toContainText("Canceled");
    });

    test("the receiver can cancel a running transfer", async ({
        alice,
        bob,
    }, info) => {
        await alice.connectTo(bob);
        await alice.sendFilePath(await bigFile(info.outputPath("big.bin")));
        await bob.accept("big.bin");
        await expect(bob.row("big.bin")).toContainText("%");

        await bob
            .row("big.bin")
            .getByRole("button", { name: "Cancel" })
            .click();

        await expect(bob.row("big.bin")).toContainText("Canceled");
        await expect(alice.row("big.bin")).toContainText("Canceled");
    });

    test("a receiver leaving interrupts the transfer", async ({
        alice,
        bob,
    }, info) => {
        await alice.connectTo(bob);
        await alice.sendFilePath(await bigFile(info.outputPath("big.bin")));
        await bob.accept("big.bin");
        await expect(alice.row("big.bin")).toContainText("%");

        await bob.close();

        await expect(alice.row("big.bin")).toContainText("Interrupted");
        await expect(
            alice.row("big.bin").getByRole("button", { name: "Send again" })
        ).toBeVisible();
    });
});

test.describe("a lost server connection", () => {
    test.use({ settings: { autoSaveDownloads: "false" } });

    for (const side of ["sender", "receiver"] as const) {
        test(`leaves the transfer running while the ${side} reconnects`, async ({
            openPeer,
        }, info) => {
            const relay = new SocketRelay();
            const alice = await openPeer(side === "sender" ? relay : undefined);
            const bob = await openPeer(side === "receiver" ? relay : undefined);
            const reconnecting = side === "sender" ? alice : bob;
            await alice.connectTo(bob);
            await alice.sendFilePath(
                await bigFile(info.outputPath("big.bin"), 256 * 1024 ** 2)
            );
            await bob.accept("big.bin");
            await expect(bob.row("big.bin")).toContainText("%");

            await relay.drop();
            const sinceDrop = relay.fromServer.length;

            await expect(reconnecting.lostConnectionToast()).toBeVisible();
            await expect(reconnecting.lostConnectionToast()).toBeHidden();
            await expect(bob.row("big.bin")).toContainText("%");
            await expect(alice.row("big.bin")).toContainText("Done", {
                timeout: 45_000,
            });
            await expect(bob.row("big.bin")).toContainText("Done");

            await alice.sendFiles({ name: "notes.txt", content: "after" });
            await expect(bob.row("notes.txt")).toContainText("Done");
            await expect(alice.row("notes.txt")).toContainText("Done");
            const fromServer = relay.fromServer.slice(sinceDrop).join("\n");
            expect(fromServer).toContain('"resume-connection"');
            expect(fromServer).not.toContain('"establish-connection"');
        });
    }

    test("leaves several running files going while the sender reconnects", async ({
        openPeer,
    }, info) => {
        test.slow();
        const relay = new SocketRelay();
        const alice = await openPeer(relay);
        const bob = await openPeer();
        await alice.connectTo(bob);
        await alice.sendFilePath(
            await bigFile(info.outputPath("first.bin"), 192 * MB)
        );
        await alice.sendFilePath(
            await bigFile(info.outputPath("second.bin"), 192 * MB)
        );
        await bob.accept("first.bin");
        await expect(bob.row("first.bin")).toContainText("%");
        await expect(bob.row("second.bin")).toContainText("%");

        await relay.drop();

        await reconnected(alice);
        for (const name of ["first.bin", "second.bin"]) {
            await expect(bob.row(name)).toContainText("%");
        }
        for (const name of ["first.bin", "second.bin"]) {
            await expect(alice.row(name)).toContainText("Done", {
                timeout: 90_000,
            });
            await expect(bob.row(name)).toContainText("Done");
        }
    });

    for (const side of ["sender", "one receiver"] as const) {
        test(`leaves transfers to two peers going while ${side === "sender" ? "the sender" : "one receiver"} reconnects`, async ({
            openPeer,
        }, info) => {
            test.slow();
            const relay = new SocketRelay();
            const alice = await openPeer(side === "sender" ? relay : undefined);
            const bob = await openPeer(
                side === "one receiver" ? relay : undefined
            );
            const carol = await openPeer();
            await alice.connectTo(bob);
            await alice.sendFilePath(
                await bigFile(info.outputPath("to-bob.bin"), 192 * MB)
            );
            await bob.accept("to-bob.bin");
            await flashOver(alice);
            await alice.connectTo(carol);
            await alice.sendFilePath(
                await bigFile(info.outputPath("to-carol.bin"), 192 * MB)
            );
            await carol.accept("to-carol.bin");
            await expect(bob.row("to-bob.bin")).toContainText("%");
            await expect(carol.row("to-carol.bin")).toContainText("%");

            await relay.drop();

            await reconnected(side === "sender" ? alice : bob);
            await expect(bob.row("to-bob.bin")).toContainText("%");
            await expect(carol.row("to-carol.bin")).toContainText("%");
            for (const [receiver, name] of [
                [bob, "to-bob.bin"],
                [carol, "to-carol.bin"],
            ] as const) {
                await expect(alice.row(name)).toContainText("Done", {
                    timeout: 90_000,
                });
                await expect(receiver.row(name)).toContainText("Done");
            }

            await alice.sendFiles({ name: "carol.txt", content: "after" });
            await expect(carol.row("carol.txt")).toContainText("Done");
            await flashOver(alice);
            await alice.connectTo(bob);
            await alice.sendFiles({ name: "bob.txt", content: "after" });
            await expect(bob.row("bob.txt")).toContainText("Done");
        });
    }

    for (const side of ["alice", "bob"] as const) {
        test(`leaves transfers both ways going while ${side} reconnects`, async ({
            openPeer,
        }, info) => {
            test.slow();
            const relay = new SocketRelay();
            const alice = await openPeer(side === "alice" ? relay : undefined);
            const bob = await openPeer(side === "bob" ? relay : undefined);
            await alice.connectTo(bob);
            await bob.connectTo(alice);
            await alice.sendFilePath(
                await bigFile(info.outputPath("from-alice.bin"), 192 * MB)
            );
            await bob.accept("from-alice.bin");
            await bob.sendFilePath(
                await bigFile(info.outputPath("from-bob.bin"), 192 * MB)
            );
            await alice.accept("from-bob.bin");
            await expect(bob.row("from-alice.bin")).toContainText("%");
            await expect(alice.row("from-bob.bin")).toContainText("%");
            const sinceDrop = relay.fromServer.length;

            await relay.drop();

            await reconnected(side === "alice" ? alice : bob);
            await expect(bob.row("from-alice.bin")).toContainText("%");
            await expect(alice.row("from-bob.bin")).toContainText("%");
            for (const name of ["from-alice.bin", "from-bob.bin"]) {
                await expect(alice.row(name)).toContainText("Done", {
                    timeout: 90_000,
                });
                await expect(bob.row(name)).toContainText("Done");
            }

            await alice.sendFiles({ name: "alice.txt", content: "after" });
            await expect(bob.row("alice.txt")).toContainText("Done");
            await bob.sendFiles({ name: "bob.txt", content: "after" });
            await expect(alice.row("bob.txt")).toContainText("Done");
            await alice.sendText("still there?");
            await expect(bob.row("still there?")).toBeVisible();
            expect(relay.fromServer.slice(sinceDrop).join("\n")).not.toContain(
                '"establish-connection"'
            );
        });
    }

    test("leaves the transfer running while both peers reconnect at once", async ({
        openPeer,
    }, info) => {
        test.slow();
        const aliceRelay = new SocketRelay();
        const bobRelay = new SocketRelay();
        const alice = await openPeer(aliceRelay);
        const bob = await openPeer(bobRelay);
        await alice.connectTo(bob);
        await alice.sendFilePath(
            await bigFile(info.outputPath("big.bin"), 256 * MB)
        );
        await bob.accept("big.bin");
        await expect(bob.row("big.bin")).toContainText("%");

        await Promise.all([aliceRelay.drop(), bobRelay.drop()]);

        await Promise.all([reconnected(alice), reconnected(bob)]);
        await expect(bob.row("big.bin")).toContainText("%");
        await expect(alice.row("big.bin")).toContainText("Done", {
            timeout: 90_000,
        });
        await expect(bob.row("big.bin")).toContainText("Done");

        await alice.sendFiles({ name: "notes.txt", content: "after" });
        await expect(bob.row("notes.txt")).toContainText("Done");
    });

    test.describe("with parallel transfers", () => {
        test.use({
            settings: { autoSaveDownloads: "false", parallelTransfers: "true" },
        });

        test("leaves a file spread over lanes running while the sender reconnects", async ({
            openPeer,
        }, info) => {
            test.slow();
            const relay = new SocketRelay();
            const alice = await openPeer(relay);
            const bob = await openPeer();
            await alice.connectTo(bob);
            await alice.sendFilePath(
                await bigFile(info.outputPath("big.bin"), 512 * MB)
            );
            await bob.accept("big.bin");
            await expect(bob.row("big.bin")).toContainText("%");

            await relay.drop();

            await reconnected(alice);
            await expect(bob.row("big.bin")).toContainText("%");
            await expect(alice.row("big.bin")).toContainText("Done", {
                timeout: 90_000,
            });
            await expect(bob.row("big.bin")).toContainText("Done");

            await alice.sendFilePath(
                await bigFile(info.outputPath("after.bin"), 64 * MB)
            );
            await expect(bob.row("after.bin")).toContainText("Done", {
                timeout: 60_000,
            });
        });
    });
});

/** Waits until the peer lost its server connection and holds a new one. */
async function reconnected(peer: Peer) {
    await expect(peer.lostConnectionToast()).toBeVisible();
    await expect(peer.lostConnectionToast()).toBeHidden();
}

/** Waits out the drop zone's flash after a send, which shares the status role with the hint. */
async function flashOver(peer: Peer) {
    await expect(
        peer.page.getByRole("region", { name: "Send" }).getByRole("status")
    ).toHaveCount(1);
}
