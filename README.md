# WebMCP agent cursor

A storefront where every action is a WebMCP tool, plus a visual layer that shows the
end user what the agent is doing — a ghost cursor, field highlights, a parked "waiting
for your confirmation" state — **without the tools knowing it exists**.

```
npm install
npm run dev        # http://localhost:5173 — open the "Agent console" bottom-right and hit Run
npm run typecheck  # tsc, strict
```

TypeScript throughout. The WebMCP surface (`document.modelContext`, `toolactivated`,
`SubmitEvent.agentInvoked` / `respondWith`, and the `toolname` / `toolautosubmit` /
`toolparamdescription` JSX attributes) is typed in `src/types/webmcp.d.ts`.

Works in any browser today thanks to a dev-only polyfill of `document.modelContext`.
In a Chrome build with native WebMCP the polyfill steps aside and the same code runs
against the real API.

## The three layers

```
src/
  tools/              ← PURE. No cursor code anywhere.
    AddToCartForm.tsx    declarative <form toolname="add_to_cart_<sku>" toolautosubmit>
    ApplyPromoForm.tsx   declarative <form toolname="apply_promo" toolautosubmit>   (only "123" is valid)
    CheckoutForm.tsx     declarative <form toolname="place_order">   (no fields, no autosubmit → browser pauses)
    ClearCartButton.tsx  imperative useWebMCP({ name: "clear_cart" }) + <button toolname="clear_cart">
  agent-visuals/      ← OUR LOGIC. Event-driven, installed once, never imports a tool.
    index.ts             installAgentVisuals(): lifecycle events → choreography
    cursor.ts            ghost cursor: moveTo / say / highlight / flash / click / park / hide
    motion.ts            springs, arc paths, minimum-jerk timing, Fitts's-law durations
    cursor.css           cursor, label, focus ring + :tool-form-active / :tool-submit-active styles
  types/webmcp.d.ts   ← ambient WebMCP + JSX attribute types
  store.tsx           ← app state (cart)
dev/                  ← dev only
  webmcp-polyfill.ts   document.modelContext + declarative forms + lifecycle events
  agent-console.ts     floating panel that plays the agent (window.agent.run(name, args))
```

### 1. Tools are plain WebMCP

A declarative tool is just a form with two attributes. Its submit handler answers the
agent through `respondWith`:

```jsx
<form toolname={`add_to_cart_${sku}`} tooldescription="Add … to the cart" toolautosubmit="" onSubmit={onSubmit}>
  <input name="qty" type="number" min="1" toolparamdescription="How many to add" />
  <button type="submit">Add to cart</button>
</form>

function onSubmit(e) {
  e.preventDefault();
  const result = Promise.resolve(cart.add(sku, qty));
  if (e.nativeEvent.agentInvoked) e.nativeEvent.respondWith(result);
}
```

An imperative tool (via `use-webmcp-tool`) is just a hook; the only link to the visual
layer is the `toolname` attribute on the element it acts on:

```jsx
useWebMCP({ name: "clear_cart", description: "…", execute: () => cart.clear() });
<button toolname="clear_cart" onClick={cart.clear}>Clear cart</button>
```

### 2. The visual layer is driven by events only

`installAgentVisuals()` subscribes to the WebMCP lifecycle and derives everything from
the DOM at that moment. Nothing is patched or wrapped:

| Signal | Where | What the layer does |
|---|---|---|
| `input` | capture phase on `document` | timestamp each tool-form field as it changes; fields changed around a run's start are the agent's fill |
| `toolactivated` | `document.modelContext` (Chrome ≥ 156; `window` before) | find `[toolname="<name>"]`, glide the cursor there |
| `:tool-submit-active` / `[data-tool-submit-active]` | the submit button | replay the fields the browser filled, then **park** the cursor on the button: "click *Place order* to confirm" |
| `submit` with `event.agentInvoked` | capture phase on `document` | replay fields (if not yet shown), move to the submit button, pulse; wrap `respondWith` so the agent's result waits for the animation |
| `toolcancel` | `document.modelContext` | clear highlights, hide the cursor |

The one contract: the element a tool acts on carries `toolname="<unique tool name>"`.
Declarative forms already have it; imperative tools add it to their control.

### 3. How the cursor moves

**In step with the page.** The browser runs an agent's action the instant it's called, so
a cursor that only animates afterwards always looks late. By default (`sync: true`) the
layer makes the page wait for the cursor instead, for every kind of tool:

| Tool kind | What would happen immediately | What the layer does |
|---|---|---|
| Declarative form | browser fills fields and fires `submit` | puts the old values back, types the agent's values when the cursor arrives, holds the `submit` and re-dispatches it at the cursor's click |
| Imperative tool with a `toolname` element | browser calls `execute()` | `registerTool` is wrapped once at install: `execute` runs when the cursor presses that element |
| Tool with no element on screen | `execute()` | runs immediately, since there is nothing to show |

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
  size. Every step awaits *arrival*, with no hard-coded waits.
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
properties at the top of `cursor.css` (`--agent`, `--agent-ink`, `--agent-strong`).

**Spotlight (opt-in).** `installAgentVisuals({ spotlight: true })` blurs and dims the page
except the tool the cursor is working in (the nearest `[toolname]` element, e.g. a whole
product form), and the clear window glides from tool to tool. Tune it with
`spotlight: { blur: 4, dim: 0.08, padding: 12 }`. It never takes pointer events, so the
user can still click to confirm. Toggle it at runtime with the controller that
`installAgentVisuals` returns (`visuals.setSpotlight(false)`); the dev console has a
*Spotlight* switch wired to it. The demo turns it on in `src/main.tsx`.

### 4. What the browser does for you

- `form:tool-form-active` and `button:tool-submit-active` are native pseudo-classes —
  style them and you get agent feedback with zero JS.
- Omit `toolautosubmit` and the browser pauses on the submit button for the user. That
  *is* the confirm gate: use it for orders, payments, deletions; add `toolautosubmit`
  for cheap reversible actions like add-to-cart.
- The schema comes from the form controls; `toolparamdescription` or the `<label>` text
  becomes each parameter's description.

## Trying it

1. `npm run dev`, open the page.
2. In the agent console, run `add_to_cart_mug-01` with `{"qty":3}` → the cursor glides to
   the qty field, types `3`, moves to "Add to cart" and clicks; the cart updates on the
   click; the console logs the tool result.
3. Run `apply_promo` with `{"code":"123"}` → the cursor types the code and clicks
   "Apply"; the totals show 10% off. `123` is the only valid code: any other code shows
   an error under the field and the agent gets the same message. Once a code is applied
   the promo form (and the `apply_promo` tool) goes away; *Remove* in the totals brings it back.
4. Run `place_order` (no arguments) → the cursor parks on "Place order · $total" with a
   *Click … to confirm* prompt. Click the button yourself to complete (polyfill only: ✕ in
   the console cancels). The order uses the applied code, which is then used up.
   The button (and the `place_order` tool) only exists while the cart has items.

   A form that hides itself as a result of its own action waits ~0.5 s after answering
   (`src/tools/useAnswerGrace.ts`): Chrome cancels a call whose tool definition changes
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
- Event order differs. Native Chrome goes *fill → `submit` → `toolactivated`*; the
  polyfill goes *`toolactivated` → fill → `submit`*. The layer starts a run on
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
  `data-tool-submit-active`; `cursor.css` styles both so the same stylesheet works with
  real Chrome.
- The API is still in preview: it moved from `navigator.modelContext` to
  `document.modelContext`, and event targets moved from `window` to `document.modelContext`
  in Chrome 156. `installAgentVisuals` feature-detects the event target.
