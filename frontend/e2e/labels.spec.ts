import { expect, test } from "@playwright/test";

const API = "http://localhost:3101";

test("add, edit, merge and delete shared labels", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("e2e@filemana.test");
  await page.getByLabel("Mật khẩu").fill("e2e-password-123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, E2E$/ })).toBeVisible();

  const project = (await (
    await page.request.post(`${API}/projects`, {
      data: { name: "Nhãn e2e", key: "NHAN" },
    })
  ).json()) as { id: string };
  expect(
    (
      await page.request.post(`${API}/labels`, {
        data: { name: "E2E Target", color: "green" },
      })
    ).ok(),
  ).toBe(true);

  await page.goto("/settings");
  const section = page.getByRole("region", { name: "Nhãn" });
  const row = (name: string) => section.getByRole("listitem").filter({ hasText: name });
  const menu = async (name: string, item: string) => {
    await section.getByRole("button", { name: `Thao tác với nhãn ${name}` }).click();
    await page.getByRole("menuitem", { name: item }).click();
  };

  await section.getByRole("button", { name: "Thêm nhãn" }).click();
  await page.getByRole("dialog").getByLabel("Tên nhãn").fill("E2E Source");
  await page.getByRole("dialog").getByRole("button", { name: "Thêm nhãn" }).click();
  await expect(row("E2E Source")).toContainText("0 công việc");

  await menu("E2E Source", "Sửa");
  await page.getByRole("dialog").getByLabel("Tên nhãn").fill("E2E Renamed");
  const green = page.getByRole("radio", { name: "Màu 3" });
  await page.locator("label").filter({ has: green }).click();
  await expect(green).toBeChecked();
  await page.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();
  await expect(row("E2E Renamed")).toBeVisible();
  await menu("E2E Renamed", "Sửa");
  await expect(green).toBeChecked();
  await page.getByRole("dialog").getByRole("button", { name: "Hủy" }).click();

  const source = (
    (await (await page.request.get(`${API}/labels`)).json()) as {
      id: string;
      name: string;
    }[]
  ).find((l) => l.name === "E2E Renamed")!;
  expect(
    (
      await page.request.post(`${API}/tasks`, {
        data: {
          projectId: project.id,
          title: "Có nhãn",
          labelIds: [source.id],
        },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await expect(row("E2E Renamed")).toContainText("1 công việc");

  await menu("E2E Renamed", "Gộp vào…");
  await page.getByRole("dialog").getByLabel("Nhãn đích").click();
  await page.getByRole("option", { name: "E2E Target" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Gộp" }).click();
  await expect(row("E2E Renamed")).toHaveCount(0);
  await expect(row("E2E Target")).toContainText("1 công việc");

  await menu("E2E Target", "Xóa");
  await expect(page.getByRole("dialog")).toContainText("Nhãn sẽ bị gỡ khỏi 1 công việc");
  await page.getByRole("dialog").getByRole("button", { name: "Xóa" }).click();
  await expect(row("E2E Target")).toHaveCount(0);

  expect(
    (
      await page.request.delete(`${API}/projects/${project.id}`, {
        data: { name: "Nhãn e2e" },
      })
    ).ok(),
  ).toBe(true);
});
