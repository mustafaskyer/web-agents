/**
 * Imperative WebTool: get_location (global). Where the user is (city, region, country, coordinates) and their nearest
 * airports, so "book me a flight to Dubai" needs no "from where?".
 *
 * From the browser's location when the user allows it (the browser asks once; the tool says it's waiting on them, so
 * the agent's time limit doesn't fire). The city comes from BigDataCloud's free reverse-geocoding endpoint (no key):
 * the coordinates leave the browser for that one lookup, and without it the answer still has them. Location not
 * shared: a guess from the time zone. No guess: ask the user.
 *
 * The answer is text for the model and `structuredContent.location` / `.airports` for code.
 */
import { defineWebTool, waitingForUser, WebToolError } from "@webmcp-agents/react";
import { z } from "zod";
import { AIRPORTS, type Airport } from "../data/flights";
import { airportsInTimeZone, nearestAirports } from "../data/location";

/** Past this, the nearest airport is far enough that the agent should check with the user. */
const FAR_KM = 300;
const GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const GEOCODE_TIMEOUT_MS = 5000;

/** Where the user is, as far as the tool could tell. */
interface UserLocation {
  /** "browser": the device's position; "timezone": a guess from the time zone (no coordinates). */
  source: "browser" | "timezone";
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  lon?: number;
  /** How far off the browser's position may be, in km (its 95% radius). */
  accuracyKm?: number;
}

/** "London Heathrow (LHR)", "Dubai International (DXB)". */
const label = (a: Airport): string => `${a.name.includes(a.city) ? a.name : `${a.city} ${a.name}`} (${a.code})`;
const round = (n: number, digits: number): number => Number(n.toFixed(digits));

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
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 60_000,
    });
  });
}

/** City, region and country for a position; {} when the lookup fails (offline, blocked, slow). */
async function placeAt(lat: number, lon: number, signal: AbortSignal): Promise<Pick<UserLocation, "city" | "region" | "country">> {
  try {
    const url = `${GEOCODE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(GEOCODE_TIMEOUT_MS)]) });
    if (!res.ok) return {};
    const place = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string; countryName?: string };
    return {
      city: place.city || place.locality || undefined,
      region: place.principalSubdivision || undefined,
      country: place.countryName || undefined,
    };
  } catch {
    return {};
  }
}

const placeName = (l: UserLocation): string => [l.city, l.region, l.country].filter(Boolean).join(", ");

export const getLocation = defineWebTool({
  id: "get_location",
  title: "Find where the user is",
  description:
    "Find where the user is: city, country, coordinates, and the nearest airports Skyline flies from (the browser asks them to allow their location). Use when the user wants to fly somewhere but didn't say where from. Next: search_flights with from set to the airport code it suggests; tell the user which airport you used.",
  inputSchema: z.object({}),
  annotations: { readOnlyHint: true },
  execute: async (_input, { signal }) => {
    const pos = await position(signal);
    if (pos) {
      const lat = round(pos.coords.latitude, 4);
      const lon = round(pos.coords.longitude, 4);
      const location: UserLocation = {
        source: "browser",
        ...(await placeAt(lat, lon, signal)),
        lat,
        lon,
        accuracyKm: round(pos.coords.accuracy / 1000, 1),
      };
      const near = nearestAirports({ lat, lon });
      const [first, ...others] = near;
      const where = placeName(location);
      const also = others.map((n) => `${n.airport.city} (${n.airport.code}) ${n.km} km`).join(", ");
      const nearest =
        first!.km > FAR_KM
          ? `Skyline doesn't fly from there: the nearest airport it flies from is ${label(first!.airport)}, about ${first!.km} km away, so check with the user before using it.`
          : `The nearest airport is ${label(first!.airport)}, about ${first!.km} km away.`;
      return {
        content: [
          {
            type: "text",
            text: `The user is ${where ? `in ${where} ` : ""}at ${lat}, ${lon} (accurate to about ${location.accuracyKm} km). ${nearest} Also near: ${also}. Use from: ${first!.airport.code} in search_flights.`,
          },
        ],
        structuredContent: {
          location,
          airports: near.map((n) => ({ code: n.airport.code, city: n.airport.city, km: n.km })),
        },
      };
    }

    // not shared: the time zone is a rough guess, without coordinates
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const city = tz.split("/").at(-1)?.replaceAll("_", " ");
    const guess = airportsInTimeZone(tz);
    if (guess.length === 0)
      throw new WebToolError(
        "needs_user",
        `The user's location isn't shared; their time zone (${tz}) suggests they're around ${city}, but Skyline doesn't fly from there. Ask them where they're flying from: ${AIRPORTS.map((a) => a.city).join(", ")}.`,
      );
    const location: UserLocation = { source: "timezone", city };
    return {
      content: [
        {
          type: "text",
          text: `The user's location isn't shared, so there are no coordinates, but their time zone (${tz}) suggests ${guess.map(label).join(" or ")}. Confirm with the user before searching from ${guess.length > 1 ? "one of these" : "it"}.`,
        },
      ],
      structuredContent: { location, airports: guess.map((a) => ({ code: a.code, city: a.city })) },
    };
  },
});
