"""Icon geometry: parts are authored once, rendered as line+fill or solid."""
import math
import re

from shapely import affinity
from shapely.geometry import (GeometryCollection, LineString, MultiLineString,
                              MultiPolygon, Point, Polygon)
from shapely.ops import unary_union

# ---------------------------------------------------------------- path parsing

_TOK = re.compile(r'[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')


def _cubic(p0, p1, p2, p3, n):
    out = []
    for k in range(1, n + 1):
        t = k / n
        mt = 1 - t
        out.append((mt**3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t**3 * p3[0],
                    mt**3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t**3 * p3[1]))
    return out


def _arc(p0, rx, ry, phi, fa, fs, p1, n):
    if rx == 0 or ry == 0:
        return [p1]
    phi = math.radians(phi)
    cp, sp = math.cos(phi), math.sin(phi)
    dx, dy = (p0[0] - p1[0]) / 2, (p0[1] - p1[1]) / 2
    x1 = cp * dx + sp * dy
    y1 = -sp * dx + cp * dy
    rx, ry = abs(rx), abs(ry)
    lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry)
    if lam > 1:
        rx *= math.sqrt(lam)
        ry *= math.sqrt(lam)
    num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    den = rx * rx * y1 * y1 + ry * ry * x1 * x1
    co = math.sqrt(max(0, num / den)) * (-1 if fa == fs else 1)
    cx1 = co * rx * y1 / ry
    cy1 = -co * ry * x1 / rx
    cx = cp * cx1 - sp * cy1 + (p0[0] + p1[0]) / 2
    cy = sp * cx1 + cp * cy1 + (p0[1] + p1[1]) / 2

    def ang(ux, uy, vx, vy):
        a = math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
        return a
    t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
    dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
    if not fs and dt > 0:
        dt -= 2 * math.pi
    elif fs and dt < 0:
        dt += 2 * math.pi
    steps = max(4, int(abs(dt) / (math.pi / 2) * n))
    out = []
    for k in range(1, steps + 1):
        t = t1 + dt * k / steps
        x, y = rx * math.cos(t), ry * math.sin(t)
        out.append((cp * x - sp * y + cx, sp * x + cp * y + cy))
    return out


def parse(d, n=14):
    """SVG path data -> list of (points, closed)."""
    toks = _TOK.findall(d)
    i = 0
    subs = []
    pts = []
    cur = (0.0, 0.0)
    start = cur
    cmd = None
    lastc = None
    lastq = None

    def num():
        nonlocal i
        v = float(toks[i])
        i += 1
        return v

    def flush(closed):
        nonlocal pts
        if len(pts) > 1:
            subs.append((pts, closed))
        pts = []

    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t
            i += 1
            if cmd in 'Zz':
                flush(True)
                cur = start
                continue
        rel = cmd.islower()
        c = cmd.upper()
        ox, oy = cur if rel else (0.0, 0.0)
        if c == 'M':
            flush(False)
            cur = (ox + num(), oy + num())
            start = cur
            pts = [cur]
            cmd = 'l' if rel else 'L'
            lastc = lastq = None
            continue
        if c == 'L':
            cur = (ox + num(), oy + num())
            pts.append(cur)
            lastc = lastq = None
        elif c == 'H':
            cur = ((cur[0] if rel else 0) + num(), cur[1])
            pts.append(cur)
            lastc = lastq = None
        elif c == 'V':
            cur = (cur[0], (cur[1] if rel else 0) + num())
            pts.append(cur)
            lastc = lastq = None
        elif c == 'C':
            p1 = (ox + num(), oy + num())
            p2 = (ox + num(), oy + num())
            p3 = (ox + num(), oy + num())
            pts += _cubic(cur, p1, p2, p3, n)
            lastc = p2
            lastq = None
            cur = p3
        elif c == 'S':
            p1 = (2 * cur[0] - lastc[0], 2 * cur[1] - lastc[1]) if lastc else cur
            p2 = (ox + num(), oy + num())
            p3 = (ox + num(), oy + num())
            pts += _cubic(cur, p1, p2, p3, n)
            lastc = p2
            cur = p3
        elif c == 'Q':
            q = (ox + num(), oy + num())
            p3 = (ox + num(), oy + num())
            p1 = (cur[0] + 2 / 3 * (q[0] - cur[0]), cur[1] + 2 / 3 * (q[1] - cur[1]))
            p2 = (p3[0] + 2 / 3 * (q[0] - p3[0]), p3[1] + 2 / 3 * (q[1] - p3[1]))
            pts += _cubic(cur, p1, p2, p3, n)
            lastq = q
            lastc = None
            cur = p3
        elif c == 'T':
            q = (2 * cur[0] - lastq[0], 2 * cur[1] - lastq[1]) if lastq else cur
            p3 = (ox + num(), oy + num())
            p1 = (cur[0] + 2 / 3 * (q[0] - cur[0]), cur[1] + 2 / 3 * (q[1] - cur[1]))
            p2 = (p3[0] + 2 / 3 * (q[0] - p3[0]), p3[1] + 2 / 3 * (q[1] - p3[1]))
            pts += _cubic(cur, p1, p2, p3, n)
            lastq = q
            cur = p3
        elif c == 'A':
            rx, ry, phi, fa, fs = num(), num(), num(), num(), num()
            p3 = (ox + num(), oy + num())
            pts += _arc(cur, rx, ry, phi, int(fa), int(fs), p3, n // 2 + 2)
            cur = p3
            lastc = lastq = None
    flush(False)
    return subs


def _fix(g):
    if not g.is_valid:
        g = g.buffer(0)
    return g


def S(d):
    """Filled shape from path data; extra closed subpaths cut holes (even-odd)."""
    g = None
    for p, _ in parse(d):
        if len(p) < 3:
            continue
        poly = _fix(Polygon(p))
        g = poly if g is None else g.symmetric_difference(poly)
    return _fix(g)


def L(d):
    """Open line(s) from path data."""
    lines = []
    for p, closed in parse(d):
        if closed:
            p = p + [p[0]]
        lines.append(LineString(p))
    return lines[0] if len(lines) == 1 else MultiLineString(lines)


def M(d):
    """Shape symmetric about x=0. d traces the right half from the top centre down to the bottom centre."""
    subs = parse(d)
    p = subs[0][0]
    full = p + [(-x, y) for x, y in reversed(p[1:-1])]
    return _fix(Polygon(full))


def ML(d):
    """A line and its mirror about x=0."""
    a = L(d)
    return MultiLineString(list(_lines(a)) + list(_lines(affinity.scale(a, -1, 1, origin=(0, 0)))))


def C(cx, cy, r):
    return Point(cx, cy).buffer(r, quad_segs=24)


def E(cx, cy, rx, ry, rot=0):
    g = affinity.scale(Point(0, 0).buffer(1, quad_segs=24), rx, ry)
    return affinity.translate(affinity.rotate(g, rot, origin=(0, 0)), cx, cy)


def R(x, y, w, h):
    return Polygon([(x, y), (x + w, y), (x + w, y + h), (x, y + h)])


def ring(cx, cy, r, w):
    return C(cx, cy, r).difference(C(cx, cy, r - w))


def poly(*pts):
    return _fix(Polygon(pts))


def star(cx, cy, r_out, r_in, n, rot=0):
    pts = []
    for k in range(2 * n):
        a = math.radians(rot) + math.pi * k / n - math.pi / 2
        r = r_out if k % 2 == 0 else r_in
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return Polygon(pts)


def _lines(g):
    if g is None or g.is_empty:
        return []
    if isinstance(g, LineString):
        return [g]
    if isinstance(g, (MultiLineString, GeometryCollection)):
        out = []
        for x in g.geoms:
            out += _lines(x)
        return out
    return []


def _polys(g):
    if g is None or g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, (MultiPolygon, GeometryCollection)):
        out = []
        for x in g.geoms:
            out += _polys(x)
        return out
    return []


# ---------------------------------------------------------------- icon model

class Icon:
    """Ordered parts. Later parts sit on top of earlier ones.

    shape  closed area: outlined + toned in line style, filled with a knockout gap in solid
    wire   open stroke (strings, chains, lashes): stroke in line style, buffered in solid
    detail interior line: stroked in line style, cut out in solid
    pip    small dot: filled in line style, cut out in solid
    """

    def __init__(self):
        self.parts = []

    def shape(self, g, tone=None, fine=False, knock=True, outline=True, solid=True, small=False):
        self.parts.append(dict(k='shape', g=g, tone=tone, fine=fine, knock=knock, outline=outline, solid=solid, small=small))
        return self

    def wire(self, g, w='thin', fine=False, knock=True, cap='round', op=1):
        self.parts.append(dict(k='wire', g=g, w=w, fine=fine, knock=knock, cap=cap, op=op))
        return self

    def detail(self, g, fine=False, solid=True, free=False, small=False, op=1):
        self.parts.append(dict(k='detail', g=g, fine=fine, solid=solid, free=free, small=small, op=op))
        return self

    def ribbon(self, d, a='thick', b='hair'):
        self.parts.append(dict(k='ribbon', a=a, b=b, g=LineString(parse(d, 60)[0][0]), fine=False))
        return self

    def pip(self, g, fine=False):
        self.parts.append(dict(k='pip', g=g, fine=fine))
        return self

    def transform(self, fn):
        for p in self.parts:
            p['g'] = fn(p['g'])
        return self

    def bounds(self):
        gs = [p['g'] for p in self.parts if p['k'] in ('shape', 'wire', 'ribbon')]
        return unary_union(gs).bounds

    def place(self, rot=0, fit=42.0, at=(24, 24), flip=False):
        """Rotate (degrees, clockwise on screen), scale the longest side to `fit`, centre at `at`."""
        if flip:
            self.transform(lambda g: affinity.scale(g, -1, 1, origin=(0, 0)))
        if rot:
            self.transform(lambda g: affinity.rotate(g, rot, origin=(0, 0)))
        x0, y0, x1, y1 = self.bounds()
        s = fit / max(x1 - x0, y1 - y0) if fit else 1
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        self.transform(lambda g: affinity.translate(affinity.scale(g, s, s, origin=(cx, cy)), at[0] - cx, at[1] - cy))
        self.scale_factor = s
        return self


# ---------------------------------------------------------------- rendering

SIZES = {
    #        px   outline detail  hair  thin  thick  gap   cut   grow  fine
    'lg': dict(px=90, ol=.95, dl=.68, hair=.6, thin=.95, thick=1.7, gap=.75, cut=.8, grow=.3, fine=True),
    'sm': dict(px=38, ol=1.85, dl=1.3, hair=1.25, thin=1.85, thick=2.6, gap=1.45, cut=1.35, grow=.55, fine=False),
    'xs': dict(px=24, ol=2.6, dl=2.0, hair=2.0, thin=2.6, thick=3.4, gap=2.1, cut=2.0, grow=.8, fine=False),
}
TONE = .17


def _fmt(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return '0' if s == '-0' else s


def _ring_d(coords, close=True):
    c = list(coords)
    if close and len(c) > 1 and c[0] == c[-1]:
        c = c[:-1]
    out = 'M' + ' '.join(f'{_fmt(x)} {_fmt(y)}' for x, y in c[:1])
    if len(c) > 1:
        out += 'L' + ' '.join(f'{_fmt(x)} {_fmt(y)}' for x, y in c[1:])
    return out + ('Z' if close else '')


def poly_d(g):
    out = []
    for p in _polys(g):
        p = p.simplify(.03)
        if p.is_empty or p.area < .01:
            continue
        for r in [p.exterior, *p.interiors]:
            out.append(_ring_d(r.coords))
    return ''.join(out)


def line_d(g):
    from shapely.ops import linemerge
    out = []
    pieces = _lines(g)
    if len(pieces) > 1:
        try:
            pieces = _lines(linemerge(MultiLineString(pieces)))
        except Exception:
            pass
    for ln in pieces:
        ln = ln.simplify(.03)
        if ln.length < .05:
            continue
        cs = list(ln.coords)
        closed = len(cs) > 2 and cs[0] == cs[-1]
        out.append(_ring_d(cs, close=closed))
    return ''.join(out)


def _wire_w(p, z):
    w = p['w']
    if isinstance(w, tuple):
        a, b, t = w
        return z[a] + (z[b] - z[a]) * t
    return z[w] if isinstance(w, str) else w


def _active(icon, z):
    return [p for p in icon.parts if (z['fine'] or not p['fine']) and not (z['fine'] and p.get('small'))]


GAP_CLOSE = .25
SNAP = 1.0


def _close_gaps(parts):
    """A later part that stops a hair short of an earlier one is grown to meet it, so the two share one line."""
    shapes = [p for p in parts if p['k'] == 'shape' and p['outline']]
    for j, b in enumerate(shapes):
        for a in shapes[:j]:
            d = a['g'].distance(b['g'])
            if .02 < d < GAP_CLOSE:
                g = d + .06
                b['g'] = _fix(b['g'].union(b['g'].buffer(g).intersection(a['g'].buffer(g))))


def _first_hit(origin, ux, uy, reach, target):
    ray = LineString([(origin.x, origin.y), (origin.x + ux * reach, origin.y + uy * reach)])
    hit = ray.intersection(target)
    pts = [q for q in _points(hit)]
    if not pts:
        return None
    return min(pts, key=lambda q: q.distance(origin))


def _points(g):
    if g is None or g.is_empty:
        return []
    if isinstance(g, Point):
        return [g]
    if hasattr(g, 'geoms'):
        out = []
        for x in g.geoms:
            out += _points(x)
        return out
    if isinstance(g, LineString):
        return [Point(c) for c in g.coords]
    return []


def _snap_line(line, outlines, sil, retreat=True):
    """Ends that stop just short of an outline are extended onto it; ends that poke past are trimmed back."""
    out = []
    for ln in _lines(line):
        cs = list(ln.coords)
        if len(cs) < 2 or cs[0] == cs[-1]:
            out.append(ln)
            continue
        for end, nxt in ((0, 1), (-1, -2)):
            p, q = Point(cs[end]), Point(cs[nxt])
            d = p.distance(outlines)
            if d < .04 or d > SNAP or (not retreat and sil.contains(p)):
                continue
            m = math.hypot(p.x - q.x, p.y - q.y) or 1
            ux, uy = (p.x - q.x) / m, (p.y - q.y) / m
            if sil.buffer(-.02).contains(p):
                hit = _first_hit(p, ux, uy, SNAP + .3, outlines)
            else:
                hit = _first_hit(p, -ux, -uy, SNAP + .3, outlines)
            if hit is not None:
                cs[end] = (hit.x, hit.y)
        ln = LineString(cs)
        for end in (0, 1):
            p = Point(ln.coords[0] if end == 0 else ln.coords[-1])
            d = p.distance(outlines)
            if retreat and .04 < d < SNAP and ln.length > 2.5:
                step = 0
                while step < ln.length - 1.5:
                    step += .1
                    q = ln.interpolate(step if end == 0 else ln.length - step)
                    if q.distance(outlines) >= 1.1:
                        break
                from shapely.ops import substring
                ln = substring(ln, step, ln.length) if end == 0 else substring(ln, 0, ln.length - step)
        out.append(ln)
    return MultiLineString(out) if len(out) != 1 else out[0]


def prepare(icon, z):
    """The parts at one size, with gaps closed, plus each part's cover by the parts above it."""
    parts = []
    for p in _active(icon, z):
        p = dict(p)
        if p['k'] == 'ribbon':
            wa, wb = z[p['a']] / 2, z[p['b']] / 2
            ln = p['g']
            g = band(ln, [(0, wa), (1, wb)], n=120)
            g = U(g, Point(ln.coords[0]).buffer(wa, quad_segs=12), Point(ln.coords[-1]).buffer(wb, quad_segs=12))
            p = dict(k='shape', g=g, tone=1, fine=False, knock=True, outline=False, solid=True)
        parts.append(p)
    clip = getattr(icon, 'clip', None)
    if clip is not None:
        edge = clip.exterior.buffer(.06)
        for p in parts:
            p['g'] = p['g'].intersection(clip)
            p['cut'] = edge
    _close_gaps(parts)
    covers = []
    acc = None
    for p in reversed(parts):
        covers.append(acc)
        if p['k'] == 'shape':
            g = p['g']
        elif p['k'] == 'wire':
            g = p['g'].buffer(_wire_w(p, z) / 2)
        else:
            g = None
        if g is not None:
            acc = g if acc is None else acc.union(g)
    covers.reverse()
    sil = unary_union([p['g'] for p in parts if p['k'] == 'shape'])
    vis_out = []
    for p, cov in zip(parts, covers):
        if p['k'] == 'shape' and p['outline']:
            b = p['g'].boundary
            if p.get('cut') is not None:
                b = b.difference(p['cut'])
            vis_out.append(b if cov is None else b.difference(cov))
    outlines = unary_union(vis_out) if vis_out else LineString()
    for p in parts:
        if p['k'] == 'detail' and not p.get('free'):
            p['g'] = _snap_line(p['g'], outlines, sil).intersection(sil)
        elif p['k'] == 'wire' and not outlines.is_empty:
            p['g'] = _snap_line(p['g'], outlines, sil, retreat=False)
    return parts, covers


def render_line(icon, size='lg', px=None):
    z = SIZES[size]
    parts, covers = prepare(icon, z)

    tones = {}
    outlines = []
    details = []
    faint = []
    wires = {}
    pips = []
    for p, cov in zip(parts, covers):
        g = p['g']
        if p['k'] == 'shape':
            vis = g if cov is None else g.difference(cov)
            t = TONE if p['tone'] is None else p['tone']
            if t:
                tones.setdefault(t, []).append(vis)
            if p['outline']:
                b = g.boundary
                if p.get('cut') is not None:
                    b = b.difference(p['cut'])
                outlines.append(b if cov is None else b.difference(cov))
        elif p['k'] == 'detail':
            (details if p.get('op', 1) == 1 else faint).append(g if cov is None else g.difference(cov))
        elif p['k'] == 'wire':
            w = _wire_w(p, z)
            wires.setdefault((w, p['cap'], p.get('op', 1)), []).append(g if cov is None else g.difference(cov))
        elif p['k'] == 'pip':
            pips.append(g if cov is None else g.difference(cov))

    px = px or z['px']
    out = [f'<svg width="{px}" height="{px}" viewBox="0 0 48 48" fill="none" stroke="currentColor" '
           f'stroke-linejoin="round" aria-hidden="true">']
    for t, gs in sorted(tones.items()):
        d = poly_d(unary_union(gs))
        if d:
            out.append(f'<path d="{d}" fill="currentColor" fill-opacity="{_fmt(t)}" stroke="none"></path>')
    for (w, cap, op), gs in wires.items():
        d = line_d(unary_union(gs))
        if d:
            o = f' stroke-opacity="{_fmt(op)}"' if op != 1 else ''
            out.append(f'<path d="{d}" stroke-width="{_fmt(w)}" stroke-linecap="{cap}"{o}></path>')
    d = line_d(unary_union(outlines)) if outlines else ''
    if d:
        out.append(f'<path d="{d}" stroke-width="{_fmt(z["ol"])}" stroke-linecap="round"></path>')
    d = line_d(unary_union(faint)) if faint else ''
    if d:
        out.append(f'<path d="{d}" stroke-width="{_fmt(z["dl"])}" stroke-linecap="round" stroke-opacity=".5"></path>')
    d = line_d(unary_union(details)) if details else ''
    if d:
        out.append(f'<path d="{d}" stroke-width="{_fmt(z["dl"])}" stroke-linecap="round"></path>')
    d = poly_d(unary_union(pips)) if pips else ''
    if d:
        out.append(f'<path d="{d}" fill="currentColor" stroke="none"></path>')
    out.append('</svg>')
    return ''.join(out)


# ---------------------------------------------------------------- bands and helpers

def _interp(keys, t):
    if callable(keys):
        return keys(t)
    if isinstance(keys, (int, float)):
        return keys
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t0 <= t <= t1:
            return v0 + (v1 - v0) * (t - t0) / (t1 - t0 or 1)
    return keys[-1][1]


def band(d, wl, wr=None, n=40):
    """Area along a centreline. wl/wr: half-widths on the left/right of travel, as numbers or [(t, w)] keys."""
    wr = wl if wr is None else wr
    ln = d if isinstance(d, LineString) else LineString(parse(d, n)[0][0])
    total = ln.length
    samples = [ln.interpolate(total * k / n) for k in range(n + 1)]
    left, right = [], []
    for k, p in enumerate(samples):
        a = samples[max(0, k - 1)]
        b = samples[min(n, k + 1)]
        dx, dy = b.x - a.x, b.y - a.y
        m = math.hypot(dx, dy) or 1
        nx, ny = dy / m, -dx / m          # left normal on screen (y down)
        t = k / n
        l_, r_ = _interp(wl, t), _interp(wr, t)
        left.append((p.x + nx * l_, p.y + ny * l_))
        right.append((p.x - nx * r_, p.y - ny * r_))
    return _fix(Polygon(left + right[::-1]))


def rot(g, deg, about=(0, 0)):
    return affinity.rotate(g, deg, origin=about)


def mv(g, dx, dy):
    return affinity.translate(g, dx, dy)


def sc(g, sx, sy=None, about=(0, 0)):
    return affinity.scale(g, sx, sx if sy is None else sy, origin=about)


def U(*gs):
    return _fix(unary_union(gs))


def wraps(x0, x1, y0, y1, step=2.0, slant=1.2):
    """Diagonal wrap lines across a vertical grip."""
    lines = []
    y = y0 + step / 2
    while y < y1 - .3:
        lines.append(LineString([(x0, y + slant / 2), (x1, y - slant / 2)]))
        y += step
    return MultiLineString(lines)


def hlines(x0, x1, ys):
    return MultiLineString([LineString([(x0, y), (x1, y)]) for y in ys])


def band_line(d, wl, wr=None, frac=.5, t0=0, t1=1, n=40):
    """A line inside a band, a fixed fraction of the way from its right edge to its left edge."""
    wr = wl if wr is None else wr
    pts = parse(d, n)[0][0]
    ln = LineString(pts)
    total = ln.length
    samples = [ln.interpolate(total * k / n) for k in range(n + 1)]
    out = []
    for k, p in enumerate(samples):
        t = k / n
        if t < t0 or t > t1:
            continue
        a = samples[max(0, k - 1)]
        b = samples[min(n, k + 1)]
        dx, dy = b.x - a.x, b.y - a.y
        m = math.hypot(dx, dy) or 1
        nx, ny = dy / m, -dx / m
        off = -_interp(wr, t) + frac * (_interp(wl, t) + _interp(wr, t))
        out.append((p.x + nx * off, p.y + ny * off))
    return LineString(out)


