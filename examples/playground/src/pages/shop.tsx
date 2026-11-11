/** /: the products. Each card's form is a tool, add_to_cart_<sku>. */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@webmcp-agents/examples-ui/components/card";
import { AddToCartForm } from "../components/add-to-cart-form";
import { useProducts } from "../hooks/use-products";
import { money } from "../lib/money";

export function Shop() {
  const { products } = useProducts();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Storefront</h1>
        <p className="text-sm text-muted-foreground">
          Each card is a WebMCP tool (<code>useWebTool</code> on a React Hook Form form). Open the devtools (bottom right, or Alt+Shift+A)
          to call one.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <Card key={p.sku}>
            <CardHeader>
              <CardTitle className="text-base">{p.name}</CardTitle>
              <CardDescription className="tabular-nums">{money(p.price)}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <AddToCartForm product={p} />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
