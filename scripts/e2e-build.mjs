// Build khusus E2E yang diarahkan ke fake-supabase (tests/e2e/fake-supabase.mjs) di folder .next-e2e.
// Tidak menyentuh build production (.next) maupun .env.local.
import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  NEXT_DIST_DIR: ".next-e2e",
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${process.env.FAKE_SUPABASE_PORT ?? 54399}`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_e2e_fake_key",
};
const result = spawnSync("npx", ["next", "build"], { stdio: "inherit", shell: true, env });
process.exit(result.status ?? 1);
