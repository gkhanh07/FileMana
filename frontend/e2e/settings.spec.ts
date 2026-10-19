import { expect, test, type Browser, type Page } from "@playwright/test";

const EMAIL = "e2e@filemana.test";
const PASSWORD = "e2e-password-123";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

async function signIn(page: Page, password = PASSWORD) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

async function otherDevice(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  await signIn(page);
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();
  return page;
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();
  await page.goto("/settings");
});

test("name and avatar changes show in the sidebar", async ({ page }) => {
  const account = page.getByRole("button", { name: "Tài khoản" });
  await page.getByLabel("Tên").fill("E2E Mới");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(account).toContainText("E2E Mới");

  await page.getByLabel("Ảnh đại diện").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
  const img = account.locator("img");
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1);

  await page.getByRole("button", { name: "Gỡ ảnh" }).click();
  await expect(img).toHaveCount(0);
  await page.getByLabel("Tên").fill("E2E");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(account).toContainText("E2E");
  await expect(account).not.toContainText("Mới");
});

test("changing the password signs out other devices and retires the old one", async ({ page, browser }) => {
  const other = await otherDevice(browser);
  const change = async (current: string, next: string) => {
    await page.getByLabel("Mật khẩu hiện tại").fill(current);
    await page.getByLabel("Mật khẩu mới").fill(next);
    await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
  };

  await change("wrong-password", "new-password-456");
  await expect(page.getByText("Mật khẩu hiện tại không đúng.")).toBeVisible();

  await change(PASSWORD, "new-password-456");
  await expect(page.getByText("Đã đổi mật khẩu.", { exact: false })).toBeVisible();
  await other.reload();
  await expect(other).toHaveURL(/\/sign-in$/);
  await signIn(other);
  await expect(other.getByText("Email hoặc mật khẩu không đúng.")).toBeVisible();

  await page.reload();
  await change("new-password-456", PASSWORD);
  await expect(page.getByText("Đã đổi mật khẩu.", { exact: false })).toBeVisible();
});

test("sign out of all other devices", async ({ page, browser }) => {
  const other = await otherDevice(browser);
  await page.getByRole("button", { name: "Đăng xuất mọi thiết bị khác" }).click();
  await expect(page.getByText("Đã đăng xuất các thiết bị khác.")).toBeVisible();
  await other.reload();
  await expect(other).toHaveURL(/\/sign-in$/);
  await page.reload();
  await expect(page).toHaveURL(/\/settings$/);
});
