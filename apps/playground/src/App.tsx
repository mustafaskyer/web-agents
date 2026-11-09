import { AgentChat, createCloudAdapter } from "@webmcp-agents/chat";
import { createLocalAdapter, DEFAULT_MODEL } from "@webmcp-agents/local-agent";
import { EnableTools, usePathname, WebAgentsProvider } from "@webmcp-agents/react";
import { lazy, type MouseEvent, type ReactNode, Suspense } from "react";
import { Orders } from "./Orders";
import { CartProvider, PRODUCTS, money, useCart } from "./store";
import { AddToCartForm } from "./tools/AddToCartForm";
import { ApplyPromoForm } from "./tools/ApplyPromoForm";
import { CheckoutForm } from "./tools/CheckoutForm";
import { catalog } from "./tools/catalog";
import { ClearCartButton } from "./tools/ClearCartButton";

// Dev only: the condition guards the import() itself, so the production bundle has no devtools.
const Devtools = import.meta.env.DEV ? lazy(() => import("./Devtools")) : () => null;

// Once per page. Cloud checks /api/chat on first use; on-device downloads a model only after the person's click.
const ADAPTERS = [createCloudAdapter(), createLocalAdapter({ models: [DEFAULT_MODEL, "onnx-community/Qwen3-1.7B-ONNX"] })];

const GLOBAL_TOOLS = ["get_cart"];
const ROUTE_TOOLS = { "/orders": ["list_orders"] };
const VISUALS = {
  log: (entry: unknown) => console.debug("[agent-visuals]", entry),
  spotlight: false, // blur the page except the tool the agent is working in (toggle in devtools Settings)
};

function Totals() {
  const cart = useCart();
  const { subtotal, discount, total } = cart.totals;
  // Nothing to total; but an applied code stays visible so it can be removed.
  if (cart.items.length === 0 && !cart.promo) return null;
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{money(subtotal)}</dd>
      </div>
      {cart.promo && (
        <div className="discount">
          <dt>
            Promo <code>{cart.promo}</code>{" "}
            <button
              type="button"
              className="link"
              toolname="remove_promo"
              onClick={() => cart.removePromo()}
              aria-label={`Remove promo ${cart.promo}`}
            >
              Remove
            </button>
            {/* The agent can remove the code only while it's shown. */}
            <EnableTools names={["remove_promo"]} />
          </dt>
          <dd>−{money(discount)}</dd>
        </div>
      )}
      <div className="total">
        <dt>Total</dt>
        <dd>{money(total)}</dd>
      </div>
    </dl>
  );
}

function Cart() {
  const cart = useCart();
  const count = cart.items.reduce((n, i) => n + i.qty, 0);
  const lastOrder = cart.orders.at(-1);
  return (
    <section className="cart">
      <header>
        <h2>
          Cart <span className="badge">{count}</span>
        </h2>
        <ClearCartButton />
      </header>
      {cart.items.length === 0 ? (
        <p className="muted">Empty.</p>
      ) : (
        <ul>
          {cart.items.map((i) => (
            <li key={i.sku}>
              {i.qty} × {i.name} <span className="muted">{money(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
      )}
      <Totals />
      <ApplyPromoForm />
      <CheckoutForm />
      {lastOrder && (
        <p className="muted">
          Last order: {lastOrder.id} · {money(lastOrder.total)}
          {lastOrder.promo ? ` (promo ${lastOrder.promo})` : ""}
        </p>
      )}
    </section>
  );
}

function Shop() {
  return (
    <section className="catalog">
      <h1>Storefront</h1>
      <p className="muted">Each card is a declarative WebMCP tool. Open the devtools (bottom right, or Alt+Shift+A) to call one.</p>
      <div className="grid">
        {PRODUCTS.map((p) => (
          <article key={p.sku} className="card">
            <h3>{p.name}</h3>
            <p>{money(p.price)}</p>
            <AddToCartForm product={p} />
          </article>
        ))}
      </div>
    </section>
  );
}

function NavLink({ to, path, children }: { to: string; path: string; children: ReactNode }) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let the browser open a new tab
    e.preventDefault();
    if (to === path) return;
    history.pushState(null, "", to);
    // pushState fires no event; the Navigation API reports it, but browsers without it need this.
    dispatchEvent(new PopStateEvent("popstate"));
  }
  return (
    <a href={to} onClick={onClick} aria-current={to === path ? "page" : undefined}>
      {children}
    </a>
  );
}

/** Inside CartProvider, so the tools' `ctx.context` can be the cart. */
function Shell() {
  const cart = useCart();
  const path = usePathname();
  return (
    <WebAgentsProvider tools={catalog} global={GLOBAL_TOOLS} routes={ROUTE_TOOLS} pathname={path} context={cart} visuals={VISUALS}>
      <nav className="tabs" aria-label="Sections">
        <NavLink to="/" path={path}>
          Shop
        </NavLink>
        <NavLink to="/orders" path={path}>
          Orders
        </NavLink>
      </nav>
      <main className="layout">
        {path === "/orders" ? <Orders /> : <Shop />}
        <Cart />
      </main>
      <AgentChat adapters={ADAPTERS} position={import.meta.env.DEV ? "bottom-left" : "bottom-right"} />
      <Suspense>
        <Devtools spotlight={VISUALS.spotlight} />
      </Suspense>
    </WebAgentsProvider>
  );
}

export default function App() {
  return (
    <CartProvider>
      <Shell />
    </CartProvider>
  );
}
