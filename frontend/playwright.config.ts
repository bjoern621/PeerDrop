import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a running stack, started with `task up`.
 * PEERDROP_URL points them at another deployment.
 */
export default defineConfig({
    testDir: "e2e",
    outputDir: "test-results",
    fullyParallel: true,
    // Every test opens two peers whose WebRTC connections share the machine.
    workers: 4,
    forbidOnly: !!process.env.CI,
    reporter: [["list"], ["html", { open: "never" }]],
    timeout: 60_000,
    expect: { timeout: 15_000 },
    use: {
        baseURL: process.env.PEERDROP_URL ?? "http://localhost",
        locale: "en-US",
        viewport: { width: 1440, height: 900 },
        trace: "retain-on-failure",
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    ],
});
