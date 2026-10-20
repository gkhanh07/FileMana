import { expect, test } from "@playwright/test";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test("company name, logo, week start and timezone", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("e2e@filemana.test");
  await page.getByLabel("Mật khẩu").fill("e2e-password-123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();
  await page.goto("/settings");

  const section = page.getByRole("region", { name: "Không gian làm việc" });
  const sidebar = page.getByRole("complementary");
  const name = section.getByLabel("Tên công ty");
  const original = await name.inputValue();
  const save = () => section.getByRole("button", { name: "Lưu" }).click();

  await name.fill("Công ty E2E");
  await section.getByLabel("Ngày đầu tuần").click();
  await page.getByRole("option", { name: "Chủ nhật" }).click();
  await section.getByLabel("Múi giờ").click();
  await page.getByRole("option", { name: "Asia/Tokyo" }).click();
  await save();
  await expect(sidebar).toContainText("Công ty E2E");

  await page.reload();
  await expect(section.getByLabel("Ngày đầu tuần")).toHaveText("Chủ nhật");
  await expect(section.getByLabel("Múi giờ")).toHaveText("Asia/Tokyo");

  await section.getByLabel("Logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  const logo = sidebar.locator("img");
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1);
  await section.getByRole("button", { name: "Gỡ logo" }).click();
  await expect(logo).toHaveCount(0);

  await name.fill(original);
  await section.getByLabel("Ngày đầu tuần").click();
  await page.getByRole("option", { name: "Thứ Hai" }).click();
  await section.getByLabel("Múi giờ").click();
  await page.getByRole("option", { name: "Asia/Ho_Chi_Minh" }).click();
  await save();
  await expect(sidebar).toContainText(original);
});
