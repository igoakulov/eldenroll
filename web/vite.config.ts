import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const databasePath = fileURLToPath(new URL("../data/build/db.json", import.meta.url));

if (!existsSync(databasePath)) {
  throw new Error(
    `${databasePath} is missing. Build it first: cd pipeline && ../.venv/bin/python -m eldenroll.build.database`,
  );
}

export default defineConfig({
  plugins: [react()],
  // The UI kit is a second page with its own bundle (web/src/ui/README.md#UI kit)
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        kit: fileURLToPath(new URL("kit/index.html", import.meta.url)),
      },
    },
  },
  server: { fs: { allow: [".."] } },
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx"] },
});
