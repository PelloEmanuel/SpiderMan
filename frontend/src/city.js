// ==========================================
// GENERACIÓN PROCEDURAL DE LA CIUDAD Y BOTIQUINES
// ==========================================
// Administra los chunks infinitos de la ciudad, los edificios enganchables y los botiquines.
class City {
  constructor(scene){
    this.s = scene;
    this.map = new Map(); // Almacena los chunks activos en memoria
    this.lastCi = -9;
  }

  // Actualiza los chunks alrededor del jugador y el estado de los botiquines
  update(px, dt = 0.016){
    const ci = Math.floor(px / CFG.CHUNK);
    
    // Carga chunks por delante y detrás del jugador
    for(let i = Math.max(0, ci - 2); i <= ci + 3; i++){
      if(!this.map.has(i)) this.make(i);
    }
    
    // Libera memoria de chunks que quedaron muy atrás
    for(const [i, c] of this.map){
      if(i < ci - 3){
        this.free(c);
        this.map.delete(i);
      }
    }

    // Actualiza los límites físicos del mundo
    if(ci !== this.lastCi){
      this.lastCi = ci;
      this.s.physics.world.setBounds(Math.max(0, ci - 2) * CFG.CHUNK, -3000, 1e7, CFG.STREET + 3080);
    }
    
    // ------------------------------------------
    // Lógica de Botiquines (Cura 100% y respawn 45s)
    // ------------------------------------------
    const p = this.s.player;
    for(const c of this.map.values()){
      if(!c.medkit) continue;
      const m = c.medkit;
      
      // Control del tiempo de reaparición (45 segundos)
      if(!m.activeMedkit){
        m.cooldown -= dt;
        if(m.cooldown <= 0){
          m.activeMedkit = true;
          m.setVisible(true);
          this.s.fx(m.bx, m.baseY, 0x33ff66, 10);
        }
      } 
      // Detección de contacto con el jugador
      else if(p && Math.hypot(p.x - m.bx, p.y - m.baseY) < 45){
        p.hp = CFG.PLAYER_HP; // Cura toda la vida al 100%
        m.activeMedkit = false;
        m.setVisible(false);
        m.cooldown = CFG.MEDKIT_COOLDOWN; // Reinicia el contador de 45 segundos
        this.s.fx(m.bx, m.baseY, 0x33ff66, 22);
        this.s.ring(m.bx, m.baseY, 0x33ff66);
        this.s.pop(m.bx, m.baseY - 35, '¡VIDA 100%!', true);
      }
    }
  }

  // Coordenada mínima activa en el eje X
  get minX(){ return Math.max(0, this.lastCi - 2) * CFG.CHUNK; }

  // Retorna todos los rectángulos de edificios donde la telaraña puede anclarse
  rects(){
    const a = [];
    for(const c of this.map.values()) a.push(...c.rects);
    return a;
  }

  // Construye proceduralmente un nuevo chunk (suelo, farolas, edificios fila A y B)
  make(i){
    const s = this.s, ST = CFG.STREET, r = new Phaser.Math.RandomDataGenerator(['c' + s.seed + '_' + i]);
    const prev = this.map.get(i - 1), c = { bodies: [], objs: [], rects: [], medkit: null, endX: 0, endXB: 0, endTop: 0 };
    const back = s.add.graphics().setDepth(-3), d = s.add.graphics().setDepth(2), glow = s.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    c.objs.push(back, d, glow);
    
    const tile = (key, x, y, w, h, depth) => {
      const t = s.add.tileSprite(x, y, w, h, key).setOrigin(0).setDepth(depth).setTilePosition(r.between(0, 255), r.between(0, 255));
      c.objs.push(t);
    };
    const blink = (x, y, w, h, col, dur) => {
      const o = s.add.rectangle(x, y, w, h, col).setDepth(3).setAlpha(0);
      c.objs.push(o);
      s.tweens.add({ targets: o, alpha: 1, duration: dur, yoyo: true, repeat: -1, delay: r.between(0, 800) });
    };
    const x0 = i * CFG.CHUNK, x1 = x0 + CFG.CHUNK;
    
    // ------------------------------------------
    // Suelo físico de la calle (colisión sólida)
    // ------------------------------------------
    const floor = s.add.rectangle(x0 + CFG.CHUNK / 2, ST + 40, CFG.CHUNK, 80, 0x0a0e20).setDepth(1);
    s.buildings.add(floor);
    c.bodies.push(floor);
    if(s.textures.exists('street')){
      const t = s.add.tileSprite(x0, ST + 4, CFG.CHUNK, 90, 'street').setOrigin(0).setDepth(1.5).setTilePosition(x0 % 256, 0);
      c.objs.push(t);
    }
    
    // Asfalto, líneas de calle y faroles decorativos
    d.fillStyle(0x1a2248).fillRect(x0, ST, CFG.CHUNK, 8);
    d.fillStyle(0x3b4478);
    for(let lx = x0; lx < x1; lx += 120) d.fillRect(lx, ST + 44, 60, 4);
    for(let lx = x0 + r.between(60, 200); lx < x1; lx += r.between(240, 340)){
      d.lineStyle(3, 0x4a5388).lineBetween(lx, ST, lx, ST - 130).lineBetween(lx, ST - 130, lx + 16, ST - 130);
      d.fillStyle(0xffe9a6).fillCircle(lx + 16, ST - 126, 5);
      glow.fillStyle(0xffe9a6, .07).fillTriangle(lx + 16, ST - 122, lx - 24, ST, lx + 56, ST).fillCircle(lx + 16, ST - 126, 24);
    }

    // Autos decorativos estacionados
    for(let k = 0; k < 2; k++){
      if(r.frac() < .7){
        const cx = x0 + r.between(40, CFG.CHUNK - 80), cc = r.pick([0xe0223a, 0x2a7bff, 0x7a84b8, 0xe8c43a]);
        d.fillStyle(cc).fillRect(cx, ST - 14, 52, 12);
        d.fillStyle(0x222846).fillRect(cx + 12, ST - 24, 28, 10);
        d.fillStyle(0x9fd8ff, .6).fillRect(cx + 15, ST - 22, 10, 7).fillRect(cx + 27, ST - 22, 10, 7);
        d.fillStyle(0x05060c).fillCircle(cx + 11, ST - 2, 5).fillCircle(cx + 41, ST - 2, 5);
        d.fillStyle(0xfff1a8).fillRect(cx + 50, ST - 11, 3, 4);
        glow.fillStyle(0xfff1a8, .15).fillTriangle(cx + 52, ST - 9, cx + 110, ST - 2, cx + 110, ST - 16);
      }
    }

    // ------------------------------------------
    // Botiquín fijo por chunk
    // ------------------------------------------
    const medX = x0 + 500, medY = ST - 18;
    const med = s.add.image(medX, medY, 'botiquin').setDepth(5).setScale(1.15);
    med.bx = medX;
    med.baseY = medY;
    med.activeMedkit = true;
    med.cooldown = 0;
    s.tweens.add({ targets: med, y: medY - 6, duration: 750, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.objs.push(med);
    c.medkit = med;

    // ------------------------------------------
    // Edificios Fila B (fondo, enganchables)
    // ------------------------------------------
    let xb = prev ? prev.endXB : x0;
    while(xb < x1){
      const w = r.between(120, 260), top = r.between(260, 980);
      tile('win_far', xb, top, w, ST - top, -4);
      c.rects.push({ x: xb, y: top, w, h: ST - top });
      if(r.frac() < .5){
        back.lineStyle(2, 0x1c2552).lineBetween(xb + w / 2, top, xb + w / 2, top - 40);
        back.fillStyle(0xff2a4a, .8).fillCircle(xb + w / 2, top - 40, 3);
      }
      xb += w + r.between(0, 30);
    }
    c.endXB = xb;

    // ------------------------------------------
    // Edificios Fila A (primer plano, detallados y enganchables)
    // ------------------------------------------
    let x = prev ? prev.endX : x0, prevTop = prev ? prev.endTop : 700;
    while(x < x1){
      const gap = (i === 0 && x === 0) ? 0 : (r.frac() < .3 ? r.between(20, 70) : 0);
      const w = r.between(150, 300), top = Phaser.Math.Clamp(prevTop + r.between(-260, 260), 300, 1050);
      x += gap;
      const h = ST - top, st = r.pick(['tower', 'brick', 'warehouse']);
      tile({ tower: 'win_tower', brick: 'win_brick', warehouse: 'win_ware' }[st], x, top, w, h, 1);
      c.rects.push({ x, y: top, w, h, front: true });
      d.fillStyle(0xffffff, .05).fillRect(x, top, 6, h);
      d.fillStyle(0x000000, .28).fillRect(x + w - 12, top, 12, h);
      
      const neon = r.pick([0xff2a4a, 0x2a7bff]);
      d.fillStyle(0x28336a).fillRect(x - 4, top - 6, w + 8, 8);
      d.fillStyle(neon).fillRect(x - 4, top - 6, w + 8, 2);
      glow.fillStyle(neon, .18).fillRect(x - 4, top - 14, w + 8, 16);
      d.fillStyle(0x070a18).fillRect(x, ST - 64, w, 64);
      
      for(let sx = x + 10; sx < x + w - 46; sx += r.between(56, 84)){
        const lc = r.pick([0xffd66b, 0x6bd6ff, 0xff5a7a]);
        d.fillStyle(lc, .85).fillRect(sx, ST - 48, 36, 32);
        d.fillStyle(r.pick([0xe0223a, 0x2a7bff]), .9).fillRect(sx - 4, ST - 56, 44, 8);
        glow.fillStyle(lc, .14).fillRect(sx - 6, ST - 54, 48, 44);
      }
      
      // Elementos del tejado (tanques de agua, aires acondicionados, chimeneas, letreros)
      const px = x + r.between(14, Math.max(15, w - 60)), pr = r.pick(['tank', 'ac', 'chimney', 'sign', 'none']);
      if(pr === 'tank'){
        d.fillStyle(0x3a2f2a).fillRect(px, top - 34, 26, 22).fillStyle(0x4a3a30).fillTriangle(px - 2, top - 34, px + 28, top - 34, px + 13, top - 46);
        d.lineStyle(2, 0x2a2a3a).lineBetween(px + 4, top - 12, px + 4, top).lineBetween(px + 22, top - 12, px + 22, top);
      } else if(pr === 'ac'){
        d.fillStyle(0x3a4068).fillRect(px, top - 16, 30, 16).fillStyle(0x222846).fillRect(px + 4, top - 12, 10, 8).fillRect(px + 17, top - 12, 10, 8);
      } else if(pr === 'chimney'){
        d.fillStyle(0x2a2238).fillRect(px, top - 40, 14, 40).fillStyle(0x3a3250).fillRect(px - 2, top - 44, 18, 6);
      } else if(pr === 'sign'){
        const sc = r.pick([0xff2a4a, 0x2a7bff, 0x3affb0]);
        d.lineStyle(2, 0x444a70).lineBetween(px + 4, top, px + 4, top - 18).lineBetween(px + 36, top, px + 36, top - 18);
        d.fillStyle(0x0a0e22).fillRect(px, top - 48, 40, 30);
        d.lineStyle(2, sc).strokeRect(px + 3, top - 45, 34, 24);
        glow.fillStyle(sc, .22).fillRect(px - 4, top - 52, 48, 38);
        blink(px + 20, top - 33, 28, 12, sc, r.between(500, 1400));
      }
      
      const ax = x + w / 2, ay = top - r.between(60, 120);
      d.lineStyle(3, 0x555e88).lineBetween(ax, top, ax, ay);
      blink(ax, ay - 5, 6, 6, 0xff2a4a, r.between(500, 900));
      if(r.frac() < .25) blink(x + r.between(20, w - 40), top + r.between(40, 300), 14, 18, 0x0b1128, r.between(300, 900));
      
      prevTop = top;
      x += w;
    }
    c.endX = x;
    c.endTop = prevTop;
    this.map.set(i, c);
  }

  // Libera de la memoria los objetos gráficos y colisiones de chunks lejanos
  free(c){
    c.bodies.forEach(o => this.s.buildings.remove(o, true, true));
    c.objs.forEach(o => { this.s.tweens.killTweensOf(o); o.destroy(); });
  }
}
