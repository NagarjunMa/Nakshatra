import { expect, test } from "@playwright/test";

test("landing page presents the product and reaches account creation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Nakshatra.*Wedding Biodata/i);
  await expect(page.getByRole("heading", { name: "Nakshatra", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /wedding biodata.*designs itself/i })).toBeVisible();
  await page.locator("[data-hero-cta]").click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: /create your biodata/i })).toBeVisible();
});

test("sign-in form preserves a safe post-auth destination", async ({ page }) => {
  await page.goto("/login?redirect=%2Fedit");
  await expect(page.getByRole("heading", { name: /sign in to nakshatra/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in with google/i })).toBeEnabled();
  await expect(page.getByRole("button", { name: /email me a sign-in link/i })).toBeEnabled();
  await page.getByLabel(/email/i).fill("person@example.com");
  await expect(page.getByLabel(/email/i)).toHaveValue("person@example.com");
});

test("unauthenticated owners are redirected away from protected screens", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: /sign in to nakshatra/i })).toBeVisible();
});

test("landing page remains usable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-hero-cta]")).toBeVisible();
  await expect(page.getByRole("link", { name: /see a sample/i })).toBeVisible();
});
