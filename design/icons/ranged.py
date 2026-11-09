"""Bows, crossbow, ballista, catalysts, the odd weapons and shields."""
import math

from shapely.geometry import LineString, MultiLineString

from geo import (C, E, Icon, L, M, ML, R, S, U, band, hlines, inset, mv, poly, ring, rot, sc, star, wraps)

D45 = 45


def _arrow(ic, y_nock, y_tip, head_w, shaft='thin', fletch=True, big=False):
    ic.wire(L(f'M0 {y_nock} L0 {y_tip + (5 if big else 3.6)}'), shaft, cap='butt')
    hl = 6.4 if big else 4.4
    if big:
        ic.shape(poly((0, y_tip), (head_w, y_tip + hl), (head_w * .4, y_tip + hl - 1.2), (head_w * .5, y_tip + hl + 1),
                      (-head_w * .5, y_tip + hl + 1), (-head_w * .4, y_tip + hl - 1.2), (-head_w, y_tip + hl)), tone=.3)
    else:
        ic.shape(poly((0, y_tip), (head_w, y_tip + hl), (0, y_tip + hl - 1.2), (-head_w, y_tip + hl)), tone=.3)
    if fletch:
        f = 1.6 if big else 1.2
        ic.shape(poly((0.2, y_nock - 1), (f + .6, y_nock + .6), (f + .6, y_nock - 3), (0.2, y_nock - 5.4)), tone=.3)
        ic.shape(poly((-0.2, y_nock - 1), (-f - .6, y_nock + .6), (-f - .6, y_nock - 3), (-0.2, y_nock - 5.4)), tone=.3)


# ---------------------------------------------------------------- light bow

def light_bow_a():
    ic = Icon()
    ic.wire(L('M-14.28 4.29 L14.28 4.29'), 'hair')
    _arrow(ic, 6.6, -21, 2)
    ic.shape(band('M-15 5.4 C-11 -1 -6 -4.6 0 -4.6 C6 -4.6 11 -1 15 5.4',
                  [(0, .5), (.4, 1), (.5, 1.25), (.6, 1), (1, .5)]))
    ic.shape(R(-1.6, -6.4, 3.2, 3.6), tone=.3)
    return ic.place(D45, 37)


def light_bow_b():
    ic = Icon()
    ic.wire(L('M-15 4.4 L15 4.4'), 'hair')
    _arrow(ic, 6.6, -22, 2.6, shaft='thick')
    ic.shape(band('M-15.6 5.4 C-11 -1.6 -6 -5.4 0 -5.4 C6 -5.4 11 -1.6 15.6 5.4',
                  [(0, .8), (.5, 1.7), (1, .8)]))
    return ic.place(D45, 37)


# ---------------------------------------------------------------- bow

def _recurve(w):
    return band('M-20.6 -6.4 C-19.4 -2.6 -16.6 -0.6 -13.4 -1.2 C-8 -2.2 -4.4 -7.4 0 -7.4 C4.4 -7.4 8 -2.2 13.4 -1.2 C16.6 -0.6 19.4 -2.6 20.6 -6.4',
                w, n=80)


def bow_a():
    ic = Icon()
    ic.wire(L('M-19.95 -4.8 L0 10.6 L19.95 -4.8'), 'hair')
    _arrow(ic, 10.6, -23, 2.1)
    ic.shape(_recurve([(0, .45), (.3, .95), (.5, 1.3), (.7, .95), (1, .45)]))
    ic.shape(R(-1.7, -9.2, 3.4, 3.8), tone=.3)
    ic.detail(hlines(-1.7, 1.7, [-8, -6.6]), fine=True)
    return ic.place(D45, 43)


def bow_b():
    ic = Icon()
    ic.wire(L('M-19.2 -3.6 L0 10 L19.2 -3.6'), 'thin')
    _arrow(ic, 10, -23, 2.6, shaft='thick')
    ic.shape(_recurve([(0, .8), (.5, 1.8), (1, .8)]))
    return ic.place(D45, 43)


# ---------------------------------------------------------------- greatbow

def greatbow_a():
    ic = Icon()
    ic.wire(L('M-24.1 6.72 L24.1 6.72'), 'hair')
    _arrow(ic, 12, -27, 3.4, shaft='thick', big=True)
    ic.shape(band('M-25.4 8.4 C-18 -1.6 -9 -6 0 -6 C9 -6 18 -1.6 25.4 8.4',
                  [(0, 1.1), (.35, 2.4), (.5, 2.8), (.65, 2.4), (1, 1.1)], n=60))
    ic.shape(R(-2.6, -8.8, 5.2, 5.6), tone=.3)
    ic.detail(hlines(-2.6, 2.6, [-7.2, -5.6, -4.4]), fine=True)
    ic.shape(C(-25.2, 8.4, 1.3), tone=.3)
    ic.shape(C(25.2, 8.4, 1.3), tone=.3)
    return ic.place(D45, 46)


def greatbow_b():
    ic = Icon()
    ic.wire(L('M-24.4 7.4 L24.4 7.4'), 'thin')
    _arrow(ic, 12, -28, 4.2, shaft='thick', big=True)
    ic.shape(band('M-25.4 8.4 C-18 -2.4 -9 -7 0 -7 C9 -7 18 -2.4 25.4 8.4',
                  [(0, 1.6), (.5, 3.6), (1, 1.6)], n=60))
    ic.shape(R(-3, -10.4, 6, 6.6), tone=.3)
    return ic.place(D45, 46)


# ---------------------------------------------------------------- crossbow

def crossbow_a():
    ic = Icon()
    ic.shape(S('M-1.8 -15 L1.8 -15 L2.2 12 L3.8 24 L-3.8 24 L-2.2 12 Z'), tone=.3)
    ic.detail(hlines(-2.6, 2.6, [16]), fine=True)
    ic.shape(band('M4 9 C5.6 10 6 12 5.2 14.4', .7), tone=.3)
    ic.wire(L('M-16 -7.6 L0 3 L16 -7.6'), 'hair')
    ic.wire(L('M0 3 L0 -20'), 'thin', cap='butt')
    ic.shape(poly((0, -26), (1.8, -20.4), (0, -21.4), (-1.8, -20.4)), tone=.3)
    ic.shape(band('M-16.6 -7 C-11 -12.8 -5 -15 0 -15 C5 -15 11 -12.8 16.6 -7', [(0, .55), (.5, 1.3), (1, .55)]))
    ic.shape(ring(0, -17.6, 2.4, .8).difference(R(-3, -16.2, 6, 3)), tone=.3)
    return ic.place(D45, 45)


def crossbow_b():
    ic = Icon()
    ic.shape(S('M-2.4 -15 L2.4 -15 L2.8 11 L4.6 24 L-4.6 24 L-2.8 11 Z'), tone=.3)
    ic.wire(L('M-16 -7.6 L0 3.6 L16 -7.6'), 'thin')
    ic.wire(L('M0 3.6 L0 -20'), 'thick', cap='butt')
    ic.shape(poly((0, -27), (2.6, -20.4), (-2.6, -20.4)), tone=.3)
    ic.shape(band('M-17 -6.6 C-11 -13 -5 -15.4 0 -15.4 C5 -15.4 11 -13 17 -6.6', [(0, .9), (.5, 2), (1, .9)]))
    return ic.place(D45, 45)


# ---------------------------------------------------------------- ballista (Jar Cannon)

JAR = 'M0 -24 L4.6 -24 L5 -22.4 L3.6 -21.6 C3.4 -19.6 3.8 -17.6 5.6 -15.2 C9.8 -9.6 10.8 -2.4 9.8 3.6 C8.8 9.4 5.2 13 0 13'


def ballista_a():
    ic = Icon()
    body = M(JAR)
    ic.shape(ring(-10.6, -4.4, 2.8, 1), tone=.3)
    ic.shape(ring(10.6, -4.4, 2.8, 1), tone=.3)
    ic.shape(body)
    ic.detail(hlines(-4, 4, [-20.4]))
    ic.detail(MultiLineString([LineString([(-7.6, -11), (7.6, -11)]), LineString([(-9.8, 4), (9.8, 4)])]), fine=True)
    ic.detail(L('M-5 -8 C-6.6 -3 -6.4 2 -5 6'), fine=True)
    ic.shape(E(0, -23.8, 3.4, .9), tone=.6, outline=False)
    ic.shape(R(-5.2, 13, 10.4, 2.6), tone=.3)
    return ic.place(D45, 42)


def ballista_b():
    ic = Icon()
    body = M('M0 -22 L5.6 -22 L6 -20 L4.4 -19 C4.2 -17 4.6 -15 6.6 -12.6 C11 -7 12 0 11 5.6 C10 11 6 14.6 0 14.6')
    ic.shape(ring(-11.8, -2, 3.2, 1.3), tone=.3)
    ic.shape(ring(11.8, -2, 3.2, 1.3), tone=.3)
    ic.shape(body)
    ic.detail(hlines(-5, 5, [-17.6]))
    ic.detail(hlines(-10.6, 10.6, [5.4]))
    for x, y, r in ((0, -26.4, 2.4), (-3.4, -28.6, 1.7), (3.2, -29.2, 1.9)):
        ic.shape(C(x, y, r), tone=.17)
    ic.shape(R(-6, 14.6, 12, 2.8), tone=.3)
    return ic.place(D45, 42)


# ---------------------------------------------------------------- glintstone staff

def staff_a():
    ic = Icon()
    ic.shape(poly((-0.9, -12), (0.9, -12), (1.1, 28), (-1.1, 28)))
    ic.shape(R(-1.5, 4, 3, 8), tone=.3)
    ic.detail(wraps(-1.5, 1.5, 4, 12, 1.8), fine=True)
    ic.shape(poly((-1.1, 28), (1.1, 28), (0, 31.4)), tone=.3)
    ic.shape(poly((0, -29.6), (2.7, -24.4), (2.1, -17.4), (0, -15.6), (-2.1, -17.4), (-2.7, -24.4)), tone=.45)
    ic.detail(MultiLineString([LineString([(0, -29.6), (0, -15.6)]), LineString([(-2.7, -24.4), (0, -22.6), (2.7, -24.4)])]), fine=True)
    ic.shape(band('M-1.4 -13 C-4.6 -15.6 -4.8 -20.4 -2.8 -24.4', [(0, .75), (1, .3)]), tone=.3)
    ic.shape(band('M1.4 -13 C4.6 -15.6 4.8 -20.4 2.8 -24.4', [(0, .75), (1, .3)]), tone=.3)
    ic.shape(R(-2, -13.6, 4, 2), tone=.3)
    return ic.place(D45, 46)


def staff_b():
    ic = Icon()
    ic.shape(poly((-1.3, -12), (1.3, -12), (1.5, 28), (-1.5, 28)))
    ic.shape(poly((-1.5, 28), (1.5, 28), (0, 31.6)), tone=.3)
    ic.shape(band('M-1.4 -12 C-6.4 -14 -7.6 -20 -5 -25.6', [(0, 1.2), (1, .5)]), tone=.3)
    ic.shape(band('M1.4 -12 C6.4 -14 7.6 -20 5 -25.6', [(0, 1.2), (1, .5)]), tone=.3)
    ic.shape(poly((0, -30.6), (4.2, -24.4), (3.2, -16.6), (0, -14.4), (-3.2, -16.6), (-4.2, -24.4)), tone=.45)
    ic.detail(L('M-4.2 -24.4 L0 -21.8 L4.2 -24.4 M0 -21.8 L0 -14.4'))
    ic.shape(R(-2.4, -13.4, 4.8, 2.4), tone=.3)
    return ic.place(D45, 46)

# ---------------------------------------------------------------- sacred seal

def seal_a():
    ic = Icon()
    ic.shape(poly((-1.4, 4), (1.4, 4), (1.7, 21), (-1.7, 21)), tone=.3)
    ic.detail(wraps(-1.6, 1.6, 8, 20, 2), fine=True)
    ic.shape(R(-2.6, 4.4, 5.2, 2.2), tone=.3)
    ic.shape(C(0, 22.6, 2.2), tone=.3)
    lobes = U(C(0, -11, 3.8), C(0, -1, 3.8), C(-5, -6, 3.8), C(5, -6, 3.8))
    ic.shape(ring(0, -6, 11.4, 1.8), tone=.3)
    ic.shape(lobes)
    ic.detail(lobes.buffer(-1.3).exterior, fine=True)
    ic.shape(C(0, -6, 2.2), tone=.45)
    return ic.place(0, 42)


def seal_b():
    ic = Icon()
    ic.shape(poly((-1.8, 4), (1.8, 4), (2.1, 21), (-2.1, 21)), tone=.3)
    ic.shape(R(-3.2, 4.4, 6.4, 2.8), tone=.3)
    ic.shape(C(0, 23, 2.7), tone=.3)
    disc = C(0, -6, 11.6)
    ic.shape(disc, tone=.3)
    rays = []
    for k in range(8):
        a = math.radians(k * 45)
        rays.append(LineString([(4.4 * math.sin(a), -6 - 4.4 * math.cos(a)), (8.6 * math.sin(a), -6 - 8.6 * math.cos(a))]))
    ic.detail(MultiLineString(rays))
    ic.detail(C(0, -6, 2.6).exterior)
    return ic.place(0, 42)


# ---------------------------------------------------------------- thrusting shield

def thrust_shield_a():
    ic = Icon()
    ic.shape(poly((0, -31), (1.1, -20), (-1.1, -20)), tone=.3)
    ic.shape(poly((0, 29), (1.1, 18), (-1.1, 18)), tone=.3)
    body = S('M-2.4 -21 L2.4 -21 L6.2 -15 L6.2 11 L2.4 19 L-2.4 19 L-6.2 11 L-6.2 -15 Z')
    ic.shape(body)
    ic.detail(body.buffer(-1.5, join_style='mitre').exterior, fine=True)
    ic.detail(L('M0 -18 L0 -5.6 M0 1.6 L0 16'))
    ic.shape(C(0, -2, 2.8), tone=.45)
    return ic.place(D45, 46)

def thrust_shield_b():
    ic = Icon()
    ic.shape(poly((0, -31.6), (1.6, -19.6), (-1.6, -19.6)), tone=.3)
    ic.shape(poly((0, 29.6), (1.6, 17.6), (-1.6, 17.6)), tone=.3)
    body = S('M-3 -20.6 L3 -20.6 L7.4 -14 L7.4 10 L3 18.6 L-3 18.6 L-7.4 10 L-7.4 -14 Z')
    ic.shape(body)
    ic.shape(R(-7.4, -4.4, 14.8, 4.8).intersection(body), tone=.45)
    ic.detail(L('M0 -18 L0 -6 M0 2.2 L0 16'))
    return ic.place(D45, 46)

# ---------------------------------------------------------------- torch

FLAME = ('M0 0 C-4.6 0 -6.4 -3.4 -5.4 -7 C-4.8 -9.4 -3 -10.6 -2.8 -13.6 C-1.4 -12 -1 -10.4 -1.2 -9 '
         'C0 -11.6 1.6 -14.4 1.2 -18 C4 -15.6 5.6 -12 5.4 -8.6 C6.2 -9.4 6.6 -10.6 6.6 -11.8 '
         'C8 -9.4 7.8 -5.6 6.2 -3 C5 -1 2.8 0 0 0 Z')
INNER = 'M0.6 -1.6 C-1.8 -1.6 -2.8 -3.4 -2.2 -5.4 C-1.6 -7 -0.4 -7.6 0.2 -9.8 C2 -8 3 -6 2.8 -4 C2.6 -2.6 1.8 -1.6 0.6 -1.6 Z'


def torch_a():
    ic = Icon()
    hd = Icon()
    hd.shape(poly((-1.2, -10), (1.2, -10), (1.6, 24), (-1.6, 24)))
    hd.detail(wraps(-1.6, 1.6, 14, 24, 2), fine=True)
    hd.shape(S('M-2.8 -16.6 L2.8 -16.6 L2.2 -9.4 L-2.2 -9.4 Z'), tone=.3)
    hd.detail(MultiLineString([LineString([(-2.7, -14.4), (2.7, -13.2)]), LineString([(-2.5, -12), (2.5, -10.8)])]))
    for p in hd.parts:
        p['g'] = rot(p['g'], 38)
    hx, hy = 16.6 * math.sin(math.radians(38)), -16.6 * math.cos(math.radians(38))
    ic.parts = hd.parts
    ic.shape(mv(sc(S(FLAME), 1.05), hx, hy + 1.2))
    ic.shape(mv(S(INNER), hx + .2, hy + .4), tone=.45, fine=True)
    return ic.place(0, 44)


def torch_b():
    ic = Icon()
    hd = Icon()
    hd.shape(poly((-1.7, -10), (1.7, -10), (2.1, 24), (-2.1, 24)))
    hd.shape(S('M-3.4 -16.6 L3.4 -16.6 L2.8 -9 L-2.8 -9 Z'), tone=.3)
    for p in hd.parts:
        p['g'] = rot(p['g'], 38)
    hx, hy = 16.6 * math.sin(math.radians(38)), -16.6 * math.cos(math.radians(38))
    ic.parts = hd.parts
    flame = mv(sc(S('M0 0 C-5.6 0 -8 -4 -6.6 -8.6 C-5.6 -12 -2.4 -13.6 -1.6 -18 C1 -16 1.8 -13.6 1.4 -11.4 '
                    'C3 -13.4 4.4 -16 4.2 -19.6 C8 -16.4 9.2 -10.8 8 -6.4 C6.8 -2.2 3.6 0 0 0 Z'), 1.05), hx, hy + 1.6)
    ic.shape(flame)
    ic.detail(mv(sc(S(INNER), 1.2), hx + .2, hy + .2).exterior)
    return ic.place(0, 44)


# ---------------------------------------------------------------- perfume bottle

def perfume_a():
    ic = Icon()
    for x in (-5.2, 5.2):
        ic.shape(C(x, 8, 6.8), tone=.3)
        ic.detail(L(f'M{x-3.8} 5.6 C{x-3.2} 3.4 {x-1.8} 2.4 {x} 2.2'), fine=True)
        ic.shape(R(x - 1.4, -9, 2.8, 11.4))
    ic.shape(R(-8.4, -11.6, 16.8, 3), tone=.3)
    ic.shape(R(-1.4, -18.6, 2.8, 7))
    ic.shape(poly((-2.4, -18.4), (2.4, -18.4), (1.6, -21.6), (-1.6, -21.6)), tone=.3)
    return ic.place(0, 40)

def perfume_b():
    ic = Icon()
    ic.wire(L('M7.8 -9 C10.6 -9 12.4 -6.6 12.4 -3.6 L12.4 0'), 'thin')
    ic.shape(E(12.4, 4.4, 3.4, 4.6), tone=.45)
    ic.shape(S('M-6.4 -4 L6.4 -4 L9 0 L9 14 L6.4 18 L-6.4 18 L-9 14 L-9 0 Z'), tone=.3)
    ic.detail(L('M-6 0 L-6 14'))
    ic.shape(R(-2.4, -9, 4.8, 5))
    ic.shape(R(-4, -12, 8, 3), tone=.3)
    ic.shape(R(2.4, -10.4, 5.6, 1.6))
    for x, y, r in ((-4.4, -16.4, 1.3), (-7.6, -18.8, 1.1), (-3, -20.6, 1), (-6.6, -23.4, .9), (-10.2, -16, .9)):
        ic.shape(C(x, y, r), tone=1, outline=False)
    return ic.place(0, 40)

# ---------------------------------------------------------------- shields

def small_shield_a():
    ic = Icon()
    face = C(0, 0, 16)
    ic.shape(face)
    ic.shape(U(R(-16, -2.2, 32, 4.4), R(-2.2, -16, 4.4, 32)).intersection(face), tone=.3)
    ic.shape(ring(0, 0, 18, 2.2), tone=.3)
    for k in range(8):
        a = math.radians(22.5 + k * 45)
        ic.pip(C(16.9 * math.cos(a), 16.9 * math.sin(a), .55), fine=True)
    ic.shape(C(0, 0, 5), tone=.45)
    ic.detail(C(0, 0, 2.6).exterior, fine=True)
    return ic.place(0, 40)


def small_shield_b():
    ic = Icon()
    ic.shape(C(0, 0, 15.4))
    ic.shape(ring(0, 0, 18.4, 3), tone=.3)
    ic.shape(C(0, 0, 6), tone=.45)
    for k in range(4):
        a = math.radians(45 + k * 90)
        ic.pip(C(10.6 * math.cos(a), 10.6 * math.sin(a), 1.4))
    return ic.place(0, 40)


HEATER = 'M0 -19 C6 -19.6 11 -19.2 15 -17.4 C15.6 -4 12.4 8.6 0 21'


def medium_shield_a():
    ic = Icon()
    body = M(HEATER)
    ic.shape(body)
    inner = body.buffer(-2.4, join_style='mitre', mitre_limit=3)
    ic.detail(inner.exterior)
    chevron = poly((-12, -6.6), (0, 2.4), (12, -6.6), (12, -1.6), (0, 7.6), (-12, -1.6)).intersection(inner)
    ic.shape(chevron, tone=.45)
    for x, y in ((-10.6, -14.6), (10.6, -14.6), (0, 14.4)):
        ic.pip(C(x, y, .6), fine=True)
    return ic.place(0, 42)


def medium_shield_b():
    ic = Icon()
    body = M(HEATER)
    inner = body.buffer(-3, join_style='mitre', mitre_limit=3)
    ic.shape(inner)
    ic.shape(body.difference(inner), tone=.3)
    ic.shape(R(-15, -9, 30, 4.4).intersection(inner), tone=.45)
    return ic.place(0, 42)


TOWER = 'M0 -21.6 L10.2 -21.6 L12.8 -25 L13.4 -10 L12.8 9.6 C10.6 16.6 6 21.6 0 25.6'


def greatshield_a():
    ic = Icon()
    body = M(TOWER)
    ic.shape(body)
    ic.detail(body.buffer(-2.2, join_style='mitre', mitre_limit=3).exterior)
    ic.shape(ring(0, -2, 6, 1.6), tone=.45)
    ic.shape(C(1.4, -2.6, 3), tone=.17)
    for x, y in ((-9.8, -18.6), (9.8, -18.6), (-10.4, 6), (10.4, 6)):
        ic.pip(C(x, y, .6), fine=True)
    return ic.place(0, 45)


def greatshield_b():
    ic = Icon()
    body = S('M-11.4 -25 L11.4 -25 L12.6 -23.6 L12.6 23.6 L11.4 25 L-11.4 25 L-12.6 23.6 L-12.6 -23.6 Z')
    ic.shape(body)
    ic.shape(R(-2.8, -25, 5.6, 50), tone=.45)
    for x in (-8, 8):
        for y in (-19, 0, 19):
            ic.pip(C(x, y, 1.2))
    return ic.place(0, 45)


RANGED = [
    ('light_bow', 'Light bow', light_bow_a, light_bow_b),
    ('bow', 'Bow', bow_a, bow_b),
    ('greatbow', 'Greatbow', greatbow_a, greatbow_b),
    ('crossbow', 'Crossbow', crossbow_a, crossbow_b),
    ('ballista', 'Ballista', ballista_a, ballista_b),
]
CATALYSTS = [
    ('glintstone_staff', 'Glintstone staff', staff_a, staff_b),
    ('sacred_seal', 'Sacred seal', seal_a, seal_b),
]
ODD = [
    ('thrusting_shield', 'Thrusting shield', thrust_shield_a, thrust_shield_b),
    ('torch', 'Torch', torch_a, torch_b),
    ('perfume_bottle', 'Perfume bottle', perfume_a, perfume_b),
]
SHIELDS = [
    ('small_shield', 'Small shield', small_shield_a, small_shield_b),
    ('medium_shield', 'Medium shield', medium_shield_a, medium_shield_b),
    ('greatshield', 'Greatshield', greatshield_a, greatshield_b),
]
ICONS = RANGED + CATALYSTS + ODD + SHIELDS
