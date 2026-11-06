import { userEvent } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmationUnavailableError, waitForConfirmation } from "./confirm";
import { cleanupFixtures, fixture, recordEvents } from "./test-utils";

const timeout = (ms: number) => new Promise<"timeout">((r) => setTimeout(() => r("timeout"), ms));

describe("waitForConfirmation", () => {
  afterEach(cleanupFixtures);

  function button(): { el: HTMLButtonElement; onClick: ReturnType<typeof vi.fn> } {
    const el = fixture('<button type="button" toolname="t_confirm">Clear cart</button>').querySelector("button") as HTMLButtonElement;
    const onClick = vi.fn();
    el.addEventListener("click", onClick);
    return { el, onClick };
  }

  it("resolves on a trusted click and keeps it from the element's own handler", async () => {
    const { el, onClick } = button();
    const rec = recordEvents();
    const confirmed = waitForConfirmation('[toolname="t_confirm"]', new AbortController().signal, "t_confirm");
    expect(rec.events).toEqual([{ type: "park", tool: "t_confirm", prompt: 'Click "Clear cart" to confirm' }]);
    rec.stop();
    await userEvent.click(el);
    await expect(confirmed).resolves.toBeUndefined();
    expect(onClick).not.toHaveBeenCalled();
    // Settled: later clicks reach the element again.
    await userEvent.click(el);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("ignores a script's untrusted click", async () => {
    const { el } = button();
    const ac = new AbortController();
    const confirmed = waitForConfirmation('[toolname="t_confirm"]', ac.signal, "t_confirm").then(() => "confirmed");
    el.click();
    expect(await Promise.race([confirmed, timeout(100)])).toBe("timeout");
    ac.abort();
    await confirmed.catch(() => {});
  });

  it("rejects with an AbortError when the call is cancelled", async () => {
    button();
    const ac = new AbortController();
    const confirmed = waitForConfirmation('[toolname="t_confirm"]', ac.signal, "t_confirm");
    ac.abort();
    await expect(confirmed).rejects.toMatchObject({ name: "AbortError" });
  });

  it("fails closed when nothing clickable matches the selector", async () => {
    await expect(waitForConfirmation('[toolname="missing"]', new AbortController().signal, "missing")).rejects.toBeInstanceOf(
      ConfirmationUnavailableError,
    );
    const { el } = button();
    el.disabled = true;
    await expect(waitForConfirmation('[toolname="t_confirm"]', new AbortController().signal, "t_confirm")).rejects.toBeInstanceOf(
      ConfirmationUnavailableError,
    );
  });

  it("rejects when the element goes away or is disabled while waiting", async () => {
    const { el } = button();
    const removed = waitForConfirmation('[toolname="t_confirm"]', new AbortController().signal, "t_confirm");
    el.remove();
    await expect(removed).rejects.toThrow(/nothing to confirm on/);

    const second = button();
    const disabled = waitForConfirmation('[toolname="t_confirm"]', new AbortController().signal, "t_confirm");
    second.el.disabled = true;
    await expect(disabled).rejects.toBeInstanceOf(ConfirmationUnavailableError);
  });
});
