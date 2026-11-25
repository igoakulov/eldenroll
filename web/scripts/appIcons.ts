// Draws the installed app's icons into public/icons/ (web/README.md#Installing): the wordmark's lozenge, our own
// glyph, glowing on the ground under the teal mist. Run after changing the drawing; the PNGs are committed.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const OUT = fileURLToPath(new URL("../public/icons/", import.meta.url));

// The colours of src/ui/tokens.css: --ground, --mist, --mist-2, --grace
const GROUND = "#0a0a0a";
const MIST = "#1b2523";
const MIST_2 = "#121817";
const GRACE = "#e3cf98";

/** The lozenge fills half the icon's height, inside the circle a maskable icon keeps on every platform. */
function svg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="mist" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="${MIST}"/><stop offset="45%" stop-color="${MIST_2}"/><stop offset="80%" stop-color="${GROUND}"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
  </defs>
  <rect width="100" height="100" fill="url(#mist)"/>
  <g transform="translate(29.2 25) scale(2.08)">
    <g filter="url(#glow)" opacity="0.45" stroke="${GRACE}" fill="none" stroke-width="2.4">
      <path d="M10 1.6L18.4 12 10 22.4 1.6 12z"/><path d="M10 7.4L13.8 12 10 16.6 6.2 12z" fill="${GRACE}" stroke="none"/>
    </g>
    <path d="M10 1.6L18.4 12 10 22.4 1.6 12z" stroke="${GRACE}" fill="none" stroke-width="2.4" stroke-linejoin="miter"/>
    <path d="M10 7.4L13.8 12 10 16.6 6.2 12z" fill="${GRACE}"/>
  </g>
</svg>`;
}

const SIZES: readonly (readonly [string, number])[] = [
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
for (const [name, size] of SIZES) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${svg(size)}</body>`);
  await page.locator("svg").screenshot({ path: path.join(OUT, name) });
}
await browser.close();
console.log(`Icons written to ${OUT}`);
