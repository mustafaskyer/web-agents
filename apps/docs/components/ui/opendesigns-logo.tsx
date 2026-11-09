import { useBrandName } from "../opendesigns/_shared/brand";
import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export const OpenDesignsMark = ({
  className,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 32 32"
    width="32"
    height="32"
    aria-hidden="true"
    className={className}
    {...props}
  >
    <path
      fill="currentColor"
      d="M3 3h12v12H3zm14 0h12v12H17zM3 17h12v12H3zm14 0h12v12H17z"
    />
  </svg>
);
export const OpenDesignsLogo = ({
  className,
  name,
}: {
  className?: string;
  name?: string;
}) => {
  const liveName = useBrandName();
  return (
    // The project has no mark yet: the wordmark alone is the logo.
    <span className={cn("inline-flex items-center font-semibold tracking-tight", className)}>
      {name ?? liveName}
    </span>
  );
};
