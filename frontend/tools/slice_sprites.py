#!/usr/bin/env python3
"""Corta una hoja de sprites con fondo liso en frames sueltos (PNG con transparencia).
Uso: python slice_sprites.py hoja.png carpeta_salida
Requiere: pip install pillow numpy scipy"""
import sys, os, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

src, out = sys.argv[1], sys.argv[2]
EXCLUDE = [(0,0,75,72),(70,0,9999,62),(0,470,200,9999),(370,452,9999,9999)]  # retrato, título, créditos, paletas (x0,y0,x1,y1)
MIN_AREA, MERGE = 12, 2                      # píxeles mínimos / dilatación para unir partes sueltas de un mismo sprite
os.makedirs(out, exist_ok=True)
im = Image.open(src).convert("RGBA"); a = np.array(im)
bg = tuple(a[2,2,:3])                        # color de fondo = píxel de la esquina
mask = np.any(a[:,:,:3] != np.array(bg), axis=2)
for x0,y0,x1,y1 in EXCLUDE: mask[y0:y1, x0:x1] = False
a[~mask] = (0,0,0,0)                         # fondo -> transparente
lab, n = ndi.label(ndi.binary_dilation(mask, iterations=MERGE))
boxes = []
for i, sl in enumerate(ndi.find_objects(lab), 1):
    ys, xs = sl
    if (mask[sl] & (lab[sl]==i)).sum() >= MIN_AREA: boxes.append([xs.start, ys.start, xs.stop, ys.stop])
boxes.sort(key=lambda b:(b[1]+b[3])/2)       # agrupar por filas
rows, cur = [], [boxes[0]]
for b in boxes[1:]:
    if (b[1]+b[3])/2 - (cur[-1][1]+cur[-1][3])/2 > 20 and b[1] > max(c[3] for c in cur) - 6: rows.append(cur); cur=[b]
    else: cur.append(b)
rows.append(cur)
names = []
for r, row in enumerate(rows):
    for c, b in enumerate(sorted(row, key=lambda b:b[0])):
        name = f"r{r}_{c:02d}"; Image.fromarray(a[b[1]:b[3], b[0]:b[2]]).save(f"{out}/{name}.png"); names.append((name, b))
# hoja de contacto numerada (x3) para elegir frames
S=3; sheet = Image.new("RGBA", (im.width*S, im.height*S), (60,60,60,255)); d = ImageDraw.Draw(sheet)
for name,b in names:
    f = Image.open(f"{out}/{name}.png"); sheet.alpha_composite(f.resize((f.width*S,f.height*S),Image.NEAREST),(b[0]*S,b[1]*S))
    d.text((b[0]*S, b[1]*S-10), name[1:].replace("_","."), fill=(255,255,0,255))
sheet.save(f"{out}/contact_sheet.png"); print(len(names), "frames;", [len(r) for r in rows], "por fila")
for name,b in names: print(name, b[2]-b[0], "x", b[3]-b[1])
