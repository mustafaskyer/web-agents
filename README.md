<div align="center">

# webmcp-agents

**Let AI agents use your web app, and let your users watch them do it.**

An agent's [WebMCP](https://developer.chrome.com/docs/ai/webmcp) tool calls, played on the page: a ghost cursor that
flies to the right control, types into the real fields, and stops for a person's click before anything consequential.
Your tools stay plain functions. Nothing is added to your markup.

[![npm](https://img.shields.io/npm/v/@webmcp-agents/core?label=%40webmcp-agents%2Fcore&color=111)](https://www.npmjs.com/package/@webmcp-agents/core)
[![CI](https://github.com/webmcp-agents/webmcp-agents/actions/workflows/ci.yml/badge.svg)](https://github.com/webmcp-agents/webmcp-agents/actions/workflows/ci.yml)
[![core ≤ 17.75 KB](https://img.shields.io/badge/core-%E2%89%A4%2017.75%20KB%20min%2Bgz-111)](packages/core)

[**Live demos**](https://webmcp-agents.dev/demos) · [Docs](https://webmcp-agents.dev/docs) ·
[Installation](https://webmcp-agents.dev/docs/installation) · [Examples](#examples)

<a href="https://webmcp-agents.dev/demos">
  <img src="docs/media/demo/field-store-checkout.gif" alt="An agent shops on Field Store: it searches for a bag, adds the Canvas Tote to the cart, fills the checkout form field by field, then waits on Place order until the person clicks it" width="880">
</a>

<sub>An agent searches, adds to cart and fills checkout on <b>Field Store</b>. It never places the order itself: the
cursor waits on <i>Place order</i> for the person's click.</sub>

</div>

## The cursor

Every tool call is something you can see, and nothing the agent does gets in the person's way.

<table>
  <tr>
    <td width="33%" valign="top">
      <img src="docs/media/cursor/typing.gif" alt="The cursor types a size and a quantity into the product form and presses Add to cart">
      <h3>It works the real UI</h3>
      <p>Finds the control by role and accessible name, types each value like a person (React Hook Form and TanStack
      Form hear it), presses the button. Your <code>execute</code> runs at the press.</p>
    </td>
    <td width="33%" valign="top">
      <img src="docs/media/cursor/confirm.gif" alt="The cursor fills checkout, then parks on Place order with a 'Click to confirm' label until the person clicks">
      <h3>It waits for a yes</h3>
      <p><code>requireConfirmation: true</code> parks the cursor on the button. The action runs on the person's own
      click, never the agent's; it gives up if they move on.</p>
    </td>
    <td width="33%" valign="top">
      <img src="docs/media/cursor/yield.gif" alt="The cart drawer opens while the cursor steps aside as the person scrolls">
      <h3>It never fights you</h3>
      <p>Scroll, click or type and the cursor vanishes at once; the tool still finishes. It comes back when you stop.
      Reduced motion snaps instead of flying.</p>
    </td>
  </tr>
</table>

## Why

- **Tools are pure.** A tool is `execute` plus a schema. The visual layer listens to events; tools never import it, and
  tools registered by other WebMCP libraries animate too.
- **One action, two callers.** The same `useWebTool` is what an agent calls and what the button does, so the agent
  can't drift from your UI.
- **Any agent.** Chrome's native WebMCP, a browser extension, the bundled `<AgentChat>` on any frontier model through
  the AI SDK, or a small model running on-device.
- **Works today, in any browser.** Where there is no native `document.modelContext`, the provider loads a polyfill (its
  own chunk, never downloaded where WebMCP exists).
- **Devtools included.** In development a panel lists the page's tools with a form per schema, shows the control each
  one finds, and records every call. `Alt+Shift+A`.

## Quick start

```bash
npm install @webmcp-agents/core @webmcp-agents/react
```

```tsx
import "@webmcp-agents/core/cursor.css";
import { WebAgentsProvider, useWebTool } from "@webmcp-agents/react";

function ClearCart() {
  const cart = useCart();

  // An agent calls this: the cursor finds the "Clear cart" button and waits for the person's click.
  useWebTool({
    id: "clear_cart",
    title: "Clear cart",
    description: "Empty the cart. The user confirms on the page.",
    requireConfirmation: true,
    execute: () => cart.clear(),
  });

  // A person clicks this.
  return <Button onClick={() => cart.clear()}>Clear cart</Button>;
}

<WebAgentsProvider>
  <App />
</WebAgentsProvider>;
```

Then follow [Installation](https://webmcp-agents.dev/docs/installation) for your framework (Vite, Next.js, TanStack
Start, Astro, or no framework). The packages are on npm (`@webmcp-agents/*`, one shared version).

<table>
  <tr>
    <td width="50%" valign="top">
      <a href="https://webmcp-agents.dev/demos"><img src="docs/media/demo/skyline-booking.gif" alt="An agent books a flight on Skyline: it searches Riyadh to Dubai, fills traveler details and parks on Book flight"></a>
      <br><b>Skyline</b> <sub>flight search, traveler details on TanStack Form, a confirm-gated booking</sub>
    </td>
    <td width="50%" valign="top">
      <img src="docs/media/devtools/timeline.png" alt="The devtools timeline under the playground: each call, who made it, how long it took, and when the person took over">
      <br><b>Devtools</b> <sub>every tool, a form per schema, a timeline of every call</sub>
    </td>
  </tr>
</table>

## Develop

```
pnpm install
pnpm dev         # every app: playground :5173, ecommerce :5174, flights :5175. Open the devtools (bottom right, Alt+Shift+A) and run a tool
pnpm check       # biome ci + typecheck + tests + build, everything CI runs
pnpm e2e         # Playwright end-to-end tests of the example apps (desktop + mobile)
# chat: put a provider key in apps/<app>/.env.local (see .env.example; Claude by default, or WEB_AGENTS_MODEL=openai/gpt-5.5 …), then open the Assistant bottom-left
```

Works in any browser: where there is no native WebMCP, the provider loads a polyfill of `document.modelContext` by
itself (its own chunk, never downloaded by a browser that has WebMCP). In a Chrome build with native WebMCP nothing is
loaded and the same code runs against the real API.

## Packages

Docs (introduction, installation per framework, the Build path, concepts, examples and the API reference): [docs/](docs/README.md). The website
is one app, [`apps/docs`](apps/docs/README.md) (`pnpm --filter @webmcp-agents/docs dev`, http://localhost:4321): the
landing page at `/`, whose own actions are WebMCP tools you can try from the page, recorded demos of the examples at
`/demos`, and the searchable docs under `/docs`.

| Package | |
|---|---|
| [`@webmcp-agents/core`](packages/core) | The visual layer (ghost cursor, spotlight, typing into fields, confirmation parking, yield-to-user, `onAgentEvent`), `defineWebTool` (`target`, `fields`, `fill`, `match`, flags, `invoke`), `locate`, `createWebAgents` (the framework-free entry that follows the URL itself) and the tool registry; the `document.modelContext` polyfill it loads where the browser has none (`@webmcp-agents/core/polyfill`). |
| [`@webmcp-agents/react`](packages/react) | `<WebAgentsProvider tools availableTools>` (the same line in every framework; it loads the polyfill where needed and the devtools in development), `useWebTool({ … })` returning `invoke`, `usePathname`, `useEnableTools`; `useToolAnswer` and JSX types for declarative forms. |
| [`@webmcp-agents/tools`](packages/tools) | Common tools, ready-made: `getTime`, `getLocation`, `getPage`, `goTo`, `goBack`, `scrollTo`, `setTheme`. |
| [`@webmcp-agents/polyfill`](packages/polyfill) | Deprecated: re-exports `@webmcp-agents/core/polyfill`, which the provider now loads itself. |
| [`@webmcp-agents/chat`](packages/chat) | `<AgentChat agent>`: a chat widget whose agent (any frontier model on your server through the AI SDK, or a custom `AgentAdapter`) works the live page through its WebMCP tools; `defineWebAgent` for instructions, tool subsets and sub-agents, with `agent.invoke(…)` and `useWebAgent` to run one without a chat; `/api/chat` handler and a Vite dev plugin. |
| [`@webmcp-agents/local-agent`](packages/local-agent) | An on-device `AgentAdapter`: Chrome's built-in model, or a small Qwen3 model in a Web Worker (transformers.js, WebGPU/WASM). Opt-in download; nothing leaves the browser. |
| [`@webmcp-agents/devtools`](packages/devtools) | Devtools panel: the page's tools with a generated form per schema, a timeline of every call (yours or an agent's), cursor settings. Each tool shows the control it finds, the fields it types into, its `match` and its flags. Installed by the provider in development; or by hand: `installWebAgentsDevtools()`, `<WebAgentsDevtools />` or a TanStack Devtools tab. `window.agent.invoke` (`run` is an alias). |

| App | |
|---|---|
| [`examples/playground`](examples/playground) | A storefront where every action is a WebMCP tool: forms as `useWebTool` + React Hook Form, an app-wide catalog with `match`, confirm-gated place-order and clear-cart, and one declarative form as the alternative. |

## Examples

Two realistic sites on mock data, with React Router 7. Each shows
app-wide tools (a catalog, some with `match`), component tools (`useWebTool`) and forms as tools on React Hook Form (Skyline's
traveler details on TanStack Form), and a confirm gate on the consequential step. Each app's README has its tool table.

| App | Port | |
|---|---|---|
| [`examples/ecommerce`](examples/ecommerce) | 5174 | **Field Store**: catalogue, product pages, a cart drawer whose tools exist only while it's open, checkout. |
| [`examples/flights`](examples/flights) | 5175 | **Skyline**: flight search, results with filters and sort, traveler details, booking and look-up. |
| [`examples/nextjs`](examples/nextjs) | 5176 | **Field Store on Next.js**: App Router + shadcn/ui; the chat is a shadcn block from the `@webmcp-agents` registry (`registry/`), `defineWebAgent` shared between the route handler and the client, the key tainted server-side; the same `<WebAgentsProvider tools={tools}>` line as the Vite apps. |
| [`apps/docs`](apps/docs) | 4321 | **The website**: the landing page, the Demos page (agent-browser clips of Skyline and Field Store) and the docs in one site. The site is an example too: its demos, docs links, FAQ, copy buttons, theme switch and search are WebMCP tools (`defineWebTool`), run from the hero's chips ("Try it as an agent would") or by any agent. |

`pnpm --filter @webmcp-agents/example-ecommerce dev` (or `…-flights`) runs one app on its own.

Roadmap and per-phase implementation plans live in [`.agents/plans/`](.agents/plans/00-web-agents-roadmap.md).

## How a tool looks

A tool is one action with two callers. `useWebTool` registers it for agents; the button is what a person clicks.
Nothing is added to the JSX for the cursor: it finds the control by role and accessible name (the tool's `title`), so a
tool needs no `toolname`, ref or id. This is a confirm-gated tool: the cursor parks on "Clear cart" and `clear` runs
only after the person's own click.

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

A form is the same hook plus an `inputSchema`: the cursor types each value into the field with that name or label (React
Hook Form and TanStack Form inputs hear it like any typing), presses the button, and `execute` runs at the press. For a
widget it cannot type into (a `Select`), `fill: (values) => form.reset(values)` puts the values on screen first.

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
      <form onSubmit={form.handleSubmit(add)} className="flex items-end gap-2">
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
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

App-wide tools go in one object, beside the common ones, and the provider is the same line in Vite, TanStack Start,
Next.js and Astro (the library follows the browser's URL itself, so nothing is wired to a router). A tool's `match`
says where it is on (`"/orders"`, `["/cart", "/checkout"]`, a RegExp); `availableTools` narrows what an agent may use
right now.

```tsx
export const tools = {
  getTime: getTime(),
  getPage: getPage(),
  goTo: goTo({ pages: { home: "/", cart: "/cart", orders: "/orders" } }),
  getCart,
  listOrders, // defineWebTool({ id: "list_orders", match: "/orders", … })
};

<WebAgentsProvider tools={tools}>
  <App />
</WebAgentsProvider>
```

`await tools.getCart.invoke()` calls a tool the way an agent would (the cursor moves, confirmation applies);
`await shopper.invoke("Reorder my last purchase.")` runs an agent with no chat on the page. Without React,
`createWebAgents({ tools })` from `@webmcp-agents/core` is the same provider.

```
examples/playground/src/
  webmcp-agents/      ← PURE. No cursor code anywhere.
    tools/               defineWebTool: get_cart (everywhere), list_orders (match "/orders"); index.ts is the catalog
    hooks/
      use-add-to-cart.ts       useWebTool + React Hook Form: add_to_cart_<sku>
      use-clear-cart.ts        useWebTool clear_cart (destructive, requireConfirmation)
      use-place-order.ts       useWebTool place_order (requireConfirmation)
      use-remove-promo.ts      useWebTool remove_promo
      use-apply-promo.ts       answers the one declarative <form toolname="apply_promo"> (the alternative)
  components/         ← UI only: props + hooks (add-to-cart-form.tsx, apply-promo-form.tsx, cart-panel.tsx, …)
  hooks/              ← app hooks: use-cart.ts (the store in React), use-orders.ts, use-page.ts, use-nav-link.ts
  app.tsx             ← <WebAgentsProvider tools={tools}> (installs the cursor, and the devtools in dev)
  store/cart.ts       ← the cart: a module store
  main.tsx            ← render (the provider loads the polyfill where it is needed)
  devtools.tsx        ← dev only, lazy, with ?tanstack: the devtools as a TanStack tab (devtools={false} on the provider)
packages/core         ← OUR LOGIC. Event-driven, installed once, never imports a tool. Holds the polyfill (src/polyfill/).
packages/react        ← provider + hooks: which tools are on, registered without churn; loads the devtools in dev
packages/polyfill     ← deprecated: re-exports core's polyfill (document.modelContext + declarative forms + events)
packages/devtools     ← dev only: the panel that plays the agent and records every call (react depends on it, not back)
```

Declarative `<form toolname>` tools and `toolname` markers still work (the playground keeps one declarative form);
they are covered in the docs' [Declarative forms](docs/more/declarative-forms.mdx) guide. Tools registered by other
libraries (e.g. `use-webmcp-tool`) still animate: the visual layer wraps `registerTool` whoever calls it. See
[packages/react/README.md](packages/react/README.md).

How the visual layer works, its options, yield-to-user and the WebMCP quirks it handles:
[packages/core/README.md](packages/core/README.md).

## Deploy your own

Each example app deploys as its own Vercel project with a guarded `/api/chat` (origin allow-list, per-IP rate limits,
a daily budget). Steps and the env var table: [docs/more/deploy.md](docs/more/deploy.md). Live demos: _coming with the first
deploy_.

## Repository

- pnpm workspaces + Turborepo (`turbo run build|typecheck|test|dev`), Biome for lint and format.
- CI (`.github/workflows/ci.yml`): Biome, typecheck, unit + browser tests, build, size budgets, publint +
  are-the-types-wrong (`check-exports`), then Playwright e2e. Releases: Changesets (`pnpm changeset`), published from
  a maintainer's machine by `pnpm release` (`scripts/release.mjs`); no CI job publishes.
- Packages build with tsdown. In this repo, apps and type-checking resolve packages to their
  TypeScript source through the `"@webmcp-agents/source"` export condition, so edits hot-reload
  without a build; published packages use `dist/`.
- Tests: Vitest. `*.test.ts` run in Node; `*.browser.test.ts` run in real Chromium (Vitest
  browser mode + Playwright). First run: `pnpm exec playwright install chromium`. The example apps
  add Playwright e2e tests in `examples/*/e2e` (`pnpm e2e`), which drive tools through `window.agent`.
