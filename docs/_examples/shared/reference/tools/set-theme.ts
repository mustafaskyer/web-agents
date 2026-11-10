import { setTheme } from "@webmcp-agents/tools";

// A theme kept in your own state, with no switch on the page
// (or one that cannot reach "system"):
const theme = {
  current: "light" as "light" | "dark" | "system",
  set(next: "light" | "dark" | "system") {
    this.current = next;
    document.documentElement.dataset.theme = next;
  },
};

export const tools = {
  setTheme: setTheme({
    get: () => theme.current,
    set: (next) => theme.set(next),
  }),
};

export async function goDark(): Promise<string> {
  // "The theme is now dark."
  return tools.setTheme.invoke({ theme: "dark" });
}
