import { Button } from "@/components/ui/button";
import { cart } from "@/lib/cart";

// A person clicks this.
export function ClearCartButton() {
  return (
    <Button variant="destructive" onClick={() => cart.clear()}>
      Clear cart
    </Button>
  );
}
