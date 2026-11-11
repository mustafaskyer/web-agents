# Docs media

Screenshots and clips of the example apps, the agent cursor, the devtools and the chat, embedded by the docs pages and
the README. Everything here is generated:

```bash
pnpm capture        # starts the four example apps, records with Playwright's Chromium, encodes with ffmpeg
```

`capture/*.capture.ts` take the stills (reduced motion: the cursor snaps) and the clips (motion on, video recording);
`capture/encode.mjs` copies the stills here as PNG (the docs site converts them to WebP), encodes clips to WebM + MP4
(≤ 1.5 MB each) and the hero clip to `hero.gif` (≤ 3 MB, for GitHub).

The chat stills that need a live model (`chat/tool-card.png`, `chat/subagent.png`) are only produced when
`examples/ecommerce/.env.local` holds a provider key; the picker still needs none.
