#!/usr/bin/env node
/**
 * Local npm releases with Changesets — no CI job publishes.
 *
 *   pnpm release [patch|minor|major]   version + gate + publish + push (the whole thing)
 *   pnpm release:version [bump]        bump versions + CHANGELOGs from the pending changesets, commit
 *   pnpm release:publish               gate, publish what is not on npm yet, tag, push (re-run it after a failed publish)
 *   pnpm release:snapshot [tag]        publish a throwaway prerelease (default tag `next`), leaves no commit
 *   pnpm release:status                what the pending changesets would release
 *
 * Auto version: with a bump argument and no changeset written by hand, a changeset is generated from the commit
 * subjects since the last release tag. The public packages are `fixed` (.changeset/config.json), so one bump moves
 * all of them to the same version.
 *
 * Flags: --dry-run (change nothing, show the plan and the tarballs), --skip-checks (no biome/typecheck/test/build gate),
 * --no-push, --allow-branch (release from a branch other than main), --otp=<code> (npm 2FA; otherwise npm prompts),
 * --message="…" (the generated changeset's summary).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const BUMPS = ["patch", "minor", "major"];
const MAIN = "main";
/** Extra advice printed with any failure while the tree is half-way through a release. */
let onFail;

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const positional = argv.filter((a) => !a.startsWith("--"));
const command = ["version", "publish", "snapshot", "status", "all"].includes(positional[0]) ? positional.shift() : "all";
const bump = positional.find((a) => BUMPS.includes(a));
const dryRun = flag("dry-run");

const unknown = positional.filter((a) => !BUMPS.includes(a) && command !== "snapshot");
if (unknown.length) fail(`Unknown argument: ${unknown.join(" ")}. Use patch, minor or major.`);

// ---------- helpers ----------
function log(message) {
  console.log(`\n\x1b[1m▸ ${message}\x1b[0m`);
}
function fail(message) {
  console.error(`\n\x1b[31m✖ ${message}\x1b[0m`);
  if (onFail) console.error(`  ${onFail}`);
  process.exit(1);
}
/** Runs a command with inherited stdio; exits the script when it fails. */
function run(cmd, args, env = {}) {
  console.log(`  $ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) fail(`${cmd} ${args.join(" ")} exited with ${result.status}`);
}
/** Like run, but a failure is only reported (`changeset status` exits 1 when changed packages have no changeset). */
function runSoft(cmd, args) {
  console.log(`  $ ${cmd} ${args.join(" ")}`);
  spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit" });
}
/** Runs a command and returns its trimmed stdout, or undefined when it fails. */
function read(cmd, args) {
  try {
    return execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}

function publicPackages() {
  return readdirSync(join(ROOT, "packages"))
    .map((dir) => join(ROOT, "packages", dir, "package.json"))
    .filter(existsSync)
    .map((file) => JSON.parse(readFileSync(file, "utf8")))
    .filter((pkg) => !pkg.private);
}

function pendingChangesets() {
  return readdirSync(join(ROOT, ".changeset")).filter((f) => f.endsWith(".md") && f !== "README.md");
}

/** @changesets/changelog-github looks up PRs and authors; it needs a token. `gh` has one when logged in. */
function changelogEnv() {
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: a local script, not a Turbo task
  if (process.env.GITHUB_TOKEN) return {};
  const token = read("gh", ["auth", "token"]);
  if (!token) fail("The changelog needs a GitHub token: set GITHUB_TOKEN or run `gh auth login`.");
  return { GITHUB_TOKEN: token };
}

// ---------- preflight ----------
function preflight({ npm }) {
  log("Preflight");
  const branch = read("git", ["branch", "--show-current"]);
  if (branch !== MAIN && !flag("allow-branch")) {
    const message = `On "${branch}", releases go from "${MAIN}" (pass --allow-branch to override).`;
    if (dryRun) console.log(`  warning: ${message}`);
    else fail(message);
  }
  if (!dryRun && read("git", ["status", "--porcelain"])) {
    fail("The working tree has changes: commit or stash them first.");
  }
  if (!dryRun && !flag("no-push") && read("git", ["fetch", "--quiet", "origin", branch]) !== undefined) {
    const behind = read("git", ["rev-list", "--count", `HEAD..origin/${branch}`]);
    if (behind && behind !== "0") fail(`${behind} commit(s) behind origin/${branch}: pull first.`);
  }
  if (npm) {
    const user = read("npm", ["whoami"]);
    if (user) console.log(`  npm user: ${user}`);
    else if (dryRun) console.log("  npm: not logged in (fine for a dry run; run `npm login` before publishing)");
    else fail("Not logged in to npm: run `npm login`.");
  }
  console.log(`  branch: ${branch}, packages: ${publicPackages().length} public`);
}

// ---------- auto changeset ----------
/** Writes a changeset for the given bump; the summary is --message or the commit subjects since the last release. */
function writeAutoChangeset(level) {
  const lastTag = read("git", ["describe", "--tags", "--abbrev=0", "--match", "@webmcp-agents/core@*"]);
  const range = lastTag ? [`${lastTag}..HEAD`] : ["-n", "30"];
  const subjects = (read("git", ["log", "--no-merges", "--format=%s", ...range, "--", "packages"]) ?? "")
    .split("\n")
    .filter((s) => s && !s.startsWith("chore: version packages"));
  const summary = option("message") ?? (subjects.length ? subjects.map((s) => `- ${s}`).join("\n") : `A ${level} release.`);

  // fixed group: naming core bumps every public package
  const body = `---\n"@webmcp-agents/core": ${level}\n---\n\n${summary}\n`;
  const file = join(ROOT, ".changeset", `release-${Date.now()}.md`);
  if (dryRun) {
    console.log(`  would write .changeset/${file.split("/").pop()}:\n${body.replace(/^/gm, "    ")}`);
    return;
  }
  writeFileSync(file, body);
  console.log(`  wrote .changeset/${file.split("/").pop()} (${level}, since ${lastTag ?? "the last 30 commits"})`);
}

function ensureChangesets() {
  const pending = pendingChangesets();
  if (bump) {
    log(`Auto changeset: ${bump}`);
    writeAutoChangeset(bump);
  } else if (!pending.length) {
    fail("No pending changesets. Write one with `pnpm changeset`, or pass a bump: `pnpm release patch|minor|major`.");
  } else {
    console.log(`  ${pending.length} pending changeset(s)`);
  }
}

// ---------- steps ----------
function gate() {
  if (flag("skip-checks")) return console.log("\n  (gate skipped: --skip-checks)");
  log("Gate: biome, typecheck, tests, build, size, publint + attw");
  run("pnpm", ["exec", "biome", "ci", "."]);
  run("pnpm", ["turbo", "run", "typecheck", "test", "build", "size", "check-exports", "--filter=./packages/*"]);
}

/** Bumps versions and writes the CHANGELOGs from the pending changesets (uncommitted). */
function bumpVersions() {
  log("Version packages");
  run("pnpm", ["changeset", "version"], changelogEnv());
  run("pnpm", ["install", "--lockfile-only", "--ignore-scripts"]);
  run("pnpm", ["exec", "biome", "format", "--write", ...readdirSync(join(ROOT, "packages")).map((d) => `packages/${d}/package.json`)]);
}

function commitVersions() {
  const next = JSON.parse(readFileSync(join(ROOT, "packages/core/package.json"), "utf8")).version;
  log(`Commit v${next}`);
  run("git", ["add", "-A"]);
  run("git", ["commit", "-m", `chore: version packages (v${next})`]);
}

function showPlan() {
  log("Plan (dry run)");
  runSoft("pnpm", ["changeset", "status", "--verbose"]);
}

/** Publishes every public package whose version is not on npm yet, tags it, and pushes. */
function publishPackages() {
  if (dryRun) {
    log("Publish (dry run): the tarballs, at today's versions (a dry run does not apply the bump above)");
    for (const pkg of publicPackages()) {
      const published = read("npm", ["view", `${pkg.name}@${pkg.version}`, "version"]);
      console.log(`  ${pkg.name}@${pkg.version} ${published ? "(already on npm, would be skipped)" : "(new)"}`);
    }
    run("pnpm", ["--filter", "./packages/*", "publish", "--dry-run", "--no-git-checks"]);
    return;
  }

  log("Publish to npm");
  const otp = option("otp");
  // provenance needs a CI OIDC token; a laptop publish has none
  run("pnpm", ["changeset", "publish", ...(otp ? ["--otp", otp] : [])], { NPM_CONFIG_PROVENANCE: "false" });

  if (flag("no-push")) {
    console.log("\n  Not pushed (--no-push): run `git push --follow-tags` when ready.");
  } else {
    log("Push commit + tags");
    run("git", ["push", "--follow-tags", "origin", "HEAD"]);
  }
}

/** `pnpm release:version`: bump + commit, no gate, no publish. */
function version() {
  preflight({ npm: false });
  ensureChangesets();
  if (dryRun) return showPlan();
  bumpVersions();
  commitVersions();
}

/** `pnpm release:publish`: what `release:version` committed (or a publish that failed half-way). */
function publish() {
  preflight({ npm: true });
  if (pendingChangesets().length && !dryRun) {
    fail("Changesets are still pending: run `pnpm release:version` first (or `pnpm release`).");
  }
  gate();
  publishPackages();
}

/** `pnpm release`: bump, gate the bumped tree, and only then commit and publish. */
function release() {
  preflight({ npm: true });
  ensureChangesets();
  if (dryRun) {
    showPlan();
    gate();
    return publishPackages();
  }
  bumpVersions();
  onFail = "The version bump is not committed. Undo it with `git restore --staged --worktree . && git clean -fd .changeset`.";
  gate();
  onFail = undefined;
  commitVersions();
  publishPackages();
}

function snapshot() {
  const tag = positional.find((a) => !BUMPS.includes(a)) ?? "next";
  if (tag === "latest") fail("A snapshot never goes to the `latest` tag.");
  preflight({ npm: true });
  if (!pendingChangesets().length && !bump) {
    log("Auto changeset: patch (snapshot)");
    writeAutoChangeset("patch");
  } else ensureChangesets();

  if (dryRun) {
    log(`Plan (dry run): snapshot to the "${tag}" tag`);
    runSoft("pnpm", ["changeset", "status", "--verbose"]);
    return;
  }

  try {
    log(`Snapshot versions (${tag})`);
    run("pnpm", ["changeset", "version", "--snapshot", tag], changelogEnv());
    gate();
    log(`Publish to npm under "${tag}"`);
    const otp = option("otp");
    run("pnpm", ["changeset", "publish", "--tag", tag, "--no-git-tag", ...(otp ? ["--otp", otp] : [])], {
      NPM_CONFIG_PROVENANCE: "false",
    });
  } finally {
    // the tree was clean before: put it back (versions, CHANGELOGs, consumed and generated changesets)
    log("Restore the working tree");
    run("git", ["restore", "--staged", "--worktree", "--", "."]);
    run("git", ["clean", "-fdq", "--", ".changeset"]);
  }
}

// ---------- main ----------
if (dryRun) console.log("\x1b[33mDry run: nothing is written, committed, published or pushed.\x1b[0m");

switch (command) {
  case "status":
    runSoft("pnpm", ["changeset", "status", "--verbose"]);
    break;
  case "version":
    version();
    break;
  case "publish":
    publish();
    break;
  case "snapshot":
    snapshot();
    break;
  default:
    release();
}

if (!dryRun && command !== "status") console.log("\n\x1b[32m✔ Done\x1b[0m");
