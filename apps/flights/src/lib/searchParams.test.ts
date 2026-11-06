import { describe, expect, it } from "vitest";
import { addDays, formatDate, isIsoDate } from "./dates";
import { checkQuery, findAirport, fromResultsParams, toResultsPath } from "./searchParams";

const today = "2026-11-06";
const base = { from: "LHR", to: "DXB", trip: "oneway", cabin: "economy", adults: 1, children: 0, infants: 0, date: "2026-11-08" };

describe("results path", () => {
  it("round-trips through the URL, lowercase in the path, uppercase in the query", () => {
    const q = checkQuery({ ...base, trip: "roundtrip", returnDate: "2026-11-15", adults: 2, infants: 1 }, today);
    const path = toResultsPath(q);
    expect(path).toBe("/flights/lhr/dxb/roundtrip/economy/2/0/1/2026-11-08?return=2026-11-15");
    const [pathname, search] = path.split("?");
    const [, , from, to, trip, cabin, adults, children, infants, date] = pathname!.split("/");
    expect(fromResultsParams({ from, to, trip, cabin, adults, children, infants, date }, new URLSearchParams(search), today)).toEqual(q);
  });

  it("accepts codes, cities and 'City — CODE'", () => {
    expect(findAirport("lhr")?.code).toBe("LHR");
    expect(findAirport("Dubai")?.code).toBe("DXB");
    expect(findAirport("London — LHR")?.code).toBe("LHR");
    expect(findAirport("Heathrow (LHR)")?.code).toBe("LHR");
    expect(findAirport("Atlantis")).toBeUndefined();
  });
});

describe("checkQuery errors", () => {
  it.each([
    [{ to: "XXX" }, /Unknown airport "XXX"/],
    [{ to: "lhr" }, /same airport/],
    [{ date: "2026-11-05" }, /today \(2026-11-06\) or later/],
    [{ date: "8/11/2026" }, /YYYY-MM-DD/],
    [{ infants: 2, adults: 1 }, /Each infant needs an adult/],
    [{ adults: 0 }, /Adults must be a whole number from 1 to 9/],
    [{ trip: "roundtrip" }, /needs a returnDate/],
    [{ trip: "roundtrip", returnDate: "2026-11-07" }, /before the departure/],
    [{ cabin: "luxury" }, /Cabin must be/],
  ])("%o", (patch, message) => {
    expect(() => checkQuery({ ...base, ...patch }, today)).toThrow(message);
  });

  it("defaults trip, cabin and counts", () => {
    expect(checkQuery({ from: "lhr", to: "dxb", date: "2026-11-08" }, today)).toEqual(base);
  });
});

describe("dates", () => {
  it("adds days in UTC and validates real dates", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30"); // DST change in Europe
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(formatDate("2026-11-08")).toBe("Sun, 8 Nov 2026");
  });
});
