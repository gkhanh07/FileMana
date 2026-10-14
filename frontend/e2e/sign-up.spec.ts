import { expect, test, type Page } from "@playwright/test";

// The sign-in and sign-up pages both stay mounted (one hidden), so only the visible form counts.
const form = (page: Page) => page.locator("form").filter({ visible: true });

async function signUp(page: Page, email: string, name: string) {
  // Right after the link click the sign-in form is still the visible one.
  await expect(form(page).getByRole("button", { name: "Đăng ký" })).toBeVisible();
  await form(page).getByLabel("Email").fill(email);
  await form(page).getByLabel("Tên").fill(name);
  await form(page).getByLabel("Mật khẩu").fill("first-password-1");
  await form(page).getByRole("button", { name: "Đăng ký" }).click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Tài khoản" }).click();
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
}

// FR-AUTH-03, FR-SET-06, FR-AUTH-02. Two fresh accounts sign up, so the suite's sign-in
// rate limit (20 a minute) is spent only once here.
test("sign up from sign-in, then another member resets the password", async ({ page }) => {
  const run = Date.now();
  const lan = `lan-${run}@filemana.test`;
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Đăng ký" }).click();
  await signUp(page, lan, "Lan");
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, Lan$/ })).toBeVisible();
  await signOut(page);

  // The email is now taken.
  await page.getByRole("link", { name: "Đăng ký" }).click();
  await signUp(page, lan, "Lan");
  await expect(page.getByText("Email này đã có tài khoản. Hãy đăng nhập.")).toBeVisible();

  await signUp(page, `minh-${run}@filemana.test`, "Minh");
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, Minh$/ })).toBeVisible();
  await page.goto("/members");
  const row = page.getByRole("row").filter({ hasText: lan });
  await expect(row).toContainText("Đang hoạt động");
  await expect(page.getByRole("row").filter({ hasText: `minh-${run}` }).getByRole("button")).toHaveCount(0);
  await row.getByRole("button", { name: "Đặt lại mật khẩu Lan" }).click();
  await page.getByRole("dialog").getByLabel("Mật khẩu tạm").fill("temporary-123");
  await page.getByRole("dialog").getByRole("button", { name: "Đặt mật khẩu tạm" }).click();
  await expect(page.getByText("Đã đặt mật khẩu tạm cho Lan.")).toBeVisible();
  await signOut(page);

  await form(page).getByLabel("Email").fill(lan);
  await form(page).getByLabel("Mật khẩu", { exact: true }).fill("temporary-123");
  await form(page).getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { name: /^Chào buổi .+, Lan$/ })).toBeVisible();
});
