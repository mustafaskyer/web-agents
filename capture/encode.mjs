/**
 * capture/out → docs/media: stills copied as PNG (Blume converts them to WebP), clips encoded to WebM (VP9) + MP4
 * (H.264), the hero clip also to a GIF for the README. Fails when a file is over budget. Needs ffmpeg on PATH.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out");
const media = join(here, "..", "docs", "media");
const CLIP_BUDGET = 1.5 * 1024 * 1024;
const GIF_BUDGET = 3 * 1024 * 1024;

/** Which clip test feeds which media file. */
const CLIPS = {
  "clip-typing": "cursor/typing",
  "clip-confirm": "cursor/confirm",
  "clip-yield": "cursor/yield",
  "clip-skyline": "examples/skyline-booking",
};
const HERO = "clip-typing";

const ffmpeg = (args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
const size = (file) => statSync(file).size;
const over = [];

// ---------- stills ----------
const stills = join(out, "stills");
if (existsSync(stills)) {
  for (const dir of readdirSync(stills)) {
    const from = join(stills, dir);
    if (!statSync(from).isDirectory()) continue;
    mkdirSync(join(media, dir), { recursive: true });
    for (const file of readdirSync(from)) {
      copyFileSync(join(from, file), join(media, dir, file));
      console.log(`still  ${dir}/${file}`);
    }
  }
}

// ---------- clips ----------
const pw = join(out, "pw");
const videoFor = (slug) => {
  if (!existsSync(pw)) return null;
  const dir = readdirSync(pw).find((d) => d.includes(slug));
  if (!dir) return null;
  const video = readdirSync(join(pw, dir)).find((f) => f.endsWith(".webm"));
  return video ? join(pw, dir, video) : null;
};
for (const [slug, target] of Object.entries(CLIPS)) {
  const video = videoFor(slug);
  if (!video) {
    console.warn(`no video for ${slug} (run the clips project first)`);
    continue;
  }
  const dest = join(media, target);
  mkdirSync(dirname(dest), { recursive: true });
  // the first ~0.4 s is the page loading
  const scale = "scale='min(960,iw)':-2";
  ffmpeg(["-ss", "0.4", "-i", video, "-vf", scale, "-c:v", "libvpx-vp9", "-crf", "34", "-b:v", "0", "-r", "24", "-an", `${dest}.webm`]);
  ffmpeg([
    "-ss",
    "0.4",
    "-i",
    video,
    "-vf",
    scale,
    "-c:v",
    "libx264",
    "-crf",
    "26",
    "-preset",
    "slow",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "24",
    "-movflags",
    "+faststart",
    "-an",
    `${dest}.mp4`,
  ]);
  for (const ext of ["webm", "mp4"]) {
    const bytes = size(`${dest}.${ext}`);
    console.log(`clip   ${target}.${ext}  ${(bytes / 1024).toFixed(0)} KB`);
    if (bytes > CLIP_BUDGET) over.push(`${target}.${ext}`);
  }
  if (slug === HERO) {
    const gif = join(media, "hero.gif");
    const filters =
      "fps=12,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5";
    ffmpeg(["-ss", "0.4", "-t", "6", "-i", video, "-vf", filters, "-loop", "0", gif]);
    const bytes = size(gif);
    console.log(`gif    hero.gif  ${(bytes / 1024).toFixed(0)} KB`);
    if (bytes > GIF_BUDGET) over.push("hero.gif");
    for (const ext of ["webm", "mp4"]) copyFileSync(`${dest}.${ext}`, join(media, `hero.${ext}`));
  }
}

if (over.length) {
  console.error(`Over budget (clips ≤ 1.5 MB, GIF ≤ 3 MB): ${over.join(", ")}`);
  process.exit(1);
}
