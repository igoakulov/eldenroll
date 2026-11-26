"""Axes, the great hammer, the whip and hand-to-hand, with the haft `iconset.py` reuses."""

from shapely.geometry import LineString, MultiLineString

from geo import (C, E, Icon, L, ML, R, S, poly, sc, wraps)

D45 = 45


def _haft(ic, y0, y1, w0, w1, grip=None, pommel=None, tone=.17):
    ic.shape(poly((-w0 / 2, y0), (w0 / 2, y0), (w1 / 2, y1), (-w1 / 2, y1)), tone=tone)
    if grip:
        g0, g1 = grip
        ic.detail(wraps(-w1 / 2, w1 / 2, g0, g1, 2), fine=True)
    if pommel is not None:
        ic.shape(pommel, tone=.3)


# ---------------------------------------------------------------- axe

def axe():
    ic = Icon()
    _haft(ic, -21, 24, 2.4, 2.9, grip=(14, 24), pommel=E(0, 25, 2, 1.3))
    ic.shape(S('M1.6 -21.4 C5 -21.8 8 -24 9.8 -26.6 C12.6 -21.6 12.8 -13 10.2 -7.4 C8.6 -10.4 5.6 -14.8 1.6 -15.4 Z'))
    ic.detail(L('M9.6 -24 C11.2 -20 11.2 -13.6 9.8 -10'), fine=True)
    ic.shape(poly((-1.6, -21), (-5.2, -19.4), (-5.6, -17.6), (-1.6, -16.6)), tone=.3)
    ic.shape(R(-1.9, -22.4, 3.8, 8), tone=.3)
    ic.pip(C(0, -18.4, .7), fine=True)
    return ic.place(D45, 42)


# ---------------------------------------------------------------- greataxe

def _bit():
    return S('M2.4 -23 C6 -23.6 9.4 -26 11 -28.6 C14.4 -23 14.4 -13.4 11 -8 C9.4 -10.6 6 -13.4 2.4 -14.6 Z')


def greataxe():
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


# ---------------------------------------------------------------- great hammer

def great_hammer():
    ic = Icon()
    _haft(ic, -18, 28, 2.7, 3.1, grip=(17, 28))
    head = poly((-10, -26.6), (10, -26.6), (11, -25.6), (11, -18.4), (10, -17.4), (-10, -17.4), (-11, -18.4), (-11, -25.6))
    ic.shape(head)
    ic.detail(MultiLineString([LineString([(-6, -26.6), (-6, -17.4)]), LineString([(6, -26.6), (6, -17.4)])]))
    ic.shape(R(-2.3, -17.4, 4.6, 3.2), tone=.3)
    ic.shape(poly((-1.2, -26.6), (0, -29.6), (1.2, -26.6)), tone=.3)
    ic.shape(R(-1.9, 28, 3.8, 1.8), tone=.3)
    return ic.place(D45, 45)


# ---------------------------------------------------------------- whip

def whip():
    ic = Icon()
    ic.ribbon('M0 9 C0 2 -4 -3 -9 -7.6 C-14 -12 -14.4 -21 -7.6 -24.4 C-1 -27.6 6 -23.6 5.6 -17 '
              'C5.2 -11.4 -1 -9.6 -4.6 -13.4 C-6.6 -15.6 -6.4 -19 -4 -20.6', 'thick', 'hair')
    ic.shape(poly((-1.4, 9), (1.4, 9), (1.7, 25), (-1.7, 25)), tone=.3)
    ic.detail(wraps(-1.6, 1.6, 9, 25, 2), fine=True)
    ic.shape(R(-2.2, 7.6, 4.4, 1.8), tone=.3)
    ic.shape(E(0, 26.4, 2.4, 1.6), tone=.3)
    return ic.place(30, 42)


# ---------------------------------------------------------------- hand-to-hand

def _fist(ic):
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
    ic.detail(MultiLineString(lines))
    ic.detail(MultiLineString([LineString([(-8.6, 0), (8.6, -2.4)]), LineString([(-9, 5), (9, 2)])]), fine=True)
    return ic


def hand_to_hand():
    ic = Icon()
    _fist(ic)
    ic.wire(L('M4.6 19.4 C9 21 11 24 10.6 27.4'), 'thin')
    ic.parts.insert(6, ic.parts.pop())
    return ic.place(-15, 40)
