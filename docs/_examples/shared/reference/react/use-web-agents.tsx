import { useWebAgents } from "@webmcp-agents/react";

import { Button } from "@/components/ui/button";

// Turn the spotlight on while an agent works. Must sit inside
// <WebAgentsProvider>.
export function SpotlightButton() {
  const { visuals } = useWebAgents();

  // The provider has `visuals={false}`: there is no cursor.
  if (!visuals) return null;

  return (
    <Button onClick={() => visuals.setSpotlight({ dim: 0.2 })}>
      Dim the page around the agent
    </Button>
  );
}
