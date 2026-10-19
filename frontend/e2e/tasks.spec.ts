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

test("quick create, add rows, edit inline, filter and see progress", async ({ page }) => {
  await page.getByRole("button", { name: "Tạo mới" }).click();
  await page.getByRole("menuitem", { name: "Dự án" }).click();
  await page.getByRole("dialog").getByLabel("Tên dự án").fill("Ứng dụng di động");
  await page.getByRole("dialog").getByRole("button", { name: "Tạo dự án" }).click();
  await expect(page.getByRole("heading", { name: "Ứng dụng di động" })).toBeVisible();
  await page.getByRole("link", { name: "Công việc" }).click();
  await expect(page.getByText("Dự án này chưa có công việc nào.")).toBeVisible();

  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog");
  const title = dialog.getByLabel("Tên công việc");
  await expect(title).toBeFocused();
  await expect(dialog.getByLabel("Dự án")).toHaveText(/Ứng dụng di động/);

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

  await page.getByRole("region", { name: /^Đang làm/ }).getByRole("button", { name: "Thêm việc", exact: true }).click();
  const add = page.getByRole("textbox", { name: "Thêm việc" });
  await add.fill("Kết nối API");
  await add.press("Enter");
  await expect(page.getByRole("region", { name: "Đang làm, 1 việc" })).toContainText("Kết nối API");
  await add.press("Escape");

  await page.getByRole("button", { name: "Trạng thái của UDDD-1" }).click();
  await page.getByRole("menuitemradio", { name: "Hoàn thành" }).click();
  await expect(page.getByRole("region", { name: "Hoàn thành, 1 việc" })).toContainText("Màn hình đăng nhập");

  await page.getByRole("button", { name: "Ưu tiên của UDDD-2" }).click();
  await page.getByRole("menuitemradio", { name: "Khẩn cấp" }).click();
  await page.getByRole("combobox", { name: "Ưu tiên" }).click();
  await page.getByRole("option", { name: "Khẩn cấp" }).click();
  await expect(rows).toHaveCount(1);
  await expect(page).toHaveURL(/priority=URGENT/);
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await expect(rows).toHaveCount(3);

  await page.getByRole("checkbox", { name: "Chọn UDDD-2" }).click();
  await page.getByRole("checkbox", { name: "Chọn UDDD-3" }).click({ modifiers: ["Shift"] });
  const bar = page.getByRole("toolbar", { name: "Thao tác hàng loạt" });
  await expect(bar).toContainText("Đã chọn 2 việc");
  await bar.getByRole("button", { name: "Ưu tiên" }).click();
  await page.getByRole("menuitem", { name: "Thấp" }).click();
  await expect(page.getByRole("button", { name: "Ưu tiên của UDDD-2" })).toHaveText("Thấp");
  await expect(page.getByRole("button", { name: "Ưu tiên của UDDD-3" })).toHaveText("Thấp");
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(page.getByRole("button", { name: "Ưu tiên của UDDD-2" })).toHaveText("Khẩn cấp");
  await expect(page.getByRole("button", { name: "Ưu tiên của UDDD-3" })).toHaveText("Trung bình");
  await bar.getByRole("button", { name: "Xóa" }).click();
  await expect(rows).toHaveCount(1);
  await expect(bar).toHaveCount(0);
  await page.getByRole("button", { name: "Hoàn tác" }).last().click();
  await expect(rows).toHaveCount(3);

  await page.getByRole("combobox", { name: "Kiểu xem" }).click();
  await page.getByRole("option", { name: "Bảng" }).click();
  await expect(page).toHaveURL(/view=board/);
  await expect(page.getByRole("region", { name: "Cần làm, 1 việc" })).toContainText("Thông báo đẩy");
  const card = page.locator("#task-UDDD-2");
  await card.focus();
  await page.keyboard.press("Space");
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("region", { name: "Đang làm, 2 việc" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByRole("region", { name: "Đang làm, 2 việc" })).toContainText("Thông báo đẩy");

  await page.reload();
  await expect(page.getByRole("region", { name: "Hoàn thành, 1 việc" })).toContainText("Màn hình đăng nhập");
  await page.goto("/projects");
  await expect(page.getByRole("row", { name: /Ứng dụng di động/ })).toContainText("1/3 việc xong");
});
