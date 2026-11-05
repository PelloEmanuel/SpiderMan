// ==========================================
// INTERFAZ DE USUARIO (HUD ESTILO CÓMIC)
// ==========================================
// Muestra la barra de vida, puntaje, temporizador en vivo, próximo jefe, estado de la telaraña y alertas.
class UI {
  constructor(s){
    this.s = s;
    const st = (sz, col='#ffffff') => ({ fontFamily: FONT, fontSize: sz + 'px', color: col, stroke: '#000000', strokeThickness: 4 });
    const T = (x, y, t, o, ox=0) => s.add.text(x, y, t, o).setOrigin(ox, 0).setScrollFactor(0).setDepth(100);
    this.g = s.add.graphics().setScrollFactor(0).setDepth(99);

    // Etiqueta de Vida
    this.lbl = T(22, 12, 'VIDA', st(14, '#ffd0d8'));
    
    // Indicadores de Puntaje acumulado y Temporizador de partida
    this.scoreText = T(20, 52, 'PUNTOS: 0', st(22, '#ffe14a'));
    this.timerText = T(20, 82, 'TIEMPO: 00:00.0', st(18, '#8fa6ff'));
    
    // Objetivo de puntos para el siguiente jefe y estado de la mira
    this.nextBossText = T(1260, 14, '', st(18, '#ffcc00'), 1);
    this.webStatus = T(1260, 40, '', st(16), 1);
    
    // Nombre y barra de vida del Jefe en combate
    this.bn = T(640, 38, '', st(24, '#ff4444'), .5);
    
    // Alerta de arena cerrada durante pelea con jefe
    this.arenaNotice = T(640, 110, '', st(20, '#ffaa00'), .5);

    // Alerta visual de rendición al mantener presionada la R durante 3 segundos
    this.rAlert = T(640, 140, '', st(20, '#ff3355'), .5);
    
    // Guía rápida de controles en el borde inferior
    T(640, 694, 'Clic der: telaraña · Clic izq: golpe · F: telaraña a enemigo · Shift: esquiva · Mantén R (3s): rendirse', st(14, '#8fa6ff'), .5);
  }

  // Actualiza los gráficos, textos y barras en cada fotograma
  update(){
    const s = this.s, p = s.player, g = this.g;
    const r = Math.max(0, p.hp) / CFG.PLAYER_HP;
    g.clear();
    
    // ------------------------------------------
    // Barra de Vida de Spider-Man
    // ------------------------------------------
    g.fillStyle(0x000000, 0.75).fillRoundedRect(12, 8, 264, 40, 8);
    // Cambia a blanco parpadeante cuando la vida es crítica (< 30%)
    g.fillStyle(r < 0.3 && Math.floor(s.time.now / 150) % 2 ? 0xffffff : 0xe0223a).fillRect(20, 26, 240 * r, 16);
    g.lineStyle(2, 0x000000, 0.5);
    for(let x = 44; x < 260; x += 24) g.lineBetween(20 + x - 20, 26, 20 + x - 20, 42);
    g.lineStyle(3, 0xffffff).strokeRoundedRect(12, 8, 264, 40, 8);
    
    // ------------------------------------------
    // Temporizador en tiempo real (MM:SS.D)
    // ------------------------------------------
    const totalSec = s.gameTimer || 0;
    const m = Math.floor(totalSec / 60);
    const sec = Math.floor(totalSec % 60);
    const ms = Math.floor((totalSec % 1) * 10);
    const timeStr = `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`;
    
    this.scoreText.setText(`PUNTOS: ${s.score.toLocaleString()}`);
    this.timerText.setText(`TIEMPO: ${timeStr}`);
    
    // ------------------------------------------
    // Próximo objetivo de Jefe
    // ------------------------------------------
    if(s.nextBoss){
      this.nextBossText.setText(`PRÓXIMO JEFE: ${s.nextBoss.name} (${s.nextBoss.score.toLocaleString()} pts)`).setColor('#ffcc00');
    } else {
      this.nextBossText.setText('¡TODOS LOS JEFES DERROTADOS!').setColor('#4ade80');
    }
    
    // Estado de la mira de telaraña
    this.webStatus.setText(p.web ? 'TELARAÑA: ENGANCHADA' : (p.findTarget() ? 'TELARAÑA: LISTA (CLIC DER)' : 'APUNTA A UN EDIFICIO'))
      .setColor(p.web ? '#ff4466' : '#8fa6ff');
    
    // ------------------------------------------
    // Barra de Vida del Jefe Activo
    // ------------------------------------------
    if(s.currentBoss && s.currentBoss.active){
      const boss = s.currentBoss;
      const bFrac = Math.max(0, boss.d.hp / boss.d.max);
      this.bn.setText(`☠ ${boss.d.name.toUpperCase()} (${Math.max(0, boss.d.hp)}/${boss.d.max} HP) ☠`);
      g.fillStyle(0x000000, 0.8).fillRoundedRect(380, 68, 520, 26, 6);
      g.fillStyle(0xff2244).fillRect(388, 74, 504 * bFrac, 14);
      g.lineStyle(3, 0xffffff).strokeRoundedRect(380, 68, 520, 26, 6);
    } else {
      this.bn.setText('');
    }
    
    // Alerta de arena bloqueada
    if(s.bossFight){
      this.arenaNotice.setText('⚠️ ZONA DE BATALLA LIMITADA (2 PANTALLAS) ⚠️');
      this.arenaNotice.setAlpha(0.6 + Math.sin(s.time.now / 180) * 0.4);
    } else {
      this.arenaNotice.setText('');
    }

    // ------------------------------------------
    // Barra de progreso al mantener R por 3 segundos
    // ------------------------------------------
    if(s.holdRT > 0.05){
      const rem = Math.max(0, 3.0 - s.holdRT).toFixed(1);
      const frac = Math.min(1.0, s.holdRT / 3.0);
      this.rAlert.setText(`⚠️ TERMINANDO PARTIDA EN ${rem}s (SUELTA 'R' PARA CANCELAR) ⚠️`);
      g.fillStyle(0x000000, 0.85).fillRoundedRect(390, 165, 500, 24, 6);
      g.fillStyle(0xe0223a).fillRect(394, 169, 492 * frac, 16);
      g.lineStyle(2, 0xffffff).strokeRoundedRect(390, 165, 500, 24, 6);
    } else {
      this.rAlert.setText('');
    }
  }
}
