import { describe, expect, it } from "vitest";
import {
  AIRLINES,
  airlineCodes,
  applyFilters,
  arrivalDayOffset,
  clock,
  type FlightQuery,
  generateFlights,
  money,
  type SORTS,
  sortFlights,
} from "./flights";

const q: FlightQuery = { from: "LHR", to: "DXB", trip: "oneway", cabin: "economy", adults: 1, children: 0, infants: 0, date: "2026-11-08" };

describe("generateFlights", () => {
  it("is deterministic per query", () => {
    expect(generateFlights(q)).toEqual(generateFlights({ ...q }));
    expect(generateFlights({ ...q, from: "lhr" })).toEqual(generateFlights(q));
  });

  it("changes with the date", () => {
    expect(generateFlights({ ...q, date: "2026-11-09" })).not.toEqual(generateFlights(q));
  });

  it("returns 24–60 flights with unique ids, in the requested cabin", () => {
    for (const date of ["2026-11-08", "2026-12-01", "2027-01-15"]) {
      const flights = generateFlights({ ...q, date, cabin: "business" });
      expect(flights.length).toBeGreaterThanOrEqual(24);
      expect(flights.length).toBeLessThanOrEqual(60);
      expect(new Set(flights.map((f) => f.id)).size).toBe(flights.length);
      expect(flights.every((f) => f.cabin === "business")).toBe(true);
    }
  });

  it("has positive durations, stop codes matching stops, and sane prices", () => {
    for (const f of generateFlights(q)) {
      expect(f.durationMin).toBeGreaterThan(0);
      expect(f.stopCodes).toHaveLength(f.stops);
      expect(f.stopCodes).not.toContain("LHR");
      expect(f.price).toBeGreaterThan(0);
      expect(arrivalDayOffset(f)).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns nothing for an unknown airport", () => {
    expect(generateFlights({ ...q, to: "XXX" })).toEqual([]);
  });
});

describe("filters and sorts", () => {
  const flights = generateFlights(q);

  it("filters by stops", () => {
    const direct = applyFilters(flights, { stops: 0 });
    expect(direct.length).toBeGreaterThan(0);
    expect(direct.every((f) => f.stops === 0)).toBe(true);
    expect(applyFilters(flights, { stops: "any" })).toHaveLength(flights.length);
  });

  it("filters by airline name or code, case-insensitively", () => {
    const code = flights[0]!.airline;
    const name = AIRLINES.find((a) => a.code === code)!.name;
    const byName = applyFilters(flights, { airlines: [name.toUpperCase()] });
    expect(byName.length).toBeGreaterThan(0);
    expect(byName.every((f) => f.airline === code)).toBe(true);
    expect(applyFilters(flights, { airlines: [code.toLowerCase()] })).toEqual(byName);
    expect(() => airlineCodes(["Nope Air"])).toThrow(/Unknown airline: Nope Air/);
  });

  it("sorts every way", () => {
    const by = (key: (typeof SORTS)[number]) => sortFlights(flights, key);
    const ascending = (xs: number[]) => xs.every((x, i) => i === 0 || xs[i - 1]! <= x);
    expect(ascending(by("price-asc").map((f) => f.price))).toBe(true);
    expect(ascending(by("price-desc").map((f) => -f.price))).toBe(true);
    expect(ascending(by("duration").map((f) => f.durationMin))).toBe(true);
    expect(ascending(by("depart").map((f) => f.departMin))).toBe(true);
    expect(by("price-asc")).toHaveLength(flights.length);
  });
});

describe("formatting", () => {
  it("formats money and clock times", () => {
    expect(money(16110)).toBe("USD 161.10");
    expect(clock(450)).toBe("07:30");
    expect(clock(1500)).toBe("01:00");
  });
});
