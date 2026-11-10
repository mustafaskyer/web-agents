---
description: "Reports each on-device provider's availability right now."
---

# `detectLocalProviders`

Reports each on-device provider's availability right now. Reach for it to build a settings screen ("this browser can run X"); `createLocalAdapter` uses it to pick a provider.

## Import

```ts
import { detectLocalProviders } from "@webmcp-agents/local-agent";
```

## Example

<include meta='title="detect.ts"'>/_examples/shared/reference/local-agent/detect-local-providers.ts</include>

## Options

`detectLocalProviders(providers?)` takes one argument.

| Name | Type | Default | Description |
|---|---|---|---|
| `providers` | `readonly LocalProvider[]` | `[createPromptApiProvider(), createTransformersProvider()]` | The providers to check, in order. Pass the instances your adapter uses to see what it sees. |

## Returns

A promise of one entry per provider, in the same order: `{ id: string; availability: ProviderAvailability }`. A provider whose `availability()` rejects is reported as `{ state: "unavailable", reason: String(error) }`.

See [`ProviderAvailability`](./provider-types.md#provideravailability) for the four states.

## Notes

- Checking never downloads anything. The transformers provider may request a WebGPU adapter and ask its worker whether the model is in the browser cache.
- The default list creates fresh providers on each call; pass your own to check the instances your adapter uses.

## See also

- [On-device agent](../../more/on-device-agent.mdx)
- [`createLocalAdapter`](./create-local-adapter.md)
- [Provider types](./provider-types.md)
