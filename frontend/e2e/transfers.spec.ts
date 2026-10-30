import { open } from "node:fs/promises";
import { expect, SocketRelay, test } from "./peers";

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
});
