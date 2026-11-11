/**
 * The README's GIFs: GitHub plays no video stored in the repository, so the README shows GIFs made from the encoded
 * clips. The cursor clips (docs/media/cursor/*.mp4, from encode.mjs) and the site's recorded demos
 * (apps/docs/public/demo/*.mp4, from apps/docs/scripts/record-demo.sh) → docs/media/{cursor,demo}/*.gif.
 * Runs after encode.mjs in `pnpm capture`; `node capture/gifs.mjs` alone re-makes them. Needs ffmpeg on PATH.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const media = join(root, "docs", "media");
const GIF_BUDGET = 3 * 1024 * 1024;

/** Where each set of GIFs comes from, and how wide / how many frames (the demos are longer, so fewer). */
const SOURCES = [
  { from: join(media, "cursor"), to: join(media, "cursor"), width: 640, fps: 12 },
  { from: join(root, "apps", "docs", "public", "demo"), to: join(media, "demo"), width: 880, fps: 10 },
];

const ffmpeg = (args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
const over = [];

for (const { from, to, width, fps } of SOURCES) {
  if (!existsSync(from)) continue;
  mkdirSync(to, { recursive: true });
  for (const file of readdirSync(from).filter((f) => f.endsWith(".mp4"))) {
    const gif = join(to, `${basename(file, ".mp4")}.gif`);
    // stats_mode=diff + diff_mode=rectangle: the palette favours what moves (the cursor), and still areas stay put
    const filters =
      `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];` +
      "[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle";
    ffmpeg(["-i", join(from, file), "-vf", filters, "-loop", "0", gif]);
    const bytes = statSync(gif).size;
    console.log(`gif    ${gif.slice(media.length + 1)}  ${(bytes / 1024).toFixed(0)} KB`);
    if (bytes > GIF_BUDGET) over.push(gif.slice(media.length + 1));
  }
}

if (over.length) {
  console.error(`Over budget (GIF ≤ 3 MB): ${over.join(", ")}`);
  process.exit(1);
}
