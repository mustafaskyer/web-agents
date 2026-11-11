/**
 * Where the user is likely flying from: the airports nearest a position, or the ones in a time zone. Pure (node-tested).
 */
import { AIRPORTS, type Airport } from "./flights";

/** An airport and how far it is from the user, in whole km. */
export interface NearbyAirport {
  airport: Airport;
  km: number;
}

const EARTH_KM = 6371;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in km (haversine). */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** The `count` airports nearest `at`, closest first. */
export function nearestAirports(at: { lat: number; lon: number }, count = 3): NearbyAirport[] {
  return AIRPORTS.map((airport) => ({ airport, km: Math.round(distanceKm(at, airport)) }))
    .sort((x, y) => x.km - y.km)
    .slice(0, count);
}

/** The airports in an IANA time zone (e.g. "America/New_York" → JFK, BOS). */
export const airportsInTimeZone = (tz: string): Airport[] => AIRPORTS.filter((a) => a.tz === tz);
