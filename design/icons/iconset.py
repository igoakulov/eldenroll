"""The approved icon set: line style, gold outline with a faint fill."""
import math

from shapely.geometry import LineString, MultiLineString, Point

import hafted
import misc
import ranged
import swords
from geo import (C, E, Icon, L, M, ML, R, S, U, _lines, band, band_line, hlines, mv, poly, ring, rot, sc, star, taper, wraps)
from ranged import FLAME

D45 = 45
_sword = swords._sword


# ---------------------------------------------------------------- blades

def dagger():
    ic = Icon()
    ic.shape(S('M-2.2 6 L-2.2 -12.6 C-2.2 -16.2 -1.9 -18.8 -1.1 -21.6 C1.8 -18.2 3.7 -13.4 3.8 -8.2 L3.5 6 Z'))
    ic.detail(L('M-0.4 -16.6 C1.2 -14 2 -11 2 -7.8 L1.9 4.6'), fine=True)
    ic.shape(S('M-4.4 6 L4.9 6 L5.5 8.2 L-5 8.2 Z'), tone=.3)
    ic.shape(S('M-1.9 8.2 L2.3 8.2 L2.6 15.8 L-2.2 15.8 Z'), tone=.3)
    ic.pip(C(.2, 10.6, .6), fine=True)
    ic.pip(C(.2, 13.4, .6), fine=True)
    ic.shape(S('M-2.8 15.8 L3.2 15.8 L2.7 18.8 L-2.3 18.8 Z'), tone=.3)
    return ic.place(D45, 37)


def straight_sword():
    return _sword(
        M('M0 -28 L1.05 -25.8 C1.55 -24.6 1.8 -23.2 1.8 -21.8 L1.9 8 L0 8'),
        M('M0 8 L4.4 8 C5 8 5.5 7.6 5.7 7 L6.3 7.3 L6.1 9.4 C5.7 10.2 5.1 10.6 4.4 10.6 L0 10.6'),
        R(-1.2, 10.6, 2.4, 8.4), C(0, 21.3, 2.3),
        fuller=L('M0 -20.4 L0 6'), wrap=wraps(-1.2, 1.2, 10.6, 19, 2), fit=44)


def greatsword():
    return _sword(
        M('M0 -28 L2.2 -24.6 C3.2 -23 3.6 -21.6 3.6 -20 L3.6 3 L2.7 4 L2.7 7 L0 7'),
        M('M0 7 L5.5 7 C7.6 7 9.2 5.8 10.2 3.8 L11.2 4.5 C10.4 7.8 8.2 9.8 5.5 9.8 L0 9.8'),
        R(-1.45, 9.8, 2.9, 9.4), M('M0 19.2 C1.9 19.2 3 20.4 3 21.8 C3 23.4 1.8 24.4 0 24.4'),
        fuller=ML('M0.9 -21 L0.9 1.6'), wrap=wraps(-1.45, 1.45, 9.8, 19.2, 2.2), fit=45)


def colossal_sword():
    return _sword(
        S('M-5.6 6 L-5.6 -21.6 L1.4 -28 L5.6 -26.4 L5.6 6 Z'),
        R(-7, 6, 14, 2.8),
        R(-1.6, 8.8, 3.2, 9.4), R(-2.4, 18.2, 4.8, 2.6),
        fuller=MultiLineString([LineString([(0, -20), (0, 3.4)]), LineString([(5.6, -14), (3.6, -12.6)]),
                                LineString([(-5.6, -6), (-4, -5)]), LineString([(5.6, -2), (4.2, -1.2)])]),
        wrap=wraps(-1.6, 1.6, 8.8, 18.2, 2.2), fit=46)


def light_greatsword():
    ic = Icon()
    ic.shape(M('M0 -28 L0.9 -23.6 L1.4 -17 L1.5 5.2 L0 5.2'))
    ic.detail(L('M0 -18 L0 4'), fine=True)
    ic.shape(U(swords._sguard(6.2, 6.4, .8), R(-2.1, 5.1, 4.2, 2.2)), tone=.3)
    ic.shape(R(-1.05, 7.3, 2.1, 5.3), tone=.3)
    ic.shape(E(0, 13.6, 1.9, 1.05), tone=.3)
    ic.shape(R(-1.05, 14.6, 2.1, 5.2), tone=.3)
    ic.detail(wraps(-1.05, 1.05, 7.4, 12.6, 1.9), fine=True)
    ic.detail(wraps(-1.05, 1.05, 14.6, 19.8, 1.9), fine=True)
    ic.shape(C(0, 21.6, 1.9), tone=.3)
    return ic.place(D45, 45)


def heavy_thrusting_sword():
    ic = Icon()
    ic.shape(M('M0 -28.6 L0.75 -21 L1.3 -12 L1.3 2.4 L0 2.4'))
    ic.detail(L('M0 -24 L0 1.6'))
    ic.shape(R(-1.6, 2.4, 3.2, 4.2), tone=.3)
    lug = S('M1.6 3 C3 2.6 3.8 1.6 4 0.2 L4.8 0.6 C4.8 2.6 3.6 4.2 1.6 4.4 Z')
    ic.shape(lug, tone=.3, fine=True)
    ic.shape(sc(lug, -1, 1), tone=.3, fine=True)
    ic.shape(M('M0 6.6 L6 6.6 C7.4 6.6 8.2 7.6 8.4 9.2 L7.4 9.2 C7.2 8.6 6.8 8.4 6 8.4 L0 8.4'), tone=.3)
    ic.shape(R(-1.3, 8.4, 2.6, 10), tone=.3)
    ic.detail(wraps(-1.3, 1.3, 8.4, 18.4, 2), fine=True)
    ic.shape(M('M0 18.4 C1.3 18.4 2.3 19.6 2.3 21.2 C2.3 22.8 1.3 23.6 0 23.6'), tone=.3)
    return ic.place(D45, 45)


CURVED = ('M0 6 C0 -4 -0.2 -14 3.2 -24.6', [(0, 1.7), (1, 1.4)], [(0, 1.7), (.45, 2.6), (.78, 3.8), (.9, 3.2), (1, 0)])


def curved_sword():
    d, wl, wr = CURVED
    ic = Icon()
    ic.shape(band(d, wl, wr))
    ic.detail(band_line(d, wl, wr, .66, .04, .72), fine=True)
    ic.shape(M('M0 6 L3.6 6 C4.6 6 5.2 5.2 5.4 4.4 L6.2 4.8 C6 7 4.8 8.4 3.6 8.4 L0 8.4'), tone=.3)
    ic.shape(R(-1.25, 8.4, 2.5, 8.6), tone=.3)
    ic.detail(wraps(-1.25, 1.25, 8.4, 17, 2), fine=True)
    ic.shape(S('M-1.6 17 L1.6 17 C3.6 17.4 4.4 19 3.4 20.6 L2.2 19.8 C2.4 19.2 2 18.8 1.4 18.8 L-1.6 18.8 Z'), tone=.3)
    return ic.place(D45, 43)


CURVED_GS = ('M0 4 C0 -8 1 -18 6 -28', [(0, 2.4), (.86, 2.4), (.97, 1.2), (1, 0)],
             [(0, 3), (.45, 5.4), (.76, 6.8), (.9, 5.6), (1, 0)])


def curved_greatsword():
    d, wl, wr = CURVED_GS
    ic = Icon()
    ic.shape(band(d, wl, wr))
    ic.detail(band_line(d, wl, wr, .7, .04, .74), fine=True)
    ic.shape(M('M0 4 L5.6 4 L6.8 3 L7.4 3.6 L7 6.8 L5.6 6.8 L0 6.8'), tone=.3)
    ic.shape(R(-1.5, 6.8, 3, 10), tone=.3)
    ic.detail(wraps(-1.5, 1.5, 6.8, 16.8, 2.2), fine=True)
    ic.shape(C(0, 19, 2.3), tone=.3)
    return ic.place(D45, 46)


def _katana(blade_w, tsuba, grip_len, grip_w, y_base, curve, tassel=False, hamon=True):
    ic = Icon()
    d = f'M0 {y_base} C0 {y_base-10} 0.8 -17 {curve} -28'
    wl = [(0, blade_w * .45), (.9, blade_w * .42), (1, 0)]
    wr = [(0, blade_w * .55), (.86, blade_w * .55), (.95, blade_w * .4), (1, 0)]
    ic.shape(band(d, wl, wr))
    if hamon:
        ic.detail(band_line(d, wl, wr, .62, .04, .8), fine=True)
    ic.shape(R(-blade_w * .55, y_base - 1, blade_w * 1.1, 1.6), tone=.3)
    ty = y_base + .6 + tsuba[1] * .6
    ic.shape(E(0, ty, tsuba[0], tsuba[1]), tone=.3)
    ic.detail(E(0, ty, tsuba[0] - 1.3, tsuba[1] - .8).exterior, fine=True)
    y0 = ty + tsuba[1]
    ic.shape(R(-grip_w / 2, y0, grip_w, grip_len), tone=.3)
    x = grip_w / 2
    lines = []
    y = y0 + 1.2
    while y < y0 + grip_len - 1.2:
        lines.append(LineString([(-x, y - 1.1), (x, y + 1.1)]))
        lines.append(LineString([(-x, y + 1.1), (x, y - 1.1)]))
        y += 2.4
    ic.detail(MultiLineString(lines), fine=True)
    end = y0 + grip_len
    if tassel:
        ic.wire(L(f'M0 {end+1} C0.4 {end+3.4} 2.6 {end+3.6} 4.2 {end+2.6}'), 'thin')
    ic.shape(R(-grip_w / 2 - .3, end, grip_w + .6, 1.7), tone=.3)
    return ic


def katana():
    return _katana(3.0, (4.2, 2.1), 11.6, 2.8, 5, 4.2, hamon=False).place(D45, 45)


def great_katana():
    return _katana(4.6, (5.6, 2.8), 13, 3.0, 4, 2.8, tassel=True).place(D45, 46)


def twinblade():
    ic = Icon()
    blade = M('M0 -28 L1.1 -25.6 L1.6 -22 L1.6 -7.6 L0 -7.6')
    ic.shape(blade)
    ic.shape(rot(blade, 180))
    g = M('M0 -7.6 L3.4 -7.6 L4.6 -8.8 L5.2 -8.2 L4.4 -5.8 L0 -5.8')
    ic.shape(g, tone=.3)
    ic.shape(rot(g, 180), tone=.3)
    ic.shape(R(-1.25, -5.8, 2.5, 11.6), tone=.3)
    ic.detail(wraps(-1.25, 1.25, -5.8, 5.8, 2), fine=True)
    return ic.place(D45, 44)


def _backhand(ic, dx=0, dy=0):
    d = 'M0 4 C0 -6 -1.4 -15 -6.4 -22 C-8.6 -25 -11.4 -27.4 -14.6 -28.6'
    wl = [(0, .9), (.8, .9), (1, 0)]
    wr = [(0, 1.1), (.5, 1.5), (.85, 1.3), (1, 0)]
    parts = [('shape', band(d, wl, wr), None), ('fine', band_line(d, wl, wr, .55, .06, .7), None),
             ('shape', R(-3.6, 4, 7.2, 1.5), .3),
             ('shape', band('M0 5.5 C0 9 0.4 11.6 1.6 13.6', 1.05), .3),
             ('shape', E(1.9, 14.2, 1.5, 1.2), .3)]
    for kind, g, tone in parts:
        g = mv(g, dx, dy)
        if kind == 'fine':
            ic.detail(g, fine=True)
        else:
            ic.shape(g, tone=tone)


def backhand_blade():
    ic = Icon()
    _backhand(ic, 11.8, 5.2)
    _backhand(ic)
    return ic.place(78, 45)


def throwing_blade():
    ic = Icon()
    ic.wire(L('M-5.4 -6 L-5.4 7'), 'thin')
    ic.wire(L('M-8.4 -1 L-8.4 11'), 'thin')
    ic.shape(M('M0 -20 C1.7 -14.6 3 -9.6 3 -6.6 C3 -4.6 1.9 -3.4 1 -3 L0 -3'))
    ic.detail(L('M0 -17 L0 -5'), fine=True)
    ic.shape(R(-0.95, -3, 1.9, 12.4), tone=.3)
    ic.detail(wraps(-.95, .95, -3, 9.4, 1.6), fine=True)
    ic.shape(ring(0, 12.2, 2.8, 1.2), tone=.3)
    return ic.place(D45, 36)


# ---------------------------------------------------------------- hafted

CLUB = ('M-1.3 26 L1.3 26 L2.2 6 C3.4 -4 4.4 -13 4.4 -20 C4.4 -25 2.6 -27.6 0 -27.6 '
        'C-2.6 -27.6 -4.4 -25 -4.4 -20 C-4.4 -13 -3.4 -4 -2.2 6 Z')


def hammer_club():
    ic = Icon()
    ic.shape(S(CLUB))
    ic.detail(MultiLineString([LineString([(-1.4, -22), (-0.4, -16), (-1.2, -10)]), LineString([(1.8, -12), (1.2, -5)]),
                               LineString([(-2.6, -18.6), (-1.8, -17)])]), fine=True)
    ic.shape(poly((-1.9, 15), (1.9, 15), (1.5, 26), (-1.5, 26)), tone=.3)
    ic.detail(wraps(-1.8, 1.8, 15, 26, 2), fine=True)
    ic.shape(E(0, 26.8, 1.9, 1.1), tone=.3)
    return ic.place(D45, 43)


def hammer_spiked():
    ic = Icon()
    club = S(CLUB)
    spikes = []
    for y, s in ((-23.4, 1), (-17.4, 1), (-11.6, 1), (-20.4, -1), (-14.4, -1), (-8.6, -1)):
        xs = club.intersection(LineString([(-9, y), (9, y)])).bounds
        x = xs[2] if s > 0 else xs[0]
        spikes.append(poly((x - s * .5, y - 1.1), (x + s * 2.8, y - 1.6), (x - s * .5, y + 1.1)))
    spikes.append(poly((-1, -27.2), (0, -30.6), (1, -27.2)))
    ic.shape(U(club, *spikes))
    ic.detail(hlines(-3.4, 3.4, [-5.2]))
    ic.shape(poly((-1.9, 15), (1.9, 15), (1.5, 26), (-1.5, 26)), tone=.3)
    ic.detail(wraps(-1.8, 1.8, 16, 25.4, 2), fine=True)
    ic.shape(E(0, 26.8, 1.9, 1.1), tone=.3)
    return ic.place(D45, 43)


def colossal_weapon():
    ic = Icon()
    hafted._haft(ic, -12, 28, 3.6, 4, grip=(17, 28))
    head = poly((-16.8, -32), (16.8, -32), (18.4, -30.4), (18.4, -15.2), (16.8, -13.6), (-16.8, -13.6), (-18.4, -15.2), (-18.4, -30.4))
    ic.shape(head)
    ic.detail(MultiLineString([LineString([(-10.4, -32), (-10.4, -13.6)]), LineString([(10.4, -32), (10.4, -13.6)])]))
    ic.shape(R(-3, -13.6, 6, 3.8), tone=.3)
    ic.shape(R(-2.4, 28, 4.8, 2.2), tone=.3)
    return ic.place(D45, 46)


def flail():
    ic = Icon()
    hafted._haft(ic, 4, 28, 2.6, 3, grip=(16, 28), pommel=C(0, 28.8, 1.9))
    ic.wire(L('M0 3.4 C0 -3 2 -7.2 6.6 -13.2'), 'thin')
    ic.shape(R(-2.1, 2.2, 4.2, 2.4), tone=.3)
    ball = U(C(8, -17, 5.2), star(8, -17, 8.8, 4, 8, 10))
    ic.shape(ball)
    ic.detail(C(8, -17, 2.8).exterior, fine=True)
    return ic.place(D45, 42)


def spear():
    ic = Icon()
    hafted._haft(ic, -12, 28, 1.9, 2.2, grip=(8, 16))
    ic.shape(M('M0 -29 C1.2 -25 1.95 -21.2 1.95 -18.6 C1.95 -16.9 1.5 -15.8 1 -15.2 L0 -15.2'))
    ic.detail(L('M0 -26 L0 -16'), fine=True)
    lug = S('M1 -14.6 C2.4 -14.6 3.4 -15.4 4 -16.8 L4.6 -16.2 C4.1 -14.1 2.8 -12.8 1 -12.8 Z')
    ic.shape(lug, tone=.3, fine=True)
    ic.shape(sc(lug, -1, 1), tone=.3, fine=True)
    ic.shape(R(-1.3, -15.2, 2.6, 3.6), tone=.3)
    ic.shape(poly((-1.1, 28), (1.1, 28), (0, 30.6)), tone=.3)
    return ic.place(D45, 46)


def great_spear_serpent():
    ic = Icon()
    hafted._haft(ic, -6, 23, 2.8, 3.1)
    ic.detail(hlines(-1.55, 1.55, [3, 4.4, 12, 13.4]), fine=True)
    ic.shape(R(-2.1, -0.4, 4.2, 2.4), tone=.3)
    ic.shape(S('M-2.2 23 L2.2 23 L3 24 L3 28.6 L-3 28.6 L-3 24 Z'), tone=.3)
    ic.detail(hlines(-3, 3, [26.2]), fine=True)
    truss = poly((-7, -9.4), (7, -9.4), (1.6, -3), (-1.6, -3))
    ic.shape(truss.difference(poly((-3.6, -8), (3.6, -8), (0.8, -4.6), (-0.8, -4.6))), tone=.3)
    ic.shape(S('M-8.4 -11.6 L8.4 -11.6 L9.4 -9.2 L-9.4 -9.2 Z'), tone=.3)
    ic.shape(S('M-2.4 -11.6 L-2.4 -26 C-2.4 -28.6 -2 -30.6 -1 -32.6 C3.2 -30.6 6.6 -27 7.4 -22.4 '
               'C8 -18.6 7 -14.4 5 -11.6 Z'))
    ic.detail(L('M-0.4 -13 L-0.4 -27.6'), fine=True)
    return ic.place(D45, 46)


def great_spear_trident():
    ic = Icon()
    hafted._haft(ic, -8, 26, 2.6, 3, grip=(10, 20))
    ic.shape(poly((-1.5, 26), (1.5, 26), (0, 29.4)), tone=.3)
    ic.shape(M('M0 -31 L1.6 -26.6 L1.2 -12 L0 -12'))
    for s in (1, -1):
        ic.shape(sc(band('M1 -12 C6 -12.4 7.6 -16 7.8 -22 L7.6 -24.6', [(0, 1.1), (.8, 1), (1, .2)]), s, 1))
        ic.shape(sc(poly((7.6, -28.6), (9, -24), (6.4, -24)), s, 1))
    ic.shape(R(-2.2, -12.6, 4.4, 4.4), tone=.3)
    ic.detail(hlines(-2.2, 2.2, [-10.4]), fine=True)
    return ic.place(D45, 46)


def halberd():
    ic = Icon()
    hafted._haft(ic, -15, 28, 2.1, 2.4, grip=(10, 18))
    blade = S('M1.2 -15.6 C4.6 -14.8 7.6 -13.2 9.4 -10.6 C11.2 -14 11.6 -19 10.4 -23.2 C9.2 -22 7.6 -21.4 6 -21.6 '
              'C5.6 -26 4.6 -30 2.2 -34 C1.4 -30.4 1.2 -26.4 1.2 -22.4 Z M4 -20.2 C5.6 -20 6.6 -19.4 7.2 -18.2 '
              'C6.4 -17.6 5.2 -17.6 4 -18 Z')
    ic.shape(blade)
    ic.detail(L('M9.8 -13.6 C10.6 -16 10.6 -18.8 10 -21.4'), fine=True)
    ic.shape(poly((-1.2, -22), (-5.6, -20.4), (-1.2, -18.6)), tone=.3)
    ic.shape(R(-1.6, -23.4, 3.2, 9.4), tone=.3)
    ic.pip(C(0, -16.8, .6), fine=True)
    return ic.place(D45, 46)


def reaper():
    ic = Icon()
    hafted._haft(ic, -24, 28, 2.1, 2.5, grip=(18, 28))
    ic.shape(S('M1.2 -23 C-5 -29.8 -15.6 -29.6 -23.4 -17.6 C-15.6 -22.2 -7 -22.6 1.2 -18.6 Z'))
    ic.detail(L('M-5 -25.6 C-9.6 -26.4 -14.2 -25.2 -19.6 -20.4'), fine=True)
    ic.shape(R(-1.6, -25, 3.2, 6.4), tone=.3)
    return ic.place(D45, 46)


def fist():
    ic = Icon()
    for x in (-9, -3, 3, 9):
        ic.shape(poly((x - 1.2, -10.4), (x, -15.2), (x + 1.2, -10.4)), tone=.3)
    rings = U(*[C(x, -4.4, 3.4) for x in (-9, -3, 3, 9)], R(-12.4, -6, 24.8, 3))
    holes = U(*[C(x, -4.2, 1.7) for x in (-9, -3, 3, 9)])
    ic.shape(rings.difference(holes))
    ic.shape(S('M-11.6 -1.2 L11.6 -1.2 C10.6 3.2 6.6 5.6 0 5.6 C-6.6 5.6 -10.6 3.2 -11.6 -1.2 Z '
               'M-8.4 1 C-6.6 2.7 -3.6 3.4 0 3.4 C3.6 3.4 6.6 2.7 8.4 1 Z'), tone=.3)
    return ic.place(-20, 40)


def claw():
    ic = Icon()
    for x in (-4.4, 0, 4.4):
        d = f'M{x*.8} 2 C{x*1.05} -6 {x*1.7} -15 {x*2.7 + 3.4} -26'
        ic.shape(band(d, [(0, 1), (.8, .95), (1, 0)], [(0, .65), (.8, 1.1), (1, 0)]))
    glove = S('M-5.8 0.8 C-6 -1.6 -3.4 -2.8 0 -2.8 C3.4 -2.8 6 -1.6 5.8 0.8 L5 8.4 '
              'C4.6 10 3.8 11.4 3.6 13 L5.2 19.4 L-5.2 19.4 L-3.6 13 C-3.8 11.4 -4.6 10 -5 8.4 Z')
    ic.shape(glove, tone=.3)
    ic.detail(L('M-5.2 4.4 C-2 5.4 2 5.4 5.2 4.4'))
    ic.detail(L('M-4.1 15.4 L4.1 15.4'), fine=True)
    return ic.place(D45, 44)


def beast_claw():
    ic = Icon()
    fingers = [(-5.4, -10.6, -10), (-1.8, -12.6, -3), (1.8, -12.2, 3), (5.4, -9.6, 10)]
    for x, top, ang in fingers:
        claw_ = band(f'M{x} {top+.6} C{x-.4} {top-3.4} {x+1.2} {top-6.4} {x+3.6} {top-7.2}', [(0, 1.15), (1, 0)], [(0, 1.15), (1, 0)])
        ic.shape(rot(claw_, ang, about=(x, -4)), tone=.45)
    for x, top, ang in fingers:
        f = S(f'M{x-1.8} -3 L{x-1.8} {top+1.8} C{x-1.8} {top-.6} {x+1.8} {top-.6} {x+1.8} {top+1.8} L{x+1.8} -3 Z')
        ic.shape(rot(f, ang, about=(x, -4)), tone=.17)
    ic.shape(band('M-11.4 -3.4 C-12.4 -6.6 -12 -9 -10.4 -10.6', [(0, 1.2), (1, 0)]), tone=.45)
    ic.shape(band('M-6.4 4 C-10 2.6 -11.6 -0.4 -11.4 -4', [(0, 1.8), (1, 1.4)]), tone=.17)
    ic.shape(S('M-7.2 -4.6 L7.2 -4.6 C7.5 -0.4 7 2.8 6.2 5.4 L-6.2 5.4 C-7 2.8 -7.5 -0.4 -7.2 -4.6 Z'))
    ic.detail(L('M-5.6 -1.8 C-2 -0.8 2 -0.8 5.6 -1.8'), fine=True)
    fur = poly((-6.2, 5.4), (-7, 9), (-4.6, 7.6), (-3.4, 10.2), (-1.6, 8), (0, 10.6), (1.6, 8), (3.4, 10.2),
               (4.6, 7.6), (7, 9), (6.2, 5.4))
    ic.shape(fur, tone=.3)
    return ic.place(0, 41)


# ---------------------------------------------------------------- ranged

def crossbow():
    ic = Icon()
    ic.wire(L('M-12.27 -6.13 L0 0.2 L12.27 -6.13'), 'hair')
    ic.shape(S('M-1.1 -11 L1.1 -11 L1.3 2 L2.3 8 L-2.3 8 L-1.3 2 Z'), tone=.3)
    ic.shape(band('M2.2 0 C3.2 0.8 3.5 2 3 3.4', .5), tone=.3, fine=True)
    ic.wire(L('M0 0.2 L0 -15'), 'thin', cap='butt')
    ic.shape(poly((0, -19.4), (1.5, -15), (0, -15.8), (-1.5, -15)), tone=.3)
    ic.shape(band('M-13 -5.4 C-8.6 -10 -4 -11.4 0 -11.4 C4 -11.4 8.6 -10 13 -5.4', [(0, .5), (.5, 1.1), (1, .5)]))
    return ic.place(D45, 34)


JAR2 = ('M0 -29 L7.2 -29 L7.2 -27.4 C5 -26.6 3.4 -24 3 -20.6 L3 -6.4 '
        'C6.4 -5 8.6 -0.6 8.6 4.8 C8.6 11 5.6 15.6 0 15.8')


def _jar(ic):
    body = M(JAR2)
    for s in (1, -1):
        h = S('M7.8 -3.8 L13 -3.8 L13 7.8 L8.2 7.8 L8.2 5.2 L10.4 5.2 L10.4 -1.2 L7.8 -1.2 Z')
        ic.shape(sc(h, s, 1), tone=.3)
    ic.shape(body)
    ic.detail(hlines(-3, 3, [-6.4]))
    ic.detail(hlines(-3, 3, [-22.6]), fine=True)
    ic.detail(MultiLineString([LineString([(-8.4, 0.4), (8.4, 0.4)]), LineString([(-8.6, 3.2), (8.6, 3.2)])]), fine=True)
    ic.shape(E(0, -28.8, 5.8, 1.1), tone=.6)
    ic.shape(R(-4.6, 15.4, 9.2, 2.2), tone=.3)


def ballista():
    ic = Icon()
    _jar(ic)
    return ic.place(D45, 44)


def ballista_ammo():
    ic = Icon()
    _jar(ic)
    for x, y, r in ((0, -33.4, 2.4), (-3.4, -35.8, 1.7), (3.2, -36.4, 1.9)):
        ic.shape(C(x, y, r), tone=.17, fine=r < 2)
    return ic.place(D45, 44)


def staff():
    ic = Icon()
    ic.shape(poly((-0.9, -12), (0.9, -12), (1.1, 28), (-1.1, 28)))
    ic.shape(R(-1.5, 4, 3, 8), tone=.3)
    ic.detail(wraps(-1.5, 1.5, 4, 12, 1.8), fine=True)
    ic.shape(poly((-1.1, 28), (1.1, 28), (0, 31.4)), tone=.3)
    ic.shape(poly((0, -26.4), (3.8, -23.4), (3.4, -18.2), (0, -15.6), (-3.4, -18.2), (-3.8, -23.4)), tone=.45)
    ic.detail(MultiLineString([LineString([(0, -26.4), (0, -15.6)]), LineString([(-3.8, -23.4), (0, -21.6), (3.8, -23.4)])]), fine=True)
    for d in ('M1.6 -12.6 C5.6 -14.2 6.6 -18.8 5.6 -24.6', 'M-1.6 -12.6 C-5.6 -14.2 -6.6 -18.8 -5.6 -24.6'):
        ic.wire(L(d), 'thick')
    ic.shape(R(-2.4, -13.8, 4.8, 2.2), tone=.3)
    return ic.place(D45, 44)


def _triquetra(ic, cx, cy, r, off):
    rings = []
    for k in range(3):
        a = math.radians(-90 + k * 120)
        rings.append(C(cx + off * math.cos(a), cy + off * math.sin(a), r).exterior)
    ic.detail(MultiLineString(rings), free=True)


def seal_erdtree():
    ic = Icon()
    arm = S('M-2.6 -6 C-3.6 -9.6 -5.6 -12.6 -7.2 -14.6 L-4.4 -16.6 L0 -15.4 L4.4 -16.6 L7.2 -14.6 '
            'C5.6 -12.6 3.6 -9.6 2.6 -6 Z')
    cross = U(arm, rot(arm, 90), rot(arm, -90), C(0, 0, 7.2),
              S('M-2.6 6 C-3.2 10.4 -5.8 14.4 -9 17.6 L-4.6 19 L0 17.6 L4.6 19 L9 17.6 C5.8 14.4 3.2 10.4 2.6 6 Z'))
    ic.shape(cross, tone=.17)
    ic.detail(C(0, 0, 5.6).exterior)
    _triquetra(ic, 0, 0, 2.3, 1.7)
    ic.detail(MultiLineString([LineString([(0, 7.6), (0, 15.4)]), LineString([(0, 11), (-3, 15)]), LineString([(0, 11), (3, 15)])]), fine=True)
    return ic.place(0, 42)


def seal_golden():
    ic = Icon()
    outer = poly((-17, -10), (17, -10), (0, 19.4))
    tri = outer.difference(outer.buffer(-2.4, join_style='mitre'))
    inner = outer.buffer(-2.4, join_style='mitre')
    ic.shape(ring(0, 0.4, 13.6, 1.5).difference(inner), tone=.3, fine=True)
    ic.detail(C(0, 0.4, 13.2).exterior.difference(inner.buffer(.6)), free=True, small=True)
    ic.shape(tri, tone=.3)
    _triquetra(ic, 0, 0.4, 3.2, 2.5)
    ic.parts[-1]['fine'] = True
    ic.shape(C(0, 0.4, 2.6), tone=.45, small=True)
    ic.detail(C(0, 0.4, 7.4).exterior, fine=True, free=True)
    return ic.place(0, 42)


def thrusting_shield():
    ic = Icon()
    ic.shape(poly((0, -31), (1.1, -20), (-1.1, -20)), tone=.3)
    ic.shape(poly((0, 29), (1.1, 18), (-1.1, 18)), tone=.3)
    body = S('M-2.8 -21 L2.8 -21 L7.4 -15 L7.4 11 L2.8 19 L-2.8 19 L-7.4 11 L-7.4 -15 Z')
    ic.shape(body)
    ic.detail(body.buffer(-1.5, join_style='mitre').exterior, fine=True)
    ic.detail(L('M0 -18 L0 -5.4 M0 1.4 L0 16'))
    ic.shape(C(0, -2, 3), tone=.45)
    return ic.place(D45, 46)


def torch():
    ic = Icon()
    hd = Icon()
    hd.shape(poly((-1.2, -10), (1.2, -10), (1.6, 24), (-1.6, 24)))
    hd.detail(wraps(-1.6, 1.6, 14, 22.6, 2), fine=True)
    hd.shape(S('M-2.8 -16.6 L2.8 -16.6 L2.2 -9.4 L-2.2 -9.4 Z'), tone=.3)
    hd.detail(LineString([(-3, -13.6), (3, -12.4)]))
    for p in hd.parts:
        p['g'] = rot(p['g'], 38)
    hx, hy = 16.6 * math.sin(math.radians(38)), -16.6 * math.cos(math.radians(38))
    ic.parts = hd.parts
    ic.shape(mv(sc(S(FLAME), 1.05), hx, hy + 1.2), tone=.38)
    return ic.place(0, 44)


# ---------------------------------------------------------------- shields

def small_shield():
    ic = Icon()
    ic.shape(C(0, 0, 15.6))
    ic.shape(ring(0, 0, 18.4, 2.8), tone=.3)
    ic.detail(C(0, 0, 17).exterior, fine=True)
    ic.shape(C(0, 0, 5.6), tone=.45)
    ic.detail(C(0, 0, 3).exterior, fine=True)
    for k in range(4):
        a = math.radians(45 + k * 90)
        ic.pip(C(10.4 * math.cos(a), 10.4 * math.sin(a), 1.25))
    return ic.place(0, 40)


def greatshield_tower():
    ic = Icon()
    body = M(ranged.TOWER)
    ic.shape(body)
    ic.detail(body.buffer(-2.2, join_style='mitre', mitre_limit=3).exterior, fine=True)
    ic.shape(R(-2.8, -26, 5.6, 54).intersection(body.buffer(-.01)), tone=.45)
    for x in (-7.6, 7.6):
        for y in (-16, -2, 10):
            ic.pip(C(x, y, 1.15))
    return ic.place(0, 45)


def greatshield_pavise():
    ic = Icon()
    body = S('M-11.4 -25 L11.4 -25 L12.6 -23.6 L12.6 23.6 L11.4 25 L-11.4 25 L-12.6 23.6 L-12.6 -23.6 Z')
    ic.shape(body)
    ic.detail(body.buffer(-2.2, join_style='mitre').exterior, fine=True)
    ic.shape(R(-2.8, -25, 5.6, 50), tone=.45)
    for x in (-8, 8):
        for y in (-19, 0, 19):
            ic.pip(C(x, y, 1.2))
    return ic.place(0, 45)


# ---------------------------------------------------------------- spells, talisman

def incantation():
    ic = Icon()
    big = sc(S('M0 0 C-5.6 0 -8 -4 -6.6 -8.6 C-5.6 -12 -2.4 -13.6 -1.6 -18 C1 -16 1.8 -13.6 1.4 -11.4 '
               'C3 -13.4 4.4 -16 4.2 -19.6 C8 -16.4 9.2 -10.8 8 -6.4 C6.8 -2.2 3.6 0 0 0 Z'), 2)
    ic.shape(sc(big, .8, .8, (1.2, 0)), tone=.38)
    for x, y, r in ((-12.6, -24.4, 2.3), (17.8, -31.4, 1.7), (16.6, -8.4, 1.4), (-14.8, -9.6, 1.2)):
        ic.shape(star(x, y, r * 1.6, r * .45, 4), tone=1, outline=False)
    return ic.place(0, 38, at=(24, 25))


def _talisman(chain_op):
    ic = Icon()
    if chain_op:
        ic.wire(L('M-1.6 -12 L-9 -22'), 'hair', op=chain_op)
        ic.wire(L('M1.6 -12 L9 -22'), 'hair', op=chain_op)
    ic.shape(ring(0, -11.2, 2.6, 1.1), tone=.3)
    ic.shape(C(0, 2, 11.4), tone=.17)
    ic.shape(ring(0, 2, 11.4, 2), tone=.3)
    for k in range(4):
        a = math.radians(45 + k * 90)
        ic.shape(C(5.6 * math.cos(a), 2 + 5.6 * math.sin(a), 1.3), tone=.6, fine=True)
    ic.shape(C(0, 2, 3.4), tone=.6)
    return ic.place(0, 40)


def talisman():
    return _talisman(.4)


def talisman_bare():
    return _talisman(0)


# ---------------------------------------------------------------- armor

def head():
    ic = Icon()
    helm = S('M-10.8 -11 C-10.8 -17.6 -6 -21 0 -21 C6 -21 10.8 -17.6 10.8 -11 L11.2 12 C6 14.8 -6 14.8 -11.2 12 Z')
    slot = S('M-9 -6.4 L9 -6.4 L9 -3.6 L1.4 -3.6 L1.4 7.6 L-1.4 7.6 L-1.4 -3.6 L-9 -3.6 Z')
    ic.shape(helm.difference(slot))
    ic.detail(L('M0 -21 L0 -6.4'))
    ic.shape(S('M-12.2 11.6 L12.2 11.6 L13.4 17.6 L-13.4 17.6 Z'), tone=.3)
    ic.detail(hlines(-12.8, 12.8, [14.6]), fine=True)
    return ic.place(0, 41)


def body():
    ic = Icon()
    for s in (1, -1):
        ic.shape(sc(S('M10.2 -8.6 L15.8 -9.6 L16.8 7 L12 8 Z'), s, 1), tone=.17)
    plate = M('M0 -12.2 L3.2 -11.4 L7.8 -14.4 L10 -6 L9.2 4 L7.4 8.6 L0 8.6')
    ic.shape(plate)
    ic.detail(L('M0 -12.2 L0 8.6'))
    ic.shape(S('M-8.4 8.6 L8.4 8.6 L9.8 17 L-9.8 17 Z'), tone=.3)
    ic.detail(L('M-9.1 12.8 L9.1 12.8'))
    for s in (1, -1):
        ic.shape(sc(S('M6.6 -15.4 C10.8 -17.4 15.4 -16 17 -11.4 L17 -5.6 L10.4 -4.6 Z'), s, 1), tone=.3)
    return ic.place(0, 42)


def arms():
    ic = Icon()
    for x, top in ((-5.55, -16.4), (-1.85, -19.6), (1.85, -19), (5.55, -15.4)):
        ic.shape(S(f'M{x-1.85} -8.8 L{x-1.85} {top+1.85} A1.85 1.85 0 0 1 {x+1.85} {top+1.85} L{x+1.85} -8.8 Z'), tone=.17)
    ic.shape(S('M-7.4 -9 L7.4 -9 L7.4 1.6 C7.4 3.6 6.2 5.2 5 6 L-5 6 C-6.2 5.2 -7.4 3.6 -7.4 1.6 Z'))
    ic.shape(S('M-7.4 -5.4 C-10.4 -5.8 -12.2 -8.6 -12.4 -12 L-9.6 -12.4 C-9.4 -10.6 -8.6 -9.4 -7.4 -9 Z'), tone=.17)
    ic.detail(L('M-7.4 -4.8 C-2.6 -3.8 2.6 -3.8 7.4 -4.8'))
    ic.shape(S('M-5 6 L5 6 L8.4 19.4 L-8.4 19.4 Z'), tone=.3)
    ic.detail(L('M-6.6 12.6 L6.6 12.6'))
    return ic.place(0, 42)


# ---------------------------------------------------------------- items, ash

def tool():
    ic = Icon()
    ic.shape(R(-1.2, -24, 2.4, 12.6), tone=.3)
    ic.detail(wraps(-1.2, 1.2, -22, -14, 1.8), fine=True)
    ic.shape(E(0, -25.4, 2.2, 2), tone=.3)
    ic.shape(R(-2.2, -13.4, 4.4, 2), tone=.3)
    bell = M('M0 -11.4 C3.6 -11.4 5.6 -9 6 -5 L6.8 5.4 C7.2 8 8.8 9.6 11 10.2 L11 12.4 L0 12.4')
    ic.shape(bell)
    spiral = []
    for k in range(60):
        a = k / 59 * 2.6 * math.pi
        r = .25 + 2.3 * k / 59
        spiral.append((r * math.cos(a), -1.6 + r * math.sin(a)))
    ic.detail(LineString(spiral))
    ic.detail(L('M-10.6 10.2 L10.6 10.2'))
    ic.shape(C(0, 15, 2.3), tone=.6)
    ic.wire(L('M14.6 -4 C16.6 -0.8 16.6 3.6 14.6 6.8'), 'thin')
    ic.wire(L('M-14.6 -4 C-16.6 -0.8 -16.6 3.6 -14.6 6.8'), 'thin')
    return ic.place(-18, 42)


def _kukri2(w=1.0):
    blade = band('M0 0 L0 -6.6 C0 -8.6 0.6 -10.4 2 -12.6 L6.4 -19.6 C7 -20.6 7.6 -21.4 8.4 -22',
                 [(0, 1), (.35, 1.15), (.8, 1.05), (1, 0)], [(0, 1), (.3, 1.4), (.62, 3.2), (.84, 2.8), (.95, 1.2), (1, 0)], n=60)
    handle = S('M-1 1.2 L1 1.2 L1.1 5.8 C1.9 6.2 2 7.6 1 7.9 L-1 7.9 C-2 7.6 -1.9 6.2 -1.1 5.8 Z')
    bolster = R(-1.6, -0.2, 3.2, 1.4)
    return sc(blade, w), sc(U(handle, bolster), w)


def throwables():
    ic = Icon()
    for k, ang in enumerate((-18, 0, 18)):
        b, h = _kukri2(1.15)
        b, h = mv(rot(b, ang, about=(0, 8)), (k - 1) * 5.8, 0), mv(rot(h, ang, about=(0, 8)), (k - 1) * 5.8, 0)
        ic.shape(b, tone=.17)
        ic.shape(h, tone=.45)
    return ic.place(-10, 42)


def _ash_sword(ic, s=1.0, dy=-1.4):
    ic.shape(mv(sc(poly((0, -9.4), (1.3, -6.6), (1.3, 3), (0, 3.6), (-1.3, 3)), s), 0, dy), tone=.45)
    ic.shape(mv(sc(R(-3.6, 3.6, 7.2, 1.5), s), 0, dy), tone=.45)
    ic.shape(mv(sc(R(-0.8, 5.1, 1.6, 3.4), s), 0, dy), tone=.45)
    ic.shape(mv(sc(C(0, 9.4, 1.1), s), 0, dy), tone=.45)


def ash():
    """A close-up of a sword's hilt, cropped by the tile, with a gem set in the guard along the blade."""
    ic = Icon()
    ic.shape(S('M-8 0 L8 0 L4.6 -34 L0 -42 L-4.6 -34 Z'), tone=.1)
    ic.detail(ML('M1.2 -11 L1 -40'), op=.5)
    ic.shape(R(-3.6, 3, 7.2, 21), tone=.25)
    ic.shape(E(0, 25.4, 4.2, 2.6), tone=.25)
    ic.detail(wraps(-3.6, 3.6, 3.6, 24, 2.4, 1.6), fine=True)
    ic.detail(wraps(-3.6, 3.6, 4.2, 24, 3.6, 2.2), small=True)
    guard = U(band('M-17.6 -5.4 C-13 -0.6 -7 1.4 0 1.4 C7 1.4 13 -0.6 17.6 -5.4', [(0, 1.8), (.5, 3.4), (1, 1.8)], n=60),
              C(-18.2, -6.2, 2.4), C(18.2, -6.2, 2.4))
    ic.shape(guard, tone=.25)
    ic.shape(C(0, 0, 7), tone=.3)
    ic.shape(poly((0, -5.6), (3.6, 0), (0, 5.6), (-3.6, 0)), tone=.85)
    ic.detail(L('M-3.6 0 L3.6 0 M0 -5.6 L0 5.6'))
    k = 1.36
    cx, cy = 18.06, 29.96
    ic.transform(lambda g: mv(rot(sc(g, k), 45), cx, cy))
    weapon = U(*[p['g'] for p in ic.parts if p['k'] == 'shape']).buffer(1.6)
    for x, y, r in ((16.4, 8.6, 2.5), (23.2, 5.2, 1.3), (39.4, 31.6, 2.5), (42.8, 24.8, 1.3)):
        st = star(x, y, r * 1.5, r * .4, 4)
        if not st.intersects(weapon):
            ic.shape(st, tone=1, outline=False)
    ic.clip = R(2, 2, 44, 44)
    return ic


# ---------------------------------------------------------------- the set

# key, label, now, option 2 (label, fn) or None, changed
WEAPONS = [
    ('dagger', 'Dagger', dagger, None, True),
    ('straight_sword', 'Straight sword', straight_sword, None, True),
    ('greatsword', 'Greatsword', greatsword, None, True),
    ('colossal_sword', 'Colossal sword', colossal_sword, None, True),
    ('light_greatsword', 'Light greatsword', light_greatsword, None, True),
    ('thrusting_sword', 'Thrusting sword', swords.thrusting_a, None, False),
    ('heavy_thrusting_sword', 'Heavy thrusting sword', heavy_thrusting_sword, None, True),
    ('curved_sword', 'Curved sword', curved_sword, None, True),
    ('curved_greatsword', 'Curved greatsword', curved_greatsword, None, True),
    ('katana', 'Katana', katana, None, True),
    ('great_katana', 'Great katana', great_katana, None, True),
    ('twinblade', 'Twinblade', twinblade, None, True),
    ('backhand_blade', 'Backhand blade', backhand_blade, None, True),
    ('throwing_blade', 'Throwing blade', throwing_blade, None, True),
    ('axe', 'Axe', hafted.axe_a, None, False),
    ('greataxe', 'Greataxe', hafted.greataxe_a, None, False),
    ('hammer', 'Hammer', hammer_spiked, None, True),
    ('great_hammer', 'Great hammer', hafted.great_hammer_a, None, False),
    ('colossal_weapon', 'Colossal weapon', colossal_weapon, None, True),
    ('flail', 'Flail', flail, None, True),
    ('spear', 'Spear', spear, None, True),
    ('great_spear', 'Great spear', great_spear_trident, None, True),
    ('halberd', 'Halberd', halberd, None, True),
    ('reaper', 'Reaper', reaper, None, True),
    ('whip', 'Whip', hafted.whip_a, None, False),
    ('fist', 'Fist', fist, None, True),
    ('claw', 'Claw', claw, None, True),
    ('beast_claw', 'Beast claw', beast_claw, None, True),
    ('hand_to_hand', 'Hand-to-hand', hafted.hand_to_hand_a, None, False),
]
RANGED = [
    ('light_bow', 'Light bow', ranged.light_bow_a, None, False),
    ('bow', 'Bow', ranged.bow_a, None, False),
    ('greatbow', 'Greatbow', ranged.greatbow_a, None, False),
    ('crossbow', 'Crossbow', crossbow, None, True),
    ('ballista', 'Ballista', ballista_ammo, None, True),
]
CATALYSTS = [
    ('glintstone_staff', 'Glintstone staff', staff, None, True),
    ('sacred_seal', 'Sacred seal', seal_golden, None, True),
]
ODD = [
    ('thrusting_shield', 'Thrusting shield', thrusting_shield, None, True),
    ('torch', 'Torch', torch, None, True),
    ('perfume_bottle', 'Perfume bottle', ranged.perfume_a, None, False),
]
SHIELDS = [
    ('small_shield', 'Small shield', small_shield, None, True),
    ('medium_shield', 'Medium shield', ranged.medium_shield_a, None, False),
    ('greatshield', 'Greatshield', greatshield_tower, None, True),
]
SPELLS = [
    ('sorcery', 'Sorcery', misc.sorcery_a, None, False),
    ('incantation', 'Incantation', incantation, None, True),
]
TALISMAN = [('talisman', 'Talisman', talisman_bare, None, True)]
ARMOR = [
    ('head', 'Head', head, None, True),
    ('body', 'Body', body, None, True),
    ('arms', 'Arms', arms, None, True),
    ('legs', 'Legs', misc.legs_a, None, False),
]
ITEMS = [
    ('tool', 'Tool', tool, None, True),
    ('pots', 'Pots and perfumes', misc.pots_a, None, False),
    ('throwables', 'Other throwables', throwables, None, True),
]
ASH = [('ash', 'Ash of War', ash, None, True)]
UI = [(k, label, a, None, False) for k, label, a, b in misc.UI]

BEFORE = {k: a for k, label, a, b in swords.ICONS + hafted.ICONS + ranged.ICONS + misc.ICONS}
ALL = WEAPONS + RANGED + CATALYSTS + ODD + SHIELDS + SPELLS + TALISMAN + ARMOR + ITEMS + ASH + UI
NOW = {k: now for k, label, now, alt, ch in ALL}
ICONS = [(k, label, now, alt[1] if alt else now) for k, label, now, alt, ch in ALL]
