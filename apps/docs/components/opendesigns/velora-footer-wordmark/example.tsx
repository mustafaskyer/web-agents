"use client";

import { MotionBoundary } from "../_shared/motion-boundary";
import { FooterWordmark, createFooterWordmarkStudy } from "./component";

const Example = () => {
  const study = createFooterWordmarkStudy({
    attribution: "/docs/installation",
    collaboration: "/blocks/velora-contact-page",
    content: "/blocks/velora-feature-bento",
    home: "/blocks",
    keyboard: "/blocks/velora-navbar-mega",
    layout: "/blocks/velora-feature-bento",
    review: "/blocks/velora-testimonial-featured",
    states: "/blocks/velora-contact-page",
    usage: "/docs/installation",
  });
  return (
    <MotionBoundary className="bg-background text-foreground">
      <FooterWordmark {...study} />
    </MotionBoundary>
  );
};

export default Example;
