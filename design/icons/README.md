# Icon set

The source of the SVG icons in `web/src/assets/icons/`. Each icon is drawn once as parts (shapes, strokes, inner lines) in `iconset.py` and the modules it imports; `geo.py` renders them in the line style, closing hairline gaps and snapping line ends onto outlines.

```
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python export.py ../../web/src/assets/icons
.venv/bin/python audit.py          # lints joins; --sheets renders 5x zoom sheets (needs Google Chrome)
```

Each item icon is written at three sizes, tuned for its tile: `<key>.svg` for the 96px hand tile, `<key>-40.svg` for the 40px slot tile and `<key>-22.svg` next to a class name. Interface icons have one file each, for 18–24px. Edit the generator and re-export; never hand-edit the SVGs.

## Drawing rules

Each icon is the generic shape of an item subcategory, drawn from a reference picture of a real in-game item of that class, never a trace of one item's art: the app shows no game art (`web/src/ui/README.md#What we may use from the game`). The style is a gold outline in `currentColor` with a faint fill, on a 48 grid, with round joins and caps. The glyph fills most of its tile, so icons are easy to tell apart at the slot size. A class name shows a small group of its typical loadout's icons; bosses get no icon.

- Icons are viewed zoomed in: every join must be clean. Run `audit.py --sheets` and look at the 5x sheets, not only the lint.
- Grips stay short against the blade.
- A "great" class differs from its regular class in blade width and guard, not only size; the katana has no blade line, so it differs from the great katana.
- Fullers follow the blade's curve.
- A flame is one filled shape, never nested outlines.
- Sorcery is a comet with straight streaks; incantation is one filled flame with stars around it, sized to match the comet.
- The Ash of War means weapon magic: a close-up of a sword's hilt cropped by the tile, a rhombus gem in one round bezel with its long axis along the blade, wrapped grip, a fuller on the blade, and two pairs of stars in the open space beside the blade, never over it. Without those details it stops reading as a sword.
- The colossal weapon is a great hammer with a much heftier rectangular head, about half as tall as it is wide.
- A class's icon group follows the item icons: when an item icon changes, its class groups change with it.
