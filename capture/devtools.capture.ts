import { test } from "@playwright/test";
import { open, run, sleep, still } from "./helpers";

const PLAYGROUND = "http://localhost:5173";

test("devtools: tools form, timeline, settings", async ({ page }, info) => {
  await open(page, PLAYGROUND, "get_cart");
  // the hotkey is a trusted keydown on the page (the cursor yields to it): drive tools a moment later
  await page.keyboard.press("Alt+Shift+A");
  await page.getByRole("tab", { name: "Tools" }).waitFor();
  await sleep(1200);
  // expand one tool's generated form
  const row = page.getByRole("button", { name: /^add_to_cart_mug-01|^Run add_to_cart_mug-01/ }).first();
  if (await row.count()) await row.click().catch(() => {});
  await sleep(300);
  await still(page, info, "devtools/tools");

  await run(page, "add_to_cart_mug-01", { qty: 2 });
  await run(page, "get_cart");
  await page.getByRole("tab", { name: /Timeline/ }).click();
  await sleep(400);
  await still(page, info, "devtools/timeline");

  await page.getByRole("tab", { name: /Settings/ }).click();
  await sleep(300);
  await still(page, info, "devtools/settings");
});
