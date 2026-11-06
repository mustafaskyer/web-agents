# @web-agents/core

Show the person using a page what a WebMCP agent is doing: a ghost cursor that glides to
the tool, types the agent's values, clicks, and parks on a submit button while the browser
waits for confirmation. It is driven entirely by WebMCP lifecycle events, so **tools don't
know it exists**, and it gets out of the way the moment the user moves.

```sh
pnpm add @web-agents/core
```

```ts
import { installAgentVisuals, onAgentEvent } from "@web-agents/core";
import "@web-agents/core/cursor.css";

// Before your app renders, so imperative tools register through it.
const visuals = installAgentVisuals({ spotlight: true });

onAgentEvent((e) => console.debug("[agent]", e)); // start, fill, park, result, error, cancel, yield, resume
```

The one contract: the element a tool acts on carries `toolname="<unique tool name>"`.
Declarative forms already have it; imperative tools add it to their control.

Ships the WebMCP types as globals (`document.modelContext`, `SubmitEvent.agentInvoked`,
`respondWith`) and as named exports (`ModelContext`, `ModelContextTool`, …).

## Options

| Option | Default | |
|---|---|---|
| `sync` | `true` | Hold the agent's field values and submit until the cursor gets there, so the page reacts at the click. |
| `spotlight` | `false` | Blur and dim the page except the tool being worked in. `true` or `{ blur, dim, padding }`. |
| `yieldToUser` | `true` | Hide the cursor when the user interacts (see below). `false` or `{ moveThreshold, resumeAfter, ignore }`. |
| `linger` | `1200` | ms the cursor stays after a tool finishes. |
| `name` | `""` | Tag shown beside the cursor. |
| `log` | — | Receives every `AgentEvent` (same as `onAgentEvent`). |

`installAgentVisuals()` returns `{ setSpotlight, setYieldToUser, destroy }`.

## Yielding to the user

A real person always wins. When the user moves the mouse more than `moveThreshold` px
(default 6, so sensor jitter doesn't count), clicks, scrolls, touches or presses a key
(not a bare modifier), the cursor, its tag and the spotlight fade out in 80 ms, and every
pending step fast-forwards: moves arrive at once, typing writes the final value, and the
click that releases a held submit or gated `execute()` happens immediately. The tool still
completes and answers the agent; it just stops waiting for animations.

- Only trusted input counts. The agent's own fills (synthetic `input`/`change` events) never trigger it.
- While the browser waits for a confirmation click, the ring on that button stays, so the user knows where to confirm.
- After `resumeAfter` ms (default 800) without input, the next tool call shows the cursor again, entering from where the user's pointer was.
- Input inside an element with the `data-web-agents-ui` attribute (`UI_HOST_ATTR`), such as a devtools panel or chat widget, is ignored: the user is driving the agent from there. Change the selector with `ignore`.
- Emits `{ type: "yield", reason }` and `{ type: "resume" }`.

## Teardown

Every `installAgentVisuals()` call returns a handle; installs are shared and ref-counted.
When the last handle's `destroy()` runs, the layer removes its DOM nodes, listeners and
timers, restores `document.modelContext.registerTool`, and lets any in-flight tool finish
without animation. Importing the package never touches the DOM, and on the server
`installAgentVisuals()` returns a no-op handle.

## How it works: driven by events only

`installAgentVisuals()` subscribes to the WebMCP lifecycle and derives everything from
the DOM at that moment. Nothing is patched or wrapped:

| Signal                                              | Where                                                   | What the layer does                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `input`                                             | capture phase on `document`                             | timestamp each tool-form field as it changes; fields changed around a run's start are the agent's fill                               |
| `toolactivated`                                     | `document.modelContext` (Chrome ≥ 156; `window` before) | find `[toolname="<name>"]`, glide the cursor there                                                                                   |
| `:tool-submit-active` / `[data-tool-submit-active]` | the submit button                                       | replay the fields the browser filled, then **park** the cursor on the button: "click _Place order_ to confirm"                       |
| `submit` with `event.agentInvoked`                  | capture phase on `document`                             | replay fields (if not yet shown), move to the submit button, pulse; wrap `respondWith` so the agent's result waits for the animation |
| `toolcancel`                                        | `document.modelContext`                                 | clear highlights, hide the cursor                                                                                                    |

The one contract: the element a tool acts on carries `toolname="<unique tool name>"`.
Declarative forms already have it; imperative tools add it to their control.

## How the cursor moves

**In step with the page.** The browser runs an agent's action the instant it's called, so
a cursor that only animates afterwards always looks late. By default (`sync: true`) the
layer makes the page wait for the cursor instead, for every kind of tool:

| Tool kind                                 | What would happen immediately           | What the layer does                                                                                                                       |
| ----------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Declarative form                          | browser fills fields and fires `submit` | puts the old values back, types the agent's values when the cursor arrives, holds the `submit` and re-dispatches it at the cursor's click |
| Imperative tool with a `toolname` element | browser calls `execute()`               | `registerTool` is wrapped once at install: `execute` runs when the cursor presses that element                                            |
| Tool with no element on screen            | `execute()`                             | runs immediately, since there is nothing to show                                                                                          |

Tool code doesn't change and still answers the agent as before; it just runs at the
click, so the page updates in the same frame as the ripple. The agent's result arrives
after the cursor finishes, adding roughly 0.5 to 1 s. A gated `execute` is never held
for more than 2.5 s, and cancelling releases it. Pass `sync: false` to run everything
immediately and animate after the fact.

**For all tools to be in sync:** call `installAgentVisuals()` before any tool registers
(before your app renders), and give each tool's on-screen control `toolname="<tool name>"`.
An imperative tool registered before install, or without a `toolname` element, can't be
held.

**Motion.** One `requestAnimationFrame` loop drives everything:

- **Curved paths.** A target point travels an arc with a minimum-jerk profile (the curve
  human reaching follows). The visible arrow chases it on a near-critically-damped
  spring, so a new `moveTo` mid-flight bends the path instead of restarting it.
- **Fitts's-law timing.** Travel takes 180 to 650 ms depending on distance and target
  size. Every step awaits _arrival_, with no hard-coded waits.
- **Rocking at rest.** Once settled, the arrow sways ±9° around its tip at about 1 Hz,
  a little more while waiting for the user. It fades out the moment the cursor moves.
- **Anchored to the DOM, until the click.** On the way to an element, positions are
  re-read from it every frame, so the cursor rides along with scrolling and layout
  shifts. Once it clicks, it lets go: if the action moves things (a discount row pushes
  "Apply" down, an order empties the cart), the cursor stays where it clicked.
- **Reduced motion.** Under `prefers-reduced-motion` everything snaps and fades.

**Look.** A black multiplayer-style arrow with a white edge, so it reads on light and
dark surfaces. There's no label by default; pass `name: "…"` to show a tag beside it.
Tool status goes to a polite live region for screen readers. Colours are CSS custom
properties at the top of `@web-agents/core/cursor.css` (`--agent`, `--agent-ink`, `--agent-strong`).

**Spotlight (opt-in).** `installAgentVisuals({ spotlight: true })` blurs and dims the page
except the tool the cursor is working in (the nearest `[toolname]` element, e.g. a whole
product form), and the clear window glides from tool to tool. Tune it with
`spotlight: { blur: 4, dim: 0.08, padding: 12 }`. It never takes pointer events, so the
user can still click to confirm. Toggle it at runtime with the controller that
`installAgentVisuals` returns (`visuals.setSpotlight(false)`); the dev console has a
_Spotlight_ switch wired to it. The demo turns it on in `apps/playground/src/main.tsx`.

## What the browser does for you

- `form:tool-form-active` and `button:tool-submit-active` are native pseudo-classes —
  style them and you get agent feedback with zero JS.
- Omit `toolautosubmit` and the browser pauses on the submit button for the user. That
  _is_ the confirm gate: use it for orders, payments, deletions; add `toolautosubmit`
  for cheap reversible actions like add-to-cart.
- The schema comes from the form controls; `toolparamdescription` or the `<label>` text
  becomes each parameter's description.

## Trying it (apps/playground)

1. `pnpm dev` at the repo root, open the page.
2. In the agent console, run `add_to_cart_mug-01` with `{"qty":3}` → the cursor glides to
   the qty field, types `3`, moves to "Add to cart" and clicks; the cart updates on the
   click; the console logs the tool result.
3. Run `apply_promo` with `{"code":"123"}` → the cursor types the code and clicks
   "Apply"; the totals show 10% off. `123` is the only valid code: any other code shows
   an error under the field and the agent gets the same message. Once a code is applied
   the promo form (and the `apply_promo` tool) goes away; _Remove_ in the totals brings it back.
4. Run `place_order` (no arguments) → the cursor parks on "Place order · $total" with a
   _Click … to confirm_ prompt. Click the button yourself to complete (polyfill only: ✕ in
   the console cancels). The order uses the applied code, which is then used up.
   The button (and the `place_order` tool) only exists while the cart has items.

   A form that hides itself as a result of its own action waits ~0.5 s after answering
   (`apps/playground/src/tools/useAnswerGrace.ts`): Chrome cancels a call whose tool definition changes
   while it's still answering.
5. Run `clear_cart` → the imperative tool via `use-webmcp-tool`; the cursor still finds
   the button by its `toolname`.

Or from DevTools: `await agent.run("add_to_cart_tee-02", { qty: 2 })`.

## Notes and limits

- `toolactivated` carries only `toolName`, not arguments, and for declarative forms the
  browser fills the fields itself. The layer watches `input` events instead: fields that
  change around a run's start are the agent's. Their previous values come from a
  snapshot it refreshes every 400 ms while nothing is running.
- If Chrome rejects a fill (e.g. `qty` above `max`), it never submits. The layer closes
  that run after `linger` so the next call starts fresh.
- Event order differs. Native Chrome goes _fill → `submit` → `toolactivated`_; the
  polyfill goes _`toolactivated` → fill → `submit`_. The layer starts a run on
  whichever signal arrives first.
- Native `executeTool` takes the tool object from `getTools()` plus a JSON **string**
  of args, and resolves to a JSON string. Native `getTools()` also returns
  `inputSchema` as a string. The dev console handles both shapes, and so does the
  polyfill.
  Keystroke-by-keystroke typing is only possible for imperative tools, where `execute`
  receives the args.
- Imperative tools are synchronised by wrapping `registerTool`. This is the one place the
  layer patches anything, and only in `sync` mode.
- The polyfill mirrors the native pseudo-classes as `data-tool-form-active` /
  `data-tool-submit-active`; `@web-agents/core/cursor.css` styles both so the same stylesheet works with
  real Chrome.
- The API is still in preview: it moved from `navigator.modelContext` to
  `document.modelContext`, and event targets moved from `window` to `document.modelContext`
  in Chrome 156. `installAgentVisuals` feature-detects the event target.
