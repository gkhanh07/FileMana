import { expect, test } from "@playwright/test";

const EMAIL = "e2e@filemana.test";
const PASSWORD = "e2e-password-123";

// FR-PRJ-07, FR-PRJ-08, FR-TASK-02: one sign-in for the whole flow (sign-in is rate limited).
test("milestones, linked tasks and the overview stats", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();

  await page.getByRole("button", { name: "Tạo mới" }).click();
  await page.getByRole("menuitem", { name: "Dự án" }).click();
  await page.getByRole("dialog").getByLabel("Tên dự án").fill("Cột mốc thử");
  await page.getByRole("dialog").getByRole("button", { name: "Tạo dự án" }).click();
  await expect(page.getByRole("heading", { name: "Cột mốc thử" })).toBeVisible();
  const main = page.getByRole("main");
  await expect(main.getByText("Chưa có cột mốc nào.")).toBeVisible();
  await expect(main.getByText("đã tạo dự án")).toBeVisible();

  // Create, then rename.
  await main.getByRole("button", { name: "Thêm cột mốc" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên cột mốc").fill("Bản thử");
  await dialog.getByLabel("Ngày").fill("2026-11-20");
  await dialog.getByRole("button", { name: "Lưu" }).click();
  const row = main.getByRole("listitem").filter({ hasText: "Bản thử" });
  await expect(row).toContainText("0/0 việc xong");
  await row.getByRole("button", { name: "Thao tác với Bản thử" }).click();
  await page.getByRole("menuitem", { name: "Sửa" }).click();
  await dialog.getByLabel("Tên cột mốc").fill("Bản beta");
  await dialog.getByRole("button", { name: "Lưu" }).click();
  await expect(main.getByText("Bản beta")).toBeVisible();

  // Group the task list by milestone and add a task straight into it.
  await page.getByRole("link", { name: "Công việc" }).click();
  await page.getByRole("button", { name: "Thêm việc đầu tiên" }).click();
  const add = page.getByRole("textbox", { name: "Thêm việc" });
  await add.fill("Việc chung");
  await add.press("Enter");
  await add.press("Escape");
  await page.getByRole("combobox", { name: "Nhóm theo" }).click();
  await page.getByRole("option", { name: "Cột mốc" }).click();
  const beta = page.getByRole("region", { name: /^Bản beta/ });
  await beta.getByRole("button", { name: "Thêm việc", exact: true }).click();
  await add.fill("Việc của beta");
  await add.press("Enter");
  await expect(page.getByRole("region", { name: "Bản beta, 1 việc" })).toContainText("Việc của beta");
  await expect(page.getByRole("region", { name: "Không có cột mốc, 1 việc" })).toContainText("Việc chung");
  await add.press("Escape");

  // Done counts toward the milestone and the stats row.
  await beta.getByRole("button", { name: /^Trạng thái của / }).click();
  await page.getByRole("menuitemradio", { name: "Hoàn thành" }).click();
  await expect(beta.getByRole("button", { name: /^Trạng thái của / })).toHaveText("Hoàn thành");
  await page.getByRole("link", { name: "Tổng quan" }).click();
  await expect(main.getByRole("listitem").filter({ hasText: "Bản beta" })).toContainText("1/1 việc xong");
  const stats = main.getByRole("definition");
  await expect(stats.first()).toHaveText("50%");

  // Delete goes at once, with Undo in the toast.
  await main.getByRole("button", { name: "Thao tác với Bản beta" }).click();
  await page.getByRole("menuitem", { name: "Xóa" }).click();
  await expect(main.getByText("Chưa có cột mốc nào.")).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(main.getByRole("listitem").filter({ hasText: "Bản beta" })).toContainText("1/1 việc xong");

  // Archived is read-only.
  const menu = page.getByRole("button", { name: "Thao tác với dự án: Cột mốc thử" });
  await menu.click();
  await page.getByRole("menuitem", { name: "Lưu trữ" }).click();
  await expect(page.getByText("Dự án đã được lưu trữ")).toBeVisible();
  await expect(main.getByRole("button", { name: "Thêm cột mốc" })).toHaveCount(0);
  await expect(main.getByRole("button", { name: "Thao tác với Bản beta" })).toHaveCount(0);

  // Leave no project behind: projects.spec expects an empty list.
  await menu.click();
  await page.getByRole("menuitem", { name: "Xóa dự án" }).click();
  await dialog.getByLabel("Tên dự án").fill("Cột mốc thử");
  await dialog.getByRole("button", { name: "Xóa dự án" }).click();
  await expect(page.getByText("Đã chuyển dự án vào Thùng rác.")).toBeVisible();
});
