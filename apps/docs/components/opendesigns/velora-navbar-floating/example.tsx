"use client";

import { NavbarFloating, createFloatingNavStudy } from "./component";

const Example = () => {
  const study = createFloatingNavStudy({
    guide: "/blocks",
    home: "/blocks",
    overview: "/blocks",
    reading: "/blocks/velora-editorial-list",
    review: "/blocks/velora-testimonial-featured",
    sections: "/blocks/velora-feature-bento",
    updates: "/blocks/velora-release-timeline",
  });
  return <NavbarFloating {...study} />;
};
export default Example;
