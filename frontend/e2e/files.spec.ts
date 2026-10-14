import { expect, test, type Page } from "@playwright/test";

const EMAIL = "e2e@filemana.test";
const PASSWORD = "e2e-password-123";
const API = "http://localhost:3101";

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();
});

async function uploadVia(page: Page, button: string, name: string, text: string) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: button }).click();
  await (await chooser).setFiles({ name, mimeType: "text/plain", buffer: Buffer.from(text) });
}

// FR-FILE-01, 07: the Docs & Files page holds anyone's folders at its top level, and no project folders.
test("Docs & Files page: add and delete a top-level folder", async ({ page }) => {
  await page.goto("/docs");
  await expect(page.getByRole("heading", { name: "Tài liệu & tệp", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Chung" })).toHaveCount(0);
  await page.getByRole("button", { name: "Thư mục mới" }).click();
  await page.getByRole("dialog").getByLabel("Tên thư mục").fill("Quy trình");
  await page.getByRole("dialog").getByRole("button", { name: "Thư mục mới" }).click();
  const folder = page.getByRole("link", { name: "Quy trình" });
  await folder.click();
  await page.getByRole("navigation", { name: "Tài liệu" }).getByRole("link", { name: "Tài liệu & tệp" }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await page.getByRole("button", { name: "Thao tác với Quy trình" }).click();
  await page.getByRole("menuitem", { name: "Xóa" }).click();
  await expect(folder).toHaveCount(0);
});

// FR-FILE-01..08, 12..14, FR-TASK-18, FR-ROLE-04
test("folders, upload, preview, rename, delete with undo and task attachments", async ({ page }) => {
  await page.getByRole("button", { name: "Tạo mới" }).click();
  await page.getByRole("menuitem", { name: "Dự án" }).click();
  await page.getByRole("dialog").getByLabel("Tên dự án").fill("Kho tài liệu");
  await page.getByRole("dialog").getByRole("button", { name: "Tạo dự án" }).click();
  await expect(page.getByRole("heading", { name: "Kho tài liệu" })).toBeVisible();
  await page.getByRole("link", { name: "Tài liệu & tệp" }).click();
  await expect(page.getByText("Kéo tệp vào đây để tải lên.")).toBeVisible();
  const files = page.url();

  // A nested folder with a breadcrumb back to the project folder.
  await page.getByRole("button", { name: "Thư mục mới" }).click();
  await page.getByRole("dialog").getByLabel("Tên thư mục").fill("Hình ảnh");
  await page.getByRole("dialog").getByRole("button", { name: "Thư mục mới" }).click();
  await page.getByRole("link", { name: "Hình ảnh" }).click();
  const crumbs = page.getByRole("navigation", { name: "Tài liệu" });
  await expect(crumbs).toContainText("Kho tài liệu");
  await crumbs.getByRole("link", { name: "Kho tài liệu" }).click();
  // Next keeps the previous route mounted but hidden; wait for the parent folder before acting.
  await expect(page.getByRole("link", { name: "Hình ảnh" })).toBeVisible();

  // Upload shows progress, then the file lists and previews as text with its info panel.
  await uploadVia(page, "Tải lên", "ghi-chu.txt", "Xin chào thế giới");
  await expect(page.getByRole("region", { name: "Tải tệp lên" })).toContainText("Đã tải lên");
  await page.getByRole("link", { name: "ghi-chu.txt" }).click();
  await expect(page.getByRole("region", { name: "Xem trước" })).toContainText("Xin chào thế giới");
  await expect(page.getByRole("complementary", { name: "Thông tin tệp" })).toContainText("Kho tài liệu");
  await page.goto(files);

  // Filters.
  await page.getByRole("button", { name: "Tệp", exact: true }).click();
  await expect(page.getByRole("link", { name: "Hình ảnh" })).toHaveCount(0);
  await page.getByRole("button", { name: "Tất cả" }).click();

  // Rename from the "…" menu.
  await page.getByRole("button", { name: "Thao tác với ghi-chu.txt" }).click();
  await page.getByRole("menuitem", { name: "Đổi tên" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("ghi-chu-moi.txt");
  await page.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();
  const renamed = page.getByRole("link", { name: "ghi-chu-moi.txt" });
  await expect(renamed).toBeVisible();

  // Delete goes to Trash; Undo brings it back.
  await page.getByRole("button", { name: "Thao tác với ghi-chu-moi.txt" }).click();
  await page.getByRole("menuitem", { name: "Xóa" }).click();
  await expect(renamed).toHaveCount(0);
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(renamed).toBeVisible();

  // A task attachment lands in the project's folder.
  await page.goto(files.replace(/\/files$/, "/tasks"));
  await page.getByRole("button", { name: "Thêm việc đầu tiên" }).click();
  const add = page.getByRole("textbox", { name: "Thêm việc" });
  await add.fill("Thiết kế bìa");
  await add.press("Enter");
  await add.press("Escape");
  await page.locator("main li[id^=task-]").getByRole("button", { name: "Thiết kế bìa" }).click();
  await uploadVia(page, "Đính kèm tệp", "bia.txt", "bìa");
  await expect(page.getByRole("region", { name: "Tệp đính kèm" }).getByText("bia.txt")).toBeVisible();
  await page.goto(files);
  await expect(page.getByRole("link", { name: "bia.txt" })).toBeVisible();

  // Other specs expect no open projects.
  const projectId = files.match(/projects\/([^/]+)\/files/)![1];
  expect((await page.request.delete(`${API}/projects/${projectId}`, { data: { name: "Kho tài liệu" } })).ok()).toBe(true);
});
