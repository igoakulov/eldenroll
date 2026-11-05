import databaseUrl from "../../data/build/db.json?url";

import type { Database } from "./engine/database";

export async function loadDatabase(): Promise<Database> {
  const response = await fetch(databaseUrl);
  if (!response.ok) {
    throw new Error(`Database request failed with status ${response.status}`);
  }
  return (await response.json()) as Database;
}
