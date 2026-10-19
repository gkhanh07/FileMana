import { expect, test } from "@playwright/test";

const EMAIL = "e2e@filemana.test";
const PASSWORD = "e2e-password-123";

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();
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

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("at 1024px the sidebar is the icon rail", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(nav.getByText("Dự án")).toBeHidden();
  await expect(nav.getByRole("link", { name: "Dự án" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thu gọn thanh bên" })).toBeHidden();
});

test("offline bar shows while the connection is lost", async ({ page, context }) => {
  await context.setOffline(true);
  await expect(page.getByText("Đang mất kết nối")).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText("Đang mất kết nối")).toBeHidden();
});

test("unknown route shows the not-found page", async ({ page }) => {
  await page.goto("/xyz");
  await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible();
  await page.getByRole("link", { name: "Về Trang chủ" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();
});
