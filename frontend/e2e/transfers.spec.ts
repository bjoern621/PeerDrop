import { open } from "node:fs/promises";
import { expect, test } from "./peers";

// Sparse, so the file costs no disk space and keeps a transfer running for seconds.
async function bigFile(path: string) {
    const file = await open(path, "w");
    await file.truncate(2 * 1024 ** 3);
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
