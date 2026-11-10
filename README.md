# EldenRoll

A mobile-first challenge generator for Elden Ring, for console players who can't run randomizer mods, and PC players who'd rather not install one into the game.

The player says which regions they can reach and what their stats are. EldenRoll rolls one objective: a boss to fight, a class loadout to fight it with, and two combat rules. The player gets the gear, beats the boss and taps `Done`. Felled bosses leave the pool and what has been used grows less likely, so a run is a sequence of non-repeating objectives that grows with the character.

No account, no backend, and nothing checks the game: completion is self-reported.

Unofficial fan tool. Not affiliated with or endorsed by FromSoftware or Bandai Namco. ELDEN RING is a trademark of its owners.

## Layout

| Folder | Holds |
|---|---|
| `data/` | the database: sources, overrides, the reasons behind its balance, and the built `db.json` |
| `pipeline/` | the Python build that makes `db.json` |
| `web/` | the app; `web/src/engine/` holds the rules of a run |
| `design/` | the icon generator |

## Getting started

```
python3 -m venv .venv && ./.venv/bin/pip install -e "pipeline[dev]"
cd pipeline && ../.venv/bin/python -m eldenroll.build.database
cd ../web && pnpm install && pnpm dev
```

## Roadmap

Not in the first version, but planned or possible:

- shareable finished runs, run export and import, several runs at once;
- a `Never roll this` action beside the boss and each slot;
- server storage and optional accounts, with history across runs;
- an equip-load model for `Heavy rolling` and `Overloaded`;
- item pictures, including DLC ones;
- spell schools, more combat rules and more synergies.
