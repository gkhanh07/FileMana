import { expect, test } from "@playwright/test";

// Account created by the backend's e2e server (backend/src/e2e-server.ts).
const EMAIL = "e2e@filemana.test";
const PASSWORD = "e2e-password-123";

test("redirects to sign-in when signed out", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("wrong password shows an error and stays on the form", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mật khẩu").fill("wrong-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByText("Email hoặc mật khẩu không đúng.")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("signs in, then signs out", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();

  await page.getByRole("button", { name: "Tài khoản" }).click();
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
});
