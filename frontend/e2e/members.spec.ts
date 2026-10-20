import { expect, test } from "@playwright/test";

const API = "http://localhost:3101";

test("deactivate a member, hand over their tasks, then reactivate them", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("e2e@filemana.test");
  await page.getByLabel("Mật khẩu").fill("e2e-password-123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();

  const member = (await (
    await page.request.post(`${API}/members`, {
      data: { email: "leaver@filemana.test", name: "Leaver", password: "leaver-password-1" },
    })
  ).json()) as { id: string };
  const project = (await (
    await page.request.post(`${API}/projects`, { data: { name: "Bàn giao e2e", key: "BGIAO" } })
  ).json()) as { id: string };
  const task = (await (
    await page.request.post(`${API}/tasks`, {
      data: { projectId: project.id, title: "Việc bàn giao", assigneeId: member.id },
    })
  ).json()) as { key: string };

  await page.goto("/members");
  const row = page.getByRole("row").filter({ hasText: "leaver@filemana.test" });
  const menu = async (item: string) => {
    await page.getByRole("button", { name: "Thao tác với Leaver" }).click();
    await page.getByRole("menuitem", { name: item }).click();
  };
  await expect(row).toContainText("Đang hoạt động");

  await menu("Vô hiệu hóa");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("1 việc đang mở");
  await dialog.getByLabel("Người nhận 1 việc đang mở").click();
  await page.getByRole("option", { name: "E2E" }).click();
  await dialog.getByRole("button", { name: "Vô hiệu hóa" }).click();
  await expect(row).toContainText("Đã vô hiệu hóa");

  const handedOver = (await (await page.request.get(`${API}/tasks/${task.key}`)).json()) as {
    assignee: { name: string } | null;
  };
  expect(handedOver.assignee?.name).toBe("E2E");

  await menu("Kích hoạt lại");
  await page.getByRole("dialog").getByRole("button", { name: "Kích hoạt lại" }).click();
  await expect(row).toContainText("Đang hoạt động");

  expect(
    (await page.request.delete(`${API}/projects/${project.id}`, { data: { name: "Bàn giao e2e" } })).ok(),
  ).toBe(true);
});
