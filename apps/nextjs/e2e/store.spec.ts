import { expect, test } from "@playwright/test";
import { list, open, run } from "./agent";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("e2e")) return;
    sessionStorage.setItem("e2e", "1");
    sessionStorage.removeItem("field-store-next:cart");
  });
});

test("the server-rendered home registers the global and page tools after hydration", async ({ page }) => {
  await open(page, "/");
  await expect(page.getByRole("heading", { level: 1, name: "Everything in the store" })).toBeVisible();
  await expect.poll(() => list(page)).toEqual(expect.arrayContaining(["search_products", "open_product", "go_to_page", "get_cart"]));
  expect(await list(page)).not.toContain("add_to_cart");
});

test("open_product → add_to_cart → checkout parks on Place order until a real click", async ({ page }) => {
  await open(page, "/");
  await expect.poll(() => list(page)).toContain("open_product"); // the provider registers after hydration
  expect(await run(page, "open_product", { slug: "ocean-tee" })).toMatch(/^Opened Ocean Tee \(\$48\.00\)\. Size: S, M, L\./);
  await expect(page).toHaveURL(/\/product\/ocean-tee$/);
  await expect.poll(() => list(page)).toContain("add_to_cart");
  expect(await run(page, "add_to_cart", { variant: "M", qty: 2 })).toMatch(/^Added 2 × Ocean Tee \(M\)/);

  expect(await run(page, "go_to_page", { page: "checkout" })).toMatch(/^Opened checkout/);
  await expect.poll(() => list(page)).toEqual(expect.arrayContaining(["apply_promo", "checkout"]));
  expect(await run(page, "apply_promo", { code: "WELCOME10" })).toMatch(/^Applied WELCOME10/);

  const pending = run(page, "checkout", { email: "a@b.co", name: "Ada", address: "1 Main St" });
  const button = page.locator("[data-tool-submit-active]");
  await expect(button).toBeVisible();
  await button.click();
  expect(await pending).toMatch(/^Order FS-\w+ placed/);
  await expect(page).toHaveURL(/\/cart\?placed=/);
});

test("the API key never reaches the client", async ({ page }) => {
  await open(page, "/");
  const html = await page.content();
  expect(html).not.toMatch(/sk-ant-|ANTHROPIC_API_KEY=/);
  const status = await page.evaluate(() => fetch("/api/chat").then((r) => r.json()));
  expect(status).toMatchObject({ model: expect.any(String), agents: ["shopper", "checkout"] });
});
