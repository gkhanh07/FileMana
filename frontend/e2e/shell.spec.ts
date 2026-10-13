import { expect, test } from "@playwright/test";

// Account created by the backend's e2e server (backend/src/e2e-server.ts).
const EMAIL = "e2e@filemana.test";
const PASSWORD = "e2e-password-123";

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: "Xin chào, E2E" })).toBeVisible();
});

test("sidebar links open their pages and show in the breadcrumb", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await nav.getByRole("link", { name: "Dự án" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: "Dự án" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Dự án" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Vị trí hiện tại" })).toHaveText("Dự án");
});

test("collapsed sidebar is remembered after reload", async ({ page }) => {
  await page.getByRole("button", { name: "Thu gọn thanh bên" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Mở rộng thanh bên" })).toBeVisible();
  await page.getByRole("button", { name: "Mở rộng thanh bên" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Thu gọn thanh bên" })).toBeVisible();
});

test("theme is saved to the account, not just this browser", async ({ page }) => {
  await page.getByRole("button", { name: "Giao diện" }).click();
  const saved = page.waitForResponse((r) => r.url().endsWith("/me") && r.request().method() === "PATCH");
  await page.getByRole("menuitemradio", { name: "Tối" }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.locator("html")).toHaveClass(/dark/);

  // A fresh browser storage still gets the account's theme.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
