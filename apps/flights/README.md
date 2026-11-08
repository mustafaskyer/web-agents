# Skyline (`apps/flights`)

A flight-booking site on deterministic mock data (the same search always returns the same flights
and ids). Search, filter and sort the results, pick a flight, fill in the travelers and book: every
step is a WebMCP tool, and booking waits for the person's click.

```
pnpm --filter @web-agents/example-flights dev     # http://localhost:5175
pnpm --filter @web-agents/example-flights e2e     # Playwright, desktop + Pixel 7
```

Open the devtools (bottom right, Alt+Shift+A), or from the browser console:

```js
await agent.run("search_flights", { from: "LHR", to: "DXB", date: "2026-11-20" });
await agent.run("filter_results", { stops: "0" });
await agent.run("list_results", { limit: 3 });                 // ids for select_flight
await agent.run("select_flight", { flightId: "F-…" });
```

## Tools

| id | kind | on | confirm |
|---|---|---|---|
| `search_flights` | declarative | home and results pages | no |
| `get_booking` | `defineWebTool`, read-only | global | no |
| `get_location` | `defineWebTool`, read-only; city, region, country, coordinates and nearest airports. Location from the browser (asks once), city from BigDataCloud's free reverse geocoding (the coordinates leave the browser for that lookup), else a time-zone guess | global | no |
| `filter_results` | `defineWebTool` | results route | no |
| `sort_results` | `defineWebTool` | results route | no |
| `list_results` | `defineWebTool`, read-only | results route | no |
| `select_flight` | `defineWebTool` | results route | no |
| `fill_traveler_details` | declarative | booking page | no |
| `book_flight` | declarative | booking page | **yes**: the agent ticks the fare rules, the person clicks "Book flight" |

## Notes

- The search is the URL: `/flights/lhr/dxb/oneway/economy/1/0/0/2026-11-20?return=…`. A loader
  validates it; a bad URL renders a readable error, not a blank page.
- Searches pretend to take ~450 ms so the cursor is seen against skeletons. `?latency=0` turns that
  off for the session (the e2e tests do).
- Travelers are inline counters, not a popover: the agent fills real, visible fields.
- Bookings are kept in `localStorage`, the search in progress in `sessionStorage`.
