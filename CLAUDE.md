# Elden Roll — agent notes

How to work in this repo. Facts about the project live in the READMEs beside what they describe; start at `README.md`.

## Checks

Run both before and after a change, and expect them clean with no skips:

- `cd pipeline && ../.venv/bin/ruff check . && ../.venv/bin/pyright && ../.venv/bin/python -m pytest`
- `cd web && pnpm typecheck && pnpm test`

`data/build/` is git-ignored: build `db.json` before any web check (`pipeline/README.md`).

After a change that shows on screen, before committing: `cd web && pnpm screenshots`, and open every view it names (`web/src/ui/README.md#UI kit`). It compares the working copy with the last commit, so a committed change shows nothing. A view you meant to change is expected; any other is a bug. It catches the slight drift of colour, spacing and size that the eye misses.

## Docs

- A fact goes once, where it belongs: in the README beside the code or data it describes, written for a public reader, stating facts.
- Don't write down what code or data files say plainly: values, lists, counts, defaults, signatures, file contents, the `reason` of one CSV row. They drift. Write the reasons, the rules that span many rows, and the traps you need to find your way around the files. When a feature is built, trim its README spec to what the code can't say.
- Reference a section as `path#Heading`, with the heading text exactly as written and no `#` marks; a bare `#Heading` means the same file, and `#A`, `#B` after a path stay in that file. To read one: `grep -n '^#\+ Heading' path`, then read to the next heading of that level. Keep headings unique within a file and free of backticks. Reference a whole file only when it is short or all of it applies. Code comments cite sections the same way.
- Balance has three levers and no others (`data/balance.md#Levers`): never put a weight, multiplier or curve in engine code outside `web/src/engine/hyperparams.ts`.
- Any change to odds or `data/overrides/modifiers.csv` lands with its reason in `data/balance.md` in the same commit, labelled as baseline catch-up, preference or synergy (`data/balance.md#Levers`); `pipeline/tests/test_balance.py` fails otherwise. A new item-to-item exception goes there first, by priority. Never state a reason nobody gave: write "not recorded".
- An agreed change lands in the docs in the same session, even if the build waits.
- Docs state the current design and the reasons that shape it, never its history: no variants tried and dropped, no small styling choices.
- Comments in code are for what the code can't say: no docstrings that restate a name, record history or repeat counts.

## Naming

- A rename reaches everything in one pass: UI text (`web/src/copy.ts`), docs, code identifiers and tests. Grep every spelling of the old name.
- The app is "Elden Roll", two words, wherever text names it; the wordmark draws it as one, and the repository, domain, package and storage keys stay `eldenroll`.
- "Class" alone means the character class; code says `character_class` and `CharacterClass`. A weapon's class is `weapon_class` in code and `subcategory` as a field. "Build" means only the pipeline step (`eldenroll.build`, `data/build/`), never a character. The game's own classes are "starting classes".
- UI text uses the game's word where one exists: a boss is *felled*. Code and stored data keep `dead`.

## Data and tests

- Look up only data we lack. No wiki is authoritative, so a disagreement with an existing record is reported, not a reason to re-verify everything.
- Tests are few and judged on the outcome for the player. The full-run simulation is the main balance tool.
- Never write a test value from memory: the JSON sources can be wrong while looking normal.
- A test never restates a count, odds or modifier value, or override row from the data: it breaks on every tuning and proves nothing. The golden fixtures are the one exception, by design: after a deliberate data change, re-save them (`web/src/engine/README.md#Golden fixtures`). The build's gate holds the expected counts (`pipeline/eldenroll/validate/quality.py`), `data/balance.md` the reasons; a web test that needs a tuned value reads it from `db.json`. A few real-data cases per mechanism are enough, since the build stops on any override row that matches nothing.

## Traps

- zsh aborts a whole command when a glob matches nothing. Quote globs.
- The shell's directory can change between commands; use absolute paths or `cd` in the same command.
- Deleting a Markdown table row by script can merge two rows; search for `||` afterwards.
- Felling Maliketh before every Royal Capital boss leaves those bosses unreachable; the run then finishes without them.
- `Great Épée`, `Miséricorde`, `Kalé` and `Varré's Bouquet` carry accents. Slugs keep every letter: `Thops's Barrier` is `thopss_barrier`.
- Fandom refuses WebFetch with HTTP 402; read it in a browser.
- Some files keep CRLF line endings, such as `combat_rules.csv` and `item_odds.csv` (`git ls-files --eol | grep crlf`). A script that rewrites one must keep them, or the whole file shows as changed.
