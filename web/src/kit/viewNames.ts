// Shared by the kit page and `scripts/screenshots.ts`, which runs in Node, so this module imports nothing
export const VIEW_NAMES = [
  "start",
  "start-resume",
  "start-loading",
  "start-failed",
  "rold-card",
  "run-settings-general",
  "run-settings-never-roll",
  "run-settings-shortlist",
  "bosses",
  "card",
  "felled-next",
  "felled-rerolling",
  "level-up-next",
  "level-up-mid",
] as const;

export type ViewName = (typeof VIEW_NAMES)[number];

/** The `?view=` value that shows one view alone, or `null` for the whole page. */
export const VIEW_PARAM = "view";
