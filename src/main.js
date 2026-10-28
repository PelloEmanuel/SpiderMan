// Escena principal: combate, jefes, arena, temporizador, puntajes y conexión MariaDB
const FONT = "Impact,'Arial Black',sans-serif";

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(sec){
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

function loadLeaderboard(tableBodyId){
  fetch('scores.php')
    .then(r => r.json())
    .then(data => {
      const tbody = document.getElementById(tableBodyId);
      if(!tbody) return;
      if(!data.scores || data.scores.length === 0){
        tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Aún no hay puntajes registrados. ¡Sé el primero en salvar la ciudad!</td></tr>';
        return;
      }
      tbody.innerHTML = data.scores.map((row, idx) => {
        const rank = idx + 1;
        const badgeClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : 'rank-other'));
        const timeFormatted = formatTime(parseFloat(row.tiempo_segundos));
        const dateStr = row.fecha ? row.fecha.split(' ')[0] : '-';
        return `<tr>
          <td><span class="rank-badge ${badgeClass}">${rank}</span></td>
          <td><strong>${escapeHtml(row.nombre)} ${escapeHtml(row.apellido)}</strong></td>
          <td><strong style="color:#ffe14a;">${parseInt(row.puntos).toLocaleString()} pts</strong></td>
          <td>${timeFormatted}</td>
          <td>${dateStr}</td>
        </tr>`;
      }).join('');
    })
    .catch(err => {
      console.error('Error cargando puntajes:', err);
      const tbody = document.getElementById(tableBodyId);
      if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="loading-cell" style="color:#f87171;">Error al conectar con la base de datos.</td></tr>';
    });
}

class GameScene extends Phaser.Scene {
  constructor(){ super('game'); }
  
  preload(){
    ASSET_KEYS.forEach(k => this.load.image(k, 'assets/' + k + '.png?v=' + BUILD));
    if(typeof SPRITE_MANIFEST !== 'undefined'){
      for(const [k, v] of Object.entries(SPRITE_MANIFEST)){
        this.load.image(k, v + '?v=' + BUILD);
      }
    }
  }

  create(data){
    window.__scene = this;
    Object.assign(this, {
      seed: Math.floor(Math.random()*1e6),
      score: 0,
      gameTimer: 0,
      holdRT: 0,
      timerRunning: false,
      dead: false,
      won: false,
      shots: [],
      events: [],
      evT: 3,
      spawned: 0,
      started: false,
      currentBoss: null,
      bossFight: false,
      arenaBounds: null,
      arenaGfx: null,
      defeatedBosses: new Set(),
      nextBoss: GAME_BOSSES[0]
    });

    makeTextures(this);
    ASSET_KEYS.filter(k => /^(hero_|e_|fx_|moon|botiquin)/.test(k))
      .forEach(k => this.textures.exists(k) && this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST));
    
    // Deshabilitar menú contextual del navegador
    this.input.mouse.disableContextMenu();
    window.addEventListener('contextmenu', e => e.preventDefault());

    // Configurar teclado de Phaser para NO bloquear escritura en campos HTML
    if(this.input.keyboard){
      this.input.keyboard.preventDefault = false;
    }

    const sf = o => o.setOrigin(0).setScrollFactor(0);
    this.cameras.main.setBackgroundColor('#03050f');
    sf(this.add.image(0, 0, 'sky')).setDepth(-30);
    for(let i = 0; i < 90; i++) this.add.circle(Math.random()*1280, Math.random()*450, Math.random()*1.4+.4, 0xffffff, .6).setScrollFactor(0).setDepth(-29);
    this.add.image(1010, 130, 'moon').setScrollFactor(0).setDepth(-28);
    this.far = sf(this.add.tileSprite(0, 0, 1280, 500, 'far')).setDepth(-18);
    this.mid = sf(this.add.tileSprite(0, 0, 1280, 500, 'mid')).setDepth(-16);
    sf(this.add.image(0, 520, 'fog')).setDepth(-12);
    sf(this.add.image(0, 0, 'vig')).setDepth(90);

    this.buildings = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.city = new City(this);
    this.city.update(0);

    this.player = new Player(this, 200, CFG.STREET - 60);
    this.physics.add.collider(this.player.sp, this.buildings);
    this.physics.add.collider(this.enemies, this.buildings);

    this.cameras.main.startFollow(this.player.sp, true, .09, .09);
    this.cameras.main.setDeadzone(60, 80);
    this.cameras.main.setBounds(0, -2500, 1e7, CFG.STREET + 90 + 2500);

    this.ui = new UI(this);
    this.keyR = this.input.keyboard.addKey('R');

    // Configuración de elementos HTML del DOM y libertad para escribir nombres
    this.setupDOM();

    if(data && data.skip){
      const startOv = document.getElementById('start-overlay');
      if(startOv) startOv.classList.remove('active');
      this.start();
    } else {
      this.physics.pause();
      if(this.input.keyboard) this.input.keyboard.enabled = false; // Teclado inactivo en pantalla de inicio
      loadLeaderboard('start-leaderboard-body');
      
      const onFirstAction = () => {
        const startOv = document.getElementById('start-overlay');
        if(startOv && startOv.classList.contains('active')){
          this.start();
        }
      };
      this.input.keyboard.once('keydown', onFirstAction);
      this.input.once('pointerdown', onFirstAction);
    }
  }

  setupDOM(){
    const btnStart = document.getElementById('btn-start-game');
    if(btnStart){
      btnStart.onclick = () => this.start();
    }

    const btnRestart = document.getElementById('btn-restart-game');
    if(btnRestart){
      btnRestart.onclick = () => {
        const gameoverOv = document.getElementById('gameover-overlay');
        if(gameoverOv) gameoverOv.classList.remove('active');
        this.scene.restart({ skip: true });
      };
    }

    // Permitir escribir con total libertad en los campos de texto
    const textInputs = document.querySelectorAll('#score-form input');
    textInputs.forEach(input => {
      input.addEventListener('keydown', e => e.stopPropagation());
      input.addEventListener('keyup', e => e.stopPropagation());
      input.addEventListener('keypress', e => e.stopPropagation());
      input.addEventListener('focus', () => {
        if(this.input && this.input.keyboard) this.input.keyboard.enabled = false;
      });
      input.addEventListener('blur', () => {
        if(this.input && this.input.keyboard && this.started && !this.dead && !this.won){
          this.input.keyboard.enabled = true;
        }
      });
    });

    const scoreForm = document.getElementById('score-form');
    if(scoreForm){
      scoreForm.onsubmit = (ev) => {
        ev.preventDefault();
        const inNombre = document.getElementById('input-nombre');
        const inApellido = document.getElementById('input-apellido');
        const nombre = inNombre.value.trim();
        const apellido = inApellido.value.trim();
        const feedback = document.getElementById('form-feedback');
        const submitBtn = document.getElementById('btn-submit-score');

        if(!nombre || !apellido){
          feedback.className = 'form-feedback feedback-error';
          feedback.textContent = 'Por favor ingresa tu nombre y apellido.';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'GUARDANDO...';

        fetch('scores.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre,
            apellido,
            puntos: this.score,
            tiempo_segundos: this.gameTimer
          })
        })
        .then(r => r.json())
        .then(res => {
          if(res.success){
            feedback.className = 'form-feedback feedback-success';
            feedback.textContent = `¡Puntaje registrado! Posición #${res.rank}. Volviendo a la pantalla de inicio...`;
            submitBtn.style.display = 'none';

            // Tras registrar el puntaje, llevar automáticamente a la pantalla de inicio
            setTimeout(() => {
              const gameoverOv = document.getElementById('gameover-overlay');
              if(gameoverOv) gameoverOv.classList.remove('active');

              const startOv = document.getElementById('start-overlay');
              if(startOv) startOv.classList.add('active');

              inNombre.value = '';
              inApellido.value = '';
              submitBtn.style.display = 'inline-block';
              submitBtn.disabled = false;
              submitBtn.textContent = 'GUARDAR EN LA TABLA';
              feedback.textContent = '';

              loadLeaderboard('start-leaderboard-body');
              this.scene.restart({ skip: false });
            }, 1200);
          } else {
            feedback.className = 'form-feedback feedback-error';
            feedback.textContent = res.error || 'Error al guardar puntaje.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'GUARDAR EN LA TABLA';
          }
        })
        .catch(err => {
          console.error(err);
          feedback.className = 'form-feedback feedback-error';
          feedback.textContent = 'Error de conexión con la base de datos.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'GUARDAR EN LA TABLA';
        });
      };
    }
  }

  start(){
    if(this.started) return;
    this.started = true;
    this.timerRunning = true;
    this.holdRT = 0;
    this.physics.resume();
    if(this.input.keyboard) this.input.keyboard.enabled = true; // Activar teclado para el juego
    const startOv = document.getElementById('start-overlay');
    if(startOv) startOv.classList.remove('active');
  }

  fx(x, y, col, n){
    for(let i = 0; i < n; i++){
      const c = this.add.circle(x, y, 3, col).setDepth(20);
      this.tweens.add({
        targets: c,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-40, 30),
        alpha: 0,
        duration: 320,
        onComplete: () => c.destroy()
      });
    }
  }

  ring(x, y, col){
    const c = this.add.circle(x, y, 6, 0xffffff, 0).setStrokeStyle(3, col).setDepth(20);
    this.tweens.add({ targets: c, scale: 4, alpha: 0, duration: 280, onComplete: () => c.destroy() });
  }

  pop(x, y, txt, big){
    const t = this.add.text(x, y, txt, {
      fontFamily: FONT,
      fontSize: big ? '38px' : '22px',
      color: big ? '#ff4466' : '#ffe14a',
      stroke: '#000',
      strokeThickness: 5
    }).setOrigin(.5).setDepth(30).setAngle(big ? Phaser.Math.Between(-12, 12) : 0);
    this.tweens.add({ targets: t, y: y - (big ? 50 : 40), alpha: 0, duration: big ? 650 : 500, onComplete: () => t.destroy() });
  }

  hurtEnemy(e, dmg, kx, ky){
    const d = e.d;
    kx *= d.boss ? 0.08 : (d.armor ? 0.3 : 1);
    d.hp -= dmg;
    d.kb = 0.18;
    e.body.setVelocity(kx, ky);
    e.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { if(e.active) e.clearTint(); });
    this.fx(e.x, e.y, 0xffee55, 6);
    this.ring(e.x, e.y, 0xffffff);
    this.pop(e.x, e.y - 30, Math.round(dmg), false);
    if(dmg >= 25){
      this.pop(e.x, e.y - 60, Phaser.Math.RND.pick(['POW!','BAM!','WHAM!']), true);
      this.cameras.main.shake(80, 0.005);
    }
    if(d.hp <= 0) this.removeEnemy(e, true);
  }

  removeEnemy(e, killed){
    const d = e.d;
    if(killed){
      this.fx(e.x, e.y, 0xff4466, 20);
      this.ring(e.x, e.y, 0xff4466);
      
      const pts = d.points || (d.boss ? 1500 : 75);
      this.score = Math.min(CFG.MAX_SCORE, this.score + pts);
      this.pop(e.x, e.y - 50, `+${pts} PTS`, true);
      
      if(d.boss){
        this.defeatedBosses.add(d.name);
        this.currentBoss = null;
        this.endBossFight();
        
        this.nextBoss = GAME_BOSSES.find(b => !this.defeatedBosses.has(b.name)) || null;

        if(d.isFinal){
          this.time.delayedCall(800, () => this.triggerVictory());
        }
      }
    }
    webOff(e);
    if(d.ev) d.ev.alive--;
    e.destroy();
  }

  startBossFight(bossCfg){
    this.bossFight = true;
    const px = this.player.x;
    const arenaW = 2560; // 2 pantallas
    const minX = Math.max(0, Math.floor(px - 1000));
    const maxX = minX + arenaW;
    this.arenaBounds = { minX, maxX };

    this.enemies.getChildren().filter(e => !e.d.boss).forEach(e => this.removeEnemy(e, false));
    this.events = [];

    this.cameras.main.setBounds(minX, -2500, arenaW, CFG.STREET + 90 + 2500);
    this.physics.world.setBounds(minX, -3000, arenaW, CFG.STREET + 3080);

    this.arenaGfx = this.add.graphics().setDepth(15);
    this.currentBoss = spawnBoss(this, bossCfg);
    this.pop(px, this.player.y - 120, `¡ALERTA: HA APARECIDO ${bossCfg.name.toUpperCase()}!`, true);
    this.cameras.main.shake(400, 0.015);
  }

  endBossFight(){
    this.bossFight = false;
    this.arenaBounds = null;
    if(this.arenaGfx){
      this.arenaGfx.clear();
      this.arenaGfx.destroy();
      this.arenaGfx = null;
    }
    this.cameras.main.setBounds(0, -2500, 1e7, CFG.STREET + 90 + 2500);
    this.physics.world.setBounds(this.city.minX, -3000, 1e7, CFG.STREET + 3080);
    this.pop(this.player.x, this.player.y - 80, '¡JEFE DERROTADO! CIUDAD DESPEJADA', true);
  }

  spawnEvent(){
    if(this.bossFight || this.currentBoss) return;

    const p = this.player, ev = { alive: 0 };
    this.spawned++;
    const at = (x, type) => {
      x = Math.max(x, this.city.minX + 80);
      spawnEnemy(this, x, CFG.STREET, type, ev, 1);
    };

    const enemyPool = Object.keys(GAME_ENEMIES);
    const R = () => enemyPool[Math.floor(Math.random() * enemyPool.length)];
    const ahead = () => p.x + Phaser.Math.Between(550, 850);
    const behind = () => p.x - Phaser.Math.Between(400, 600);

    const pattern = Phaser.Math.RND.pick(['pack', 'ambush', 'patrol', 'duo']);
    if(pattern === 'pack'){
      for(let i = 0; i < 3; i++) at(ahead() + i * 60, R());
    } else if(pattern === 'ambush'){
      at(ahead(), R());
      at(behind(), R());
    } else if(pattern === 'duo'){
      at(ahead(), Phaser.Math.RND.pick(['hawk', 'mack', 'blade']));
      at(ahead() + 70, Phaser.Math.RND.pick(['duke', 'slim', 'spike', 'rocco']));
    } else {
      at(ahead(), R());
      at(ahead() + 80, R());
    }
    this.events.push(ev);
  }

  bg(){
    const c = this.cameras.main;
    this.far.tilePositionX = c.scrollX * 0.08;
    this.far.y = 140 + (770 - c.scrollY) * 0.1;
    this.mid.tilePositionX = c.scrollX * 0.2;
    this.mid.y = 140 + (770 - c.scrollY) * 0.2;

    if(this.bossFight && this.arenaBounds && this.arenaGfx){
      const g = this.arenaGfx;
      g.clear();
      const b1 = this.arenaBounds.minX, b2 = this.arenaBounds.maxX;
      const alpha = 0.5 + Math.sin(this.time.now / 150) * 0.35;
      
      g.fillStyle(0xff2244, alpha * 0.25).fillRect(b1, -1000, 16, CFG.STREET + 2000);
      g.lineStyle(4, 0xff2244, alpha).lineBetween(b1 + 8, -1000, b1 + 8, CFG.STREET + 1000);
      
      g.fillStyle(0xff2244, alpha * 0.25).fillRect(b2 - 16, -1000, 16, CFG.STREET + 2000);
      g.lineStyle(4, 0xff2244, alpha).lineBetween(b2 - 8, -1000, b2 - 8, CFG.STREET + 1000);
    }
  }

  triggerGameOver(){
    if(this.dead) return;
    this.dead = true;
    this.timerRunning = false;
    this.holdRT = 0;
    this.player.die();
    if(this.input && this.input.keyboard) this.input.keyboard.enabled = false;

    const ov = document.getElementById('gameover-overlay');
    if(ov){
      document.getElementById('end-title').textContent = '¡HAS CAÍDO!';
      document.getElementById('end-title').className = 'comic-title red-title';
      document.getElementById('end-desc').textContent = 'Partida terminada. Registra tu puntaje:';
      document.getElementById('final-score').textContent = this.score.toLocaleString();
      document.getElementById('final-time').textContent = formatTime(this.gameTimer);
      document.getElementById('btn-submit-score').style.display = 'inline-block';
      document.getElementById('btn-submit-score').disabled = false;
      document.getElementById('btn-submit-score').textContent = 'GUARDAR EN LA TABLA';
      document.getElementById('form-feedback').textContent = '';
      document.getElementById('end-leaderboard-section').style.display = 'none';
      ov.classList.add('active');
    }
  }

  triggerVictory(){
    if(this.won) return;
    this.won = true;
    this.timerRunning = false;
    this.holdRT = 0;
    if(this.input && this.input.keyboard) this.input.keyboard.enabled = false;

    const ov = document.getElementById('gameover-overlay');
    if(ov){
      document.getElementById('end-title').textContent = '¡VICTORIA TOTAL!';
      document.getElementById('end-title').className = 'comic-title yellow-title';
      document.getElementById('end-desc').textContent = '¡Has derrotado a Doctor Doom y completado el juego!';
      document.getElementById('final-score').textContent = this.score.toLocaleString();
      document.getElementById('final-time').textContent = formatTime(this.gameTimer);
      document.getElementById('btn-submit-score').style.display = 'inline-block';
      document.getElementById('btn-submit-score').disabled = false;
      document.getElementById('btn-submit-score').textContent = 'GUARDAR EN LA TABLA';
      document.getElementById('form-feedback').textContent = '';
      document.getElementById('end-leaderboard-section').style.display = 'none';
      ov.classList.add('active');
    }
  }

  update(t, delta){
    const dt = Math.min(delta / 1000, 0.05);
    this.bg();

    if(!this.started){
      this.ui.update();
      return;
    }

    if(this.dead || this.won){
      this.ui.update();
      return;
    }

    // Mantener apretado 3 segundos la letra R para terminar el juego y anotar puntaje
    if(this.keyR && this.keyR.isDown){
      this.holdRT += dt;
      if(this.holdRT >= 3.0){
        this.holdRT = 0;
        this.player.hp = 0;
        this.triggerGameOver();
        return;
      }
    } else {
      this.holdRT = 0;
    }

    // Actualizar temporizador
    if(this.timerRunning){
      this.gameTimer += dt;
    }

    this.player.update(dt);
    this.city.update(this.player.x, dt);

    // Verificación de aparición de jefes según puntaje
    if(!this.currentBoss && !this.bossFight && this.nextBoss){
      if(this.score >= this.nextBoss.score){
        this.startBossFight(this.nextBoss);
      }
    }

    // Actualización de enemigos y jefes
    this.enemies.getChildren().slice().forEach(e => {
      if(!e.active) return;
      if(e.y > CFG.STREET + 250 || e.x < this.city.minX - 200 || e.x > this.player.x + 2200){
        this.removeEnemy(e, false);
      } else {
        if(e.d.boss) updateBoss(this, e, dt);
        else updateEnemy(this, e, dt);
      }
    });

    // Proyectiles enemigos
    for(let i = this.shots.length - 1; i >= 0; i--){
      const q = this.shots[i];
      q.c.x += q.vx * dt;
      q.c.y += q.vy * dt;
      q.life -= dt;
      const py = this.player.sp.body ? this.player.sp.body.center.y : this.player.y;
      if(Math.hypot(q.c.x - this.player.x, q.c.y - py) < 28){
        this.player.hurt(q.dmg, Math.sign(q.vx));
        q.life = 0;
      }
      if(q.life <= 0){
        q.c.destroy();
        this.shots.splice(i, 1);
      }
    }

    // Generación periódica de enemigos comunes (solo si NO hay jefe activo)
    if(!this.bossFight && !this.currentBoss){
      this.events = this.events.filter(e => e.alive > 0);
      this.evT -= dt;
      if(this.evT <= 0 && this.events.length < 2){
        this.evT = Phaser.Math.Between(5, 9);
        this.spawnEvent();
      }
    }

    this.cameras.main.setFollowOffset(-this.player.sp.body.velocity.x * 0.2, -this.player.sp.body.velocity.y * 0.05);

    // Muerte del jugador por daño
    if(this.player.hp <= 0 && !this.dead){
      this.triggerGameOver();
    }

    this.ui.update();
  }
}

window.__game = new Phaser.Game({
  type: Phaser.AUTO,
  width: CFG.W,
  height: CFG.H,
  parent: 'game',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: CFG.GRAV }, debug: false } },
  scene: [GameScene]
});
