import { getLocation } from "@webmcp-agents/tools";

export const tools = {
  getLocation: getLocation({
    // Name the place. Called only after the person shared their
    // position; the coordinates leave the browser only here.
    lookup: async ({ lat, lon }, signal) => {
      const res = await fetch(`/api/place?lat=${lat}&lon=${lon}`, {
        signal,
      });
      // { city, region, country }
      return res.ok ? res.json() : undefined;
    },
    prompt: "Allow location access to continue",
    timeoutMs: 15_000,
  }),
};

export async function whereAmI(): Promise<string | undefined> {
  const { structuredContent } = await tools.getLocation.invoke();
  return structuredContent.location.city;
}
