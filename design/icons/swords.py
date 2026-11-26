"""The sword helper `iconset.py` draws its blades with, and the thrusting sword. Authored upright, tip at y=-28, then turned 45 degrees."""

from geo import (C, E, Icon, L, M, R, U, band, wraps)

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


# ---------------------------------------------------------------- swept guard

def _sguard(y, reach, w):
    up = band(f'M0 {y} C{reach*.5} {y} {reach*.85} {y-1} {reach} {y-3.6}', w)
    down = band(f'M0 {y} C{-reach*.5} {y} {-reach*.85} {y+1} {-reach} {y+3.6}', w)
    return U(up, down, R(-w*1.6, y - w*1.4, w*3.2, w*2.8))


# ---------------------------------------------------------------- thrusting sword

def thrusting_sword():
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
