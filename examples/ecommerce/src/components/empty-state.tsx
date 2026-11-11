import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@webmcp-agents/examples-ui/components/empty";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** The title's heading level: h1 when the empty state is the whole page. */
  as?: "h1" | "h2";
}

/** One message, one way forward. */
export function EmptyState({ title, body, icon, action, as: Heading = "h2" }: EmptyStateProps) {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <EmptyTitle>
          <Heading className="font-serif text-2xl font-normal tracking-tight">{title}</Heading>
        </EmptyTitle>
        {body && <EmptyDescription>{body}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
