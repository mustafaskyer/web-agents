# Skyline (`apps/flights`)

A flight-booking site on deterministic mock data (the same search always returns the same flights
and ids). Search, filter and sort the results, pick a flight, fill in the travelers and book: every
step is a WebMCP tool, and booking waits for the person's click.

```
pnpm --filter @webmcp-agents/example-flights dev     # http://localhost:5175
pnpm --filter @webmcp-agents/example-flights e2e     # Playwright, desktop + Pixel 7
```

Open the devtools (bottom right, Alt+Shift+A), or from the browser console:

```js
await agent.invoke("search_flights", { from: "RUH", to: "DXB", date: "2027-03-12" });
await agent.invoke("filter_results", { stops: "0" });
await agent.invoke("list_results", { limit: 3 });                 // ids for select_flight
await agent.invoke("select_flight", { flightId: "F-…" });
```

## Tools

| id | where | on | confirm |
|---|---|---|---|
| `search_flights` | `useWebTool` + React Hook Form (types into every field) | home and results pages | no |
| `get_booking` | catalog, read-only | everywhere | no |
| `get_location` | catalog, read-only: the common `getLocation` from `@webmcp-agents/tools` with a `lookup` (BigDataCloud's free reverse geocoding: the coordinates leave the browser for it), plus Skyline's nearest airports; else a time-zone guess | everywhere | no |
| `get_time` | catalog: the common `getTime()` from `@webmcp-agents/tools` with Skyline's description (dates as YYYY-MM-DD for search_flights) | everywhere | no |
| `filter_results` | catalog, `match` (ticks the stops radio; on a phone, the Filters button) | a results page | no |
| `sort_results` | catalog, `match` (that sort's button) | a results page | no |
| `list_results` | catalog, `match`, read-only | a results page | no |
| `select_flight` | catalog, `match` (that flight's own Select button) | a results page | no |
| `fill_traveler_details` | `useWebTool` + **TanStack Form** | the booking page | no |
| `book_flight` | `useWebTool` + React Hook Form, `fill` | the booking page | **yes**: the cursor ticks the fare rules and parks on "Book flight" until the person clicks |

## Notes

- The provider line is `<WebAgentsProvider tools={tools}>`. The results tools say where they are on themselves
  (`match: RESULTS_PATTERN`); the library follows the URL, so nothing comes from React Router.
- Nothing in the markup is for the cursor: a tool finds its control by its `title` ("Search flights", "Book flight")
  or by a locator `target` built from the call (`{ role: "button", name: "Select Meridian MR 210" }`), and types each
  parameter into the field with that `name`. The devtools' Tools tab shows what each tool resolves to.
- The booking store is outside React (`src/store/booking.ts`): components read it with `useBooking()`, catalog tools
  import it, and tools navigate with the router's own `router.navigate` (`src/lib/navigate.ts`). `search_flights` puts
  the search in the store before it navigates: the results tools turn on with the URL, before the results page renders.
- The search is the URL: `/flights/lhr/dxb/oneway/economy/1/0/0/2026-11-20?return=…`. A loader
  validates it; a bad URL renders a readable error, not a blank page.
- Searches pretend to take ~450 ms so the cursor is seen against skeletons. `?latency=0` turns that
  off for the session (the e2e tests do).
- Travelers are inline counters, not a popover: the agent fills real, visible fields.
- Bookings are kept in `localStorage`, the search in progress in `sessionStorage`.
