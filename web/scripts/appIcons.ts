// Draws the installed app's icons into public/icons/ and the tab's favicon (web/README.md#Installing): the wordmark's
// lozenge, our own glyph. Run after changing the drawing; the files are committed.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));
const OUT = path.join(PUBLIC, "icons");

// The colours of src/ui/tokens.css: --ground, --mist, --grace
const GROUND = "#0a0a0a";
const BACKGROUND = "#1b2523";
const GRACE = "#e3cf98";

/** The wordmark's lozenge, flat, on the screens' mist: no glow, which blurs at icon size. It fills
 * about two thirds of the icon's height, inside the circle a maskable icon keeps everywhere. */
function svg(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="${BACKGROUND}"/>
  <g transform="translate(24 18.8) scale(2.6)">
    <path d="M10 1.6L18.4 12 10 22.4 1.6 12z" stroke="${GRACE}" fill="none" stroke-width="2.4" stroke-linejoin="miter"/>
    <path d="M10 7.4L13.8 12 10 16.6 6.2 12z" fill="${GRACE}"/>
  </g>
</svg>`;
}

/** The tab's icon: the lozenge alone, in the ground's colour on a rounded tile of grace with clear corners. Bright,
 * since Safari sets a white plate behind a tab icon too dark for its dark tab bar. Too small for the glow. */
function favicon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${GRACE}"/>
  <g transform="translate(5.5 2.6) scale(1.1)">
    <path d="M10 1.6L18.4 12 10 22.4 1.6 12z" stroke="${GROUND}" fill="none" stroke-width="2.4" stroke-linejoin="miter"/>
    <path d="M10 7.4L13.8 12 10 16.6 6.2 12z" fill="${GROUND}"/>
  </g>
</svg>
`;
}

/** An .ico holding PNGs, which every browser that asks for `/favicon.ico` reads. */
function ico(pngs: readonly (readonly [number, Buffer])[]): Buffer {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(([size, png], index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...pngs.map(([, png]) => png)]);
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
writeFileSync(path.join(OUT, "favicon.svg"), favicon());
const pngs: [number, Buffer][] = [];
for (const size of [16, 32, 48]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${favicon().replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`);
  pngs.push([size, await page.locator("svg").screenshot({ omitBackground: true })]);
}
writeFileSync(path.join(PUBLIC, "favicon.ico"), ico(pngs));
await browser.close();
console.log(`Icons written to ${PUBLIC}`);
