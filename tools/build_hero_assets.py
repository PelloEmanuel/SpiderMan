#!/usr/bin/env python3
"""Convierte frames sueltos en sprites del héroe para el juego.
Cada frame se coloca en una celda de 64x72: pies abajo (suelo) o centrado (en el aire), cuerpo centrado en X.
Uso: python tools/build_hero_assets.py sprites_src assets      (editá MAP para cambiar qué frame usa cada pose)"""
import sys, numpy as np
from PIL import Image
frames, out = sys.argv[1], sys.argv[2]
CW, CH, AIR_Y = 64, 72, 48
MAP = {  # nombre en el juego: (frame de origen, ¿en el aire?)
 'hero_idle':('r1_00',0), 'hero_run0':('r6_00',0), 'hero_run1':('r6_01',0), 'hero_run2':('r6_02',0), 'hero_run3':('r6_03',0),
 'hero_run4':('r6_04',0), 'hero_run5':('r6_05',0), 'hero_jump':('r2_10',1), 'hero_swing':('r2_07',1), 'hero_climb':('r2_05',1),
 'hero_dash':('r2_00',1), 'hero_punch':('r3_02',0), 'hero_punch0':('r3_02',0), 'hero_punch1':('r3_00',0), 'hero_punch2':('r3_05',0),
 'hero_hurt':('r4_08',0),
 # poses nuevas: reposo alterno, guardia, agacharse/deslizar, espera, enganche de telaraña, picada, voltereta, disparo de telaraña, derrota
 'hero_idle1':('r1_01',0), 'hero_ready':('r1_07',0), 'hero_crouch':('r1_03',0), 'hero_wait':('r1_05',0), 'hero_webstart':('r2_06',1),
 'hero_dive':('r2_09',1), 'hero_tumble0':('r2_02',1), 'hero_tumble1':('r2_03',1), 'hero_tumble2':('r2_04',1), 'hero_shoot':('r5_00',0), 'hero_dead':('r4_10',0)}
# efectos (se guardan recortados, sin celda): líneas de velocidad, hilos de telaraña y proyectil de telaraña
FX = {'fx_speed_h':'r1_08', 'fx_speed_v':'r1_09', 'fx_speed_d':'r1_10', 'fx_web0':'r3_08', 'fx_web1':'r3_09', 'fx_web2':'r3_10', 'fx_bolt':'r5_03'}
for key,(src,air) in MAP.items():
    im=Image.open(f'{frames}/{src}.png').convert('RGBA'); ys,xs=np.nonzero(np.array(im)[:,:,3]>0)
    cx,cy=int(xs.mean()),int(ys.mean()); cell=Image.new('RGBA',(CW,CH),(0,0,0,0))
    cell.paste(im,(CW//2-cx,(AIR_Y-cy) if air else CH-im.height),im); cell.save(f'{out}/{key}.png')
for key,src in FX.items():
    im=Image.open(f'{frames}/{src}.png').convert('RGBA'); im.crop(im.getbbox()).save(f'{out}/{key}.png')
print(len(MAP),'sprites +',len(FX),'efectos en',out)
