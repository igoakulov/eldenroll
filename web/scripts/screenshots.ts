// Captures every view on the UI kit page from the working copy and from the last commit, and names the views that
// changed (web/src/ui/README.md#UI kit). `--only` captures the working copy alone.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { chromium, type Browser } from "playwright";
import { createServer, type ViteDevServer } from "vite";

import { VIEW_NAMES, VIEW_PARAM } from "../src/kit/viewNames.ts";

const WEB = realpathSync(fileURLToPath(new URL("..", import.meta.url)));
const REPO = path.dirname(WEB);
const OUT = path.join(WEB, "screenshots");
const KIT_HTML = "web/kit/index.html";
// Timers stay still at this instant, so a countdown or a tagline never moves between captures
const CLOCK = new Date("2026-01-01T12:00:00Z");

const only = process.argv.includes("--only");

let browser: Browser | null = null;
const servers: ViteDevServer[] = [];
let worktree: string | null = null;
let temp: string | null = null;
let interrupted = false;

async function cleanUp() {
  await browser?.close().catch(() => {});
  browser = null;
  await Promise.all(servers.splice(0).map((server) => server.close().catch(() => {})));
  if (worktree !== null) {
    const dir = worktree;
    worktree = null;
    try {
      execFileSync("git", ["-C", REPO, "worktree", "remove", "--force", dir], { stdio: "ignore" });
    } catch {
      rmSync(dir, { recursive: true, force: true });
      execFileSync("git", ["-C", REPO, "worktree", "prune"], { stdio: "ignore" });
    }
  }
  if (temp !== null) rmSync(temp, { recursive: true, force: true });
  temp = null;
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    interrupted = true;
    void cleanUp().finally(() => process.exit(130));
  });
}

/** A dev server for the web app at `web`, on a free port, with its own dependency cache so it never disturbs
 * another server's. */
async function serve(web: string, cacheDir: string): Promise<string> {
  const server = await createServer({
    root: web,
    configFile: path.join(web, "vite.config.ts"),
    cacheDir,
    logLevel: "error",
    clearScreen: false,
    // The worktree's node_modules and database are links into this checkout
    server: { port: 5300, strictPort: false, hmr: false, fs: { allow: [REPO] } },
  });
  servers.push(server);
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (url === undefined) throw new Error(`The dev server for ${web} reports no address`);
  return url;
}

async function capture(base: string, names: readonly string[], label: string): Promise<Map<string, Buffer>> {
  if (browser === null) throw new Error("No browser");
  const shots = new Map<string, Buffer>();
  for (const name of names) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    try {
      await context.clock.install({ time: CLOCK });
      await context.clock.pauseAt(CLOCK.getTime() + 1000);
      const page = await context.newPage();
      await page.goto(new URL(`kit/?${VIEW_PARAM}=${name}`, base).href);
      const box = page.locator(`#view-${name}[data-kit-ready]`);
      try {
        await box.waitFor({ timeout: 20_000 });
      } catch {
        console.error(`${label}: ${name} did not render`);
        process.exitCode = 1;
        continue;
      }
      await page.evaluate(async () => {
        // Layout first, so the fonts the view uses start loading before waiting on them; then let React apply
        // what waited on them, such as the tagline's measured width
        void document.body.offsetHeight;
        await document.fonts.ready;
        const tick = () =>
          new Promise<void>((resolve) => {
            const channel = new MessageChannel();
            channel.port1.onmessage = () => resolve();
            channel.port2.postMessage(null);
          });
        for (let i = 0; i < 3; i++) await tick();
        // A view that focuses a control as it opens, as `Great enemy felled` focuses `Undo`, would show the
        // keyboard's focus ring, since nothing was tapped first; a player who tapped sees none
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
      shots.set(name, await page.screenshot({ animations: "disabled" }));
    } finally {
      await context.close();
    }
  }
  return shots;
}

function compare(before: Buffer, after: Buffer): { readonly changed: number; readonly diff: Buffer | null } {
  const a = PNG.sync.read(before);
  const b = PNG.sync.read(after);
  if (a.width !== b.width || a.height !== b.height) {
    return { changed: Math.max(a.width * a.height, b.width * b.height), diff: null };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  return { changed, diff: PNG.sync.write(diff) };
}

function hasKitAtHead(): boolean {
  try {
    execFileSync("git", ["-C", REPO, "cat-file", "-e", `HEAD:${KIT_HTML}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!existsSync(path.join(REPO, "data/build/db.json"))) {
    throw new Error("data/build/db.json is missing; build it first (pipeline/README.md)");
  }
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const dir = mkdtempSync(path.join(tmpdir(), "eldenroll-screenshots-"));
  temp = dir;

  const compareWithHead = !only && hasKitAtHead();
  if (!only && !compareWithHead) console.log("The last commit has no UI kit page; capturing the working copy only.");

  let headWeb: string | null = null;
  let headNames: readonly string[] = [];
  if (compareWithHead) {
    worktree = path.join(dir, "head");
    execFileSync("git", ["-C", REPO, "worktree", "add", "--detach", worktree, "HEAD"], { stdio: "ignore" });
    headWeb = path.join(worktree, "web");
    symlinkSync(path.join(WEB, "node_modules"), path.join(headWeb, "node_modules"));
    symlinkSync(path.join(REPO, "data/build"), path.join(worktree, "data/build"));
    const module = (await import(pathToFileURL(path.join(headWeb, "src/kit/viewNames.ts")).href)) as {
      readonly VIEW_NAMES?: readonly string[];
    };
    headNames = module.VIEW_NAMES ?? [];
    console.log(
      "Comparing the working copy with the last commit. Both use the current data/build/db.json, so only UI code differs.",
    );
  }

  browser = await chromium.launch({ channel: "chrome", handleSIGINT: false, handleSIGTERM: false });
  const afterUrl = await serve(WEB, path.join(dir, "vite-working"));
  const after = await capture(afterUrl, VIEW_NAMES, "working copy");

  if (headWeb === null) {
    for (const [name, shot] of after) writeFileSync(path.join(OUT, `${name}.png`), shot);
    console.log(`${after.size} views captured in ${path.relative(process.cwd(), OUT) || "."}/`);
    return;
  }

  const beforeUrl = await serve(headWeb, path.join(dir, "vite-head"));
  const before = await capture(beforeUrl, headNames, "last commit");

  const changed: string[] = [];
  let same = 0;
  for (const name of new Set([...headNames, ...VIEW_NAMES])) {
    const a = before.get(name);
    const b = after.get(name);
    if (a !== undefined) writeFileSync(path.join(OUT, `${name}.before.png`), a);
    if (b !== undefined) writeFileSync(path.join(OUT, `${name}.after.png`), b);
    if (a === undefined || b === undefined) {
      if (a !== undefined || b !== undefined) changed.push(`${name}: ${a === undefined ? "new" : "gone"}`);
      continue;
    }
    const result = compare(a, b);
    if (result.changed === 0) {
      same += 1;
      continue;
    }
    if (result.diff !== null) writeFileSync(path.join(OUT, `${name}.diff.png`), result.diff);
    changed.push(`${name}: ${result.changed} pixels`);
  }

  console.log(changed.length === 0 ? "No view changed." : `Changed:\n${changed.map((line) => `  ${line}`).join("\n")}`);
  console.log(`${same} unchanged. Images in ${path.relative(process.cwd(), OUT) || "."}/`);
}

try {
  await main();
} catch (error) {
  // Once interrupted, the clean-up closing the browser makes the capture under way fail; that says nothing
  if (!interrupted) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
} finally {
  await cleanUp();
}
