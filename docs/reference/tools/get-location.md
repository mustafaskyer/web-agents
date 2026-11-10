---
description: "The get_location tool: where the user is, from the browser's position when the user allows it."
---

# `getLocation`

The `get_location` tool: where the user is, from the browser's position when the user allows it. Reach for it when a tool needs "near me" or a route start the user did not say. The browser asks once; the tool says it is waiting on the person ([`waitingForUser`](../core/waiting-for-user.md)), so the agent's time limit does not fire while they decide.

## Import

```ts
import { getLocation } from "@webmcp-agents/tools";
import type {
  GetLocationOptions,
  LocationAnswer,
  Place,
  UserLocation,
} from "@webmcp-agents/tools";
```

## Example

Out of the box nothing leaves the browser: the answer is the coordinates plus what the browser knows (the time zone, the country of the user's language). Pass `lookup` to add a city, region and country from a service of your choice.

<include meta='title="tools/get-location.ts"'>/_examples/shared/reference/tools/get-location.ts</include>

## Input

### Parameters

None: the tool takes no input.

### Options

`getLocation(options?)` takes a `GetLocationOptions`, which extends the options every common tool takes (`id`, `description`).

| Name | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | `"get_location"` | The tool's name (`a-z A-Z 0-9 _ . -`, 1 to 128). |
| `description` | `string` | says it finds where the user is, to use it for "near me" or a route with no start, and to confirm a guess | What the agent reads to decide when to call it. |
| `lookup` | `(position: { lat: number; lon: number }, signal: AbortSignal) => Place \| undefined \| Promise<Place \| undefined>` | none | Name the place at a position: `{ city?, region?, country? }`. Called only after the user shared their location; the coordinates leave the browser only if your function sends them somewhere. A rejection or `undefined` answers without the names. With a `lookup` the tool is marked `external`. |
| `prompt` | `string` | `"Allow location access to continue"` | What the browser's permission prompt is waiting for, shown by the cursor and the chat while the person decides. |
| `timeoutMs` | `number` | `20000` | How long the browser may take to find the position, in ms. |

## Answer

A sentence for the agent, and `structuredContent.location`, a `UserLocation`:

- **Shared** (`source: "browser"`): `lat` and `lon` (4 decimals), `accuracyKm` (the browser's 95% radius), `timeZone`, `languageRegion` (the country of `navigator.language`, such as "France" for fr-FR), and `city`, `region`, `country` when your `lookup` gave them.
- **Not shared** (`source: "guess"`): no coordinates. `reason` is `denied`, `unsupported` (no Geolocation API) or `unavailable` (too slow, no fix, cancelled), and the time zone's city and the language's country are a guess. The text tells the agent to ask the user or confirm the guess.

## Notes

- Flags: `readOnly`, and `external` when `lookup` is given. The tool has no control, so it runs unseen. It does not fail: every refusal is an answer.
- When the permission is not granted yet, the tool parks with `prompt` before the browser asks, so the cursor and the chat show that it waits for the person. A permission that is already `denied` answers at once.
- The browser may reuse a position up to 60 s old, and the tool asks for high accuracy.
- A throw from `lookup` is swallowed: the coordinates still answer.

## See also

- [Common tools](../../build/common-tools.mdx), the page that teaches it
- [`waitingForUser`](../core/waiting-for-user.md)
- [`defineWebTool`](../core/define-web-tool.md)
