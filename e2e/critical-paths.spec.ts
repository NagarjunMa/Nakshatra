import { expect, test } from "@playwright/test";

test("landing page presents the product and reaches account creation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Nakshatra - Digital Marriage Portfolio");
  await expect(page.getByRole("heading", { name: /create and share your marriage portfolio in one clear link/i })).toBeVisible();
  const primaryCta = page.getByRole("main").getByRole("link", { name: /create my portfolio/i }).first();
  await expect(primaryCta).toHaveAttribute("href", "/signup");
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { name: /start your wedding portfolio/i })).toBeVisible();
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
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: /create my portfolio/i }).first()).toBeVisible();
  await expect(main.getByRole("link", { name: /view a sample portfolio/i })).toBeVisible();
});

test("public portfolio renders sanitized data and adaptive media", async ({ page }) => {
  await page.goto("/p/e2e-portfolio-token");

  await expect(page.getByRole("heading", { name: "Aditi Rao" })).toBeVisible();
  await expect(page.getByText(/Family information exists and can be requested/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "More can be shared after approval." })).toBeVisible();
  await expect(page.getByText("Direct contact", { exact: true })).toBeVisible();
  await expect(page.getByText("Ramesh Rao", { exact: true })).toHaveCount(0);
  await expect(page.getByText("family@example.com", { exact: true })).toHaveCount(0);

  const hero = page.locator('.portfolio-hero-media[data-orientation="portrait"]');
  await expect(hero).toBeVisible();
  await expect(hero.getByAltText("Public portrait")).toBeVisible();
  const heroFrame = await page.locator(".portfolio-primary-photo").evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return Number((bounds.width / bounds.height).toFixed(2));
  });
  expect(heroFrame).toBe(0.75);
  const gallery = page.locator(".portfolio-gallery");
  await expect(gallery.locator('.portfolio-gallery-feature img[data-orientation="landscape"]')).toBeVisible();
  await expect(gallery.getByAltText("Public landscape", { exact: true })).toBeVisible();
  await expect(gallery.locator(".portfolio-gallery-thumbnail")).toHaveCount(7);
  await expect(gallery.locator('.portfolio-gallery-thumbnail:not([data-presentation="blurred"])')).toHaveCount(6);
  await expect(gallery.locator('.portfolio-gallery-thumbnail[data-presentation="blurred"]')).toHaveCount(1);
  await expect(gallery.getByRole("button", { name: "Photo 7, shared after approval" })).toBeVisible();
  await expect(gallery.getByAltText("Protected portrait")).toHaveCount(0);
  const galleryColumns = await gallery.locator(".portfolio-gallery-viewer").evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length
  );
  expect(galleryColumns).toBe((page.viewportSize()?.width || 0) <= 720 ? 1 : 2);
  const galleryBeforePreferences = await gallery.evaluate((galleryElement) => {
    const preferences = document.querySelector("#preferences");
    return Boolean(preferences && (galleryElement.compareDocumentPosition(preferences) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(galleryBeforePreferences).toBe(true);
  await expect(page.locator("#preferences")).toBeVisible();
  await expect(page.locator("#shared-life")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show next photo" })).toHaveCount(0);
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
      background: styles.getPropertyValue("--portfolio-background").trim(),
      primary: styles.getPropertyValue("--portfolio-primary").trim(),
      teal: styles.getPropertyValue("--portfolio-teal").trim(),
      gold: styles.getPropertyValue("--portfolio-gold").trim(),
    };
  });
  expect(accents).toEqual({
    background: "#f7f5ef",
    primary: "#213f59",
    teal: "#477b77",
    gold: "#8f6628",
  });

  const privacyControl = page.locator(".portfolio-brand");
  await privacyControl.focus();
  await expect(privacyControl).toBeFocused();
  expect(
    await privacyControl.evaluate((element) => getComputedStyle(element).outlineWidth)
  ).toBe("2px");

  if ((page.viewportSize()?.width || 0) >= 900) {
    const chapterStyles = await page.locator(".portfolio-chapter").first().evaluate((element) => {
      const styles = getComputedStyle(element);
      return { display: styles.display, columns: styles.gridTemplateColumns.split(" ").length };
    });
    expect(chapterStyles).toEqual({ display: "grid", columns: 3 });

    const pairedStyles = await page.locator(".portfolio-chapter-pair").first().evaluate((element) => {
      const styles = getComputedStyle(element);
      return { display: styles.display, columns: styles.gridTemplateColumns.split(" ").length };
    });
    expect(pairedStyles).toEqual({ display: "grid", columns: 2 });
    await expect(page.locator(".portfolio-chapter-pair")).toHaveCount(2);

    const futureChapterStyles = await page.locator("#preferences, #shared-life").evaluateAll((elements) =>
      elements.map((element) => {
        const styles = getComputedStyle(element);
        const copy = element.querySelector(".portfolio-long-copy");
        return {
          display: styles.display,
          columns: styles.gridTemplateColumns.split(" ").length,
          copySize: copy ? Number.parseFloat(getComputedStyle(copy).fontSize) : 0,
        };
      })
    );
    expect(futureChapterStyles).toEqual([
      { display: "grid", columns: 3, copySize: 17 },
      { display: "grid", columns: 3, copySize: 17 },
    ]);
  } else {
    await expect(page.locator(".portfolio-chapter-pair").first()).toHaveCSS("display", "block");
    const futureChapterStyles = await page.locator("#preferences, #shared-life").evaluateAll((elements) =>
      elements.map((element) => ({
        display: getComputedStyle(element).display,
        columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
      }))
    );
    expect(futureChapterStyles).toEqual([
      { display: "grid", columns: 1 },
      { display: "grid", columns: 1 },
    ]);
  }
});

test("Private portfolio keeps one gallery photo clear and safely blurs the rest", async ({ page }) => {
  await page.goto("/p/e2e-private-token");

  await expect(page.locator('.portfolio-root[data-privacy-mode="private"]')).toBeVisible();
  const gallery = page.locator(".portfolio-gallery");
  await expect(gallery.locator(".portfolio-gallery-thumbnail")).toHaveCount(7);
  await expect(gallery.locator('.portfolio-gallery-thumbnail:not([data-presentation="blurred"])')).toHaveCount(1);
  await expect(gallery.locator('.portfolio-gallery-thumbnail[data-presentation="blurred"]')).toHaveCount(6);
  await expect(gallery.locator('.portfolio-gallery-feature[data-presentation="clear"]')).toBeVisible();
});
