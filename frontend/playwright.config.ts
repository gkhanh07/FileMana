import { defineConfig } from "@playwright/test";

const API = "http://localhost:3101";
const WEB = "http://localhost:3100";
const BROWSER = process.env.BROWSER ?? "chromium";

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  // NFR-09: BROWSER=msedge|firefox|webkit runs the suite in that browser (WebKit stands in for Safari).
  // One browser per run, because the specs expect the fresh test database each run starts with.
  use: {
    baseURL: WEB,
    locale: "vi-VN",
    ...(BROWSER === "msedge" ? { channel: "msedge" } : { browserName: BROWSER as "chromium" | "firefox" | "webkit" }),
  },
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
