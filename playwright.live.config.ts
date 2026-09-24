import { defineConfig } from "@playwright/test";
import { projects } from "./playwright.config";

const PORT = 3200;

/** E2E terhadap Supabase HOSTED memakai .env.local. Jalankan `npm run build` dulu, lalu `npm run test:e2e:live`. */
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: ["live.spec.ts"],
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects,
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/panduan`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
