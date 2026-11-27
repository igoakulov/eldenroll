# Web app

The Elden Roll app: React, Vite and TypeScript, mobile first, with no backend. The rules live in `src/engine/README.md`; this file covers the views, saving and the finished-run summary. The look lives in `src/ui/` (`src/ui/README.md`), the design tokens and shared controls, and every screen in `src/views/` is built only from them. Every word the UI shows is in `src/copy.ts`, grouped by screen, and `src/copyInComponents.test.ts` fails on text written straight into a component; game data's names come from the database.

Scripts are in `package.json`. The app and the engine tests read `../data/build/db.json`, which is git-ignored, so build the database first (`pipeline/README.md`); without it they stop and say so. Vitest hides `console.log` unless run with `--reporter=verbose`. There is no Prettier config: `npx prettier --write` would reformat every file, so format by hand.

## Views

Player-facing text says *felled* where the game does; code and stored data say `dead`. *Felled on the way* is a boss felled outside an objective: before the run, between objectives, or marked from the card.

There are no item pictures: each slot shows our own icon for its subcategory, so pictures could replace them later without a redesign.

### Navigation

Home is the current objective's card during a run, and Start otherwise. Every other screen opens over home and closes back to it, so there is no back stack to follow; only a finished run opened from the list of runs returns to that list.

Keys follow a desktop's habits, though the app is played on a phone: `Enter` presses the main button of whatever is on top, `Esc` closes it, and a sheet keeps focus inside itself until it closes. Nothing that loses progress takes `Enter`, and the felled screen doesn't focus `Undo`, so a repeated `Enter` can't undo a `Done`. There are no other shortcuts and no key hints.

A run's loop: set up stats, regions and settings, and start. Each objective shows a boss and a build to fell it with; the player rerolls any part until it suits, gathers the gear, fights, and marks it done, with a few seconds to undo. Between objectives they level up and add regions, and the next objective rolls. A boss felled outside the run is marked from the card, and the objective rerolls. The run ends when every boss is felled or skipped, or when the player finishes it, and its summary stays among the finished runs. Reopening the app lands on Start, which resumes the run in progress and opens past runs, so looking back never means resuming first.

### Start

- The tagline types itself out in a loop while the player sets up, every variant leading to How it works; nothing below it moves while it types.
- Past runs are reachable without scrolling, since Start is where a returning player lands. During a run its setup belongs to the run, so Start hides it until a new run.

### How it works

The onboarding page, reached from Start's tagline and from the menu. It opens under the wordmark, so the help reads as the app's own.

- The install steps show Safari's own buttons, never screenshots, which date with every iOS release.
- Its links open in a new tab, since the installed app has no back button to return from a page.
- The privacy notice must stay true to the last rule of #Saving.
- The data sources are credited in the repository (`data/sources/README.md`), not on the page.

### Run settings

Reachable from Start and the menu; a change applies on the next roll. It reopens where it was left, so a list edited often stays close.

- Never roll lists real item names, never alias labels, because the player picks from their inventory; excluding one alias member leaves the others rolling. Armor is listed as whole sets, since a set is what rolls, and a piece's name finds every set that holds it.
- The weapon shortlist is never narrowed by class, since classes can change at any time. Rolling from it is on from the start: an empty list changes nothing, and a player who builds one wants it rolled.
- An edited entry keeps its place until saved, so nothing jumps under the finger.

### Bosses

Marks bosses felled before or outside the run, or skipped for good; marking changes nothing until the next roll. A boss felled in an objective can't change, and neither can the current objective's boss, which only the card marks. Bosses still alive show only in search, since they are most of the list.

### Current run

- The menu names each row by what it opens, never by the objective, which the top bar already names. The app's rows sit apart from the run's, which sit nearer the thumb.
- Item tiles, ashes, armor sets and the boss name open their wiki page where one exists; an alias opens its group's page. The card shows no item locations: the wiki covers them better, and the data's placements are sometimes adjusted for balance.
- An empty slot reads `none`, apart from `any`, the player's own pick, and from a rule to obey.
- A reroll redoes its target and everything rolled after it, and its control shows that whole scope lit. Marking the boss felled from the card uses the same control at full scope.
- After `Done`, undo restores the run exactly until the countdown ends. The next objective rolls only after Level up, so what changes there counts for it; while the chosen regions hold no living boss, the run waits there.
- The reroll count is kept for the summary but not shown on the card.

### Confirmations

Anything that loses something asks first, on one shared sheet whose chips say what happens. A run with no objective done isn't saved (#All runs), so until one is, finishing it is worded as discarding it.

### Run view

One read-only view for the run in progress and a finished one. Its title is a boss, as the card's is, so opening the summary from the card moves nothing; a finished run's is the last boss it felled, never an objective number nothing there opens. Summary and timeline are separate tabs, so the timeline isn't buried under the summary.

- **Summary:** level and stats, then totals, top classes, unique gear and most rerolled (#Summary). A listed name opens the timeline entries that held it.
- **Timeline:** oldest first and in full, since its tab holds nothing else. Bosses felled on the way show just before the objective they were marked under. No reroll counts: per objective they say nothing. Search picks one thing from this run and shows only the entries that held it. The unfinished objective is never shown as done.

### All runs

The run in progress first, since playing on is what the player came for; then the finished runs, newest first, each named by its objective count before its last boss: the count says most about a run, and a long boss name only tells apart runs of a similar size. A run with no objective done isn't saved, so trying the app leaves no clutter; past the cap the oldest goes silently (#Saving). One run is active at a time, and nothing from a finished run reaches the engine.

### Desktop

Most players keep this open on a phone beside a console, so desktop gets no layout of its own: the app runs inside a drawn phone, centred on the page, and every screen inside it is the phone's, unchanged. A phone-sized window, a landscape phone included, gets no frame.

- The phone scales as a whole to the window's height, so its content keeps a phone's proportions. Below a minimum scale the page scrolls instead, so browser zoom still enlarges the text.
- The phone is the only thing on the page to scroll, so the mouse wheel scrolls it from anywhere, unless the page itself is scrolling.
- Scrolling, sheets and anything positioned stay inside the phone's screen, so components size themselves to their container, never to the window: no `100vh`, no `position: fixed`.
- Hover states sit under `@media (hover: hover)`, so phones ignore them.

## Saving

`localStorage`, one active run per browser, behind a save layer a server can replace once accounts exist. Not before: without an account, a server copy could be found only through an id kept in the same browser storage, and would be lost with it.

- The active run is saved on every change, with a random `runId` and the time of each save, so runs kept on several devices can later merge into one account: the same run uploaded twice stays one run, and the newer copy wins.
- `Done` saves at once, so a reload during its countdown keeps the objective done and `Undo` is gone. With the app open in two tabs, a save in one moves the other to Start with the saved run, so an old tab can't save over newer progress.
- Start's setup, its stats, regions and `Run settings`, is saved as it is edited, so a reload before `Start run` keeps it; `Start run` hands it to the run and removes it. It matters most for the weapon shortlist, which takes looking up in the game's inventory.
- Catch-up's tally is kept only while it can steer a roll: the run's total while the run is active, and each slot's share only until `Done` adds it to the total. Kept on every objective, it would fill the browser's storage before a long run ended.
- A finished run keeps only what its view shows, and the summary is worked out when the view opens.
- Owned gear isn't stored: it is what the completed objectives show (`src/engine/README.md#Eligibility`).
- Names, images and links come from the current database by id, so an old run shows today's names. An id gone from the data shows a name rebuilt from the id, `margit_the_fell_omen_stormveil_castle` as `Margit The Fell Omen Stormveil Castle`, the icon and no link. Storing names would cover only that rare case.
- Finished runs are capped so storage never fills: past the cap, the oldest goes, silently. Few players will reach it, so the app never mentions it. The cap sits under Safari's 5 MB per site, read as two bytes a character, with a margin.
- Loading checks a run against the current data and never crashes. Regions, classes, shortlisted weapons, never-roll entries and felled or skipped bosses gone from the data are dropped; with no class left, every class is on. If one of the current objective's ids is gone, it rerolls from that step on in roll order, as the reroll slider would, keeping the boss, the class and every slot before it: the player may have spent effort fetching that gear. This reroll isn't counted as theirs. A save in an unknown shape keeps what it can read, and an objective it can't read rolls anew. One that holds nothing usable, unreadable or with no run in it, is set aside under a key of its own and Start opens fresh: only the app writes saves, so it means a bug, and a reset prompt would give the player nothing to choose.
- `deadBosses` entries carry `instanceId` and the `objectiveIndex` showing when the boss was marked, `0` before objective 1, in marking order. The timeline draws a boss felled on the way from this index. It stays on the boss rather than becoming an event of its own, so such bosses could later fold into their objective as other kills.
- The app asks the browser to keep its storage (`navigator.storage.persist()`), so a phone short of space clears it last. Safari deletes a site's storage after seven days of Safari use without a visit; an app added to the Home Screen counts only its own days of use, so playing keeps it.
- No personal data and no cookies. Runs never leave the device; the only thing sent anywhere is anonymous run stats (#Analytics), with nothing that identifies a player.

## Installing

The app installs from the browser's `Add to Home Screen` and then opens full screen, under a translucent status bar, and works offline. iPhone has no install prompt and keeps a home-screen app's storage apart from Safari's, so `How it works` explains `Add to Home Screen` before the first run.

- In the Home Screen app a pulled page doesn't stretch: the app has no pull-to-refresh there, and a stretched page took the bottom bar off the screen. Safari keeps its own pull-to-refresh.
- `public/manifest.webmanifest` and the tags in `index.html` make it installable. The icons in `public/icons/` and `public/favicon.ico` are drawn by `scripts/appIcons.ts` (`pnpm app-icons`) from the wordmark's lozenge, our own glyph, and committed.
- The tab's favicon is dark on a gold tile: Safari sets a white plate behind a tab icon too dark for its dark tab bar.
- The build writes `sw.js` with the files the app needs: its own chunks, styles and assets, `db.json` among them, and the Latin and Latin Extended fonts its text uses. The UI kit and the simulation are never kept: the player doesn't need them, and their requests go to the network untouched.
- Kept files are served from the phone first. Most names carry content hashes, so a kept copy is never stale; the worker's version also hashes the manifest and the icons, whose names never change, so a new one of those updates it too. A page load goes to the network first, so a new release reaches the player the next time they open the app online, and falls back to the kept page offline. A new release keeps its files under a new name and drops the old ones.
- Kept files are looked up ignoring `Vary`: a page asks for its scripts with an `Origin` header the kept copies lack, and a host that varies on it would miss every one offline.
- The worker registers only in a production build, so development always serves fresh files. `pnpm build && pnpm preview` serves one to test offline: load it once, stop the server, reload.

## Search

The app's page carries a search title, a description and a link preview, set into its head at build from `copy.site` (`vite.config.ts`), so search results and shared links say what it is before any script runs. They name the game and call the app a randomizer, the word players search for, and the description names console players first: PC players have randomizer mods, so consoles are what a search for one adds. Installed, the app keeps its own name. `public/sitemap.xml` lists only the app: the UI kit and the simulation are public but are tools, not a page to land on from a search.

## Analytics

Anonymous run stats in PostHog, to tune the odds and the app from real runs. The privacy line in #How it works and the last rule of #Saving must stay true: nothing identifies a player, and PostHog stores nothing on the device.

- **Cookieless.** PostHog's cookieless mode `always` on its US cloud, with person profiles off, so no consent prompt is needed. The project must have cookieless tracking on (Settings → Project → Web analytics), or PostHog drops every event.
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

## Summary

Totals, top classes, unique gear and most rerolled; their layout is in #Run view.

- Only completed objectives count; `none` and `any` never.
- No top lists by gear category: the shortlist would dominate one, and the player already knows their shortlist. Counts of unique gear say more.
- **Unique gear** counts distinct entries per category, an alias as one label. `Any staff` and `Any seal` are left out of weapons: those classes attack with spells, so the label says nothing about their weapon. `Any torch` counts, because the torch is the weapon.
- **Most rerolled** ranks everything a reroll replaced, across bosses, classes, gear and rules, by how often; ties by name. A reroll replaces what its stop names: `Full objective` the boss, `Both hands` both hands, `Talismans` both talismans. The armor counts only for `Armor only`, since every reroll redoes it and would top every run's list; the ashes never do, since no stop names them. A result that comes back the same wasn't replaced.
- Bosses aren't ranked: each completes at most once. `Bosses felled` counts those felled in objectives and on the way.
