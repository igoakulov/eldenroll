"""Geometric lint for line-style icons: where strokes fail to meet, overshoot, or leave artifacts.

Works on the same occlusion model as render_line, at the 96px tile size (fine details on).
Units are viewBox units (48 per icon side). At the 96px tile 1 unit is about 1.9px.
"""
import json
import pathlib
import subprocess
import sys

from shapely.geometry import Point
from shapely.ops import linemerge, nearest_points, unary_union

import iconset as rev
from geo import SIZES, _lines, _polys, _wire_w, prepare, render_line

HERE = pathlib.Path(__file__).parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def visible(icon, size='lg'):
    z = SIZES[size]
    parts, covers = prepare(icon, z)
    out = dict(outlines=[], details=[], wires=[], fills=[], shapes=[])
    for i, (p, cov) in enumerate(zip(parts, covers)):
        g = p['g']
        if p['k'] == 'shape':
            out['shapes'].append((i, g))
            vis = g if cov is None else g.difference(cov)
            out['fills'].append((i, vis))
            if p['outline']:
                b = g.boundary
                out['outlines'].append((i, b if cov is None else b.difference(cov)))
        elif p['k'] == 'detail' and not p.get('free'):
            out['details'].append((i, g if cov is None else g.difference(cov)))
        elif p['k'] == 'wire':
            out['wires'].append((i, g if cov is None else g.difference(cov), _wire_w(p, z)))
    return out


def ends(g):
    pts = []
    for ln in _lines(g):
        cs = list(ln.coords)
        if len(cs) > 1 and cs[0] != cs[-1]:
            pts += [Point(cs[0]), Point(cs[-1])]
    return pts


def lint(icon):
    v = visible(icon)
    issues = []
    silhouette = unary_union([g for _, g in v['shapes']])
    outline_all = unary_union([g for _, g in v['outlines']])

    def add(kind, pt, note):
        issues.append(dict(kind=kind, x=round(pt.x, 2), y=round(pt.y, 2), note=note))

    # A. detail lines running outside the silhouette
    for i, d in v['details']:
        out = d.difference(silhouette.buffer(.05))
        for seg in _lines(out):
            if seg.length > .15:
                add('detail-outside', seg.interpolate(.5, normalized=True), f'{seg.length:.2f} units of detail line outside the shape')

    # B. detail and wire ends that stop just short of, or just past, an outline
    for kind, group in (('detail', v['details']), ('wire', [(i, g) for i, g, w in v['wires']])):
        for i, d in group:
            for e in ends(d):
                dist = e.distance(outline_all)
                if .12 < dist < 1.0:
                    inside = silhouette.contains(e)
                    add(f'{kind}-end-miss', e, f'{kind} ends {dist:.2f} units {"short of" if inside else "past"} the nearest outline')

    # C. shapes that almost touch: a hairline gap between two outlines
    shapes = v['shapes']
    for a in range(len(shapes)):
        for b in range(a + 1, len(shapes)):
            ga, gb = shapes[a][1], shapes[b][1]
            dist = ga.distance(gb)
            if .03 < dist < .7:
                pa, pb = nearest_points(ga, gb)
                add('shape-gap', Point((pa.x + pb.x) / 2, (pa.y + pb.y) / 2), f'two parts {dist:.2f} units apart: outlines crowd instead of meeting')

    # D. tiny outline fragments left by occlusion
    u = unary_union([g for _, g in v['outlines']]) if v['outlines'] else None
    merged = linemerge(u) if u is not None and not u.is_empty and u.geom_type != 'LineString' else u
    for seg in _lines(merged):
        if .05 < seg.length < .6:
            add('outline-fragment', seg.interpolate(.5, normalized=True), f'outline fragment {seg.length:.2f} units long')

    # E. outline ends hanging in mid-air
    for seg in _lines(merged):
        cs = list(seg.coords)
        if cs[0] == cs[-1] or seg.length < .05:
            continue
        for e in (Point(cs[0]), Point(cs[-1])):
            others = outline_all.difference(seg.buffer(.05))
            dist = e.distance(others) if not others.is_empty else 99
            for _, wg, ww in v['wires']:
                if not wg.is_empty:
                    dist = min(dist, e.distance(wg) - ww / 2)
            if dist > .2:
                add('outline-loose-end', e, f'outline stops {dist:.2f} units from any other line')

    # F. slivers of fill
    for i, f in v['fills']:
        for p in _polys(f):
            if .01 < p.area < .25:
                add('fill-sliver', p.representative_point(), f'fill sliver of {p.area:.2f} square units')
    return issues


def sheet(name, items, annotate):
    cells = []
    for key, label, fn, issues in items:
        svg = render_line(fn(), 'lg', 460)
        marks = ''
        if annotate:
            for k, it in enumerate(issues, 1):
                marks += (f'<circle cx="{it["x"]}" cy="{it["y"]}" r="1.4" fill="none" stroke="#ff3b30" stroke-width=".25"></circle>'
                          f'<text x="{it["x"] + 1.6}" y="{it["y"] - 1.2}" font-size="1.8" fill="#ff3b30" font-family="sans-serif">{k}</text>')
            marks = f'<svg width="460" height="460" viewBox="0 0 48 48" style="position:absolute;inset:0">{marks}</svg>'
        cells.append(f'<div style="position:relative;width:460px;height:460px;border:1px solid #3B372E;'
                     f'background:#15130F;color:#A9A07F">{svg}{marks}'
                     f'<div style="position:absolute;left:8px;top:6px;font:14px sans-serif;color:#E9E4D4">{label}</div></div>')
    html = ('<html><body style="margin:0;background:#0A0A0A;display:grid;grid-template-columns:repeat(3,462px);gap:6px;padding:6px">'
            + ''.join(cells) + '</body></html>')
    p = HERE / 'audit' / f'{name}.html'
    p.write_text(html)
    rows = (len(cells) + 2) // 3
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--virtual-time-budget=3000',
                    f'--window-size={3 * 468 + 6},{rows * 468 + 8}', f'--screenshot={p.with_suffix(".png")}', f'file://{p}'],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return p.with_suffix('.png')


if __name__ == '__main__':
    (HERE / 'audit').mkdir(exist_ok=True)
    annotate = '--marks' in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    report = {}
    items = []
    for key, label, fn in rev.ALL:
        if only and key not in only:
            continue
        issues = lint(fn())
        report[key] = issues
        items.append((key, label, fn, issues))
    (HERE / 'audit' / 'lint.json').write_text(json.dumps(report, indent=1))
    total = sum(len(v) for v in report.values())
    by_kind = {}
    for v in report.values():
        for it in v:
            by_kind[it['kind']] = by_kind.get(it['kind'], 0) + 1
    print(total, 'issues', by_kind)
    for k, v in report.items():
        if v:
            print(f'{k}: ' + '; '.join(f'{i+1} {it["kind"]} @({it["x"]},{it["y"]}) {it["note"]}' for i, it in enumerate(v)))
    if '--sheets' in sys.argv:
        for n in range(0, len(items), 9):
            print(sheet(f'{"marked" if annotate else "zoom"}_{n // 9 + 1}', items[n:n + 9], annotate))
