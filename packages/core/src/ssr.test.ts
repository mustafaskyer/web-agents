import { describe, expect, it } from "vitest";

// Runs in the node environment: no document, no matchMedia, no requestAnimationFrame.
describe("server-side import", () => {
  it("imports without touching the DOM", async () => {
    expect(typeof document).toBe("undefined");
    const core = await import("./index");
    expect(typeof core.installAgentVisuals).toBe("function");
  });

  it("returns a no-op handle when there is no document", async () => {
    const { installAgentVisuals } = await import("./index");
    const visuals = installAgentVisuals({ spotlight: true });
    expect(() => {
      visuals.setSpotlight(false);
      visuals.setYieldToUser(false);
      visuals.destroy();
    }).not.toThrow();
  });
});
