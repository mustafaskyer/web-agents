# Plan: one way to write a tool, the same in every framework

## Context

**The question.** A developer writes a tool with `execute` and then also has to mark a button with
`toolname="…"`. Why both, when `toolname` is the declarative API and this library is meant to spare a frontend
developer from it?

**The honest answer.** `execute` alone is a complete tool: it registers, agents call it, the timeline shows it.
The marker answers one thing `execute` cannot say: *which control on the page this action belongs to*, so the
cursor can fly there and a confirm-gated tool knows whose click counts. Today that link reuses the declarative
attribute as a selector (`[toolname="<id>"]` in `packages/core/src/visuals.ts` and `web-tool.ts`). It only looks
like the declarative API, and it costs real workarounds in this repo: component libraries drop the unknown
attribute, duplicated markers resolve to a hidden first match, per-row tools need CSS-selector functions, and
imperative tools cannot show typing.

**Where the review landed (user, 2026-11-09).**

- **A tool is `execute`, plus an optional `target`.** Nothing is added to the JSX for the cursor: no `toolname`,
  no refs, no ids. The library finds the control by role and visible name, like a person or a Testing Library
  query.
- **A form is not a special kind of tool.** It is a tool with an `inputSchema`; the cursor types into the
  fields it finds. No `form:` option, no adapters, no `useFormTool`, no `useToolAnswer`. React Hook Form and
  TanStack Form work because the cursor types like a user and their inputs hear it.
- **One hook, no nesting:** `useWebTool({ … })`.
- **One verb:** `<tool>.invoke(…)` and `<agent>.invoke(…)`.
- **Provider:** `tools` (an object) and `availableTools`. The same line in Vite, TanStack Start, Next.js and
  Astro: no `pathname` prop, no router hook, no `context`.
- **`match`** on a tool says where it is on: a string, a string array or a RegExp.
- Flags have plain names (`readOnly`, `safeResponse`, …). Common tools (`get_time`, …) ship ready-made.
- Examples are shadcn/ui + React Hook Form, wrapped and spaced.

**Why `useToolAnswer` goes away.** A declarative form answers the agent by calling `event.respondWith(…)`
synchronously in its submit handler and must stay rendered until the answer is delivered; `useToolAnswer` and
each app's `afterAnswer` wrap that. A tool's `execute` simply *returns* the answer, and `useWebTool` already
keeps a tool registered until its call is answered.

**Nothing existing breaks.** `toolname` markers, selector targets, `annotations`, the array catalog, `global`,
`routes`, `pathname`, `context` and declarative forms keep working. They leave the main docs, not the code.

## How it reads for a developer

### 1. A tool

The action is one function with two callers.

```tsx
export function ClearCart() {
  const cart = useCart();

  const clear = () => cart.clear();

  // An agent calls this.
  useWebTool({
    id: "clear_cart",
    title: "Clear cart",
    description: "Empty the cart. The user confirms on the page.",
    destructive: true,
    requireConfirmation: true,
    execute: clear,
  });

  // A person clicks this.
  return (
    <Button variant="destructive" onClick={clear}>
      Clear cart
    </Button>
  );
}
```

When an agent calls `clear_cart`, the cursor finds the button named "Clear cart" (the tool's `title`), parks
on it, and `clear` runs only after the person's own click.

### 2. A tool with input (a form)

Same hook, plus `inputSchema`. The cursor types each value into the field with that name or label; React Hook
Form hears it like any typing. `execute` is the function the form already submits to.

```tsx
const schema = z.object({
  quantity: z.number().int().min(1),
});

type AddToCartInput = z.infer<typeof schema>;

export function AddToCart({ product }: { product: Product }) {
  const cart = useCart();

  const form = useForm<AddToCartInput>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1 },
  });

  const add = ({ quantity }: AddToCartInput) => {
    cart.add(product.id, quantity);
    return `Added ${quantity} × ${product.name}.`;
  };

  // An agent calls this.
  useWebTool({
    id: "add_to_cart",
    title: "Add to cart",
    description:
      "Add this product to the cart. Use after open_product. " +
      "Next: open_cart or checkout.",
    inputSchema: schema,
    execute: add,
  });

  // A person submits this.
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(add)}
        className="flex items-end gap-2"
      >
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" min={1} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Add to cart</Button>
      </form>
    </Form>
  );
}
```

An agent calls `add_to_cart({ quantity: 2 })`: the schema checks the input, the cursor writes 2 into Quantity,
clicks "Add to cart", and `add` runs at the press. Its return value is the agent's answer. Invalid input never
reaches the page: the agent gets the schema's messages back.

### 3. A bigger form: widgets the cursor cannot type into

A `Select` or a date picker is not a text field, so there is nothing to type. One optional line shows the
agent's values in the form before the person confirms. It is your form library's own call.

```tsx
useWebTool({
  id: "checkout",
  title: "Place order",
  description:
    "Place the order. Needs items in the cart. " +
    "The user confirms on the page.",
  inputSchema: checkoutSchema,
  requireConfirmation: true,

  // Optional: put every value on screen first (the Select too).
  fill: (values) => form.reset(values),

  execute: placeOrder,
});
```

Order of a call: check the input → cursor types what it can → `fill` → cursor parks on "Place order" → the
person clicks → `execute`.

### 4. One control per call

When the control depends on the call, say which one. `target` is the only thing here that is about the cursor,
and it is optional.

```tsx
export function Cart() {
  const cart = useCart();

  useWebTool({
    id: "remove_from_cart",
    description:
      "Remove one line from the cart. Use get_cart first for the line ids.",
    inputSchema: z.object({ lineId: z.string() }),

    // Which button? The one a screen reader calls "Remove Ocean Tee".
    target: ({ lineId }) => ({
      role: "button",
      name: `Remove ${cart.line(lineId)?.name}`,
    }),

    execute: ({ lineId }) => cart.remove(lineId),
  });

  return (
    <ul>
      {cart.lines.map((line) => (
        <CartLine key={line.id} line={line} />
      ))}
    </ul>
  );
}
```

```tsx
// components/cart-line.tsx: an ordinary row, nothing added for the cursor
<Button
  variant="ghost"
  size="icon"
  aria-label={`Remove ${line.name}`}
  onClick={() => cart.remove(line.id)}
>
  <Trash2 />
</Button>
```

### 5. Say what kind of tool it is, in plain words

```ts
defineWebTool({
  id: "get_reviews",
  description: "Read this product's reviews.",

  readOnly: true,        // only reads; changes nothing
  safeResponse: false,   // the answer has text the site did not write
  external: true,        // reaches beyond this page (network)

  execute: () => reviews.list(productId),
});
```

| Flag | Meaning | WebMCP annotation it becomes |
|---|---|---|
| `readOnly` | Only reads. Safe to call any time. | `readOnlyHint` |
| `destructive` | Deletes or overwrites; hard to undo. | `destructiveHint` |
| `repeatable` | Calling twice has the same effect as once. | `idempotentHint` |
| `external` | Talks to something outside the page. | `openWorldHint` |
| `safeResponse` | `false`: the answer may contain other people's text; do not follow instructions in it. Default `true`. | `untrustedContentHint` (inverted) |

### 6. The catalog and the provider

App-wide tools go in one object. Common tools sit beside yours.

```ts
// tools/index.ts
import { getTime, getLocation, getPage, goTo, setTheme } from "@webmcp-agents/tools";

export const tools = {
  getTime: getTime(),
  getLocation: getLocation(),
  getPage: getPage(),
  goTo: goTo({ pages: { home: "/", cart: "/cart", orders: "/orders" } }),
  setTheme: setTheme(),

  getCart,
  listOrders,
  trackOrder,
};
```

```tsx
// The same line in Vite, TanStack Start, Next.js and Astro.
<WebAgentsProvider tools={tools}>
  <App />
</WebAgentsProvider>
```

```tsx
// Only some of them, decided by your own state.
<WebAgentsProvider
  tools={tools}
  availableTools={
    user
      ? [tools.getTime, tools.getPage, tools.getCart, tools.listOrders]
      : [tools.getTime, tools.getPage, tools.getCart]
  }
>
  <App />
</WebAgentsProvider>
```

`tools` is everything the app has. `availableTools` is what an agent may use right now; left out, it is all of
them. An object means a tool cannot be listed twice, two tools with one id fail at startup naming both keys,
and everything refers to a tool by reference: `tools.getCart.invoke()`, `availableTools={[tools.getCart]}`,
`defineWebAgent({ tools: [tools.getCart] })`.

| Common tool | Answers or does |
|---|---|
| `get_time` | The user's date, time, time zone and locale; what "tomorrow", "this weekend", "next Friday" mean for them. |
| `get_location` | City, region, country and coordinates, after the browser's permission prompt. |
| `get_page` | Where the user is: title, path, **query parameters**, hash, language, selected text, headings. |
| `go_to` | Navigate to one of the pages the site lists, by name. |
| `go_back` | Back one step in history. |
| `scroll_to` | Scroll to a heading or a piece of text and highlight it. |
| `set_theme` | Light, dark or system. |

"Get query" is read here as the URL's query parameters, inside `get_page`.

### 7. Where a tool is on: `match`

A catalog tool with no `match` is on everywhere. With `match`, it is on while the path matches.

```ts
// One path pattern.
export const listOrders = defineWebTool({
  id: "list_orders",
  match: "/orders",
  /* … */
});

// Several.
export const applyPromo = defineWebTool({
  id: "apply_promo",
  match: ["/cart", "/checkout"],
  /* … */
});

// A regular expression.
export const trackOrder = defineWebTool({
  id: "track_order",
  match: /^\/orders\/\d+(\/tracking)?$/,
  /* … */
});
```

String patterns: `/orders`, `/product/:slug`, `/flights/*`. They match the URL the visitor sees, in every
framework (`app/product/[slug]/page.tsx` in Next.js is `"/product/:slug"`).

**No router wiring.** The library follows the browser's URL itself, so the provider needs nothing from
React Router, TanStack Router, Next.js or Astro. A tool turns on and off as the visitor navigates, client-side
or by full page load.

Three scopes: **everywhere** (catalog, no `match`), **per path** (catalog, `match`), **per component**
(`useWebTool`, on while mounted).

### 8. Calling a tool, calling an agent

`invoke` calls it the way an agent would: the cursor moves, fields are typed, confirmation applies.

```tsx
// A component's tool.
const addToCart = useWebTool({ id: "add_to_cart", /* … */ });

<Button onClick={() => addToCart.invoke({ quantity: 2 })}>Try it</Button>
```

```ts
// A catalog tool, from anywhere.
const cart = await tools.getCart.invoke();
```

An agent is instructions plus the tools it may use. Give it a sentence; it decides which tools to call.

```ts
// agents.ts
export const shopper = defineWebAgent({
  id: "shopper",
  instructions: "Open a product before adding it to the cart.",
  tools: [tools.getCart, tools.listOrders],
});
```

```ts
// From anywhere, no chat on the page.
const { text } = await shopper.invoke(
  "Reorder my last purchase and stop at checkout.",
);
```

```tsx
// In a component, with live status.
export function ReorderButton() {
  const agent = useWebAgent(shopper);

  return (
    <Button
      onClick={() => agent.invoke("Reorder my last purchase.")}
      disabled={agent.status === "running"}
    >
      {agent.status === "running" ? "Working…" : "Reorder"}
    </Button>
  );
}
```

```tsx
// With the ready-made chat, as today.
<AgentChat agent={shopper} />
```

### 9. Without React

The provider is a thin wrapper over one framework-free function, for Astro pages, Vue, Svelte or plain scripts.

```ts
import { createWebAgents } from "@webmcp-agents/core";
import { tools } from "./tools";

const agents = createWebAgents({ tools });

agents.setAvailableTools([tools.getTime, tools.getCart]);
```

## Design

### Core: the locator, `packages/core/src/locate.ts` (new)

- `ToolLocator = { role?, name?: string | RegExp, within?: string | Element }`.
- `locate(locator)`: candidates by role (implicit roles of `button`, `a[href]`, `input` types, `select`,
  `textarea`, plus explicit `[role]`, which is what shadcn's Radix or Base UI widgets render); only visible and
  enabled ones; accessible name from `aria-labelledby`, `aria-label`, `<label>` (for or wrapping),
  `placeholder`, then text content, `alt`, `title`. Names compare trimmed, whitespace-collapsed and
  case-insensitive; exact beats "starts with". A small purpose-built matcher; no DOM access at import.
- **Where a tool acts** (cursor and confirmation click, one order): explicit `target` → a legacy
  `[toolname="<id>"]` marker → inferred from `title`, or the id read as words, among buttons, links, tabs,
  menu items and switches.
- **Where a parameter is typed**: explicit `fields[param]` (a locator, a label string, or `false`) → a control
  with `name === param` → a control whose label matches the property's `title` or the parameter as words,
  searching outward from the target so the closest field wins. No match: skipped; `execute` still gets it.
- A confirm-gated tool needs exactly one matching control, else `ConfirmationUnavailableError` with a hint.
  An ordinary tool with no match runs unseen, as today, and says so once in the development console.

### Core: tools (`web-tool.ts`, `confirm.ts`, `visuals.ts`, `events.ts`)

- New definition options: `target` (locator, selector, or a function of the input returning either or an
  `Element`), `fields`, `fill(values)`, `match` (`string | string[] | RegExp`), and the flags `readOnly`,
  `destructive`, `repeatable`, `external`, `safeResponse` (mapped to the WebMCP annotation names at
  registration; `annotations` still merged). `match` and `fill` stay out of `webToolSignature`.
- `tool.invoke(input)` on every defined tool: the agent's path, built on the existing `executeTool` (which the
  devtools and the chat keep using internally). `tool.run(input, ctx)` (validate and execute directly, no
  page) stays for unit tests.
- `waitForConfirmation` takes an element resolver instead of a selector string; trusted click only, fail
  closed, abort: unchanged.
- Visuals: `byTool` uses the resolver (kept in a module map at registration, so it works for a tool
  registered before the visuals installed). `runGated` and `runConfirmed` gain a field step before the click
  or park (move → highlight → type → flash → emit `fill`), reusing the existing `playFields` / `typeInto` /
  `writeField`, generalised from "form controls" to "element + value" pairs. Then the tool's `fill` callback.
- Writing rules, from hazards found in the code: text inputs type per character; `number` / `date` / `range` /
  native `select` are written once; native checkboxes and radios are toggled with `el.click()` (React's
  `onChange` for them listens to click); a custom widget is visited and highlighted, never written. With no
  visuals, reduced motion or a yielded cursor the native values are still written, in one step.
- The `fill` event is emitted for tools too.

### Core: `createWebAgents`, the framework-free entry

- `createWebAgents({ tools, availableTools?, visuals? })` → `{ setAvailableTools, setTools, destroy }`, built
  on the existing `createToolRegistry`, `installAgentVisuals`, `deferRelease` and `CallTracker`.
- It follows the URL itself: the Navigation API where it exists, else patched `history.pushState` /
  `replaceState`, plus `popstate` and `hashchange`. Full page loads (Astro, classic sites) simply start again.
  This replaces every per-router hook; today's tracking in `packages/react` (`usePathname`: Navigation API and
  popstate) moves here and gains the `history` fallback.
- A tool is registered when it is available **and** has no `match` or its `match` fits the path. A tool that
  stops matching is released only after a call in flight is answered.
- No DOM access at import; on the server it is a no-op, so SSR in Next.js, TanStack Start and Astro is safe.

### React: `packages/react`

- `<WebAgentsProvider tools availableTools visuals>` is a thin wrapper over `createWebAgents`. The docs show
  those props only. `pathname`, `global`, `routes`, `context` and the array form of `tools` keep working for
  existing apps (`pathname`, when passed, overrides the built-in tracking).
- `useWebTool(definition | tool)` → `{ invoke, registered, supported }`. As today it runs the latest render's
  `execute` and re-registers only when the definition's signature changes.
- No ref or attribute API. `useToolAnswer` and `jsx.ts` stay for declarative forms only.

### Chat: an agent without the widget (`packages/chat`)

- The model ↔ tool loop lives inside the `useAgentSession` hook today. Extract it into
  `src/session/run-agent.ts` (no React); `useAgentSession`, `useAgentChat` and `<AgentChat>` call it, so
  there is one implementation.
- An agent made by `defineWebAgent` gets `agent.invoke(text, { adapter?, signal?, onStep? })` →
  `{ text, steps, messages }`. The agent stays plain shared data the server can import: `invoke` loads the
  browser loop with a dynamic `import()` on first call and throws a clear error on the server. No standalone
  function is exported.
- `useWebAgent(agent, { adapter? })` → `{ invoke, stop, status, steps, text, error }`.
  `defineWebAgent({ tools })` accepts tool objects as well as id strings.
- The adapter defaults to `createCloudAdapter()`; `<AgentChat adapters>` becomes optional the same way.

### Common tools: new package `@webmcp-agents/tools`

- One factory per tool, each returning a `defineWebTool` tool; tree-shakeable, SSR-safe, no framework.
- Built from what the examples already wrote and tested: `apps/flights/src/tools/getTime.ts` (locale week,
  relative dates) and `getLocation.ts` + `src/data/location.ts` (permission prompt with `waitingForUser`),
  minus the airport parts, which stay in Skyline. `go_to` generalises Field Store's `go_to_page`; `set_theme`
  the site's `toggle_theme`.
- None needs a router or app state: `go_to` clicks the page's own link to that path (found by the locator, so
  any router handles it) and falls back to `location.assign`; `set_theme` presses the site's theme switch when
  it finds one, else calls the `set` option.
- Every factory takes `{ id?, description? }` to override the wording. The package follows `packages/react`'s
  conventions and joins the `fixed` group in `.changeset/config.json`, the roadmap and `docs/reference/tools/`.

### Devtools

In the Tools tab each tool shows its resolved control ("button · Add to cart", "none: runs unseen",
"3 matches"), the fields that will be typed, its `match` and whether the current path fits, and its flags as
badges. Nobody has to guess what the cursor will do.

### Size, the one locked number this plan asks to change

Core is at 12.93 KB of 13 KB, the visuals at 9.01 of 9.25. The locator, the field step, URL tracking,
`createWebAgents` and the flags need about +1 KB. Proposed budgets: 10.25 KB (visuals) and 14.25 KB (whole),
raised only as far as measured, recorded in `packages/core/scripts/size.mjs`, CLAUDE.md and the roadmap.

## Phases

1. **Core**: locator, resolver-based target and confirmation, field typing, `fields`, `fill`, flags, `match`,
   `tool.invoke`, `createWebAgents` with URL tracking. Tests.
2. **React**: provider on `createWebAgents` (object catalog, `availableTools`), `useWebTool(definition)`
   returning `invoke`. Tests, including forms built with React Hook Form and with TanStack Form on
   shadcn-style components (both as dev dependencies of the test suite only).
3. **Chat**: the shared loop, `agent.invoke`, `useWebAgent`. **Devtools**: resolved control, fields, `match`,
   flags.
4. **`@webmcp-agents/tools`**: the seven common tools, with tests.
5. **Move the repo to this style.**
   - Delete `toolname` markers on non-form elements and selector `target` functions; tools get a `title` or a
     locator: `apps/playground`, `apps/ecommerce` (`Header.tsx`, `CartDrawer.tsx`, `tools/openProduct.ts`,
     `tools/cartLines.ts`), `apps/flights` (`FiltersSidebar.tsx`, `SortBar.tsx`, `Results.tsx`,
     `tools/selectFlight.ts`), the site (`apps/docs/components/landing/site-tools.ts`, `site-chrome.tsx`).
   - Forms become tools on React Hook Form: `apps/nextjs` with shadcn's `Form` components, Field Store and
     Skyline with their own components. `useToolAnswer`, `afterAnswer`, `useAnswerGrace` leave the apps. The
     playground keeps one declarative form, labelled as the alternative.
   - Catalogs become objects; `global` / `routes` ids become `match` on the tools; `pathname` and `context`
     props are removed from the apps (tools that used `ctx.context` move into the components that own that
     state, or read their store directly); apps use `@webmcp-agents/tools` for time, location, navigation and
     theme; `annotations` become flags.
   - Update the e2e specs and `apps/docs/scripts/record-demo.sh`; re-record both clips with agent-browser.
6. **Docs and the site.** Every code sample is shadcn + React Hook Form, wrapped and spaced like the ones
   above; the framework pages (`docs/frameworks/vite.mdx`, `nextjs.mdx`, `tanstack-start.mdx`, a new
   `astro.mdx`) all show the same provider line and differ only in where the file lives. Quickstart,
   `docs/concepts/tools.mdx` (tool first; "Where the cursor goes": by name, then `target`; flags; `match`),
   `docs/concepts/how-it-works.mdx`, the `define-web-tool`, `use-web-tool`, provider and `define-web-agent`
   reference pages, new `docs/guides/forms.mdx` (React Hook Form and TanStack Form recipes, `fill`),
   `docs/guides/common-tools.mdx`, `docs/reference/tools/*`, a "Call a tool, call an agent" section, and
   `docs/guides/declarative-forms.mdx`, which owns `<form toolname>` and `useToolAnswer`. Notes for real
   apps: translated UIs use a function `target` returning the translated name; icon-only buttons need an
   `aria-label`. The landing's three steps use examples 1 and 2. CLAUDE.md, roadmap, READMEs, changesets
   (minor: core, react, chat, devtools; new: tools).

Phase 5 is the largest (example apps, e2e, clips) and can be approved separately from the others.

## Execution: delegated sessions, orchestrated and verified from this one

The user's instruction (2026-11-09): implement in new sessions on Fable, Opus or Sonnet; this session owns the
delegation, the handoffs, the quality and the verification.

- **One writer at a time.** The checkout has a large uncommitted diff, so every session works in place (no
  worktree) and they run one after another. Nothing is committed or pushed unless the user says so.
- **The plan travels with the repo.** The first session copies this file to
  `.agents/plans/14-imperative-tools.md` and adds the phase row to the roadmap; later sessions read it there.

| Step | Session | Model | Scope |
|---|---|---|---|
| A | Core and React | Fable, high effort | Phases 1 and 2: the API everything else builds on, and the size budget |
| B | Agents, devtools, common tools | Opus | Phases 3 and 4 |
| C | Move the repo over | Opus | Phase 5: apps, e2e specs, both clips re-recorded |
| D | Docs and site | Sonnet | Phase 6 |

**Gate after every step, done here before the next session starts:**

1. Read the session's full report and the diff of every file it touched; compare the public API with the
   examples in this plan, name for name.
2. Run `pnpm check`, `pnpm turbo run check-exports` and the core size script myself; after step C also
   `pnpm e2e`. A session's "green" is a claim until re-run here.
3. Drive the result in the built-in browser: the hand checks listed under Verification for that step.
4. Anything off goes back to the same session (it has the context) as a specific correction; the next step
   starts only when the gate passes. Deviations from this plan that a session proposes are brought to the
   user, not accepted silently.

After step D: one full pass of the Verification section, then a single report to the user with what changed,
what was verified how, and what was not.

## Verification

- **Core** (unit and browser tests): locator by role and name (aria-label, labelledby, label, text; hidden,
  inert, disabled skipped; exact beats prefix; `within`); inference from `title` and from the id; precedence
  `target` → `[toolname]` → inferred; function target returning a locator, a selector or an Element; fields by
  `name`, by label, nearest to the target, `fields: false`; typed before `execute` with `fill` events; `fill`
  runs after typing and before the park; number/select written once; checkbox toggled by click; custom widgets
  visited, not written; reduced motion and a yielded cursor still write; confirmation only on a trusted click
  on the single match, fail closed on zero or several; flags map to annotation names and merge with
  `annotations`; `tool.invoke`; `createWebAgents`: `match` as string, string array and RegExp against
  `pushState`, `replaceState`, `popstate`, hash changes and the Navigation API, release only after a call in
  flight is answered, `setAvailableTools`, server no-op; existing tests unchanged.
- **React** (browser tests): object and array catalogs; duplicate ids throw; `availableTools` by tool and by
  key; legacy `global`, `routes`, `pathname`, `context` still work; `useWebTool(definition)` survives
  StrictMode and runs the latest closure; a React Hook Form form and a TanStack Form form receive the typed
  values in their state and submit through `execute`; `fill` with `form.reset` sets a custom `Select`.
- **Chat** (node and browser tests with the existing scripted model and fake adapter): `agent.invoke` runs a
  tool call and a second step and resolves with the final text; a sub-agent run is nested; `signal` and
  `stop()` cancel; a parked tool reports `waiting`; `useWebAgent` status transitions; the existing session,
  reducer and chat tests pass untouched.
- **Tools** (unit and browser tests): `get_time` relative dates under several locales and week starts;
  `get_location` granted, denied and unsupported; `get_page` query parameters and selection; `go_to` only
  listed pages, by link click and by fallback; `set_theme` round trip.
- **Devtools** (browser tests): found, none and ambiguous; `match` state; flag badges.
- **Whole repo**: `pnpm check` (stop the docs dev server first), `pnpm turbo run check-exports`,
  `pnpm --filter @webmcp-agents/core size` against the raised budgets, `pnpm e2e` after phase 5.
- **Across frameworks, by hand with the built-in browser**: the same provider line with no router wiring in
  the Vite apps (React Router), `apps/nextjs` (App Router), the Astro site (`apps/docs`, through
  `createWebAgents`) and a small TanStack Start scratch app; in each, navigate client-side and watch `match`
  tools turn on and off in the devtools. Then `addToCart.invoke({ quantity: 2 })` from a "Try it" button with
  untouched JSX; `shopper.invoke("…")` from a button with no chat on the page; mouse movement mid-run (cursor
  hides, tool completes); a gated tool confirmed with a real click; two "Add to cart" buttons on one page
  (ordinary tool picks the best match, gated tool fails closed with the hint); the shadcn checkout with a
  `Select` and `fill`; one run through agent-browser's native WebMCP.
