/**
 * get_location, on every page: where the user is and their nearest airports, so "book me a flight to Dubai" needs no
 * "from where?". A small Skyline tool on top of the common `getLocation` from @webmcp-agents/tools, which asks the
 * browser (the browser asks the user once; the tool says it's waiting on them, so the agent's time limit doesn't fire)
 * and names the place with `lookup`. What is Skyline's own: the airports it flies from, near that place.
 *
 * The city comes from BigDataCloud's free reverse-geocoding endpoint (no key): the coordinates leave the browser for
 * that one lookup, and without it the answer still has them. Location not shared: a guess from the time zone. No
 * guess: ask the user. The answer is text for the model and `structuredContent.location` / `.airports` for code.
 */
import { defineWebTool, WebToolError } from "@webmcp-agents/react";
import { getLocation as browserLocation, type Place } from "@webmcp-agents/tools";
import { AIRPORTS, type Airport } from "../data/flights";
import { airportsInTimeZone, nearestAirports } from "../data/location";

/** Past this, the nearest airport is far enough that the agent should check with the user. */
const FAR_KM = 300;
const GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const GEOCODE_TIMEOUT_MS = 5000;

/** City, region and country for a position; undefined when the lookup fails (offline, blocked, slow). */
async function placeAt({ lat, lon }: { lat: number; lon: number }, signal: AbortSignal): Promise<Place | undefined> {
  const url = `${GEOCODE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
  const res = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(GEOCODE_TIMEOUT_MS)]) });
  if (!res.ok) return undefined;
  const place = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string; countryName?: string };
  return {
    city: place.city || place.locality || undefined,
    region: place.principalSubdivision || undefined,
    country: place.countryName || undefined,
  };
}

/** The browser's part: position, permission prompt and the place's name. Not registered itself. */
const whereabouts = browserLocation({ lookup: placeAt, prompt: "Allow location access to find your nearest airport" });

/** "London Heathrow (LHR)", "Dubai International (DXB)". */
const label = (a: Airport): string => `${a.name.includes(a.city) ? a.name : `${a.city} ${a.name}`} (${a.code})`;
const placeName = (l: Place): string => [l.city, l.region, l.country].filter(Boolean).join(", ");

export const getLocation = defineWebTool({
  id: "get_location",
  title: "Find where the user is",
  description:
    "Find where the user is: city, country, coordinates, and the nearest airports Skyline flies from (the browser asks them to allow their location). Use when the user wants to fly somewhere but didn't say where from. Next: search_flights with from set to the airport code it suggests; tell the user which airport you used.",
  readOnly: true,
  external: true,
  execute: async (_input, ctx) => {
    const { location } = (await whereabouts.execute({}, ctx)).structuredContent;
    const { lat, lon, timeZone } = location;
    if (lat !== undefined && lon !== undefined) {
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
        structuredContent: { location, airports: near.map((n) => ({ code: n.airport.code, city: n.airport.city, km: n.km })) },
      };
    }

    // not shared: the time zone is a rough guess, without coordinates
    const city = timeZone.split("/").at(-1)?.replaceAll("_", " ");
    const guess = airportsInTimeZone(timeZone);
    if (guess.length === 0)
      throw new WebToolError(
        "needs_user",
        `The user's location isn't shared; their time zone (${timeZone}) suggests they're around ${city}, but Skyline doesn't fly from there. Ask them where they're flying from: ${AIRPORTS.map((a) => a.city).join(", ")}.`,
      );
    return {
      content: [
        {
          type: "text",
          text: `The user's location isn't shared, so there are no coordinates, but their time zone (${timeZone}) suggests ${guess.map(label).join(" or ")}. Confirm with the user before searching from ${guess.length > 1 ? "one of these" : "it"}.`,
        },
      ],
      structuredContent: { location, airports: guess.map((a) => ({ code: a.code, city: a.city })) },
    };
  },
});
