"use client";
/**
 * shadcn/ui's Model Selector pattern for web-agents: menu 1 picks which assistant answers (cloud, on-device), menu 2
 * which local model runs (size, "on this device"). Both read from `useAgentChat()`.
 */
import type { AgentChatState } from "@webmcp-agents/chat";
import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupButton } from "@/components/ui/input-group";

const size = (bytes: number): string => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.round(bytes / 1e6)} MB`);

export function AgentModelSelector({
  chat,
  disabled,
}: {
  chat: Pick<AgentChatState, "adapters" | "adapter" | "selectAdapter" | "models" | "selectModel">;
  disabled?: boolean;
}) {
  const current = chat.models.find((m) => m.selected) ?? chat.models[0];
  return (
    <>
      {chat.adapters.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<InputGroupButton size="sm" disabled={disabled} />}>
            {chat.adapter.label}
            <ChevronDownIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Assistant</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={chat.adapter.id} onValueChange={(id) => chat.selectAdapter(id)}>
              {chat.adapters.map((a) => (
                <DropdownMenuRadioItem key={a.id} value={a.id} closeOnClick>
                  {a.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {chat.models.length > 1 && current && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<InputGroupButton size="sm" disabled={disabled} />}>
            {current.label}
            <ChevronDownIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Model</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={current.id} onValueChange={(id) => void chat.selectModel?.(id).catch(() => {})}>
              {chat.models.map((m) => (
                <DropdownMenuRadioItem key={m.id} value={m.id} closeOnClick>
                  <span className="flex flex-col">
                    <span>
                      {m.label}
                      {m.recommended ? " · recommended" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {m.brief}
                      {m.bytes ? ` · ${size(m.bytes)}` : ""}
                      {m.cached ? " · on this device" : ""}
                    </span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
