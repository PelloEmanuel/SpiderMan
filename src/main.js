// Escena principal: fondo, cámara, combate, efectos, eventos aleatorios y bucle de juego
const FONT="Impact,'Arial Black',sans-serif";
class GameScene extends Phaser.Scene {
  constructor(){ super('game'); }
  preload(){ ASSET_KEYS.forEach(k=>this.load.image(k,'assets/'+k+'.png?v='+BUILD)); } // sprites opcionales en assets/ (si faltan, se generan)
  create(data){
    Object.assign(this,{seed:Math.floor(Math.random()*1e6),encounters:0,dead:false,shots:[],events:[],evT:3,spawned:0,started:false});
    makeTextures(this); ASSET_KEYS.filter(k=>/^(hero_|e_|fx_|moon)/.test(k)).forEach(k=>this.textures.exists(k)&&this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST)); // pixel art nítido
    this.input.mouse.disableContextMenu();   // sin menú del navegador al hacer clic derecho
    const sf=o=>o.setOrigin(0).setScrollFactor(0);
    this.cameras.main.setBackgroundColor('#03050f');
    sf(this.add.image(0,0,'sky')).setDepth(-30);
    for(let i=0;i<90;i++) this.add.circle(Math.random()*1280,Math.random()*450,Math.random()*1.4+.4,0xffffff,.6).setScrollFactor(0).setDepth(-29);
    this.add.image(1010,130,'moon').setScrollFactor(0).setDepth(-28);
    this.far=sf(this.add.tileSprite(0,0,1280,500,'far')).setDepth(-18); this.mid=sf(this.add.tileSprite(0,0,1280,500,'mid')).setDepth(-16);
    sf(this.add.image(0,520,'fog')).setDepth(-12); sf(this.add.image(0,0,'vig')).setDepth(90);
    this.buildings=this.physics.add.staticGroup(); this.enemies=this.physics.add.group();
    this.city=new City(this); this.city.update(0);
    this.player=new Player(this,200,CFG.STREET-60);
    this.physics.add.collider(this.player.sp,this.buildings); this.physics.add.collider(this.enemies,this.buildings);
    this.cameras.main.startFollow(this.player.sp,true,.09,.09); this.cameras.main.setDeadzone(60,80); this.cameras.main.setBounds(0,-2500,1e7,CFG.STREET+90+2500);
    this.ui=new UI(this); this.keyR=this.input.keyboard.addKey('R');
    this.title=this.add.text(640,240,'SPIDER-MAN 2D',{fontFamily:FONT,fontSize:'96px',color:'#ffffff',stroke:'#e0223a',strokeThickness:12}).setOrigin(.5).setScrollFactor(0).setDepth(120);
    this.sub=this.add.text(640,350,'Pulsa cualquier tecla para empezar',{fontFamily:FONT,fontSize:'28px',color:'#8fa6ff',stroke:'#000',strokeThickness:5}).setOrigin(.5).setScrollFactor(0).setDepth(120);
    this.ver=this.add.text(640,420,'versión '+BUILD+' · '+ASSET_KEYS.filter(k=>this.png.has(k)).length+'/'+ASSET_KEYS.length+' sprites y texturas cargados',{fontFamily:FONT,fontSize:'16px',color:'#6b7bb8',stroke:'#000',strokeThickness:3}).setOrigin(.5).setScrollFactor(0).setDepth(120);
    this.tweens.add({targets:this.sub,alpha:.3,duration:600,yoyo:true,repeat:-1});
    if(data&&data.skip){ this.title.destroy(); this.sub.destroy(); this.ver.destroy(); this.started=true; }
    else { this.physics.pause(); this.input.keyboard.once('keydown',()=>this.start()); this.input.once('pointerdown',()=>this.start()); }
  }
  start(){ if(this.started) return; this.started=true; this.physics.resume();
    this.tweens.add({targets:[this.title,this.sub,this.ver],alpha:0,duration:300,onComplete:()=>{ this.title.destroy(); this.sub.destroy(); this.ver.destroy(); }}); }
  // Efectos visuales ligeros
  fx(x,y,col,n){ for(let i=0;i<n;i++){ const c=this.add.circle(x,y,3,col).setDepth(20);
    this.tweens.add({targets:c,x:x+Phaser.Math.Between(-40,40),y:y+Phaser.Math.Between(-40,30),alpha:0,duration:320,onComplete:()=>c.destroy()}); } }
  ring(x,y,col){ const c=this.add.circle(x,y,6,0xffffff,0).setStrokeStyle(3,col).setDepth(20);
    this.tweens.add({targets:c,scale:4,alpha:0,duration:280,onComplete:()=>c.destroy()}); }
  pop(x,y,txt,big){ const t=this.add.text(x,y,txt,{fontFamily:FONT,fontSize:big?'40px':'22px',color:big?'#ff4466':'#ffe14a',stroke:'#000',strokeThickness:5}).setOrigin(.5).setDepth(30).setAngle(big?Phaser.Math.Between(-12,12):0);
    this.tweens.add({targets:t,y:y-(big?50:40),alpha:0,duration:big?600:500,onComplete:()=>t.destroy()}); }
  hurtEnemy(e,dmg,kx,ky){
    const d=e.d; kx*=d.boss?.1:d.armor?.3:1; d.hp-=dmg; d.kb=.18; e.body.setVelocity(kx,ky);
    e.setTintFill(0xffffff); this.time.delayedCall(70,()=>{ if(e.active) e.setTint(d.tint); });
    this.fx(e.x,e.y,0xffee55,6); this.ring(e.x,e.y,0xffffff); this.pop(e.x,e.y-30,Math.round(dmg),false);
    if(dmg>=25){ this.pop(e.x,e.y-60,Phaser.Math.RND.pick(['POW!','BAM!','WHAM!']),true); this.cameras.main.shake(80,.005); }
    if(d.hp<=0) this.removeEnemy(e,true);
  }
  removeEnemy(e,killed){
    const ev=e.d.ev; if(killed){ this.fx(e.x,e.y,0xff4466,16); this.ring(e.x,e.y,0xff4466); ev.kills++; }
    webOff(e); e.destroy(); ev.alive--;
    if(ev.alive<=0&&ev.kills>0&&!ev.done){ ev.done=true; this.encounters++; this.player.hp=Math.min(CFG.PLAYER_HP,this.player.hp+12); }
  }
  // Eventos aleatorios: grupos, emboscadas, persecuciones y villanos (cada 5º)
  spawnEvent(){
    const lvl=1+Math.floor(this.encounters/3), p=this.player, ev={alive:0,kills:0,done:false}; this.spawned++;
    const at=(x,t)=>{ x=Math.max(x,this.city.minX+80); spawnEnemy(this,x,CFG.STREET-60,t,ev,lvl); };
    const R=a=>a[Math.floor(Math.random()*a.length)], ahead=()=>p.x+Phaser.Math.Between(550,850);
    if(this.spawned%5===0){ at(ahead(),R(['rhino','electro'])); at(ahead()+60,'thug'); at(ahead()+90,'gunner'); }
    else switch(R(['pack','ambush','chase','brute'])){
      case 'pack': for(let i=0;i<2+lvl;i++) at(ahead()+i*50,R(['thug','gunner'])); break;
      case 'ambush': for(let i=0;i<1+lvl;i++){ at(p.x+Phaser.Math.Between(550,750),'thug'); at(p.x-Phaser.Math.Between(400,600),R(['thug','gunner'])); } break;
      case 'chase': at(ahead(),'runner'); at(ahead()+80,'thug'); at(ahead()+120,'gunner'); break;
      default: at(ahead(),'brute'); at(ahead()+60,'thug'); }
    this.events.push(ev);
  }
  // Parallax: las capas lejanas se mueven más despacio que la cámara
  bg(){ const c=this.cameras.main;
    this.far.tilePositionX=c.scrollX*.08; this.far.y=140+(770-c.scrollY)*.1;
    this.mid.tilePositionX=c.scrollX*.2; this.mid.y=140+(770-c.scrollY)*.2; }
  update(t,delta){
    const dt=Math.min(delta/1000,.05); this.bg();
    if(!this.started){ this.ui.update(); return; }
    if(this.dead){ if(Phaser.Input.Keyboard.JustDown(this.keyR)) this.scene.restart({skip:true}); this.ui.update(); return; }
    this.player.update(dt); this.city.update(this.player.x);
    this.enemies.getChildren().slice().forEach(e=>{ if(!e.active) return;
      if(e.y>CFG.STREET+200||e.x<this.city.minX-100||e.x>this.player.x+1800) this.removeEnemy(e,false); else updateEnemy(this,e,dt); });
    for(let i=this.shots.length-1;i>=0;i--){ const q=this.shots[i]; q.c.x+=q.vx*dt; q.c.y+=q.vy*dt; q.life-=dt;
      if(Math.hypot(q.c.x-this.player.x,q.c.y-this.player.y)<20){ this.player.hurt(q.dmg,Math.sign(q.vx)); q.life=0; }
      if(q.life<=0){ q.c.destroy(); this.shots.splice(i,1); } }
    this.events=this.events.filter(e=>e.alive>0); this.evT-=dt;
    if(this.evT<=0&&this.events.length<2){ this.evT=Phaser.Math.Between(6,11); this.spawnEvent(); }
    this.cameras.main.setFollowOffset(-this.player.sp.body.velocity.x*.2,-this.player.sp.body.velocity.y*.05);
    if(this.player.hp<=0){ this.dead=true; this.player.die(); }
    this.ui.update();
  }
}
window.__game=new Phaser.Game({type:Phaser.AUTO,width:CFG.W,height:CFG.H,parent:'game',
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  physics:{default:'arcade',arcade:{gravity:{y:CFG.GRAV},debug:false}},scene:[GameScene]});
