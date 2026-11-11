import { type AgentEvent, onAgentEvent, type WebToolContext } from "@webmcp-agents/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calendarAt, DEFAULT_WEEK, weekOf } from "./calendar";
import { getLocation, getPage, getTime, goBack, goTo, scrollTo, setTheme } from "./index";

const ctx = (): WebToolContext => ({ signal: new AbortController().signal, source: "test" });

describe("calendarAt: relative dates by the locale's week", () => {
  // Wednesday 11 November 2026, local time
  const wed = new Date(2026, 10, 11, 9, 30);

  it("a Monday-first week with a Saturday–Sunday weekend (en-GB)", () => {
    const cal = calendarAt(wed, { firstDay: 1, weekend: [6, 7] });
    expect(cal.today).toEqual({ date: "2026-11-11", weekday: "Wed" });
    expect(cal.tomorrow).toEqual({ date: "2026-11-12", weekday: "Thu" });
    expect(cal.weekend).toEqual({ start: "2026-11-14", end: "2026-11-15" });
    expect(cal.nextWeek).toEqual({ start: "2026-11-16", end: "2026-11-22" });
    expect(cal.upcoming).toHaveLength(14);
    expect(cal.upcoming[1]).toEqual({ date: "2026-11-13", weekday: "Fri" });
  });

  it("a Sunday-first week (en-US) starts next week on Sunday", () => {
    expect(calendarAt(wed, { firstDay: 7, weekend: [6, 7] }).nextWeek).toEqual({ start: "2026-11-15", end: "2026-11-21" });
  });

  it("a Friday–Saturday weekend (ar-SA) and a Friday-only one (fa-IR)", () => {
    expect(calendarAt(wed, { firstDay: 7, weekend: [5, 6] }).weekend).toEqual({ start: "2026-11-13", end: "2026-11-14" });
    expect(calendarAt(wed, { firstDay: 6, weekend: [5] }).weekend).toEqual({ start: "2026-11-13", end: "2026-11-13" });
    expect(calendarAt(wed, { firstDay: 6, weekend: [5] }).nextWeek).toEqual({ start: "2026-11-14", end: "2026-11-20" });
  });

  it("on the weekend, this weekend is the current one, also on its second day", () => {
    expect(calendarAt(new Date(2026, 10, 14), DEFAULT_WEEK).weekend).toEqual({ start: "2026-11-14", end: "2026-11-15" });
    expect(calendarAt(new Date(2026, 10, 15), DEFAULT_WEEK).weekend).toEqual({ start: "2026-11-14", end: "2026-11-15" });
    // a month and a year turn over
    expect(calendarAt(new Date(2026, 11, 31), DEFAULT_WEEK).tomorrow).toEqual({ date: "2027-01-01", weekday: "Fri" });
  });

  it("weekOf reads the locale's week where the runtime knows it", () => {
    const known = !!(new Intl.Locale("en-US") as { getWeekInfo?: unknown; weekInfo?: unknown }).getWeekInfo;
    if (known) {
      expect(weekOf("en-US")).toEqual({ firstDay: 7, weekend: [6, 7] });
      expect(weekOf("en-GB")).toEqual({ firstDay: 1, weekend: [6, 7] });
    }
    expect(weekOf("not a locale!")).toEqual(DEFAULT_WEEK);
  });
});

describe("get_time", () => {
  afterEach(() => vi.useRealTimers());

  it("answers the date, tomorrow and next week for the given locale, one fact per line", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 11, 9, 30) });
    const answer = await getTime({ locale: "en-US" }).run({}, ctx());
    const text = answer.content[0].text;
    expect(text).toContain("Today: 2026-11-11 (Wed)");
    expect(text).toContain("Tomorrow: 2026-11-12 (Thu)");
    expect(text).toContain("This weekend: 2026-11-14 to 2026-11-15");
    expect(text).toMatch(/^Now: 09:30 on Wed 2026-11-11 for the user/);
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}\.$/m); // no full stop after a date
    expect(answer.structuredContent).toMatchObject({ locale: "en-US", today: { date: "2026-11-11" }, time: "09:30" });
    if (weekOf("en-US").firstDay === 7) expect(text).toContain("Next week: 2026-11-15 to 2026-11-21 (weeks start on Sunday for en-US)");
  });
});

describe("get_location", () => {
  afterEach(() => vi.unstubAllGlobals());

  const geo = (
    permission: PermissionState | "throws",
    position?: { latitude: number; longitude: number; accuracy: number } | { code: number },
  ) => {
    const getCurrentPosition = vi.fn((ok: PositionCallback, fail: PositionErrorCallback) => {
      if (position && "latitude" in position) ok({ coords: position } as GeolocationPosition);
      else fail({ code: position?.code ?? 2 } as GeolocationPositionError);
    });
    vi.stubGlobal("navigator", {
      language: "fr-FR",
      geolocation: { getCurrentPosition },
      permissions: {
        query: permission === "throws" ? () => Promise.reject(new Error("no")) : () => Promise.resolve({ state: permission }),
      },
    });
    return getCurrentPosition;
  };

  it("granted: the coordinates and what the browser knows; no network, so not external", async () => {
    geo("granted", { latitude: 48.85661, longitude: 2.35222, accuracy: 1500 });
    const tool = getLocation();
    expect(tool.readOnly).toBe(true);
    expect(tool.external).toBeUndefined();
    const answer = await tool.run({}, ctx());
    expect(answer.structuredContent.location).toMatchObject({
      source: "browser",
      lat: 48.8566,
      lon: 2.3522,
      accuracyKm: 1.5,
      languageRegion: "France",
    });
    expect(answer.structuredContent.location.city).toBeUndefined();
    expect(answer.content[0].text).toMatch(/^The user is at 48.8566, 2.3522 \(accurate to about 1.5 km; time zone /);
  });

  it("with a lookup: city, region and country, and the tool is external", async () => {
    geo("granted", { latitude: 48.8566, longitude: 2.3522, accuracy: 20 });
    const lookup = vi.fn(async () => ({ city: "Paris", region: "Île-de-France", country: "France" }));
    const tool = getLocation({ lookup });
    expect(tool.external).toBe(true);
    const answer = await tool.run({}, ctx());
    expect(lookup).toHaveBeenCalledWith({ lat: 48.8566, lon: 2.3522 }, expect.any(AbortSignal));
    expect(answer.content[0].text).toMatch(/^The user is in Paris, Île-de-France, France, at 48.8566, 2.3522/);
    // a failing lookup still answers with the coordinates
    const failing = await getLocation({ lookup: () => Promise.reject(new Error("offline")) }).run({}, ctx());
    expect(failing.structuredContent.location).toMatchObject({ source: "browser", lat: 48.8566 });
  });

  it("asks first: the call says it waits for the user while the browser's prompt is open", async () => {
    geo("prompt", { latitude: 1, longitude: 2, accuracy: 10 });
    const events: AgentEvent[] = [];
    const off = onAgentEvent((e) => events.push(e));
    await getLocation({ id: "where_am_i", prompt: "Allow location to find stores near you" }).run({}, ctx());
    off();
    expect(events).toContainEqual({ type: "park", tool: "where_am_i", prompt: "Allow location to find stores near you" });
  });

  it("denied (by the permission, or at the prompt): a guess from the time zone and language, no coordinates", async () => {
    const asked = geo("denied");
    const answer = await getLocation().run({}, ctx());
    expect(asked).not.toHaveBeenCalled();
    expect(answer.structuredContent.location).toMatchObject({ source: "guess", reason: "denied", languageRegion: "France" });
    expect(answer.structuredContent.location.lat).toBeUndefined();
    expect(answer.content[0].text).toMatch(/^The user didn't allow their location, so there are no coordinates\..*Ask the user/);

    geo("prompt", { code: 1 });
    expect((await getLocation().run({}, ctx())).structuredContent.location.reason).toBe("denied");
  });

  it("unsupported: no geolocation API", async () => {
    vi.stubGlobal("navigator", { language: "en" });
    const answer = await getLocation().run({}, ctx());
    expect(answer.structuredContent.location).toMatchObject({ source: "guess", reason: "unsupported" });
    expect(answer.content[0].text).toMatch(/^This browser can't share a location/);
  });
});

describe("the factories", () => {
  it("ids, flags and overrides", () => {
    const pages = { home: "/" };
    expect([getTime(), getLocation(), getPage(), goTo({ pages }), goBack(), scrollTo(), setTheme()].map((t) => t.id)).toEqual([
      "get_time",
      "get_location",
      "get_page",
      "go_to",
      "go_back",
      "scroll_to",
      "set_theme",
    ]);
    // readOnly on the three readers only
    expect([getTime(), getLocation(), getPage()].every((t) => t.readOnly === true)).toBe(true);
    expect([goTo({ pages }), goBack(), scrollTo(), setTheme()].map((t) => t.readOnly)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    const custom = getTime({ id: "what_time", description: "Our own words." });
    expect(custom).toMatchObject({ id: "what_time", description: "Our own words." });
    expect(goTo({ pages: { cart: "/cart", orders: "/orders" } }).description).toContain("cart (/cart), orders (/orders)");
    expect(goTo({ pages: { cart: "/cart" } }).jsonSchema).toMatchObject({ properties: { page: { enum: ["cart"] } }, required: ["page"] });
  });

  it("goTo needs pages; an invalid id is refused like any tool", () => {
    expect(() => goTo({ pages: {} })).toThrow(/pass the pages/);
    expect(() => goTo({ pages: { cart: 1 as never } })).toThrow(/must be a string/);
    expect(() => getPage({ id: "bad id" })).toThrow(TypeError);
  });

  it("imports without a DOM and defines without touching it", () => {
    expect(typeof document).toBe("undefined");
    expect(() => [getPage(), scrollTo(), setTheme(), goBack(), goTo({ pages: { home: "/" } })]).not.toThrow();
  });
});
