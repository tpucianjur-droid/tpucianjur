import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production test safety", () => {
  it("default E2E memakai fake Supabase dan tidak termasuk live spec", () => {
    const config = readFileSync("playwright.config.ts", "utf8");
    const buildScript = readFileSync("scripts/e2e-build.mjs", "utf8");
    expect(config).toContain('testIgnore: ["live.spec.ts"]');
    expect(config).toContain("fake-supabase.mjs");
    expect(buildScript).toContain("127.0.0.1");
    expect(buildScript).toContain("sb_publishable_e2e_fake_key");
  });

  it("hosted write suites membutuhkan opt-in dan konfirmasi eksplisit", () => {
    const liveSpec = readFileSync("tests/e2e/live.spec.ts", "utf8");
    const security = readFileSync("scripts/live-security-check.mjs", "utf8");
    const runner = readFileSync("scripts/run-live-write-tests.mjs", "utf8");
    expect(liveSpec).toContain('process.env.ALLOW_LIVE_WRITE_TESTS === "1"');
    expect(security).toContain('process.env.ALLOW_LIVE_WRITE_TESTS !== "1"');
    expect(security).toContain("--confirm-production-writes");
    expect(runner).toContain('ALLOW_LIVE_WRITE_TESTS: "1"');
    expect(runner).toContain("--confirm-production-writes");
  });
});
