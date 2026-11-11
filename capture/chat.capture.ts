import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { open, openChat, run, sleep, still } from "./helpers";

const STORE = "http://localhost:5174";
const envFile = join(import.meta.dirname, "..", "examples", "ecommerce", ".env.local");
const hasKey = existsSync(envFile) && /^[A-Z_]*_API_KEY=\S+/m.test(readFileSync(envFile, "utf8"));

test("chat: the on-device model picker (no key needed)", async ({ page }, info) => {
  // Chromium offers its built-in model (Prompt API) first, which has no picker: hide it so the transformers provider wins
  await page.addInitScript(() => {
    Object.defineProperty(window, "LanguageModel", { value: undefined, configurable: true });
  });
  await open(page, STORE, "open_product");
  await openChat(page);
  await page.getByRole("radio", { name: /On-device/ }).click();
  await page.locator(".wa-chat__model select").waitFor({ timeout: 30_000 });
  await sleep(400);
  await still(page, info, "chat/model-picker");
});

test("chat: a tool call card and a sub-agent card (needs a model key)", async ({ page }, info) => {
  test.skip(
    !hasKey,
    "Put ANTHROPIC_API_KEY (or another provider's key) in examples/ecommerce/.env.local to capture the chat with a live model.",
  );
  await open(page, STORE, "open_product");
  await openChat(page);
  const input = page.getByLabel("Message the assistant");
  await input.fill("Add the ceramic mug to my cart");
  await input.press("Enter");
  await expect(page.locator(".wa-chat__tool[data-status=done]").first()).toBeVisible({ timeout: 90_000 });
  await expect(page.locator(".wa-chat__typing")).toBeHidden({ timeout: 90_000 });
  await sleep(500);
  await still(page, info, "chat/tool-card");

  await input.fill("Check out with promo WELCOME10 to ada@example.com, Ada Lovelace, 1 Main St, London, N1 1AA, United Kingdom");
  await input.press("Enter");
  await expect(page.locator(".wa-chat__tool[data-agent]")).toBeVisible({ timeout: 120_000 });
  await expect(page.locator(".wa-chat__tool[data-status=awaiting]")).toBeVisible({ timeout: 120_000 });
  await sleep(500);
  await still(page, info, "chat/subagent");
  await page
    .locator("[data-agent-active]")
    .click()
    .catch(() => {});
  await run(page, "get_cart").catch(() => {});
});
