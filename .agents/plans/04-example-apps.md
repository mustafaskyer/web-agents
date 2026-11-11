# Feature: Example apps — `apps/ecommerce` and `apps/flights` (Phase 4)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> Roadmap: `.agents/plans/00-web-agents-roadmap.md` is the source of truth for package names, public APIs, versions and the quality bar. This plan assumes Phases 1–3 are merged:
> - **Phase 1:** `packages/core`, `packages/polyfill`, `packages/devtools`, `apps/playground`, `tsconfig.base.json`, `turbo.json`, `biome.json`, root `vitest.config.ts` with `projects`, and the `"@web-agents/source"` export condition.
> - **Phase 2:** `@web-agents/react` exports `WebAgentsProvider`, `useEnableTools`, `EnableTools`, `useWebTool`, `useToolAnswer`, `useAgentEvents` and the JSX attribute types. `@web-agents/core` exports `defineWebTool`.
> - **Phase 3:** `@web-agents/devtools/react` exports `<WebAgentsDevtools/>`.
>
> **If any export named below does not exist, STOP.** Re-read the roadmap's "Public contracts" section and the actual package `src/index.ts`, and use the real name. Never re-implement a missing API inside an app.

## Feature Description

Two realistic, polished demo apps that show WebMCP + `@web-agents/*` on real-world flows:

1. **`apps/ecommerce`** is a minimal, editorial storefront. Its visual language mirrors demo.yournextstore.com: home, product listing, category, product detail, a cart drawer and checkout. Every meaningful action is an agent tool.
2. **`apps/flights`** is a flight-booking site. Its visual language mirrors react-flights-ui.vercel.app: hero search card, results with filters and sort, and a booking form with summary and confirmation.

Both apps run on mock, seeded data with no backend. They show every tool scoping mode from TODO #6:

- **global** tools, always on;
- **route-scoped** tools, through the provider's `routes`;
- **component-scoped** tools, through `useEnableTools` / `<EnableTools>` (for example, cart-drawer tools exist only while the drawer is open).

They also show both tool styles:

- declarative `<form toolname>`;
- imperative `defineWebTool`.

Consequential actions (checkout, book flight) pause for user confirmation. The agent cursor, spotlight and yield-to-user behaviour from Phase 1 work across client-side route changes.

## User Story

As a developer evaluating `@web-agents`
I want to open two realistic sites (a store and a flight-booking site) and drive them with an agent (devtools runner, `window.agent`, later the chat widget)
So that I can see how tools, scoping, confirmation gates and the agent cursor behave in production-like flows, and copy the patterns into my own app.

## Problem Statement

The only demo today (`apps/playground`, formerly `src/`) is a three-product, single-screen toy. It cannot show:

- route-scoped or component-scoped tools;
- navigation tools, or the cursor surviving page changes;
- multi-step flows (search, filter, select, fill, confirm);
- realistic layouts where the spotlight and cursor have to work against scrolling, drawers, popovers and sticky headers.

There is also no polished showcase for the Vercel deploy in Phase 7.

## Solution Statement

Add two Vite 8 + React 19 + React Router 7 (data mode) apps under `apps/`. Each app has:

- a `data/` folder of seeded mock JSON plus pure, synchronous "service" functions;
- a small store (React context);
- a `tools/` folder where every agent action is either a declarative form or a `defineWebTool` imperative tool;
- a `tools/catalog.ts` that exports the full `WebTool[]` and a `routes` map for `<WebAgentsProvider>`;
- plain CSS with design tokens: `tokens.css` + per-component CSS Modules. **No Tailwind** (see NOTES);
- `<WebAgentsDevtools/>` mounted in dev only;
- Playwright e2e smoke tests that drive tools through `window.agent.run` and assert the UI;
- a `vercel.json` with an SPA rewrite, ready for Phase 7.

No shared `packages/ui`. The two apps deliberately have different visual languages, and a shared UI package would add a build edge for little reuse. The genuinely shared behaviour (tool scoping, answering, visuals) already lives in `@web-agents/react` and `@web-agents/core`.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High (two full apps, about 25 tools, routing and e2e)
**Primary Systems Affected**: `apps/ecommerce` (new), `apps/flights` (new), root `pnpm-workspace.yaml` (already globbed `apps/*`), root `vitest.config.ts` / `turbo.json` (e2e task), `.gitignore` (playwright artefacts)
**Dependencies**: `react@19.3`, `react-dom@19.3`, `react-router@7`, `zod@4.6`, `@web-agents/{core,react,polyfill,devtools}` (`workspace:*`), dev: `vite@8`, `@vitejs/plugin-react@6`, `@playwright/test@1.65`, `typescript@~6.0.3`

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

Paths are post-Phase-1 (`apps/playground/...`). Pre-Phase-1 equivalents are in brackets.

- `.agents/plans/00-web-agents-roadmap.md`: the whole file, especially "Public contracts", "Quality bar" and "Skills & commands per phase". It defines the exact API names you consume.
- `apps/playground/src/tools/AddToCartForm.tsx` [`src/tools/AddToCartForm.tsx`] (lines 17–22, 24–46): the canonical declarative tool. `onSubmit` → `settle()` → `respondWith`, and the form carries `toolname` / `tooldescription` / `toolautosubmit=""` / `toolparamdescription`.
- `apps/playground/src/tools/CheckoutForm.tsx` [`src/tools/CheckoutForm.tsx`] (lines 1–13 doc comment, 25–41): the confirm-gate pattern. There is **no** `toolautosubmit`, so the browser pauses on the submit button. It also shows "hide only after answering" through the answer-grace hook.
- `apps/playground/src/tools/ApplyPromoForm.tsx` [`src/tools/ApplyPromoForm.tsx`] (lines 27–41, 63–77): error UX. The same message goes to the field (`role="alert"`, `aria-invalid`, `aria-describedby`) and to the agent.
- `apps/playground/src/tools/useAnswerGrace.ts` [`src/tools/useAnswerGrace.ts`] (lines 1–27): why a form that unmounts itself must wait about 500 ms. Phase 2 ships it as `useToolAnswer` in `@web-agents/react`; use that, not a copy.
- `apps/playground/src/tools/ClearCartButton.tsx` [`src/tools/ClearCartButton.tsx`] (lines 13–33): an imperative tool whose on-screen control carries `toolname` so the cursor can find it.
- `apps/playground/src/store.tsx` [`src/store.tsx`] (lines 60–121 `CartProvider` `useMemo` API; 123–127 `useCart`; 130–138 `settle` / `errorMessage`): the store shape to mirror. Actions return a human-readable string and throw on bad input.
- `apps/playground/src/main.tsx` [`src/main.tsx`] (lines 8–33): bootstrap order. Polyfill (dev), then visuals, then render, then dev panel. In the new apps the provider owns visuals (Phase 2), but **the polyfill still must load before the first render**.
- `packages/core/src/index.ts` [`src/agent-visuals/index.ts`] (lines 1–21 header comment, 110–120 `submitButtonOf`, 404–417 gated `registerTool`): the signals the cursor relies on. Every tool needs a `toolname` element on screen, or a `target` selector on the WebTool.
- `packages/core/src/cursor.css` [`src/agent-visuals/cursor.css`] (lines 1–14): the `--agent*` custom properties each app should theme (ecommerce: ink black; flights: brand blue).
- `packages/devtools/src/*` / `@web-agents/devtools/react` (Phase 3): how `<WebAgentsDevtools/>` is mounted and how `window.agent.run(name, args)` is exposed. The e2e tests depend on `window.agent`.
- `apps/playground/vite.config.ts`, `apps/playground/package.json`, `apps/playground/tsconfig.json` (Phase 1): **MIRROR** these for the app config (`resolve.conditions` with `"@web-agents/source"`, scripts, tsconfig `extends`).
- `README.md` "Notes and limits" section: native vs polyfill event order, `executeTool` arg shapes, and "Chrome cancels a call whose tool definition changes".

### New Files to Create

**`apps/ecommerce/`**
- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `vercel.json`, `playwright.config.ts`
- `src/main.tsx`: bootstrap (polyfill in dev, `createBrowserRouter`, `<RouterProvider>`)
- `src/routes.tsx`: route objects and `Root` layout (`<WebAgentsProvider>` + header + `<Outlet/>` + cart drawer + dev devtools)
- `src/styles/tokens.css`, `src/styles/base.css`
- `src/data/products.json`, `src/data/categories.json`: seeded mock catalogue (about 16 products, 4 categories, variants)
- `src/data/catalog.ts`: pure queries (`searchProducts`, `getProduct`, `listByCategory`, `related`)
- `src/store/cart.tsx`: `CartProvider`, `useCart` (mirrors the playground store API style)
- `src/store/ui.tsx`: `UiProvider`, `useUi` (drawer open/close and search query)
- `src/lib/money.ts`, `src/lib/result.ts` (`settle`, `errorMessage`, moved per app)
- `src/components/Header.tsx`, `SearchBox.tsx`, `ProductCard.tsx`, `ProductGrid.tsx`, `QtyStepper.tsx`, `CartDrawer.tsx`, `Footer.tsx`, `Gallery.tsx`, `TrustRows.tsx`, `Breadcrumbs.tsx`, `EmptyState.tsx` (+ `*.module.css`)
- `src/pages/Home.tsx`, `Products.tsx`, `Category.tsx`, `Product.tsx`, `Checkout.tsx`, `OrderConfirmed.tsx`, `NotFound.tsx`
- `src/tools/catalog.ts`: `WebTool[]` + `routes` + `global`
- `src/tools/searchProducts.ts`, `openProduct.ts`, `getCart.ts`, `updateCartItem.ts`, `removeFromCart.ts` (imperative, `defineWebTool`)
- `src/tools/AddToCartForm.tsx`, `ApplyPromoForm.tsx`, `CheckoutForm.tsx` (declarative)
- `src/tools/navigation.ts`: `navigateTo` helper shared by navigation tools
- `e2e/store.spec.ts`

**`apps/flights/`**
- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `vercel.json`, `playwright.config.ts`
- `src/main.tsx`, `src/routes.tsx`
- `src/styles/tokens.css`, `src/styles/base.css` (Poppins via `@fontsource/poppins`, self-hosted, with `font-display: swap`)
- `src/data/airports.json` (about 30 airports), `src/data/airlines.json` (about 10, with monogram and brand colour)
- `src/data/flights.ts`: deterministic seeded generator `generateFlights(query)` (mulberry32 PRNG keyed on the query string)
- `src/lib/searchParams.ts`: build and parse the results path `/flights/:from/:to/:trip/:cabin/:adults/:children/:infants/:date`
- `src/store/booking.tsx`: `BookingProvider`, `useBooking` (selected flight, travelers, contact, confirmed bookings)
- `src/components/Header.tsx`, `SearchCard.tsx`, `AirportCombobox.tsx`, `TravelersPopover.tsx`, `TripTypeRadios.tsx`, `FiltersSidebar.tsx`, `SortBar.tsx`, `FlightCard.tsx`, `AirlineBadge.tsx`, `BookingSummary.tsx`, `Footer.tsx`, `EmptyState.tsx` (+ `*.module.css`)
- `src/pages/Home.tsx`, `Results.tsx`, `Booking.tsx`, `Confirmation.tsx`, `NotFound.tsx`
- `src/tools/catalog.ts`
- `src/tools/SearchFlightsForm.tsx`, `TravelerDetailsForm.tsx`, `BookFlightForm.tsx` (declarative)
- `src/tools/filterResults.ts`, `sortResults.ts`, `selectFlight.ts`, `getBooking.ts` (imperative)
- `e2e/flights.spec.ts`

**Root (UPDATE only)**
- `turbo.json`: add an `e2e` task.
- `.gitignore`: add `playwright-report/`, `test-results/`, `blob-report/`.
- `package.json` (root): add an `"e2e": "turbo e2e"` script.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [React Router 7 — Data mode / `createBrowserRouter`](https://reactrouter.com/start/data/routing)
  - Sections: route objects, `loader`, `useNavigate`, `useParams`, `useSearchParams`.
  - Why: both apps use data mode. Navigation tools call the router's `navigate`.
- [React Router — `router.navigate` outside components](https://reactrouter.com/api/data-routers/createBrowserRouter)
  - Why: imperative tools run outside React render. Use `router.navigate(...)` from the exported router instance.
- [Chrome WebMCP — imperative API, discover/execute tools](https://developer.chrome.com/docs/ai/webmcp/imperative-api#discover-tools)
  - Why: `executeTool` resolves to `null` if the call triggers a navigation. Tool definitions that disappear mid-call get the call cancelled.
- [Chrome WebMCP — declarative API](https://developer.chrome.com/docs/ai/webmcp/declarative-api)
  - Why: `toolautosubmit`, `toolparamdescription`, `:tool-form-active`, `:tool-submit-active`.
- [Vite — CSS Modules](https://vite.dev/guide/features#css-modules)
  - Why: styling decision. `*.module.css` works with zero config.
- [Vite — `resolve.conditions`](https://vite.dev/config/shared-options#resolve-conditions)
  - Why: add `"@web-agents/source"` so the apps compile package sources in dev.
- [Playwright — `webServer` config](https://playwright.dev/docs/test-webserver)
  - Why: the e2e tests start `vite` themselves.
- [Fontsource — Poppins](https://fontsource.org/fonts/poppins/install)
  - Why: self-hosted font for flights, so there is no third-party request (privacy and perf).
- [zod 4 — JSON Schema / Standard Schema](https://zod.dev/json-schema#ztojsonschema)
  - Why: `defineWebTool` takes zod schemas as Standard Schema (roadmap contract).
- [MDN — `<dialog>` / `showModal()`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)
  - Why: the cart drawer uses a modal `<dialog>`, which gives focus trap, Esc and an inert background for free.
- [MDN — Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
  - Why: the travelers popover uses `popover` + `popovertarget`, with no JS positioning library.

### Patterns to Follow

**Declarative tool (MIRROR `apps/playground/src/tools/AddToCartForm.tsx:17-46`):**

```tsx
function onSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const native = e.nativeEvent as SubmitEvent; // carries agentInvoked / respondWith
  const result = settle(() => cart.add(product.sku, Number(new FormData(e.currentTarget).get("qty"))));
  if (native.agentInvoked) native.respondWith?.(result);
}
return (
  <form toolname={`add_to_cart_${product.sku}`} tooldescription={`Add ${product.name} to the shopping cart`}
        toolautosubmit="" onSubmit={onSubmit} className="tool-form">
    <input name="qty" type="number" min="1" max="20" required … toolparamdescription="How many to add, e.g. 2" />
```

New apps differ in three ways:

- **Use `useToolAnswer()` from `@web-agents/react` everywhere.** `answer(e.nativeEvent as SubmitEvent, promise)` (playground `CheckoutForm.tsx:25-28`) replaces the hand-rolled `respondWith` branch, so every form gets the unmount grace.
- **Tool names are stable and unparameterised.** A product page has one `add_to_cart`, not `add_to_cart_<sku>`, because only one product is on screen. The SKU is implied by the route, and `variant` and `qty` are fields.
- **No `settle` duplication across files.** Each app has one `src/lib/result.ts`.

**Store action contract (MIRROR `apps/playground/src/store.tsx:29-38,60-121`):** actions return a human-readable sentence for the agent and **throw** on bad input. `settle()` turns a throw into `"Error: …"`.

```ts
add(sku, qty) {
  const product = PRODUCTS.find((p) => p.sku === sku);
  if (!product) throw new Error(`Unknown SKU "${sku}"`);
  if (!Number.isInteger(qty) || qty < 1) throw new Error(`Quantity must be a whole number ≥ 1, got ${qty}`);
  …
  return `Added ${qty} × ${product.name} to the cart.`;
}
```

**Confirm gate (MIRROR `apps/playground/src/tools/CheckoutForm.tsx:31-40`):** no `toolautosubmit`. The submit button text names the consequence and the amount: `Place order · $123.00`, `Book flight · USD 161.10`.

**Error surfaced to user and agent alike (MIRROR `apps/playground/src/tools/ApplyPromoForm.tsx:27-41,63-77`):** `setError(msg)`, `aria-invalid`, `aria-describedby={errorId}`, `<p role="alert">`, and the same text goes into `answer(…)`.

**Imperative tool (roadmap contract; Phase 2 `defineWebTool`):**

```ts
import { defineWebTool } from "@web-agents/core";
import { z } from "zod";

export const removeFromCart = defineWebTool({
  id: "remove_from_cart",
  description: "Remove a line from the cart by product slug (and variant, if the line has one).",
  inputSchema: z.object({ slug: z.string().describe("Product slug, e.g. ocean-bloom"), variant: z.string().optional() }),
  annotations: { destructiveHint: true },
  target: '[toolname="remove_from_cart"]',          // the cursor animates to the line's remove button (see GOTCHA in task)
  execute: ({ slug, variant }) => cartActions().remove(slug, variant),
});
```

Imperative tools defined at module scope cannot call React hooks. Expose the store through a module-level accessor that the provider sets on mount, `cartActions()` (see the task "CREATE src/store/cart.tsx"). This is the same "store outside React" pattern `router.navigate` uses.

**Imperative tool with an on-screen control (MIRROR `apps/playground/src/tools/ClearCartButton.tsx:24-32`):** the control carries `toolname="<id>"`, so the core layer gates `execute` until the cursor clicks it (sync mode).

**Naming:**

- Tool ids are `snake_case` verbs: `search_products`, `add_to_cart`, `book_flight`.
- React components are `PascalCase.tsx`; tool modules are `camelCase.ts` (imperative) or `PascalCaseForm.tsx` (declarative).
- CSS Modules are `Component.module.css`, with classes in `camelCase`.
- Mock-data files are `kebab` or plain-noun `.json`.

**Doc comments:** every tool file starts with the same block-comment style as the playground tools (`AddToCartForm.tsx:1-9`): what the tool does, why it is or is not autosubmit, and when it is registered.

**Logging:** no `console.log` in app code. Visual-layer logging goes through `useAgentEvents` / devtools.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Scaffold both apps by mirroring `apps/playground` config. Add tokens and base CSS, mock data with pure query functions, stores with module-level accessors for imperative tools, and React Router data-mode routing with an empty `Root` layout that mounts `<WebAgentsProvider>`.

**Tasks:**

- Scaffold `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `vercel.json` per app.
- Add design tokens (one `tokens.css` per app) and base styles.
- Add seeded mock data with pure, unit-testable query modules.
- Add the stores (cart / booking) and `ui` state.

### Phase 2: Core Implementation

Build the pages and components to the reference visual language, then the tools (declarative forms in components, imperative `defineWebTool` modules), and finally the `catalog.ts` per app with `global` + `routes`.

**Tasks:**

- Ecommerce: header, home, listing, category, product detail, cart drawer, checkout, confirmation.
- Flights: header, hero + search card, results (filters, sort, cards), booking, confirmation.
- Tools: ecommerce has 9 and flights has 8 (see the tool tables in NOTES).

### Phase 3: Integration

Wire `<WebAgentsProvider tools global routes pathname>`, add component-scoped tools in the cart drawer and booking form, mount devtools in dev, theme the cursor tokens per app, and add the turbo `e2e` task.

**Tasks:**

- Provider in the `Root` layout with `pathname` from `useLocation()`.
- `useEnableTools` in `CartDrawer` (while open) and `Booking` (while a flight is selected).
- Navigation tools resolve **before** navigating (see GOTCHA in the navigation task).
- Dev-only `<WebAgentsDevtools/>`.

### Phase 4: Testing & Validation

Unit-test the data queries and the seeded generator in Vitest's node env. Playwright e2e drives each app through `window.agent.run` with the polyfill, asserts UI state, and checks the confirm gate. Finish with manual agent-browser runs and the `e2e-test` skill.

**Tasks:**

- `src/data/*.test.ts` (node) for `searchProducts`, `getProduct`, `generateFlights` determinism, filters and sort.
- `e2e/store.spec.ts`, `e2e/flights.spec.ts`.
- Validation commands at levels 1–5.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

Before starting: run `/prime`, then load the skills `stealth`, then `type`, `surface`, `space` (design system tasks), `states`, `mobile-feel`, `ux-copy`, `a11y` (component tasks). Re-read the roadmap's "Public contracts".

### 0. VERIFY prerequisites

- **IMPLEMENT**: Confirm Phases 1–3 are merged and the consumed exports exist.
- **VALIDATE**:
  `grep -E "export (function|const) (WebAgentsProvider|useEnableTools|EnableTools|useWebTool|useToolAnswer|useAgentEvents)" -r packages/react/src && grep -E "export (function|const) defineWebTool" -r packages/core/src && ls packages/devtools/src && test -f apps/playground/vite.config.ts && echo OK`
- **GOTCHA**: If `useToolAnswer` or `<WebAgentsDevtools/>` is missing, stop and report. Don't vendor copies.

### 1. CREATE `apps/ecommerce/package.json`

- **IMPLEMENT**:
  ```json
  {
    "name": "@web-agents/example-ecommerce",
    "private": true,
    "version": "0.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite --port 5174",
      "build": "vite build",
      "preview": "vite preview --port 4174",
      "typecheck": "tsc --noEmit",
      "test": "vitest run",
      "e2e": "playwright test"
    },
    "dependencies": {
      "@web-agents/core": "workspace:*",
      "@web-agents/react": "workspace:*",
      "react": "^19.3.1",
      "react-dom": "^19.3.1",
      "react-router": "^7",
      "zod": "^4.6.7"
    },
    "devDependencies": {
      "@web-agents/polyfill": "workspace:*",
      "@web-agents/devtools": "workspace:*",
      "@playwright/test": "^1.65.0",
      "@types/react": "^19.3.0",
      "@types/react-dom": "^19.3.0",
      "@vitejs/plugin-react": "^6.2.1",
      "typescript": "~6.0.3",
      "vite": "^8.3.6",
      "vitest": "^5.1.0"
    }
  }
  ```
- **PATTERN**: `apps/playground/package.json` (Phase 1). Copy the exact versions it already uses, which beats the numbers above.
- **GOTCHA**:
  - Run `npm view react-router version` first and pin the current 7.x.
  - Ports: playground uses 5173, ecommerce 5174, flights 5175, so all three run together under `turbo dev`.
- **VALIDATE**: `pnpm install && pnpm --filter @web-agents/example-ecommerce exec node -e "require('./package.json')"`

### 2. CREATE `apps/ecommerce/tsconfig.json`, `vite.config.ts`, `index.html`, `vercel.json`

- **IMPLEMENT**:
  - `tsconfig.json`: `{"extends": "../../tsconfig.base.json", "compilerOptions": {"types": ["vite/client"], "customConditions": ["@web-agents/source"]}, "include": ["src", "e2e", "vite.config.ts", "playwright.config.ts"]}`. Keep whatever the playground tsconfig sets; only the include differs.
  - `vite.config.ts`:
    ```ts
    import { defineConfig, defaultClientConditions } from "vite";
    import react from "@vitejs/plugin-react";
    export default defineConfig({
      plugins: [react()],
      resolve: { conditions: ["@web-agents/source", ...defaultClientConditions] },
      server: { port: 5174, strictPort: true },
    });
    ```
  - `index.html`: `lang="en"`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color" content="#fafafa">`, `<title>Field Store · web-agents demo</title>`, an inline SVG favicon (data URI, a black rounded square), and `<div id="root">`.
  - `vercel.json`: `{"rewrites": [{"source": "/((?!api/|assets/).*)", "destination": "/index.html"}]}`. Phase 7 extends it.
- **PATTERN**: `apps/playground/vite.config.ts` (MIRROR its `resolve.conditions` line exactly, since Phase 1 decided the form).
- **GOTCHA**:
  - `defaultClientConditions` is exported by Vite 6+. If Phase 1 used a literal array instead, mirror that.
  - Brand name is "Field Store", an original name. Do not use "Your Next Store" or the YNS logo.
- **VALIDATE**: `pnpm --filter @web-agents/example-ecommerce typecheck`

### 3. CREATE `apps/ecommerce/src/styles/tokens.css` + `base.css`

- **IMPLEMENT**: tokens taken from the reference findings.
  ```css
  :root {
    --bg: #fafafa; --surface: #ffffff; --ink: #0a0a0a; --ink-2: #525252; --ink-3: #737373;
    --line: #e5e5e5; --line-strong: #d4d4d4;
    --accent-from: #ec4899; --accent-to: #8b5cf6;        /* hero accent word gradient */
    --danger: #dc2626; --success: #16a34a;
    --radius-sm: 8px; --radius: 12px; --radius-lg: 16px; --radius-pill: 999px;
    --shadow-1: 0 1px 2px rgb(0 0 0 / .04), 0 1px 1px rgb(0 0 0 / .03);
    --shadow-drawer: -24px 0 48px rgb(0 0 0 / .08);
    --font-sans: -apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
    --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px; --space-24: 96px;
    --page-max: 1280px; --page-pad: clamp(16px, 4vw, 32px);
    --header-h: 64px;
    --ease-out: cubic-bezier(.22, 1, .36, 1);
    /* agent cursor theme (core cursor.css reads these) */
    --agent: #0a0a0a; --agent-ink: #ffffff; --agent-strong: #0a0a0a; --agent-soft: rgb(10 10 10 / .14);
  }
  ```
  - `base.css`: reset, `body{background:var(--bg);color:var(--ink);font:15px/1.55 var(--font-sans);-webkit-font-smoothing:antialiased}`, headings with `text-wrap: balance` and tight tracking (`-0.03em` at 48px+), `.eyebrow{font:500 12px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)}`.
  - Buttons: `.btn` is a pill. Primary has `--ink` background and white text; ghost is text-only. Visible `:focus-visible` ring (`outline: 2px solid var(--ink); outline-offset: 2px`). Hover gated by `@media (hover:hover)`. `-webkit-tap-highlight-color: transparent`.
  - Inputs are 16px on mobile (no iOS zoom), using `font-size: max(16px, 1em)`.
  - `.tabular { font-variant-numeric: tabular-nums; }` for prices.
  - `@media (prefers-reduced-motion: reduce)` disables transitions.
  - Import order in `main.tsx`: `tokens.css` → `@web-agents/core/cursor.css` → `base.css`.
- **PATTERN**: `packages/core/src/cursor.css:1-14`. The `--agent*` variables are overridden here, so the cursor matches the brand.
- **GOTCHA**: Make sure the core `cursor.css` `:root` block doesn't override these. Import tokens **after** `cursor.css`, or use `html:root` for higher specificity. Verify in the browser that the arrow is `#0a0a0a`.
- **VALIDATE**: `pnpm --filter @web-agents/example-ecommerce build` (CSS parses).

### 4. CREATE `apps/ecommerce/src/data/{products,categories}.json` + `catalog.ts` + `catalog.test.ts`

- **IMPLEMENT**:
  - `categories.json` has 4 entries, each `{slug, name, blurb}`: `accessories`, `apparel`, `home`, `digital`.
  - `products.json` has about 16 entries, each `{slug, name, category, price, description, details: {fit, fabric, care}, variants?: {name: "Size"|"Color", options: string[]}, stock: number, images: [{hue, angle}]}`. Prices are in cents (integers).
    - At least one product has `stock: 0`, to show the "Notify me" state.
    - At least 5 products have variants.
  - Images are **generated**, never fetched. `ProductArt` renders a CSS gradient tile from `hue` and `angle` plus the product's initial, so there are no copyrighted assets and no network.
  - `catalog.ts` exports pure functions:
    - `allProducts()`
    - `getProduct(slug)`, which throws `Unknown product "…"`
    - `searchProducts(query, {category?, limit=8})`: case-insensitive match on name, description and category, ranked by name-prefix match first
    - `listByCategory(slug)`
    - `related(slug, n=5)`
    - `money(cents)` (via `Intl.NumberFormat('en-US', {style:'currency', currency:'USD'})`)
  - `catalog.test.ts` (node env) covers search ranking, unknown slug throws, category filter, and `related` excluding self.
- **PATTERN**: `apps/playground/src/store.tsx:44-50` (`PRODUCTS`, `money`). Note the change to integer cents to avoid float drift in totals.
- **GOTCHA**: Import JSON with `import products from "./products.json"`. Vite and TS support it with `resolveJsonModule`; check that the base tsconfig has it, or add it in the app tsconfig.
- **VALIDATE**: `pnpm --filter @web-agents/example-ecommerce test`

### 5. CREATE `apps/ecommerce/src/lib/result.ts`, `src/store/cart.tsx`, `src/store/ui.tsx`

- **IMPLEMENT**:
  - `result.ts`: move `settle` and `errorMessage` verbatim from playground `store.tsx:130-138`, generalised to `settle<T>(action: () => T): Promise<T | string>`.
  - `cart.tsx`: `CartProvider` + `useCart()` with this API:
    ```ts
    interface CartLine { slug: string; variant: string | null; qty: number; name: string; unitPrice: number }
    interface CartApi {
      lines: CartLine[]; promo: string | null; totals: { subtotal: number; discount: number; shipping: number; total: number };
      count: number;
      add(slug: string, qty: number, variant?: string | null): string;
      setQty(slug: string, variant: string | null, qty: number): string;   // qty 0 removes
      remove(slug: string, variant?: string | null): string;
      applyPromo(code: string): string;  removePromo(): string;
      placeOrder(contact: { email: string; name: string }): Order;        // returns order; throws on empty cart
      describe(): string;                                                  // human summary for get_cart
    }
    ```
    - Rules:
      - Free shipping over $100; otherwise $8.
      - Promo `WELCOME10` gives 10% off. It is the only valid code, and the error message mirrors the playground wording.
      - Variant is required when the product has variants (throw `Choose a Size for Ocean Tee: S, M, L`).
      - Qty is clamped to the 1..stock range, and out of range throws with the allowed range.
    - Persist `lines` + `promo` to `sessionStorage`, so a reload keeps the cart for demos.
    - **Module-level accessor for imperative tools:** `let current: CartApi | null = null; export const cartActions = (): CartApi => { if (!current) throw new Error("Cart is not mounted"); return current; }`. Set it in `CartProvider` with `useLayoutEffect(() => { current = api; return () => { current = null } }, [api])`.
  - `ui.tsx`: `UiProvider`, `useUi()` with `{cartOpen, openCart(), closeCart(), lastAdded: string | null}` and the same module accessor `uiActions()`.
- **PATTERN**: `apps/playground/src/store.tsx:60-121` (`useMemo` API, actions return a sentence and throw on bad input).
- **GOTCHA**:
  - Inside `useMemo` actions, read state through functional `setState` (as `store.tsx:73-78` does). Don't capture stale `lines`. The returned sentence may be computed from the *next* state; compute it before the `setState` call.
  - `placeOrder` must not race the `sessionStorage` effect. Clear storage synchronously.
- **VALIDATE**: `pnpm --filter @web-agents/example-ecommerce typecheck`

### 6. CREATE `apps/ecommerce/src/main.tsx` + `src/routes.tsx` (skeleton)

- **IMPLEMENT**:
  - `main.tsx`:
    ```tsx
    import "./styles/tokens.css";
    import "@web-agents/core/cursor.css";
    import "./styles/base.css";
    if (import.meta.env.DEV) await import("@web-agents/polyfill/auto");   // before any tool registers
    const { router } = await import("./routes");
    createRoot(document.getElementById("root")!).render(<StrictMode><RouterProvider router={router} /></StrictMode>);
    ```
  - `routes.tsx`: `export const router = createBrowserRouter([{ element: <Root/>, errorElement: <NotFound/>, children: [ {index:true, element:<Home/>}, {path:"products", element:<Products/>}, {path:"category/:slug", element:<Category/>}, {path:"product/:slug", element:<Product/>}, {path:"checkout", element:<Checkout/>}, {path:"order/:id", element:<OrderConfirmed/>}, {path:"*", element:<NotFound/>} ] }])`.
  - `Root`: `<CartProvider><UiProvider><WebAgentsProvider tools={catalog} global={globalTools} routes={routeTools} pathname={useLocation().pathname} visuals={{ spotlight: true }}><Header/><main id="main"><Outlet/></main><Footer/><CartDrawer/>{import.meta.env.DEV && <Devtools/>}</WebAgentsProvider></UiProvider></CartProvider>`. `Devtools` is `lazy(() => import("@web-agents/devtools/react").then(m => ({ default: m.WebAgentsDevtools })))`.
  - Add `<ScrollRestoration/>` and a skip link `<a href="#main" class="skip">Skip to content</a>`.
- **PATTERN**: `apps/playground/src/main.tsx:8-33` for ordering. The polyfill must exist before `WebAgentsProvider` mounts, because the provider installs visuals, which wrap `registerTool` (core `index.ts:404-417`).
- **GOTCHA**:
  - Importing `routes` statically would evaluate tool modules (`defineWebTool` at module scope) before the polyfill exists. That is harmless only if `defineWebTool` doesn't touch `document.modelContext`, which the roadmap contract implies (registration is `registerWebTool`). Keep the dynamic import anyway; it's cheap insurance.
  - The `/auto` polyfill entry is dev-only, so Chrome with native WebMCP is used in prod. On non-WebMCP browsers in prod the tools are simply absent. Phase 7 decides whether to ship the polyfill in prod demos; leave a `// Phase 7: VITE_WEBMCP_POLYFILL` comment.
- **VALIDATE**: `pnpm --filter @web-agents/example-ecommerce dev &` then `curl -sf http://localhost:5174/ | grep -q 'id="root"'`, then kill the server.

### 7. CREATE ecommerce components (Header, SearchBox, ProductCard/ProductArt, ProductGrid, QtyStepper, Breadcrumbs, Gallery, TrustRows, Footer, EmptyState)

- **IMPLEMENT** (visual language from the reference; original markup):
  - **Header** (sticky, `backdrop-filter: saturate(180%) blur(12px)`, `--bg` at 80% alpha, 1px bottom `--line`):
    - Left: wordmark "Field Store" with a 20px black rounded-square glyph.
    - Centre: nav links (All products, Accessories, Apparel, Home, Digital) with `aria-current="page"` styling.
    - Right: `SearchBox` (pill, 240px, magnifier icon), account icon link, and a cart button with a count badge.
    - The cart button carries `toolname="open_cart"`, so the cursor finds it (see tool 7f).
    - Mobile (<768px): nav collapses into a horizontally scrollable row under the header (no hamburger), and the search box becomes an icon button that expands.
  - **SearchBox** is a `<form role="search" toolname="search_products" tooldescription="…" toolautosubmit="">` with `<input name="query" type="search" toolparamdescription="What to look for, e.g. linen shirt">`. Submit navigates to `/products?q=`. This declarative tool is global (see task 10).
  - **ProductCard**: art tile (aspect 4/5, `--radius-lg`, second tile cross-fades on hover via opacity only), name, and price (`.tabular`). It is a `<Link>` to `/product/:slug`. Sold-out products show a small "Sold out" chip.
  - **ProductGrid**: CSS grid `repeat(auto-fill, minmax(220px, 1fr))`, gap `--space-6`.
  - **QtyStepper**: `−` / input / `+` buttons with `aria-label="Decrease quantity"` / `"Increase quantity"`, a numeric input `inputMode="numeric"` with `name="qty"`, and a 44px min hit size.
  - **Breadcrumbs**: `<nav aria-label="Breadcrumb"><ol>` with `aria-current` on the last item.
  - **Gallery**: main art and thumbs; arrow keys switch images; a counter "1 / 3" with `aria-live="polite"`.
  - **TrustRows**: "Free shipping over $100", "Free size exchanges", "30-day returns", with icons as inline SVG.
  - **Footer**: tagline and three columns (Shop, Support, Legal) with links to `#`. Small print reads "Demo store. Nothing here ships."
  - **EmptyState**: `{title, body, action?}`, with one action only (`ux-copy` skill).
  - Icons: inline SVG components in `src/components/icons.tsx`, 20px, `stroke=currentColor`, 1.5 stroke, `aria-hidden`.
- **PATTERN**: the roadmap quality bar, and the `space` / `type` / `surface` skill rules (load them).
- **GOTCHA**:
  - Use transforms/opacity only for hover effects.
  - No layout shift when art loads, because it's CSS-generated and the aspect ratio is fixed.
  - Sticky header + cursor: the core cursor `revealIfNeeded` uses `scrollIntoView({block:"center"})`, which can hide targets under a sticky header near the top. Add `html { scroll-padding-top: calc(var(--header-h) + 16px); }`.
- **VALIDATE**: `pnpm --filter @web-agents/example-ecommerce typecheck && pnpm --filter @web-agents/example-ecommerce build`

### 8. CREATE ecommerce pages (Home, Products, Category, Product, Checkout, OrderConfirmed, NotFound)

- **IMPLEMENT**:
  - **Home**:
    - Hero h1 "Everyday goods, built to stay". The word "stay" is wrapped in `<span class="accent">` with `background: linear-gradient(90deg, var(--accent-from), var(--accent-to)); -webkit-background-clip: text; color: transparent`.
    - Subhead; primary pill "Shop all products" plus a ghost link "See the edit" (anchor to `#edit`).
    - A soft blurred radial gradient decoration (CSS only, `pointer-events:none`, `aria-hidden`).
    - Then: eyebrow "THE EVERYDAY EDIT" plus h2 "Pieces on repeat", a 4-card row with "View all".
    - Then: a 2-up category tile row, and a newsletter block (email + Subscribe) as a declarative tool **without** `toolautosubmit`, `toolname="subscribe_newsletter"`, since it collects personal data and so goes through the confirm gate.
  - **Products**: reads `?q=` and `?category=`. The h1 is "All products" or `Results for "linen"`, with a result count (`aria-live="polite"`) and a grid. Empty state: "No products match "x"", with the action "Clear search".
  - **Category**: `useParams().slug` → `listByCategory`. An unknown slug shows NotFound copy.
  - **Product**:
    - Layout: breadcrumbs; then 2 columns ≥ 960px (`Gallery` | details), 1 column below.
    - Details: h1 name, price, `AddToCartForm` (variant radio group as segmented pills + `QtyStepper` + "Add to cart" primary pill, full width on mobile), `TrustRows`, a details accordion (`<details>`), and "You might also like" (`related`).
    - Out of stock: the form is replaced by a disabled "Sold out" button and a "Notify me" link (not a tool).
    - On add: the cart drawer opens (`uiActions().openCart()`) **after** the tool answers (see GOTCHA in task 9).
  - **Checkout**:
    - Left: contact form (email, full name), shipping address (line1, city, postcode, country `<select>`) and an order note.
    - Right: order summary (lines, `ApplyPromoForm`, totals with shipping) and `CheckoutForm` (the place-order button).
    - An empty cart shows an EmptyState with "Browse products".
  - **OrderConfirmed**: "Order FS-XXXX confirmed", a summary, and "Continue shopping".
  - **NotFound**: "We couldn't find that page", with the action "Back to the store".
  - Every page sets `document.title` through a `useTitle(title)` hook (`polish` skill).
- **PATTERN**:
  - Copy from the `ux-copy` skill: sentence case, verbs on buttons.
  - The confirm-button label names the amount (playground `CheckoutForm.tsx:38`).
- **GOTCHA**:
  - The `Product` page must key form state by slug (`<AddToCartForm key={slug} …/>`), so navigating between products resets qty/variant and the tool definition (schema with variant enum) changes cleanly.
  - Chrome cancels in-flight calls whose definition changes. That is fine across navigation, because the call answered first (task 9).
- **VALIDATE**: `pnpm --filter @web-agents/example-ecommerce build && pnpm --filter @web-agents/example-ecommerce dev &` then `agent-browser open http://localhost:5174/product/<a-variant-slug> && agent-browser snapshot -i -c | head -60`. Check the form controls are present with accessible names, then kill the server.

### 9. CREATE ecommerce declarative tools: `src/tools/AddToCartForm.tsx`, `ApplyPromoForm.tsx`, `CheckoutForm.tsx`, `NewsletterForm.tsx`

- **IMPLEMENT**:
  - **`AddToCartForm({product})`**:
    - Form: `<form toolname="add_to_cart" tooldescription={`Add ${product.name} to the cart. Pick a ${variant.name} first.`} toolautosubmit="">`.
    - Fields:
      - Variant: radios `name="variant"` (each `<input type="radio" value=…>` inside a styled label). For a JSON Schema enum, the polyfill only derives enum from `<select>` (`packages/polyfill` `schemaFor`). **Use a visually styled `<select name="variant">` (native, segmented look on desktop is optional) to keep the enum in the schema**, or extend the polyfill. Choose `<select>` and note it.
      - Qty: `name="qty"`, `type=number`, `min=1`, `max={stock}`.
    - `onSubmit`: `answer(e.nativeEvent as SubmitEvent, settle(() => cart.add(slug, qty, variant)))`, then open the drawer: `result.then(() => setTimeout(openCart, 0))`.
  - **`ApplyPromoForm`**: mirror the playground file almost verbatim (`ApplyPromoForm.tsx:18-79`), with code `WELCOME10` and `toolparamdescription="The promo code, e.g. WELCOME10"`.
  - **`CheckoutForm`**:
    - `toolname="checkout"`. **No `toolautosubmit`** (confirm gate). The fields are the contact and address inputs from the Checkout page; the form wraps the left column, so the agent fills them and the user confirms.
    - The submit button is `Place order · {money(total)}` (`className="btn primary"`).
    - `onSubmit`: validate required fields (native `required` + `type=email`), `const order = cart.placeOrder(contact)`, `answer(e, Promise.resolve(`Order ${order.id} placed for ${money(order.total)}.`))`, then navigate `router.navigate(`/order/${order.id}`)` **inside `.finally` after the `useToolAnswer` grace**.
  - **`NewsletterForm`**: `toolname="subscribe_newsletter"`, no autosubmit, fields `email` + `consent` checkbox (required). Its result is just a sentence.
- **PATTERN**: `apps/playground/src/tools/CheckoutForm.tsx:20-41` (`useToolAnswer` grace, confirm gate) and `ApplyPromoForm.tsx` (errors).
- **IMPORTS**: `import { useToolAnswer } from "@web-agents/react"`, `import { settle } from "../lib/result"`, `import { router } from "../routes"` (or a tiny `src/router.ts` that exports the router, to avoid a circular import between routes and tools: **do this**).
- **GOTCHA**:
  - **Navigation after a tool.** `executeTool` resolves `null` if the call triggers a navigation, and Chrome cancels a call whose tool definition disappears. Rule for every tool that navigates: **answer first, navigate after the grace.** Implement a helper `src/tools/navigation.ts`:
    ```ts
    /** Answer the agent, then navigate once the response has been delivered (see useToolAnswer). */
    export async function answerThenNavigate(result: Promise<string>, to: string, graceMs = 500): Promise<string> {
      const text = await result;
      setTimeout(() => void router.navigate(to), graceMs);
      return text;
    }
    ```
    Client-side navigation through React Router is a same-document navigation. It does not trigger the "resolves to null" path (that applies to full document navigations), but the unmounting form still changes tool definitions. Hence the grace.
  - Extract the router to `src/router.ts` (`export const router = createBrowserRouter(routeObjects)`) and have `routes.tsx` export only `routeObjects`. This prevents `tools → routes → pages → tools` cycles.
  - `toolname` stays `add_to_cart`, the same on every product page. That's fine: only one product page is mounted at a time.
- **VALIDATE**: `pnpm --filter @web-agents/example-ecommerce typecheck`

### 10. CREATE ecommerce imperative tools + `src/tools/catalog.ts`

- **IMPLEMENT** with `defineWebTool` and zod (input `.describe()` everywhere, because descriptions become the agent's parameter docs):

  | id | file | input | behaviour | annotations / scope |
  |---|---|---|---|---|
  | `open_product` | `openProduct.ts` | `{slug}` or `{query}` (`z.union`) | resolves slug (search fallback, first hit), `answerThenNavigate("Opened Ocean Tee ($48). Options: Size S/M/L.", /product/slug)` | readOnly · **global** |
  | `browse_category` | `openProduct.ts` | `{category: z.enum(categorySlugs)}` | navigate to `/category/:slug`, returns the top 8 names + prices | readOnly · **global** |
  | `get_cart` | `getCart.ts` | `{}` | `cartActions().describe()` | readOnly · **global** |
  | `open_cart` | `getCart.ts` | `{}` | `uiActions().openCart()`; `target: '[toolname="open_cart"]'` | **global** |
  | `update_cart_item` | `updateCartItem.ts` | `{slug, variant?, qty: z.number().int().min(0).max(20)}` | `setQty`; `target` = that line's stepper `[data-line="<slug>:<variant>"] [name=qty]` resolved at call time | **component-scoped: CartDrawer while open** |
  | `remove_from_cart` | `removeFromCart.ts` | `{slug, variant?}` | `remove`; `destructiveHint: true`; target is the line's remove button | **component-scoped: CartDrawer while open** |

  - `search_products` is the declarative `SearchBox` (global, because it is always on screen in the header).
  - `catalog.ts`:
    ```ts
    export const catalog = [openProduct, browseCategory, getCart, openCart, updateCartItem, removeFromCart] as const;
    export const globalTools = ["open_product", "browse_category", "get_cart", "open_cart"] as const;
    export const routeTools = {} satisfies Record<string, readonly string[]>;   // declarative forms self-scope by mounting
    export const drawerTools = ["update_cart_item", "remove_from_cart"] as const;
    ```
  - Add a NOTE comment in `catalog.ts`: declarative forms (`add_to_cart`, `apply_promo`, `checkout`, `subscribe_newsletter`, `search_products`) are route-scoped *by mounting*. They exist only while their page or component is rendered. `routes` is for imperative WebTools only.
  - If the Phase 2 `target` contract only accepts a static string, use a stable per-line attribute. Render each drawer line's stepper with `toolname` **unset** and the drawer section with `toolname="update_cart_item"` (so the cursor goes to the drawer list), and document the limitation in NOTES as a Phase 2 follow-up: "`target` as a function `(input) => Element | null`".
- **PATTERN**: the roadmap `WebToolConfig` contract; the imperative-tool excerpt in "Patterns to Follow".
- **GOTCHA**:
  - Imperative tools are gated by the core layer until the cursor "clicks" their element (sync mode). If the element isn't on screen (drawer closed), `execute` runs immediately (core `index.ts` `runGated`). That's why drawer tools are component-scoped: they only exist while their element exists.
  - `open_cart` while the drawer is already open returns "The cart is already open." Don't throw.
- **VALIDATE**: `pnpm --filter @web-agents/example-ecommerce typecheck && pnpm --filter @web-agents/example-ecommerce test`

### 11. CREATE `apps/ecommerce/src/components/CartDrawer.tsx` (+ component-scoped tools)

- **IMPLEMENT**:
  - A modal `<dialog>`, right side, 420px (100vw on mobile as a bottom sheet with `max-height: 85dvh` and `env(safe-area-inset-bottom)` padding; see the `mobile-feel` skill).
  - Opened with `showModal()` when `ui.cartOpen`, closed on Esc / backdrop click / close button. `onClose` syncs `closeCart()`.
  - Header: "Your cart (3 items)". Lines carry `data-line`, the art thumb, name, variant, a `QtyStepper` (`aria-label` with the product name) and a remove icon button (`aria-label="Remove Ocean Tee, size M"`).
  - Footer: subtotal, a shipping note ("Free shipping unlocked" or "$X away from free shipping" with a progress bar), and a "Checkout" primary pill linking to `/checkout` that closes the drawer.
  - Inside, render `<EnableTools names={drawerTools} />` **only while open**: `{cartOpen && <EnableTools names={drawerTools}/>}`.
  - Enter/exit motion (`motion` skill): `transform: translateX(100%) → 0` over 280ms with `--ease-out`, and backdrop opacity. Exit is animated through `@starting-style` + `transition-behavior: allow-discrete` on `dialog[open]` and `::backdrop`, with a reduced-motion fallback to opacity only.
  - Empty state: "Your cart is empty", with the action "Browse products".
- **PATTERN**: the roadmap contract `<EnableTools names={…}/>` (ref-counted, unregisters on unmount).
- **GOTCHA**:
  - The core spotlight blurs everything except the nearest `[toolname]`. Make sure the drawer's `::backdrop` doesn't stack above the core overlays. Core uses `--agent-z: 2147483000`, and a modal dialog lives in the top layer, **which is above any z-index**. Verify the cursor is visible over the open drawer. If not, file it as a Phase 1 core bug: the core layer must render inside the top layer, e.g. as a `popover="manual"` element shown after the dialog. Document what you observe in NOTES rather than hacking around it in the app.
  - Tool definitions appearing and disappearing as the drawer opens and closes fire `toolchange`. The devtools list should update live; check it.
- **VALIDATE**: e2e test `cart drawer tools are scoped` (task 18), plus a manual agent-browser screenshot of the drawer with the cursor over a stepper.

### 12. CREATE `apps/flights` scaffold (package.json, tsconfig, vite.config, index.html, vercel.json, tokens/base CSS)

- **IMPLEMENT**:
  - Mirror tasks 1–3 with name `@web-agents/example-flights`, port 5175 / 4175, title "Skyline · web-agents demo" (original brand; do not use "ReactFlights"), and `theme-color` `#1c6bd2`.
  - Extra dependency: `"@fontsource/poppins": "^5"`. Import weights 400/500/600/700 in `main.tsx` (`@fontsource/poppins/400.css`, …).
  - Tokens:
    ```css
    :root {
      --bg: #f9fafb; --surface: #ffffff; --ink: #111827; --ink-2: #4b5563; --ink-3: #6b7280;
      --line: #e5e7eb; --line-strong: #d1d5db;
      --brand: #1c6bd2; --brand-ink: #ffffff; --brand-soft: rgb(28 107 210 / .08); --brand-soft-2: rgb(28 107 210 / .12);
      --danger: #d32f2f; --success: #15803d; --warn: #b45309;
      --radius-sm: 8px; --radius: 12px; --radius-lg: 20px; --radius-pill: 999px;
      --shadow-card: 0 1px 2px rgb(16 24 40 / .04), 0 4px 16px rgb(16 24 40 / .06);
      --font-sans: "Poppins", system-ui, sans-serif;
      --page-max: 1240px; --page-pad: clamp(16px, 3vw, 24px); --header-h: 72px;
      --ease-out: cubic-bezier(.22, 1, .36, 1);
      --agent: #1c6bd2; --agent-ink: #ffffff; --agent-strong: #1c6bd2; --agent-soft: rgb(28 107 210 / .16);
    }
    ```
  - Card class: `.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-card)}`.
  - Uppercase field labels: `.label{font:600 11px/1 var(--font-sans);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}` (from the booking reference).
- **PATTERN**: the ecommerce tasks 1–3 you just did.
- **GOTCHA**: Poppins has no tabular figures by default. Use `font-variant-numeric: tabular-nums` and check that times line up. If they don't, use `font-feature-settings: "tnum"` on time/price elements only.
- **VALIDATE**: `pnpm install && pnpm --filter @web-agents/example-flights typecheck && pnpm --filter @web-agents/example-flights build`

### 13. CREATE flights data: `airports.json`, `airlines.json`, `src/data/flights.ts` (+ test), `src/lib/searchParams.ts` (+ test)

- **IMPLEMENT**:
  - `airports.json` has about 30 entries, each `{code, city, name, country}` (LHR, DXB, JFK, CDG, NRT, BER, BOM, CAI, CPT, GRU, EZE, ICN, SIN, IST, DOH, …).
  - `airlines.json` has about 10 entries, each `{code, name, color}`. Names are fictional ("Northwind Air", "Meridian", "Altair Airways", "Coral Pacific", …) to avoid trademark logos. `AirlineBadge` renders a monogram circle in `color`.
  - `flights.ts`:
    - `mulberry32(seed)` and `hash(str)`.
    - `generateFlights(q: FlightQuery): Flight[]` produces 24–60 flights, deterministic per query. Each is `{id, airline, flightNo, departAt, arriveAt, durationMin, stops: 0|1|2, stopCodes, cabin, price (cents), seatsLeft}`.
    - `applyFilters(flights, {stops?: "any"|0|1|2, airlines?: string[]})`.
    - `sortFlights(flights, "price-asc"|"price-desc"|"duration"|"depart")`.
    - `FlightQuery = {from, to, trip: "oneway"|"roundtrip", cabin: "economy"|"premium"|"business"|"first", adults, children, infants, date: "YYYY-MM-DD", returnDate?}`.
  - `searchParams.ts`:
    - `toResultsPath(q)` gives `/flights/lhr/dxb/oneway/economy/1/0/0/2026-11-08`, with the return date as a query param `?return=YYYY-MM-DD`.
    - `fromResultsParams(params, search)` returns `FlightQuery` or throws a readable error ("Unknown airport "XXX"", "Date must be today or later").
    - Codes are lowercase in URLs and uppercase in UI.
  - Tests (node):
    - Determinism: same query gives deep-equal results.
    - Different date gives different results.
    - Filters: stops=0 gives only direct.
    - Sort order.
    - Path round-trip.
    - Validation errors.
- **GOTCHA**: Date handling. Use plain `YYYY-MM-DD` strings and `Intl.DateTimeFormat` for display; avoid timezone drift by never doing `new Date("YYYY-MM-DD")` arithmetic in local time. Use a `addDays(iso, n)` helper on UTC.
- **VALIDATE**: `pnpm --filter @web-agents/example-flights test`

### 14. CREATE `apps/flights/src/store/booking.tsx` + `main.tsx` + `router.ts` + `routes.tsx`

- **IMPLEMENT**:
  - `BookingProvider` / `useBooking` / module accessor `bookingActions()` with:
    - `{query: FlightQuery | null, results: Flight[], filters, sort, selected: Flight | null, contact, travelers: Traveler[], bookings: Booking[]}`
    - actions `setQuery`, `setFilters`, `setSort`, `select(id)`, `setContact`, `setTraveler(i, …)`, `confirm(): Booking`, `getBooking(ref)`.
  - Bookings persist in `localStorage`, so `get_booking` works after reload.
  - Booking ref format `SK-` + 6 base36 uppercase characters.
  - Routes: `/` Home, `/flights/:from/:to/:trip/:cabin/:adults/:children/:infants/:date` Results, `/flights/booking` Booking (redirects to `/` via a `loader` if nothing is selected), `/bookings/:ref` Confirmation, and `*`.
  - `main.tsx` and `Root` mirror ecommerce task 6 (provider with `pathname`, dev devtools, polyfill first).
- **GOTCHA**: The results route must parse params in a `loader` (`fromResultsParams`). Throw a `Response` 400 with a readable message, rendered by the `errorElement`, so a malformed URL never shows a blank page.
- **VALIDATE**: `pnpm --filter @web-agents/example-flights typecheck`

### 15. CREATE flights components + pages (Header, SearchCard, AirportCombobox, TravelersPopover, TripTypeRadios, FiltersSidebar, SortBar, FlightCard, AirlineBadge, BookingSummary, Footer, EmptyState; Home, Results, Booking, Confirmation, NotFound)

- **IMPLEMENT**:
  - **Header**: white, 72px, logo glyph + "Skyline", nav (Home, Deals, Support) and "My bookings" (an outline button that links to a lookup form on Confirmation).
  - **Home**:
    - Two columns ≥ 1024px. Left: h1 "Book your next adventure" (700, `clamp(40px, 5vw, 64px)`, `-0.02em`), subtext, and two buttons.
    - Right: `SearchCard` (a `.card` with a floating tab chip "✈ Flights" overlapping its top border).
    - Below: a "Featured routes" grid of 8 cards (seat-scarcity chip "Only 2 seats left" in `--danger` soft), "Why fly with us" (4 icon rows), and the footer.
  - **SearchCard** (= `SearchFlightsForm`, see task 16), with this layout:
    - Row 1: trip radios (One way / Round trip) left; cabin `<select>` right.
    - Row 2: From | swap button (circular, 32px, `aria-label="Swap origin and destination"`) | To.
    - Row 3: depart date (`<input type="date">`), return date (shown only for round trip), and travelers (a button opening `TravelersPopover`).
    - Row 4: full-width "Search flights" primary button.
    - On results pages it renders `compact` (a single row, icon-only search button `aria-label="Search flights"`).
  - **AirportCombobox**: native `<input list>` + `<datalist>` of `CODE — City`, *or* a lightweight ARIA combobox. **Use `<input name="from" list="airports">` + `<datalist>`.** It is native, accessible, has zero JS, and agent fills work through `value`. The value is normalised to the 3-letter code on submit (accept "LHR", "London", "London - LHR").
  - **TravelersPopover**: a `popover` element with steppers for adults (1–9), children (0–8) and infants (0–adults), plus hidden inputs `name="adults|children|infants"` in the search form. The button label reads "Travelers: 2".
  - **Results**:
    - Compact SearchCard on top.
    - Grid `280px 1fr`. Left: `FiltersSidebar` (`.card`, stops radios, airline checkboxes with counts).
    - Right: a summary bar ("London ✈ Dubai · 48 flights · Sat, 8 Nov"), then `SortBar` (two large segmented buttons "Price: low to high" / "Price: high to low", active = brand fill), then a list of `FlightCard`s.
    - Mobile: the sidebar becomes a "Filters" button opening a bottom-sheet `<dialog>`.
  - **FlightCard**: `AirlineBadge` + name + flight no. + cabin | depart time (large, 700) and city (code) | duration pill (`--brand-soft` bg, brand text) on a hairline with stop dots | arrive time and city | price + "Select" button (`toolname` is set on the card's select button by `select_flight`'s target, see task 17). `seatsLeft ≤ 3` shows the scarcity chip.
  - **Booking**:
    - Two columns. Left `.card`s: "Contact information" (first, last, email, phone with a country-code select) and "Traveler information" (per traveler: first, last, date of birth, document no.); together they form `TravelerDetailsForm`. Then a "Review and book" card with terms and `BookFlightForm`.
    - Right: a sticky `BookingSummary` with sections Travelers, Baggage allowance and Price details (base fare × travelers, taxes 12%, total).
  - **Confirmation**: success check, "You're booked. Reference SK-…", itinerary, and "Book another trip". It also includes a lookup form (`GetBookingForm`, optional) for `/bookings`.
  - Every async-looking transition (search → results) uses a 300–500ms simulated latency with **skeleton cards matching FlightCard layout** (`states` skill), so the cursor and spotlight are seen working against real loading states. The latency is configurable via `?latency=0`, which tests use.
- **PATTERN**:
  - Ecommerce components for structure.
  - The roadmap quality bar: skeletons match the layout; there is no spinner over everything.
- **GOTCHA**:
  - `<input type="date">` and agent fill: the WebMCP polyfill sets `.value = "2026-11-08"`, which is valid. Chrome native declarative fill also expects ISO.
    - State the format in `toolparamdescription="Departure date, YYYY-MM-DD, e.g. 2026-11-20"`.
    - Set `min={todayIso}`.
  - The swap button is `type="button"`, so it is never a submitter.
- **VALIDATE**: `pnpm --filter @web-agents/example-flights build`, then an agent-browser snapshot of `/` showing every search control with an accessible name.

### 16. CREATE flights declarative tools: `SearchFlightsForm.tsx`, `TravelerDetailsForm.tsx`, `BookFlightForm.tsx`

- **IMPLEMENT**:
  - **`SearchFlightsForm`**: `<form toolname="search_flights" tooldescription="Search flights. Airports are 3-letter IATA codes." toolautosubmit="">`, with fields:
    - `trip` (`<select>` hidden behind radios? **Use a `<select name="trip">` visually styled as a segmented control** so the schema has an enum; keep radios purely presentational, synced to the select. Or simply render two radios with `name="trip"` and accept that the polyfill types it as string. **Choose `<select>`**: enum in the schema matters more to agents.)
    - `cabin` (`select`), `from`, `to` (text + datalist, `required`, `pattern="[A-Za-z]{3}|.+"`), `date` (`type=date`, `required`), `returnDate` (`type=date`, not required), and `adults` / `children` / `infants` (`type=number` with min/max, visually driven by the popover).
    - `onSubmit`: build `FlightQuery`, validate (`fromResultsParams` logic: return after depart, same from and to is an error, infants ≤ adults), then `answer(e, answerThenNavigate(Promise.resolve(summary), toResultsPath(q)))`. The summary is computed by running `generateFlights` + defaults: `"Found 48 flights LHR → DXB on 8 Nov 2026. Cheapest: Meridian 07:30→11:30, USD 161.10 (id F-3k2). Use filter_results, sort_results or select_flight."`
    - The form is **global**: it's mounted on Home (full) and Results (compact). Same `toolname`; only one is mounted at a time.
  - **`TravelerDetailsForm`**: `toolname="fill_traveler_details"`, `toolautosubmit=""` (saving details is reversible). The fields are contact + traveler 1..N, named `firstName_1`, `lastName_1`, `dob_1`, … with `toolparamdescription` on each. On submit it saves to the store and answers "Saved details for 2 travelers. Next: book_flight (needs the user's confirmation)."
  - **`BookFlightForm`**: `toolname="book_flight"`. **No `toolautosubmit`** (confirm gate). There is one required checkbox, `name="acceptTerms"` ("I accept the fare rules"), and the submit `Book flight · USD 322.20`.
    - `onSubmit`: if traveler details are incomplete, answer `Error: Missing traveler details: lastName_2. Call fill_traveler_details first.` and focus the first missing field.
    - Otherwise `confirm()`, then answer "Booked SK-7F3K2Q …" and navigate (answer-then-navigate) to `/bookings/SK-…`.
- **PATTERN**: ecommerce task 9; `useToolAnswer` grace; errors to user and agent alike.
- **GOTCHA**:
  - **Number of travelers changes the tool schema** (fields `firstName_2` appear). Changing the schema while a call is in flight cancels it. Travelers are fixed on the booking page (they come from the search), so the schema is stable there. Document it in the tool's doc comment.
  - Forms with many fields make the cursor typing long (each char ~30–70ms). That's intended, and yield-to-user covers impatience.
- **VALIDATE**: `pnpm --filter @web-agents/example-flights typecheck`

### 17. CREATE flights imperative tools + `src/tools/catalog.ts`

- **IMPLEMENT**:

  | id | file | input | behaviour | scope |
  |---|---|---|---|---|
  | `filter_results` | `filterResults.ts` | `{stops?: z.enum(["any","0","1","2"]), airlines?: z.array(z.string()).describe("Airline names or codes")}` | `setFilters`; answers "Showing 12 direct flights (Meridian, Altair). Cheapest USD 161.10." `target: '[toolname="filter_results"]'` (the FiltersSidebar card carries it) | route `/flights/*` |
  | `sort_results` | `sortResults.ts` | `{by: z.enum(["price-asc","price-desc","duration","depart"])}` | `setSort`; target is the SortBar | route `/flights/*` |
  | `select_flight` | `selectFlight.ts` | `{flightId: z.string()}` (ids appear in `search_flights` / `filter_results` results) | `select(id)` (throws `No flight "F-xx" in the current results`), answer-then-navigate to `/flights/booking`; `target` = that card's Select button (`[data-flight-id="…"] button`); see the ecommerce task 10 limitation note | route `/flights/*` |
  | `get_booking` | `getBooking.ts` | `{reference: z.string().regex(/^SK-[A-Z0-9]{6}$/)}` | readOnly; returns the itinerary text or `Error: No booking SK-…` | **global** |
  | `list_results` | `filterResults.ts` | `{limit?: z.number().int().max(20).default(5)}` | readOnly; returns the top N of the current filtered+sorted results with ids | route `/flights/*` |

  - `catalog.ts`:
    ```ts
    export const catalog = [filterResults, sortResults, selectFlight, listResults, getBooking] as const;
    export const globalTools = ["get_booking"] as const;
    export const routeTools = {
      "/flights/:from/:to/:trip/:cabin/:adults/:children/:infants/:date": ["filter_results", "sort_results", "select_flight", "list_results"],
    } as const;
    ```
  - `filter_results` on mobile: the sidebar is in a closed sheet, so its element isn't visible and `execute` runs immediately (core behaviour). Acceptable; note it.
- **PATTERN**: ecommerce task 10.
- **GOTCHA**:
  - Route-pattern matching is URLPattern in Phase 2 (roadmap: "URLPattern pathname patterns"), so `/flights/booking` must not match the results pattern. It won't, since segment counts differ. Add an e2e assertion that `filter_results` is absent on `/flights/booking`.
  - URLPattern is available in Chrome and Safari 26 and is polyfilled in Phase 2 if needed.
- **VALIDATE**: `pnpm --filter @web-agents/example-flights typecheck && pnpm --filter @web-agents/example-flights test`

### 18. CREATE Playwright config + e2e specs for both apps

- **IMPLEMENT**:
  - `playwright.config.ts` (per app):
    ```ts
    import { defineConfig, devices } from "@playwright/test";
    export default defineConfig({
      testDir: "e2e", fullyParallel: true, retries: process.env.CI ? 2 : 0,
      use: { baseURL: "http://localhost:5174", trace: "on-first-retry", reducedMotion: "reduce" },
      webServer: { command: "pnpm dev", url: "http://localhost:5174", reuseExistingServer: !process.env.CI, timeout: 60_000 },
      projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }, { name: "mobile", use: { ...devices["Pixel 7"] } }],
    });
    ```
    - `reducedMotion: "reduce"` makes the cursor snap, which keeps tests fast and deterministic. Add **one** test with `test.use({ reducedMotion: "no-preference" })` that asserts the cursor element becomes visible.
  - `e2e/store.spec.ts`:
    1. `tools by scope`: on `/`, `await page.evaluate(() => window.agent!.list())` names include `search_products`, `open_product`, `get_cart`, `open_cart` and exclude `update_cart_item` and `add_to_cart`.
    2. `open_product → add_to_cart`: run `open_product {slug}`, expect the URL `/product/slug`; run `add_to_cart {variant:"M", qty:2}`, expect the drawer open with a line "2 ×"; and `update_cart_item` is now listed.
    3. `add_to_cart without variant` returns text starting with `Error: Choose a Size`, and the error is visible on the page (`role=alert`).
    4. `drawer tools unregister on close`: press Escape, and `update_cart_item` is no longer listed.
    5. `checkout confirm gate`:
       - Go to `/checkout` with items and run `checkout {email, name, …}` **without awaiting**.
       - Expect the place-order button to have `[data-tool-submit-active]` (the polyfill mirror).
       - The run promise is still pending after 500ms.
       - Click the button; the run resolves with `Order FS-`; the URL becomes `/order/…`.
    6. `apply_promo WELCOME10` updates totals; a bad code shows the error.
  - `e2e/flights.spec.ts`:
    1. `search_flights {from:"LHR",to:"DXB",date:<today+7>,trip:"oneway",cabin:"economy",adults:1}` resolves "Found N flights", and the URL matches the results pattern.
    2. Results tools are present (`filter_results`) and absent on `/`.
    3. `filter_results {stops:"0"}`: every card shows "Direct".
    4. `sort_results {by:"price-desc"}`: prices on cards are non-increasing.
    5. `list_results` → take the first id → `select_flight {flightId}` gives the URL `/flights/booking`, and `filter_results` is absent.
    6. `book_flight` before details returns `Error: Missing traveler details`.
    7. `fill_traveler_details {...}` → `book_flight {acceptTerms:true}` (not awaited) → confirm gate → click → URL `/bookings/SK-…` → `get_booking {reference}` resolves with the itinerary.
    8. Invalid results URL `/flights/xxx/dxb/...` shows the readable error page, not a blank one.
  - Helper `e2e/agent.ts`: `run(page, name, args)` = `page.evaluate(([n, a]) => window.agent!.run(n, a), [name, args])`, returning the joined text content. `list(page)` returns tool names.
  - Use `?latency=0` in flights tests.
- **PATTERN**: `apps/playground/dev` / Phase 3 devtools expose `window.agent = { run, list }` (types in core `webmcp.d.ts` `interface Window { agent?: … }`).
- **GOTCHA**:
  - `window.agent.run` swallows errors and returns `undefined` on throw (`agent-console.ts` `run`). Assert on returned text, and on `undefined` for thrown cases.
  - Polyfill pause detection uses `data-tool-submit-active`; native Chrome uses `:tool-submit-active`. Tests run against the polyfill (Playwright's Chromium has no WebMCP flag).
  - Mobile project: the drawer is a bottom sheet, so assertions must use roles, not positions.
- **VALIDATE**: `pnpm --filter @web-agents/example-ecommerce exec playwright install chromium && pnpm --filter @web-agents/example-ecommerce e2e && pnpm --filter @web-agents/example-flights e2e`

### 19. UPDATE root `turbo.json`, root `package.json`, `.gitignore`

- **IMPLEMENT**:
  - `turbo.json` `tasks`: `"e2e": { "dependsOn": ["^build"], "cache": false, "passThroughEnv": ["CI", "PLAYWRIGHT_*"] }`. `^build` is only needed if an app is consumed in compiled form; with the source condition it can be `[]`. Mirror whatever `dev` uses in Phase 1.
  - Root `package.json` scripts: `"e2e": "turbo e2e"`.
  - `.gitignore`: `playwright-report/`, `test-results/`, `blob-report/`, `.vercel`.
  - Confirm the root `vitest.config.ts` `projects` glob includes `apps/*`. The apps' node-env tests (`src/data/*.test.ts`) need each app's own `vitest` config **or** an inline project entry with `environment: "node"`. Add `apps/<name>/vitest.config.ts` with `test: { include: ["src/**/*.test.ts"], environment: "node" }`, and make sure Playwright's `e2e/*.spec.ts` are **excluded** from Vitest.
- **VALIDATE**: `pnpm turbo typecheck test build --filter=./apps/*`

### 20. POLISH pass + docs

- **IMPLEMENT**: load the `polish` and `a11y` skills and go through their checklists for both apps:
  - favicons and `theme-color`;
  - titles per route;
  - focus rings everywhere;
  - `::selection` colour;
  - tabular numbers for prices and times;
  - 404 page;
  - skip link;
  - headings are a single h1 per page;
  - all icon buttons named;
  - contrast ≥ 4.5:1 (check `--ink-3` on `--bg`; if it fails, darken it);
  - `prefers-reduced-motion` respected;
  - 200% zoom still usable;
  - mobile at 375px has no horizontal scroll.
  - Add `apps/ecommerce/README.md` and `apps/flights/README.md`, each about 30 lines: what it shows, the tool table (id, kind, scope, confirm?) and "try it" steps (`pnpm dev`, open devtools, run X).
  - Add an "Examples" section in the root `README.md` that links both, with ports.
- **VALIDATE**: `pnpm lint && pnpm typecheck`, then the Level 4 manual checks.

---

## TESTING STRATEGY

### Unit Tests

Vitest node env, in each app at `src/**/*.test.ts`. Pure modules only:

- **ecommerce `data/catalog.ts`:**
  - search ranking (prefix before substring);
  - category filter;
  - unknown slug throws with the slug in the message;
  - `related` excludes the product itself and returns ≤ n;
  - `money` formatting from cents.
- **ecommerce cart rules:** extract the totals and validation math into `store/cartRules.ts` (pure) so it is testable without React:
  - free-shipping threshold boundary (9999 / 10000 / 10001 cents);
  - promo math rounding;
  - variant required;
  - qty bounds.
- **flights `data/flights.ts`:**
  - determinism;
  - result count range;
  - all flights match from/to/cabin;
  - stops filter;
  - airline filter (by name or code, case-insensitive);
  - each sort mode;
  - durations are positive and arrivals are after departures.
- **flights `lib/searchParams.ts`:**
  - round-trip encode and decode;
  - lower/upper-case codes;
  - invalid airport;
  - past date;
  - infants > adults;
  - same origin and destination.

### Integration Tests

Playwright e2e (task 18) against `vite dev` with the polyfill:

- tool registration by scope: global, route and component;
- navigation tools;
- error propagation to the agent and the UI;
- the confirm gate on `checkout` / `book_flight`.

Run in two projects: Desktop Chrome and Pixel 7.

### Edge Cases

- `open_product` with an unknown slug returns `Error: Unknown product "x"` and does not navigate.
- `add_to_cart` when the qty exceeds stock gives an error naming the max. When the product is sold out, the form is not rendered, so the tool is absent.
- The cart drawer is opened by the user while an agent call is in flight. The tools register and the run is unaffected.
- `update_cart_item qty:0` removes the line. If the line was the last one, the drawer shows the empty state, and the drawer tools stay registered while it is open, answering "Cart is empty".
- `select_flight` with an id from a previous search returns a readable error.
- `search_flights` with `trip:"roundtrip"` and no `returnDate` returns an error asking for `returnDate`.
- The user moves the mouse mid-run (yield-to-user, Phase 1). The run completes, and the cursor hides. Check this manually.
- The page is reloaded on `/flights/booking`: the `loader` redirects to `/`, with no crash.
- The browser has native WebMCP (Chrome with the flag). The polyfill steps aside, and `:tool-submit-active` is used. Run a manual check if a WebMCP-enabled Chrome is available.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm lint                                   # biome check at root
pnpm turbo typecheck --filter=./apps/*
```

### Level 2: Unit Tests

```bash
pnpm --filter @web-agents/example-ecommerce test
pnpm --filter @web-agents/example-flights test
pnpm test                                   # whole repo, no regressions in packages/* or playground
```

### Level 3: Integration Tests

```bash
pnpm --filter @web-agents/example-ecommerce exec playwright install chromium
pnpm turbo e2e --filter=./apps/ecommerce --filter=./apps/flights
pnpm turbo build                            # every app and package builds
```

### Level 4: Manual Validation

Use the `agent-browser` skill for each app (`pnpm --filter <app> dev`).

1. **Ecommerce** (`http://localhost:5174`):
   - Open the devtools, run `open_product {"slug":"<variant-product>"}`. Watch the navigation.
   - Run `add_to_cart {"variant":"M","qty":2}`. The cursor selects the variant, types the qty and clicks "Add to cart"; the drawer slides in.
   - Run `update_cart_item` and watch the cursor move to the stepper inside the drawer. Take a screenshot to confirm the cursor is visible above the modal dialog (see task 11 GOTCHA).
   - Go to checkout and run `checkout` with contact args. The cursor parks on "Place order · $…" with the confirm prompt. Click it, and confirm the order page.
2. **Flights** (`http://localhost:5175`):
   - Run `search_flights` and watch the cursor type the airports and date, then the results skeleton, then the cards.
   - Run `filter_results {"stops":"0"}` and `sort_results`, then `select_flight`.
   - Run `fill_traveler_details`, then `book_flight`. The cursor parks, you click, and the confirmation page shows.
3. While a run is in progress, move the mouse. The cursor must disappear immediately and the run must still finish (issue #1).
4. Test at a 375px viewport (`agent-browser set viewport 375 812`). Check: no horizontal scroll, the drawer as a bottom sheet, the filters sheet, and tap targets ≥ 44px.
5. Check reduced motion (`agent-browser` emulate `prefers-reduced-motion: reduce`): no travel animations, and the drawer fades.

### Level 5: Additional Validation (Optional)

Run the `e2e-test` skill against each app to research user journeys and test them all with screenshots. Then run `/code-review` and `/simplify` on the diff, and `react-doctor` on `apps/ecommerce` and `apps/flights`.

---

## ACCEPTANCE CRITERIA

- [ ] `apps/ecommerce` and `apps/flights` exist, build, typecheck and run on ports 5174 / 5175 under `pnpm dev` alongside the playground.
- [ ] Visual language matches the references: ecommerce is near-monochrome with black pills, a gradient accent word, mono eyebrows and a cart drawer; flights uses Poppins, `#1c6bd2`, a card-based search, a filters sidebar, segmented sort and a booking summary. Only original brand names and assets are used.
- [ ] Ecommerce tools: `search_products`, `open_product`, `browse_category`, `get_cart`, `open_cart` (global); `add_to_cart`, `apply_promo`, `checkout`, `subscribe_newsletter` (mounted with their page); `update_cart_item`, `remove_from_cart` (only while the drawer is open).
- [ ] Flights tools: `search_flights`, `get_booking` (global); `filter_results`, `sort_results`, `select_flight`, `list_results` (results route only); `fill_traveler_details`, `book_flight` (booking page).
- [ ] `checkout`, `book_flight` and `subscribe_newsletter` pause for user confirmation, and nothing is committed without a user click.
- [ ] Navigation tools answer before navigating, and no call is cancelled by its own navigation (verified by e2e).
- [ ] Every tool error is visible in the UI and returned to the agent with the same text.
- [ ] Unit tests (node) and Playwright e2e (desktop + mobile) pass.
- [ ] The cursor theme matches each brand through the `--agent*` tokens. The cursor stays visible over the cart drawer, or the core issue is documented.
- [ ] Polish and a11y checklists pass: titles, focus, skip link, contrast, reduced motion, 375px layout, named icon buttons.
- [ ] `vercel.json` SPA rewrite present in both apps.
- [ ] No regressions: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` are green repo-wide.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + e2e)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms the cursor, spotlight, confirm gates and yield-to-user in both apps
- [ ] Acceptance criteria all met
- [ ] `/code-review`, `/simplify`, `react-doctor` run; findings addressed
- [ ] Committed with `/commit` in coherent chunks (scaffold, data, ecommerce UI, ecommerce tools, flights UI, flights tools, e2e, polish)

---

## NOTES

### Design decisions

- **Styling: plain CSS with tokens + CSS Modules. Tailwind v4 was not chosen.**
  - It has zero build plugins and zero runtime. Vite handles `*.module.css` natively.
  - Brand theming is a single `tokens.css` per app, and the same custom properties drive the core cursor (`--agent*`). One mental model: CSS variables everywhere.
  - Example code stays readable for people copying it into non-Tailwind codebases, which matters for a library demo.
  - Perf is equal or better: no utility-class scanning, and per-route CSS is code-split automatically by Vite.
  - Tailwind would have been fine. Revisit only if the apps grow a shared design system.
- **No `packages/ui`.** The two apps intentionally look different. The shared behaviour lives in `@web-agents/react` and `@web-agents/core`. Duplicated primitives (`EmptyState`, `QtyStepper`, icons) are small. Extract later only if a third app needs them.
- **`<select>` over radios for enum fields** (`variant`, `trip`). The polyfill's `schemaFor` emits `enum` only for `<select>`. An enum in the schema greatly improves agent accuracy. Radios can be presentational and synced. A follow-up for Phase 1/2: teach the polyfill to emit `enum` for radio groups sharing a `name`.
- **Stable tool names per page** (`add_to_cart`, not `add_to_cart_<sku>`). Agents reason better with a small, stable tool set. The playground keeps the per-SKU pattern to show multiple forms.
- **Navigation inside tools: answer first, navigate after the `useToolAnswer` grace** (`answerThenNavigate`). Chrome cancels a call whose tool definition changes mid-flight, and `executeTool` resolves `null` on document navigations.
- **Module-level store accessors** (`cartActions()`, `bookingActions()`, `uiActions()`) let module-scope `defineWebTool` tools reach React state, the same way `router.navigate` works outside components. They throw a clear error when not mounted.
- **Mock latency** (`?latency=`) exists so the agent visuals are shown against realistic loading states. Tests set it to 0.

### Tool tables

**Ecommerce**

| id | kind | scope | confirm |
|---|---|---|---|
| `search_products` | declarative (header form) | global | no (autosubmit) |
| `open_product` | imperative | global | no |
| `browse_category` | imperative | global | no |
| `get_cart` | imperative, readOnly | global | no |
| `open_cart` | imperative | global | no |
| `add_to_cart` | declarative | product page | no (autosubmit) |
| `update_cart_item` | imperative | cart drawer open | no |
| `remove_from_cart` | imperative, destructive | cart drawer open | no (reversible) |
| `apply_promo` | declarative | checkout page | no (autosubmit) |
| `checkout` | declarative | checkout page | **yes** |
| `subscribe_newsletter` | declarative | home page | **yes** |

**Flights**

| id | kind | scope | confirm |
|---|---|---|---|
| `search_flights` | declarative | home + results (mounted) | no (autosubmit) |
| `get_booking` | imperative, readOnly | global | no |
| `filter_results` | imperative | results route | no |
| `sort_results` | imperative | results route | no |
| `list_results` | imperative, readOnly | results route | no |
| `select_flight` | imperative | results route | no |
| `fill_traveler_details` | declarative | booking page | no (autosubmit) |
| `book_flight` | declarative | booking page | **yes** |

### Follow-ups surfaced for other phases (do not implement here)

- **Phase 2:** `WebToolConfig.target` as a function `(input) => Element | null`, so per-item tools (`update_cart_item`, `select_flight`) animate to the exact row. Until then, point `target` at the list container.
- **Phase 1 core:** if the cursor and spotlight render under a modal `<dialog>` (top layer), the core must promote its overlay into the top layer (for example `popover="manual"` + `showPopover()` after any dialog opens). Report what you observed.
- **Phase 1 polyfill:** emit `enum` for radio groups and `format: "date"` for `type=date` inputs.
- **Phase 7:** decide whether to ship `@web-agents/polyfill` in production demos (behind `VITE_WEBMCP_POLYFILL=1`), since most visitors won't have native WebMCP. Without it the deployed demos show no tools.
- **Phase 5:** the chat widget mounts in both apps' `Root`; leave a `{/* Phase 5: <AgentChat/> */}` placeholder.

### Risks

- Dependence on exact Phase 2 export names. Task 0 guards this.
- Top-layer stacking of the cursor over `<dialog>` (task 11).
- `<input type="date">` and native Chrome declarative fill formats are unverified against native WebMCP. The polyfill path is verified by e2e.
- Two full apps is a lot of UI. If time-boxed, ship ecommerce end-to-end first (tasks 1–11, its half of 18), then flights.

**Confidence score: 7/10** for one-pass success. The main uncertainties are the exact Phase 2/3 API surface, the top-layer cursor stacking and the volume of UI work, not the approach.
