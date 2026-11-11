import { describe, expect, it } from "vitest";
import { airportsInTimeZone, distanceKm, nearestAirports } from "./location";

describe("where the user flies from", () => {
  it("measures great-circle distance", () => {
    // London → New York is about 5,570 km
    expect(Math.round(distanceKm({ lat: 51.5, lon: -0.13 }, { lat: 40.71, lon: -74.01 }) / 10) * 10).toBe(5570);
  });

  it("finds the nearest airports, closest first", () => {
    const near = nearestAirports({ lat: 30.04, lon: 31.24 }); // central Cairo
    expect(near[0]).toMatchObject({ airport: { code: "CAI" } });
    expect(near[0]!.km).toBeLessThan(30);
    expect(near).toHaveLength(3);
    expect(near[1]!.km).toBeGreaterThanOrEqual(near[0]!.km);
  });

  it("guesses airports from a time zone", () => {
    expect(airportsInTimeZone("America/New_York").map((a) => a.code)).toEqual(["JFK", "BOS"]);
    expect(airportsInTimeZone("Europe/Lisbon")).toEqual([]);
  });
});
