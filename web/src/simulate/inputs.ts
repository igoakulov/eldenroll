// The page's settings and view, kept in the address so a link reproduces a result (web/sim/README.md#The page)
import { ALLOCATIONS, type Allocation } from "../../sim/player";

export const MAX_RUNS = 10;
export const MAX_SEED = 999_999;
export const COMPLETION_STEP = 10;
export const TABS = ["overview", "slots", "synergies", "items"] as const;
export type Tab = (typeof TABS)[number];

/** How Slots counts its tables: the hands by weapon class or weapon, the rest by item, or every table by region. */
const SLOT_VIEWS = ["class", "item", "region"] as const;
export type SlotView = (typeof SLOT_VIEWS)[number];

/** What a run plays with: changing any of these needs `Simulate`. */
export interface Inputs {
  readonly runs: number;
  readonly allocation: Allocation;
  /** null for every region. */
  readonly regions: readonly string[] | null;
  readonly completion: number;
  readonly seed: number;
}

/** How the results are read: changing these never reruns. `classes` null for every class. */
export interface View {
  readonly classes: readonly string[] | null;
  readonly tab: Tab;
  readonly search: string;
  readonly by: SlotView;
}

const DEFAULT_INPUTS: Omit<Inputs, "seed"> = {
  runs: 1,
  allocation: "ALL",
  regions: null,
  completion: 50,
};

export function randomSeed(): number {
  return Math.floor(Math.random() * (MAX_SEED + 1));
}

const int = (value: string | null, min: number, max: number): number | undefined => {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  return Math.min(max, Math.max(min, Number(value)));
};

/** `all`, or no value, for every one. */
const ALL = "all";

const list = (value: string | null): readonly string[] | null =>
  value === null || value === ALL ? null : value.split(",").filter((one) => one !== "");

export function readAddress(search: string): { readonly inputs: Inputs; readonly view: View } {
  const params = new URLSearchParams(search);
  const allocation = params.get("allocation");
  const tab = params.get("tab");
  const completion = int(params.get("completion"), COMPLETION_STEP, 100);
  return {
    inputs: {
      runs: int(params.get("runs"), 1, MAX_RUNS) ?? DEFAULT_INPUTS.runs,
      allocation: ALLOCATIONS.find((one) => one === allocation) ?? DEFAULT_INPUTS.allocation,
      regions: list(params.get("regions")),
      completion:
        completion === undefined ? DEFAULT_INPUTS.completion : Math.round(completion / COMPLETION_STEP) * COMPLETION_STEP,
      seed: int(params.get("seed"), 0, MAX_SEED) ?? randomSeed(),
    },
    view: {
      classes: list(params.get("classes")),
      tab: TABS.find((one) => one === tab) ?? "overview",
      search: params.get("q") ?? "",
      by: SLOT_VIEWS.find((one) => one === params.get("by")) ?? "class",
    },
  };
}

/** Every setting, defaults included, so a link reads whole; only an empty search is left out. */
export function writeAddress(inputs: Inputs, view: View): string {
  const params = new URLSearchParams();
  params.set("runs", String(inputs.runs));
  params.set("allocation", inputs.allocation);
  params.set("regions", inputs.regions === null ? ALL : inputs.regions.join(","));
  params.set("completion", String(inputs.completion));
  params.set("seed", String(inputs.seed));
  params.set("classes", view.classes === null ? ALL : view.classes.join(","));
  params.set("tab", view.tab);
  params.set("by", view.by);
  if (view.search !== "") params.set("q", view.search);
  return `?${params.toString().replaceAll("%2C", ",")}`;
}

export function sameInputs(a: Inputs, b: Inputs): boolean {
  return (
    a.runs === b.runs &&
    a.allocation === b.allocation &&
    (a.regions ?? []).join() === (b.regions ?? []).join() &&
    (a.regions === null) === (b.regions === null) &&
    a.completion === b.completion &&
    a.seed === b.seed
  );
}
