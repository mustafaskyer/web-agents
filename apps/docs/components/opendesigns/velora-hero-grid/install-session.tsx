"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useId, useRef, useState } from "react";
import type { RefObject } from "react";

export type CopyGridCommand = (
  command: string,
  signal: AbortSignal
) => Promise<void>;

const writeClipboard: CopyGridCommand = async (command) => {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard unavailable");
  }
  await navigator.clipboard.writeText(command);
};

const CopyCommand = ({
  command,
  onCopyCommand = writeClipboard,
}: {
  command: string;
  onCopyCommand?: CopyGridCommand;
}) => {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">(
    "idle"
  );
  const request = useRef<AbortController | null>(null);
  const fallback = useRef<HTMLTextAreaElement>(null);
  const hasCommand = Boolean(command.trim());
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (status === "error") {
      fallback.current?.focus();
      fallback.current?.select();
    }
  }, [status]);
  const handleCopy = async () => {
    if (request.current || !hasCommand) {
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setStatus("copying");
    try {
      await onCopyCommand(command, controller.signal);
      if (!controller.signal.aborted) {
        setStatus("copied");
      }
    } catch {
      if (!controller.signal.aborted) {
        setStatus("error");
      }
    }
    if (request.current === controller) {
      request.current = null;
    }
  };
  let message = "Copy the command to your terminal.";
  if (!hasCommand) {
    message = "No command available.";
  } else if (status === "copying") {
    message = "Copying command…";
  } else if (status === "copied") {
    message = "Command copied";
  } else if (status === "error") {
    message = "Couldn’t copy. Select the command and copy it.";
  }
  return (
    <div className="velora-grid-copy">
      <div className="velora-grid-copy-action">
        <Button
          disabled={status === "copying" || !hasCommand}
          size="touch"
          variant="outline"
          onPress={handleCopy}
        >
          <HugeiconsIcon
            icon={status === "copied" ? Tick02Icon : Copy01Icon}
            aria-hidden="true"
            data-icon="inline-start"
          />
          Copy command
        </Button>
        <output
          aria-live="polite"
          aria-atomic="true"
          className="velora-grid-copy-status"
        >
          {message}
        </output>
      </div>
      {status === "error" && (
        <>
          <Alert>
            <AlertTitle>Copy the command manually</AlertTitle>
            <AlertDescription>
              The command is selected below. Copy it with your keyboard or touch
              menu, or try the copy button again.
            </AlertDescription>
          </Alert>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={id}>Command to copy manually</FieldLabel>
              <Textarea ref={fallback} id={id} readOnly value={command} />
            </Field>
          </FieldGroup>
        </>
      )}
    </div>
  );
};

export interface InstallSessionProps {
  command: string;
  hint: string;
  lines: readonly string[];
  onCopyCommand?: CopyGridCommand;
  sessionRef: RefObject<HTMLDivElement | null>;
  title: string;
}

/** Illustrative content; the only executable user action writes to the clipboard. */
export const InstallSession = ({
  command,
  hint,
  lines,
  onCopyCommand,
  sessionRef,
  title,
}: InstallSessionProps) => (
  <figure className="velora-grid-session">
    <div ref={sessionRef}>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Install the packages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="velora-grid-transcript">
            {command.trim() ? (
              <pre className="velora-grid-command">
                <code>
                  <span aria-hidden="true">$ </span>
                  {command}
                </code>
              </pre>
            ) : (
              <p className="velora-grid-command">
                No command has been provided.
              </p>
            )}
            {lines.length > 0 && (
              <ul className="velora-grid-session-lines">
                {lines.map((line, index) => (
                  <li key={`${index}-${line}`}>
                    <span
                      className="velora-grid-line-measure"
                      aria-hidden="true"
                    >
                      {line || " "}
                    </span>
                    <span data-transcript-line aria-hidden="true">
                      {line}
                    </span>
                    <span className="sr-only">{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <CopyCommand
            key={command}
            command={command}
            onCopyCommand={onCopyCommand}
          />
        </CardFooter>
      </Card>
    </div>
    <figcaption>{hint}</figcaption>
  </figure>
);
