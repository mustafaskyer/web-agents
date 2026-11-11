import { expect, test } from "@playwright/test";
import { open, run, sleep, still } from "./helpers";

const PLAYGROUND = "http://localhost:5173";
const STORE = "http://localhost:5174";
const FLIGHTS = "http://localhost:5175";
const NEXT = "http://localhost:5176";

test("playground home", async ({ page }, info) => {
  await open(page, PLAYGROUND, "get_cart");
  await still(page, info, "examples/playground");
});

test("field store home, product, cart drawer", async ({ page }, info) => {
  await open(page, STORE, "open_product");
  await still(page, info, "examples/field-store");
  await run(page, "open_product", { slug: "ocean-tee" });
  await page.waitForURL(/\/product\/ocean-tee/);
  await still(page, info, "examples/field-store-product");
  await expect.poll(() => page.evaluate(() => window.agent!.list().then((ts) => ts.map((t) => t.name)))).toContain("add_to_cart");
  await run(page, "add_to_cart", { variant: "M", qty: 2 });
  await page.getByRole("dialog", { name: /Your cart/ }).waitFor();
  await sleep(300);
  await still(page, info, "examples/field-store-cart");
});

test("skyline home, results, booking", async ({ page }, info) => {
  await open(page, `${FLIGHTS}/?latency=0`, "search_flights");
  await still(page, info, "examples/skyline");
  await run(page, "search_flights", { from: "London", to: "Dubai", date: "2027-03-12", adults: 1 });
  await page.waitForURL(/\/flights\//);
  await expect.poll(() => page.evaluate(() => window.agent!.list().then((ts) => ts.map((t) => t.name)))).toContain("select_flight");
  await sleep(300);
  await still(page, info, "examples/skyline-results");
  const listing = (await run(page, "list_results", { limit: 1 })) ?? "";
  const id = listing.match(/\[id (F-[\w-]+)\]/)?.[1];
  if (id) {
    await run(page, "select_flight", { flightId: id });
    await page.waitForURL(/\/book/);
    await sleep(300);
    await still(page, info, "examples/skyline-booking");
  }
});

test("next.js store home and product", async ({ page }, info) => {
  await open(page, NEXT, "open_product");
  await still(page, info, "examples/nextjs");
  await run(page, "open_product", { slug: "stoneware-mug" });
  await page.waitForURL(/\/product\//);
  await sleep(300);
  await still(page, info, "examples/nextjs-product");
});
