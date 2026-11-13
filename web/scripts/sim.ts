// Runs the full-run simulation (web/sim/README.md). Vite loads the engine, whose imports carry no extensions.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runnerImport } from "vite";

const WEB = fileURLToPath(new URL("..", import.meta.url));
const { module } = await runnerImport<typeof import("../sim/main.ts")>(path.join(WEB, "sim/main.ts"), {
  configFile: false,
  logLevel: "error",
});
module.main(process.argv.slice(2), path.dirname(path.resolve(WEB)));
