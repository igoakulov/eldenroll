# Look and UI kit

How the app looks and moves, and the rules a change must not undo by accident. The code in this folder is the design source: `tokens.css` holds every colour, size and timing, each shared control is one component here, and every screen in `src/views/` is built only from them. What each view holds is `web/README.md#Views`; the icons are drawn by `design/icons/`.

## What we may use from the game

Elden Ring has no published brand guidelines or fan-content policy; Bandai Namco's and FromSoftware's policies cover gameplay videos and screenshots only. So:

- **The name** only to say what the tool is for (nominative use).
- **No logo, sigil, key art or the logo's big-initial lettering:** trademarks, FromSoftware's since March 2023, and copyrighted art. Our wordmark is plain even-height caps with our own lozenge glyph for the O.
- **No game fonts:** reportedly Agmena (Linotype) for menus and a customised Mantinia (Carter & Cone) for the logo, neither confirmed by FromSoftware, both commercial and licensed to them. We use Cinzel and EB Garamond (SIL Open Font License), self-hosted so they work offline and nothing calls Google.
- **No item or boss pictures:** FromSoftware's art, and the scraped set carries `FEXTRALIFE` watermarks and has gaps. Our own icons stand in (`design/icons/README.md`).
- **Colours, layout ideas and short game phrases** (`Great enemy felled`, `Level up`, *felled*) are fine: not protectable, used sparingly.
- The `Elden Rold` card carries, rather than every page: `Unofficial fan tool. Not affiliated with or endorsed by FromSoftware or Bandai Namco. ELDEN RING is a trademark of its owners.` The credit line `©Bandai Namco Entertainment Inc. / ©2026 FromSoftware, Inc.` is needed only if their art is ever shown.

## Direction

The pause menu at a Site of Grace: near-black warm ground, teal mist, thin bronze rules, serif type, warm gold light only where the eye should go. Dark only.

- **One hero per screen.** On the current run it is the boss, a large name over a framed blood-red bar, as in a boss fight.
- **One glow per screen.** The main action is a band of warm light, like the game's highlighted menu line; nothing else glows.
- **Structure only where it says something.** No cards, shadows or rounded corners; square corners and the lozenge everywhere.
- **States change items, not the layout.** Choosing a reroll scope lights the panel's chips; nothing moves or reflows. Every sheet, the reroll panel included, dims what is behind it.
- **By how often it changes.** The two frequent actions sit in the bottom bar under the thumb; stats and regions sit on `Level up`, one tap away; rare settings sit in `Run settings`. Every layout works with no images.
- **The bottom bar.** A secondary action beside the glow band takes the band's two rules, dimmed, never a box: a box's square corners clash with a phone's round ones. Two buttons of one style split the bar evenly, so their labels sit symmetrically; the glow alone marks the main one. The backdrop turns solid above the buttons and thins to a dimmed strip below them, so a screen that goes on shows it under the bar.
- **Talismans before armor on the card,** though the game's equipment screen lists armor first: the owner's choice, reasons not recorded.
- **Red means irreversible.** Only the boss bar, rule lozenges and actions that can't be undone are red.
- **The phone is the product everywhere.** Desktop shows the app inside a drawn phone (`web/README.md#Desktop`), and nothing inside the frame is desktop-only, so every screen is designed once.
- **Tabs only where one screen holds two long views or several lists edited together:** the run view and `Run settings`. The card has none: a tab bar would compete with the boss and the bottom bar, and `Level up` is already one tap away.

## Motion

The game's menus fade and nothing in them bounces; ours follow. Motion shows what the player's action changed, and spends its drama on one moment.

- **Motion answers the player.** Nothing moves on its own but a running countdown, the loading pulse and Start's tagline. The app stays open beside the console for hours, so idle motion would pull the eye and drain the battery; Start is seen at the start of a session, not during play.
- **Fades, not slides,** easing to a stop with no bounce: about 120 ms for a control's state, 200 ms for sheets and screens. Nothing reflows to animate; a change shows in place, as in #Direction.
- **One big moment: an enemy felled.** Everything else stays short and quiet.
- **Anything long is skippable.** A tap anywhere finishes a sequence; the buttons work at once.
- **Reduced motion** drops movement, scaling and draining and keeps short fades; numbers show their final value, and the tagline's variants cross-fade.
- **CSS only, no animation library,** so the offline app stays small. Durations and easings are tokens in `tokens.css`, beside the colours.

### Sequences

- **A new objective** (`Start run`, `Roll objective N`) comes in two phases: the boss, then how to fell it. First `Objective N`, the boss name fading in and settling, the red bar filling whole from the left, and the location. As the bar finishes filling, `Felled?` fades into its middle, and a beat of under half a second lets the player read the boss and take in the question before the loadout comes; a bar shown already broken by the question read oddly. Then the class with its icons and the sections top to bottom, the bottom bar last. The card's order, not the roll order: armor rolls last but sits mid-card, so roll order would make the eye jump. Only what is on screen is staged; the rest simply appears. About 1.8 s in all, the loadout starting at 1 s; since it plays every objective, often over a hundred times a run, a tap anywhere ends it. A full-objective reroll plays a quicker version; `Resume` and returning from another screen only fade.
- **A slot fades in icon first,** its name and any line under it following a beat later, wherever it appears: a new objective, a reroll, `Resume`, `Undo` or returning to the card. Rules and the class line arrive whole.
- **A reroll** fades out and back in only the slots it changed, slowly enough to follow; the rest stay still, so the eye finds what is new.
- **An enemy felled** (after `Done`, and after `Confirm and reroll` on `Felled?`): the card dims behind the veil; the red bar drains from the right with a yellow trail lagging behind, as the game's boss bar shows damage; `Great enemy felled` fades in on its dark band, its glow brightening, swelling slightly while it holds; the countdown's digit cross-fades each second inside a thin gold ring that empties clockwise over the count, so the time left reads at a glance. `Undo` returns to the card with a plain quick fade and the bar full. We echo the game's rhythm, not its art or type (#What we may use from the game).
- **The run view's counts** count up on data rows when the view opens, all rows starting and ending together in about 0.7 s, like runes ticking up after a kill; not again on switching back to `Summary`. Section headings (`8 top classes`), `Level` and the 8 stats don't count: they are read, not earned.
- **Loading** pulses the wordmark's lozenge slowly while the player waits.
- **Start's tagline** types itself out (`web/README.md#Start`).

### Controls

- **Sheets** (the menu, the reroll panel, `Felled?`, confirmations): the screen behind dims while the sheet fades in, rising a short way to show where it came from; closing is a little faster.
- **Full screens** (`Run settings`, `Bosses`, `Level up`, the run view) cross-fade, with no sideways push: `✕` returns home rather than back.
- **Tabs:** the gold underline glides to the new tab and the content cross-fades.
- **The glow band** brightens for an instant when pressed, in place of the phone's grey tap flash; the dimmed button beside it brightens its rules. On desktop, hover brightens them a little.
- **The reroll slider's** fill, glow and lit chips follow the finger with no lag; tapping a stop glides the handle there, and each chip lights quickly, so the scope visibly grows from the left.
- **The lozenge checkbox** fills and glows, like a grace being lit. **The boss cycler's** word shifts a few pixels the way it stepped. **A raised stat** on `Level up` turns blue with a short fade; numbers there never count.
- **`Show all N`** and timeline entries: the chevron turns and new rows fade in; the height jumps, since sliding height stutters on phones and drags the rows below.
- **Not animated:** search results, the stepper's numbers, scrolling (no reveal on scroll) and the desktop frame.

## UI kit

The kit page shows every token and component as the app renders them, so a change can be judged without playing a run. It is a second Vite page, `web/kit/index.html`, with its own bundle: the app never loads its code, and the installed app doesn't keep it offline. It is published with the app at `https://eldenroll.com/kit/`, marked `noindex` and linked from nothing; in development it is at `/kit/` on the dev server. Its code is in `src/kit/`, beside the entries here.

- **Live code and real data only.** The page imports the same components the views use, and data-driven text comes from `db.json`: `src/kit/samples.ts` picks the longest real labels, so the kit stresses a layout the way the longest names do, and the runs are built through the engine at fixed seeds. A component shows its data only as the app shows it, so a slot whose longest item rolls under an alias shows the alias's label.
- **Top to bottom:** the tokens, read from `tokens.css` itself in its groups and under its comments, so a new token appears without being added; the controls; the groups, with every sheet over the screen it opens from; the new objective and the enemy felled, each replayed by its own `Replay`; each view at a fixed seed. Every block has an anchor, such as `/kit/#chip`.
- **One entry per component.** `<Name>.kit.tsx` beside `<Name>.tsx` exports its blocks as `kit`: a labelled grid of the states props can reach, with this file's names where they apply (lit, grey, red, locked, `none`, `any`), beside one live instance to tap. A state only a pointer reaches, such as pressed or hover, shows on the live one and is named in the block's note. The page collects the entries itself and lists, at the top, any component here with none.
- **A sheet holds the keyboard,** so the kit draws each open sheet in a page of its own, an inert frame showing `/kit/?view=<name>`, and opens a live one only on a tap.
- **No page controls.** Reduced motion is checked through the browser's own setting.
- **The phone is the measure.** Each screen is a phone's width, narrower only when the window is, so the page has no sideways scroll on a phone.
- **Every style value comes from a scale.** Each colour, font size, line height, letter spacing, gap, padding, margin, shadow and duration in any CSS file is a token from `tokens.css`; a new value is a design choice added to its scale, never a one-off. Control styling lives only in this folder, its classes prefixed by component, so a class meant for one view can't reach a control in another. A view places a control; a look it needs is a variant here. `styleValues.test.ts` fails on a raw value; one that must stay raw, such as the drawn phone's bezel, says why in a `/* raw: … */` comment on its line.
- **Type by role, not by look.** Caps is Cinzel's capitals on headings, tabs and small buttons; small is a small-caps label or the line under a name; body is reading text, and Cinzel's capitals on the glow band, `Undo` and the class; name is what a slot or row names, and a lead line under a title; large and display are numbers and `Great enemy felled`; hero is the boss and screen titles; the countdown and the wordmarks keep their own. Pick the role, and the size follows; two sizes a pixel apart read as a mistake.
- **Screenshots catch what moved.** `pnpm screenshots` captures every view, and every sheet over its screen, at a fixed seed from the working copy and from the last commit, as a phone shows it rather than inside the desktop frame, with reduced motion and the clock stopped, and names the views that changed with how many pixels did; `--only` captures the working copy alone. Each capture is `/kit/?view=<name>`, which shows that one view and nothing else; the list is `src/kit/viewNames.ts`. A state a view reaches only by a tap, such as a search or a list shown in full, comes from an optional prop that sets its opening state and that the app never passes; a view whose state lies below the fold opens scrolled to it. Both sides read the current `data/build/db.json`, so only UI code differs. The images, and a diff for each changed view, go to `web/screenshots/`, which is git-ignored. It drives the installed Google Chrome through Playwright, so no browser is downloaded. Nothing is committed: an intended change needs no baseline to approve.
