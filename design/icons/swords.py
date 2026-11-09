"""Bladed weapon classes. Authored upright, tip at y=-28, then turned 45 degrees."""
from shapely.geometry import LineString, MultiLineString

from geo import (C, E, Icon, L, M, ML, R, S, U, band, mv, poly, ring, rot, wraps)

D45 = 45


def _sword(blade, guard, grip, pommel, fuller=None, wrap=None, extra=(), fit=44, ridge=None):
    ic = Icon()
    ic.shape(blade)
    if fuller is not None:
        ic.detail(fuller, fine=True)
    if ridge is not None:
        ic.detail(ridge)
    for g in extra:
        ic.shape(g)
    ic.shape(guard, tone=.3)
    ic.shape(grip, tone=.3)
    if wrap is not None:
        ic.detail(wrap, fine=True)
    if pommel is not None:
        ic.shape(pommel, tone=.3)
    return ic.place(D45, fit)


# ---------------------------------------------------------------- dagger

def dagger_a():
    ic = Icon()
    ic.shape(S('M-2.3 6 L-2.3 -9 L-1.4 -13.5 L0.6 -20 C2.8 -15 3.6 -9 3.4 -4 L3.1 6 Z'))
    ic.detail(L('M-1.3 -13 L-1.3 4.5'), fine=True)
    ic.shape(S('M-4.6 6 L5 6 L5.6 8.4 L-5.2 8.4 Z'), tone=.3)
    ic.shape(S('M-1.9 8.4 L2.3 8.4 L2.7 16.4 L-2.3 16.4 Z'), tone=.3)
    ic.pip(C(.2, 11, .6), fine=True)
    ic.pip(C(.2, 14, .6), fine=True)
    ic.shape(S('M-2.9 16.4 L3.3 16.4 L2.8 19.4 L-2.4 19.4 Z'), tone=.3)
    return ic.place(D45, 39)


def dagger_b():
    ic = Icon()
    ic.shape(M('M0 -20 C2.8 -15 4.6 -9 4.4 -3 L3.6 4 L0 4'))
    ic.detail(L('M0 -16 L0 2.5'))
    ic.shape(M('M0 4 L6.4 4 L7.2 3 L7.2 7.2 L6.4 6.8 L0 6.8'), tone=.3)
    ic.shape(R(-1.8, 6.8, 3.6, 8.6), tone=.3)
    ic.shape(C(0, 17.6, 2.8), tone=.3)
    return ic.place(D45, 39)


# ---------------------------------------------------------------- straight sword

def straight_a():
    return _sword(
        M('M0 -28 L1.3 -25.4 C1.9 -24 2.2 -22.6 2.2 -21 L2.4 8 L0 8'),
        M('M0 8 L6.6 8 C7.4 8 8 7.5 8.4 6.8 L9 7.2 L8.8 9.4 C8.4 10.2 7.6 10.6 6.6 10.6 L0 10.6'),
        R(-1.3, 10.6, 2.6, 9.4), C(0, 22.4, 2.5),
        fuller=L('M0 -20 L0 6'), wrap=wraps(-1.3, 1.3, 10.6, 20, 2))


def straight_b():
    return _sword(
        M('M0 -28 L3.3 -21.5 L3.3 6 L0 6'),
        M('M0 6 L9.6 6 L10.4 5.2 L10.4 9.4 L9.6 9 L0 9'),
        R(-1.7, 9, 3.4, 8.4), C(0, 20.6, 3.2),
        ridge=L('M0 -23 L0 4.4'))


# ---------------------------------------------------------------- greatsword

def greatsword_a():
    return _sword(
        M('M0 -28 L2.2 -24.6 C3.2 -23 3.6 -21.6 3.6 -20 L3.6 3 L2.7 4 L2.7 7 L0 7'),
        M('M0 7 L5.5 7 C7.6 7 9.2 5.8 10.2 3.8 L11.2 4.5 C10.4 7.8 8.2 9.8 5.5 9.8 L0 9.8'),
        R(-1.45, 9.8, 2.9, 13), M('M0 22.8 C1.9 22.8 3 24 3 25.4 C3 27 1.8 28 0 28'),
        fuller=ML('M0.9 -21 L0.9 1.6'), wrap=wraps(-1.45, 1.45, 9.8, 22.8, 2.2), fit=45)


def greatsword_b():
    return _sword(
        M('M0 -28 L4.6 -21 L4.6 5 L0 5'),
        M('M0 5 L10 5 C11.4 5 12.2 4 12.6 2.6 L13.2 3 L13.2 7.6 C12.2 8.4 11.2 8.8 10 8.8 L0 8.8'),
        R(-1.75, 8.8, 3.5, 14), C(0, 25.6, 3.2),
        ridge=L('M0 -22 L0 3.6'), fit=45)


# ---------------------------------------------------------------- colossal sword

def colossal_a():
    return _sword(
        S('M-5.6 6 L-5.6 -21.6 L1.4 -28 L5.6 -26.4 L5.6 6 Z'),
        R(-7, 6, 14, 2.8),
        R(-1.6, 8.8, 3.2, 15.4), R(-2.4, 24.2, 4.8, 2.6),
        fuller=MultiLineString([LineString([(0, -20), (0, 3.4)]), LineString([(5.6, -14), (3.6, -12.6)]),
                                LineString([(-5.6, -6), (-4, -5)]), LineString([(5.6, -2), (4.2, -1.2)])]),
        wrap=wraps(-1.6, 1.6, 8.8, 24.2, 2.2), fit=46)


def colossal_b():
    return _sword(
        S('M-7 4 L-7 -22 L-2 -28 L7 -28 L7 4 Z'),
        R(-8.4, 4, 16.8, 3.4),
        R(-1.9, 7.4, 3.8, 14.6), R(-2.8, 22, 5.6, 3.4),
        ridge=L('M-2 -23 L-2 1.8'), fit=46)


# ---------------------------------------------------------------- light greatsword

def _sguard(y, reach, w):
    up = band(f'M0 {y} C{reach*.5} {y} {reach*.85} {y-1} {reach} {y-3.6}', w)
    down = band(f'M0 {y} C{-reach*.5} {y} {-reach*.85} {y+1} {-reach} {y+3.6}', w)
    return U(up, down, R(-w*1.6, y - w*1.4, w*3.2, w*2.8))


def lightgs_a():
    ic = Icon()
    ic.shape(M('M0 -28 L0.9 -23.6 L1.4 -17 L1.5 5.2 L0 5.2'))
    ic.detail(L('M0 -18 L0 4'), fine=True)
    ic.shape(_sguard(6.2, 6.4, .8), tone=.3)
    ic.shape(R(-1.05, 7.4, 2.1, 7), tone=.3)
    ic.shape(E(0, 15.2, 1.9, 1.05), tone=.3)
    ic.shape(R(-1.05, 16.2, 2.1, 7), tone=.3)
    ic.detail(wraps(-1.05, 1.05, 7.4, 14.4, 1.9), fine=True)
    ic.detail(wraps(-1.05, 1.05, 16.2, 23.2, 1.9), fine=True)
    ic.shape(C(0, 25, 1.9), tone=.3)
    return ic.place(D45, 45)


def lightgs_b():
    ic = Icon()
    ic.shape(M('M0 -28 L1.9 -21 L1.9 4.6 L0 4.6'))
    ic.shape(_sguard(6, 7.6, 1.2), tone=.3)
    ic.shape(R(-1.4, 7.6, 2.8, 7), tone=.3)
    ic.shape(E(0, 15.6, 2.6, 1.4), tone=.3)
    ic.shape(R(-1.4, 17, 2.8, 7), tone=.3)
    ic.shape(C(0, 26.4, 2.5), tone=.3)
    return ic.place(D45, 45)


# ---------------------------------------------------------------- thrusting sword

def thrusting_a():
    ic = Icon()
    ic.wire(E(-2.4, 2.4, 1.9, 1.5).exterior, 'thin')
    ic.shape(M('M0 -28 L0.5 -20 L0.9 4 L0 4'))
    ic.wire(L('M6.4 5.6 C7.8 9.4 6 13.6 0.8 16.4'), 'thin')
    ic.shape(R(-6.4, 4, 12.8, 1.7), tone=.3)
    ic.shape(C(-6.9, 4.85, 1.2), tone=.3)
    ic.shape(C(6.9, 4.85, 1.2), tone=.3)
    ic.shape(R(-1.05, 5.7, 2.1, 9.4), tone=.3)
    ic.detail(wraps(-1.05, 1.05, 5.7, 15.1, 1.8), fine=True)
    ic.shape(M('M0 15.1 C1.6 15.1 2.4 16.4 2.4 17.6 C2.4 19 1.4 20 0 20'), tone=.3)
    return ic.place(D45, 44)


def thrusting_b():
    ic = Icon()
    ic.shape(M('M0 -28 L1.15 -16 L1.15 2 L0 2'))
    ic.shape(S('M-6.6 2.2 C-6.6 -2.2 -3.6 -4.2 0 -4.2 C3.6 -4.2 6.6 -2.2 6.6 2.2 Z'), tone=.3)
    ic.wire(L('M6 4.6 C8.4 9 6.8 14 2.2 15.6'), 'thick')
    ic.shape(R(-7.6, 2.2, 15.2, 2.4), tone=.3)
    ic.shape(R(-1.4, 4.6, 2.8, 10), tone=.3)
    ic.shape(C(0, 17.4, 2.8), tone=.3)
    return ic.place(D45, 44)


# ---------------------------------------------------------------- heavy thrusting sword

def heavythrust_a():
    return _sword(
        M('M0 -28 L1.1 -14 L2.5 4 L0 4'),
        M('M0 7 L7.2 7 L8.8 5.8 L9.4 6.4 L9.4 9.6 L8.8 10.2 L7.2 9.2 L0 9.2'),
        R(-1.3, 9.2, 2.6, 13.4), poly((0, 22.6), (2.4, 24.8), (0, 27.6), (-2.4, 24.8)),
        fuller=L('M0 -24 L0 3'), wrap=wraps(-1.3, 1.3, 9.2, 22.6, 2.1),
        extra=[R(-1.7, 4, 3.4, 3)], fit=45)


def heavythrust_b():
    return _sword(
        M('M0 -28 L3.4 4 L0 4'),
        M('M0 4 L9.4 4 L10.6 2.6 L10.6 8 L9.4 7.4 L0 7.4'),
        R(-1.6, 7.4, 3.2, 14.6), poly((0, 21.4), (3.4, 24.6), (0, 28), (-3.4, 24.6)),
        ridge=L('M0 -22 L0 2.6'), fit=45)


# ---------------------------------------------------------------- curved sword

def curved_a():
    ic = Icon()
    ic.shape(band('M0 6 C0 -4 -0.2 -14 3.2 -24.6', [(0, 1.7), (1, 1.4)],
                  [(0, 1.7), (.45, 2.6), (.78, 3.8), (.9, 3.2), (1, 0)]))
    ic.detail(L('M-0.6 -13 C-0.2 -6 0.1 0 0.2 4.6'), fine=True)
    ic.shape(M('M0 6 L3.6 6 C4.6 6 5.2 5.2 5.4 4.4 L6.2 4.8 C6 7 4.8 8.4 3.6 8.4 L0 8.4'), tone=.3)
    ic.shape(R(-1.25, 8.4, 2.5, 8.6), tone=.3)
    ic.detail(wraps(-1.25, 1.25, 8.4, 17, 2), fine=True)
    ic.shape(S('M-1.6 17 L1.6 17 C3.6 17.4 4.4 19 3.4 20.6 L2.2 19.8 C2.4 19.2 2 18.8 1.4 18.8 L-1.6 18.8 Z'), tone=.3)
    return ic.place(D45, 43)


def curved_b():
    ic = Icon()
    ic.shape(band('M0 4 C0 -6 0 -16 5 -26', [(0, 2.2), (1, 1.6)],
                  [(0, 2.2), (.5, 3.6), (.8, 5.2), (.92, 4.4), (1, 0)]))
    ic.shape(M('M0 4 L5.6 4 L7 2.4 L7.8 3.2 L6.6 7 L0 7'), tone=.3)
    ic.shape(R(-1.6, 7, 3.2, 8.6), tone=.3)
    ic.shape(S('M-2 15.6 L2 15.6 C5 16 6 18.6 4.4 21 L2.4 19.6 C2.6 18.8 2 18.2 1.2 18.2 L-2 18.2 Z'), tone=.3)
    return ic.place(D45, 43)


# ---------------------------------------------------------------- curved greatsword

def curvedgs_a():
    ic = Icon()
    ic.shape(band('M0 4 C0 -8 1 -18 6 -28', [(0, 2.4), (.86, 2.4), (.97, 1.2), (1, 0)],
                  [(0, 3), (.45, 5.4), (.76, 6.8), (.9, 5.6), (1, 0)]))
    ic.detail(L('M1.8 -18 C0.8 -11 0.5 -4 0.6 2.6'), fine=True)
    ic.shape(M('M0 4 L5.6 4 L6.8 3 L7.4 3.6 L7 6.8 L5.6 6.8 L0 6.8'), tone=.3)
    ic.shape(R(-1.5, 6.8, 3, 14), tone=.3)
    ic.detail(wraps(-1.5, 1.5, 6.8, 20.8, 2.2), fine=True)
    ic.shape(C(0, 23, 2.3), tone=.3)
    return ic.place(D45, 46)


def curvedgs_b():
    ic = Icon()
    ic.shape(band('M0 4 C0 -8 1.6 -18 7.4 -28', [(0, 2.8), (.88, 2.8), (.97, 1.4), (1, 0)],
                  [(0, 3.4), (.45, 6.6), (.76, 8.2), (.9, 6.6), (1, 0)]))
    ic.shape(R(-6, 4, 12, 3.2), tone=.3)
    ic.shape(R(-1.8, 7.2, 3.6, 13.8), tone=.3)
    ic.shape(C(0, 23.6, 2.9), tone=.3)
    return ic.place(D45, 46)


# ---------------------------------------------------------------- katana

def _katana(blade_w, tsuba, grip_len, grip_w, bold, y_base=5.0, curve=4.2, tassel=False):
    ic = Icon()
    ic.shape(band(f'M0 {y_base} C0 {y_base-10} 0.8 -17 {curve} -28',
                  [(0, blade_w * .45), (.9, blade_w * .42), (1, 0)],
                  [(0, blade_w * .55), (.86, blade_w * .55), (.95, blade_w * .4), (1, 0)]))
    if not bold:
        ic.detail(L(f'M-0.3 -12 C0 -5 0.1 {y_base-4} 0.1 {y_base-2}'), fine=True)
    ic.shape(R(-blade_w * .55, y_base - 1, blade_w * 1.1, 1.6), tone=.3)
    ty = y_base + .6 + tsuba[1] * .6
    disc = E(0, ty, tsuba[0], tsuba[1])
    ic.shape(disc, tone=.3)
    if not bold:
        ic.detail(E(0, ty, tsuba[0] - 1.3, tsuba[1] - .8).exterior, fine=True)
    y0 = ty + tsuba[1]
    ic.shape(R(-grip_w / 2, y0, grip_w, grip_len), tone=.3)
    if bold:
        y = y0 + 2.4
        while y < y0 + grip_len - 1.6:
            ic.pip(poly((0, y - 1.25), (0.8, y), (0, y + 1.25), (-0.8, y)))
            y += 3.2
    else:
        x = grip_w / 2
        lines = []
        y = y0 + 1.2
        while y < y0 + grip_len - 1.2:
            lines.append(LineString([(-x, y - 1.1), (x, y + 1.1)]))
            lines.append(LineString([(-x, y + 1.1), (x, y - 1.1)]))
            y += 2.4
        ic.detail(MultiLineString(lines), fine=True)
    end = y0 + grip_len
    ic.shape(R(-grip_w / 2 - .3, end, grip_w + .6, 1.7), tone=.3)
    if tassel:
        ic.wire(L(f'M0 {end+1.7} C0.4 {end+3.4} 2.6 {end+3.6} 4.2 {end+2.6}'), 'thin')
    return ic


def katana_a():
    return _katana(3.0, (4.2, 2.1), 12.4, 2.8, False).place(D45, 45)


def katana_b():
    return _katana(3.6, (5.2, 2.6), 11.6, 3.4, True).place(D45, 45)


def great_katana_a():
    return _katana(4.6, (5.6, 2.8), 19, 3.0, False, y_base=-2, curve=2.6, tassel=True).place(D45, 46)


def great_katana_b():
    return _katana(5.4, (6.6, 3.2), 19, 3.6, True, y_base=-2, curve=2.6, tassel=True).place(D45, 46)


# ---------------------------------------------------------------- twinblade

def twinblade_a():
    ic = Icon()
    blade = M('M0 -28 L1.1 -25.6 L1.6 -22 L1.6 -7.6 L0 -7.6')
    ic.shape(blade)
    ic.shape(rot(blade, 180))
    ic.detail(L('M0 -21 L0 -9'), fine=True)
    ic.detail(L('M0 21 L0 9'), fine=True)
    g = M('M0 -7.6 L3.4 -7.6 L4.6 -8.8 L5.2 -8.2 L4.4 -5.8 L0 -5.8')
    ic.shape(g, tone=.3)
    ic.shape(rot(g, 180), tone=.3)
    ic.shape(R(-1.25, -5.8, 2.5, 11.6), tone=.3)
    ic.detail(wraps(-1.25, 1.25, -5.8, 5.8, 2), fine=True)
    return ic.place(D45, 46)


def twinblade_b():
    ic = Icon()
    blade = band('M0 -6.4 C0 -14 -0.4 -21 2.6 -28', [(0, 1.9), (.85, 1.8), (1, 0)], [(0, 1.9), (.6, 2.6), (.88, 2.4), (1, 0)])
    ic.shape(blade)
    ic.shape(rot(blade, 180))
    g = R(-4.6, -8.4, 9.2, 2.6)
    ic.shape(g, tone=.3)
    ic.shape(rot(g, 180), tone=.3)
    ic.shape(R(-1.6, -5.8, 3.2, 11.6), tone=.3)
    return ic.place(D45, 46)


# ---------------------------------------------------------------- backhand blade

def backhand_a():
    ic = Icon()
    ic.shape(band('M0 15 C0 4 -0.6 -12 2.6 -26', [(0, 1.7), (.9, 1.6), (1, 0)], [(0, 1.7), (.55, 2.5), (.85, 2.4), (1, 0)]))
    ic.detail(L('M0.4 -14 C-0.2 -4 0 6 0 12'), fine=True)
    ic.shape(R(-2.2, 8, 4.4, 8), tone=.3)
    ic.shape(R(2.2, 10.6, 8.6, 2.8), tone=.3)
    ic.detail(wraps(4.6, 10.4, 10.6, 13.4, 1.4, .0), fine=True)
    ic.shape(C(11.6, 12, 1.8), tone=.3)
    return ic.place(D45, 44)


def backhand_b():
    ic = Icon()
    ic.shape(band('M0 15 C0 2 0 -12 4 -26', [(0, 2.2), (.9, 2.1), (1, 0)], [(0, 2.2), (.55, 3.4), (.85, 3.2), (1, 0)]))
    ic.shape(R(-2.8, 8, 5.6, 8.6), tone=.3)
    ic.shape(R(2.8, 10.2, 8.4, 3.8), tone=.3)
    ic.shape(C(12.4, 12.1, 2.4), tone=.3)
    return ic.place(D45, 44)


# ---------------------------------------------------------------- throwing blade

def throwing_a():
    ic = Icon()
    ic.shape(M('M0 -20 C1.7 -14.6 3 -9.6 3 -6.6 C3 -4.6 1.9 -3.4 1 -3 L0 -3'))
    ic.detail(L('M0 -17 L0 -5'), fine=True)
    ic.shape(R(-0.95, -3, 1.9, 12.4), tone=.3)
    ic.detail(wraps(-.95, .95, -3, 9.4, 1.6), fine=True)
    ic.shape(ring(0, 12.2, 2.8, 1.2), tone=.3)
    return ic.place(D45, 36)


def throwing_b():
    ic = Icon()
    ic.wire(L('M-5.6 -6 L-5.6 8'), 'thin')
    ic.wire(L('M-8.6 -1 L-8.6 12'), 'thin')
    ic.shape(M('M0 -20 C2 -14.4 3.8 -9.4 3.8 -6.2 C3.8 -4 2.4 -2.8 1.3 -2.6 L0 -2.6'))
    ic.shape(R(-1.3, -2.6, 2.6, 11.6), tone=.3)
    ic.shape(ring(0, 12.2, 3.4, 1.6), tone=.3)
    return ic.place(D45, 38)


ICONS = [
    ('dagger', 'Dagger', dagger_a, dagger_b),
    ('straight_sword', 'Straight sword', straight_a, straight_b),
    ('greatsword', 'Greatsword', greatsword_a, greatsword_b),
    ('colossal_sword', 'Colossal sword', colossal_a, colossal_b),
    ('light_greatsword', 'Light greatsword', lightgs_a, lightgs_b),
    ('thrusting_sword', 'Thrusting sword', thrusting_a, thrusting_b),
    ('heavy_thrusting_sword', 'Heavy thrusting sword', heavythrust_a, heavythrust_b),
    ('curved_sword', 'Curved sword', curved_a, curved_b),
    ('curved_greatsword', 'Curved greatsword', curvedgs_a, curvedgs_b),
    ('katana', 'Katana', katana_a, katana_b),
    ('great_katana', 'Great katana', great_katana_a, great_katana_b),
    ('twinblade', 'Twinblade', twinblade_a, twinblade_b),
    ('backhand_blade', 'Backhand blade', backhand_a, backhand_b),
    ('throwing_blade', 'Throwing blade', throwing_a, throwing_b),
]
