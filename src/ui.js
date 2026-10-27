// Interfaz estilo cómic: vida, encuentros, enemigos cercanos, telaraña, barra de villano, pantalla de derrota
class UI {
  constructor(s){ this.s=s;
    const st=(sz,col='#ffffff')=>({fontFamily:FONT,fontSize:sz+'px',color:col,stroke:'#000000',strokeThickness:4});
    const T=(x,y,t,o,ox=0)=>s.add.text(x,y,t,o).setOrigin(ox,0).setScrollFactor(0).setDepth(100);
    this.g=s.add.graphics().setScrollFactor(0).setDepth(99); this.g2=s.add.graphics().setScrollFactor(0).setDepth(99);
    this.lbl=T(22,12,'VIDA',st(14,'#ffd0d8')); this.t1=T(20,52,'',st(20,'#ffe14a'));
    this.t2=T(1260,14,'',st(18),1); this.t3=T(1260,40,'',st(16),1);
    this.bn=T(640,44,'',st(22,'#ffaa22'),.5);
    T(640,692,'Clic izq (mantener): telaraña · Clic der: telaraña a enemigo · J: golpe · Shift: esquiva',st(14,'#8fa6ff'),.5);
    this.over=s.add.text(640,320,'',{...st(60,'#ff4466'),align:'center',strokeThickness:8}).setOrigin(.5).setScrollFactor(0).setDepth(101);
  }
  update(){
    const s=this.s,p=s.player,g=this.g,r=Math.max(0,p.hp)/CFG.PLAYER_HP; g.clear(); this.g2.clear();
    g.fillStyle(0x000000,.7).fillRoundedRect(12,8,264,40,8);
    g.fillStyle(r<.3&&Math.floor(s.time.now/150)%2?0xffffff:0xe0223a).fillRect(20,26,240*r,16);
    g.lineStyle(2,0x000000,.5); for(let x=44;x<260;x+=24) g.lineBetween(20+x-20,26,20+x-20,42);
    g.lineStyle(3,0xffffff).strokeRoundedRect(12,8,264,40,8);
    const en=s.enemies.getChildren(); let near=0,boss=null;
    en.forEach(e=>{ if(Math.hypot(e.x-p.x,e.y-p.y)<700) near++; if(e.d.boss) boss=e; });
    this.t1.setText('ENCUENTROS: '+s.encounters); this.t2.setText('ENEMIGOS CERCA: '+near);
    this.t3.setText(p.web?'TELARAÑA: ENGANCHADA':p.findTarget()?'TELARAÑA: LISTA (CLIC)':'APUNTÁ A UN EDIFICIO').setColor(p.web?'#ff4466':'#8fa6ff');
    if(boss){ const b=Math.max(0,boss.d.hp/boss.d.max); this.bn.setText('☠ '+boss.d.name+' ☠');
      g.fillStyle(0x000000,.7).fillRoundedRect(404,74,472,22,6); g.fillStyle(0xffaa22).fillRect(412,80,456*b,10); g.lineStyle(3,0xffffff).strokeRoundedRect(404,74,472,22,6); } else this.bn.setText('');
    if(s.dead){ this.g2.fillStyle(0x000000,.65).fillRect(0,0,1280,720); this.over.setText('¡HAS CAÍDO!\nEncuentros superados: '+s.encounters+'\nPulsa R para reiniciar').setFontSize(38); } else this.over.setText('');
  }
}
