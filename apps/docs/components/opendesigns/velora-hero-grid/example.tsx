"use client";

import { MotionBoundary } from "../_shared/motion-boundary";
import { GridHero } from "./component";

const Example = () => (
  <MotionBoundary className="bg-background text-foreground">
    <GridHero
      primaryAction={{ href: "/blocks?kind=template", label: "Get started" }}
      secondaryAction={{
        href: "/blocks",
        label: "Explore blocks",
      }}
    />
  </MotionBoundary>
);

export default Example;
