"use client";

import { MotionBoundary } from "../_shared/motion-boundary";
import { FaqAccordion, createFaqStudy } from "./component";

const Example = () => {
  const data = createFaqStudy("/blocks");
  return (
    <MotionBoundary className="bg-background text-foreground">
      <FaqAccordion {...data} />
    </MotionBoundary>
  );
};

export default Example;
