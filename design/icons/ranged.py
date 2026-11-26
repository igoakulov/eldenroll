"""Bows, the perfume bottle and the medium shield, with the flame and tower outline `iconset.py` reuses."""


from geo import (C, Icon, L, M, R, band, hlines, poly)

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

def light_bow():
    ic = Icon()
    ic.wire(L('M-14.28 4.29 L14.28 4.29'), 'hair')
    _arrow(ic, 6.6, -21, 2)
    ic.shape(band('M-15 5.4 C-11 -1 -6 -4.6 0 -4.6 C6 -4.6 11 -1 15 5.4',
                  [(0, .5), (.4, 1), (.5, 1.25), (.6, 1), (1, .5)]))
    ic.shape(R(-1.6, -6.4, 3.2, 3.6), tone=.3)
    return ic.place(D45, 37)


# ---------------------------------------------------------------- bow

def _recurve(w):
    return band('M-20.6 -6.4 C-19.4 -2.6 -16.6 -0.6 -13.4 -1.2 C-8 -2.2 -4.4 -7.4 0 -7.4 C4.4 -7.4 8 -2.2 13.4 -1.2 C16.6 -0.6 19.4 -2.6 20.6 -6.4',
                w, n=80)


def bow():
    ic = Icon()
    ic.wire(L('M-19.95 -4.8 L0 10.6 L19.95 -4.8'), 'hair')
    _arrow(ic, 10.6, -23, 2.1)
    ic.shape(_recurve([(0, .45), (.3, .95), (.5, 1.3), (.7, .95), (1, .45)]))
    ic.shape(R(-1.7, -9.2, 3.4, 3.8), tone=.3)
    ic.detail(hlines(-1.7, 1.7, [-8, -6.6]), fine=True)
    return ic.place(D45, 43)


# ---------------------------------------------------------------- greatbow

def greatbow():
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


FLAME = ('M0 0 C-4.6 0 -6.4 -3.4 -5.4 -7 C-4.8 -9.4 -3 -10.6 -2.8 -13.6 C-1.4 -12 -1 -10.4 -1.2 -9 '
         'C0 -11.6 1.6 -14.4 1.2 -18 C4 -15.6 5.6 -12 5.4 -8.6 C6.2 -9.4 6.6 -10.6 6.6 -11.8 '
         'C8 -9.4 7.8 -5.6 6.2 -3 C5 -1 2.8 0 0 0 Z')


# ---------------------------------------------------------------- perfume bottle

def perfume_bottle():
    ic = Icon()
    for x in (-5.2, 5.2):
        ic.shape(C(x, 8, 6.8), tone=.3)
        ic.detail(L(f'M{x-3.8} 5.6 C{x-3.2} 3.4 {x-1.8} 2.4 {x} 2.2'), fine=True)
        ic.shape(R(x - 1.4, -9, 2.8, 11.4))
    ic.shape(R(-8.4, -11.6, 16.8, 3), tone=.3)
    ic.shape(R(-1.4, -18.6, 2.8, 7))
    ic.shape(poly((-2.4, -18.4), (2.4, -18.4), (1.6, -21.6), (-1.6, -21.6)), tone=.3)
    return ic.place(0, 40)


HEATER = 'M0 -19 C6 -19.6 11 -19.2 15 -17.4 C15.6 -4 12.4 8.6 0 21'


def medium_shield():
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


TOWER = 'M0 -21.6 L10.2 -21.6 L12.8 -25 L13.4 -10 L12.8 9.6 C10.6 16.6 6 21.6 0 25.6'
