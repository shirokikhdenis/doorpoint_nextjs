import type { Page } from "@playwright/test";

export async function waitForCatalogReady(page: Page) {
  await Promise.race([
    page.getByTestId("catalog-product-card").first().waitFor({ state: "visible", timeout: 30_000 }),
    page.getByText("По выбранным фильтрам ничего не найдено").waitFor({ state: "visible", timeout: 30_000 }),
  ]);
  await page.waitForFunction(
    () => document.documentElement.dataset.catalogHydrated === "true",
    undefined,
    { timeout: 15_000 },
  );
  await page.getByTestId("catalog-restore-overlay").waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
}

export async function waitForCatalogScroll(page: Page, minY: number) {
  await page.waitForFunction((y) => window.scrollY >= y, minY, { timeout: 15_000 });
}

export async function getScrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

export async function getVisibleCardCount(page: Page): Promise<number> {
  return page.getByTestId("catalog-product-card").count();
}

export async function getResultsCountText(page: Page): Promise<string> {
  const el = page.getByTestId("catalog-results-count").first();
  await el.waitFor({ state: "visible" });
  return (await el.textContent())?.trim() || "";
}

export async function openProductByName(page: Page, name: string) {
  const link = page.locator(`a[href*="/product/"]`).filter({ hasText: name }).first();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForURL(/\/product\//);
}

export async function clickLoadMore(page: Page) {
  const button = page.getByTestId("catalog-load-more");
  await button.waitFor({ state: "visible" });
  const before = await getVisibleCardCount(page);
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await page.waitForFunction(
    (prev) => document.querySelectorAll('[data-testid="catalog-product-card"]').length > prev,
    before,
    { timeout: 15_000 },
  );
}

export async function scrollCatalogDown(page: Page, pixels = 600) {
  await page.evaluate((y) => window.scrollBy(0, y), pixels);
  await page.waitForTimeout(200);
}

export async function openMobileFiltersIfNeeded(page: Page) {
  const toggle = page.getByRole("button", { name: /Показать фильтры|Скрыть фильтры/ });
  if (await toggle.isVisible().catch(() => false)) {
    const label = await toggle.textContent();
    if (label?.includes("Показать")) {
      await toggle.click();
      await page.getByRole("button", { name: /Скрыть фильтры/ }).waitFor({ state: "visible" });
    }
  }
}
