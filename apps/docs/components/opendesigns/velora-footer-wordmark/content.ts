import { brand } from "../_shared/brand";

export interface WordmarkFooterLink {
  href: string;
  id: string;
  label: string;
}
export interface WordmarkFooterDestinations {
  attribution: string;
  collaboration: string;
  content: string;
  home: string;
  keyboard: string;
  layout: string;
  review: string;
  states: string;
  usage: string;
}
export const availableWordmarkLinks = (links: readonly WordmarkFooterLink[]) =>
  links.filter(
    (link) =>
      link.href.trim() !== "" &&
      link.href.trim() !== "#" &&
      link.label.trim() !== ""
  );

/** Original qualitative reading data; no implicit email, account, policy or external profile. */
export const createFooterWordmarkStudy = (
  destinations: WordmarkFooterDestinations
) => ({
  auxiliaryLinks: [
    { href: destinations.keyboard, id: "keyboard", label: "Navigation" },
    { href: destinations.review, id: "review", label: "Studio" },
    { href: destinations.attribution, id: "credits", label: "Credits" },
  ],
  contactAction: {
    href: destinations.collaboration,
    label: "Contact us",
  },
  homeAction: { href: destinations.home, label: `${brand.name} home` },
  links: [
    { href: destinations.content, id: "content", label: "Library" },
    { href: destinations.layout, id: "layout", label: "Collections" },
    { href: destinations.states, id: "states", label: "Support" },
    { href: destinations.keyboard, id: "keyboard", label: "Navigation" },
    { href: destinations.review, id: "review", label: "Studio" },
    {
      href: destinations.collaboration,
      id: "collaboration",
      label: "Contact",
    },
  ],
  policyLinks: [
    { href: destinations.usage, id: "usage", label: "Installation" },
    { href: destinations.attribution, id: "attribution", label: "Attribution" },
  ],
});
