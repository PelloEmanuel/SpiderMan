// ==========================================
// SISTEMA DE ENEMIGOS COMUNES Y JEFES
// ==========================================
// Controla la creación, inteligencia artificial (IA), ataques y animaciones de los personajes enemigos.

// ------------------------------------------
// Creación y aparición de un enemigo común
// ------------------------------------------
// Configura vida, tamaño del cuerpo de colisión centrado en los pies y puntos que otorga
function spawnEnemy(s, x, y, type, ev, lvl=1){
  const def = GAME_ENEMIES[type] || GAME_ENEMIES.duke;
  const k0 = def.idleKeys && def.idleKeys[0] ? def.idleKeys[0] : 'hero_idle';
  
  // Se apoya directamente sobre la superficie de la calle (CFG.STREET)
  const spawnY = CFG.STREET;
  const e = s.enemies.create(x, spawnY, k0).setDepth(8);
  const sc = def.scale || 0.95;
  e.setScale(sc);
  e.setOrigin(0.5, 1.0); // Ancla en los pies para evitar desfases de altura
  e.setCollideWorldBounds(true);
  
  const bw = Math.min(Math.max(24, e.width * 0.55), 44);
  const bh = Math.min(Math.max(40, e.height * 0.8), 70);
  e.body.setSize(bw, bh).setOffset((e.width - bw) / 2, e.height - bh);
  
  const hp = Math.round(def.hp * (1 + 0.15 * (lvl - 1)));
  e.d = {
    ...def,
    type,
    hp,
    max: hp,
    stun: 0,
    kb: 0,
    ev,
    cd: Math.random() * 0.8 + 0.4,
    animT: 0,
    frameIdx: 0,
    state: 'idle',
    atkTimer: 0,
    points: def.points || 60,
    bodyW: bw,
    bodyH: bh
  };
  if(ev) ev.alive++;
  return e;
}

// ------------------------------------------
// Creación y aparición de un Jefe oficial
// ------------------------------------------
// Configura si vuela o pelea en el suelo, tamaño físico, vida y puntos
function spawnBoss(s, bossCfg){
  const x = s.player.x + (s.player.facing > 0 ? 500 : -500);
  const y = bossCfg.flying ? CFG.STREET - 170 : CFG.STREET;
  const k0 = bossCfg.idleKeys[0];
  
  const boss = s.enemies.create(x, y, k0).setDepth(9);
  const sc = bossCfg.scale || 1.0;
  boss.setScale(sc);
  boss.setOrigin(0.5, 1.0);
  boss.setCollideWorldBounds(true);
  
  const bw = Math.min(Math.max(32, boss.width * 0.6), 65);
  const bh = Math.min(Math.max(48, boss.height * 0.82), 95);
  boss.body.setSize(bw, bh).setOffset((boss.width - bw) / 2, boss.height - bh);
  if(bossCfg.flying) boss.body.allowGravity = false;
  
  boss.d = {
    ...bossCfg,
    boss: true,
    hp: bossCfg.hp,
    max: bossCfg.hp,
    stun: 0,
    kb: 0,
    cd: 1.2,
    mode: 'move',
    modeT: 3.0,
    animT: 0,
    frameIdx: 0,
    state: 'idle',
    points: bossCfg.points || 1000,
    flyBaseY: y,
    flyT: 0,
    bodyW: bw,
    bodyH: bh
  };
  return boss;
}

// ------------------------------------------
// Efecto visual de telaraña inmovilizadora
// ------------------------------------------
function webOn(s, e){
  if(e.d.webFx || !s.textures.exists('fx_web0')) return;
  const sc = Math.max(1, e.displayHeight * 1.05 / 49);
  e.d.webFx = ['fx_web0','fx_web2'].map(k => s.add.image(e.x, e.y - e.displayHeight * 0.4, k).setDepth(9).setScale(sc).setAlpha(.9));
}

function webOff(e){
  if(e.d.webFx){ e.d.webFx.forEach(w => w.destroy()); e.d.webFx = null; }
}

// ------------------------------------------
// Creación de proyectiles enemigos
// ------------------------------------------
function enemyShoot(s, e, ang, dmg, spd, color=0xffcc33, r=6){
  const startY = e.body ? e.body.center.y : (e.y - 25);
  const c = s.add.circle(e.x, startY, r, color).setDepth(12);
  s.shots.push({ c, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 2.8, dmg });
}

// ------------------------------------------
// Inteligencia Artificial de Enemigos Comunes
// ------------------------------------------
// Gestiona movimiento, ataques cuerpo a cuerpo o a distancia y animaciones
function updateEnemy(s, e, dt){
  const d = e.d, p = s.player, b = e.body;
  const g = b.blocked.down || b.touching.down;
  
  d.cd -= dt; d.stun -= dt; d.kb -= dt; d.animT += dt;
  if(d.atkTimer > 0) d.atkTimer -= dt;

  // CORRECCIÓN DE PISO: asegura que el enemigo jamás baje del nivel de la calle
  if(!d.flying){
    if(e.y > CFG.STREET || b.bottom > CFG.STREET){
      e.y = CFG.STREET;
      b.y = CFG.STREET - d.bodyH;
      b.velocity.y = Math.min(0, b.velocity.y);
      b.blocked.down = true;
    }
  }
  
  // Estado de inmovilización por telaraña
  if(d.stun > 0){
    b.velocity.x *= 0.85;
    e.setTint(0xaaddff);
    if(d.webFx) d.webFx.forEach(w => w.setPosition(e.x, e.y - e.displayHeight * 0.4));
    return;
  } else {
    webOff(e);
    if(d.stun > -0.1) e.clearTint();
  }
  if(d.kb > 0) return;
  
  // Cálculo de distancias basado en el centro de los cuerpos
  const ey = e.body ? e.body.center.y : e.y;
  const py = p.sp.body ? p.sp.body.center.y : p.y;
  const dx = p.x - e.x, dy = py - ey;
  const dist = Math.hypot(dx, dy);
  const dir = Math.sign(dx) || 1;
  e.setFlipX(dir < 0);
  
  const hop = () => {
    if(g && (b.blocked.left || b.blocked.right || (dy < -120 && Math.abs(dx) < 180))){
      b.setVelocityY(-560);
    }
  };
  
  // Comportamiento según el tipo de ataque
  let desiredVx = 0;
  if(d.ranged){
    // Enemigos a distancia (Blade con pistola / Moose con shurikens)
    const tooFar = dist > 360, tooNear = dist < 200;
    desiredVx = tooNear ? -dir * d.speed : (tooFar ? dir * d.speed : 0);
    hop();
    if(d.cd <= 0 && dist < 580){
      d.state = 'attack';
      d.atkTimer = 0.35;
      d.cd = 1.8;
      const ang = Math.atan2(dy, dx);
      enemyShoot(s, e, ang, d.dmg, 380, d.type === 'moose' ? 0xcccccc : 0xffaa22, d.type === 'moose' ? 5 : 4);
    }
  } else {
    // Enemigos cuerpo a cuerpo
    const inRange = Math.abs(dx) < (d.range || 42);
    desiredVx = inRange ? 0 : dir * d.speed;
    hop();
    if(inRange && Math.abs(dy) < 65 && d.cd <= 0){
      d.state = 'attack';
      d.atkTimer = 0.35;
      p.hurt(d.dmg, dir);
      d.cd = 1.25;
    }
  }
  
  b.setVelocityX(desiredVx);
  
  // Sincronización de animaciones manteniendo el pie en el suelo
  let frames = d.idleKeys;
  if(d.atkTimer > 0 && d.atkKeys && d.atkKeys.length){
    frames = d.atkKeys;
  } else if(Math.abs(b.velocity.x) > 20 && d.walkKeys && d.walkKeys.length){
    frames = d.walkKeys;
  }
  
  if(frames && frames.length){
    const idx = Math.floor(d.animT * 8) % frames.length;
    const key = frames[idx];
    if(s.textures.exists(key) && e.texture.key !== key){
      e.setTexture(key);
      e.body.setSize(d.bodyW, d.bodyH);
      e.body.setOffset((e.width - d.bodyW) / 2, e.height - d.bodyH);
    }
  }
}

// ------------------------------------------
// Inteligencia Artificial de Jefes
// ------------------------------------------
// Controla patrones de vuelo, embestidas, proyectiles especiales y la arena de 2 pantallas
function updateBoss(s, e, dt){
  const d = e.d, p = s.player, b = e.body;
  const g = b.blocked.down || b.touching.down;
  
  d.cd -= dt; d.stun -= dt; d.kb -= dt; d.animT += dt; d.modeT -= dt;

  // CORRECCIÓN DE PISO: los jefes terrestres se mantienen siempre en la calle
  if(!d.flying){
    if(e.y > CFG.STREET || b.bottom > CFG.STREET){
      e.y = CFG.STREET;
      b.y = CFG.STREET - d.bodyH;
      b.velocity.y = Math.min(0, b.velocity.y);
      b.blocked.down = true;
    }
  }

  // Estado inmovilizado
  if(d.stun > 0){
    b.velocity.x *= 0.9;
    e.setTint(0x88ccff);
    if(d.webFx) d.webFx.forEach(w => w.setPosition(e.x, e.y - e.displayHeight * 0.4));
    return;
  } else {
    webOff(e);
    if(d.stun > -0.1) e.clearTint();
  }
  
  const ey = e.body ? e.body.center.y : e.y;
  const py = p.sp.body ? p.sp.body.center.y : p.y;
  const dx = p.x - e.x, dy = py - ey;
  const dist = Math.hypot(dx, dy);
  const dir = Math.sign(dx) || 1;
  e.setFlipX(dir < 0);
  
  // Limita el movimiento del jefe a la arena de 2 pantallas
  if(s.bossFight && s.arenaBounds){
    e.x = Phaser.Math.Clamp(e.x, s.arenaBounds.minX + 35, s.arenaBounds.maxX - 35);
  }
  
  // ------------------------------------------
  // Jefes Voladores (Hobgoblin, Duende Verde, Doctor Doom)
  // ------------------------------------------
  if(d.flying){
    d.flyT += dt * 2.5;
    const targetY = (CFG.STREET - 170) + Math.sin(d.flyT) * 45;
    b.y += (targetY - b.y) * 0.08;
    b.allowGravity = false;
    
    if(d.mode === 'move'){
      const targetX = p.x + (Math.sin(d.flyT * 0.8) > 0 ? 260 : -260);
      b.setVelocityX((targetX - e.x) * 1.5);
      if(d.cd <= 0){
        d.cd = 1.4;
        const ang = Math.atan2(py - ey, p.x - e.x);
        if(d.id === 'hobgoblin'){
          enemyShoot(s, e, ang, d.dmg, 320, 0xff7700, 9);
        } else if(d.id === 'duende_verde'){
          enemyShoot(s, e, ang - 0.15, d.dmg, 340, 0x33ff44, 8);
          enemyShoot(s, e, ang + 0.15, d.dmg, 340, 0x33ff44, 8);
        } else if(d.id === 'doctor_doom'){
          enemyShoot(s, e, ang, d.dmg, 380, 0x00ff88, 11);
          enemyShoot(s, e, ang + 0.3, d.dmg * 0.8, 320, 0x00ff88, 7);
          enemyShoot(s, e, ang - 0.3, d.dmg * 0.8, 320, 0x00ff88, 7);
        }
      }
      if(d.modeT <= 0){
        d.mode = 'charge';
        d.modeT = 1.4;
        d.cdir = dir;
      }
    } else if(d.mode === 'charge'){
      b.setVelocity(d.cdir * 420, 180);
      if(dist < 75 && d.cd <= 0){
        p.hurt(d.dmg, d.cdir);
        d.cd = 0.8;
      }
      if(d.modeT <= 0){
        d.mode = 'move';
        d.modeT = 3.2;
      }
    }
  } 
  // ------------------------------------------
  // Jefes Terrestres (Kingpin, Scorpion, Lizard, Electro, Sandman, Venom)
  // ------------------------------------------
  else {
    if(d.mode === 'move'){
      const inRange = Math.abs(dx) < 55;
      b.setVelocityX(inRange ? 0 : dir * d.speed);
      if(g && (b.blocked.left || b.blocked.right || (Math.random() < 0.02 && Math.abs(dx) < 200))){
        b.setVelocityY(-580);
      }
      if(inRange && Math.abs(dy) < 70 && d.cd <= 0){
        p.hurt(d.dmg, dir);
        d.cd = 1.1;
      }
      if(d.modeT <= 0){
        d.mode = 'wind';
        d.modeT = 0.6;
        b.setVelocityX(0);
        e.setTint(0xff5555);
      }
    } else if(d.mode === 'wind'){
      b.setVelocityX(0);
      if(d.modeT <= 0){
        d.mode = 'charge';
        d.modeT = 1.2;
        d.cdir = dir;
        e.clearTint();
        if(d.id === 'electro'){
          for(let i = -2; i <= 2; i++){
            enemyShoot(s, e, Math.atan2(dy, dx) + i * 0.25, d.dmg, 380, 0x44ddff, 8);
          }
        }
      }
    } else if(d.mode === 'charge'){
      b.setVelocityX(d.cdir * (d.speed * 2.4));
      if(dist < 70 && d.cd <= 0){
        p.hurt(d.dmg * 1.2, d.cdir);
        d.cd = 0.8;
      }
      if(d.modeT <= 0){
        d.mode = 'move';
        d.modeT = 2.8;
      }
    }
  }
  
  // Selección de animaciones del jefe
  let frames = d.idleKeys;
  if(d.mode === 'charge' && d.chargeKeys && d.chargeKeys.length){
    frames = d.chargeKeys;
  } else if(d.mode === 'wind' && d.atkKeys && d.atkKeys.length){
    frames = d.atkKeys;
  } else if(Math.abs(b.velocity.x) > 20 && d.walkKeys && d.walkKeys.length){
    frames = d.walkKeys;
  }
  
  if(frames && frames.length){
    const idx = Math.floor(d.animT * 8) % frames.length;
    const key = frames[idx];
    if(s.textures.exists(key) && e.texture.key !== key){
      e.setTexture(key);
      e.body.setSize(d.bodyW, d.bodyH);
      e.body.setOffset((e.width - d.bodyW) / 2, e.height - d.bodyH);
    }
  }
}
