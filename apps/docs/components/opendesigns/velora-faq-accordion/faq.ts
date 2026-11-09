export interface FaqStudyAction {
  href: string;
  label: string;
}
export interface FaqStudyQuestion {
  action?: FaqStudyAction;
  answer: string;
  disabled?: boolean;
  id: string;
  question: string;
}
export interface FaqGuideTopic {
  id: string;
  initials: string;
  label: string;
}

/** Empty string is an intentional collapse, including after later content changes. */
export const resolveFaqValue = (
  questions: readonly FaqStudyQuestion[],
  requested: string
) => {
  if (requested === "") {
    return "";
  }
  return (
    questions.find(
      (question) => question.id === requested && !question.disabled
    )?.id ??
    questions.find((question) => !question.disabled)?.id ??
    ""
  );
};

export const faqGuideTopics: readonly FaqGuideTopic[] = [
  { id: "content", initials: "CT", label: "Library" },
  { id: "layout", initials: "LY", label: "Collections" },
  { id: "states", initials: "ST", label: "Support" },
];

const questions: readonly FaqStudyQuestion[] = [
  {
    answer:
      "Browse the collections to discover layouts, visual ideas and creative starting points.",
    id: "begin",
    question: "Where can I explore the library?",
  },
  {
    answer:
      "A collection brings related ideas together around a visual direction, project or theme.",
    id: "length",
    question: "What is inside a collection?",
  },
  {
    answer:
      "Use the editable source as a starting point and bring your own content and visual direction. Check the source license for usage terms.",
    id: "actions",
    question: "Can I make the designs my own?",
  },
  {
    answer:
      "The library supports Light and Dark appearances with shared colors and typography.",
    id: "claims",
    question: "Which appearance options are available?",
  },
  {
    answer:
      "Visit the journal for stories from the studio and explore related collections.",
    id: "context",
    question: "Where can I find more inspiration?",
  },
  {
    answer:
      "The library reflows for smaller screens, so you can explore collections wherever an idea finds you.",
    id: "narrow",
    question: "Can I browse on my phone?",
  },
  {
    answer:
      "Browse by category or collection, open a design that catches your eye and explore its details.",
    id: "consistency",
    question: "How do I find a starting point?",
  },
  {
    answer:
      "Visit the contact page with a question about the library, a collection or your next project.",
    id: "handoff",
    question: "Where can I get help?",
  },
];

/** Original study content with a required real contact-guide reading destination. */
export const createFaqStudy = (contactHref: string) => ({
  contactAction: { href: contactHref, label: "Explore the library" },
  questions,
  topics: faqGuideTopics,
});
