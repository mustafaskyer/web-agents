import { buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { CompassIcon } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "../components/empty-state";
import { useTitle } from "../hooks/use-title";

export function NotFound() {
  useTitle("Not found");
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <EmptyState
        as="h1"
        title="We couldn't find that page"
        body="It may have moved, or the link has a typo."
        icon={<CompassIcon />}
        action={
          <Link to="/" className={cn(buttonVariants())}>
            Back to the store
          </Link>
        }
      />
    </div>
  );
}
