"use client";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import * as React from "react";
import {
  Pressable,
  composeRenderProps,
  Header as HeaderPrimitive,
  MenuItem as MenuItemPrimitive,
  Menu as MenuPrimitive,
  MenuSection as MenuSectionPrimitive,
  MenuTrigger as MenuTriggerPrimitive,
  Popover as PopoverPrimitive,
  Separator as SeparatorPrimitive,
  SubmenuTrigger as SubmenuTriggerPrimitive,
} from "react-aria-components";
import type {
  MenuItemProps as MenuItemPrimitiveProps,
  MenuSectionProps as MenuSectionPrimitiveProps,
} from "react-aria-components";

/** A trigger child that is not a RAC button still has to be pressable. */
const pressable = (child: React.ReactNode) =>
  React.isValidElement(child) && child.type !== Button ? (
    <Pressable>{child as React.ReactElement<React.DOMAttributes<HTMLElement>, string>}</Pressable>
  ) : (
    child
  );

const AriaDropdownMenuTrigger = ({
  ...props
}: React.ComponentProps<typeof MenuTriggerPrimitive>) => (
  <MenuTriggerPrimitive data-slot="dropdown-menu-trigger" {...props} />
);
const DropdownMenuContent = ({
  "data-slot": dataSlot = "dropdown-menu-content",
  placement = "bottom start",
  offset = 4,
  crossOffset = 0,
  align,
  side,
  sideOffset,
  style,
  className,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof MenuPrimitive<object>>,
  "children" | "className"
> &
  Pick<
    React.ComponentProps<typeof PopoverPrimitive>,
    "placement" | "offset" | "crossOffset"
  > & {
    "data-slot"?: string;
    className?: string;
    children?: React.ReactNode;
    align?: "start" | "center" | "end";
    /** Base UI parity: which side of the trigger the menu opens on. */
    side?: "top" | "right" | "bottom" | "left";
    sideOffset?: number;
    style?: React.CSSProperties;
  }) => (
  <PopoverPrimitive
    data-slot={dataSlot}
    style={style}
    placement={
      side
        ? ((align && align !== "center" ? `${side} ${align}` : side) as typeof placement)
        : align
        ? (
            {
              center: "bottom",
              end: "bottom end",
              start: "bottom start",
            } as const
          )[align]
        : placement
    }
    offset={sideOffset ?? offset}
    crossOffset={crossOffset}
    className={cn(
      "bg-popover text-popover-foreground ring-foreground/10 data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 **:data-[slot$=-item]:data-focused:bg-foreground/10 z-50 w-(--trigger-width) min-w-32 origin-(--trigger-anchor-point) overflow-x-hidden overflow-y-auto rounded-lg p-1 shadow-md ring-1 duration-100 outline-none data-exiting:overflow-hidden",
      className
    )}
  >
    <MenuPrimitive
      className="max-h-[inherit] overflow-x-hidden overflow-y-auto outline-hidden"
      {...props}
    >
      {children}
    </MenuPrimitive>
  </PopoverPrimitive>
);
const DropdownMenuGroup = ({
  ...props
}: Omit<MenuSectionPrimitiveProps<object>, "children"> & {
  children?: React.ReactNode;
}) => <MenuSectionPrimitive data-slot="dropdown-menu-group" {...props} />;
const DropdownMenuLabel = ({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof HeaderPrimitive> & {
  inset?: boolean;
}) => (
  <HeaderPrimitive
    data-slot="dropdown-menu-label"
    data-inset={inset}
    className={cn(
      "text-muted-foreground px-1.5 py-1 text-xs font-medium data-inset:pl-7",
      className
    )}
    {...props}
  />
);
const dropdownMenuItemVariants = cva(
  "group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      selectionMode: {
        multiple:
          "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm data-inset:pl-7 [&_svg:not([class*='size-'])]:size-4",
        none: "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:*:[svg]:text-destructive gap-1.5 rounded-md px-1.5 py-1 text-sm data-inset:pl-7 [&_svg:not([class*='size-'])]:size-4",
        single:
          "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm data-inset:pl-7 [&_svg:not([class*='size-'])]:size-4",
      },
    },
  }
);
const AriaDropdownMenuItem = ({
  className,
  inset,
  variant = "default",
  children,
  closeOnClick,
  render,
  onClick,
  ...props
}: Omit<MenuItemPrimitiveProps<object>, "render"> & {
  inset?: boolean;
  variant?: "default" | "destructive";
  /** Base UI style: keep the menu open when false. */
  closeOnClick?: boolean;
  /** Base UI style: a link element whose `href` this item navigates to. */
  render?:
    | MenuItemPrimitiveProps<object>["render"]
    | React.ReactElement<{ href?: string }>;
  onClick?: MenuItemPrimitiveProps<object>["onClick"];
}) => (
  <MenuItemPrimitive
    data-slot="dropdown-menu-item"
    data-inset={inset}
    data-variant={variant}
    shouldCloseOnSelect={closeOnClick}
    render={typeof render === "function" ? render : undefined}
    href={React.isValidElement<{ href?: string }>(render) ? render.props.href : props.href}
    onClick={onClick}
    textValue={typeof children === "string" ? children : props.textValue}
    className={composeRenderProps(
      className,
      (resolvedClassName, { selectionMode }) =>
        cn(dropdownMenuItemVariants({ selectionMode }), resolvedClassName)
    )}
    {...props}
  >
    {composeRenderProps(
      children,
      (resolvedChildren, { isSelected, selectionMode }) => (
        <>
          {selectionMode === "none" ? null : (
            <span
              className="pointer-events-none absolute right-2 flex items-center justify-center"
              data-slot={
                selectionMode === "single"
                  ? "dropdown-menu-radio-item-indicator"
                  : "dropdown-menu-checkbox-item-indicator"
              }
            >
              {isSelected ? (
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
              ) : null}
            </span>
          )}
          {resolvedChildren}
        </>
      )
    )}
  </MenuItemPrimitive>
);
const DropdownMenuSub = ({
  ...props
}: React.ComponentProps<typeof SubmenuTriggerPrimitive>) => (
  <SubmenuTriggerPrimitive data-slot="dropdown-menu-sub" {...props} />
);
const DropdownMenuSubTrigger = ({
  className,
  inset,
  children,
  ...props
}: MenuItemPrimitiveProps<object> & {
  inset?: boolean;
}) => (
  <MenuItemPrimitive
    data-slot="dropdown-menu-sub-trigger"
    data-inset={inset}
    textValue={typeof children === "string" ? children : props.textValue}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className
    )}
    {...props}
  >
    {composeRenderProps(children, (resolvedChildren) => (
      <>
        {resolvedChildren}
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          strokeWidth={2}
          className="ml-auto"
        />
      </>
    ))}
  </MenuItemPrimitive>
);
const DropdownMenuSubContent = ({
  placement = "end top",
  crossOffset = -3,
  offset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) => (
  <DropdownMenuContent
    data-slot="dropdown-menu-sub-content"
    className={cn(
      "bg-popover text-popover-foreground ring-foreground/10 w-auto min-w-[96px] rounded-lg p-1 shadow-lg ring-1 duration-100",
      className
    )}
    placement={placement}
    crossOffset={crossOffset}
    offset={offset}
    {...props}
  />
);
const DropdownMenuSeparator = ({
  className,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) => (
  <SeparatorPrimitive
    data-slot="dropdown-menu-separator"
    className={cn("bg-border -mx-1 my-1 h-px", className)}
    {...props}
  />
);
const DropdownMenuShortcut = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    data-slot="dropdown-menu-shortcut"
    className={cn(
      "text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest",
      className
    )}
    {...props}
  />
);
const DropdownMenu = (
  props: React.ComponentProps<typeof AriaDropdownMenuTrigger>
) => <AriaDropdownMenuTrigger {...props} />;
const DropdownMenuTrigger = ({
  asChild,
  children,
  render,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "render"> & {
  /** Base UI style: the element to render as the trigger. */
  render?: React.ReactElement;
}) => {
  // Children the shadcn CLI moved out of `render` go back in; an element passed alone keeps its own.
  if (render)
    return pressable(
      React.cloneElement(render as React.ReactElement<Record<string, unknown>>, props as Record<string, unknown>, ...(children === undefined ? [] : [children]))
    );
  return asChild ? pressable(children) : <Button {...props}>{children}</Button>;
};
/** A group of mutually exclusive items; the selected one shows a check. */
const DropdownMenuRadioGroup = ({
  value,
  onValueChange,
  children,
  ...props
}: Omit<
  MenuSectionPrimitiveProps<object>,
  "selectionMode" | "selectedKeys" | "onSelectionChange" | "value"
> & {
  value?: string;
  onValueChange?: (value: string) => void;
}) => (
  <MenuSectionPrimitive
    data-slot="dropdown-menu-radio-group"
    selectionMode="single"
    selectedKeys={value === undefined ? [] : [value]}
    onSelectionChange={(keys) => {
      const next = [...keys][0];
      if (next !== undefined) onValueChange?.(String(next));
    }}
    {...props}
  >
    {children}
  </MenuSectionPrimitive>
);
const DropdownMenuRadioItem = ({
  value,
  ...props
}: Omit<React.ComponentProps<typeof AriaDropdownMenuItem>, "id" | "value"> & { value: string }) => (
  <AriaDropdownMenuItem id={value} {...props} />
);
/** A toggle item; wraps itself in its own multi-select section so the check follows `checked`. */
const DropdownMenuCheckboxItem = ({
  checked,
  onCheckedChange,
  children,
  id,
  ...props
}: Omit<React.ComponentProps<typeof AriaDropdownMenuItem>, "id"> & {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) => {
  const fallbackId = React.useId();
  const key = id ?? (typeof children === "string" ? children : fallbackId);
  return (
    <MenuSectionPrimitive
      data-slot="dropdown-menu-checkbox-group"
      selectionMode="multiple"
      selectedKeys={checked ? [key] : []}
      onSelectionChange={(keys) => onCheckedChange?.([...keys].includes(key))}
    >
      <AriaDropdownMenuItem id={key} {...props}>
        {children}
      </AriaDropdownMenuItem>
    </MenuSectionPrimitive>
  );
};
const DropdownMenuItem = ({
  disabled,
  onSelect,
  ...props
}: React.ComponentProps<typeof AriaDropdownMenuItem> & {
  disabled?: boolean;
  onSelect?: () => void;
}) => (
  <AriaDropdownMenuItem
    {...props}
    isDisabled={disabled ?? props.isDisabled}
    onAction={() => {
      props.onAction?.();
      onSelect?.();
    }}
  />
);
export {
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
