"""Writes the icon set as standalone SVG files, one per icon and tile size."""
import pathlib
import re
import sys

import iconset
from geo import render_line

SIZES = {'lg': '', 'sm': '-40', 'xs': '-22'}
UI = {k for k, *_ in iconset.UI}


def standalone(svg):
    svg = re.sub(r' width="\d+" height="\d+"', '', svg, count=1)
    return svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ', 1) + '\n'


def main(out):
    out = pathlib.Path(out)
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('*.svg'):
        old.unlink()
    for key, label, fn, alt, changed in iconset.ALL:
        if key in UI:
            (out / f'{key}.svg').write_text(standalone(render_line(fn(), 'xs')))
            continue
        for size, suffix in SIZES.items():
            (out / f'{key}{suffix}.svg').write_text(standalone(render_line(fn(), size)))
    print(len(list(out.glob('*.svg'))), 'files in', out)


if __name__ == '__main__':
    main(sys.argv[1])
