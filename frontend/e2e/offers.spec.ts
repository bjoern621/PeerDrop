import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
    collectDownloads,
    contentOf,
    downloadNamed,
    expect,
    SocketRelay,
    test,
} from "./peers";

test("an accepted file arrives with its content", async ({ alice, bob }) => {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "notes.txt", content: "hello bob" });

    await expect(alice.row("notes.txt")).toContainText(
        "Waiting for acceptance"
    );
    await expect(bob.row("notes.txt")).toContainText(alice.token);

    const download = bob.page.waitForEvent("download");
    await bob.accept("notes.txt");

    expect((await download).suggestedFilename()).toBe("notes.txt");
    expect(await contentOf(await download)).toBe("hello bob");
    await expect(alice.row("notes.txt")).toContainText("Done");
    await expect(bob.row("notes.txt")).toContainText("Done");
});

test("a text file without extension keeps its name", async ({ alice, bob }) => {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "mvnw", content: "#!/bin/sh\n" });

    const download = bob.page.waitForEvent("download");
    await bob.accept("mvnw");

    expect((await download).suggestedFilename()).toBe("mvnw");
    expect(await contentOf(await download)).toBe("#!/bin/sh\n");
});

test("a declined offer shows as declined on both sides", async ({
    alice,
    bob,
}) => {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
    await bob.row("notes.txt").getByRole("button", { name: "Decline" }).click();

    await expect(alice.row("notes.txt")).toContainText("Declined");
    await expect(bob.row("notes.txt")).toContainText("Declined");
    await expect(
        bob.row("notes.txt").getByRole("button", { name: "ACCEPT" })
    ).toHaveCount(0);
    await expect(
        bob
            .row("notes.txt")
            .getByRole("button", { name: `Block ${alice.token}` })
    ).toBeVisible();
});

test("a withdrawn offer disappears at the receiver", async ({ alice, bob }) => {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
    await expect(bob.row("notes.txt")).toBeVisible();

    await alice
        .row("notes.txt")
        .getByRole("button", { name: "Cancel" })
        .click();

    await expect(alice.row("notes.txt")).toHaveCount(0);
    await expect(bob.row("notes.txt")).toHaveCount(0);
});

test("an offer to a receiver that leaves is not delivered", async ({
    alice,
    openPeer,
}) => {
    const bob = await openPeer();
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
    await expect(bob.row("notes.txt")).toBeVisible();

    await bob.leave();

    await expect(alice.row("notes.txt")).toContainText("Not delivered");
});

test("an offer from a sender that leaves disappears at the receiver", async ({
    bob,
    openPeer,
}) => {
    const alice = await openPeer();
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
    await expect(bob.row("notes.txt")).toBeVisible();

    await alice.leave();

    await expect(bob.row("notes.txt")).toHaveCount(0);
});

test.describe("an open offer and a lost server connection", () => {
    for (const side of ["sender", "receiver"] as const) {
        test(`the offer stays open while the ${side} reconnects`, async ({
            openPeer,
        }) => {
            const relay = new SocketRelay();
            const alice = await openPeer(side === "sender" ? relay : undefined);
            const bob = await openPeer(side === "receiver" ? relay : undefined);
            await alice.connectTo(bob);
            await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
            await expect(bob.row("notes.txt")).toBeVisible();

            await relay.drop();
            await (side === "sender" ? alice : bob).reconnected();

            await expect(alice.row("notes.txt")).toContainText(
                "Waiting for acceptance"
            );
            const download = downloadNamed(bob.page, "notes.txt");
            await bob.accept("notes.txt");
            expect(await contentOf(await download)).toBe("hello bob");
            await expect(alice.row("notes.txt")).toContainText("Done");
        });
    }

    test("the offer stays open while both peers reconnect at once", async ({
        openPeer,
    }) => {
        const aliceRelay = new SocketRelay();
        const bobRelay = new SocketRelay();
        const alice = await openPeer(aliceRelay);
        const bob = await openPeer(bobRelay);
        await alice.connectTo(bob);
        await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
        await expect(bob.row("notes.txt")).toBeVisible();

        await Promise.all([aliceRelay.drop(), bobRelay.drop()]);
        await Promise.all([alice.reconnected(), bob.reconnected()]);

        await bob.accept("notes.txt");
        await expect(bob.row("notes.txt")).toContainText("Done");
        await expect(alice.row("notes.txt")).toContainText("Done");
    });

    test("an accept while the sender is away starts the transfer once it is back", async ({
        openPeer,
        bob,
    }) => {
        const relay = new SocketRelay();
        const alice = await openPeer(relay);
        await alice.connectTo(bob);
        await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
        await expect(bob.row("notes.txt")).toBeVisible();

        await relay.cut();
        await expect(alice.lostConnectionToast()).toBeVisible();
        await bob.accept("notes.txt");
        relay.reopen();

        await expect(alice.row("notes.txt")).toContainText("Done", {
            timeout: 30_000,
        });
        await expect(bob.row("notes.txt")).toContainText("Done");
    });

    test("an accept while the receiver is away starts the transfer once it is back", async ({
        alice,
        openPeer,
    }) => {
        const relay = new SocketRelay();
        const bob = await openPeer(relay);
        await alice.connectTo(bob);
        await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
        await expect(bob.row("notes.txt")).toBeVisible();

        await relay.cut();
        await expect(bob.lostConnectionToast()).toBeVisible();
        await bob.accept("notes.txt");
        relay.reopen();

        await expect(bob.row("notes.txt")).toContainText("Done", {
            timeout: 30_000,
        });
        await expect(alice.row("notes.txt")).toContainText("Done");
    });

    test("a decline while the sender is away reaches it once it is back", async ({
        openPeer,
        bob,
    }) => {
        const relay = new SocketRelay();
        const alice = await openPeer(relay);
        await alice.connectTo(bob);
        await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
        await expect(bob.row("notes.txt")).toBeVisible();

        await relay.cut();
        await expect(alice.lostConnectionToast()).toBeVisible();
        await bob
            .row("notes.txt")
            .getByRole("button", { name: "Decline" })
            .click();
        relay.reopen();

        await expect(alice.row("notes.txt")).toContainText("Declined", {
            timeout: 30_000,
        });
        await expect(bob.row("notes.txt")).toContainText("Declined");
    });
});

test("after one accept, later files arrive without asking", async ({
    alice,
    bob,
}) => {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "first.txt", content: "one" });
    await bob.accept("first.txt");
    await expect(bob.row("first.txt")).toContainText("Done");

    const download = downloadNamed(bob.page, "second.txt");
    await alice.sendFiles({ name: "second.txt", content: "two" });

    await expect(bob.row("second.txt")).not.toContainText("ACCEPT");
    expect(await contentOf(await download)).toBe("two");
    await expect(alice.row("second.txt")).toContainText("Done");
    await expect(bob.row("second.txt")).toContainText("Done");
});

test("open offers of the same sender start together on one accept", async ({
    alice,
    bob,
}) => {
    await alice.connectTo(bob);
    await alice.sendFiles({ name: "first.txt", content: "one" });
    await alice.sendFiles({ name: "second.txt", content: "two" });
    await expect(bob.row("second.txt")).toBeVisible();

    await bob.accept("first.txt");

    await expect(bob.row("first.txt")).toContainText("Done");
    await expect(bob.row("second.txt")).toContainText("Done");
    await expect(alice.row("second.txt")).toContainText("Done");
});

test("several files travel as one offer", async ({ alice, bob }) => {
    const downloads = collectDownloads(bob.page);
    await alice.connectTo(bob);
    await alice.sendFiles(
        { name: "a.txt", content: "alpha" },
        { name: "b.txt", content: "beta" }
    );

    await expect(bob.row("2 files")).toBeVisible();
    await bob.accept("2 files");

    await expect(bob.row("a.txt")).toContainText("Done");
    await expect(bob.row("b.txt")).toContainText("Done");
    await expect.poll(() => downloads.length).toBe(2);
    const received = await Promise.all(
        downloads.map(async d => [d.suggestedFilename(), await contentOf(d)])
    );
    expect(Object.fromEntries(received)).toEqual({
        "a.txt": "alpha",
        "b.txt": "beta",
    });
});

test.describe("folders", () => {
    test.use({
        directoryPicker: false,
        settings: { autoSaveDownloads: "false" },
    });

    test("a folder arrives with every file", async ({ alice, bob }, info) => {
        const folder = info.outputPath("album");
        await mkdir(join(folder, "sub"), { recursive: true });
        await writeFile(join(folder, "a.txt"), "alpha");
        await writeFile(join(folder, "sub", "b.txt"), "beta");

        await alice.connectTo(bob);
        await alice.sendFolder(folder);
        await expect(alice.row("album")).toContainText(
            "Waiting for acceptance"
        );
        await bob.accept("album");

        await expect(alice.row("album")).toContainText("Done");
        await expect(bob.row("album")).toContainText("Done");
        await expect(bob.row("album")).toContainText("2 files");

        const downloads = collectDownloads(bob.page);
        await bob.row("album").getByRole("button", { name: "SAVE" }).click();
        await expect.poll(() => downloads.length).toBe(2);
        const contents = await Promise.all(downloads.map(contentOf));
        expect(contents.sort()).toEqual(["alpha", "beta"]);
    });
});

test.describe("without automatic saving", () => {
    test.use({ settings: { autoSaveDownloads: "false" } });

    test("a received file waits for SAVE", async ({ alice, bob }) => {
        const downloads = collectDownloads(bob.page);
        await alice.connectTo(bob);
        await alice.sendFiles({ name: "notes.txt", content: "hello bob" });
        await bob.accept("notes.txt");
        await expect(bob.row("notes.txt")).toContainText("Done");
        expect(downloads).toHaveLength(0);

        const download = bob.page.waitForEvent("download");
        await bob
            .row("notes.txt")
            .getByRole("button", { name: "SAVE" })
            .click();
        expect(await contentOf(await download)).toBe("hello bob");
    });
});
