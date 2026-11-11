"use client";
import { cn } from "@/lib/utils";
import * as React from "react";

const Avatar = ({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm" | "lg";
}) => (
  <div
    data-slot="avatar"
    data-size={size}
    className={cn(
      "group/avatar after:border-border relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
      className
    )}
    {...props}
  />
);
type ImageState = "loading" | "loaded" | "error";
const nativeImageState = (image: HTMLImageElement): ImageState => {
  if (!image.complete) {
    return "loading";
  }
  return image.naturalWidth > 0 ? "loaded" : "error";
};
const AvatarImage = ({
  alt,
  className,
  onError,
  onLoad,
  ref,
  sizes,
  src,
  srcSet,
  ...props
}: React.ComponentProps<"img">) => {
  const image = React.useRef<HTMLImageElement | null>(null);
  const [state, setState] = React.useState<ImageState>(
    src || srcSet ? "loading" : "error"
  );
  const attachImage = React.useCallback(
    (next: HTMLImageElement | null) => {
      image.current = next;
      const cleanup = typeof ref === "function" ? ref(next) : undefined;
      if (ref && typeof ref !== "function") {
        ref.current = next;
      }
      if (!next) {
        return cleanup;
      }
      setState(nativeImageState(next));
      return () => {
        if (image.current === next) {
          image.current = null;
        }
        if (typeof cleanup === "function") {
          cleanup();
        } else if (typeof ref === "function") {
          ref(null);
        } else if (ref?.current === next) {
          ref.current = null;
        }
      };
    },
    [ref]
  );
  React.useLayoutEffect(() => {
    if (image.current) {
      setState(nativeImageState(image.current));
    }
    // Native image readiness must be reread after a source or responsive-source commit, including cached images that emit no new load event.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- These props invalidate the native DOM image state read above.
  }, [sizes, src, srcSet]);
  return (
    // oxlint-disable-next-line next/no-img-element -- Registry primitives are portable to Vite and cannot depend on next/image.
    <img
      {...props}
      ref={attachImage}
      data-slot="avatar-image"
      alt={alt || ""}
      sizes={sizes}
      src={src}
      srcSet={srcSet}
      data-state={state}
      onLoad={(event) => {
        setState(nativeImageState(event.currentTarget));
        onLoad?.(event);
      }}
      onError={(event) => {
        setState(nativeImageState(event.currentTarget));
        onError?.(event);
      }}
      className={cn(
        "peer aspect-square size-full rounded-full object-cover data-[state=error]:hidden",
        className
      )}
    />
  );
};
const AvatarFallback = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="avatar-fallback"
    className={cn(
      "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-sm group-data-[size=sm]/avatar:text-xs peer-data-[state=error]:flex peer-[*]:hidden",
      className
    )}
    {...props}
  />
);
const AvatarBadge = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    data-slot="avatar-badge"
    className={cn(
      "bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-blend-color ring-2 select-none",
      "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
      "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
      "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
      className
    )}
    {...props}
  />
);
const AvatarGroup = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="avatar-group"
    className={cn(
      "group/avatar-group *:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2",
      className
    )}
    {...props}
  />
);
const AvatarGroupCount = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="avatar-group-count"
    className={cn(
      "bg-muted text-muted-foreground ring-background relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm ring-2 group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
      className
    )}
    {...props}
  />
);
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
};
