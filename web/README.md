# Web app

The EldenRoll app: React, Vite and TypeScript, mobile first, with no backend. The rules live in `src/engine/README.md`; this file covers the views, saving and the finished-run summary. The views are designed and being built; saving, the finished run, run history and installing come after them. The look lives in `src/ui/`, the design tokens and shared controls, and every screen in `src/views/` is built only from them; the icons are drawn by `design/icons/`. Until a view is built, this file is its spec; once it is, the code is, and this file keeps only what the code can't say.

Scripts are in `package.json`. The app and the engine tests read `../data/build/db.json`, which is git-ignored, so build the database first (`pipeline/README.md`); without it they stop and say so. Vitest hides `console.log` unless run with `--reporter=verbose`. There is no Prettier config: `npx prettier --write` would reformat every file, so format by hand.

## Views

Player-facing text says *felled* where the game does: `Felled?`, `Felled on the way`, `Boss gear locked until felled`, `Felled` in `Bosses`. Code and stored data say `dead`. *Felled on the way* names a boss felled outside an objective: before the run, between objectives, or one `Felled?` marks.

There are no item pictures. Every image slot shows our own icon for the item's subcategory, so pictures could replace them later without a redesign.

### Navigation

Home is the current objective's card while a run is in progress, and Start otherwise. Every other screen opens over home and its `✕` returns there; only a run opened from `Run history` closes back to the list. There is no separate `Resume` inside the app: closing is enough.

A sheet (the menu, the reroll panel, `Felled?` and the confirmations) holds the keyboard while it is open: `Esc` closes it, `Tab` stays inside it, and closing returns focus to the control that opened it. Keyboard focus shows on every control as one thin gold outline; on the reroll slider, whose input is invisible, it rings the handle.

The main flows:

1. **Start a run:** Start → stats, regions, `Run settings` → `Start run` → the card.
2. **Play an objective:** the card → `Reroll` as often as wanted → `Done` → `Great enemy felled` with `Undo` → `Level up` → `Roll objective N` → the card.
3. **A boss already felled:** `Felled?` → `Felled on the way?` → `Confirm and reroll` → `Rerolling in` with `Undo` → the card.
4. **Change things mid-run:** `Level N` → `Level up` → `Save`. Menu → `Run settings` → `General`, `Never roll` or `Shortlist` → `Save`; `Bosses` opens from `General`.
5. **Check progress:** menu → the run's row → `Summary` and `Timeline`.
6. **Finish:** menu → `Finish run` → confirmation → the run's view over Start → `✕` → Start.
7. **Come back later:** reopening the app with a run in progress lands on Start: `Resume` returns to where the run is, the card or `Level up` between objectives; `New run` asks first, finishes the current run, then shows a fresh Start.
8. **Look back:** Start or the menu → `Run history` → a run → `Summary` and `Timeline`; `Delete run` at the end of `Summary`.

### Start

- The tagline types itself in a flowing rhythm, each key a little different, a short breath between words and a longer one after punctuation; holds it for a fixed beat plus a share of the time reading it takes, so every line gets a moment and a longer one stays longer, since the reader has followed most of it as it typed but may have started late; deletes it a word at a time, `Elden Rold` in one go; and types the next, in a loop, without pausing while the player sets up. The main tagline, the first variant, is one line; any other breaks where its first line would outgrow the main one and takes two lines at most, which the development build checks in the console. Each holds `Elden Rold`, which opens the `Elden Rold` card.
  - Nothing jumps while it types: every first line starts where the centred main tagline does, a second line is centred under it, the height is always the most lines any variant takes, and the untyped rest already holds its place.
- **No run in progress:** `Run history` shows once a run is saved, after `Run settings`, so everything that sets up the run comes before navigation.
- **A run in progress:** stats, regions and settings belong to the run, so they stay hidden until `New run`.

### Elden Rold card

The onboarding card, opened from `Elden Rold` in Start's tagline. Adding the app to the Home Screen comes before the first run because iPhone keeps a home-screen app's storage apart from Safari's: a run started in Safari stays there.

### Run settings

One screen from Start and from the menu. It reopens on the last tab used, so a list edited often stays two taps from the card.

- **General:**
  - **Bosses:** a row opening `Bosses`, and the `Boss gear locked until felled` toggle. Off stops the boss filter; `Bosses` stays, because felled and skipped bosses still leave the pool.
- **Never roll** has no browsing by category, only search. It lists real item names, never an alias label, because the player picks from their inventory; excluding one alias member leaves the others rolling. Armor is listed as whole sets, since a set is what rolls; typing a piece's name finds every set that holds it.
- **Shortlist** searches weapons and greatshields never narrowed by class, since classes can change at any time. The tab says `Shortlist` to fit; everywhere else the feature is `Weapon shortlist`.
- In both lists an unticked entry keeps its place until `Save`. Search results group like the card, names starting with the search first.

### Bosses

Every boss instance with `odds > 0`, under a legend of the three states. `Felled` writes to `deadBosses`, `Skipped` to `skippedBosses`: before a run, the lists `Start run` hands the engine, where every felled boss counts as felled on the way; during one, `Save` applies them through `setBossState`. Marking a boss here decays nothing.

- A boss felled with `Done` can't change and is listed by objective, folded; the current objective's boss can't change either, since only `Felled?` marks it. One marked by `Felled?` is `Felled` and can change.
- Alive bosses show only in search results. A changed row keeps its place until `Save`; a new search regroups the rows by their pending states.
- `Bosses` opens over `Run settings` and saves on its own: its `Save` and `✕` both return there with the settings' own pending edits kept.

### Current run

- **Top bar:** `Objective N` at the left; at the right `Level N`, which opens `Level up` for the next roll, and the menu.
- **Menu:** the run's row opens its view, and `Run history` shows how many runs are finished.
- **Wiki links:** each item tile, a named ash and the armor set name open the item's wiki page where one exists. Names and rows aren't tappable; `none`, `any` and aliases have no link. The card shows no item locations: the wiki covers them better, and the data's placements are sometimes adjusted for balance.
- **Empty slots:** a `None` armor piece and the rule `None` show as `none`, like any empty slot, so they read apart from `any` and from a rule to obey.
- **Reroll panel:** its chips run in reverse roll order, `Armor` first, so they read like the slider. The panel hides most of the card on a phone, so the chips carry the whole scope. The lit chips always form one run from the left, growing with the slider's fill and glow, which teaches that a reroll redoes everything from its target on.
- **Felled?** opens the same panel locked at `Full objective`. Its chips state how things stand after the reroll, so they read as states, unlike the confirmation chips, which name actions. If no boss is left alive in the selected regions after it, `Level up` follows, where regions are ticked.
- **After `Done`:** `Undo` puts back the run exactly as it was until the countdown ends. The next objective rolls only from `Level up`, so what changes there counts for it; while the selected regions hold no living boss, the run waits there with the waiting message. `Level up` marks the stats raised since `Done`, and its short region list keeps the unticked regions it opened with, so a ticked one stays in place. Opened from `Level N` mid-objective, it saves for the next roll and closes without saving.
- The reroll count is kept for the summary but not shown on the card.

### Confirmations

`Finish run`, `New run` and `Delete run` share one sheet. Its chips are in the active voice with no contractions; `Delete run`'s is `Cannot undo`.

### Run view

The same view for the run in progress and a finished one, read-only. Its title is the last completed objective and its boss, `Objective 88` over `Malenia, Blade of Miquella`; in progress, the current objective. The boss name alone is enough: the player knows which instance they fought. Under the title, a status: `Finished 10 Jan 2027` or `In progress`. Two tabs follow, `Summary` and `Timeline`, so the timeline isn't buried under the summary.

- **Summary**, in order:
  - `Level` and the 8 stats, from the last `Done`; in progress, the current ones.
  - `Totals`: objectives completed, bosses felled, bosses skipped and rerolls. `Bosses skipped` opens its list, each boss's name over its location, since one name can cover several instances.
  - `N top classes`: completed objectives per class, with the class's icon group; the top 3, then `Show all N`.
  - `N unique gear`: rows for weapons, shields, sorceries, incantations, armor sets and the shortlist, each with its count, opening an A–Z list. Tapping a name opens `Timeline` searched for it.
  - `10 most rerolled`: the top 5, then `Show all 10`.
  - `Delete run`, on a finished run only.
  - Every count from `Totals` down sits in one column, a chevron's width in from the edge, so rows that open something line up with rows that don't. `Level` and the stats keep the edge under their own rule.
- **Timeline**, oldest first. Each objective shows its number, boss and class, and opens to its loadout, rules, and level and stats at `Done`. Bosses felled on the way show as one `Felled on the way` entry listing them, just before the objective they were marked under; those marked before objective 1 come first, and those marked during the unfinished last objective come last. No reroll counts: per objective they say nothing.
  - **Search** picks one entry from this run: a boss, a class, an item, a set or a rule. Skipped bosses are never in it, since they're never in the timeline. A pick shows `N of M objectives` and only the matching entries, each showing the line that matched; `✕` in the field clears it.
- The unfinished objective is never shown as completed.

### Run history

From the menu or from Start. The run in progress, if any, is pinned on top under `Current run`, its title over `In progress`, opening its view. Then the finished runs, newest first, each its title over `Finished <date>`, cut with `…`, opening its run view. A run finished with no completed objective isn't saved, so trying the app leaves no clutter; any saved run can be deleted from its view. One run is active at a time, and nothing from a finished run reaches the engine.

### Desktop

Most players keep this open on a phone beside a console, so desktop gets no layout of its own: the app runs inside a drawn phone, centred on the page, and every screen inside it is the phone's, unchanged.

- The phone has an iPhone 18 Pro's proportions and corner radius, with a punch hole. It draws no status bar or home bar, so the top bar starts beside the punch hole and the bottom bar keeps only its own margin.
- It scales as a whole to the window's height, so its content keeps a phone's proportions. Below a minimum scale the page scrolls instead, so browser zoom still enlarges the text.
- `ELDEN` stands to its left and `ROLL` to its right, in the kit's dimmest gold, sized to the space beside the phone and hidden when they would be too small to read.
- The mouse wheel scrolls the phone from anywhere on the page. Scrolling, sheets and anything positioned stay inside the phone's screen, so components size themselves to their container, never to the window.
- Hover states are for desktop; phones ignore them.
- A phone-sized window gets no frame: the app fills it.

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
- `deadBosses` entries carry `instanceId` and the `objectiveIndex` showing when the boss was marked, `0` before objective 1, in marking order. The timeline draws a boss felled on the way from this index. It stays on the boss rather than becoming an event of its own, so such bosses could later fold into their objective as other kills.
- Each reroll event records what it replaced in every slot it changed, for `10 most rerolled`. The reroll after `Felled?` isn't counted there: the player didn't turn that boss down.
- Finished runs are kept beside the active one until deleted.
- No personal data, no cookies, no analytics.
- The installable app keeps the app and `db.json` on the phone so rolls work offline. iPhone has no install prompt and keeps a home-screen app's storage apart from Safari's, so the `Elden Rold` card explains `Add to Home Screen` before the first run.

## Summary

Totals, top classes, unique gear and most rerolled; their layout is in #Run view.

- Only completed objectives count; `none` and `any` never.
- Top lists by gear category were dropped: with decay a category drifts towards an even spread, or the shortlist dominates it, and the player already knows their shortlist. Counts of unique gear say more.
- **Unique gear** counts distinct entries per category, an alias as one label. `Any staff` and `Any seal` are left out of weapons: those classes attack with spells, so the label says nothing about their weapon. `Any torch` counts, because the torch is the weapon.
- **Most rerolled** ranks everything a reroll replaced, across bosses, classes, gear and rules, by how often; ties by name.
- Bosses aren't ranked: each completes at most once. `Bosses felled` counts those felled in objectives and on the way. Completed objectives and bosses accounted for can differ.
- Recovering a save never crashes and never loses completed objectives.
