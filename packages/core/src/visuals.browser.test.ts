import { userEvent } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupFixtures, cursorVisible, fixture, modelContext, recordEvents, resultText, toolForm, uniqueName, until } from "./test-utils";
import { onAgentEvent } from "./events";
import { type AgentVisuals, installAgentVisuals } from "./visuals";

const tick = () => new Promise((r) => setTimeout(r, 0));
const overlay = () => document.querySelectorAll(".agent-cursor, .agent-ring, .agent-spotlight, .agent-tag, .agent-sr-only").length;

describe("installAgentVisuals", () => {
  let visuals: AgentVisuals | null = null;
  let rec: ReturnType<typeof recordEvents>;

  beforeEach(() => {
    modelContext();
    // Tests drive tools from script; keep real user-input yielding out of the way unless a test opts in.
    visuals = installAgentVisuals({ linger: 50, yieldToUser: false });
    rec = recordEvents();
  });

  afterEach(() => {
    rec.stop();
    visuals?.destroy();
    visuals = null;
    cleanupFixtures();
  });

  it("installs once, is ref-counted, and tears everything down on the last destroy", async () => {
    const mc = modelContext();
    const wrapped = mc.registerTool;
    const second = installAgentVisuals({ spotlight: true });
    expect(mc.registerTool).toBe(wrapped); // shared instance, not a second wrapper

    const form = toolForm(uniqueName("t_mount"));
    await tick();
    const run = mc.executeTool(form.getAttribute("toolname") as string, { qty: 2 });
    await until(cursorVisible, 3000, "cursor visible");
    await run;
    expect(overlay()).toBeGreaterThan(0);

    second.destroy();
    second.destroy(); // idempotent: must not release the first handle too
    expect(overlay()).toBeGreaterThan(0);

    visuals?.destroy();
    visuals = null;
    expect(overlay()).toBe(0);
    expect(mc.registerTool).not.toBe(wrapped); // original registerTool restored
  });

  it("plays a declarative autosubmit form in step with the page", async () => {
    const name = uniqueName("t_add");
    const order: string[] = [];
    const form = toolForm(name, { answer: "added", onSubmit: () => order.push("page handler") });
    const off = onAgentEvent((e) => order.push(e.type));
    await tick();

    const res = await modelContext().executeTool(name, { qty: 3 });
    off();

    expect(resultText(res)).toContain("added");
    expect((form.elements.namedItem("qty") as HTMLInputElement).value).toBe("3");
    // Sync mode holds the submit: the page handles it only after the cursor typed the field.
    expect(order.indexOf("fill")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("page handler")).toBeGreaterThan(order.indexOf("fill"));
    expect(rec.types()).toEqual(expect.arrayContaining(["start", "fill", "result"]));
    const result = rec.events.find((e) => e.type === "result");
    expect(result && "ms" in result && result.ms).toBeGreaterThan(0);
  });

  it("parks on the submit button of a confirm form until the user clicks it", async () => {
    const name = uniqueName("t_confirm");
    const form = toolForm(name, { autosubmit: false, fields: "", answer: "placed" });
    await tick();

    const pending = modelContext().executeTool(name, {});
    await until(() => rec.types().includes("park"), 4000, "park event");
    const button = form.querySelector("button") as HTMLButtonElement;
    expect(button.hasAttribute("data-tool-submit-active")).toBe(true);
    const park = rec.events.find((e) => e.type === "park");
    expect(park && "prompt" in park && park.prompt).toContain("Go");

    await userEvent.click(button);
    expect(resultText(await pending)).toContain("placed");
  });

  it("runs an imperative tool's execute at the cursor's click", async () => {
    const name = uniqueName("t_clear");
    const order: string[] = [];
    fixture(`<button type="button" toolname="${name}">Clear</button>`);
    const off = onAgentEvent((e) => order.push(e.type));
    modelContext().registerTool({
      name,
      description: "test",
      execute: () => {
        order.push("execute");
        return "cleared";
      },
    });

    const res = await modelContext().executeTool(name, {});
    off();

    expect(resultText(res)).toContain("cleared");
    // execute ran between start and result: it was held until the cursor pressed the button.
    expect(order).toEqual(["start", "execute", "result"]);
  });

  it("runs an imperative tool with nothing on screen immediately", async () => {
    const name = uniqueName("t_offscreen");
    modelContext().registerTool({ name, description: "test", execute: () => "done" });
    const started = performance.now();
    const res = await modelContext().executeTool(name, {});
    expect(resultText(res)).toContain("done");
    expect(performance.now() - started).toBeLessThan(100);
    expect(rec.types()).not.toContain("start");
  });

  it("never submits to the page when the call is cancelled while the cursor is on its way", async () => {
    const name = uniqueName("t_cancel_travel");
    let submitted = false;
    toolForm(name, { fields: '<input name="note" type="text">', onSubmit: () => (submitted = true) });
    await tick();
    const mc = modelContext();
    const pending = mc.executeTool(name, { note: "a fairly long note to type" }).catch((e: unknown) => e);
    await until(() => rec.types().includes("start"), 2000, "start event");
    expect(mc.cancelTool?.(name)).toBe(true);

    expect(await pending).toBeInstanceOf(DOMException);
    await new Promise((r) => setTimeout(r, 300)); // past any pending click
    expect(submitted).toBe(false);
    expect(rec.types().filter((t) => t === "start")).toHaveLength(1);
    expect(rec.types()).not.toContain("result");
  });

  it("hides the cursor when a call is cancelled", async () => {
    const name = uniqueName("t_cancel");
    toolForm(name, { autosubmit: false, fields: "" });
    await tick();
    const mc = modelContext();
    const pending = mc.executeTool(name, {}).catch((e: unknown) => e);
    await until(() => rec.types().includes("park"), 4000, "park event");
    expect(mc.cancelTool?.(name)).toBe(true);
    expect(await pending).toBeInstanceOf(DOMException);
    expect(rec.types()).toContain("cancel");
    await until(() => !cursorVisible(), 1000, "cursor hidden");
  });
});
