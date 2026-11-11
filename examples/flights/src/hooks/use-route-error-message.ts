import { isRouteErrorResponse, useRouteError } from "react-router";

/**
 * What went wrong on a route, in words: a loader's 400 (a malformed search URL), a 404, or an unexpected error.
 *
 * Returns `notFound` (show the not-found page), `title` and `message`.
 */
export function useRouteErrorMessage(): { notFound: boolean; title: string; message: string } {
  const error = useRouteError();
  const response = isRouteErrorResponse(error);
  return {
    notFound: response && error.status === 404,
    title: response && error.status === 400 ? "That search doesn't work" : "Something went wrong",
    message: response ? String(error.data) : error instanceof Error ? error.message : "Something went wrong.",
  };
}
