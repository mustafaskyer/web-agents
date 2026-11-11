"use client";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const MotionPolicy = createContext(false);
/** Internal deterministic capture policy; visitors never need to enable animations. */
export const useMotionPaused = () => useContext(MotionPolicy);
export const MotionBoundary = ({
  children,
  className = "ns-block-example",
}: {
  children: ReactNode;
  className?: string;
}) => {
  const paused = useMotionPaused();
  return (
    <div
      className={`relative isolate ${className}`}
      data-motion-paused={paused}
    >
      {children}
    </div>
  );
};
export const PreviewMotionProvider = ({
  paused,
  children,
}: {
  paused: boolean;
  children: ReactNode;
}) => <MotionPolicy.Provider value={paused}>{children}</MotionPolicy.Provider>;
