import { expect, test } from "@playwright/test";

test.describe("Proteksi Admin (AC-ADM-01)", () => {
  for (const path of ["/admin", "/admin/makam", "/admin/makam/tambah", "/admin/verifikasi", "/admin/denah", "/admin/pengaturan"]) {
    test(`tanpa sesi ${path} dialihkan ke login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(page.getByRole("heading", { name: "Login Admin" })).toBeVisible();
    });
  }

  test("export CSV tidak dapat diakses tanpa sesi", async ({ request }) => {
    const res = await request.get("/admin/makam/export", { maxRedirects: 0 });
    expect([307, 401]).toContain(res.status());
  });

  test("form login: label jelas, validasi pesan sederhana", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });
});
