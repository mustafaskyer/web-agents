import {
  defineWebTool,
  EnableTools,
  useEnableTools,
  WebAgentsProvider,
} from "@webmcp-agents/react";

const removePromo = defineWebTool({
  id: "remove_promo",
  description: "Remove the promo code from the cart.",
  execute: () => "The promo code is removed.",
});

// An array catalog: its tools are off until something names them.
const catalog = [removePromo];

// The hook form: on while this row is on screen.
function PromoRow() {
  useEnableTools(["remove_promo"]);
  return <p>Promo WELCOME10 applied</p>;
}

// The component form, for JSX that would rather not call a hook.
function PromoNotice({ visible }: { visible: boolean }) {
  return visible ? <EnableTools names={["remove_promo"]} /> : null;
}

export function Cart({ hasPromo }: { hasPromo: boolean }) {
  return (
    <WebAgentsProvider tools={catalog}>
      {hasPromo && <PromoRow />}
      <PromoNotice visible={hasPromo} />
    </WebAgentsProvider>
  );
}
