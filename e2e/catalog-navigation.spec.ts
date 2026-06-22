import { test, expect } from "@playwright/test";
import {
  clickLoadMore,
  getResultsCountText,
  getScrollY,
  getVisibleCardCount,
  openMobileFiltersIfNeeded,
  openProductByName,
  scrollCatalogDown,
  waitForCatalogReady,
  waitForCatalogScroll,
} from "./fixtures/catalog";

test.describe("Catalog navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/catalog");
    await waitForCatalogReady(page);
  });

  test("loadMore_andReturn", async ({ page }) => {
    await page.goto("/catalog?search=E2E");
    await waitForCatalogReady(page);

    const loadMore = page.getByTestId("catalog-load-more");
    if (!(await loadMore.isVisible().catch(() => false))) {
      test.skip(true, "Need >20 products — run node scripts/seed-e2e-catalog.js");
    }

    const countBeforeLoadMore = await getVisibleCardCount(page);
    const totalTextBefore = await getResultsCountText(page);

    await clickLoadMore(page);
    await waitForCatalogReady(page);

    const countAfterLoadMore = await getVisibleCardCount(page);
    expect(countAfterLoadMore).toBeGreaterThan(countBeforeLoadMore);

    await scrollCatalogDown(page, 800);
    const scrollBeforeLeave = await getScrollY(page);
    expect(scrollBeforeLeave).toBeGreaterThan(200);

    await openProductByName(page, "E2E-PRODUCT-ALPHA");
    await page.getByTestId("product-back-to-catalog").click();
    await waitForCatalogReady(page);
    await waitForCatalogScroll(page, 150);

    const countAfterReturn = await getVisibleCardCount(page);
    expect(countAfterReturn).toBeGreaterThanOrEqual(countAfterLoadMore);

    const scrollAfterReturn = await getScrollY(page);
    expect(scrollAfterReturn).toBeGreaterThan(150);

    const totalTextAfter = await getResultsCountText(page);
    expect(totalTextAfter).toContain(totalTextBefore.split(" из ")[1] || "");
  });

  test("filterAfterReturn", async ({ page }) => {
    await page.goto("/catalog?search=E2E");
    await waitForCatalogReady(page);

    const loadMore = page.getByTestId("catalog-load-more");
    if (await loadMore.isVisible().catch(() => false)) {
      await clickLoadMore(page);
      await waitForCatalogReady(page);
    }

    await scrollCatalogDown(page, 400);
    await openProductByName(page, "E2E-PRODUCT-ALPHA");
    await page.getByTestId("product-back-to-catalog").click();
    await waitForCatalogReady(page);

    const countBeforeFilter = await getVisibleCardCount(page);

    await openMobileFiltersIfNeeded(page);
    await page.locator('[data-testid="catalog-filter-on-sale"]:visible').check();
    await page.waitForTimeout(400);
    await waitForCatalogReady(page);

    const countAfterFilter = await getVisibleCardCount(page);
    expect(countAfterFilter).toBeLessThanOrEqual(countBeforeFilter);

    const scrollAfterFilter = await getScrollY(page);
    expect(scrollAfterFilter).toBeLessThan(50);
  });

  test("vitrineSwitch", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop-only: sidebar filters");

    await page.goto("/catalog/dveri-mezhkomnatnyye");
    await waitForCatalogReady(page);

    const cardsBefore = await getVisibleCardCount(page);

    const colorFilter = page
      .getByTestId("catalog-filter-attr-color")
      .filter({ has: page.locator('[data-filter-value="Белый"]') })
      .first();
    if (await colorFilter.isVisible().catch(() => false)) {
      await colorFilter.check();
      await waitForCatalogReady(page);
    }

    const entryTab = page.getByTestId("catalog-vitrine-tab").filter({ hasText: "Входные двери" });
    if (await entryTab.isVisible().catch(() => false)) {
      await entryTab.click();
      await page.waitForURL(/\/catalog\/vhodnye-dveri/);
    } else {
      await page.goto("/catalog/vhodnye-dveri");
    }
    await waitForCatalogReady(page);

    expect(page.url()).toContain("/catalog/vhodnye-dveri");
    await expect(page.getByTestId("catalog-filter-on-sale")).not.toBeChecked();

    const cardsAfter = await getVisibleCardCount(page);
    expect(cardsAfter).toBeGreaterThan(0);
    if (cardsBefore > 0 && await colorFilter.isVisible().catch(() => false)) {
      expect(cardsAfter).not.toBe(cardsBefore);
    }
  });

  test("catalogNavFromHome", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Каталог" }).first().click();
    await page.waitForURL(/\/catalog/);
    await waitForCatalogReady(page);
    await expect(page.getByTestId("catalog-product-grid")).toBeVisible();
  });

  test("activeFilterChips", async ({ page, isMobile }) => {
    await page.goto("/catalog?onSale=1");
    await waitForCatalogReady(page);

    const saleChip = page.getByTestId("catalog-active-filter-chip").filter({ hasText: "Акции" });
    await expect(saleChip).toBeVisible();
    await saleChip.click();
    await expect(page.getByTestId("catalog-active-filter-chip").filter({ hasText: "Акции" })).toHaveCount(0);
    await expect(page).not.toHaveURL(/onSale=1/);

    if (isMobile) return;

    const blue = page
      .getByTestId("catalog-filter-attr-color")
      .filter({ has: page.locator('[data-filter-value="E2E-Синий"]') });
    if ((await blue.count()) === 0) {
      test.skip(true, "E2E color filters missing — run seed-e2e-catalog.js");
    }

    await blue.first().check();
    await waitForCatalogReady(page);

    const colorChip = page.getByTestId("catalog-active-filter-chip").filter({ hasText: "E2E-Синий" });
    await expect(colorChip).toBeVisible();
    await colorChip.click();
    await expect(page.getByTestId("catalog-active-filter-chip").filter({ hasText: "E2E-Синий" })).toHaveCount(0);
  });

  test("vitrineTabMemory", async ({ page }) => {
    await page.goto("/catalog/furnitura");
    await waitForCatalogReady(page);
    await page.waitForFunction(() => sessionStorage.getItem("lastCatalogPage") === "furnitura");
    await page.goto("/");
    await page.waitForURL("/");

    const lastPage = await page.evaluate(() => sessionStorage.getItem("lastCatalogPage"));
    expect(lastPage).toBe("furnitura");
  });

  test("filterRace", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop-only: attribute filters");

    await page.goto("/catalog");
    await waitForCatalogReady(page);

    const blue = page
      .getByTestId("catalog-filter-attr-color")
      .filter({ has: page.locator('[data-filter-value="E2E-Синий"]') });
    const green = page
      .getByTestId("catalog-filter-attr-color")
      .filter({ has: page.locator('[data-filter-value="E2E-Зелёный"]') });

    if ((await blue.count()) === 0) {
      test.skip(true, "E2E color filters missing — run seed-e2e-catalog.js");
    }

    await openMobileFiltersIfNeeded(page);
    await blue.first().check();
    await green.first().check();
    await waitForCatalogReady(page);

    const names = await page.getByTestId("catalog-product-card").allTextContents();
    expect(names.length).toBeGreaterThan(0);
    for (const text of names) {
      expect(text).toMatch(/E2E-Зелёный|Зелёный/i);
    }
  });

  test("deepLinkIgnoresStaleStorage", async ({ page }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem(
        "catalogReturn",
        JSON.stringify({
          catalogPage: "all",
          scrollY: 9999,
          loadedPages: 5,
          searchKey: "stale=1",
          returnHref: "/catalog",
        }),
      );
      window.sessionStorage.setItem(
        "catalogScroll",
        JSON.stringify({
          catalogPage: "all",
          scrollY: 9999,
          loadedPages: 5,
        }),
      );
    });

    await page.goto("/catalog?onSale=1");
    await waitForCatalogReady(page);

    await expect(page.getByTestId("catalog-filter-on-sale")).toBeChecked();
    const scrollY = await getScrollY(page);
    expect(scrollY).toBeLessThan(100);
  });
});
