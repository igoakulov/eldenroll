# Icon set

The source of the SVG icons in `web/src/assets/icons/`. Each icon is drawn once as parts (shapes, strokes, inner lines) in `iconset.py` and the modules it imports; `geo.py` renders them in the line style, closing hairline gaps and snapping line ends onto outlines.

```
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python export.py ../../web/src/assets/icons
.venv/bin/python audit.py          # lints joins; --sheets renders 5x zoom sheets (needs Google Chrome)
```

Each item icon is written at three sizes, tuned for its tile: `<key>.svg` for the 96px hand tile, `<key>-40.svg` for the 40px slot tile and `<key>-22.svg` next to a class name. Interface icons have one file each, for 18–24px.
