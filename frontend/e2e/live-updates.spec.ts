import { expect, test, type Browser } from "@playwright/test";

const API = "http://localhost:3101";

async function signIn(browser: Browser, email: string, password: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi / })).toBeVisible();
  return page;
}

test("other people's changes show up without a reload", async ({ browser }) => {
  const a = await signIn(browser, "e2e@filemana.test", "e2e-password-123");
  const member = (await (
    await a.request.post(`${API}/members`, {
      data: { email: "watcher@filemana.test", name: "Watcher", password: "watcher-password-1" },
    })
  ).json()) as { id: string };
  const project = (await (
    await a.request.post(`${API}/projects`, { data: { name: "Trực tiếp e2e", key: "LIVE" } })
  ).json()) as { id: string };
  const task = (await (
    await a.request.post(`${API}/tasks`, { data: { projectId: project.id, title: "Việc đầu" } })
  ).json()) as { id: string; key: string };

  const b = await signIn(browser, "watcher@filemana.test", "watcher-password-1");
  const live = { timeout: 5000 };

  await b.goto(`/projects/${project.id}/tasks`);
  await expect(b.locator("main li[id^=task-]")).toHaveCount(1);
  await a.request.post(`${API}/tasks`, { data: { projectId: project.id, title: "Việc thứ hai" } });
  await expect(b.locator("main")).toContainText("Việc thứ hai", live);

  await b.goto(`/projects/${project.id}/tasks?task=${task.key}`);
  const title = b.getByRole("complementary", { name: `Chi tiết ${task.key}` }).getByLabel("Tên công việc");
  await expect(title).toHaveValue("Việc đầu");
  await a.request.patch(`${API}/tasks/${task.id}`, { data: { title: "Việc đầu đã sửa" } });
  await expect(title).toHaveValue("Việc đầu đã sửa", live);

  await b.goto("/members");
  await expect(b.getByRole("row").filter({ hasText: "watcher@filemana.test" })).toBeVisible();
  await a.request.patch(`${API}/members/${member.id}`, {
    data: { email: "watcher@filemana.test", name: "Watcher Renamed" },
  });
  await expect(b.getByRole("row").filter({ hasText: "watcher@filemana.test" })).toContainText("Watcher Renamed", live);

  await a.request.delete(`${API}/projects/${project.id}`, { data: { name: "Trực tiếp e2e" } });
});
