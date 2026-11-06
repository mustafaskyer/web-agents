import { TanStackDevtools } from "@tanstack/react-devtools";
import { useWebAgents, WebAgentsProvider, type WebAgentsVisuals } from "@web-agents/react";
import { StrictMode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { WebAgentsDevtools, webAgentsDevtoolsPlugin } from "./react";
import { byText, deepText, devtoolsRoot, modelContext, until } from "./test-utils";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Probe({ onVisuals }: { onVisuals(visuals: WebAgentsVisuals | null): void }) {
  onVisuals(useWebAgents().visuals);
  return null;
}

describe("@web-agents/devtools/react", () => {
  beforeAll(() => modelContext());
  beforeAll(() => localStorage.clear());
  afterEach(() => sleep(20)); // deferred store release of the unmounted tree

  it("mounts one panel under StrictMode and drives the provider's cursor", async () => {
    let visuals: WebAgentsVisuals | null = null;
    const screen = await render(
      <StrictMode>
        <WebAgentsProvider visuals={{ spotlight: false, yieldToUser: false }}>
          <Probe onVisuals={(v) => (visuals = v)} />
          <WebAgentsDevtools initialOpen eventClient={false} />
        </WebAgentsProvider>
      </StrictMode>,
    );
    await until(() => !!document.querySelector("[data-web-agents-ui]")?.shadowRoot?.querySelector('[role="dialog"]'), 3000, "panel");
    await sleep(20);
    expect(document.querySelectorAll("[data-web-agents-ui]")).toHaveLength(1);
    expect(window.agent).toBeDefined();

    const setSpotlight = vi.spyOn(visuals as unknown as WebAgentsVisuals, "setSpotlight");
    await userEvent.click(byText(devtoolsRoot(), '[role="tab"]', "Settings") as HTMLElement);
    const spotlight = devtoolsRoot().querySelector<HTMLButtonElement>('[role="switch"]') as HTMLButtonElement;
    expect(spotlight.disabled).toBe(false);
    await userEvent.click(spotlight);
    expect(setSpotlight).toHaveBeenCalledWith(true);
    expect(spotlight.getAttribute("aria-checked")).toBe("true");

    await screen.unmount();
    await sleep(20);
    expect(document.querySelectorAll("[data-web-agents-ui]")).toHaveLength(0);
    expect(window.agent).toBeUndefined();
  });

  it("works as a TanStack Devtools plugin", async () => {
    const plugin = webAgentsDevtoolsPlugin({ eventClient: false });
    expect(plugin).toMatchObject({ id: "web-agents", name: "Web Agents" });
    const screen = await render(<TanStackDevtools plugins={[plugin]} config={{ defaultOpen: true }} />);
    await until(() => deepText().includes("Web Agents"), 5000, "Web Agents tab");
    await screen.unmount();
  });
});
