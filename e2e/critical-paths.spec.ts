import { expect, test } from "@playwright/test";

const authenticatedAccessToken = "e2e-authenticated-user-token";

function authenticatedSessionCookie() {
  const session = {
    access_token: authenticatedAccessToken,
    refresh_token: "e2e-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    expires_in: 60 * 60,
    token_type: "bearer",
    user: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      aud: "authenticated",
      role: "authenticated",
      email: "authenticated@example.test",
    },
  };

  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

test("landing page presents the product and reaches account creation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Nakshatra - One Digital Wedding Portfolio");
  await expect(page.getByRole("heading", { name: /your wedding story, clearly together/i })).toBeVisible();
  const primaryCta = page.locator(".site-hero-v2").getByRole("link", { name: /create your portfolio/i });
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
  await page.getByRole("button", { name: /email me a sign-in link/i }).click();
  await expect(page.getByRole("heading", { name: /check your inbox/i })).toBeVisible();
  await expect(page.getByText("person@example.com", { exact: true })).toBeVisible();
});

test("unauthenticated owners are redirected away from protected screens", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: /sign in to nakshatra/i })).toBeVisible();

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?redirect=%2Faccount/);
  await expect(page.getByRole("heading", { name: /sign in to nakshatra/i })).toBeVisible();
});

test("landing page remains usable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.locator(".site-hero-v2");
  await expect(hero.getByRole("link", { name: /create your portfolio/i })).toBeVisible();
  await expect(hero.getByRole("link", { name: /see what families receive/i })).toBeVisible();
});

test("public portfolio renders sanitized data and adaptive media", async ({ page }) => {
  await page.goto("/p/e2e-portfolio-token");

  await expect(page.getByRole("heading", { name: "Aditi Rao" })).toBeVisible();
  await expect(page.getByText(/Family information exists and can be requested/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "More can be shared after approval." })).toBeVisible();
  await expect(page.getByText("Direct contact", { exact: true })).toBeVisible();
  await expect(page.getByText("Ramesh Rao", { exact: true })).toHaveCount(0);
  await expect(page.getByText("family@example.com", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in to show interest" })).toHaveAttribute(
    "href",
    "/login?redirect=%2Fp%2Fe2e-portfolio-token"
  );

  const hero = page.locator('.portfolio-hero-media[data-orientation="portrait"]');
  await expect(hero).toBeVisible();
  await expect(hero.getByAltText("Public portrait")).toBeVisible();
  await expect
    .poll(async () => {
      const bounds = await page.locator(".portfolio-primary-photo").evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });

      if (bounds.height === 0) return null;
      return Number((bounds.width / bounds.height).toFixed(2));
    })
    .toBe(0.75);
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
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(privacyControl).toBeFocused();
  await expect(privacyControl).toHaveCSS("outline-width", "2px");

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

test("interest popup stays in view and keeps extra details optional", async ({ page }) => {
  // This mirrors the Supabase SSR cookie format used by the configured
  // http://127.0.0.1:54329 E2E project, whose default storage key is
  // sb-127-auth-token. The mock accepts only this synthetic access token.
  await page.context().addCookies([{
    name: "sb-127-auth-token",
    value: authenticatedSessionCookie(),
    url: "http://127.0.0.1:3100",
  }]);
  await page.goto("/p/e2e-portfolio-token");
  await page.getByRole("button", { name: "Show interest" }).click();

  const dialog = page.getByRole("dialog", { name: /introduce yourself/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Your full name")).toHaveAttribute("required", "");
  await expect(dialog.getByLabel("Contacting for")).toHaveAttribute("required", "");
  await expect(dialog.getByLabel("Phone number")).toHaveAttribute("required", "");
  await expect(dialog.getByLabel("Email address")).toHaveAttribute("required", "");

  const bounds = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewport: window.innerHeight };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewport + 1);

  await dialog.getByText("Add more details").click();
  await expect(dialog.getByLabel("Country")).not.toHaveAttribute("required", "");
  await expect(dialog.getByLabel("State or province")).not.toHaveAttribute("required", "");
  await expect(dialog.getByLabel("City")).not.toHaveAttribute("required", "");
  const optionalLayout = await dialog.locator(".interest-optional").evaluate((element) => ({
    open: element.hasAttribute("open"),
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(optionalLayout.open).toBe(true);
  expect(optionalLayout.scrollHeight).toBeLessThanOrEqual(optionalLayout.clientHeight + 1);
  await expect(dialog.getByRole("button", { name: "Send interest" })).toBeVisible();
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
