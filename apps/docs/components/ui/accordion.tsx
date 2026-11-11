"use client";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import * as React from "react";
import {
  DisclosurePanel as AccordionContentPrimitive,
  Heading as AccordionHeaderPrimitive,
  Disclosure as AccordionItemPrimitive,
  DisclosureGroup as AccordionPrimitive,
  Button as AccordionTriggerPrimitive,
} from "react-aria-components";
import type {
  ButtonProps,
  DisclosureGroupProps,
  DisclosurePanelProps,
  DisclosureProps,
} from "react-aria-components";

const selectionKeys = (value: string | string[]) =>
  typeof value === "string" ? [value] : value;
const AriaAccordion = ({ className, ...props }: DisclosureGroupProps) => (
  <AccordionPrimitive
    data-slot="accordion"
    className={cn("flex w-full flex-col", className)}
    {...props}
  />
);
const AriaAccordionItem = ({ className, ...props }: DisclosureProps) => (
  <AccordionItemPrimitive
    data-slot="accordion-item"
    className={cn("not-last:border-b", className)}
    {...props}
  />
);
const AccordionTrigger = ({
  className,
  children,
  ...props
}: Omit<ButtonProps, "children"> & {
  children: React.ReactNode;
}) => (
  <AccordionHeaderPrimitive className="flex">
    <AccordionTriggerPrimitive
      slot="trigger"
      data-slot="accordion-trigger"
      className={cn(
        "group/accordion-trigger focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:after:border-ring **:data-[slot=accordion-trigger-icon]:text-muted-foreground relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        strokeWidth={2}
        data-slot="accordion-trigger-icon"
        className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
      />
      <HugeiconsIcon
        icon={ArrowUp01Icon}
        strokeWidth={2}
        data-slot="accordion-trigger-icon"
        className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
      />
    </AccordionTriggerPrimitive>
  </AccordionHeaderPrimitive>
);
const AccordionContent = ({
  className,
  children,
  ...props
}: DisclosurePanelProps) => (
  <AccordionContentPrimitive
    data-slot="accordion-content"
    className="data-open:animate-accordion-down data-closed:animate-accordion-up h-(--disclosure-panel-height) overflow-clip text-sm transition-[height]"
    {...props}
  >
    <div
      className={cn(
        "[&_a]:hover:text-foreground pt-0 pb-2.5 [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
        className
      )}
    >
      {children}
    </div>
  </AccordionContentPrimitive>
);
const Accordion = ({
  type = "single",
  collapsible: _collapsible,
  value,
  defaultValue,
  onValueChange,
  ...props
}: DisclosureGroupProps & {
  type?: "single" | "multiple";
  collapsible?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string) => void;
}) => (
  <AriaAccordion
    {...props}
    allowsMultipleExpanded={type === "multiple"}
    expandedKeys={
      value === undefined ? props.expandedKeys : selectionKeys(value)
    }
    defaultExpandedKeys={
      defaultValue === undefined
        ? props.defaultExpandedKeys
        : selectionKeys(defaultValue)
    }
    onExpandedChange={(keys) => {
      props.onExpandedChange?.(keys);
      onValueChange?.(String([...keys][0] ?? ""));
    }}
  />
);
const AccordionItem = ({
  value,
  disabled,
  ...props
}: DisclosureProps & {
  value?: string;
  disabled?: boolean;
}) => (
  <AriaAccordionItem
    {...props}
    id={value ?? props.id}
    isDisabled={disabled ?? props.isDisabled}
  />
);
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
