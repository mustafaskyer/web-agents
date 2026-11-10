/**
 * The clips on the Demos page (pages/demos.astro), one per example app. Each was recorded by
 * scripts/record-demo.sh with agent-browser driving the app's own WebMCP tools, offline, on the apps' mock data, with
 * the same person in both (Mustafa Elsayed, Riyadh). Plain data: <Demos> lays it out, `show_demo` names a demo by `id`.
 */
import { DOCS, REPO } from "@/lib/site";

export interface DemoData {
  /** The demo's name for `show_demo({ demo })` and its anchor on the page (`/demos#<id>`). */
  id: "skyline" | "field-store";
  /** The example app, as its docs page names it. */
  app: string;
  title: string;
  /** Two or three lines on what the agent does. */
  text: string;
  /** What the frame's address bar shows. */
  address: string;
  /** public/demo/<clip>.{webm,mp4}. */
  clip: string;
  /** Said once for assistive tech, since the clip has no narration. */
  description: string;
  /** The calls the agent made, in order, as it wrote them. */
  calls: string;
  /** How the app defines those tools, under the calls. */
  note: string;
  docs: string;
  source: string;
}

export const DEMOS: readonly DemoData[] = [
  {
    id: "skyline",
    app: "Skyline",
    title: "Book a flight, Riyadh to Dubai",
    text: "The agent searches flights, picks the first result and types the traveler's details into the booking form. Booking is the person's call: the cursor parks on Book flight until they click it.",
    address: "localhost:5175 · Skyline, the flights example",
    clip: "skyline-booking",
    description:
      "An agent searches Riyadh to Dubai, selects a flight, types the traveler's details, and parks on Book flight until a person clicks it.",
    calls: `search_flights({ from: "RUH", to: "DXB", date: "2027-03-12", adults: 1 })
list_results({ limit: 1 })
select_flight({ flightId: "F-…" })
fill_traveler_details({ firstName: "Mustafa", lastName: "Elsayed",
  email: "mustafa@mail.test", phone: "+966567891011", … })
book_flight({ acceptTerms: true })   // parks until the person clicks`,
    note: "list_results and select_flight are the results page's tools (match); search, traveler details and booking are forms with useWebTool (React Hook Form, and TanStack Form for the travelers), and book_flight has requireConfirmation, so it waits for a click.",
    docs: `${DOCS}/examples/skyline`,
    source: `${REPO}/tree/main/apps/flights`,
  },
  {
    id: "field-store",
    app: "Field Store",
    title: "Shop and check out, shipped to Riyadh",
    text: "The agent finds a bag, opens it, adds it to the cart and goes to checkout, where it types the contact and shipping details. The order is placed only when the person clicks Place order.",
    address: "localhost:5174 · Field Store, the e-commerce example",
    clip: "field-store-checkout",
    description:
      "An agent searches for a bag, opens the Canvas Tote, adds it to the cart, goes to checkout, types a Riyadh, Saudi Arabia shipping address, and parks on Place order until a person clicks it.",
    calls: `search_products({ query: "bag" })
open_product({ slug: "canvas-tote" })
add_to_cart({ qty: 1 })
go_to_page({ page: "checkout" })
checkout({ email: "mustafa@mail.test", name: "Mustafa Elsayed",
  address: "King Fahd Road 2411, Al Olaya", city: "Riyadh",
  postcode: "12214", country: "Saudi Arabia" })   // parks until the person clicks`,
    note: "open_product and go_to_page are app-wide tools that navigate; search, add to cart and checkout are React Hook Form forms with useWebTool, and checkout has requireConfirmation, so it waits for a click.",
    docs: `${DOCS}/examples/field-store`,
    source: `${REPO}/tree/main/apps/ecommerce`,
  },
];

export type DemoId = DemoData["id"];
export const DEMO_IDS = DEMOS.map((demo) => demo.id) as [DemoId, ...DemoId[]];
