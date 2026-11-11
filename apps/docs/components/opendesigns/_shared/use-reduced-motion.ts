"use client";
// oxlint-disable promise/prefer-await-to-callbacks -- useSyncExternalStore uses a subscription callback by contract.
import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";
const subscribe = (callback: () => void) => {
  const media = matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
export const useReducedMotionPreference = () =>
  useSyncExternalStore(
    subscribe,
    () => matchMedia(query).matches,
    () => true
  );
