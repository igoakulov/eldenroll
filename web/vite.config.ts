import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

import { serviceWorkerSource } from "./scripts/serviceWorker.ts";

const databasePath = fileURLToPath(new URL("../data/build/db.json", import.meta.url));

if (!existsSync(databasePath)) {
  throw new Error(
    `${databasePath} is missing. Build it first: cd pipeline && ../.venv/bin/python -m eldenroll.build.database`,
  );
}

/** `/kit` and `/sim` without their trailing slash go to the page, as a static host sends a folder's address;
 * Vite's dev and preview servers would otherwise open the app. */
const pageSlash: Plugin = {
  name: "page-slash",
  configureServer(server) {
    server.middlewares.use(redirect);
  },
  configurePreviewServer(server) {
    server.middlewares.use(redirect);
  },
};

function redirect(request: IncomingMessage, response: ServerResponse, next: () => void): void {
  const match = /^\/(kit|sim)(\?.*)?$/.exec(request.url ?? "");
  if (match === null) return next();
  response.statusCode = 301;
  response.setHeader("Location", `/${match[1]}/${match[2] ?? ""}`);
  response.end();
}

/** Writes `sw.js` with the files the app needs offline: its own chunks, styles and assets, `db.json` among them,
 * and the Latin fonts its text uses; never the UI kit's or the simulation's (web/README.md#Installing). */
const serviceWorker: Plugin = {
  name: "service-worker",
  apply: "build",
  generateBundle(_, bundle) {
    const main = Object.values(bundle).find((file) => file.type === "chunk" && file.isEntry && file.name === "main");
    if (main === undefined) throw new Error("The build has no main entry to keep offline");
    const kept = new Set<string>();
    const keep = (fileName: string) => {
      const file = bundle[fileName];
      if (file === undefined || kept.has(fileName)) return;
      kept.add(fileName);
      if (file.type !== "chunk") return;
      [...file.imports, ...file.dynamicImports].forEach(keep);
      file.viteMetadata?.importedCss.forEach((css) => kept.add(css));
      // Fonts come below, only the subsets the app's text uses
      file.viteMetadata?.importedAssets.forEach((asset) => {
        if (!/\.woff2?$/.test(asset)) kept.add(asset);
      });
    };
    keep(main.fileName);
    for (const fileName of Object.keys(bundle))
      if (/\/(?:cinzel|eb-garamond)-latin(?:-ext)?-\d+-(?:normal|italic)-[^/]+\.woff2$/.test(fileName)) kept.add(fileName);
    const files = ["/", ...UNHASHED, ...[...kept].sort().map((fileName) => `/${fileName}`)];
    // A new release, or a change to the worker, the manifest or an icon, keeps its files under a new name and drops the
    // old ones; the hashed names cover the rest
    const hash = createHash("sha256").update(serviceWorkerSource(files, ""));
    for (const file of UNHASHED) hash.update(readFileSync(fileURLToPath(new URL(`public${file}`, import.meta.url))));
    const version = hash.digest("hex").slice(0, 12);
    this.emitFile({ type: "asset", fileName: "sw.js", source: serviceWorkerSource(files, version) });
  },
};

const ICONS = [
  "/favicon.ico",
  "/icons/favicon.svg",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];
/** Kept under names that never change, so their content decides when the worker updates. */
const UNHASHED = ["/manifest.webmanifest", ...ICONS];

export default defineConfig({
  plugins: [react(), pageSlash, serviceWorker],
  // The UI kit and the simulation are pages of their own, each with its own bundle (web/src/ui/README.md#UI kit,
  // web/sim/README.md#The page)
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        kit: fileURLToPath(new URL("kit/index.html", import.meta.url)),
        sim: fileURLToPath(new URL("sim/index.html", import.meta.url)),
      },
    },
  },
  server: { fs: { allow: [".."] } },
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx", "sim/**/*.test.ts"] },
});
