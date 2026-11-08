/**
 * Imperative WebTool: get_location (global). The user's nearest airport, so "book me a flight to Dubai" needs no
 * "from where?". From the browser's location when the user allows it (the browser asks once; the tool says it's
 * waiting on them, so the agent's time limit doesn't fire), else a guess from their time zone, else ask them.
 */
import { defineWebTool, waitingForUser, WebToolError } from "@web-agents/react";
import { z } from "zod";
import { AIRPORTS, type Airport } from "../data/flights";
import { airportsInTimeZone, nearestAirports } from "../data/location";

/** Past this, the "nearest" airport is far enough that the agent should check with the user. */
const FAR_KM = 300;

/** "London Heathrow (LHR)", "Dubai International (DXB)". */
const label = (a: Airport): string => `${a.name.includes(a.city) ? a.name : `${a.city} ${a.name}`} (${a.code})`;

/** The browser's position, or null when it isn't shared (no API, denied, unavailable, too slow, cancelled). */
async function position(signal: AbortSignal): Promise<GeolocationPosition | null> {
  if (!("geolocation" in navigator)) return null;
  const state = await navigator.permissions
    ?.query({ name: "geolocation" })
    .then((s) => s.state)
    .catch(() => "prompt" as const);
  if (state === "denied") return null;
  if (state !== "granted") waitingForUser("get_location", "Allow location access to find your nearest airport");
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(null), { once: true });
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      timeout: 20_000,
      maximumAge: 10 * 60_000,
      enableHighAccuracy: false,
    });
  });
}

export const getLocation = defineWebTool({
  id: "get_location",
  title: "Find the user's nearest airport",
  description:
    "Find the airport nearest the user, from their browser's location (the browser asks them to allow it). Use when the user wants to fly somewhere but didn't say where from. Answers the nearest airports with their codes. Next: search_flights with from set to that code; tell the user which airport you used.",
  inputSchema: z.object({}),
  annotations: { readOnlyHint: true },
  execute: async (_input, { signal }) => {
    const pos = await position(signal);
    if (pos) {
      const [nearest, ...others] = nearestAirports({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      const also = others.map((n) => `${n.airport.city} (${n.airport.code}) ${n.km} km`).join(", ");
      const far = nearest!.km > FAR_KM ? " That's far: check with the user before using it." : "";
      return `The user's nearest airport is ${label(nearest!.airport)}, about ${nearest!.km} km away.${far} Also near: ${also}. Use from: ${nearest!.airport.code} in search_flights.`;
    }

    // not shared: the time zone is a rough guess
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const guess = airportsInTimeZone(tz);
    if (guess.length > 0)
      return `The user's location isn't shared, but their time zone (${tz}) suggests ${guess.map(label).join(" or ")}. Confirm with the user before searching from ${guess.length > 1 ? "one of these" : "it"}.`;
    throw new WebToolError(
      "needs_user",
      `The user's location isn't shared and their time zone (${tz}) matches no airport Skyline flies from. Ask them where they're flying from: ${AIRPORTS.map((a) => a.city).join(", ")}.`,
    );
  },
});
