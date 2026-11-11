import { PlaneTakeoffIcon } from "lucide-react";
import { Page } from "./page";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-card">
      <Page className="flex flex-col gap-2 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <PlaneTakeoffIcon className="size-4 text-primary" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Skyline</strong> · a WebMCP demo. Every action on this site is a tool an agent can call.
          </span>
        </p>
        <p className="text-muted-foreground">Fictional airlines and fares. Nothing here flies.</p>
      </Page>
    </footer>
  );
}
