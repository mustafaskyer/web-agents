import { brand } from "../_shared/brand";

export interface FloatingNavLink {
  disabled?: boolean;
  href: string;
  id: string;
  label: string;
  /** The WebMCP tool that acts on this link: it renders as a plain anchor with `toolname`, so the agent cursor finds it. */
  toolName?: string;
}
export interface FloatingNavDestinations {
  guide: string;
  home: string;
  overview: string;
  reading: string;
  review: string;
  sections: string;
  updates: string;
}
const bounded = (value: number, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
export const normalizeFloatingNav = (
  threshold = 80,
  compactWidth = 760,
  maxWidth = 1152
) => {
  const wide = bounded(maxWidth, 1152, 640, 1600);
  return {
    compactWidth: Math.min(wide, bounded(compactWidth, 760, 360, 1152)),
    maxWidth: wide,
    threshold: bounded(threshold, 80, 0, 1000),
  };
};
export const availableFloatingLinks = (links: readonly FloatingNavLink[]) =>
  links.filter(
    (link) =>
      link.label.trim() !== "" &&
      link.href.trim() !== "" &&
      link.href.trim() !== "#"
  );
export const createFloatingNavStudy = (
  destinations: FloatingNavDestinations
) => ({
  homeAction: { href: destinations.home, label: `${brand.name} home` },
  items: [
    { href: destinations.overview, id: "overview", label: "Overview" },
    { href: destinations.sections, id: "sections", label: "Features" },
    { href: destinations.reading, id: "reading", label: "Journal" },
    { href: destinations.review, id: "review", label: "Studio" },
    { href: destinations.updates, id: "updates", label: "Updates" },
  ],
  primaryAction: {
    href: destinations.guide,
    id: "guide",
    label: "Explore blocks",
  },
  secondaryAction: {
    href: destinations.review,
    id: "review-action",
    label: "Studio",
  },
});
