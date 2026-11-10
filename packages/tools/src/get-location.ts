/**
 * `get_location`: where the user is. From the browser's position when the user allows it: the browser asks once,
 * and the tool says it is waiting on them (`waitingForUser`), so an agent's time limit doesn't fire while they decide.
 * Out of the box nothing leaves the browser: the answer is the coordinates plus what the browser knows (the time
 * zone, the region of the user's language). Pass `lookup` to add a city, region and country (a reverse-geocoding
 * service of your choice); the tool is then marked `external`.
 *
 * Not shared (denied, unsupported, timed out): the time zone and the language's region are the best guess, and the
 * agent is told to confirm with the user.
 */
import { defineWebTool, waitingForUser, type WebTool } from "@webmcp-agents/core";
import type { CommonToolOptions } from "./shared";

/** A place's names, from your `lookup`. */
export interface Place {
  city?: string;
  region?: string;
  country?: string;
}

/** Options for `getLocation`. */
export interface GetLocationOptions extends CommonToolOptions {
  /**
   * Name the place at a position: city, region, country. Called only after the user shared their location; the
   * coordinates leave the browser only if your function sends them somewhere. A rejection or `undefined` answers
   * without the names. Default: none (coordinates and what the browser knows).
   *
   *   lookup: async ({ lat, lon }, signal) => (await fetch(`/api/place?lat=${lat}&lon=${lon}`, { signal })).json()
   */
  lookup?(position: { lat: number; lon: number }, signal: AbortSignal): Promise<Place | undefined> | Place | undefined;
  /** What the browser's permission prompt is waiting for, shown by the cursor. Default "Allow location access to continue". */
  prompt?: string;
  /** How long the browser may take to find the position, in ms. Default 20 000. */
  timeoutMs?: number;
}

/** Where the user is, as far as the tool could tell (`structuredContent.location`). */
export interface UserLocation extends Place {
  /** `browser`: the device's position; `guess`: from the time zone and language only (no coordinates). */
  source: "browser" | "guess";
  /** Why there is no position, when `source` is `guess`. */
  reason?: "denied" | "unsupported" | "unavailable";
  lat?: number;
  lon?: number;
  /** How far off the position may be, in km (the browser's 95% radius). */
  accuracyKm?: number;
  /** The IANA time zone, e.g. "Europe/Paris". */
  timeZone: string;
  /** The country of the user's language, e.g. "France" for fr-FR, when the language names one. */
  languageRegion?: string;
}

/** What the tool answers: a sentence for the agent, `structuredContent.location` for code. */
export interface LocationAnswer {
  content: [{ type: "text"; text: string }];
  structuredContent: { location: UserLocation };
}

const DESCRIPTION =
  "Find where the user is: coordinates (and the place's name when the site can look it up), their time zone and their language's country; the browser asks the user to allow their location first. Use when the user asks for something near them, or for a place or route they didn't say where from. Needs nothing first. Next: use the place or coordinates in the tool that needs them; if it is only a guess, confirm it with the user.";

const round = (n: number, digits: number): number => Number(n.toFixed(digits));

/** The browser's position, or why there is none (denied, no API, unavailable, too slow, cancelled). */
async function position(
  tool: string,
  prompt: string,
  timeout: number,
  signal: AbortSignal,
): Promise<GeolocationPosition | NonNullable<UserLocation["reason"]>> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
  const state = await navigator.permissions
    ?.query({ name: "geolocation" })
    .then((s) => s.state)
    .catch(() => "prompt" as const);
  if (state === "denied") return "denied";
  // the browser will ask: the agent's clock must not run out while the person decides
  if (state !== "granted") waitingForUser(tool, prompt);
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve("unavailable"), { once: true });
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => resolve(err.code === 1 ? "denied" : "unavailable"), // 1: PERMISSION_DENIED
      { enableHighAccuracy: true, timeout, maximumAge: 60_000 },
    );
  });
}

/** The country of the user's language ("France" for fr-FR), when it names one. */
function languageRegion(): string | undefined {
  try {
    const lang = typeof navigator === "undefined" ? undefined : navigator.language;
    const region = lang && new Intl.Locale(lang).region;
    return region ? (new Intl.DisplayNames(["en"], { type: "region" }).of(region) ?? undefined) : undefined;
  } catch {
    return undefined;
  }
}

const placeName = (l: Place): string => [l.city, l.region, l.country].filter(Boolean).join(", ");

const WHY: Record<NonNullable<UserLocation["reason"]>, string> = {
  denied: "The user didn't allow their location",
  unsupported: "This browser can't share a location",
  unavailable: "The browser couldn't find the user's location",
};

/** The `get_location` tool: the user's position after the browser's permission prompt. Read-only. */
export function getLocation({
  id = "get_location",
  description = DESCRIPTION,
  lookup,
  prompt = "Allow location access to continue",
  timeoutMs = 20_000,
}: GetLocationOptions = {}): WebTool<Record<string, never>, LocationAnswer> {
  return defineWebTool<Record<string, never>, LocationAnswer>({
    id,
    title: "Find where the user is",
    description,
    inputSchema: { type: "object", properties: {} },
    readOnly: true,
    external: lookup ? true : undefined,
    execute: async (_input, { signal }) => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fromLanguage = languageRegion();
      const pos = await position(id, prompt, timeoutMs, signal);
      if (typeof pos !== "string") {
        const lat = round(pos.coords.latitude, 4);
        const lon = round(pos.coords.longitude, 4);
        let place: Place = {};
        try {
          place = (await lookup?.({ lat, lon }, signal)) ?? {};
        } catch {
          // offline, blocked, slow: the coordinates still answer
        }
        const { city, region, country } = place;
        const location: UserLocation = {
          source: "browser",
          ...(city && { city }),
          ...(region && { region }),
          ...(country && { country }),
          lat,
          lon,
          accuracyKm: round(pos.coords.accuracy / 1000, 1),
          timeZone,
          ...(fromLanguage && { languageRegion: fromLanguage }),
        };
        const where = placeName(location);
        return {
          content: [
            {
              type: "text",
              text: `The user is ${where ? `in ${where}, ` : ""}at ${lat}, ${lon} (accurate to about ${location.accuracyKm} km; time zone ${timeZone}).`,
            },
          ],
          structuredContent: { location },
        };
      }

      // not shared: the time zone's city and the language's country are a guess, without coordinates
      const city = timeZone.includes("/") ? timeZone.split("/").at(-1)?.replaceAll("_", " ") : undefined;
      const location: UserLocation = {
        source: "guess",
        reason: pos,
        timeZone,
        ...(fromLanguage && { languageRegion: fromLanguage }),
      };
      const hints = [
        city && `their time zone (${timeZone}) suggests around ${city}`,
        fromLanguage && `their language suggests ${fromLanguage}`,
      ]
        .filter(Boolean)
        .join(", and ");
      return {
        content: [
          {
            type: "text",
            text: `${WHY[pos]}, so there are no coordinates.${hints ? ` As a guess, ${hints}.` : ""} Ask the user where they are, or confirm the guess with them.`,
          },
        ],
        structuredContent: { location },
      };
    },
  });
}
