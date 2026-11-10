/**
 * Clips (video on, motion on). One clip per test: encode.mjs finds each test's video by the title's slug
 * (`clip-typing` → …/clip-typing-…/video.webm).
 */
import { expect, test } from "@playwright/test";
import { open, run, sleep } from "./helpers";

const STORE = "http://localhost:5174";
const FLIGHTS = "http://localhost:5175";

test("clip-typing", async ({ page }) => {
  await open(page, `${STORE}/product/ocean-tee`, "add_to_cart");
  await sleep(800);
  await run(page, "add_to_cart", { variant: "M", qty: 2 });
  await page.getByRole("dialog", { name: /Your cart/ }).waitFor();
  await sleep(1500);
});

test("clip-confirm", async ({ page }) => {
  await open(page, `${STORE}/product/ocean-tee`, "add_to_cart");
  await run(page, "add_to_cart", { variant: "M", qty: 1 });
  await page.keyboard.press("Escape");
  await run(page, "go_to_page", { page: "checkout" });
  await page.waitForURL(/\/checkout/);
  await expect.poll(() => page.evaluate(() => window.agent!.list().then((ts) => ts.map((t) => t.name)))).toContain("checkout");
  await sleep(600);
  const pending = run(page, "checkout", {
    email: "ada@example.com",
    name: "Ada Lovelace",
    address: "1 Main St",
    city: "London",
    postcode: "N1 1AA",
    country: "United Kingdom",
  }).catch(() => undefined);
  // parked: the cursor waits on the control the tool found (Place order) after typing every field
  await page.locator(".agent-cursor.is-waiting").waitFor({ timeout: 20_000 });
  await sleep(2500); // the parked cursor, waiting
  await page.locator("[data-agent-active]").click();
  await pending;
  await sleep(1500);
});

test("clip-yield", async ({ page }) => {
  await open(page, `${STORE}/product/ocean-tee`, "add_to_cart");
  await sleep(600);
  const pending = run(page, "add_to_cart", { variant: "L", qty: 3 });
  await sleep(700); // the cursor is on its way
  await page.mouse.move(200, 300);
  await page.mouse.move(600, 500, { steps: 20 });
  await page.mouse.wheel(0, 60); // the person scrolls: the cursor gets out of the way (moving the pointer alone would not)
  await pending;
  await sleep(1500);
});

test("clip-skyline", async ({ page }) => {
  await open(page, `${FLIGHTS}/?latency=0`, "search_flights");
  await sleep(600);
  await run(page, "search_flights", { from: "London", to: "Dubai", date: "2027-03-12", adults: 1 });
  await page.waitForURL(/\/flights\//);
  await expect.poll(() => page.evaluate(() => window.agent!.list().then((ts) => ts.map((t) => t.name)))).toContain("select_flight");
  await sleep(800);
  const listing = (await run(page, "list_results", { limit: 1 })) ?? "";
  const id = listing.match(/\[id (F-[\w-]+)\]/)?.[1];
  if (id) await run(page, "select_flight", { flightId: id });
  await sleep(2000);
});
