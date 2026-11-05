import { readFileSync } from "node:fs";

import type { Database } from "./database";

export const realDatabase = JSON.parse(
  readFileSync(new URL("../../../data/build/db.json", import.meta.url), "utf8"),
) as Database;
