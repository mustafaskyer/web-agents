import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { EmptyState } from "../components/EmptyState";
import { useTitle } from "../lib/useTitle";

export function NotFound({
  title = "We couldn't find that page",
  body = "It may have moved, or the link has a typo.",
}: {
  title?: string;
  body?: string;
}) {
  useTitle("Not found");
  return (
    <div className="page">
      <EmptyState
        as="h1"
        title={title}
        body={body}
        action={
          <Link to="/" className="btn primary">
            Search flights
          </Link>
        }
      />
    </div>
  );
}

/** A loader's 400 (a malformed search URL) or an unexpected error: always a readable page, never a blank one. */
export function RouteError() {
  const error = useRouteError();
  useTitle("Something went wrong");
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
  const message = isRouteErrorResponse(error) ? String(error.data) : error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="page">
      <EmptyState
        as="h1"
        title={isRouteErrorResponse(error) && error.status === 400 ? "That search doesn't work" : "Something went wrong"}
        body={message}
        action={
          <Link to="/" className="btn primary">
            Start a new search
          </Link>
        }
      />
    </div>
  );
}
