import { expect, test } from "@playwright/test";

/**
 * Smoke test: sign in with mock auth, visit every module, check the brand theme is
 * applied and nothing errors. Runs against `next start` (build first).
 */
const pages = ["/", "/reports", "/series", "/notifications", "/themes", "/subscribers", "/coupons", "/team"];

test("signs in and every page renders without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole("button", { name: "Owner" }).click();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

  const theme = await page.locator("html").getAttribute("data-theme");
  expect(theme).toBeTruthy();

  for (const path of pages) {
    await page.goto(path);
    await expect(page.locator("main h1, header h1").first()).not.toBeEmpty();
    await expect(page.getByText("We couldn't find that page")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
