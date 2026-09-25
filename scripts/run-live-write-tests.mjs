import { spawnSync } from "node:child_process";
import process from "node:process";

const suite = process.argv[2];
const confirmed = process.argv.includes("--confirm-production-writes");

if (!confirmed || !["e2e", "security"].includes(suite)) {
  console.error("DIBLOKIR: perintah ini dapat menulis ke Supabase production dan membutuhkan konfirmasi eksplisit.");
  process.exit(1);
}

const env = { ...process.env, ALLOW_LIVE_WRITE_TESTS: "1" };
const command = suite === "e2e" ? (process.platform === "win32" ? "npx.cmd" : "npx") : process.execPath;
const args =
  suite === "e2e"
    ? ["playwright", "test", "--config", "playwright.live.config.ts"]
    : ["scripts/live-security-check.mjs", "--confirm-production-writes"];
const result = spawnSync(command, args, { stdio: "inherit", env });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
