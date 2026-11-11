import { useEffect, useState } from "react";
import { copyInstallCommand, copyStepCode, onInstallCopied, onStepCopied } from "@/lib/clipboard";

/** How long a copy button says "Copied". */
const FLASH_MS = 2000;

/** `value` while the last copy is fresh, `idle` after; `subscribe` reports each copy (the person's or the agent's). */
function useFlash<T>(idle: T, subscribe: (listener: (value: T) => void) => () => void): T {
  const [value, setValue] = useState(idle);
  useEffect(() => {
    let timer = 0;
    const unsubscribe = subscribe((next) => {
      setValue(next);
      clearTimeout(timer);
      timer = window.setTimeout(() => setValue(idle), FLASH_MS);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [idle, subscribe]);
  return value;
}

const installCopied = (listener: (copied: boolean) => void): (() => void) => onInstallCopied(() => listener(true));

/** The install command's copy button: `copied` flashes after any copy of it, `copy` is the person's click. */
export function useCopyInstallCommand(): { copied: boolean; copy: () => void } {
  const copied = useFlash(false, installCopied);
  return { copied, copy: () => void copyInstallCommand() };
}

/** The steps' copy buttons: `copied` is the step just copied (1-based, 0 for none), `copy(n)` is the person's click. */
export function useCopyStepCode(): { copied: number; copy: (step: number) => void } {
  const copied = useFlash(0, onStepCopied);
  return { copied, copy: (step) => void copyStepCode(step) };
}
