import { errorText } from "@web-agents/core";
import type { LoaderFunctionArgs, RouteObject } from "react-router";
import { fromResultsParams, RESULTS_PATTERN } from "./lib/searchParams";
import { Booking } from "./pages/Booking";
import { Confirmation } from "./pages/Confirmation";
import { Home } from "./pages/Home";
import { MyBookings } from "./pages/MyBookings";
import { NotFound, RouteError } from "./pages/NotFound";
import { Results } from "./pages/Results";
import { Root } from "./Root";

/** A malformed or stale search URL becomes a readable 400, never a blank page. */
function resultsLoader({ params, request }: LoaderFunctionArgs) {
  try {
    return fromResultsParams(params, new URL(request.url).searchParams);
  } catch (err) {
    throw new Response(errorText(err), { status: 400, statusText: "Bad search" });
  }
}

export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Home /> },
          {
            path: RESULTS_PATTERN,
            loader: resultsLoader,
            element: <Results />,
            // first load straight onto a results URL: the loader runs before anything renders
            hydrateFallbackElement: <div className="page" aria-busy="true" />,
          },
          { path: "flights/booking", element: <Booking /> },
          { path: "bookings", element: <MyBookings /> },
          { path: "bookings/:ref", element: <Confirmation /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
];
