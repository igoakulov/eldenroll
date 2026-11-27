# Look and UI kit

How the app looks and moves, and the rules a change must not undo by accident. The code in this folder is the design source: `tokens.css` holds every colour, size and timing, each shared control is one component here, and every screen in `src/views/` is built only from them. What each view holds is `web/README.md#Views`; the icons are drawn by `design/icons/`.

## What we may use from the game

Elden Ring has no published brand guidelines or fan-content policy; Bandai Namco's and FromSoftware's policies cover gameplay videos and screenshots only. So:

- **The name** only to say what the tool is for (nominative use).
- **No logo, sigil, key art or the logo's big-initial lettering:** trademarks, FromSoftware's since March 2023, and copyrighted art. Our wordmark is plain even-height caps with our own lozenge glyph for the O.
- **No game fonts:** reportedly Agmena (Linotype) for menus and a customised Mantinia (Carter & Cone) for the logo, neither confirmed by FromSoftware, both commercial and licensed to them. We use Cinzel and EB Garamond (SIL Open Font License), self-hosted so they work offline and nothing calls Google.
- **No item or boss pictures:** FromSoftware's art, and the scraped set carries `FEXTRALIFE` watermarks and has gaps. Our own icons stand in (`design/icons/README.md`).
- **Colours, layout ideas and short game phrases** (`Great enemy felled`, `Level up`, *felled*) are fine: not protectable, used sparingly.
- `How it works` carries the unofficial fan tool notice, worded as in `README.md`, rather than every page. The credit line `©Bandai Namco Entertainment Inc. / ©2026 FromSoftware, Inc.` is needed only if their art is ever shown.

## Direction

The pause menu at a Site of Grace: near-black warm ground, teal mist, thin bronze rules, serif type, warm gold light only where the eye should go. Dark only.

- **One hero per screen.** On the current run it is the boss, a large name over a framed blood-red bar, as in a boss fight.
- **One glow per screen.** The main action is a band of warm light, like the game's highlighted menu line; nothing else glows.
- **Structure only where it says something.** No cards, shadows or rounded corners; square corners and the lozenge everywhere.
- **States change items, not the layout.** Choosing a reroll scope lights its chips; nothing moves or reflows. Every sheet dims what is behind it.
- **By how often it changes.** The two frequent actions sit in the bottom bar under the thumb; levelling up is one tap away; rare settings sit deeper. Every layout works with no images.
- **The bottom bar.** A secondary action beside the glow band takes the band's two rules, dimmed, never a box: a box's square corners clash with a phone's round ones. Two buttons of one style split the bar evenly, so their labels sit symmetrically; the glow alone marks the main one. The backdrop turns solid above the buttons and thins to a dimmed strip below them, so a screen that goes on shows it under the bar.
- **The hands sit where they say.** Side by side, the left hand is on the left, as on the card; in a list one above the other, the right hand comes first, since it is the main weapon, rolled first and filled by the shortlist.
- **Talismans before armor on the card,** though the game's equipment screen lists armor first: the owner's choice, reasons not recorded.
- **Red means irreversible.** Only the boss bar, rule lozenges and actions that can't be undone are red.
- **The phone is the product everywhere.** Desktop shows the app inside a drawn phone (`web/README.md#Desktop`), and nothing inside the frame is desktop-only, so every screen is designed once.
- **Tabs only where one screen holds two long views or several lists edited together.** The card has none: a tab bar would compete with the boss and the bottom bar. The page is as tall as the longest tab, so switching never moves anything; where one tab can run far longer than the other, as the run view's timeline, it is only as tall as the tab shown, so the short one doesn't end in a blank scroll.

## Motion

The game's menus fade and nothing in them bounces; ours follow. Motion shows what the player's action changed, and spends its drama on one moment.

- **Motion answers the player.** Nothing moves on its own but a running countdown, the loading pulse and Start's tagline. The app stays open beside the console for hours, so idle motion would pull the eye and drain the battery; Start is seen at the start of a session, not during play.
- **Fades, not slides,** easing to a stop with no bounce: short for a control's state, a little longer for sheets and screens. Nothing reflows to animate; a change shows in place, as in #Direction.
- **One big moment: an enemy felled.** Everything else stays short and quiet.
- **Anything long is skippable.** A tap anywhere finishes a sequence; the buttons work at once. The felled screen is the exception: its entrance is short and always plays, and taps hurry the countdown instead.
- **Reduced motion** drops movement, scaling and draining and keeps short fades; numbers show their final value, and the tagline's variants cross-fade.
- **CSS only, no animation library,** so the offline app stays small. Durations and easings are tokens in `tokens.css`, beside the colours.

### Sequences

- **A new objective** comes in two phases: the boss, then how to fell it. The boss name settles in, its bar fills whole, and only then does the question to mark it felled break the bar, with a short beat to read before the loadout comes; a bar shown already broken read oddly. Then the loadout top to bottom in the card's order, not the roll order, so the eye never jumps; the bottom bar comes last. Only what is on screen is staged. It plays every objective, often over a hundred times a run, so a tap anywhere ends it; a full reroll plays a quicker version.
- **A slot fades in icon first,** its text following, on a new objective and a reroll. Returning to the card, resuming and undoing show it at once under the screen's fade: a cascade there replays what the player has already seen.
- **A reroll** fades out and back in only the slots it changed, slowly enough to follow; the rest stay still, so the eye finds what is new.
- **An enemy felled** is the one big moment. The card dims, the boss bar drains from the right with a trail lagging behind, as the game's bar shows damage, and the felled band fades in and glows. The countdown to undo hands off each second, the old digit fading out before the new one fades in, since two digits at half strength read as neither, and its ring drains like a boss bar, so the time left reads at a glance. A tap on the band or the countdown takes off one second, not all of it, and its target stops well above undo, so reaching for undo costs nothing. We echo the game's rhythm, not its art or type (#What we may use from the game).
- **The run view's numbers** count up when the view opens, level and stats included, all together, like runes ticking up after a kill; not again on switching tabs. They start once the screen's fade is over, which would hide the start, and climb at an even pace, so the climb is seen. Section headings don't count.
- **Loading** pulses the wordmark's lozenge slowly while the player waits.
- **Start's tagline** types itself out (`web/README.md#Start`).

### Controls

- **Sheets** (menus, panels and confirmations over a screen): the screen behind dims while the sheet fades in, rising a short way to show where it came from; closing is a little faster. In the Home Screen app, where players expect a native app's motion, a sheet rises whole from the bottom edge and falls back the same way, as iOS sheets do.
- **Full screens** (everything opened over home) cross-fade, with no sideways push: closing returns home rather than back. In the Home Screen app they rise from the bottom over the screen they open from and fall away on closing, as an iOS full-screen sheet does, through the browser's view transitions; levelling up after a felled boss follows the felled screen instead. Without view transitions, and with reduced motion, they fade.
- **Tabs:** the underline glides to the new tab and the content cross-fades.
- **The glow band** brightens for an instant when pressed, in place of the phone's grey tap flash; the dimmed button beside it brightens its rules. On desktop, hover brightens them a little.
- **The reroll slider** follows the finger with no lag, and its chips light one by one, so the scope visibly grows.
- **The lozenge checkbox** fills and glows, like a grace being lit. **A raised stat** while levelling up stands out with a short fade; numbers there never count.
- **Showing more** rows fades the new ones in, and the height jumps, since sliding height stutters on phones and drags the rows below.
- **Not animated:** search results, the stepper's numbers, scrolling (no reveal on scroll) and the desktop frame.

## UI kit

The kit page shows every token and component as the app renders them, so a change can be judged without playing a run. It is a second Vite page, `web/kit/index.html`, with its own bundle: the app never loads its code, and the installed app doesn't keep it offline. It is published with the app at `https://eldenroll.com/kit/`, linked publicly like the simulation page (`web/sim/README.md#The page`), which is built from these same components; in development it is at `/kit/` on the dev server. Its code is in `src/kit/`, beside the entries here.

- **Live code and real data only.** The page imports the same components the views use, and data-driven text comes from `db.json`: `src/kit/samples.ts` picks the longest real labels, so the kit stresses a layout the way the longest names do, and the runs are built through the engine at fixed seeds. A component shows its data only as the app shows it, so a slot whose longest item rolls under an alias shows the alias's label.
- **Top to bottom:** the tokens, read from `tokens.css` itself in its groups and under its comments, so a new token appears without being added; the controls; the groups, with every sheet over the screen it opens from; the new objective and the enemy felled, each replayed by its own `Replay`; each view at a fixed seed; last, the components only the simulation page uses, so what the app shows reads apart from them. Every block has an anchor, such as `/kit/#chip`.
- **One entry per component.** `<Name>.kit.tsx` beside `<Name>.tsx` exports its blocks as `kit`: a labelled grid of the states props can reach, with this file's names where they apply (lit, grey, red, locked, `none`, `any`), beside one live instance to tap. A state only a pointer reaches, such as pressed or hover, shows on the live one and is named in the block's note. The page collects the entries itself and lists, at the top, any component here with none.
- **A sheet holds the keyboard,** so the kit draws each open sheet in a page of its own, an inert frame showing `/kit/?view=<name>`, and opens a live one only on a tap.
- **No page controls.** Reduced motion is checked through the browser's own setting.
- **The phone is the measure.** Each screen is a phone's width, narrower only when the window is, so the page has no sideways scroll on a phone.
- **Every style value comes from a scale.** Each colour, font size, line height, letter spacing, gap, padding, margin, shadow and duration in any CSS file is a token from `tokens.css`; a new value is a design choice added to its scale, never a one-off. Control styling lives only in this folder, its classes prefixed by component, so a class meant for one view can't reach a control in another. A view places a control; a look it needs is a variant here. `styleValues.test.ts` fails on a raw value; one that must stay raw, such as the drawn phone's bezel, says why in a `/* raw: … */` comment on its line.
- **Type by role, not by look.** Caps is Cinzel's capitals on headings, tabs and small buttons; small is a small-caps label or the line under a name; body is reading text, and Cinzel's capitals on the glow band, `Undo` and the class; name is what a slot or row names, and a lead line under a title; large and display are numbers and `Great enemy felled`; hero is the boss and screen titles; the countdown and the wordmarks keep their own. Pick the role, and the size follows; two sizes a pixel apart read as a mistake.
- **Screenshots catch what moved.** `pnpm screenshots` captures every view, and every sheet over its screen, at a fixed seed from the working copy and from the last commit, as a phone shows it rather than inside the desktop frame, with reduced motion and the clock stopped, and names the views that changed with how many pixels did; `--only` captures the working copy alone. Each capture is `/kit/?view=<name>`, which shows that one view and nothing else; the list is `src/kit/viewNames.ts`. A state a view reaches only by a tap, such as a search or a list shown in full, comes from an optional prop that sets its opening state and that the app never passes; a view whose state lies below the fold opens scrolled to it. Both sides read the current `data/build/db.json`, so only UI code differs. The images, and a diff for each changed view, go to `web/screenshots/`, which is git-ignored. It drives the installed Google Chrome through Playwright, so no browser is downloaded. Nothing is committed: an intended change needs no baseline to approve.
