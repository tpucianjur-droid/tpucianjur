import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const FAKE_SUPABASE_PORT = 54399;

/**
 * E2E default (tanpa Supabase online): build `.next-e2e` diarahkan ke tests/e2e/fake-supabase.mjs
 * yang menyajikan field publik dari 149 data CSV. Jalankan: npm run test:e2e
 * Tes terhadap Supabase hosted ada di playwright.live.config.ts (npm run test:e2e:live).
 */
export const projects = [
  { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } } },
  { name: "mobile", use: { ...devices["Pixel 7"] } },
];

export default defineConfig({
  testDir: "tests/e2e",
  testIgnore: ["live.spec.ts"],
  timeout: 30_000,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects,
  webServer: [
    {
      command: "node tests/e2e/fake-supabase.mjs",
      url: `http://127.0.0.1:${FAKE_SUPABASE_PORT}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/panduan`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${FAKE_SUPABASE_PORT}`,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_e2e_fake_key",
      },
    },
  ],
});
