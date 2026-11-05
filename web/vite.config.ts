import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const databasePath = fileURLToPath(new URL("../data/build/db.json", import.meta.url));

if (!existsSync(databasePath)) {
  throw new Error(
    `${databasePath} is missing. Build it first: cd pipeline && ../.venv/bin/python -m eldenrando.build.database`,
  );
}

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx"] },
});
