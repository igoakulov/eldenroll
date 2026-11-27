# Elden Roll

**[eldenroll.com](https://eldenroll.com)**

A companion app for Elden Ring, kept on your phone beside the game. It picks bosses to beat, builds to try and gear to collect, for console players who can't run randomizer mods and PC players who'd rather not install one into the game. A run can start in a new playthrough or one already under way.

Unofficial fan tool. Not affiliated with or endorsed by FromSoftware or Bandai Namco. ELDEN RING is a trademark of its owners.

The code is under the MIT licence (`LICENSE`). The game's names and data belong to FromSoftware and Bandai Namco; `data/sources/README.md` credits where the data comes from.

## How it works

A run is a chain of objectives. Each objective is a boss and a build to beat it with: a class, its gear (weapons, spells, talismans and armor) and a combat rule, or none.

1. Set your stats and the regions you can reach, and start a run.
2. Get the gear, beat the boss and mark it done.
3. Level up as in the game, and add regions as you reach them to unlock more bosses and gear.
4. Beat every boss to finish the run.

Defeated bosses leave the pool, and each item gets a fair share over the run, so objectives don't repeat and grow with the character. Gear that works together rolls together more often. Any part of an objective can be rerolled, and a boss defeated earlier can be marked so its gear unlocks. Run settings shape what can roll, from classes and favourite weapons to gear never to roll and bosses to skip.

Added to the Home Screen, it opens full screen and works offline. Runs stay on the device, with no account and no server; only anonymous usage stats may be sent. Nothing checks the game, so completion is self-reported.

The simulation that tunes the odds and the UI kit are public too: [eldenroll.com/sim/](https://eldenroll.com/sim/) and [eldenroll.com/kit/](https://eldenroll.com/kit/).

## Layout

| Folder | Holds |
|---|---|
| `data/` | the database: sources, overrides, the reasons behind its balance, and the built `db.json` |
| `pipeline/` | the Python build that makes `db.json` |
| `web/` | the app; `web/src/engine/` holds the rules of a run, `web/sim/` plays whole runs to tune the odds |
| `design/` | the icon generator |

## Getting started

```
python3 -m venv .venv && ./.venv/bin/pip install -e "pipeline[dev]"
cd pipeline && ../.venv/bin/python -m eldenroll.build.database
cd ../web && pnpm install && pnpm dev
```

## Releasing

Every push to `main` is a release. `.github/workflows/deploy.yml` checks and deploys it; a failed check deploys nothing, and the site stays as it was.

- The site is a Cloudflare Worker serving `web/dist` (`web/wrangler.jsonc`); its only code, `web/worker/ingest.ts`, forwards `/ingest` to PostHog (`web/README.md#Analytics`). The config attaches `eldenroll.com` and `www.eldenroll.com`, and the first deploy creates their DNS records; a record already on either name makes it fail.
- `www` is sent to the apex by a redirect rule set in the Cloudflare dashboard, not in the repository.
- The workflow deploys with two repository secrets: `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN`, a token made from Cloudflare's "Edit Cloudflare Workers" template and limited to this account and zone.
