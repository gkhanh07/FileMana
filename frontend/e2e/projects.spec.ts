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

test("create, pin, archive, restore and delete a project", async ({ page }) => {
  await page.getByRole("button", { name: "Tạo mới" }).click();
  await page.getByRole("menuitem", { name: "Dự án" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên dự án").fill("Thiết kế web");
  await expect(dialog.getByLabel("Mã dự án")).toHaveValue("TKW");
  await dialog.getByRole("button", { name: "Tạo dự án" }).click();

  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Thiết kế web" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tổng quan" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "Ghim vào Yêu thích" }).click();
  const sidebar = page.locator("aside");
  await expect(sidebar.getByRole("link", { name: "Thiết kế web" })).toBeVisible();

  const menu = page.getByRole("button", { name: "Thao tác với dự án: Thiết kế web" });
  await menu.click();
  await page.getByRole("menuitem", { name: "Lưu trữ" }).click();
  await expect(page.getByText("Dự án đã được lưu trữ")).toBeVisible();
  await page.goto("/projects");
  await expect(page.getByText("Không có dự án nào khớp bộ lọc.")).toBeVisible();
  await page.getByRole("button", { name: /Đã lưu trữ/ }).click();
  await expect(page).toHaveURL(/status=archived/);
  await page.getByRole("main").getByRole("link", { name: /Thiết kế web/ }).click();
  await page.getByRole("button", { name: "Khôi phục" }).click();
  await expect(page.getByText("Dự án đã được lưu trữ")).toHaveCount(0);

  await page.goto("/projects");
  await page.getByRole("button", { name: "Dự án mới" }).click();
  await dialog.getByLabel("Tên dự án").fill("Tài khoản web");
  await dialog.getByRole("button", { name: "Tạo dự án" }).click();
  await expect(dialog.getByText("Mã này đã được dự án khác dùng.")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Thao tác với dự án: Thiết kế web" }).click();
  await page.getByRole("menuitem", { name: "Xóa dự án" }).click();
  const confirm = dialog.getByRole("button", { name: "Xóa dự án" });
  await dialog.getByLabel("Tên dự án").fill("Thiet ke web");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Tên dự án").fill("Thiết kế web");
  await confirm.click();
  await expect(page.getByText("Chưa có dự án nào.")).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Thiết kế web" })).toHaveCount(0);
});
