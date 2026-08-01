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

test("public portfolio renders sanitized data and adaptive media", async ({ page }) => {
  await page.goto("/p/e2e-portfolio-token");

  await expect(page.getByRole("heading", { name: "Aditi Rao" })).toBeVisible();
  await expect(page.getByText("Family details are shared after approval")).toBeVisible();
  await expect(page.getByText("Contact details are shared after approval")).toBeVisible();
  await expect(page.getByText("Ramesh Rao", { exact: true })).toHaveCount(0);
  await expect(page.getByText("family@example.com", { exact: true })).toHaveCount(0);

  const hero = page.locator('.portfolio-hero-media[data-orientation="portrait"]');
  await expect(hero).toBeVisible();
  await expect(hero.getByAltText("Public portrait")).toBeVisible();
  await expect(page.locator('.portfolio-gallery-item[data-orientation="landscape"]')).toBeVisible();
  await expect(page.getByAltText("Public landscape")).toBeVisible();

  await page.getByRole("button", { name: "Show next photo" }).click();
  await expect(page.getByText("2 / 2")).toBeVisible();
});

test("public portfolio exposes production-ready metadata and distinct accent roles", async ({ page }) => {
  await page.goto("/p/e2e-portfolio-token");

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "http://127.0.0.1:3100/p/e2e-portfolio-token/opengraph-image"
  );

  const accents = await page.locator(".portfolio-root").evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      surface: styles.getPropertyValue("--portfolio-accent").trim(),
      hero: styles.getPropertyValue("--portfolio-hero-accent").trim(),
    };
  });
  expect(accents).toEqual({ surface: "#17151c", hero: "#688db1" });

  const nextButton = page.getByRole("button", { name: "Show next photo" });
  await nextButton.focus();
  await expect(nextButton).toBeFocused();
  expect(
    await nextButton.evaluate((element) => getComputedStyle(element).outlineWidth)
  ).toBe("2px");

  if ((page.viewportSize()?.width || 0) >= 900) {
    const stickyStyles = await page.locator(".portfolio-facts-column").evaluate((element) => {
      const styles = getComputedStyle(element);
      return { position: styles.position, alignSelf: styles.alignSelf };
    });
    expect(stickyStyles).toEqual({ position: "sticky", alignSelf: "start" });
  }
});
