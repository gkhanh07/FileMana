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

// FR-TASK-13..17, 19, FR-SHELL-07, FR-ROLE-04
test("open a task in the panel, edit it, add subtasks, delete and undo", async ({ page }) => {
  await page.getByRole("button", { name: "Tạo mới" }).click();
  await page.getByRole("menuitem", { name: "Dự án" }).click();
  await page.getByRole("dialog").getByLabel("Tên dự án").fill("Bảng tin nội bộ");
  await page.getByRole("dialog").getByRole("button", { name: "Tạo dự án" }).click();
  await expect(page.getByRole("heading", { name: "Bảng tin nội bộ" })).toBeVisible();
  await page.getByRole("link", { name: "Công việc" }).click();
  await page.getByRole("button", { name: "Thêm việc đầu tiên" }).click();
  const add = page.getByRole("textbox", { name: "Thêm việc" });
  await add.fill("Trang chủ");
  await add.press("Enter");
  const row = page.locator("main li[id^=task-]");
  await expect(row).toHaveCount(1);
  const key = (await row.getAttribute("id"))!.replace("task-", "");
  await add.press("Escape");

  // Clicking the title opens the panel and puts the key in the URL; a reload reopens it.
  await row.getByRole("button", { name: "Trang chủ" }).click();
  const panel = page.getByRole("complementary", { name: `Chi tiết ${key}` });
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`\\?task=${key}$`));
  await page.reload();
  await expect(panel).toBeVisible();

  // Title in place.
  const title = panel.getByLabel("Tên công việc");
  await title.fill("Trang chủ mới");
  await title.press("Enter");
  await expect(row).toContainText("Trang chủ mới");

  // Subtasks: inline add, then tick one off.
  const sub = panel.getByRole("textbox", { name: "Thêm việc con" });
  await sub.fill("Ảnh bìa");
  await sub.press("Enter");
  await expect(panel.getByRole("region", { name: "Việc con" })).toContainText("0/1");
  await panel.getByRole("checkbox", { name: `Hoàn thành ${key.replace(/\d+$/, "2")}` }).click();
  await expect(panel.getByRole("region", { name: "Việc con" })).toContainText("1/1");
  // Subtasks stay inside their parent.
  await expect(row).toHaveCount(1);

  // Description autosaves and survives a reload.
  await panel.locator("[contenteditable=true]").click();
  await page.keyboard.type("Ghi chú cho thiết kế");
  await expect(panel.getByText("Đã lưu")).toBeVisible();
  await page.reload();
  await expect(panel.getByText("Ghi chú cho thiết kế")).toBeVisible();
  await panel.getByRole("tab", { name: "Hoạt động" }).click();
  await expect(panel.getByRole("region", { name: "Hoạt động" })).toContainText("đã sửa mô tả");

  // Esc closes.
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(page).not.toHaveURL(/task=/);

  // The full page.
  await page.goto(`/tasks/${key}`);
  await expect(page.getByLabel("Tên công việc")).toHaveValue("Trang chủ mới");

  // Delete goes to Trash; Undo brings it back.
  await page.getByRole("button", { name: "Thêm thao tác" }).click();
  await page.getByRole("menuitem", { name: "Xóa công việc" }).click();
  await expect(page.getByText(`Đã xóa ${key}.`)).toBeVisible();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(row).toHaveCount(1);
});

// FR-CMT-01, 02, 04, FR-TASK-01, 19
test("comment with a mention, edit it, delete and undo", async ({ page }) => {
  await page.getByRole("button", { name: "Tạo mới" }).click();
  await page.getByRole("menuitem", { name: "Dự án" }).click();
  await page.getByRole("dialog").getByLabel("Tên dự án").fill("Góp ý giao diện");
  await page.getByRole("dialog").getByRole("button", { name: "Tạo dự án" }).click();
  await expect(page.getByRole("heading", { name: "Góp ý giao diện" })).toBeVisible();
  await page.getByRole("link", { name: "Công việc" }).click();
  await page.getByRole("button", { name: "Thêm việc đầu tiên" }).click();
  const add = page.getByRole("textbox", { name: "Thêm việc" });
  await add.fill("Màu nút chính");
  await add.press("Enter");
  await add.press("Escape");
  const row = page.locator("main li[id^=task-]");
  await row.getByRole("button", { name: "Màu nút chính" }).click();
  const panel = page.getByRole("complementary", { name: /^Chi tiết / });
  await expect(panel.getByText("Chưa có bình luận nào.")).toBeVisible();

  // @ suggests people; Enter picks one, Ctrl+Enter sends.
  const box = panel.getByRole("combobox", { name: "Viết bình luận" });
  await box.pressSequentially("@e2");
  await expect(panel.getByRole("option", { name: "E2E" })).toBeVisible();
  await box.press("Enter");
  await box.pressSequentially("xem giúp màu này");
  await box.press("Control+Enter");
  const list = panel.getByRole("tabpanel", { name: "Bình luận" });
  await expect(list.getByRole("listitem")).toContainText("@E2E xem giúp màu này");
  await expect(box).toHaveValue("");
  await expect(row.getByLabel("1 bình luận")).toBeVisible();

  // Edit shows the label.
  await list.getByRole("button", { name: "Thao tác bình luận" }).click();
  await page.getByRole("menuitem", { name: "Sửa" }).click();
  await list.getByRole("combobox", { name: "Sửa" }).fill("Dùng màu xanh");
  await list.getByRole("button", { name: "Lưu" }).click();
  await expect(list).toContainText("Dùng màu xanh");
  await expect(list).toContainText("(đã sửa)");

  // Delete, then Undo.
  await list.getByRole("button", { name: "Thao tác bình luận" }).click();
  await page.getByRole("menuitem", { name: "Xóa" }).click();
  await expect(list.getByText("Chưa có bình luận nào.")).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(list).toContainText("Dùng màu xanh");
});
