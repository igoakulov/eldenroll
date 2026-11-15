import { existsSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

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

export default defineConfig({
  plugins: [react(), pageSlash],
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
