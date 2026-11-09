import { type AgentVisuals, installAgentVisuals } from "@webmcp-agents/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { byText, cleanupFixtures, devtoolsRoot, modelContext, toolForm, uniqueName, until } from "../test-utils";
import { installWebAgentsDevtools } from "../vanilla";

const $ = <T extends Element = HTMLElement>(selector: string) => devtoolsRoot().querySelector<T>(selector);
const cursorVisible = () => !!document.querySelector(".agent-cursor.is-visible");

describe("devtools panel", () => {
  let visuals: AgentVisuals;
  let dispose: () => void;
  let name: string;

  beforeEach(async () => {
    localStorage.clear();
    modelContext();
    visuals = installAgentVisuals({ linger: 20, yieldToUser: { resumeAfter: 100 } });
    name = uniqueName("add_to_cart_x");
    toolForm(name, { answer: (form) => `Added ${(form.elements.namedItem("qty") as HTMLInputElement).value}` });
    toolForm(uniqueName("apply_promo_x"));
    dispose = installWebAgentsDevtools({ visuals, eventClient: false });
    await until(() => !!document.querySelector("[data-web-agents-ui]")?.shadowRoot?.querySelector(".launcher"), 3000, "launcher");
  });

  afterEach(() => {
    dispose();
    visuals.destroy();
    cleanupFixtures();
    vi.restoreAllMocks();
  });

  async function openTool(tool = name): Promise<HTMLElement> {
    await userEvent.click($(".launcher") as HTMLElement);
    await until(() => !!byText(devtoolsRoot(), ".disclosure", tool), 3000, "tool row");
    await userEvent.click(byText(devtoolsRoot(), ".disclosure", tool) as HTMLElement);
    return $(".runner") as HTMLElement;
  }

  it("opens from the launcher with focus on the active tab", async () => {
    await userEvent.click($(".launcher") as HTMLElement);
    expect($('[role="dialog"]')).not.toBeNull();
    expect(devtoolsRoot().activeElement?.getAttribute("role")).toBe("tab");
    expect(devtoolsRoot().activeElement?.getAttribute("aria-selected")).toBe("true");
  });

  it("filters tools by search", async () => {
    await userEvent.click($(".launcher") as HTMLElement);
    await until(() => devtoolsRoot().querySelectorAll(".tool").length >= 2, 3000, "rows");
    await userEvent.fill($('input[type="search"]') as HTMLElement, "apply_promo");
    expect([...devtoolsRoot().querySelectorAll(".tool code")].map((c) => c.textContent)).toEqual([expect.stringMatching(/^apply_promo_x/)]);
  });

  it("runs a tool from the generated form and shows it on the timeline", async () => {
    const runner = await openTool();
    const qty = runner.querySelector<HTMLInputElement>('input[type="number"]') as HTMLInputElement;
    expect(runner.querySelector(`label[for="${qty.id}"]`)?.textContent).toContain("qty");
    expect(qty.value).toBe("1");
    await userEvent.fill(qty, "3");
    await userEvent.click(byText(runner, "button", "Run") as HTMLElement);
    await until(() => !!byText(runner, ".result-text", "Added 3"), 8000, "result");
    expect(byText(devtoolsRoot(), '[role="tab"]', "Timeline")?.querySelector(".count")?.textContent).toBe("1");
  });

  it("runs a tool from its row without opening it, repeating the last arguments", async () => {
    await userEvent.click($(".launcher") as HTMLElement);
    await until(() => !!devtoolsRoot().querySelector(`[aria-label="Run ${name}"]`), 3000, "row run button");
    await userEvent.click($(`[aria-label="Run ${name}"]`) as HTMLElement); // defaults: qty 1
    await until(() => byText(devtoolsRoot(), '[role="tab"]', "Timeline")?.querySelector(".count")?.textContent === "1", 8000, "first run");
    expect($(".runner")).toBeNull();

    // a run from the opened form becomes the row's arguments
    await userEvent.click(byText(devtoolsRoot(), ".disclosure", name) as HTMLElement); // the panel is already open
    const runner = $(".runner") as HTMLElement;
    await userEvent.fill(runner.querySelector('input[type="number"]') as HTMLElement, "4");
    await userEvent.click(byText(runner, "button", "Run") as HTMLElement);
    await until(() => !!byText(runner, ".result-text", "Added 4"), 8000, "form run");
    await until(() => ($(`[aria-label="Run ${name}"]`) as HTMLButtonElement | null)?.disabled === false, 8000, "row button enabled");
    await userEvent.click($(`[aria-label="Run ${name}"]`) as HTMLElement);
    await until(() => byText(devtoolsRoot(), '[role="tab"]', "Timeline")?.querySelector(".count")?.textContent === "3", 8000, "third run");
    await until(() => !!byText(runner, ".result-text", "Added 4"), 8000, "repeated args");
  });

  it("flags invalid JSON and runs once it is fixed", async () => {
    const runner = await openTool();
    await userEvent.click(byText(runner, "button", "JSON") as HTMLElement);
    const json = runner.querySelector("textarea") as HTMLTextAreaElement;
    await userEvent.fill(json, "{");
    expect(json.getAttribute("aria-invalid")).toBe("true");
    expect(devtoolsRoot().getElementById(json.getAttribute("aria-describedby") ?? "")?.textContent).toMatch(/Not valid JSON/);
    expect((byText(runner, "button", "Run") as HTMLButtonElement).disabled).toBe(true);
    await userEvent.fill(json, '{"qty": 2}');
    expect(json.hasAttribute("aria-invalid")).toBe(false);
    await userEvent.click(byText(runner, "button", "Run") as HTMLElement);
    await until(() => !!byText(runner, ".result-text", "Added 2"), 8000, "result");
  });

  it("copies the call as code", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const runner = await openTool();
    await userEvent.click(byText(runner, "button", "agent.run()") as HTMLElement);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`await agent.run("${name}"`));
    await until(() => !!byText(runner, "button", "Copied"), 1000, "Copied");
  });

  it("keeps the agent cursor while the pointer moves over the panel", async () => {
    const confirm = uniqueName("place_order_x");
    toolForm(confirm, { autosubmit: false });
    const runner = await openTool(confirm);
    await userEvent.click(byText(runner, "button", "Run") as HTMLElement);
    await until(() => !!byText(runner, ".status", "Waiting for you"), 8000, "parked");
    expect(cursorVisible()).toBe(true);
    await userEvent.hover($(".brand") as HTMLElement);
    await userEvent.hover(byText(devtoolsRoot(), '[role="tab"]', "Settings") as HTMLElement);
    await new Promise((r) => setTimeout(r, 150));
    expect(cursorVisible()).toBe(true);
    await userEvent.click(byText(runner, "button", "Cancel") as HTMLElement);
  });

  it("supports the tabs keyboard pattern and Escape", async () => {
    await userEvent.click($(".launcher") as HTMLElement);
    await userEvent.keyboard("{ArrowRight}");
    expect(devtoolsRoot().activeElement?.textContent).toContain("Timeline");
    expect(byText(devtoolsRoot(), '[role="tab"]', "Timeline")?.getAttribute("aria-selected")).toBe("true");
    await userEvent.keyboard("{End}");
    expect(devtoolsRoot().activeElement?.textContent).toContain("Settings");
    await userEvent.keyboard("{Escape}");
    expect($('[role="dialog"]')).toBeNull();
    expect(devtoolsRoot().activeElement).toBe($(".launcher"));
  });
});
