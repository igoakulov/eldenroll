// Draws the link preview into public/share.png (web/README.md#Search) from the share page, with the app's own
// wordmark and fonts. Run after changing either; the file is committed.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { createServer } from "vite";

const WEB = fileURLToPath(new URL("..", import.meta.url));

const server = await createServer({
  root: WEB,
  configFile: path.join(WEB, "vite.config.ts"),
  logLevel: "error",
  clearScreen: false,
  server: { port: 5310, strictPort: false, hmr: false },
});
await server.listen();
const base = server.resolvedUrls?.local[0];
if (base === undefined) throw new Error("The dev server reports no address");
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, reducedMotion: "reduce" });
  await page.goto(new URL("share/", base).href);
  await page.locator(".share .wordmark").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(WEB, "public", "share.png");
  await page.locator(".share").screenshot({ path: out });
  console.log(`Link preview written to ${out}`);
} finally {
  await browser.close();
  await server.close();
}
