# `detectLocalProviders`

Reports each on-device provider's availability right now, for example for a settings screen. `createLocalAdapter`
uses it to pick a provider.

```ts
import { detectLocalProviders } from "@web-agents/local-agent";
```

## Signature

```ts
function detectLocalProviders(
  providers?: readonly LocalProvider[],
): Promise<Array<{ id: string; availability: ProviderAvailability }>>;
```

## Parameters

| Name | Type | Default | Description |
|---|---|---|---|
| `providers` | `readonly LocalProvider[]` | `[createPromptApiProvider(), createTransformersProvider()]` | The providers to check, in order. |

## Returns

A promise of one entry per provider, in the same order: its `id` and its
[`ProviderAvailability`](./provider-types.md#provideravailability). A provider whose `availability()` rejects is
reported as `{ state: "unavailable", reason: String(error) }`.

## Example

```ts
const found = await detectLocalProviders();
for (const { id, availability } of found) {
  console.log(id, availability.state, availability.state === "unavailable" ? availability.reason : "");
}
// prompt-api unavailable Chrome's built-in model isn't available in this browser.
// transformers needs-download
```

## Notes

- Checking never downloads anything. The transformers provider may request a WebGPU adapter and open the
  `transformers-cache` Cache API store to tell whether the model is cached.
- The default list creates fresh providers each call; pass your own to check the instances your adapter uses.

## See also

- [`createLocalAdapter`](./create-local-adapter.md)
- [Provider types](./provider-types.md)
