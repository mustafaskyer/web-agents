import type { ReactNode } from "react";

export interface PageHeadProps {
  title: string;
  eyebrow?: string;
  breadcrumbs?: ReactNode;
  lede?: string;
  /** How many products the page lists. */
  count?: number;
}

/** A listing page's title block: the eyebrow or breadcrumbs, the h1, a line about it and the count. */
export function PageHead({ title, eyebrow, breadcrumbs, lede, count }: PageHeadProps) {
  return (
    <div className="mb-10 flex flex-col gap-3 border-b pb-8">
      {breadcrumbs}
      {eyebrow && <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{eyebrow}</p>}
      <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">{title}</h1>
      {lede && <p className="max-w-xl text-muted-foreground">{lede}</p>}
      {count !== undefined && (
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {count} product{count === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
