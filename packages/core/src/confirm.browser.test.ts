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

  /**
   * What React Aria's usePress does (react-aria 3.53): after a pointerup on its element it waits 80 ms for the click,
   * watched by a capture listener on the document, and calls `el.click()` itself when none arrived.
   */
  function pressFallback(el: HTMLElement): void {
    el.addEventListener("pointerdown", () => {
      let clicked = false;
      const seen = (): void => {
        clicked = true;
      };
      document.addEventListener("click", seen, true);
      document.addEventListener(
        "pointerup",
        () =>
          setTimeout(() => {
            document.removeEventListener("click", seen, true);
            if (!clicked) el.click();
          }, 80),
        { once: true },
      );
    });
  }

  it("swallows the click a press library re-fires for the confirming click (React Aria)", async () => {
    const { el, onClick } = button();
    pressFallback(el);
    const confirmed = waitForConfirmation('[toolname="t_confirm"]', new AbortController().signal, "t_confirm");
    await userEvent.click(el);
    await expect(confirmed).resolves.toBeUndefined();
    await timeout(200); // past the library's 80 ms
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps a re-fired click from following a link", async () => {
    const el = fixture('<a href="#t-confirm-followed" toolname="t_confirm_link">Open GitHub</a>').querySelector("a") as HTMLAnchorElement;
    pressFallback(el);
    const confirmed = waitForConfirmation('[toolname="t_confirm_link"]', new AbortController().signal, "t_confirm_link");
    await userEvent.click(el);
    await expect(confirmed).resolves.toBeUndefined();
    await timeout(200);
    expect(location.hash).not.toBe("#t-confirm-followed");
  });

  it("swallows the re-fired click when the tool's element is inside or around the library's", async () => {
    // React Aria drops unknown attributes, so `toolname` ends up on a child or a wrapper of its control.
    for (const html of [
      '<button type="button" class="press"><span toolname="t_confirm">Clear cart</span></button>',
      '<div toolname="t_confirm"><button type="button" class="press">Clear cart</button></div>',
    ]) {
      const el = fixture(html).querySelector(".press") as HTMLButtonElement;
      const onClick = vi.fn();
      el.addEventListener("click", onClick);
      pressFallback(el);
      const confirmed = waitForConfirmation('[toolname="t_confirm"]', new AbortController().signal, "t_confirm");
      await userEvent.click(el);
      await expect(confirmed).resolves.toBeUndefined();
      await timeout(200);
      expect(onClick).not.toHaveBeenCalled();
      cleanupFixtures();
    }
  });

  it("swallows re-fired clicks on that element only, and only for a moment", async () => {
    const { el, onClick } = button();
    const other = fixture('<button type="button">Other</button>').querySelector("button") as HTMLButtonElement;
    const onOther = vi.fn();
    other.addEventListener("click", onOther);
    const confirmed = waitForConfirmation('[toolname="t_confirm"]', new AbortController().signal, "t_confirm");
    await userEvent.click(el);
    await confirmed;
    other.click();
    expect(onOther).toHaveBeenCalledOnce();
    await timeout(400);
    el.click(); // the page's own scripted clicks work again
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
