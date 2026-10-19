import { defineConfig } from "@playwright/test";

const API = "http://localhost:3101";
const WEB = "http://localhost:3100";

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  use: { baseURL: WEB, locale: "vi-VN" },
  webServer: [
    {
      command: "npm run e2e:serve",
      cwd: "../backend",
      env: { PORT: "3101", WEB_ORIGIN: WEB, COOKIE_SECURE: "false" },
      url: `${API}/health`,
      timeout: 120_000,
    },
    {
      command: "npx next build && npx next start -p 3100",
      env: { NEXT_PUBLIC_API_URL: API, API_URL: API, NEXT_DIST_DIR: ".next/e2e" },
      url: `${WEB}/sign-in`,
      timeout: 300_000,
    },
  ],
});
