/**
 * The three things a developer does to get an agent on their page, each with the lines that matter: a tool beside the
 * button it belongs to, a tool with input (a form), and the provider with an agent and the chat. Steps 1 and 2 are
 * examples 1 and 2 of .agents/plans/14-imperative-tools.md, shadcn/ui and React Hook Form, wrapped and spaced like
 * them; keep the docs' quickstart in step. Plain data: the page (pages/index.astro) highlights `code` at build time,
 * <Steps> lays it out, and `copy_step_code` copies it.
 */
export interface StepData {
  title: string;
  text: string;
  /** The snippet, as TSX source. */
  code: string;
}

export const STEPS: readonly StepData[] = [
  {
    title: "Define a tool",
    text: "One function with two callers: the person's click and the agent's call. useWebTool gives it an id, a title and a description the agent reads. The cursor finds the button by its name; requireConfirmation waits for the person's own click.",
    code: `export function ClearCart() {
  const cart = useCart();

  const clear = () => cart.clear();

  // An agent calls this.
  useWebTool({
    id: "clear_cart",
    title: "Clear cart",
    description: "Empty the cart. The user confirms on the page.",
    destructive: true,
    requireConfirmation: true,
    execute: clear,
  });

  // A person clicks this.
  return (
    <Button variant="destructive" onClick={clear}>
      Clear cart
    </Button>
  );
}`,
  },
  {
    title: "Give it a form",
    text: "A tool with an input schema is a form. The cursor types each value into the field with that name or label, React Hook Form hears it like any typing, and execute is the function the form already submits to.",
    code: `const schema = z.object({
  quantity: z.number().int().min(1),
});

type AddToCartInput = z.infer<typeof schema>;

export function AddToCart({ product }: { product: Product }) {
  const cart = useCart();

  const form = useForm<AddToCartInput>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1 },
  });

  const add = ({ quantity }: AddToCartInput) => {
    cart.add(product.id, quantity);
    return \`Added \${quantity} × \${product.name}.\`;
  };

  // An agent calls this.
  useWebTool({
    id: "add_to_cart",
    title: "Add to cart",
    description:
      "Add this product to the cart. Use after open_product. " +
      "Next: open_cart or checkout.",
    inputSchema: schema,
    execute: add,
  });

  // A person submits this.
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(add)}
        className="flex items-end gap-2"
      >
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Add to cart</Button>
      </form>
    </Form>
  );
}`,
  },
  {
    title: "Add the provider and an agent",
    text: "The same provider line in Vite, TanStack Start, Next.js and Astro: it follows the URL and installs the cursor. An agent is instructions plus the tools it may use; the key stays in the handler, and the page sends only the agent's id.",
    code: `// App.tsx
<WebAgentsProvider tools={tools}>
  <App />
  <AgentChat agent={shopper} />
</WebAgentsProvider>

// agents.ts (shared by the page and the server)
export const shopper = defineWebAgent({
  id: "shopper",
  instructions: "Open a product before adding it to the cart.",
  tools: [tools.getCart, tools.listOrders],
});

// on the server, with WEB_AGENTS_MODEL=anthropic/claude-opus-5-5
export default createChatHandler({ agents: [shopper] });`,
  },
];
