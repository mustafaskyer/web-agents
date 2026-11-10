import * as core from "@webmcp-agents/core/polyfill";
import { describe, expect, it } from "vitest";
import * as polyfill from "./index";

describe("@webmcp-agents/polyfill (deprecated)", () => {
  it("re-exports @webmcp-agents/core/polyfill, so published imports keep working", () => {
    expect(polyfill.installWebMCPPolyfill).toBe(core.installWebMCPPolyfill);
    expect(polyfill.PolyfillModelContext).toBe(core.PolyfillModelContext);
  });

  it("/auto installs nothing on the server", async () => {
    await import("./auto");
    expect(polyfill.installWebMCPPolyfill()).toBeUndefined();
  });
});
