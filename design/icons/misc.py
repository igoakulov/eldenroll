"""Sorcery, legs, pots and the UI icons."""
import math

from shapely.geometry import LineString

from geo import (C, E, Icon, L, R, S, U, band, hlines, mv, poly, sc, star)


def _sparkle(x, y, r):
    return star(x, y, r, r * .28, 4)


# ---------------------------------------------------------------- sorcery (comet)

def sorcery():
    ic = Icon()
    ic.shape(band('M31 17 L5 43', [(0, 5.4), (1, 0)], n=8), tone=.17)
    ic.shape(band('M35.6 21.4 L22.4 39.8', [(0, 1.2), (1, 0)], n=6), tone=.3)
    ic.shape(band('M26.6 12.4 L8.2 25.6', [(0, 1.2), (1, 0)], n=6), tone=.3)
    ic.detail(L('M27.6 20.4 L12 36'), fine=True)
    ic.shape(C(31, 17, 6.6), tone=.45)
    ic.detail(_sparkle(31, 17, 3.6).exterior, fine=True)
    ic.shape(_sparkle(42.4, 8.6, 3.2), tone=1, outline=False)
    ic.shape(_sparkle(40.4, 27.4, 2.2), tone=1, outline=False)
    return ic.place(0, 42)


# ---------------------------------------------------------------- armor


def _leg(foot_dir=1):
    thigh = S('M-3.8 -23 L3.8 -23 L3.3 -5.8 L-3.3 -5.8 Z')
    knee = E(0, -4.6, 4.2, 3.0)
    shin = S('M-3.3 -3.2 L3.3 -3.2 L2.7 13 L-2.7 13 Z')
    foot = S('M-2.9 13 L2.9 13 C5.8 13.6 8 15.6 8.4 18.4 L-2.9 18.4 Z')
    if foot_dir < 0:
        foot = sc(foot, -1, 1)
    return thigh, knee, shin, foot


def legs():
    ic = Icon()
    for s in (-1, 1):
        thigh, knee, shin, foot = _leg(s)
        dx = 5.2 * s
        ic.shape(mv(thigh, dx, 0))
        ic.detail(mv(hlines(-3.6, 3.6, [-17.6, -12.2]), dx, 0), fine=True)
        ic.shape(mv(shin, dx, 0))
        ic.detail(mv(L('M0 0 L0 11'), dx, 0), fine=True)
        ic.shape(mv(foot, dx, 0), tone=.3)
        ic.shape(mv(knee, dx, 0), tone=.3)
    return ic.place(0, 42)


# ---------------------------------------------------------------- items


def _pot():
    ic = Icon()
    body = U(C(0, 5, 12.4), R(-5.2, -10, 10.4, 6))
    ic.shape(body)
    ic.shape(R(-6.8, -12.4, 13.6, 2.8), tone=.3)
    ic.detail(L('M-5.4 -7.2 L5.4 -7.2 M-5.4 -5.4 L5.4 -5.4'), fine=True)
    ic.detail(L('M-11.8 3 C-6 5.6 6 5.6 11.8 3'), fine=True)
    ic.detail(L('M-6 8.6 C-3.6 10.4 -1 10.8 1.6 10.4'), fine=True)
    ic.shape(S('M-3 -12.4 C-3.6 -14.6 -2.4 -16.2 0 -16.4 C2.4 -16.2 3.6 -14.6 3 -12.4 Z'), tone=.45)
    return ic


def pots():
    ic = Icon()
    flask = Icon()
    flask.shape(C(0, 0, 5), tone=.3)
    flask.shape(R(-1.3, -13, 2.6, 9))
    flask.shape(R(-2.2, -14.8, 4.4, 2), tone=.3)
    for p in flask.parts:
        p['g'] = mv(p['g'], -10.2, 9.2)
    pot = _pot()
    for p in pot.parts:
        p['g'] = mv(p['g'], 4, 0)
    ic.parts = flask.parts + pot.parts
    return ic.place(0, 42)


# ---------------------------------------------------------------- UI

def _arc_pts(cx, cy, r, a0, a1, n=24):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(n + 1)]


def _head(cx, cy, r, a_deg, size=4.6):
    a = math.radians(a_deg)
    px, py = cx + r * math.cos(a), cy + r * math.sin(a)
    dx, dy = -math.sin(a), math.cos(a)
    nx, ny = math.cos(a), math.sin(a)
    tip = (px + dx * size * .9, py + dy * size * .9)
    return poly(tip, (px - dx * size * .5 + nx * size * .75, py - dy * size * .5 + ny * size * .75),
                (px - dx * size * .5 - nx * size * .75, py - dy * size * .5 - ny * size * .75))


def reroll():
    ic = Icon()
    ic.wire(LineString(_arc_pts(0, 0, 14, 200, 326)), 'thin')
    ic.wire(LineString(_arc_pts(0, 0, 14, 20, 146)), 'thin')
    ic.shape(_head(0, 0, 14, 326), tone=1, outline=False)
    ic.shape(_head(0, 0, 14, 146), tone=1, outline=False)
    return ic.place(0, 36)


def pin():
    ic = Icon()
    pin = S('M0 20 C-5 13.6 -11 7 -11 -2 A11 11 0 0 1 11 -2 C11 7 5 13.6 0 20 Z M4.4 -2 A4.4 4.4 0 0 0 -4.4 -2 A4.4 4.4 0 0 0 4.4 -2 Z')
    ic.shape(pin)
    return ic.place(0, 38)


def undo():
    ic = Icon()
    ic.wire(L('M-10 -4 L4 -4 C10.6 -4 14 0 14 5.6 C14 11.2 10.6 15 4 15 L-1 15'), 'thin')
    ic.wire(L('M-3.4 -11 L-10.4 -4 L-3.4 3'), 'thin')
    return ic.place(0, 34)


def menu():
    ic = Icon()
    ic.wire(L('M-13 -9 L13 -9 M-13 0 L13 0 M-13 9 L13 9'), 'thin')
    return ic.place(0, 32)


def close():
    ic = Icon()
    ic.wire(L('M-11 -11 L11 11 M11 -11 L-11 11'), 'thin')
    return ic.place(0, 28)


def chevron():
    ic = Icon()
    ic.wire(L('M-4 -10 L6 0 L-4 10'), 'thin')
    return ic.place(0, 22)


def search():
    ic = Icon()
    ic.wire(L('M9.2 9.2 L19.5 19.5'), 'thin')
    ic.wire(C(0, 0, 12.5).exterior, 'thin')
    return ic.place(0, 32, at=(24.5, 24.5))


# Safari's own two steps to add the app, drawn as iOS draws them so the player finds them on screen
def share():
    ic = Icon()
    ic.wire(L('M-5.4 -5 L-11 -5 L-11 15 L11 15 L11 -5 L5.4 -5'), 'thin')
    ic.wire(L('M0 7 L0 -15 M-5.6 -9.4 L0 -15 L5.6 -9.4'), 'thin')
    return ic.place(0, 32)


def add():
    ic = Icon()
    ic.wire(L('M-8 -13 L8 -13 A5 5 0 0 1 13 -8 L13 8 A5 5 0 0 1 8 13 L-8 13 A5 5 0 0 1 -13 8 L-13 -8 A5 5 0 0 1 -8 -13 Z'), 'thin')
    ic.wire(L('M0 -6.5 L0 6.5 M-6.5 0 L6.5 0'), 'thin')
    return ic.place(0, 30)


UI = [
    ('reroll', 'Reroll', reroll),
    ('pin', 'Location', pin),
    ('undo', 'Undo', undo),
    ('menu', 'Menu', menu),
    ('close', 'Close', close),
    ('chevron', 'Chevron', chevron),
    ('search', 'Search', search),
    ('share', 'Share', share),
    ('add', 'Add to Home Screen', add),
]
