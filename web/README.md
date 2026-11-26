# Web app

The Elden Roll app: React, Vite and TypeScript, mobile first, with no backend. The rules live in `src/engine/README.md`; this file covers the views, saving and the finished-run summary. Every view is built. The look lives in `src/ui/` (`src/ui/README.md`), the design tokens and shared controls, and every screen in `src/views/` is built only from them. Every word the UI shows is in `src/copy.ts`, grouped by screen, and `src/copyInComponents.test.ts` fails on text written straight into a component; game data's names come from the database. Until a view is built, this file is its spec; once it is, the code is, and this file keeps only what the code can't say.

Scripts are in `package.json`. The app and the engine tests read `../data/build/db.json`, which is git-ignored, so build the database first (`pipeline/README.md`); without it they stop and say so. Vitest hides `console.log` unless run with `--reporter=verbose`. There is no Prettier config: `npx prettier --write` would reformat every file, so format by hand.

## Views

Player-facing text says *felled* where the game does: `Felled?`, `Felled on the way`, `Felled` in `Bosses`. Code and stored data say `dead`. *Felled on the way* names a boss felled outside an objective: before the run, between objectives, or one `Felled?` marks.

There are no item pictures. Every image slot shows our own icon for the item's subcategory, so pictures could replace them later without a redesign.

### Navigation

Home is the current objective's card while a run is in progress, and Start otherwise. Every other screen opens over home and its `✕` returns there; only a finished run opened from `All runs` closes back to the list. There is no separate `Resume` inside the app: closing is enough.

A sheet (the menu, the reroll panel, `Felled?` and the confirmations) holds the keyboard while it is open: `Esc` closes it, `Tab` stays inside it, and closing returns focus to the control that opened it. Two keys work everywhere, as a desktop expects: `Enter` presses the glow band of whatever is on top, and `Esc` its way back, the `✕` or, on the felled screen, `Undo`. Screens declare no keys: the kit's own buttons carry them. A confirmation takes no `Enter`, since each loses something; a focused control keeps `Enter`, and a text field keeps both, `Esc` leaving it. The felled screen puts focus on the screen rather than on `Undo`, so an `Enter` pressed again after `Done` can't undo it. There are no other shortcuts and no key hints: the app is played on a phone. Keyboard focus shows on every control as one thin gold outline; on the reroll slider, whose input is invisible, it rings the handle.

The main flows:

1. **Start a run:** Start → stats, regions, `Run settings` → `Start run` → the card.
2. **Play an objective:** the card → `Reroll` as often as wanted → `Done` → `Great enemy felled` with `Undo` → `Level up` → `Roll objective N` → the card.
3. **A boss already felled:** `Felled?` → `Felled on the way?` → `Accept and reroll` → `Rerolling in` with `Undo` → the card.
4. **Change things mid-run:** `Level N` → `Level up` → `Save`. Menu → `Run settings` → `General`, `Never roll` or `Shortlist` → `Save`; `Bosses` opens from `General`.
5. **Check progress:** menu → `Run summary` → `Summary` and `Timeline`.
6. **Finish:** menu → `Finish run` → confirmation → the run's view over Start → `✕` → Start. A run that ends by itself, every boss felled or skipped, lands on its view the same way: after the countdown of the `Done` or `Felled?` that ended it, or at `Roll objective N` when nothing is left to roll.
7. **Come back later:** reopening the app with a run in progress lands on Start: `Resume` returns to where the run is, the card or `Level up` between objectives; `New run` asks first, finishes the current run, then shows a fresh Start.
8. **Look back:** Start → `All runs` → a finished run → `Summary` and `Timeline`; `Delete run` at the end of `Summary`. The way in is on Start, where a returning player lands, so looking back never means resuming a run first.
9. **Back to Start mid-run:** the wordmark at the top of the menu → Start with the run in progress → `Resume`.

### Start

- The tagline types itself in a flowing rhythm, each key a little different, a short breath between words and a longer one after punctuation; holds it for a fixed beat plus a share of the time reading it takes, so every line gets a moment and a longer one stays longer, since the reader has followed most of it as it typed but may have started late; deletes it a word at a time, `Elden Rold` in one go; and types the next, in a loop, without pausing while the player sets up. The main tagline, the first variant, is one line; any other breaks where its first line would outgrow the main one and takes two lines at most, which the development build checks in the console. Each holds `Elden Rold`, which opens `How it works`.
  - Nothing jumps while it types: every first line starts where the centred main tagline does, a second line is centred under it, the height is always the most lines any variant takes, and the untyped rest already holds its place.
- **No run in progress:** an `All runs` row with how many there are, under the tagline and above the stats, so a returning player sees it without scrolling; it shows once a run is saved. Then stats, regions and `Run settings`.
- **A run in progress:** the `All runs` row, then `Current run`, as the menu orders them, whose objective row opens the run as `Resume` does. Stats, regions and settings belong to the run, so they stay hidden until `New run`.

### How it works

The onboarding page, opened from `Elden Rold` in Start's tagline and from the menu's `How it works`. It opens under the wordmark, as Start does, so the help reads as the app's own. Adding the app to the Home Screen comes before the first run (#Installing).

- It opens on the case for the app: a companion for the phone, kept beside the game, that rolls the bosses to fell, the builds to try and the gear to gather.
- Each section opens with one sentence on what it offers; the rows under it give the detail. `A run` is the routine in numbered steps; `An objective` and `Run settings` set each term beside what it means.
- Starting mid-playthrough is in `A run`'s opening sentence, so a player with a game under way sees at once that they needn't start over.
- `An objective` says that gear that works together rolls together more often, so a player expects rolls that make sense, not pure chance.
- The Home Screen steps are chains of the buttons to tap, with Safari's own icons for `Share` and `Add to Home Screen` and the app's icon as the Home Screen shows it. No screenshots: they date with every iOS release. The note to add it before the first run sits under the iPhone steps, since only iPhone keeps a Safari run apart.
- One line of links, no heading: contact and the repository as their X and GitHub marks, then `Sim` and `Kit`, the simulation (`/sim/`) and the UI kit (`/kit/`). Each opens in a new tab, since the installed app has no back button to return from a page.
- The privacy notice is two plain sentences: runs stay on the device, and anonymous run stats may be sent. It must stay true to the last rule of #Saving.
- The data sources are credited in the repository (`data/sources/README.md`), not on the page.

### Run settings

One screen from Start and from the menu. It reopens on the last tab used, so a list edited often stays two taps from the card.

- **General:**
  - **Bosses:** a row opening `Bosses`.
- **Never roll** has no browsing by category, only search. It lists real item names, never an alias label, because the player picks from their inventory; excluding one alias member leaves the others rolling. Armor is listed as whole sets, since a set is what rolls; typing a piece's name finds every set that holds it.
- **Shortlist** searches weapons and greatshields never narrowed by class, since classes can change at any time. The tab says `Shortlist` to fit; everywhere else the feature is `Weapon shortlist`. `Roll Right Hand from shortlist` is on from the start: an empty list changes nothing, a player who starts one wants it rolled, and the tick is easy to forget; one who wants it off goes looking for it.
- In both lists an unticked entry keeps its place until `Save`. Search results group like the card, names starting with the search first.

### Bosses

Every boss instance with `odds > 0`, under a legend of the three states. `Felled` writes to `deadBosses`, `Skipped` to `skippedBosses`: before a run, the lists `Start run` hands the engine, where every felled boss counts as felled on the way; during one, `Save` applies them through `setBossState`. Marking a boss here changes nothing until the next roll.

- A boss felled with `Done` can't change and is listed by objective, folded; the current objective's boss can't change either, since only `Felled?` marks it. One marked by `Felled?` is `Felled` and can change.
- Alive bosses show only in search results. A changed row keeps its place until `Save`; a new search regroups the rows by their pending states.
- `Bosses` opens over `Run settings` and saves on its own: its `Save` and `✕` both return there with the settings' own pending edits kept.

### Current run

- **Top bar:** `Objective N` at the left; at the right `Level N`, which opens `Level up` for the next roll, and the menu.
- **Menu:** one list in two groups, the kit's stronger rule between them: the app's rows under the wordmark, `How it works` and `All runs`; the run's below, nearer the thumb, `Run summary`, `Run settings` and `Finish run`. Every row is named by what it opens. The menu doesn't name the objective: the top bar above it already does, and a row named after an objective must open that objective. `All runs` breaks the run rows' `Run …` pattern on purpose, so it reads as a different kind of thing. `How it works` opens its page, otherwise only reachable from Start, and closes back to the screen it opened from. The wordmark at its top opens Start with the run in progress, the way home for a player who wants the branded screen or `New run`.
- **Wiki links:** each item tile, a named ash, the armor set name and the boss's name open its wiki page where one exists. Item names and rows aren't tappable; an alias opens the wiki's page for its group, and `none` and `any` have no link. The card shows no item locations: the wiki covers them better, and the data's placements are sometimes adjusted for balance.
- **Empty slots:** a `None` armor piece and the rule `None` show as `none`, like any empty slot, so they read apart from `any` and from a rule to obey.
- **Reroll panel:** its chips run in reverse roll order, `Armor` first, so they read like the slider. The panel hides most of the card on a phone, so the chips carry the whole scope. The lit chips always form one run from the left, growing with the slider's fill and glow, which teaches that a reroll redoes everything from its target on.
- **Felled?** opens the same panel locked at `Full objective`. Its chips state how things stand after the reroll, so they read as states, unlike the confirmation chips, which name actions. If no boss is left alive in the selected regions after it, `Level up` follows, where regions are ticked.
- **After `Done`:** `Undo` puts back the run exactly as it was until the countdown ends. The next objective rolls only from `Level up`, so what changes there counts for it; while the selected regions hold no living boss, the run waits there with the waiting message. `Level up` marks the stats raised since `Done`, and its short region list keeps the unticked regions it opened with, so a ticked one stays in place. Opened from `Level N` mid-objective, it saves for the next roll and closes without saving.
- The reroll count is kept for the summary but not shown on the card.

### Confirmations

`Finish run`, `New run` and `Delete run` share one sheet. Its chips are in the active voice with no contractions; `Delete run`'s is `Cannot undo`.

### Run view

The same view for the run in progress and a finished one, read-only, opened by `Run summary` or `Finish run`. Its title is a boss, where the card has its boss, so opening the summary from the card moves nothing: in progress, the current objective's boss over `In progress`; finished, the last boss it felled in an objective over `Finished 10 Jan 2027`, never `Objective 88`, which would name an objective nothing here opens. The status alone is enough: `Totals` just below counts the objectives. The boss name alone is enough: the player knows which instance they fought. Two tabs, `Summary` and `Timeline`, so the timeline isn't buried under the summary.

- **Summary:** level and stats from the last `Done`, or the current ones in progress; then `Totals`, top classes, unique gear and most rerolled (#Summary). `Bosses skipped` opens its list, each name over its location, since one name can cover several instances. A unique gear row opens its A–Z list, and a name there opens `Timeline` searched for it. Every count from `Totals` down sits in one column, a chevron's width in from the edge, so rows that open something line up with rows that don't. `Delete run` ends a finished run's summary.
- **Timeline**, oldest first and in full: its tab holds nothing else, so a `Show all` would only add a tap. Bosses felled on the way show as one `Felled on the way` entry just before the objective they were marked under; those marked before objective 1 come first, and those marked during the unfinished last objective come last. No reroll counts: per objective they say nothing. An open objective lists the right hand first, as any list does (`src/ui/README.md#Direction`), and its stats at `Done` under short names (`VIG`, `MND`…), four to a line, since all eight must fit its narrow column; everywhere else has room for the full names.
  - **Search** picks one thing from this run: a boss, a class, an item as the card names it, a set or a rule. Skipped bosses are never in it, since they're never in the timeline. A pick shows how many objectives held it and only the matching entries, each with the line that matched.
- The unfinished objective is never shown as completed.

### All runs

Opened from its row on Start and from the menu. The run in progress first, under `Current run`, its row opening the objective as `Resume` does, since playing on is what the player came for; then the finished runs, newest first, each named by its size, then its last boss, `88 objectives, Malenia, Blade of Miquella` over `Finished 10 Jan 2027`, cut with `…`, opening its run view. The count says most about a run; a boss name can be long and only tells apart runs of a similar count, so it comes second and is what the cut takes; `✕` there and `Delete run` return to the list, or to Start once nothing is left in it. A run finished with no completed objective isn't saved, so trying the app leaves no clutter; any saved run can be deleted from its view, and past the cap the oldest goes silently (#Saving). One run is active at a time, and nothing from a finished run reaches the engine.

### Desktop

Most players keep this open on a phone beside a console, so desktop gets no layout of its own: the app runs inside a drawn phone, centred on the page, and every screen inside it is the phone's, unchanged. A phone-sized window, a landscape phone included, gets no frame.

- The phone scales as a whole to the window's height, so its content keeps a phone's proportions. Below a minimum scale the page scrolls instead, so browser zoom still enlarges the text.
- The phone is the only thing on the page to scroll, so the mouse wheel scrolls it from anywhere, unless the page itself is scrolling.
- Scrolling, sheets and anything positioned stay inside the phone's screen, so components size themselves to their container, never to the window: no `100vh`, no `position: fixed`.
- Hover states sit under `@media (hover: hover)`, so phones ignore them.

## Saving

`localStorage`, one active run per browser, behind a save layer a server can replace once accounts exist. Not before: without an account, a server copy could be found only through an id kept in the same browser storage, and would be lost with it.

- The active run is saved as the engine's `Run` on every change, in an envelope with `schemaVersion`, `runId`, `startedAt` and `updatedAt`. `schemaVersion` is bumped only when the stored shape changes; it is not a migration system. `runId` is a random UUID and `updatedAt` changes on every save, so runs kept on several devices can later merge into one account: the same run uploaded twice stays one run, and the newer copy wins.
- `Done` saves at once, so a reload during its countdown keeps the objective done and `Undo` is gone. With the app open in two tabs, a save in one moves the other to Start with the saved run, so an old tab can't save over newer progress.
- Start's setup, its stats, regions and `Run settings`, is saved as it is edited, so a reload before `Start run` keeps it; `Start run` hands it to the run and removes it. It matters most for the weapon shortlist, which takes looking up in the game's inventory.
- Catch-up's tally is kept only while it can steer a roll: the run's total while the run is active, and each slot's share only until `Done` adds it to the total. Kept on every objective, it would fill the browser's storage before a long run ended.
- A finished run keeps only what its view shows: each objective's boss, class, loadout and stats at `Done`, the bosses felled on the way with the objective they were marked under, the skipped bosses, and how often each thing was rerolled. Each id is stored once per run and the objectives point to it. Level comes from the stats, and the summary is worked out when the view opens.
- Owned gear isn't stored: it is what the completed objectives show (`src/engine/README.md#Eligibility`).
- Names, images and links come from the current database by id, so an old run shows today's names. An id gone from the data shows a name rebuilt from the id, `margit_the_fell_omen_stormveil_castle` as `Margit The Fell Omen Stormveil Castle`, the icon and no link. Storing names would cover only that rare case.
- Finished runs are capped so storage never fills: past the cap, the oldest goes, silently. Few players will reach it, so the app never mentions it. The cap sits under Safari's 5 MB per site, read as two bytes a character, with a margin.
- Loading checks a run against the current data and never crashes. Regions, classes, shortlisted weapons, never-roll entries and felled or skipped bosses gone from the data are dropped; with no class left, every class is on. If one of the current objective's ids is gone, it rerolls from that step on in roll order, as the reroll slider would, keeping the boss, the class and every slot before it: the player may have spent effort fetching that gear. This reroll isn't counted as theirs. A missing tally counts as empty, and keys the data no longer holds stay but are never read. A save in an unknown shape keeps what it can read, and an objective it can't read rolls anew. One that holds nothing usable, unreadable or with no run in it, is set aside under a key of its own and Start opens fresh: only the app writes saves, so it means a bug, and a reset prompt would give the player nothing to choose.
- `deadBosses` entries carry `instanceId` and the `objectiveIndex` showing when the boss was marked, `0` before objective 1, in marking order. The timeline draws a boss felled on the way from this index. It stays on the boss rather than becoming an event of its own, so such bosses could later fold into their objective as other kills.
- Rerolls are kept as counts of what they replaced, for `10 most rerolled`, and a finished run keeps them for the whole run, not per objective. The reroll after `Felled?` isn't counted: the player didn't turn that boss down.
- The app asks the browser to keep its storage (`navigator.storage.persist()`), so a phone short of space clears it last. Safari deletes a site's storage after seven days of Safari use without a visit; an app added to the Home Screen counts only its own days of use, so playing keeps it.
- No personal data and no cookies. Runs never leave the device; the only thing sent anywhere is anonymous run stats (#Analytics), with nothing that identifies a player.

## Installing

The app installs from the browser's `Add to Home Screen` and then opens full screen, under a translucent status bar, and works offline. iPhone has no install prompt and keeps a home-screen app's storage apart from Safari's, so `How it works` explains `Add to Home Screen` before the first run.

- `public/manifest.webmanifest` and the tags in `index.html` make it installable. The icons in `public/icons/` and `public/favicon.ico` are drawn by `scripts/appIcons.ts` (`pnpm app-icons`) from the wordmark's lozenge, our own glyph, and committed.
- The app icon is the wordmark's lozenge, flat in `--grace` on `--mist`, with no glow or gradient: at icon size both blur the gap inside the lozenge. Gold on a dark tile keeps the wordmark's own figure, gold lines lit; a gold tile inverts it, so it reads thinner and paler.
- The tab's favicon is the one inverted mark, dark on a rounded gold tile with clear corners, because Safari sets a white plate behind a tab icon too dark for its dark tab bar. Browsers that read SVG favicons take `favicon.svg`; Safari and anything asking for `/favicon.ico` get the `.ico`.
- The build writes `sw.js` with the files the app needs: its own chunks, styles and assets, `db.json` among them, and the Latin and Latin Extended fonts its text uses. The UI kit and the simulation are never kept: the player doesn't need them, and their requests go to the network untouched.
- Kept files are served from the phone first. Most names carry content hashes, so a kept copy is never stale; the worker's version also hashes the manifest and the icons, whose names never change, so a new one of those updates it too. A page load goes to the network first, so a new release reaches the player the next time they open the app online, and falls back to the kept page offline. A new release keeps its files under a new name and drops the old ones.
- Kept files are looked up ignoring `Vary`: a page asks for its scripts with an `Origin` header the kept copies lack, and a host that varies on it would miss every one offline.
- The worker registers only in a production build, so development always serves fresh files. `pnpm build && pnpm preview` serves one to test offline: load it once, stop the server, reload.

## Analytics

Anonymous run stats in PostHog, to tune the odds and the app from real runs. The privacy line in #How it works and the last rule of #Saving must stay true: nothing identifies a player, and PostHog stores nothing on the device. Until it is built, this section is its spec and the checklist at its end tracks the build.

- **Cookieless.** PostHog's cookieless mode `always` on its US cloud, with person profiles off, so no consent prompt is needed. The project must have cookieless tracking on (Settings → Project → Web analytics), or PostHog drops every event.
- **What cookieless mode costs.** PostHog strips the IP address before anything else, so events carry no country, and its visitor id changes daily, so it can't tell a returning player. The time zone stands in for country; visitors and countries come from Cloudflare's Web Analytics, a separate cookieless counter Cloudflare adds to the page.
- **The run, not the player.** Every run event carries the run's stored `runId`, so one run can be followed from start to finish; nothing links two runs or two days to a player. The device's run history, finished runs kept and days since the earliest, is worked out from the saved runs.
- **As little as the questions need.** At most one event per objective, so quota lasts and there is less to read: no event per roll or reroll, no autocapture, session recording, surveys, feature flags or page-leave. An item's reroll rate is judged against rolls per run or the simulation's exposure, not against logged rolls.
- **Only from the live site.** Events are sent only from `eldenroll.com`: development and local builds never send. PostHog loads after the app shows; events made offline may be lost when the app closes.
- **Past ad blockers.** Events go to `eldenroll.com/ingest`, which the site's Worker forwards to PostHog, so blockers that refuse PostHog's own address don't drop them.

### Events

| Event | Sent at | Carries |
|---|---|---|
| App opened | each load, as PostHog's page view | installed or in the browser; PostHog adds device, OS, time zone, screen and referring site |
| How it works opened | its page opening | where from, Start's tagline or the menu, and whether a run is in progress: a player who never finds it may never start |
| Run started | `Start run` | level, stats, regions, classes left off, `Max stat gap`, shortlist size and whether it rolls, `Never roll` entries, bosses felled before the run, skipped bosses, finished runs on the device and days since the earliest |
| Objective done | the end of `Done`'s countdown, so an undone `Done` sends nothing | objective number, boss, class; level, stats and regions at `Done`, so leveling and the regions finished before moving on show per objective; each reroll's scope and what its target replaced, the slot the player meant to change rather than the slots after it, both talismans for `Talismans` since they roll as one draw; bosses marked felled on the way during the objective |
| Settings saved | `Save` in `Run settings` or `Bosses` during a run | objective number, the tab, and what was added or removed |
| Run finished | `Finish run`, `New run`, or every boss felled or skipped | how it ended, objectives done, the run's age in days |
| Error | an uncaught error, or a save set aside | the message |

The run events, from Run started to Run finished, carry `runId`.

### Reading the data

Questions are answered on demand through PostHog's MCP, run by run where needed. One small dashboard covers runs started, objectives done, installed share, devices and referring sites; Cloudflare's own analytics covers visitors and countries.

### Checklist

- [x] Owner: PostHog account on the US cloud, a project with cookieless tracking on, its project token to the agent
- [ ] Owner: PostHog's MCP added for the user and signed in
- [x] Owner: Cloudflare Web Analytics on for `eldenroll.com`
- [x] PostHog loaded on `eldenroll.com` only, after the app shows, cookieless and with everything but our events and errors off
- [x] `/ingest` forwarded to PostHog by the Worker
- [x] The events, each with what the table lists
- [ ] Events seen arriving in PostHog
- [ ] The dashboard
- [ ] This section trimmed to what the code can't say

## Summary

Totals, top classes, unique gear and most rerolled; their layout is in #Run view.

- Only completed objectives count; `none` and `any` never.
- No top lists by gear category: the shortlist would dominate one, and the player already knows their shortlist. Counts of unique gear say more.
- **Unique gear** counts distinct entries per category, an alias as one label. `Any staff` and `Any seal` are left out of weapons: those classes attack with spells, so the label says nothing about their weapon. `Any torch` counts, because the torch is the weapon.
- **Most rerolled** ranks everything a reroll replaced, across bosses, classes, gear and rules, by how often; ties by name. A reroll replaces what its stop names: `Full objective` the boss, `Both hands` both hands, `Talismans` both talismans. The armor counts only for `Armor only`, since every reroll redoes it and would top every run's list; the ashes never do, since no stop names them. A result that comes back the same wasn't replaced.
- Bosses aren't ranked: each completes at most once. `Bosses felled` counts those felled in objectives and on the way. Completed objectives and bosses accounted for can differ.
- Recovering a save never crashes and never loses completed objectives.
