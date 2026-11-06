import { Link } from "react-router";
import { EmptyState } from "../components/EmptyState";
import { useTitle } from "../lib/useTitle";

export function NotFound() {
  useTitle("Not found");
  return (
    <div className="page">
      <h1 className="visually-hidden">Page not found</h1>
      <EmptyState
        title="We couldn't find that page"
        body="It may have moved, or the link has a typo."
        action={
          <Link to="/" className="btn primary">
            Back to the store
          </Link>
        }
      />
    </div>
  );
}
