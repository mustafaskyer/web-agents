import { expect, test } from "@playwright/test";
import { list, open, run } from "./agent";

test.beforeEach(async ({ page }) => {
  // A clean cart once per test; later page loads in the same test keep it (it's in sessionStorage).
  await page.addInitScript(() => {
    if (sessionStorage.getItem("e2e")) return;
    sessionStorage.setItem("e2e", "1");
    sessionStorage.removeItem("field-store:cart");
  });
});

test("tools by scope: global and page tools on the home page, no drawer or product tools", async ({ page }) => {
  await open(page, "/");
  await expect
    .poll(() => list(page))
    .toEqual(
      expect.arrayContaining(["search_products", "open_product", "browse_category", "get_cart", "open_cart", "subscribe_newsletter"]),
    );
  const names = await list(page);
  expect(names).not.toContain("update_cart_item");
  expect(names).not.toContain("add_to_cart");
  expect(names).not.toContain("checkout");
});

test("open_product → add_to_cart opens the drawer and its tools", async ({ page }) => {
  await open(page, "/");
  expect(await run(page, "open_product", { slug: "ocean-tee" })).toMatch(/^Opened Ocean Tee \(\$48\.00\)\. Size: S, M, L\./);
  await expect(page).toHaveURL(/\/product\/ocean-tee$/);
  await expect(page.getByRole("heading", { level: 1, name: "Ocean Tee" })).toBeVisible();

  await expect.poll(() => list(page)).toContain("add_to_cart");
  expect(await run(page, "add_to_cart", { variant: "M", qty: 2 })).toMatch(/^Added 2 × Ocean Tee \(M\) to the cart/);
  const drawer = page.getByRole("dialog", { name: /Your cart/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByLabel("Quantity of Ocean Tee (M)")).toHaveValue("2");
  await expect.poll(() => list(page)).toEqual(expect.arrayContaining(["update_cart_item", "remove_from_cart"]));

  expect(await run(page, "update_cart_item", { slug: "ocean-tee", qty: 3 })).toMatch(/quantity is now 3/);
  await expect(drawer.getByLabel("Quantity of Ocean Tee (M)")).toHaveValue("3");

  // drawer tools go away with the drawer
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect.poll(() => list(page)).not.toContain("update_cart_item");
});

test("add_to_cart without a variant: the agent and the page get the same error", async ({ page }) => {
  await open(page, "/product/linen-shirt");
  await expect.poll(() => list(page)).toContain("add_to_cart");
  const answer = await run(page, "add_to_cart", { qty: 1 });
  expect(answer).toBe("Error: Choose a Size for Linen Shirt: S, M, L, XL.");
  await expect(page.getByRole("alert")).toHaveText("Choose a Size for Linen Shirt: S, M, L, XL.");
});

test("open_product with an unknown slug answers an error and stays put", async ({ page }) => {
  await open(page, "/");
  expect(await run(page, "open_product", { slug: "nope" })).toMatch(/^Unknown product "nope"/);
  await expect(page).toHaveURL(/\/$/);
});

test("search_products lists matches and shows the results page", async ({ page }) => {
  await open(page, "/");
  expect(await run(page, "search_products", { query: "linen" })).toMatch(/^2 results for "linen":\n- Linen Shirt \[linen-shirt\]/);
  await expect(page).toHaveURL(/\/products\?q=linen$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Results for “linen”");
});

test("apply_promo: a bad code shows the error, WELCOME10 updates the totals", async ({ page }) => {
  await open(page, "/product/stoneware-mug");
  await expect.poll(() => list(page)).toContain("add_to_cart");
  await run(page, "add_to_cart", { qty: 2 });
  await page.keyboard.press("Escape");
  await page.goto("/checkout");
  await page.waitForFunction(() => !!window.agent);
  await expect.poll(() => list(page)).toContain("apply_promo");

  expect(await run(page, "apply_promo", { code: "NOPE" })).toBe('Error: Promo code "NOPE" is not valid.');
  await expect(page.getByRole("alert")).toHaveText('Promo code "NOPE" is not valid.');

  expect(await run(page, "apply_promo", { code: "WELCOME10" })).toMatch(/^Promo WELCOME10 applied: 10% off\. New total \$51\.20/);
  const summary = page.getByRole("complementary", { name: "Order summary" });
  await expect(summary.getByText("Promo WELCOME10")).toBeVisible();
  await expect(summary.getByRole("button", { name: "Remove promo WELCOME10" })).toBeVisible();
});

test("checkout waits for the person's click (confirm gate)", async ({ page }) => {
  await open(page, "/product/canvas-tote");
  await expect.poll(() => list(page)).toContain("add_to_cart");
  await run(page, "add_to_cart", { qty: 1 });
  await page.keyboard.press("Escape");
  await page.goto("/checkout");
  await page.waitForFunction(() => !!window.agent);
  await expect.poll(() => list(page)).toContain("checkout");

  const contact = { email: "ada@example.com", name: "Ada Lovelace", address: "1 Analytical Way", city: "London", postcode: "N1 9GU" };
  const pending = run(page, "checkout", contact);
  const placeOrder = page.getByRole("button", { name: /^Place order/ });
  await expect(placeOrder).toHaveAttribute("data-tool-submit-active", "");
  // still waiting for the person
  const early = await Promise.race([pending.then(() => "settled"), page.waitForTimeout(500).then(() => "pending")]);
  expect(early).toBe("pending");

  await placeOrder.click();
  expect(await pending).toMatch(/^Order FS-[A-Z0-9]{4} placed for \$46\.00\./);
  await expect(page).toHaveURL(/\/order\/FS-[A-Z0-9]{4}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Order FS-[A-Z0-9]{4} confirmed$/);
});

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("the agent cursor shows while a tool runs", async ({ page }) => {
    await open(page, "/");
    const done = run(page, "open_cart");
    await expect(page.locator(".agent-cursor.is-visible")).toBeVisible();
    expect(await done).toMatch(/^Opened the cart\./);
    await expect(page.getByRole("dialog", { name: /Your cart/ })).toBeVisible();
  });
});
