// Enemigos, villanos y proyectiles
const ENEMY_DEFS={
  thug:{style:'thug',hp:30,speed:130,dmg:8,tint:0xbbbbbb,range:34,cd:1.1,body:[20,40]},
  gunner:{style:'gunner',hp:24,speed:100,dmg:7,tint:0x77dd66,ranged:true,cd:1.8,body:[20,40]},
  brute:{style:'brute',hp:90,speed:85,dmg:16,tint:0xdd8844,scale:1.3,range:44,cd:1.6,armor:true,body:[30,58]},
  runner:{style:'runner',hp:20,speed:260,dmg:0,tint:0xffee55,flee:true,cd:9,body:[18,40]},
  rhino:{style:'rhino',hp:420,speed:110,dmg:20,tint:0x8899aa,scale:1.8,range:60,cd:1.2,boss:true,name:'RHINO',body:[50,88]},
  electro:{style:'electro',hp:340,speed:150,dmg:14,tint:0x44ddff,scale:1.5,ranged:true,cd:1.5,boss:true,name:'ELECTRO',body:[26,62]}
};
function spawnEnemy(s,x,y,type,ev,lvl){
  const def=ENEMY_DEFS[type], k0='e_'+def.style+'_0', png=s.png.has(k0);   // png: sprite de assets/ (ya trae colores propios, sin tinte ni escala)
  const e=s.enemies.create(x,y,k0).setScale(png?1:(def.scale||1)).setDepth(8); if(!png) e.setTint(def.tint);
  if(png){ const im=s.textures.get(k0).getSourceImage(), [bw,bh]=def.body; e.setOrigin(.5,(im.height-bh/2)/im.height); e.body.setSize(bw,bh).setOffset((im.width-bw)/2,im.height-bh); }
  else e.body.setSize(20,38).setOffset(6,2);
  e.setCollideWorldBounds(true);
  const hp=Math.round(def.hp*(1+.2*(lvl-1))); e.d={...def,tint:png?0xffffff:def.tint,type,hp,max:hp,stun:0,kb:0,ev,pt:2.5,mode:'move',cd:Math.random()};
  ev.alive++; return e;
}
// Telaraña sobre un enemigo inmovilizado: dos hilos cruzados (sprites fx_web*)
function webOn(s,e){ if(e.d.webFx||!s.textures.exists('fx_web0')) return;
  const sc=Math.max(1,e.displayHeight*1.05/49); e.d.webFx=['fx_web0','fx_web2'].map(k=>s.add.image(e.x,e.y,k).setDepth(9).setScale(sc).setAlpha(.9)); }
function webOff(e){ if(e.d.webFx){ e.d.webFx.forEach(w=>w.destroy()); e.d.webFx=null; } }
function enemyShoot(s,e,ang,dmg,spd){
  const c=s.add.circle(e.x,e.y-6,6,e.d.boss?0x66ddff:0xffcc33).setDepth(12);
  s.shots.push({c,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,life:2.2,dmg});
}
function updateEnemy(s,e,dt){
  const d=e.d,p=s.player,b=e.body,g=b.blocked.down||b.touching.down;
  d.cd-=dt; d.stun-=dt; d.kb-=dt;
  if(d.stun>0){ b.velocity.x*=.9; e.setTint(0xaaddff); if(d.webFx) d.webFx.forEach(w=>w.setPosition(e.x,e.y-e.displayHeight*.08)); return; } else { webOff(e); if(d.stun>-.1) e.setTint(d.tint); }
  if(d.kb>0) return;
  const dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy),dir=Math.sign(dx)||1; e.setFlipX(dir<0);
  const fk='e_'+d.style+'_'+(g&&Math.abs(b.velocity.x)>20?1+Math.floor(s.time.now/140)%2:0); if(e.texture.key!==fk) e.setTexture(fk);
  const hop=()=>{ if(g&&(b.blocked.left||b.blocked.right||(dy<-120&&Math.abs(dx)<160))) b.setVelocityY(-560); };
  if(d.flee){ b.setVelocityX(-dir*d.speed); hop(); if(dist>1200) s.removeEnemy(e,false); return; }
  if(dist>1100){ b.setVelocityX(0); return; }
  if(d.boss){ d.pt-=dt;
    if(d.mode==='wind'){ b.setVelocityX(0); e.setTint(0xff3333); if(d.pt<=0){d.mode='charge';d.pt=.9;d.cdir=dir;} return; }
    if(d.mode==='charge'){ b.setVelocityX(d.cdir*580); e.setTint(d.tint); if(dist<55&&d.cd<=0){p.hurt(d.dmg,d.cdir);d.cd=.8;} if(d.pt<=0){d.mode='move';d.pt=2.5;} return; }
    if(d.pt<=0){ d.pt=2.4;
      if(d.type==='rhino'){ d.mode='wind'; d.pt=.5; return; }
      for(let i=-2;i<=2;i++) enemyShoot(s,e,Math.atan2(dy,dx)+i*.2,d.dmg,380);   // abanico eléctrico
      if(Math.random()<.4&&g) b.setVelocityY(-650); }
  }
  const tooFar=d.ranged?dist>330:Math.abs(dx)>(d.range||34)-6, tooNear=d.ranged&&dist<220;
  b.setVelocityX(tooNear?-dir*d.speed:tooFar?dir*d.speed:0); hop();
  if(d.cd<=0){
    if(d.ranged&&dist<560&&!d.boss){ enemyShoot(s,e,Math.atan2(dy,dx),d.dmg,380); d.cd=d.cd0=1.8; }
    else if(!d.ranged&&Math.abs(dx)<(d.range||34)+8&&Math.abs(dy)<50){ p.hurt(d.dmg,dir); d.cd=1.2; }
    else if(d.boss&&d.ranged) d.cd=1;
  }
}
