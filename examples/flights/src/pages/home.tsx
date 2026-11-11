import { Badge } from "@webmcp-agents/examples-ui/components/badge";
import { buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { Card } from "@webmcp-agents/examples-ui/components/card";
import { cn } from "@webmcp-agents/examples-ui/lib/utils";
import { ArrowRightIcon, Clock3Icon, HeadsetIcon, PlaneIcon, ShieldCheckIcon, SparklesIcon, TagIcon } from "lucide-react";
import { Link } from "react-router";
import { Page } from "../components/page";
import { SearchFlightsForm } from "../components/search-flights-form";
import { money } from "../data/flights";
import { useFeaturedRoutes } from "../hooks/use-featured-routes";
import { useTitle } from "../hooks/use-title";
import { formatDate } from "../lib/dates";

const WHY = [
  { icon: TagIcon, title: "Fares without surprises", body: "Taxes are in the total before you book." },
  { icon: ShieldCheckIcon, title: "Free changes for 24 hours", body: "Changed your mind? Cancel the same day at no cost." },
  { icon: Clock3Icon, title: "Live seat counts", body: "When a fare is nearly gone, you see it." },
  { icon: HeadsetIcon, title: "People, not menus", body: "Support answers in minutes, every day of the year." },
];

export function Home() {
  const { date, routes } = useFeaturedRoutes();
  useTitle("");

  return (
    <>
      <section className="relative overflow-hidden border-b bg-[radial-gradient(80rem_40rem_at_10%_-10%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent),linear-gradient(to_bottom,color-mix(in_oklch,var(--primary)_6%,var(--background)),var(--background))]">
        <Page className="grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-14 lg:py-20">
          <div className="flex flex-col gap-5">
            <Badge variant="outline" className="h-6 gap-1.5 bg-background/70 px-2.5">
              <SparklesIcon className="text-primary" />
              Skyline · a WebMCP demo
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Book your next adventure</h1>
            <p className="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              Search 30 airports and 10 airlines, compare fares side by side, and book in a minute. Or ask an agent to do it while you
              watch.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="#search" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5 text-base")}>
                Find a flight
              </a>
              <a href="#routes" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5 text-base")}>
                Featured routes
              </a>
            </div>
          </div>

          <Card id="search" className="scroll-mt-24 shadow-xl shadow-primary/5 [--card-spacing:--spacing(5)]">
            <div className="px-(--card-spacing)">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <PlaneIcon className="size-4" aria-hidden="true" />
                Flights
              </p>
              <SearchFlightsForm />
            </div>
          </Card>
        </Page>
      </section>

      <Page className="py-14">
        <section id="routes" aria-labelledby="routes-title" className="scroll-mt-20">
          <div className="mb-6 flex flex-col gap-1">
            <h2 id="routes-title" className="text-2xl font-semibold tracking-tight">
              Featured routes
            </h2>
            <p className="text-muted-foreground">Lowest one-way economy fares on {formatDate(date)}.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {routes.map(({ from, to, fromCity, toCity, path, best }) => (
              <li key={`${from}-${to}`}>
                <Link
                  to={path}
                  className="group flex h-full flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">
                      {fromCity} <span aria-hidden="true">→</span>
                      <span className="sr-only">to</span> {toCity}
                    </p>
                    <ArrowRightIcon
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground tabular-nums">
                    {from} · {to}
                  </p>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-2">
                    {best && (
                      <p className="text-sm whitespace-nowrap text-muted-foreground">
                        from <strong className="text-lg font-semibold text-foreground tabular-nums">{money(best.price)}</strong>
                      </p>
                    )}
                    {best && best.seatsLeft <= 3 && (
                      <Badge variant="destructive">
                        Only {best.seatsLeft} {best.seatsLeft === 1 ? "seat" : "seats"} left
                      </Badge>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="why" aria-labelledby="why-title" className="mt-16 scroll-mt-20">
          <h2 id="why-title" className="mb-6 text-2xl font-semibold tracking-tight">
            Why fly with us
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </Page>
    </>
  );
}
