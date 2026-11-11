import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import type { ComponentProps } from "react";

/** The page column every route uses: one width and one gutter, so the header, content and footer line up. */
export function Page({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />;
}
