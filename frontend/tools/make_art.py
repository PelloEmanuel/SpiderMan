#!/usr/bin/env python3
"""Genera los sprites de enemigos y las texturas de ciudad (pixel art) en assets/.
Uso: python tools/make_art.py assets      (necesita Pillow y numpy)
Cada archivo se puede reemplazar por uno propio con el mismo nombre."""
import sys, os, random, math
import numpy as np
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else 'assets'
os.makedirs(OUT, exist_ok=True)
OL = (24, 10, 34, 255)  # color de contorno (parecido al del héroe)

def C(r, g, b, a=255): return (r, g, b, a)
def shade(c, f): return (max(0, min(255, int(c[0]*f))), max(0, min(255, int(c[1]*f))), max(0, min(255, int(c[2]*f))), c[3] if len(c) > 3 else 255)

class Px:
    def __init__(s, w, h): s.w, s.h = w, h; s.a = np.zeros((h, w, 4), np.uint8)
    def set(s, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < s.w and 0 <= y < s.h: s.a[y, x] = c
    def rect(s, x0, y0, x1, y1, c):  # [x0,x1) x [y0,y1)
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        s.a[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = c
    def ell(s, cx, cy, rx, ry, c):
        for y in range(int(cy-ry-1), int(cy+ry+2)):
            for x in range(int(cx-rx-1), int(cx+rx+2)):
                if ((x+.5-cx)/rx)**2 + ((y+.5-cy)/ry)**2 <= 1: s.set(x, y, c)
    def line(s, x0, y0, x1, y1, c, t=2):
        n = int(max(abs(x1-x0), abs(y1-y0))*2)+1
        for i in range(n+1):
            x = x0+(x1-x0)*i/n; y = y0+(y1-y0)*i/n
            s.rect(round(x-t/2), round(y-t/2), round(x-t/2)+t, round(y-t/2)+t, c)
    def tri(s, p, c):
        (x0, y0), (x1, y1), (x2, y2) = p
        for y in range(int(min(y0, y1, y2)), int(max(y0, y1, y2))+1):
            for x in range(int(min(x0, x1, x2)), int(max(x0, x1, x2))+1):
                d1 = (x-x1)*(y0-y1)-(x0-x1)*(y-y1); d2 = (x-x2)*(y1-y2)-(x1-x2)*(y-y2); d3 = (x-x0)*(y2-y0)-(x2-x0)*(y-y0)
                if not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0)): s.set(x, y, c)
    def outline(s, c=OL):
        m = s.a[:, :, 3] > 0; n = np.zeros_like(m)
        n[1:, :] |= m[:-1, :]; n[:-1, :] |= m[1:, :]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]
        s.a[n & ~m] = c
    def save(s, name): Image.fromarray(s.a, 'RGBA').save(os.path.join(OUT, name))

# ---------------------------------------------------------------- enemigos
POSE = {  # pie delantero/trasero (dx, altura), mano delantera/trasera (dx, dy desde el hombro), rebote
  0: dict(ff=(4, 0), fb=(-4, 0), hf=(6, 11), hb=(-6, 11), bob=0),
  1: dict(ff=(10, 3), fb=(-8, 0), hf=(-5, 10), hb=(8, 8), bob=1),
  2: dict(ff=(-8, 0), fb=(9, 3), hf=(8, 8), hb=(-5, 10), bob=1),
}

def human(W, H, o, k):
    p = Px(W, H); ps = POSE[k]; cx = W//2; gy = H-3
    legL, torH, torW, headR = o['leg'], o['torso_h'], o['torso_w'], o['head']
    hip = gy-legL-ps['bob']; top = hip-torH; sh = top+4
    # brazo trasero
    hbx, hby = cx+ps['hb'][0]*o.get('arm_k', 1), sh+ps['hb'][1]*o.get('arm_k', 1)
    p.line(cx-torW//2+1, sh, hbx, hby, shade(o['arm'], .75), o['arm_w']); p.rect(hbx-1, hby-1, hbx+2, hby+2, shade(o['skin'], .8))
    # piernas
    for (fx, fy), col, side in ((ps['fb'], shade(o['pants'], .75), -1), (ps['ff'], o['pants'], 1)):
        px_ = cx+side*(o['gap']); fxx = cx+fx*o.get('stride', 1); fyy = gy-fy
        p.line(px_, hip, fxx, fyy-2, col, o['leg_w']); p.rect(fxx-2, fyy-3, fxx+5, fyy+1, o['shoe'])
    # torso
    p.rect(cx-torW//2, top, cx+torW//2, hip+1, o['shirt']); p.rect(cx-torW//2, top, cx-torW//2+2, hip+1, shade(o['shirt'], 1.2))
    p.rect(cx+torW//2-2, top, cx+torW//2, hip+1, shade(o['shirt'], .72)); p.rect(cx-torW//2, hip-2, cx+torW//2, hip+1, o['belt'])
    if 'torso_fx' in o: o['torso_fx'](p, cx, top, hip, torW)
    # cabeza
    hy = top-headR+2; hx = cx+1
    p.ell(hx, hy, headR, headR, o['skin']); p.ell(hx-2, hy-1, headR-2, headR-2, shade(o['skin'], 1.08))
    p.rect(hx+headR-3, hy+1, hx+headR-1, hy+3, shade(o['skin'], .8))
    if 'head_fx' in o: o['head_fx'](p, hx, hy, headR)
    ex = hx+2; ey = hy-1  # ojos mirando a la derecha
    p.rect(ex, ey, ex+4, ey+3, (250, 250, 250, 255)); p.rect(ex+2, ey, ex+4, ey+3, o.get('eye', (30, 10, 20, 255)))
    p.line(ex-1, ey-2, ex+4, ey-1, o.get('brow', OL), 1); p.rect(ex+1, hy+4, ex+5, hy+5, shade(o['skin'], .6))
    # brazo delantero
    hfx, hfy = cx+ps['hf'][0]*o.get('arm_k', 1), sh+ps['hf'][1]*o.get('arm_k', 1)
    p.line(cx+torW//2-1, sh, hfx, hfy, o['arm'], o['arm_w']); p.rect(hfx-1, hfy-1, hfx+2, hfy+2, o['skin'])
    if 'hand_fx' in o: o['hand_fx'](p, hfx, hfy, k)
    return p

def fin(p, name): p.outline(); p.save(name)

def thug(k):
    def head(p, hx, hy, r):  # gorro negro + cicatriz
        p.ell(hx, hy-3, r, r-3, C(30, 30, 40)); p.rect(hx-r, hy-3, hx+r, hy-1, C(30, 30, 40)); p.rect(hx-r, hy-3, hx+r, hy-2, C(70, 70, 90))
    def hand(p, x, y, k):  # bate de madera
        p.line(x, y, x+9, y-13, C(150, 100, 55), 3); p.line(x+8, y-12, x+11, y-16, C(110, 70, 38), 4)
    o = dict(leg=15, torso_h=15, torso_w=15, head=7, gap=3, leg_w=5, arm_w=4, skin=C(224, 172, 128), shirt=C(98, 104, 122), arm=C(98, 104, 122),
             pants=C(44, 48, 74), shoe=C(20, 20, 24), belt=C(30, 30, 36), head_fx=head, hand_fx=hand)
    return human(64, 72, o, k)

def gunner(k):
    def head(p, hx, hy, r):  # gorra verde con visera
        p.ell(hx, hy-3, r, r-3, C(52, 110, 64)); p.rect(hx-r, hy-3, hx+r+3, hy-1, C(40, 90, 52)); p.rect(hx+2, hy-2, hx+r+4, hy, C(30, 70, 40))
    def hand(p, x, y, k):  # pistola
        p.rect(x, y-3, x+9, y, C(60, 62, 72)); p.rect(x, y, x+3, y+4, C(40, 42, 50)); p.rect(x+9, y-3, x+11, y-2, C(250, 220, 90))
    o = dict(leg=15, torso_h=15, torso_w=14, head=7, gap=3, leg_w=5, arm_w=4, skin=C(214, 164, 120), shirt=C(66, 140, 80), arm=C(66, 140, 80),
             pants=C(58, 52, 40), shoe=C(26, 22, 18), belt=C(120, 90, 40), head_fx=head, hand_fx=hand)
    return human(64, 72, o, k)

def runner(k):
    def head(p, hx, hy, r):
        p.ell(hx, hy-3, r, r-3, C(20, 20, 26)); p.rect(hx+1, hy-3, hx+r+3, hy-1, C(20, 20, 26))
    o = dict(leg=16, torso_h=14, torso_w=12, head=6, gap=3, leg_w=4, arm_w=4, skin=C(224, 172, 128), shirt=C(240, 214, 70), arm=C(240, 214, 70),
             pants=C(40, 50, 90), shoe=C(240, 240, 240), belt=C(30, 30, 40), head_fx=head, stride=1.25, arm_k=1.3)
    return human(64, 72, o, k)

def brute(k):
    def torso(p, cx, top, hip, w):  # camiseta sin mangas + tirantes
        p.rect(cx-w//2+3, top, cx-w//2+6, hip, C(120, 70, 30)); p.rect(cx+w//2-6, top, cx+w//2-3, hip, C(120, 70, 30))
    def head(p, hx, hy, r): p.rect(hx-r, hy-r, hx+r, hy-r+3, shade(C(206, 150, 112), .9))
    def hand(p, x, y, k): p.ell(x+1, y+1, 4, 4, C(206, 150, 112))
    o = dict(leg=18, torso_h=24, torso_w=28, head=9, gap=6, leg_w=9, arm_w=8, skin=C(206, 150, 112), shirt=C(226, 132, 58), arm=C(206, 150, 112),
             pants=C(60, 56, 84), shoe=C(34, 30, 28), belt=C(100, 70, 30), torso_fx=torso, head_fx=head, hand_fx=hand, brow=C(20, 8, 8))
    return human(96, 88, o, k)

def rhino(k):
    def head(p, hx, hy, r):  # casco con cuerno
        p.ell(hx, hy-1, r+1, r, C(120, 128, 142)); p.rect(hx-r, hy+2, hx+r+1, hy+6, C(120, 128, 142))
        p.tri([(hx+r-2, hy-1), (hx+r+9, hy-9), (hx+r+3, hy+3)], C(238, 232, 214)); p.tri([(hx+r-2, hy+1), (hx+r+5, hy-5), (hx+r+2, hy+3)], C(200, 192, 170))
        p.rect(hx-r+2, hy-r, hx-r+5, hy, C(160, 168, 182))
    def torso(p, cx, top, hip, w):
        p.rect(cx-w//2-4, top-2, cx-w//2+7, top+8, C(150, 158, 172)); p.rect(cx+w//2-7, top-2, cx+w//2+4, top+8, C(100, 108, 122))
        p.rect(cx-6, top+8, cx+6, hip-3, C(90, 98, 112)); p.rect(cx-2, top+10, cx+2, hip-5, C(200, 60, 60))
    def hand(p, x, y, k): p.ell(x+1, y+1, 6, 6, C(110, 118, 132))
    o = dict(leg=26, torso_h=32, torso_w=40, head=11, gap=9, leg_w=12, arm_w=12, skin=C(150, 156, 170), shirt=C(120, 128, 142), arm=C(130, 138, 152),
             pants=C(86, 92, 108), shoe=C(50, 54, 66), belt=C(60, 64, 76), torso_fx=torso, head_fx=head, hand_fx=hand, eye=C(255, 70, 70), arm_k=1.4, stride=1.5)
    return human(128, 112, o, k)

def electro(k):
    def head(p, hx, hy, r):  # máscara-estrella amarilla con púas
        p.ell(hx, hy, r+1, r+1, C(250, 220, 40))
        for ang in (-150, -110, -70, -30):
            a = math.radians(ang); p.tri([(hx+math.cos(a-.35)*r, hy+math.sin(a-.35)*r), (hx+math.cos(a)*(r+9), hy+math.sin(a)*(r+9)), (hx+math.cos(a+.35)*r, hy+math.sin(a+.35)*r)], C(250, 220, 40))
        p.ell(hx+2, hy+1, r-3, r-3, C(60, 160, 100))
    def torso(p, cx, top, hip, w):  # rayo amarillo en el pecho
        p.line(cx+2, top+1, cx-3, top+8, C(250, 220, 40), 3); p.line(cx-3, top+8, cx+3, top+14, C(250, 220, 40), 3)
    def hand(p, x, y, k):
        p.ell(x+1, y+1, 4, 4, C(120, 230, 255)); 
        for i in range(3):
            a = random.Random(k*7+i).uniform(0, 6.28); p.line(x+1, y+1, x+1+math.cos(a)*9, y+1+math.sin(a)*9, C(190, 245, 255), 1)
    o = dict(leg=20, torso_h=22, torso_w=20, head=8, gap=4, leg_w=7, arm_w=6, skin=C(60, 160, 100), shirt=C(40, 140, 86), arm=C(40, 140, 86),
             pants=C(34, 112, 70), shoe=C(250, 220, 40), belt=C(250, 220, 40), torso_fx=torso, head_fx=head, hand_fx=hand, eye=C(10, 40, 90), arm_k=1.2)
    return human(88, 92, o, k)

for name, fn in dict(thug=thug, gunner=gunner, runner=runner, brute=brute, rhino=rhino, electro=electro).items():
    for k in range(3): fin(fn(k), f'e_{name}_{k}.png')

# ---------------------------------------------------------------- texturas de ciudad
rng = np.random.RandomState(11)
def noise(p, amt, seed=0):
    r = np.random.RandomState(seed); n = r.randint(-amt, amt+1, (p.h, p.w, 1))
    rgb = p.a[:, :, :3].astype(int)+n; m = p.a[:, :, 3:4] > 0; p.a[:, :, :3] = np.where(m, np.clip(rgb, 0, 255), p.a[:, :, :3]).astype(np.uint8)

LIT = [C(255, 214, 107), C(255, 196, 92), C(120, 220, 255), C(255, 226, 150)]
def window(p, x, y, w, h, lit, frame, rnd, sill=None, curtain=False):
    p.rect(x-1, y-1, x+w+1, y+h+1, frame)
    if lit:
        c = rnd.choice(LIT); p.rect(x, y, x+w, y+h, c); p.rect(x, y, x+w, y+1, shade(c, 1.12)); p.rect(x, y+h-1, x+w, y+h, shade(c, .8))
        if curtain: p.rect(x, y, x+w//3, y+h, shade(c, .62)); p.rect(x+w-w//4, y, x+w, y+h, shade(c, .62))
        elif rnd.random() < .12: p.rect(x+w//2-1, y+h-6, x+w//2+2, y+h, C(40, 30, 40)); p.rect(x+w//2-2, y+h-9, x+w//2+3, y+h-6, C(40, 30, 40))  # silueta
        p.rect(x+w//2, y, x+w//2+1, y+h, shade(c, .7))  # travesaño
    else:
        p.rect(x, y, x+w, y+h, C(9, 13, 32)); p.line(x+1, y+h-2, x+w-3, y+2, C(24, 34, 70), 1); p.rect(x, y+h-2, x+w, y+h, C(14, 20, 44))
    if sill: p.rect(x-2, y+h+1, x+w+2, y+h+3, sill)

def tower():
    p = Px(256, 256); rnd = random.Random(5); p.rect(0, 0, 256, 256, C(20, 28, 58))
    for gx in range(0, 256, 32):
        p.rect(gx, 0, gx+1, 256, C(30, 40, 82)); p.rect(gx+31, 0, gx+32, 256, C(14, 20, 42))
    for gy in range(0, 256, 64): p.rect(0, gy, 256, gy+3, C(46, 58, 108)); p.rect(0, gy+3, 256, gy+5, C(12, 16, 34))
    for gy in range(0, 256, 32):
        for gx in range(0, 256, 32): window(p, gx+8, gy+9, 16, 18, rnd.random() < .42, C(48, 60, 112), rnd, curtain=rnd.random() < .2)
    for gx in (0, 128): p.rect(gx, 0, gx+3, 256, C(36, 46, 96)); p.rect(gx+3, 0, gx+4, 256, C(10, 14, 30))
    noise(p, 4, 1); return p
def brick():
    p = Px(256, 256); rnd = random.Random(6); base = C(70, 38, 52); p.rect(0, 0, 256, 256, shade(base, .55))
    for r in range(32):
        off = 8 if r % 2 else 0
        for b in range(-1, 17):
            x = b*16+off; col = shade(base, rnd.uniform(.8, 1.15)); p.rect(x+1, r*8+1, x+15, r*8+7, col); p.rect(x+1, r*8+1, x+15, r*8+2, shade(col, 1.15))
    for gy in range(0, 256, 64):
        for gx in range(0, 256, 32):
            lit = rnd.random() < .38; x, y = gx+8, gy+14
            p.rect(x-3, y-4, x+19, y+26, C(180, 170, 160)); window(p, x, y, 16, 22, lit, C(60, 36, 44), rnd, sill=C(200, 190, 178), curtain=rnd.random() < .3)
            if rnd.random() < .12: p.rect(x+2, y+26, x+14, y+34, C(90, 96, 120)); p.rect(x+4, y+28, x+12, y+32, C(40, 44, 60))  # aire acondicionado
        p.rect(0, gy+58, 256, gy+61, C(150, 140, 132)); p.rect(0, gy+61, 256, gy+63, C(20, 8, 16))
    noise(p, 5, 2); return p
def ware():
    p = Px(256, 256); rnd = random.Random(8)
    for x in range(256): p.rect(x, 0, x+1, 256, C(40, 52, 76) if x % 4 < 2 else C(32, 42, 64))
    for gy in range(0, 256, 64):
        p.rect(0, gy, 256, gy+4, C(70, 82, 110)); p.rect(0, gy+4, 256, gy+6, C(14, 18, 30))
        for gx in range(0, 256, 64):
            lit = rnd.random() < .45; x, y = gx+8, gy+22; c = rnd.choice(LIT)
            p.rect(x-2, y-2, x+48, y+24, C(24, 30, 46))
            for i in range(4):
                if lit: p.rect(x+i*12, y, x+i*12+10, y+20, shade(c, .85 if i % 2 else 1)); 
                else: p.rect(x+i*12, y, x+i*12+10, y+20, C(9, 13, 30)); p.line(x+i*12+1, y+18, x+i*12+8, y+2, C(24, 34, 70), 1)
            p.rect(x-2, y+10, x+48, y+12, C(24, 30, 46))
    for px_ in (20, 148): p.rect(px_, 0, px_+5, 256, C(88, 96, 120)); p.rect(px_, 0, px_+1, 256, C(130, 138, 160)); p.rect(px_+4, 0, px_+5, 256, C(30, 34, 50))
    for gy in range(0, 256, 64):  # franjas de peligro
        for i in range(0, 256, 16): p.tri([(i, gy+54), (i+8, gy+54), (i, gy+61)], C(220, 170, 30)); p.tri([(i+8, gy+54), (i+8, gy+61), (i, gy+61)], C(220, 170, 30))
    for x in range(10, 256, 70): p.rect(x, 0, x+2, 256, C(70, 40, 30, 120))  # óxido
    noise(p, 5, 3); return p
def far():
    p = Px(256, 256); rnd = random.Random(9); p.rect(0, 0, 256, 256, C(13, 19, 48))
    for gy in range(0, 256, 32):
        p.rect(0, gy, 256, gy+1, C(20, 28, 62))
        for gx in range(0, 256, 32):
            if rnd.random() < .16: c = rnd.choice(LIT); p.rect(gx+13, gy+12, gx+19, gy+20, shade(c, .8))
            else: p.rect(gx+13, gy+12, gx+19, gy+20, C(8, 11, 28))
    noise(p, 3, 4); return p
for n, f in dict(win_tower=tower, win_brick=brick, win_ware=ware, win_far=far).items(): f().save(n+'.png')

def street():
    p = Px(256, 96); r = np.random.RandomState(3); base = r.randint(22, 34, (96, 256, 1))
    p.a[:, :, :3] = np.concatenate([base, base+3, base+14], axis=2).astype(np.uint8); p.a[:, :, 3] = 255
    for i in range(10):  # grietas
        x, y = r.randint(0, 256), r.randint(10, 90)
        for j in range(r.randint(10, 26)): x = (x+r.randint(-1, 3)) % 256; y = int(np.clip(y+r.randint(-2, 3), 0, 95)); p.a[y, x, :3] = (8, 8, 20)
    p.ell(168, 62, 11, 5, C(14, 14, 28)); p.ell(168, 62, 8, 3, C(40, 42, 66)); p.rect(160, 62, 177, 63, C(14, 14, 28))  # alcantarilla
    p.rect(0, 0, 256, 3, C(52, 56, 92)); p.rect(0, 3, 256, 5, C(12, 12, 26)); return p
street().save('street.png')

def moon():
    p = Px(160, 160)
    for rad, a in ((80, 26), (66, 46)): p.ell(80, 80, rad, rad, C(223, 230, 255, a))
    p.ell(80, 80, 46, 46, C(236, 240, 255)); p.ell(76, 76, 42, 42, C(244, 246, 255))
    for cx, cy, r in ((64, 68, 9), (96, 92, 12), (88, 58, 6), (70, 98, 6), (102, 70, 4)):
        p.ell(cx, cy, r, r, C(196, 204, 232)); p.ell(cx-1, cy-1, r-2, r-2, C(208, 214, 240))
    p.save('moon.png')
moon()

def sky():
    h, w = 720, 1280; y = np.linspace(0, 1, h)[:, None]
    top = np.array([3, 5, 15]); mid = np.array([22, 18, 70]); bot = np.array([70, 36, 110])
    col = np.where(y < .6, top+(mid-top)*(y/.6)[..., None] if False else 0, 0)
    t = y[:, 0]; img = np.zeros((h, w, 3)); 
    for i in range(h):
        f = t[i]; c = top+(mid-top)*(f/.55) if f < .55 else mid+(bot-mid)*((f-.55)/.45); img[i, :, :] = c
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]])/16.0-.5
    img += np.tile(bayer, (h//4, w//4))[..., None]*5  # dithering para evitar bandas
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB').save(os.path.join(OUT, 'sky.png'))
sky()

def skyline(name, col, edge, hmin, hmax, win, seed, wmin=60, wmax=130):
    p = Px(1280, 500); r = random.Random(seed); x = 0
    while x < 1280:
        w = r.randint(wmin, wmax); h = r.randint(hmin, hmax); top = 500-h
        for xx in range(x, x+w):
            xm = xx % 1280; p.rect(xm, top, xm+1, 500, col)
        for xx in (x, x+w-1): p.rect(xx % 1280, top, xx % 1280+1, 500, shade(col, .8))
        p.rect(x % 1280, top, min(x+w, 1280), top+2, edge) if x+w <= 1280 else None
        if r.random() < .5:  # antena
            ax = (x+w//2) % 1280; p.rect(ax, top-r.randint(14, 34), ax+2, top, shade(col, 1.3)); 
        for wy in range(top+10, 490, 14):
            for wx in range(x+6, x+w-8, 12):
                if r.random() < win: p.rect(wx % 1280, wy, wx % 1280+3, wy+5, C(255, 214, 107, 150))
        x += w
    p.save(name)
skyline('far.png', C(12, 18, 48), C(36, 44, 100), 120, 300, .04, 21)
skyline('mid.png', C(18, 26, 62), C(54, 66, 130), 140, 360, .09, 22)
print('arte generado en', OUT)
