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

test("find a task with Ctrl+K, delete it, restore it from Trash, then delete it for good", async ({ page }) => {
  await page.getByRole("button", { name: "Tạo mới" }).click();
  await page.getByRole("menuitem", { name: "Dự án" }).click();
  await page.getByRole("dialog").getByLabel("Tên dự án").fill("Kho ảnh sự kiện");
  await page.getByRole("dialog").getByRole("button", { name: "Tạo dự án" }).click();
  await expect(page.getByRole("heading", { name: "Kho ảnh sự kiện" })).toBeVisible();
  await page.getByRole("link", { name: "Công việc" }).click();
  await page.getByRole("button", { name: "Thêm việc đầu tiên" }).click();
  const add = page.getByRole("textbox", { name: "Thêm việc" });
  await add.fill("Đặt lịch chụp ảnh");
  await add.press("Enter");
  const row = page.locator("main li[id^=task-]");
  await expect(row).toHaveCount(1);
  const key = (await row.getAttribute("id"))!.replace("task-", "");
  await add.press("Escape");

  await page.keyboard.press("Control+K");
  const palette = page.getByRole("dialog", { name: "Tìm kiếm" });
  await palette.getByRole("combobox").fill("dat lich");
  await expect(palette.getByRole("option", { name: new RegExp(`${key} Đặt lịch chụp ảnh`) })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/tasks/${key}$`));

  await page.keyboard.press("Control+K");
  await expect(palette.getByRole("group", { name: "Xem gần đây" })).toContainText("Đặt lịch chụp ảnh");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Thêm thao tác" }).click();
  await page.getByRole("menuitem", { name: "Xóa công việc" }).click();
  await expect(page.getByText(`Đã xóa ${key}.`)).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/tasks$/);

  const name = `${key} Đặt lịch chụp ảnh`;
  await page.goto("/settings/trash");
  await page.getByRole("button", { name: `Khôi phục ${name}` }).click();
  await expect(page.getByText(`Đã khôi phục “${name}”.`)).toBeVisible();
  await expect(page.getByRole("cell", { name: new RegExp(name) })).toHaveCount(0);

  await page.goto(`/tasks/${key}`);
  await page.getByRole("button", { name: "Thêm thao tác" }).click();
  await page.getByRole("menuitem", { name: "Xóa công việc" }).click();
  await expect(page.getByText(`Đã xóa ${key}.`)).toBeVisible();

  await page.goto("/settings/trash");
  await page.getByRole("button", { name: `Xóa vĩnh viễn ${name}` }).click();
  const confirm = page.getByRole("dialog", { name: "Xóa vĩnh viễn?" });
  await confirm.getByRole("button", { name: "Xóa vĩnh viễn" }).click();
  await expect(page.getByText(`Đã xóa vĩnh viễn “${name}”.`)).toBeVisible();
  await expect(page.getByRole("cell", { name: new RegExp(name) })).toHaveCount(0);
});
