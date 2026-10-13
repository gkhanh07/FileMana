import { expect, test } from "@playwright/test";

const EMAIL = "e2e@filemana.test";
const PASSWORD = "e2e-password-123";
const API = "http://localhost:3101";

// "2026-10-13" in the workspace's default timezone, `offset` days from today.
const day = (offset: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(Date.now() + offset * 86_400_000));

test.beforeEach(async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();
});

// FR-HOME-01..07, FR-MY-01..04
test("Home and My Tasks show my tasks; ticking one sets Done with Undo", async ({ page }) => {
  const project = await (
    await page.request.post(`${API}/projects`, { data: { name: "Trang chủ e2e", key: "HOME", status: "ACTIVE" } })
  ).json();
  for (const [title, dueDate] of [
    ["Việc quá hạn", day(-1)],
    ["Việc hôm nay", day(0)],
    ["Việc tuần này", day(3)],
    ["Việc không hạn", null],
  ] as const) {
    expect((await page.request.post(`${API}/tasks`, { data: { projectId: project.id, title, dueDate } })).ok()).toBe(true);
  }

  // Home: overdue, today and the next 7 days only; the running project on the right.
  await page.reload();
  // The page we came from stays in the DOM, hidden.
  const main = page.locator("main:visible");
  await expect(main.getByRole("region", { name: /^Quá hạn/ })).toContainText("Việc quá hạn");
  await expect(main.getByRole("region", { name: /^Hôm nay/ })).toContainText("Việc hôm nay");
  await expect(main.getByRole("region", { name: /^7 ngày tới/ })).toContainText("Việc tuần này");
  await expect(main).not.toContainText("Việc không hạn");
  await expect(main.getByRole("region", { name: "Dự án đang chạy" })).toContainText("Trang chủ e2e");

  // Ticking sets Done and stays visible; Undo puts it back.
  const tick = main.getByRole("checkbox", { name: "Hoàn thành HOME-2" });
  await tick.click();
  await expect(page.getByText("Đã hoàn thành HOME-2.")).toBeVisible();
  await expect(tick).toBeChecked();
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await expect(tick).not.toBeChecked();

  // A row opens the panel on the same page.
  await main.getByText("Việc quá hạn").click();
  await expect(page.getByRole("complementary", { name: "Chi tiết HOME-1" })).toBeVisible();
  await page.keyboard.press("Escape");

  // My Tasks: every group, Done hidden until asked for.
  await page.getByRole("link", { name: "Việc của tôi" }).first().click();
  await expect(page.getByRole("heading", { name: "Việc của tôi" })).toBeVisible();
  await expect(main.getByRole("region", { name: /^Không có hạn/ })).toContainText("Việc không hạn");
  await main.getByRole("checkbox", { name: "Hoàn thành HOME-4" }).click();
  await expect(main).not.toContainText("Việc không hạn");
  await main.getByLabel("Hiện việc đã xong").click();
  await expect(main).toContainText("Việc không hạn");

  // Group by project; filter by priority.
  await main.getByRole("combobox", { name: "Nhóm theo" }).click();
  await page.getByRole("option", { name: "Dự án" }).click();
  await expect(main.getByRole("region", { name: /^Trang chủ e2e/ })).toBeVisible();
  await main.getByRole("combobox", { name: "Ưu tiên" }).click();
  await page.getByRole("option", { name: "Khẩn cấp" }).click();
  await expect(main.getByText("Không có công việc nào khớp bộ lọc.")).toBeVisible();

  // Other specs expect no open projects.
  expect((await page.request.delete(`${API}/projects/${project.id}`, { data: { name: "Trang chủ e2e" } })).ok()).toBe(true);
});
