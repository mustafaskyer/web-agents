/**
 * The applied code's "Remove" link-button. Its tool, remove_promo, is `useRemovePromo` (webmcp-agents/hooks), on while
 * this button is mounted; the button's name, "Remove promo 123", starts with the tool's title.
 */
import { Button } from "@webmcp-agents/examples-ui/components/button";
import { useRemovePromo } from "../webmcp-agents/hooks/use-remove-promo";

export function RemovePromoButton({ code }: { code: string }) {
  const { remove } = useRemovePromo();

  // A person clicks this.
  return (
    <Button variant="link" size="xs" className="h-auto px-0 text-muted-foreground" onClick={remove} aria-label={`Remove promo ${code}`}>
      Remove
    </Button>
  );
}
