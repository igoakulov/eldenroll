"""Spells, talisman, armor, items, ash, and the UI icons."""
import math

from shapely.geometry import LineString, MultiLineString

from geo import (C, E, Icon, L, M, ML, R, S, U, band, hlines, inset, mv, poly, ring, rot, sc, star, wraps)
from ranged import FLAME, INNER


def _sparkle(x, y, r):
    return star(x, y, r, r * .28, 4)


# ---------------------------------------------------------------- sorcery (comet)

def sorcery_a():
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


def sorcery_b():
    ic = Icon()
    ic.shape(band('M30 18 L5 43', [(0, 7.4), (1, 0)], n=8), tone=.17)
    ic.detail(L('M25.6 22.4 L11 37'))
    gem = rot(poly((0, -9.6), (6, -4), (6, 4), (0, 9.6), (-6, 4), (-6, -4)), 45)
    ic.shape(mv(gem, 30, 18), tone=.45)
    ic.detail(mv(rot(L('M-6 -4 L0 0 L6 -4 M0 0 L0 9.6'), 45), 30, 18))
    ic.shape(_sparkle(42, 9, 3.4), tone=1, outline=False)
    return ic.place(0, 42)


# ---------------------------------------------------------------- incantation (fire)

def incantation_a():
    ic = Icon()
    ic.shape(sc(S(FLAME), 2.15))
    ic.shape(sc(S(INNER), 2.1), tone=.3)
    ic.shape(C(0.6, -7.2, 5.4), tone=.6)
    return ic.place(0, 42)


def incantation_b():
    ic = Icon()
    big = sc(S('M0 0 C-5.6 0 -8 -4 -6.6 -8.6 C-5.6 -12 -2.4 -13.6 -1.6 -18 C1 -16 1.8 -13.6 1.4 -11.4 '
               'C3 -13.4 4.4 -16 4.2 -19.6 C8 -16.4 9.2 -10.8 8 -6.4 C6.8 -2.2 3.6 0 0 0 Z'), 2)
    ic.shape(big)
    ic.shape(sc(S(INNER), 2.3), tone=.6)
    return ic.place(0, 42)


# ---------------------------------------------------------------- talisman

def talisman_a():
    ic = Icon()
    ic.wire(L('M-1.6 -12 L-13 -27'), 'hair')
    ic.wire(L('M1.6 -12 L13 -27'), 'hair')
    ic.shape(ring(0, -11.2, 2.6, 1.1), tone=.3)
    ic.shape(C(0, 2, 11.4), tone=.17)
    ic.shape(ring(0, 2, 11.4, 2), tone=.3)
    for k in range(4):
        a = math.radians(45 + k * 90)
        ic.shape(C(5.6 * math.cos(a), 2 + 5.6 * math.sin(a), 1.3), tone=.6, fine=True)
    ic.shape(C(0, 2, 3.4), tone=.6)
    return ic.place(0, 42)


def talisman_b():
    ic = Icon()
    ic.wire(L('M-2 -12 L-13 -27'), 'thin')
    ic.wire(L('M2 -12 L13 -27'), 'thin')
    ic.shape(ring(0, -11.2, 3, 1.4), tone=.3)
    body = M('M0 -8.2 C4 -8.2 9.4 -6.6 11.6 -3.4 C11.6 5 7.4 12 0 16.4')
    ic.shape(body, tone=.17)
    ic.detail(body.buffer(-2.2, join_style='mitre').exterior)
    ic.shape(poly((0, -3.4), (3.6, 2.4), (0, 8.2), (-3.6, 2.4)), tone=.6)
    return ic.place(0, 42)


# ---------------------------------------------------------------- armor

def head_a():
    ic = Icon()
    helm = M('M0 -20 C6.8 -20 11 -15.4 11.4 -8.4 L11.6 3.6 C11.6 7.6 10.2 10.6 7.6 12.8 L0 14.4')
    slits = S('M-8.8 -6.8 L-1.6 -5.8 L-1.6 -4 L-8.8 -4.8 Z M8.8 -6.8 L1.6 -5.8 L1.6 -4 L8.8 -4.8 Z')
    ic.shape(helm.difference(slits))
    ic.detail(L('M0 -20 L0 -8.4'))
    ic.detail(L('M-11.4 -1.2 C-6 0.2 6 0.2 11.4 -1.2'), fine=True)
    for x in (2.6, 4.8, 7):
        for y in (3.8, 6.6):
            ic.pip(C(x, y, .6), fine=True)
    ic.shape(S('M-9.6 12 L9.6 12 L12.4 18.6 L-12.4 18.6 Z'), tone=.3)
    ic.detail(hlines(-11, 11, [15.4]), fine=True)
    return ic.place(0, 41)


def head_b():
    ic = Icon()
    helm = S('M-10.8 -11 C-10.8 -17.6 -6 -21 0 -21 C6 -21 10.8 -17.6 10.8 -11 L11.2 12 C6 14.8 -6 14.8 -11.2 12 Z')
    slot = S('M-9 -6.4 L9 -6.4 L9 -3.4 L1.5 -3.4 L1.5 8 L-1.5 8 L-1.5 -3.4 L-9 -3.4 Z')
    ic.shape(helm.difference(slot))
    ic.detail(L('M0 -20 L0 -9.4'))
    ic.shape(S('M-12.2 11.6 L12.2 11.6 L13.4 17.6 L-13.4 17.6 Z'), tone=.3)
    return ic.place(0, 41)


def body_a():
    ic = Icon()
    for s in (1, -1):
        ic.shape(sc(S('M10.4 -5.4 L15.8 -6.6 L16.8 7 L12 8 Z'), s, 1), tone=.17)
        ic.detail(sc(MultiLineString([LineString([(10.9, -1), (16.1, -2)]), LineString([(11.3, 3), (16.4, 2.2)])]), s, 1), fine=True)
    plate = M('M0 -12.2 L3.2 -11.4 L7.8 -14.4 L10 -6 L9.2 4 L7.4 8.6 L0 8.6')
    ic.shape(plate)
    ic.detail(L('M0 -12.2 L0 8.6'))
    ic.detail(ML('M3.2 -11.4 C3.8 -6 5.6 -2 9.4 0'), fine=True)
    ic.shape(S('M-8.4 8.6 L8.4 8.6 L9.8 17 L-9.8 17 Z'), tone=.3)
    ic.detail(hlines(-9.4, 9.4, [11.4, 14.2]), fine=True)
    for s in (1, -1):
        ic.shape(sc(S('M6.6 -15.4 C10.8 -17.4 15.4 -16 17 -11.4 L17 -5.6 L10.4 -4.6 Z'), s, 1), tone=.3)
        ic.detail(sc(L('M8.6 -12.6 C11.4 -13.6 14.4 -12.8 16.4 -10'), s, 1), fine=True)
    return ic.place(0, 42)


def body_b():
    ic = Icon()
    plate = M('M0 -12 L3.6 -11.2 L8.4 -14.6 L10.4 -5.4 L9.6 5 L7.8 9 L0 9')
    ic.shape(plate)
    ic.detail(L('M0 -11 L0 8'))
    ic.shape(S('M-8.8 9 L8.8 9 L10.6 18 L-10.6 18 Z'), tone=.3)
    for s in (1, -1):
        ic.shape(sc(S('M7 -16 C11.6 -18.4 16.8 -16.8 18.4 -11.4 L18.4 -4 L10.6 -3 Z'), s, 1), tone=.3)
    return ic.place(0, 42)


def arms_a():
    ic = Icon()
    for k, (x, top, ang) in enumerate(((-5.4, -18, -6), (-1.8, -21, -2), (1.8, -20.4, 2), (5.4, -17, 7))):
        f = R(x - 1.55, top, 3.1, -top - 7)
        f = rot(f, ang, about=(x, -8))
        ic.shape(f, tone=.17)
        y1 = top + (-top - 7) * .38
        ic.detail(rot(LineString([(x - 1.55, y1), (x + 1.55, y1)]), ang, about=(x, -8)), fine=True)
    ic.shape(band('M-7.4 3 C-11 1 -12.6 -3 -12 -8.6', [(0, 1.8), (1, 1.3)]), tone=.17)
    ic.shape(S('M-7.6 -9 L7.6 -9 L7.2 6 L-6.8 6 Z'))
    ic.shape(R(-8, -10.4, 16, 3), tone=.3)
    ic.detail(L('M-6 -1.6 C-2 -0.4 2 -0.4 6 -1.6'), fine=True)
    ic.shape(S('M-7 6 L7 6 L9.6 20 L-9.6 20 Z'), tone=.3)
    ic.detail(hlines(-9, 9, [10.4, 15]))
    return ic.place(0, 42)


def arms_b():
    ic = Icon()
    for x, top, ang in ((-5.6, -17, -7), (-1.9, -20.6, -2), (1.9, -20, 2), (5.6, -16.2, 8)):
        f = S(f'M{x-1.8} -8 L{x-1.8} {top+1.8} C{x-1.8} {top-.6} {x+1.8} {top-.6} {x+1.8} {top+1.8} L{x+1.8} -8 Z')
        ic.shape(rot(f, ang, about=(x, -8)), tone=.17)
    ic.shape(band('M-7.6 3 C-11.8 1 -13.4 -3.4 -12.8 -9.4', [(0, 2.2), (1, 1.8)]), tone=.17)
    ic.shape(S('M-8 -10.6 L8 -10.6 L7.6 6 L-7.2 6 Z'))
    ic.shape(S('M-7.6 6 L7.6 6 L10.6 20 L-10.6 20 Z'), tone=.3)
    ic.detail(hlines(-9.6, 9.6, [12.6]))
    return ic.place(0, 42)


def _leg(foot_dir=1, bold=False):
    parts = []
    thigh = S('M-3.8 -23 L3.8 -23 L3.3 -5.8 L-3.3 -5.8 Z')
    knee = E(0, -4.6, 4.2, 3.0)
    shin = S('M-3.3 -3.2 L3.3 -3.2 L2.7 13 L-2.7 13 Z')
    foot = S('M-2.9 13 L2.9 13 C5.8 13.6 8 15.6 8.4 18.4 L-2.9 18.4 Z')
    if foot_dir < 0:
        foot = sc(foot, -1, 1)
    return thigh, knee, shin, foot


def legs_a():
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


def legs_b():
    ic = Icon()
    thigh = S('M-5 -23 L5 -23 L4.2 -6 L-4.2 -6 Z')
    shin = S('M-4.4 -2.6 L4.4 -2.6 C4.4 4 4 9 3.6 13 L-3.6 13 Z')
    foot = S('M-4 13 L3.6 13 C9 13.6 12.4 16.4 13.4 19.4 L-4 19.4 Z')
    knee = E(0, -4.4, 5.2, 3.6)
    ic.shape(thigh)
    ic.detail(hlines(-5, 5, [-15]))
    ic.shape(shin)
    ic.shape(foot, tone=.3)
    ic.shape(knee, tone=.3)
    return ic.place(0, 42)


# ---------------------------------------------------------------- items

def tool_a():
    ic = Icon()
    ic.shape(R(-1.2, -24, 2.4, 12.6), tone=.3)
    ic.detail(wraps(-1.2, 1.2, -22, -14, 1.8), fine=True)
    ic.shape(E(0, -25.4, 2.2, 2), tone=.3)
    ic.shape(R(-2.2, -13.4, 4.4, 2), tone=.3)
    bell = M('M0 -11.4 C3.6 -11.4 5.6 -9 6 -5 L6.8 5.4 C7.2 8 8.8 9.6 11 10.2 L11 12.4 L0 12.4')
    ic.shape(bell)
    ic.detail(L('M-6.6 3 L6.6 3'), fine=True)
    ic.detail(L('M-10.6 10.2 L10.6 10.2'))
    ic.shape(C(0, 15, 2.3), tone=.6)
    return ic.place(-18, 42)


def tool_b():
    ic = Icon()
    ic.shape(R(-1.7, -22, 3.4, 10), tone=.3)
    ic.shape(C(0, -23.6, 2.8), tone=.3)
    bell = M('M0 -12.4 C4.4 -12.4 7 -9.6 7.4 -4.6 L8.4 6 C8.8 8.6 10.6 10 13 10.6 L13 13 L0 13')
    ic.shape(bell)
    ic.detail(L('M-12.6 10.4 L12.6 10.4'))
    ic.shape(C(0, 16.4, 2.8), tone=.6)
    ic.wire(L('M16.4 -6 C18.6 -2.4 18.6 2.4 16.4 6'), 'thin')
    ic.wire(L('M-16.4 -6 C-18.6 -2.4 -18.6 2.4 -16.4 6'), 'thin')
    return ic.place(-18, 42)


def _pot(bold):
    ic = Icon()
    body = U(C(0, 5, 12.4), R(-5.2, -10, 10.4, 6))
    ic.shape(body)
    ic.shape(R(-6.8, -12.4, 13.6, 2.8), tone=.3)
    if bold:
        ic.shape(S('M-3.4 -12.4 C-4.4 -15 -3 -17.4 0 -17.6 C3 -17.4 4.4 -15 3.4 -12.4 Z'), tone=.45)
        ic.detail(L('M-5.4 -7 L5.4 -7'))
        ic.detail(L('M-11.8 4 C-6 6.4 6 6.4 11.8 4'))
    else:
        ic.detail(L('M-5.4 -7.2 L5.4 -7.2 M-5.4 -5.4 L5.4 -5.4'), fine=True)
        ic.detail(L('M-11.8 3 C-6 5.6 6 5.6 11.8 3'), fine=True)
        ic.detail(L('M-6 8.6 C-3.6 10.4 -1 10.8 1.6 10.4'), fine=True)
        ic.shape(S('M-3 -12.4 C-3.6 -14.6 -2.4 -16.2 0 -16.4 C2.4 -16.2 3.6 -14.6 3 -12.4 Z'), tone=.45)
    return ic


def pots_a():
    ic = Icon()
    flask = Icon()
    flask.shape(C(0, 0, 5), tone=.3)
    flask.shape(R(-1.3, -13, 2.6, 9))
    flask.shape(R(-2.2, -14.8, 4.4, 2), tone=.3)
    for p in flask.parts:
        p['g'] = mv(p['g'], -10.2, 9.2)
    pot = _pot(False)
    for p in pot.parts:
        p['g'] = mv(p['g'], 4, 0)
    ic.parts = flask.parts + pot.parts
    return ic.place(0, 42)


def pots_b():
    return _pot(True).place(0, 40)


def _kukri(w=1.0):
    blade = band('M0 0 C0 -5.4 0.8 -9.6 3.2 -12.8 C4.6 -14.6 6.6 -16 9 -16.8',
                 [(0, 1.25), (.5, 1.5), (.85, 1.2), (1, 0)], [(0, 1.25), (.42, 3), (.78, 2.4), (1, 0)])
    handle = S('M-1.9 1.4 L1.9 1.4 L2.1 8 C3.2 8.6 3.2 10.8 1.6 11.2 L-1.6 11.2 C-3.2 10.8 -3.2 8.6 -2.1 8 Z')
    bolster = R(-2.5, -0.2, 5, 1.8)
    return sc(blade, w), sc(U(handle, bolster), w)


def throwables_a():
    ic = Icon()
    for ang in (-30, 0, 30):
        b, h = _kukri(1.1)
        ic.shape(rot(b, ang, about=(0, 15)), tone=.17)
        ic.shape(rot(h, ang, about=(0, 15)), tone=.45)
    return ic.place(0, 42)


def throwables_b():
    ic = Icon()
    for dx, dy in ((-5.6, 3.4), (0, 0)):
        b, h = _kukri(1.6)
        ic.shape(mv(b, dx, dy), tone=.17)
        ic.shape(mv(h, dx, dy), tone=.45)
    return ic.place(22, 42)


# ---------------------------------------------------------------- ash of war

def ash_a():
    ic = Icon()
    cinder = poly((-9.6, 4), (-6.4, -4.4), (-1, -7.6), (5.4, -6.6), (10, -1.6), (10.4, 5.6), (6, 10.4), (-3, 11), (-8.6, 8.6))
    ic.shape(cinder, tone=.3)
    ic.detail(MultiLineString([LineString([(-6.4, -4.4), (-2, 1), (-3, 11)]), LineString([(-2, 1), (5.4, -6.6)]),
                               LineString([(-2, 1), (10.4, 5.6)])]))
    ic.shape(C(-2, 1, 1.6), tone=.85, outline=False)
    for x, y, r in ((7.4, -12.4, 1.6), (12, -17.2, 1.2), (4, -18.6, 1), (10.4, -23, .8)):
        ic.shape(rot(poly((x, y - r * 1.6), (x + r, y), (x, y + r * 1.6), (x - r, y)), 20, about=(x, y)), tone=1, outline=False)
    return ic.place(0, 40)


def ash_b():
    ic = Icon()
    stone = poly((0, -15), (13, 0), (0, 15), (-13, 0))
    ic.shape(stone, tone=.3)
    ic.detail(stone.buffer(-2.4, join_style='mitre').exterior)
    ic.shape(poly((0, -8), (1.2, -4), (1.2, 3), (3.4, 3), (3.4, 4.6), (1, 4.6), (1, 7.6), (-1, 7.6), (-1, 4.6), (-3.4, 4.6), (-3.4, 3), (-1.2, 3), (-1.2, -4)), tone=.85)
    for x, y, r in ((9.6, -14.4, 1.4), (13.4, -19, 1.1), (6.4, -20.6, .9)):
        ic.shape(poly((x, y - r * 1.6), (x + r, y), (x, y + r * 1.6), (x - r, y)), tone=1, outline=False)
    return ic.place(0, 40)


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


def reroll_a():
    ic = Icon()
    ic.wire(LineString(_arc_pts(0, 0, 14, 200, 326)), 'thin')
    ic.wire(LineString(_arc_pts(0, 0, 14, 20, 146)), 'thin')
    ic.shape(_head(0, 0, 14, 326), tone=1, outline=False)
    ic.shape(_head(0, 0, 14, 146), tone=1, outline=False)
    return ic.place(0, 36)


def reroll_b():
    ic = Icon()
    ic.wire(LineString(_arc_pts(0, 0, 14, 200, 340)), 'thin')
    ic.wire(LineString(_arc_pts(0, 0, 14, 20, 160)), 'thin')
    ic.wire(L('M14.6 -10.4 L13.2 -4.6 L7.6 -5.6'), 'thin')
    ic.wire(L('M-14.6 10.4 L-13.2 4.6 L-7.6 5.6'), 'thin')
    return ic.place(0, 36)


def pin_a():
    ic = Icon()
    pin = S('M0 20 C-5 13.6 -11 7 -11 -2 A11 11 0 0 1 11 -2 C11 7 5 13.6 0 20 Z M4.4 -2 A4.4 4.4 0 0 0 -4.4 -2 A4.4 4.4 0 0 0 4.4 -2 Z')
    ic.shape(pin)
    return ic.place(0, 38)


def pin_b():
    ic = Icon()
    pin = S('M0 20 C-5 13.6 -11 7 -11 -2 A11 11 0 0 1 11 -2 C11 7 5 13.6 0 20 Z M0 -7.4 L5 -2 L0 3.4 L-5 -2 Z')
    ic.shape(pin)
    return ic.place(0, 38)


def undo_a():
    ic = Icon()
    ic.wire(L('M-10 -4 L4 -4 C10.6 -4 14 0 14 5.6 C14 11.2 10.6 15 4 15 L-1 15'), 'thin')
    ic.wire(L('M-3.4 -11 L-10.4 -4 L-3.4 3'), 'thin')
    return ic.place(0, 34)


def undo_b():
    ic = Icon()
    ic.wire(L('M-6 -4 L4 -4 C10.6 -4 14 0 14 5.6 C14 11.2 10.6 15 4 15 L-1 15'), 'thick')
    ic.shape(poly((-14, -4), (-5.4, -11.6), (-5.4, 3.6)), tone=1, outline=False)
    return ic.place(0, 34)


def menu_a():
    ic = Icon()
    ic.wire(L('M-13 -9 L13 -9 M-13 0 L13 0 M-13 9 L13 9'), 'thin')
    return ic.place(0, 32)


def menu_b():
    ic = Icon()
    ic.wire(L('M-8 -9 L13 -9 M-8 0 L13 0 M-8 9 L13 9'), 'thin')
    for y in (-9, 0, 9):
        ic.shape(poly((-13.6, y), (-11.4, y - 2.2), (-9.2, y), (-11.4, y + 2.2)), tone=1, outline=False)
    return ic.place(0, 32)


def close_a():
    ic = Icon()
    ic.wire(L('M-11 -11 L11 11 M11 -11 L-11 11'), 'thin')
    return ic.place(0, 28)


def close_b():
    ic = Icon()
    blade = poly((-12, -12), (0, -1.6), (12, -12), (1.6, 0), (12, 12), (0, 1.6), (-12, 12), (-1.6, 0))
    ic.shape(blade, tone=1, outline=False)
    return ic.place(0, 28)


def chevron_a():
    ic = Icon()
    ic.wire(L('M-4 -10 L6 0 L-4 10'), 'thin')
    return ic.place(0, 22)


def chevron_b():
    ic = Icon()
    ic.shape(poly((-6, -11), (7, 0), (-6, 11), (-2.4, 0)), tone=1, outline=False)
    return ic.place(0, 22)


# Safari's own two steps to add the app, drawn as iOS draws them so the player finds them on screen
def share_a():
    ic = Icon()
    ic.wire(L('M-5.4 -5 L-11 -5 L-11 15 L11 15 L11 -5 L5.4 -5'), 'thin')
    ic.wire(L('M0 7 L0 -15 M-5.6 -9.4 L0 -15 L5.6 -9.4'), 'thin')
    return ic.place(0, 32)


def add_a():
    ic = Icon()
    ic.wire(L('M-8 -13 L8 -13 A5 5 0 0 1 13 -8 L13 8 A5 5 0 0 1 8 13 L-8 13 A5 5 0 0 1 -13 8 L-13 -8 A5 5 0 0 1 -8 -13 Z'), 'thin')
    ic.wire(L('M0 -6.5 L0 6.5 M-6.5 0 L6.5 0'), 'thin')
    return ic.place(0, 30)


SPELLS = [
    ('sorcery', 'Sorcery', sorcery_a, sorcery_b),
    ('incantation', 'Incantation', incantation_a, incantation_b),
]
TALISMAN = [('talisman', 'Talisman', talisman_a, talisman_b)]
ARMOR = [
    ('head', 'Head', head_a, head_b),
    ('body', 'Body', body_a, body_b),
    ('arms', 'Arms', arms_a, arms_b),
    ('legs', 'Legs', legs_a, legs_b),
]
ITEMS = [
    ('tool', 'Tool', tool_a, tool_b),
    ('pots', 'Pots and perfumes', pots_a, pots_b),
    ('throwables', 'Other throwables', throwables_a, throwables_b),
]
ASH = [('ash', 'Ash of War', ash_a, ash_b)]
UI = [
    ('reroll', 'Reroll', reroll_a, reroll_b),
    ('pin', 'Location', pin_a, pin_b),
    ('undo', 'Undo', undo_a, undo_b),
    ('menu', 'Menu', menu_a, menu_b),
    ('close', 'Close', close_a, close_b),
    ('chevron', 'Chevron', chevron_a, chevron_b),
    ('share', 'Share', share_a, share_a),
    ('add', 'Add to Home Screen', add_a, add_a),
]
ICONS = SPELLS + TALISMAN + ARMOR + ITEMS + ASH + UI
