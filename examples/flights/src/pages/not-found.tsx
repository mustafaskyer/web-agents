import { buttonVariants } from "@webmcp-agents/examples-ui/components/button";
import { CompassIcon, TriangleAlertIcon } from "lucide-react";
import { Link } from "react-router";
import { EmptyState } from "../components/empty-state";
import { Page } from "../components/page";
import { useRouteErrorMessage } from "../hooks/use-route-error-message";
import { useTitle } from "../hooks/use-title";

export function NotFound({
  title = "We couldn't find that page",
  body = "It may have moved, or the link has a typo.",
}: {
  title?: string;
  body?: string;
}) {
  useTitle("Not found");
  return (
    <Page className="max-w-2xl py-14">
      <EmptyState
        as="h1"
        icon={<CompassIcon />}
        title={title}
        body={body}
        action={
          <Link to="/" className={buttonVariants()}>
            Search flights
          </Link>
        }
      />
    </Page>
  );
}

/** A loader's 400 (a malformed search URL) or an unexpected error: always a readable page, never a blank one. */
export function RouteError() {
  const { notFound, title, message } = useRouteErrorMessage();
  useTitle("Something went wrong");
  if (notFound) return <NotFound />;
  return (
    <Page className="max-w-2xl py-14">
      <EmptyState
        as="h1"
        icon={<TriangleAlertIcon />}
        title={title}
        body={message}
        action={
          <Link to="/" className={buttonVariants()}>
            Start a new search
          </Link>
        }
      />
    </Page>
  );
}
