// ==========================================
// CLASE DEL JUGADOR (SPIDER-MAN)
// ==========================================
// Controla el movimiento, parkour, balanceo con telaraña, combate, esquiva y animaciones.
class Player {
  constructor(s, x, y){
    this.s = s;
    
    // Creación del sprite físico del héroe con colisiones en los límites del mundo
    this.sp = s.physics.add.sprite(x, y, 'hero_idle').setDepth(10).setCollideWorldBounds(true);
    {
      const im = s.textures.get('hero_idle').getSourceImage();
      // Configuración del cuerpo físico (20x38 px) centrado a los pies
      this.sp.setOrigin(.5, (im.height - 19) / im.height);
      this.sp.body.setSize(20, 38).setOffset((im.width - 20) / 2, im.height - 38).setMaxVelocity(950, 1300);
    }
    
    // Variables de estado del jugador (vida, dirección, telaraña, tiempos de ataque y esquiva)
    Object.assign(this, {
      hp: CFG.PLAYER_HP,
      facing: 1,
      web: null,
      inv: 0,
      dashT: 0,
      dashCd: 0,
      combo: 0,
      comboT: 0,
      atkCd: 0,
      shotCd: 0,
      climbing: false,
      wallDir: 0,
      trailT: 0,
      tryT: 0,
      lock: false,
      shootT: 0,
      webT: 0,
      tumbleT: 0,
      idleT: 0,
      leftClickDownPrev: false
    }); 

    // Cantidad de frames de carrera disponibles
    this.runN = 1;
    while(s.textures.exists('hero_run' + this.runN)) this.runN++;

    this.gfx = s.add.graphics().setDepth(9);

    // Teclas de control (movimiento, salto, esquiva y disparo F)
    this.k = s.input.keyboard.addKeys('A,D,W,S,E,Q,F,SPACE,SHIFT,J,K,LEFT,RIGHT,UP');
    s.input.setDefaultCursor('crosshair');
  }

  get x(){ return this.sp.x; }
  get y(){ return this.sp.y; }

  // ------------------------------------------
  // Búsqueda de punto de anclaje de telaraña
  // ------------------------------------------
  // Detecta si el cursor apunta a una fachada de edificio válida dentro del rango
  findTarget(){
    const pt = this.s.input.activePointer, m = this.s.cameras.main.getWorldPoint(pt.x, pt.y);
    if(Math.hypot(m.x - this.x, m.y - this.y) > CFG.WEB_RANGE) return null;
    let hit = null, bp = null, bs = 1e9;
    for(const r of this.s.city.rects()){
      const cx = Phaser.Math.Clamp(m.x, r.x, r.x + r.w);
      const cy = Phaser.Math.Clamp(m.y, r.y, r.y + r.h);
      const d = Math.hypot(m.x - cx, m.y - cy), sc = d - (r.front ? .5 : 0);
      if(d <= 36 && sc < bs){ bs = sc; hit = r; bp = { x: cx, y: cy }; }
    }
    return hit ? { x: bp.x, y: bp.y, rect: hit } : null;
  }

  // ------------------------------------------
  // Enganche de telaraña (Péndulo físico)
  // ------------------------------------------
  tryWeb(){
    const t = this.findTarget();
    if(!t) return;
    this.web = { x: t.x, y: t.y, len: Math.max(80, Math.hypot(t.x - this.x, t.y - this.y)) };
    this.facing = Math.sign(t.x - this.x) || this.facing;
    this.webT = .18;
    this.sp.body.velocity.x += this.facing * 40;
    this.s.ring(t.x, t.y, 0xffffff);
  }

  // Suelta la telaraña e impulsa al héroe
  release(){
    this.lock = true;
    if(this.web){
      if(Math.hypot(this.sp.body.velocity.x, this.sp.body.velocity.y) > 380) this.tumbleT = .6;
      this.web = null;
      this.sp.body.velocity.y -= 60;
    }
  }

  // Animación de derrota del jugador
  die(){
    this.web = null;
    const sp = this.sp;
    sp.setRotation(0).setScale(1).setAlpha(1).setVelocityX(0);
    sp.body.allowGravity = true;
    if(this.s.textures.exists('hero_dead')) sp.setTexture('hero_dead');
    this.gfx.clear();
  }

  // ------------------------------------------
  // Golpe físico (Clic Izquierdo / J)
  // ------------------------------------------
  // Aplica daño por combo a los enemigos frente al héroe; zona visual invisible
  punch(){
    if(this.atkCd > 0 || this.s.dead) return;
    this.atkCd = .24;
    this.combo = this.combo % 3 + 1;
    this.comboT = .7;
    const big = this.combo === 3, f = this.facing;
    const py = this.sp.body ? this.sp.body.center.y : this.y;

    this.s.enemies.getChildren().slice().forEach(e => {
      if(!e.active) return;
      const dx = (e.x - this.x) * f;
      const ey = e.body ? e.body.center.y : e.y;
      // Detección basada en el centro de masa físico de ambos personajes
      if(dx > -20 && dx < 85 && Math.abs(ey - py) < 75){
        this.s.hurtEnemy(e, 10 + this.combo * 5, f * (big ? 420 : 160), big ? -260 : -80);
      }
    });
  }

  // ------------------------------------------
  // Ataque de telaraña a distancia (Tecla F / K)
  // ------------------------------------------
  // Inmoviliza al enemigo apuntado durante 2 segundos y lo atrae hacia Spider-Man
  shoot(){
    if(this.shotCd > 0 || this.s.dead) return;
    this.shotCd = .7;
    this.shootT = .28;
    let t = null, bd = 380;
    const pt = this.s.input.activePointer, m = this.s.cameras.main.getWorldPoint(pt.x, pt.y);
    bd = 160;
    this.facing = Math.sign(m.x - this.x) || this.facing;
    const py = this.sp.body ? this.sp.body.center.y : this.y;

    this.s.enemies.getChildren().forEach(e => {
      if(!e.active) return;
      const ey = e.body ? e.body.center.y : e.y;
      const d = Math.hypot(e.x - m.x, ey - m.y);
      if(d < bd && Math.hypot(e.x - this.x, ey - py) < 550){ bd = d; t = e; }
    });

    const tx = t ? t.x : this.x + this.facing * 300;
    const ty = t ? (t.body ? t.body.center.y : t.y) : this.y;
    
    // Proyectil visual de telaraña
    const l = this.s.textures.exists('fx_bolt')
      ? this.s.add.image(this.x, this.y - 8, 'fx_bolt').setOrigin(0, .5).setDepth(11).setRotation(Math.atan2(ty - this.y + 8, tx - this.x)).setDisplaySize(Math.max(40, Math.hypot(tx - this.x, ty - this.y + 8)), 12)
      : this.s.add.line(0, 0, this.x, this.y, tx, ty, 0xffffff).setOrigin(0).setDepth(11);
    this.s.tweens.add({ targets: l, alpha: 0, duration: 260, onComplete: () => l.destroy() });

    if(t){
      t.d.stun = 2;
      webOn(this.s, t);
      const push = this.k.SHIFT.isDown ? -1 : 1;
      if(!t.d.boss) t.body.setVelocity(Math.sign(this.x - t.x) * push * 480, -160);
    }
  }

  // ------------------------------------------
  // Recibir daño y tiempo de invulnerabilidad
  // ------------------------------------------
  hurt(dmg, from){
    if(this.inv > 0 || this.s.dead) return;
    this.hp -= dmg;
    this.inv = .7;
    this.release();
    this.sp.body.setVelocity(-from * 260, -260);
    this.sp.setTintFill(0xffffff);
    this.s.time.delayedCall(90, () => this.sp.clearTint());
    this.s.cameras.main.shake(120, .006);
    this.s.fx(this.x, this.y, 0xe0223a, 8);
  }

  // ------------------------------------------
  // Bucle de actualización (Entrada, Física y Estado)
  // ------------------------------------------
  update(dt){
    const k = this.k, sp = this.sp, b = sp.body, J = Phaser.Input.Keyboard.JustDown;
    const dir = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    if(dir) this.facing = dir;
    sp.setFlipX(this.facing < 0);

    const ground = b.blocked.down || b.touching.down;
    const wall = !ground && (b.blocked.left || b.blocked.right);
    if(wall) this.wallDir = b.blocked.left ? 1 : -1;

    // Descontar tiempos de cooldowns e invulnerabilidad
    this.inv -= dt; this.dashT -= dt; this.dashCd -= dt; this.atkCd -= dt;
    this.shotCd -= dt; this.comboT -= dt; this.shootT -= dt; this.webT -= dt; this.tumbleT -= dt;
    if(this.comboT <= 0) this.combo = 0;
    sp.setAlpha(this.inv > 0 ? (Math.floor(this.inv * 20) % 2 ? .4 : 1) : 1);

    // Clic Derecho: colgarse de la telaraña
    const up = k.W.isDown || k.UP.isDown;
    const hold = this.s.input.activePointer.rightButtonDown() || k.E.isDown || k.Q.isDown;
    if(!hold) this.lock = false;
    this.tryT -= dt;
    if(hold && !this.web && !this.lock && this.tryT <= 0){ this.tryT = .1; this.tryWeb(); }
    if(!hold && this.web) this.release();

    // Clic Izquierdo: golpear
    const leftDown = this.s.input.activePointer.leftButtonDown();
    if(leftDown && !this.leftClickDownPrev){ this.punch(); }
    this.leftClickDownPrev = leftDown;

    if(J(k.J)) this.punch();
    // Tecla F: disparar telaraña a enemigo
    if(J(k.F) || J(k.K)) this.shoot();

    // Tecla Shift: esquiva / Dash con invulnerabilidad temporal
    if(J(k.SHIFT) && this.dashCd <= 0){
      this.dashCd = .7; this.dashT = .18; this.inv = Math.max(this.inv, .35); this.release();
      const vy = up ? -1 : 0, vx = (dir || this.facing);
      sp.setVelocity(vx * (vy ? 450 : 720), vy * 520);
      if(this.s.textures.exists('fx_speed_h')){
        this.s.tweens.add({ targets: this.s.add.image(sp.x - vx * 50, sp.y, 'fx_speed_h').setFlipX(vx < 0).setDepth(9).setScale(1.4), alpha: 0, duration: 260, onComplete: function(){ this.targets[0].destroy(); } });
      }
    }
    b.allowGravity = this.dashT <= 0;

    // Física de balanceo en telaraña (péndulo)
    if(this.dashT > 0){ /* impulso activo */ }
    else if(this.web){
      const w = this.web, v = b.velocity;
      v.x += dir * 750 * dt;
      if(k.W.isDown) w.len = Math.max(100, w.len - 260 * dt);
      if(k.S.isDown) w.len = Math.min(CFG.WEB_RANGE, w.len + 260 * dt);
      const dx = sp.x - w.x, dy = sp.y - w.y, d = Math.hypot(dx, dy) || 1;
      if(d > w.len){
        const nx = dx / d, ny = dy / d;
        sp.x = w.x + nx * w.len;
        sp.y = w.y + ny * w.len;
        const vn = v.x * nx + v.y * ny;
        if(vn > 0){ v.x -= nx * vn; v.y -= ny * vn; }
      }
      sp.rotation = Phaser.Math.Angle.RotateTo(sp.rotation, Math.atan2(-dx, dy), .2);
      if(J(k.SPACE)){ this.release(); v.y -= 240; }
    } else {
      // Movimiento normal en suelo y trepar por paredes
      sp.rotation *= .8;
      let vx = b.velocity.x, acc = ground ? 2400 : 900;
      if(ground && k.S.isDown) acc = 450;
      const tgt = dir * CFG.RUN * (ground && k.S.isDown ? 1.4 : 1);
      if(ground || (dir && (Math.abs(vx) < CFG.RUN || Math.sign(vx) !== dir))) vx += Phaser.Math.Clamp(tgt - vx, -acc * dt, acc * dt);
      sp.setVelocityX(vx);
      if(J(k.SPACE)){
        if(ground) sp.setVelocityY(-CFG.JUMP);
        else if(wall){ sp.setVelocity(this.wallDir * 330, -560); this.climbing = false; }
      }
      if(wall && up){ sp.setVelocityY(-240); this.climbing = true; } // Trepar
      else if(wall && b.velocity.y > 120) sp.setVelocityY(120);       // Deslizarse por pared
      if(this.climbing && !wall && !ground){ sp.setVelocity(this.wallDir * -1 * -220, -100); this.climbing = false; }
      if(ground) this.climbing = false;
      sp.setScale(1, ground && k.S.isDown ? (this.s.png.has('hero_crouch') ? 1 : .65) : 1 + (ground && dir ? Math.sin(this.s.time.now / 60) * .04 : 0));
    }

    // Límite de movimiento dentro de la arena de 2 pantallas durante batalla de jefe
    if(this.s.bossFight && this.s.arenaBounds){
      sp.x = Phaser.Math.Clamp(sp.x, this.s.arenaBounds.minX + 25, this.s.arenaBounds.maxX - 25);
    }

    this.idleT = (ground && !dir && !this.web && Math.abs(b.velocity.x) < 40) ? this.idleT + dt : 0;
    this.gfx.clear();
    this.aim();

    // Dibuja la línea de telaraña tensa con curvatura dinámica
    if(this.web){
      const w = this.web, hx = sp.x, hy = sp.y - 12, d = Math.hypot(w.x - hx, w.y - hy), sag = Math.max(0, w.len - d) * .5;
      for(const [lw, col, al] of [[7, 0x6bb0ff, .25], [2.5, 0xffffff, .95]]){
        this.gfx.lineStyle(lw, col, al).beginPath().moveTo(hx, hy);
        for(let t = .1; t <= 1.01; t += .1) this.gfx.lineTo(hx + (w.x - hx) * t, hy + (w.y - hy) * t + Math.sin(Math.PI * t) * sag);
        this.gfx.strokePath();
      }
      this.gfx.fillStyle(0xffffff).fillCircle(w.x, w.y, 4);
    }
    this.visuals(ground, wall, dt);
  }

  // Dibuja la mira táctica que se ilumina en celeste al apuntar a un edificio válido
  aim(){
    const pt = this.s.input.activePointer, m = this.s.cameras.main.getWorldPoint(pt.x, pt.y), t = this.findTarget(), g = this.gfx;
    g.lineStyle(2, t ? 0x6bd6ff : 0x777c9c, .95).strokeCircle(m.x, m.y, 12).lineBetween(m.x - 20, m.y, m.x - 7, m.y).lineBetween(m.x + 7, m.y, m.x + 20, m.y).lineBetween(m.x, m.y - 20, m.x, m.y - 7).lineBetween(m.x, m.y + 7, m.x, m.y + 20);
    if(t){
      g.fillStyle(0x6bd6ff, .07).fillRect(t.rect.x, t.rect.y, t.rect.w, t.rect.h);
      g.lineStyle(2, 0x6bd6ff, .45).strokeRect(t.rect.x, t.rect.y, t.rect.w, t.rect.h);
      if(!this.web){
        g.fillStyle(0x6bd6ff, .9).fillCircle(t.x, t.y, 4);
        g.lineStyle(1, 0x6bd6ff, .35).lineBetween(this.x, this.y - 12, t.x, t.y);
      }
    }
  }

  // ------------------------------------------
  // Selección de sprites según el estado actual
  // ------------------------------------------
  visuals(ground, wall, dt){
    const sp = this.sp, b = sp.body, s = this.s, spd = Math.hypot(b.velocity.x, b.velocity.y), k = this.k;
    const has = q => s.textures.exists(q), T = (q, fb) => has(q) ? q : fb;
    let key = 'hero_idle';

    if(this.inv > .5 && has('hero_hurt')) key = 'hero_hurt';
    else if(this.dashT > 0 && has('hero_dash')) key = 'hero_dash';
    else if(this.shootT > 0) key = T('hero_shoot', 'hero_punch');
    else if(this.atkCd > .12){ key = 'hero_punch' + (this.combo - 1); if(!has(key)) key = 'hero_punch'; }
    else if(this.web) key = this.webT > 0 ? T('hero_webstart', 'hero_swing') : 'hero_swing';
    else if(this.climbing && wall) key = 'hero_climb';
    else if(!ground) key = this.tumbleT > 0 ? T('hero_tumble' + (Math.floor(s.time.now / 70) % 3), 'hero_jump') : (b.velocity.y > 560 ? T('hero_dive', 'hero_jump') : 'hero_jump');
    else if(Math.abs(b.velocity.x) > 40) key = k.S.isDown ? T('hero_crouch', 'hero_idle') : 'hero_run' + (Math.floor(s.time.now / (this.runN > 2 ? 75 : 110)) % this.runN);
    else if(k.S.isDown) key = T('hero_crouch', 'hero_idle');
    else {
      const t = this.idleT % 12, near = s.enemies.getChildren().some(e => Math.abs(e.x - this.x) < 380 && Math.abs(e.y - this.y) < 120);
      key = near ? T('hero_ready', 'hero_idle') : t > 10 ? T('hero_wait', 'hero_idle') : t > 5.5 ? T('hero_idle1', 'hero_idle') : 'hero_idle';
    }

    if(sp.texture.key !== key) sp.setTexture(key);
    this.trailT -= dt;

    // Estela visual a alta velocidad
    if(spd > 520 && this.trailT <= 0){
      this.trailT = .045;
      const gh = s.add.image(sp.x, sp.y, key).setOrigin(sp.originX, sp.originY).setFlipX(sp.flipX).setRotation(sp.rotation).setTint(0x3a7bff).setAlpha(.4).setDepth(9);
      s.tweens.add({ targets: gh, alpha: 0, duration: 260, onComplete: () => gh.destroy() });
      if(spd > 700){
        const ax = Math.abs(b.velocity.x), ay = Math.abs(b.velocity.y);
        const fk = ax > ay * 2 ? 'fx_speed_h' : ay > ax * 2 ? 'fx_speed_v' : 'fx_speed_d';
        const B = Phaser.Math.Between;
        let l;
        if(has(fk)){
          l = s.add.image(sp.x + B(-560, 560), sp.y + B(-320, 320), fk).setDepth(5).setAlpha(.75).setScale(2);
          if(fk === 'fx_speed_d') l.setFlipX(b.velocity.x * b.velocity.y > 0);
          if(fk === 'fx_speed_h') l.setFlipX(b.velocity.x < 0);
        } else {
          l = s.add.rectangle(sp.x + B(-600, 600), sp.y + B(-350, 350), 50, 2, 0xffffff, .5).setRotation(Math.atan2(b.velocity.y, b.velocity.x)).setDepth(5);
        }
        s.tweens.add({ targets: l, alpha: 0, duration: 220, onComplete: () => l.destroy() });
      }
    }
  }
}
