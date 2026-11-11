import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from "@webmcp-agents/examples-ui/components/empty";
import type { ReactNode } from "react";

/** One message, one way forward. `as="h1"` when it is the whole page (not found, a bad search). */
export function EmptyState({
  icon,
  title,
  body,
  action,
  as: Heading = "h2",
}: {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <Empty className="border bg-card py-12">
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <Heading className="text-lg font-semibold tracking-tight">{title}</Heading>
        {body && <EmptyDescription>{body}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
