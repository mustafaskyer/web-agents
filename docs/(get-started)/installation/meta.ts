import { defineMeta } from "blume";

// A disclosure inside "Get started", open from the start: its row links to the index page (the card grid).
export default defineMeta({
  title: "Installation",
  display: "group",
  collapsed: false,
  pages: ["vite", "nextjs", "tanstack-start", "astro", "no-framework"],
});
