import { useWebTool } from "@webmcp-agents/react";

import { Button } from "@/components/ui/button";
import { cart } from "@/lib/cart";
import { clearCart } from "@/tools/clear-cart";

export function CartPanel({ open }: { open: boolean }) {
  // An agent calls this: the tool from tools/clear-cart.ts,
  // on while this panel is mounted and open.
  useWebTool(clearCart, { enabled: open });

  if (!open) return null;

  // A person clicks this.
  return (
    <aside className="flex flex-col gap-3">
      <p>Total: ${cart.total().toFixed(2)}</p>

      <Button variant="destructive" onClick={() => cart.clear()}>
        Clear cart
      </Button>
    </aside>
  );
}
