# Web app

The EldenRoll app: React, Vite and TypeScript, mobile first, with no backend. The rules live in `src/engine/README.md`; this file covers the views, saving and the finished-run summary. The views are designed and being built; saving, the finished run, run history and installing come after them. The look is in `design/README.md`. Until a view is built, this file is its spec; once it is, the code is, and this file keeps only what the code can't say.

Scripts are in `package.json`. The app and the engine tests read `../data/build/db.json`, which is git-ignored, so build the database first (`pipeline/README.md`); without it they stop and say so. Vitest hides `console.log` unless run with `--reporter=verbose`. There is no Prettier config: `npx prettier --write` would reformat every file, so format by hand.

## Views

Player-facing text says *felled* where the game does: `Felled?`, `Boss items only from felled bosses`, `Felled` in `Bosses`. Code and stored data say `dead`.

There are no item pictures. Every image slot shows our own icon for the item's subcategory, so pictures could replace them later without a redesign.

### Start

- The wordmark and the tagline.
- Read-only `Level`, then the 8 stats, each a number field between `−` and `+`.
- `Regions`: 17 checkboxes by `region_level`; a DLC region shows a `DLC` tag in place of its `DLC: ` prefix.
- `More settings` opens `Run settings`.
- `Start run`; with a run in progress, `Resume run` and `New run` with a confirmation.
- The disclaimer.

### Run settings

The same screen from Start and from the menu: `Changes apply on the next roll.`, `Save`, and a close button that discards every change. Three groups:

- **Classes:** one checkbox per class.
- **Gear:** `Max stat gap`; `Never roll` and `Weapon shortlist`, each a row opening its own screen.
- **Bosses:** a row opening `Bosses`, showing how many are felled and skipped, and the `Boss items only from felled bosses` toggle, on by default. Off stops the boss filter; `Bosses` stays, because felled and skipped bosses still leave the pool.

### Bosses

Every boss instance with `odds > 0`, each its name over its `location`, one line each, cut with `…`. A legend explains the three states, each in two lines:

| State | Lines |
|---|---|
| `Alive` (default) | `Can be rolled as an objective.` / `Its gear cannot be rolled yet.` |
| `Felled` | `Felled in an objective or before.` / `Its gear can be rolled.` |
| `Skipped` | `Never rolled as an objective.` / `Its gear cannot be rolled.` |

`Felled` writes to `deadBosses`, `Skipped` to `skippedBosses`. A boss felled with `Done` can't change: it sits in `N felled in objectives`, a numbered list in objective order folded behind `Show all N`. The current objective's boss reads `Current`. Every other boss has a cycler stepping through the three states; one marked by `Felled?` is `Felled` and can change. Without a search the screen lists `Skipped`, then `Felled`, then the folded group; alive bosses show only in search results. A changed row stays in place until `Save`. Marking a boss here decays nothing.

### Never roll and Weapon shortlist

- **Never roll** searches every gear item and combat rule with `odds > 0`, empty by default; there is no browsing by category. It lists real item names, never an alias label, because the player picks from their inventory; excluding one alias member leaves the others rolling. Armor is listed as whole sets, without the `None` pieces; typing a piece's name finds every set that holds it. It writes to `neverRoll`.
- **Weapon shortlist** has the checkbox `Roll Right Hand from shortlist`, off by default, and searches every weapon and greatshield with `odds > 0`, never narrowed by class, since classes can change at any time. Its line: `Add your favorite or upgraded weapons. Classes will first roll their Right Hand from your shortlist.`
- Both show the selected entries in card order under `N selected`, with `Clear all`. An unticked entry stays in place until `Save`; the close button discards every change.

### Current run

- **Top bar:** `Objective N` at the left; at the right `Level N`, which opens `Level up` with `Changes apply on the next roll.`, and the menu.
- **Menu**, one flat list: `Run history`, `Current run` with its level, `Never roll`, `Weapon shortlist`, `Run settings`, and `Finish run`, which can't be undone.
- **Card:**
  - The boss name, a bar with `Felled?` on it, and the location with a pin.
  - The class name as the loadout heading, with a small group of icons for its typical loadout.
  - `Weapons`: LH and RH side by side, LH on the left. Each shows a large icon, its label, the name, and the ash under the name only when one is named.
  - `Spell`, `Talismans` (1 and 2), `Armor` (the set name, then each piece) and `Item`, each a small icon and the name.
  - `Combat rules`: each name beside a red lozenge.
  - Wiki links: each item tile, a named ash and the armor set name open the item's wiki page where one exists. Names and rows aren't tappable; `none`, `any` and aliases have no link. The card shows no item locations: the wiki covers them better, and the data's placements are sometimes adjusted for balance.
- **Bottom bar:** `Reroll` and `Done`.
- **Reroll panel** replaces the bar: read-only chips for every target in roll order, lit where the reroll will change them; the 9-stop slider; `Reroll`; a close button. Each slot that will change shows the reroll icon in a lit tile and its name struck through; `Felled?` and links hide.
- **Felled?** opens the same panel locked at `Full objective`, with the chips `Boss skipped until end of run`, `Boss gear unlocked` and `New objective`, and `Skip boss and reroll`. Confirming shows the `Rerolling in` countdown.
- **After `Done`:** the boss name over its emptied bar, `Great enemy felled`, `Next objective in` counting from 5, and `Undo`. Then **Level up**: `Level` before and after, the 8 stats with changed values marked, `N of 17 selected` with the next 3 unticked regions and `Show all 17 regions`, and `Roll objective N`. The waiting messages show here.
- The reroll count is kept for the summary but not shown on the card.

### Finished run

Completed count, total rerolls, the timeline (`Objective 1 → 2 rerolls → Objective 2 → …`) and the summary. A read-only list of each completed objective: boss, loadout, rules, stats and level at `Done`, rerolls before it. The unfinished objective is never shown as completed.

### Run history

Finished runs are kept beside the active one, listed newest first, each opening its finished-run view read-only. One run is active at a time, and nothing from a finished run reaches the engine.

## Saving

`localStorage`, one active run per browser, behind a save layer a server could replace.

```json
{
  "schemaVersion": 1,
  "runId": "...", "seed": "...", "startedAt": "...",
  "settings": {}, "stats": {}, "regions": [],
  "currentObjective": {}, "completedObjectives": [],
  "owned": {}, "ownedAliases": [],
  "deadBosses": [{ "instanceId": "...", "objectiveIndex": 3 }],
  "skippedBosses": [],
  "neverRoll": [],
  "weaponShortlist": [],
  "rerollCount": 0, "rerollEvents": []
}
```

- `schemaVersion` is bumped only when the stored shape changes; it is not a migration system.
- Completed objectives store snapshots with names: boss name and location, item names or alias labels, set and piece names, rule names, stats and level at `Done`. A finished run renders from them: a missing image shows the icon, a missing URL no link, a missing name `unknown item`.
- An unknown `schemaVersion`, a missing id or an invalid shape keeps stats, settings, regions, felled bosses, the shortlist, owned state and completed objectives, and rerolls the current objective; if that fails, it offers a reset. A shortlisted weapon gone from the data is dropped from the list. Corrupt storage prompts a reset, never a crash.
- `deadBosses` entries carry `instanceId` and the `objectiveIndex` showing when the boss was marked, `0` before objective 1, in marking order.
- No personal data, no cookies, no analytics.
- The installable app keeps the app and `db.json` on the phone so rolls work offline. iPhone has no install prompt and keeps a home-screen app's storage apart from Safari's, so Start explains `Add to Home Screen` before the first run.

## Summary

By category: classes, weapons and shields, sorceries and incantations, talismans, armor sets, combat rules, tools and consumables.

- Only completed objectives count; each appearance once per slot; `none` and `any` never.
- An alias counts as one label (`15 Any staff`).
- Top 10 per category; ties by count descending, then name.
- Bosses aren't ranked: each completes at most once. Felled bosses appear in the timeline at the objective they were marked under, in marking order, and count toward the boss total; those marked before objective 1 appear at its start. Completed objectives and bosses accounted for can differ.
- Recovering a save never crashes and never loses completed objectives.
