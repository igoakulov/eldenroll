"""Axes, hammers, polearms, flails, whips and fist weapons."""
import math

from shapely.geometry import LineString, MultiLineString

from geo import (C, E, Icon, L, M, ML, R, S, U, band, hlines, mv, poly, ring, rot, sc, star, taper, wraps)

D45 = 45


def _haft(ic, y0, y1, w0, w1, grip=None, pommel=None, tone=.17):
    ic.shape(poly((-w0 / 2, y0), (w0 / 2, y0), (w1 / 2, y1), (-w1 / 2, y1)), tone=tone)
    if grip:
        g0, g1 = grip
        ic.detail(wraps(-w1 / 2, w1 / 2, g0, g1, 2), fine=True)
    if pommel is not None:
        ic.shape(pommel, tone=.3)


# ---------------------------------------------------------------- axe

def axe_a():
    ic = Icon()
    _haft(ic, -21, 24, 2.4, 2.9, grip=(14, 24), pommel=E(0, 25, 2, 1.3))
    ic.shape(S('M1.6 -21.4 C5 -21.8 8 -24 9.8 -26.6 C12.6 -21.6 12.8 -13 10.2 -7.4 C8.6 -10.4 5.6 -14.8 1.6 -15.4 Z'))
    ic.detail(L('M9.6 -24 C11.2 -20 11.2 -13.6 9.8 -10'), fine=True)
    ic.shape(poly((-1.6, -21), (-5.2, -19.4), (-5.6, -17.6), (-1.6, -16.6)), tone=.3)
    ic.shape(R(-1.9, -22.4, 3.8, 8), tone=.3)
    ic.pip(C(0, -18.4, .7), fine=True)
    return ic.place(D45, 42)


def axe_b():
    ic = Icon()
    _haft(ic, -20, 24, 3, 3.4, pommel=C(0, 25.4, 2))
    ic.shape(S('M2 -22.6 C5.6 -23 9.4 -25.6 11.4 -28 C14.6 -21 14.6 -12 11.6 -5.6 C9.4 -9 6 -13.4 2 -13.8 Z'))
    ic.shape(R(-2.4, -23.4, 4.8, 10.6), tone=.3)
    return ic.place(D45, 42)


# ---------------------------------------------------------------- greataxe

def _bit(scale=1.0):
    return S('M2.4 -23 C6 -23.6 9.4 -26 11 -28.6 C14.4 -23 14.4 -13.4 11 -8 C9.4 -10.6 6 -13.4 2.4 -14.6 Z')


def greataxe_a():
    ic = Icon()
    _haft(ic, -24, 28, 2.6, 3.1, grip=(17, 27), pommel=None)
    right = _bit()
    ic.shape(right)
    ic.shape(sc(right, -1, 1))
    ic.detail(ML('M10.8 -25.6 C12.8 -21.6 12.8 -15.2 10.8 -10.8'), fine=True)
    ic.shape(poly((-1.4, -25), (0, -29.6), (1.4, -25)), tone=.3)
    ic.shape(R(-2.4, -25, 4.8, 11.2), tone=.3)
    ic.pip(C(0, -19.4, .75), fine=True)
    ic.shape(R(-1.9, 27, 3.8, 1.8), tone=.3)
    return ic.place(D45, 46)


def greataxe_b():
    ic = Icon()
    _haft(ic, -22, 28, 3.2, 3.6, pommel=R(-2.2, 27.4, 4.4, 2.2))
    right = S('M2.8 -24.6 C6.6 -25.2 10.4 -27.6 12.2 -30 C16.2 -23.6 16.2 -12.6 12.2 -6.4 C10.4 -9.6 6.6 -12.6 2.8 -13.8 Z')
    ic.shape(right)
    ic.shape(sc(right, -1, 1))
    ic.shape(R(-2.8, -25.8, 5.6, 13.2), tone=.3)
    return ic.place(D45, 46)


# ---------------------------------------------------------------- hammer (mace)

def hammer_a():
    ic = Icon()
    _haft(ic, -8, 26, 2.4, 2.8, grip=(14, 26), pommel=C(0, 27, 1.9))
    ic.shape(R(-2.2, -9.6, 4.4, 2.6), tone=.3)
    head = U(C(0, -16.4, 5.6), star(0, -16.4, 9.6, 4.4, 8, 22.5))
    ic.shape(head)
    ic.shape(poly((-1.2, -21.6), (0, -27), (1.2, -21.6)))
    ic.detail(C(0, -16.4, 3.2).exterior, fine=True)
    return ic.place(D45, 42)


def hammer_b():
    ic = Icon()
    _haft(ic, -6, 26, 3, 3.4, pommel=C(0, 27.2, 2.3))
    ic.shape(E(0, -15, 4.2, 9), tone=.3)
    fin = S('M3 -22 L8.4 -19.6 L8.4 -10.4 L3 -8 Z')
    ic.shape(fin)
    ic.shape(sc(fin, -1, 1))
    ic.shape(R(-1.6, -24.6, 3.2, 19.2))
    ic.shape(C(0, -26, 2), tone=.3)
    return ic.place(D45, 42)


# ---------------------------------------------------------------- great hammer

def great_hammer_a():
    ic = Icon()
    _haft(ic, -18, 28, 2.7, 3.1, grip=(17, 28))
    head = poly((-10, -26.6), (10, -26.6), (11, -25.6), (11, -18.4), (10, -17.4), (-10, -17.4), (-11, -18.4), (-11, -25.6))
    ic.shape(head)
    ic.detail(MultiLineString([LineString([(-6, -26.6), (-6, -17.4)]), LineString([(6, -26.6), (6, -17.4)])]))
    ic.shape(R(-2.3, -17.4, 4.6, 3.2), tone=.3)
    ic.shape(poly((-1.2, -26.6), (0, -29.6), (1.2, -26.6)), tone=.3)
    ic.shape(R(-1.9, 28, 3.8, 1.8), tone=.3)
    return ic.place(D45, 45)


def great_hammer_b():
    ic = Icon()
    _haft(ic, -16, 28, 3.2, 3.6)
    ic.shape(R(-11.6, -28, 23.2, 12.4))
    ic.shape(R(-13, -29.2, 2.6, 14.8), tone=.3)
    ic.shape(R(10.4, -29.2, 2.6, 14.8), tone=.3)
    ic.shape(R(-2.6, -15.6, 5.2, 3), tone=.3)
    ic.shape(R(-2.2, 28, 4.4, 2.2), tone=.3)
    return ic.place(D45, 45)


# ---------------------------------------------------------------- colossal weapon

def colossal_weapon_a():
    ic = Icon()
    _haft(ic, -10, 28, 3.4, 3.8, grip=(16, 28))
    head = poly((-8.6, -28.4), (5.6, -29.6), (9.6, -26), (10, -12.4), (7.4, -9.6), (-7.4, -10.4), (-10.4, -13.8), (-10.6, -24.4))
    ic.shape(head)
    ic.detail(MultiLineString([LineString([(-4, -29), (-2.6, -24.4), (-4.4, -20)]), LineString([(9.8, -20), (6, -18.4), (4.6, -14)]),
                               LineString([(-10.5, -17), (-7, -16)])]), fine=True)
    ic.shape(R(-2.8, -11, 5.6, 3.2), tone=.3)
    ic.detail(hlines(-2.8, 2.8, [-9.4]), fine=True)
    ic.shape(R(-2.4, 28, 4.8, 2), tone=.3)
    return ic.place(D45, 46)


def colossal_weapon_b():
    ic = Icon()
    ic.shape(S('M-2.2 28 L2.2 28 L4.6 -6 C7.8 -12 9 -19 7.6 -24.6 C6 -29.6 -6 -29.6 -7.6 -24.6 C-9 -19 -7.8 -12 -4.6 -6 Z'))
    for (x, y) in ((-3.4, -23), (3.4, -23), (0, -18), (-4.6, -14), (4.6, -14), (0, -10)):
        ic.pip(C(x, y, 1.1))
    ic.shape(R(-2.6, 18, 5.2, 10), tone=.3)
    ic.shape(R(-3, 28, 6, 2.4), tone=.3)
    return ic.place(D45, 46)


# ---------------------------------------------------------------- flail

def _chain(pts, rx, ry):
    links = []
    for k, (x, y) in enumerate(pts):
        nxt = pts[min(k + 1, len(pts) - 1)]
        prv = pts[max(k - 1, 0)]
        ang = math.degrees(math.atan2(nxt[1] - prv[1], nxt[0] - prv[0]))
        links.append((E(x, y, rx, ry, ang), k % 2))
    return links


def flail_a():
    ic = Icon()
    _haft(ic, 4, 28, 2.6, 3, grip=(16, 28), pommel=C(0, 28.8, 1.9))
    ic.shape(R(-2.1, 2.2, 4.2, 2.4), tone=.3)
    ic.shape(ring(0, 1, 1.4, .7), tone=.3)
    pts = [(0.6, -1.6), (1.8, -4.6), (3.4, -7.4), (5, -10)]
    for g, odd in _chain(pts, 1.6, .95):
        ic.shape(g.difference(g.buffer(-.7)) if not odd else g, tone=.3 if odd else .17)
    ball = U(C(8, -17, 5.2), star(8, -17, 8.8, 4, 8, 10))
    ic.shape(ball)
    ic.detail(C(8, -17, 2.8).exterior, fine=True)
    return ic.place(D45, 42)


def flail_b():
    ic = Icon()
    _haft(ic, 4, 28, 3.2, 3.6, pommel=C(0, 29.2, 2.3))
    ic.shape(R(-2.6, 1.6, 5.2, 2.8), tone=.3)
    ic.wire(L('M0 1.4 C0 -4 2 -8 5.6 -10.6'), 'thick')
    for (x, y) in ((0.2, -1.6), (1.2, -5.2), (3.2, -8.6)):
        ic.pip(C(x, y, .55))
    ic.shape(U(C(8.6, -17.6, 5.8), star(8.6, -17.6, 9.6, 4.4, 8, 10)))
    return ic.place(D45, 42)


# ---------------------------------------------------------------- spear

def spear_a():
    ic = Icon()
    _haft(ic, -12, 28, 1.9, 2.2, grip=(8, 16))
    ic.shape(M('M0 -28.4 C1.7 -24.4 2.8 -20.6 2.8 -18 C2.8 -16.4 2 -15.4 1.3 -15.2 L0 -15.2'))
    ic.detail(L('M0 -25.6 L0 -16'), fine=True)
    lug = S('M1.2 -15.4 C3 -15.4 4.4 -16.4 5.2 -18.2 L5.8 -17.6 C5.2 -15 3.6 -13.4 1.2 -13.4 Z')
    ic.shape(lug, tone=.3)
    ic.shape(sc(lug, -1, 1), tone=.3)
    ic.shape(R(-1.4, -15.2, 2.8, 3.6), tone=.3)
    ic.shape(poly((-1.1, 28), (1.1, 28), (0, 30.6)), tone=.3)
    return ic.place(D45, 46)


def spear_b():
    ic = Icon()
    _haft(ic, -12, 28, 2.4, 2.8)
    ic.shape(M('M0 -29 C2.6 -24.6 4 -20 4 -17 C4 -14.8 2.8 -13.4 1.6 -13 L0 -13'))
    ic.detail(L('M0 -25.4 L0 -14.6'))
    ic.shape(R(-1.7, -13, 3.4, 3.4), tone=.3)
    ic.shape(R(-1.7, 8, 3.4, 8), tone=.3)
    ic.shape(poly((-1.4, 28), (1.4, 28), (0, 31.4)), tone=.3)
    return ic.place(D45, 46)


# ---------------------------------------------------------------- great spear

def great_spear_a():
    ic = Icon()
    _haft(ic, -4, 28, 2.9, 3.3, grip=(12, 22))
    ic.shape(M('M0 -30 C3.6 -24 5.6 -16.6 5.6 -10.6 C5.6 -8.4 4.4 -6.6 2.6 -5.6 L0 -5.6'))
    ic.detail(L('M0 -26.6 L0 -7'), fine=True)
    ic.detail(ML('M2.4 -21 C3.6 -17 4 -13 3.6 -9.4'), fine=True)
    ic.shape(S('M-8.6 -6 L8.6 -6 L10 -4.4 L8.6 -2.8 L-8.6 -2.8 L-10 -4.4 Z'), tone=.3)
    ic.shape(R(-2.1, -2.8, 4.2, 3.4), tone=.3)
    ic.shape(poly((-1.6, 28), (1.6, 28), (0, 31)), tone=.3)
    return ic.place(D45, 46)


def great_spear_b():
    ic = Icon()
    ic.shape(M('M0 -29 L4.6 4 L0 4'))
    ic.detail(MultiLineString([LineString([(-0.8, -20), (1.8, -16.4)]), LineString([(-2, -11), (2.8, -5)]),
                               LineString([(-3, -2), (3.6, 3)])]))
    ic.shape(E(0, 5.8, 8.2, 2.2), tone=.3)
    ic.shape(R(-1.7, 8, 3.4, 13), tone=.3)
    ic.shape(C(0, 23.2, 2.4), tone=.3)
    return ic.place(D45, 46)


# ---------------------------------------------------------------- halberd

def halberd_a():
    ic = Icon()
    _haft(ic, -13, 28, 2.1, 2.4, grip=(10, 18))
    ic.shape(M('M0 -30 L1.1 -24.6 L1.1 -21 L0 -21'))
    ic.shape(S('M1.4 -22.4 C4.4 -22.6 7.4 -24 9 -26.4 C11 -22.4 11 -15 9 -11 C7.4 -13.2 4.4 -14.6 1.4 -14.8 Z'))
    ic.detail(L('M8.8 -23.8 C10 -20.6 10 -16 8.8 -13.4'), fine=True)
    ic.shape(S('M-1.4 -21.6 C-3.8 -21 -5.8 -19.4 -7 -16.4 C-5 -17.2 -3.2 -17.6 -1.4 -17.8 Z'), tone=.3)
    ic.shape(R(-1.6, -22.6, 3.2, 9.6), tone=.3)
    ic.pip(C(0, -16.4, .6), fine=True)
    return ic.place(D45, 46)


def halberd_b():
    ic = Icon()
    _haft(ic, -13, 28, 2.6, 3)
    ic.shape(M('M0 -31 L1.6 -24 L1.6 -21 L0 -21'))
    ic.shape(S('M1.8 -23.4 C5.4 -23.6 9 -25.4 10.8 -28.4 C13.4 -23 13.4 -14 10.8 -9 C9 -11.8 5.4 -13.6 1.8 -13.8 Z'))
    ic.shape(S('M-1.8 -22 C-4.6 -21.2 -7 -19 -8.4 -15.4 C-6 -16.4 -3.8 -16.8 -1.8 -17 Z'), tone=.3)
    ic.shape(R(-2, -23.6, 4, 11.2), tone=.3)
    return ic.place(D45, 46)


# ---------------------------------------------------------------- reaper

def reaper_a():
    ic = Icon()
    _haft(ic, -24, 28, 2.1, 2.5, grip=(18, 28))
    ic.shape(R(1.2, 3.6, 5, 1.9), tone=.3)
    ic.shape(C(6.6, 4.55, 1.3), tone=.3)
    ic.shape(S('M1.2 -23.6 C-5 -29 -15 -28.6 -22.6 -18 C-15.6 -23.4 -7 -24 1.2 -20.2 Z'))
    ic.detail(L('M-1.6 -24.6 C-8 -26.4 -14 -25 -19 -20.6'), fine=True)
    ic.shape(R(-1.6, -25, 3.2, 6), tone=.3)
    return ic.place(D45, 46)


def reaper_b():
    ic = Icon()
    _haft(ic, -23, 28, 2.8, 3.2)
    ic.shape(S('M1.6 -24.6 C-5 -30.6 -16 -30 -24 -17 C-16.4 -22.4 -7 -22.6 1.6 -19.4 Z'))
    ic.shape(R(-2.1, -26, 4.2, 7.6), tone=.3)
    ic.shape(R(-2.1, 20, 4.2, 8), tone=.3)
    return ic.place(D45, 46)


# ---------------------------------------------------------------- whip

def whip_a():
    ic = Icon()
    ic.ribbon('M0 9 C0 2 -4 -3 -9 -7.6 C-14 -12 -14.4 -21 -7.6 -24.4 C-1 -27.6 6 -23.6 5.6 -17 '
              'C5.2 -11.4 -1 -9.6 -4.6 -13.4 C-6.6 -15.6 -6.4 -19 -4 -20.6', 'thick', 'hair')
    ic.shape(poly((-1.4, 9), (1.4, 9), (1.7, 25), (-1.7, 25)), tone=.3)
    ic.detail(wraps(-1.6, 1.6, 9, 25, 2), fine=True)
    ic.shape(R(-2.2, 7.6, 4.4, 1.8), tone=.3)
    ic.shape(E(0, 26.4, 2.4, 1.6), tone=.3)
    return ic.place(30, 42)


def whip_b():
    ic = Icon()
    ic.shape(band('M0 8 C0 0 -6 -4 -10.6 -9 C-15 -14 -14 -23 -7 -25.6 C0 -28 6.6 -23 5.6 -16.4 C4.6 -10.6 -2 -9.4 -5 -13.6',
                  [(0, 1.7), (.4, 1.1), (1, .45)], n=80))
    ic.shape(poly((-1.8, 8), (1.8, 8), (2.1, 25), (-2.1, 25)), tone=.3)
    ic.shape(C(0, 26.6, 2.7), tone=.3)
    return ic.place(30, 42)


# ---------------------------------------------------------------- fist

def fist_a():
    ic = Icon()
    ic.shape(band('M-6.6 6.4 C-6.6 15 6.6 15 6.6 6.4', 1.2), tone=.3)
    ball = U(C(0, -2, 8.4), star(0, -2, 13.6, 6.6, 10, 0))
    ic.shape(ball)
    ic.shape(R(-7.8, 3.6, 15.6, 3.6), tone=.3)
    ic.detail(C(0, -2, 4.6).exterior, fine=True)
    return ic.place(-20, 40)


def fist_b():
    ic = Icon()
    for k, x in enumerate((-9, -3, 3, 9)):
        ic.shape(poly((x - 1.2, -10.4), (x, -15.2), (x + 1.2, -10.4)), tone=.3)
    rings = U(*[C(x, -4.4, 3.4) for x in (-9, -3, 3, 9)], R(-12.4, -7.6, 24.8, 3.2))
    holes = U(*[C(x, -4.2, 1.7) for x in (-9, -3, 3, 9)])
    ic.shape(rings.difference(holes))
    ic.shape(S('M-11.4 -0.4 L11.4 -0.4 C10.4 3.6 6.6 5.8 0 5.8 C-6.6 5.8 -10.4 3.6 -11.4 -0.4 Z M-8.4 1.4 C-6.6 3 -3.6 3.6 0 3.6 C3.6 3.6 6.6 3 8.4 1.4 Z'), tone=.3)
    return ic.place(-20, 40)


# ---------------------------------------------------------------- claw

def claw_a():
    ic = Icon()
    for k, x in enumerate((-3.4, 0, 3.4)):
        ic.shape(band(f'M{x} 4 C{x*1.1} -8 {x*1.3-0.6} -18 {x*1.5+4} -27', [(0, 1.15), (.8, 1.05), (1, 0)], [(0, .7), (.8, 1.2), (1, 0)]))
    ic.shape(S('M-6.4 2 L6.4 2 L5.4 26 L-5.4 26 Z'), tone=.3)
    ic.detail(hlines(-6.2, 6.2, [6.4, 11]), fine=True)
    ic.detail(hlines(-5.8, 5.8, [18, 22]), fine=True)
    ic.shape(R(-7.4, 1, 14.8, 3.4), tone=.3)
    return ic.place(D45, 44)


def claw_b():
    ic = Icon()
    for x in (-4.4, 0, 4.4):
        ic.shape(band(f'M{x} 3 C{x*1.1} -8 {x*1.3-0.6} -17 {x*1.5+5} -26', [(0, 1.5), (.8, 1.4), (1, 0)], [(0, 1), (.8, 1.6), (1, 0)]))
    ic.shape(R(-8, 1.6, 16, 4), tone=.3)
    ic.shape(S('M-7 5.6 L7 5.6 L6 25 L-6 25 Z'), tone=.3)
    ic.detail(hlines(-6.6, 6.6, [12, 18]))
    return ic.place(D45, 44)


# ---------------------------------------------------------------- beast claw

def beast_claw_a():
    ic = Icon()
    tal = []
    for x, ang in ((-7.2, -18), (-2.6, -6), (2.6, 6), (7.2, 18)):
        t = band('M0 0 C-0.6 -7 1.6 -11.6 5.4 -12.6', [(0, 1.5), (1, 0)], [(0, 1.5), (1, 0)])
        tal.append(mv(rot(t, ang), x, -9))
    paw = S('M-9.6 -8 C-10.4 -2 -9 4 -7.2 8 L7.2 8 C9 4 10.4 -2 9.6 -8 C6 -10.4 -6 -10.4 -9.6 -8 Z')
    ic.shape(paw)
    for k, x in enumerate((-7.2, -2.6, 2.6, 7.2)):
        ic.shape(E(x, -8.4, 2.1, 2.4), tone=.3)
    for t in tal:
        ic.shape(t, tone=.45)
    fur = poly((-8.4, 7), (-9.6, 13), (-6.4, 10.6), (-5, 15.4), (-2.4, 11), (0, 16), (2.4, 11), (5, 15.4), (6.4, 10.6), (9.6, 13), (8.4, 7))
    ic.shape(fur, tone=.3)
    ic.detail(MultiLineString([LineString([(-4, -2), (-3, 3)]), LineString([(4, -2), (3, 3)])]), fine=True)
    return ic.place(0, 40)


def beast_claw_b():
    ic = Icon()
    paw = S('M-10 -6 C-10.6 0 -9.4 5 -7.6 9 L7.6 9 C9.4 5 10.6 0 10 -6 C6 -9 -6 -9 -10 -6 Z')
    ic.shape(paw)
    for x, ang in ((-6.6, -14), (0, 0), (6.6, 14)):
        t = band('M0 0 C-0.8 -9 2 -14.6 7 -15.6', [(0, 2.2), (1, 0)], [(0, 2.2), (1, 0)])
        ic.shape(mv(rot(t, ang), x, -7), tone=.45)
    fur = poly((-8.6, 8), (-10, 14.4), (-5.8, 11.4), (-3, 16.4), (0, 12), (3, 16.4), (5.8, 11.4), (10, 14.4), (8.6, 8))
    ic.shape(fur, tone=.3)
    return ic.place(0, 40)


# ---------------------------------------------------------------- hand-to-hand

def _fist(ic, bold):
    fingers = []
    for k, x in enumerate((-6.6, -2.2, 2.2, 6.6)):
        fingers.append(S(f'M{x-2.2} -2 L{x-2.2} -8.4 C{x-2.2} -10.8 {x+2.2} -10.8 {x+2.2} -8.4 L{x+2.2} -2 Z'))
    back = S('M-8.8 -4 L8.8 -4 L9.4 6 C9.4 9 7.4 11 4.6 11 L-6 11 C-8 11 -9.4 9.6 -9.4 7.4 Z')
    ic.shape(back)
    for f in fingers:
        ic.shape(f, tone=.3)
    ic.shape(S('M-9.6 1.6 C-12.6 1.6 -13 6.6 -9.8 8 L-2 8 C0 8 0.4 5.4 -1.6 4.6 L-6.8 3 Z'), tone=.3)
    ic.shape(S('M-6.6 11 L5.4 11 L6.2 22 L-7.4 22 Z'))
    lines = [LineString([(-6.6, 13.6), (5.8, 11.6)]), LineString([(-7, 17), (6, 14.8)]), LineString([(-7.2, 20.4), (6.2, 18.2)])]
    if bold:
        ic.detail(MultiLineString(lines[:2]))
    else:
        ic.detail(MultiLineString(lines))
        ic.detail(MultiLineString([LineString([(-8.6, 0), (8.6, -2.4)]), LineString([(-9, 5), (9, 2)])]), fine=True)
    return ic


def hand_to_hand_a():
    ic = Icon()
    _fist(ic, False)
    ic.wire(L('M4.6 19.4 C9 21 11 24 10.6 27.4'), 'thin')
    ic.parts.insert(6, ic.parts.pop())
    return ic.place(-15, 40)


def hand_to_hand_b():
    ic = Icon()
    _fist(ic, True)
    ic.shape(band('M6 19 C9.4 20 11.6 23.4 11 28', [(0, 1.6), (1, .9)]), tone=.3)
    return ic.place(-15, 40)


ICONS = [
    ('axe', 'Axe', axe_a, axe_b),
    ('greataxe', 'Greataxe', greataxe_a, greataxe_b),
    ('hammer', 'Hammer', hammer_a, hammer_b),
    ('great_hammer', 'Great hammer', great_hammer_a, great_hammer_b),
    ('colossal_weapon', 'Colossal weapon', colossal_weapon_a, colossal_weapon_b),
    ('flail', 'Flail', flail_a, flail_b),
    ('spear', 'Spear', spear_a, spear_b),
    ('great_spear', 'Great spear', great_spear_a, great_spear_b),
    ('halberd', 'Halberd', halberd_a, halberd_b),
    ('reaper', 'Reaper', reaper_a, reaper_b),
    ('whip', 'Whip', whip_a, whip_b),
    ('fist', 'Fist', fist_a, fist_b),
    ('claw', 'Claw', claw_a, claw_b),
    ('beast_claw', 'Beast claw', beast_claw_a, beast_claw_b),
    ('hand_to_hand', 'Hand-to-hand', hand_to_hand_a, hand_to_hand_b),
]
