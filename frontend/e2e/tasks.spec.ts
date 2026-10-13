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

// FR-TASK-01..05, 21..23, FR-PRJ-04
test("quick create, add rows, edit inline, filter and see progress", async ({ page }) => {
  await page.getByRole("button", { name: "Tạo mới" }).click();
  await page.getByRole("menuitem", { name: "Dự án" }).click();
  await page.getByRole("dialog").getByLabel("Tên dự án").fill("Ứng dụng di động");
  await page.getByRole("dialog").getByRole("button", { name: "Tạo dự án" }).click();
  await expect(page.getByRole("heading", { name: "Ứng dụng di động" })).toBeVisible();
  await page.getByRole("link", { name: "Công việc" }).click();
  await expect(page.getByText("Dự án này chưa có công việc nào.")).toBeVisible();

  // C opens quick create with the cursor in the title; this project is preselected.
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog");
  const title = dialog.getByLabel("Tên công việc");
  await expect(title).toBeFocused();
  await expect(dialog.getByLabel("Dự án")).toHaveText(/Ứng dụng di động/);

  // Shift+Enter keeps it open for the next one; Enter closes.
  await title.fill("Màn hình đăng nhập");
  await title.press("Shift+Enter");
  await expect(page.getByText("Đã tạo UDDD-1.")).toBeVisible();
  await expect(title).toHaveValue("");
  await expect(title).toBeFocused();
  await title.fill("Thông báo đẩy");
  await title.press("Enter");
  await expect(dialog).toHaveCount(0);
  const rows = page.locator("main li[id^=task-]");
  await expect(rows).toHaveCount(2);

  // "+ Thêm việc" at the end of a group creates in that group.
  await page.getByRole("region", { name: /^Đang làm/ }).getByRole("button", { name: "Thêm việc", exact: true }).click();
  const add = page.getByRole("textbox", { name: "Thêm việc" });
  await add.fill("Kết nối API");
  await add.press("Enter");
  await expect(page.getByRole("region", { name: "Đang làm, 1 việc" })).toContainText("Kết nối API");
  await add.press("Escape");

  // Inline status change moves the row to its group at once.
  await page.getByRole("button", { name: "Trạng thái của UDDD-1" }).click();
  await page.getByRole("menuitemradio", { name: "Hoàn thành" }).click();
  await expect(page.getByRole("region", { name: "Hoàn thành, 1 việc" })).toContainText("Màn hình đăng nhập");

  // Filter by priority, then clear.
  await page.getByRole("button", { name: "Ưu tiên của UDDD-2" }).click();
  await page.getByRole("menuitemradio", { name: "Khẩn cấp" }).click();
  await page.getByRole("combobox", { name: "Ưu tiên" }).click();
  await page.getByRole("option", { name: "Khẩn cấp" }).click();
  await expect(rows).toHaveCount(1);
  await expect(page).toHaveURL(/priority=URGENT/);
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await expect(rows).toHaveCount(3);

  // The edits were saved: they survive a reload, and progress counts them.
  await page.reload();
  await expect(page.getByRole("region", { name: "Hoàn thành, 1 việc" })).toContainText("Màn hình đăng nhập");
  await page.goto("/projects");
  await expect(page.getByRole("row", { name: /Ứng dụng di động/ })).toContainText("1/3 việc xong");
});
