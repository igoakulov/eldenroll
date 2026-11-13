// Plays the runs off the page's thread, so the page answers while they play (web/sim/README.md#The page)
import { runSeed, simulateRun, type ChanceSums, type RunResult } from "../../sim/simulate";
import { indexDatabase } from "../engine/engineData";
import { DEFAULT_HYPERPARAMS } from "../engine/hyperparams";
import type { Engine } from "../engine/run";
import { loadDatabase } from "../loadDatabase";
import type { Inputs } from "./inputs";

export interface Request {
  readonly id: number;
  readonly inputs: Inputs;
}

export type Reply =
  | { readonly id: number; readonly kind: "progress"; readonly done: number }
  | { readonly id: number; readonly kind: "done"; readonly results: readonly RunResult[]; readonly chances: ChanceSums }
  | { readonly id: number; readonly kind: "failed"; readonly message: string };

// The project's types are the page's, not a worker's
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: Reply) => void;
};

let engine: Promise<Engine> | null = null;

scope.onmessage = async (event) => {
  const { id, inputs } = event.data;
  try {
    engine ??= loadDatabase().then((database) => ({ data: indexDatabase(database), hyperparams: DEFAULT_HYPERPARAMS }));
    const ready = await engine;
    const results: RunResult[] = [];
    const chances: ChanceSums = new Map();
    for (let run = 0; run < inputs.runs; run += 1) {
      results.push(
        simulateRun(ready, {
          allocation: inputs.allocation,
          seed: runSeed(inputs.seed, inputs.allocation, run),
          regions: inputs.regions,
          completion: inputs.completion,
          characterClasses: null,
          rerollEvery: inputs.rerollEvery,
          chances,
        }),
      );
      scope.postMessage({ id, kind: "progress", done: run + 1 });
    }
    scope.postMessage({ id, kind: "done", results, chances });
  } catch (error) {
    engine = null;
    scope.postMessage({ id, kind: "failed", message: error instanceof Error ? error.message : String(error) });
  }
};
