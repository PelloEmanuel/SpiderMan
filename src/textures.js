// Texturas: si existe un PNG en assets/ con el mismo nombre se usa ese; si no, se genera por código.
const POSES={ // l = pies, a = manos (x,y) dentro de un sprite de 32x40
  idle:{l:[[13,40],[19,40]],a:[[7,30],[25,30]]}, run0:{l:[[8,39],[22,36]],a:[[23,27],[8,29]]},
  run1:{l:[[22,39],[10,36]],a:[[8,27],[24,29]]}, jump:{l:[[9,36],[23,34]],a:[[6,11],[26,13]]},
  swing:{l:[[13,40],[19,38]],a:[[13,3],[19,3]]}, climb:{l:[[11,38],[21,34]],a:[[10,7],[22,11]]},
  punch:{l:[[9,40],[23,40]],a:[[31,17],[6,25]]}
};
const ENEMY_STYLES=['thug','gunner','runner','brute','rhino','electro'];
const HERO_EXTRA=['idle1','ready','crouch','wait','webstart','dive','tumble0','tumble1','tumble2','shoot','dead'];
const FX_KEYS=['fx_speed_h','fx_speed_v','fx_speed_d','fx_web0','fx_web1','fx_web2','fx_bolt'];
const ASSET_KEYS=[...Object.keys(POSES).map(p=>'hero_'+p),...['run2','run3','run4','run5','punch0','punch1','punch2','dash','hurt'].map(p=>'hero_'+p),...HERO_EXTRA.map(p=>'hero_'+p),...FX_KEYS,...ENEMY_STYLES.flatMap(st=>[0,1,2].map(i=>'e_'+st+'_'+i)),'street','sky','moon','far','mid','win_tower','win_brick','win_ware','win_far'];
function drawBody(g,p,o){
  g.lineStyle(o.legW,o.leg); p.l.forEach((f,i)=>g.lineBetween(i?18:14,30,f[0],f[1]));
  g.lineStyle(o.armW,o.arm); p.a.forEach((h,i)=>g.lineBetween(i?20:12,19,h[0],h[1]));
  g.fillStyle(o.torso).fillRect(16-o.tw/2,16,o.tw,15); g.fillStyle(o.head).fillCircle(16,9,8);
}
function drawHero(g,pose){
  drawBody(g,POSES[pose],{legW:5,leg:0x2255cc,armW:4,arm:0xd81e3a,torso:0xd81e3a,tw:12,head:0xd81e3a});
  g.fillStyle(0x2255cc).fillRect(10,27,12,4);
  g.lineStyle(1,0x5a0a18).lineBetween(16,1,16,17).lineBetween(9,9,23,9);
  g.fillStyle(0xffffff).fillTriangle(10,6,15,9,11,12).fillTriangle(22,6,17,9,21,12);
  g.fillStyle(0x111111).fillRect(15,19,2,6); g.lineStyle(1,0x111111).lineBetween(12,20,20,24).lineBetween(20,20,12,24);
}
function drawEnemy(g,style,pose){
  const big=style==='brute';
  drawBody(g,POSES[pose],{legW:big?7:5,leg:0x777777,armW:big?6:4,arm:0xcccccc,torso:0xeeeeee,tw:big?18:12,head:0xeeeeee});
  g.fillStyle(0x222233).fillRect(9,6,14,5); g.fillStyle(0xff3355).fillRect(11,7,3,2).fillRect(18,7,3,2);
  if(style==='thug') g.fillStyle(0x333344).fillRect(8,0,16,4);
  if(style==='gunner') g.lineStyle(3,0x222222).lineBetween(24,24,32,20);
  if(style==='rhino') g.fillStyle(0xffffff).fillTriangle(16,0,12,6,20,6);
  if(style==='electro') g.lineStyle(2,0xffffff).lineBetween(14,18,18,22).lineBetween(18,22,14,27);
}
function makeTextures(s){
  const g=s.make.graphics({add:false}), T=s.textures; s.png=new Set(T.getTextureKeys()); // qué texturas vienen de archivos PNG let v=7; const rnd=()=>(v=(v*16807)%2147483647)/2147483647;
  const mk=(k,w,h,fn)=>{ if(T.exists(k)) return; fn(); g.generateTexture(k,w,h); g.clear(); };
  for(const p of Object.keys(POSES)) mk('hero_'+p,32,40,()=>drawHero(g,p));
  for(const st of ENEMY_STYLES) ['idle','run0','run1'].forEach((p,i)=>mk('e_'+st+'_'+i,32,40,()=>drawEnemy(g,st,p)));
  mk('sky',1280,720,()=>g.fillGradientStyle(0x03050f,0x03050f,0x241a5a,0x241a5a,1).fillRect(0,0,1280,720));
  mk('moon',160,160,()=>{ g.fillStyle(0xdfe6ff,.1).fillCircle(80,80,80).fillStyle(0xdfe6ff,.18).fillCircle(80,80,62).fillStyle(0xeaeeff).fillCircle(80,80,46);
    g.fillStyle(0xc3cbe8).fillCircle(66,70,9).fillCircle(95,92,12).fillCircle(88,60,6); });
  // Siluetas lejanas con poco detalle (parallax; no se pueden enganchar)
  const sky=(k,col,hMin,hMax,win)=>mk(k,1280,500,()=>{ for(let x=0;x<1280;){ const w=Math.min(Math.floor(60+rnd()*70),1280-x), h=Math.floor(hMin+rnd()*(hMax-hMin));
    g.fillStyle(col).fillRect(x,500-h,w,h);
    for(let wy=500-h+10;wy<490;wy+=18) for(let wx=x+8;wx<x+w-8;wx+=14) if(rnd()<win) g.fillStyle(0xffd66b,.5).fillRect(wx,wy,4,6);
    x+=w; } });
  sky('far',0x0c1230,120,300,.04); sky('mid',0x121a3e,140,360,.08);
  // Fachadas repetibles de 256x256 (potencia de 2) para los edificios enganchables
  const tile=(k,base,cw,ch,ww,wh,lit,al,brick)=>mk(k,256,256,()=>{ g.fillStyle(base).fillRect(0,0,256,256);
    if(brick){ g.lineStyle(1,0x000000,.2); for(let y=8;y<256;y+=8) g.lineBetween(0,y,256,y); }
    for(let y=0;y<256;y+=ch) for(let x=0;x<256;x+=cw){ const ox=x+(cw-ww)/2, oy=y+(ch-wh)/2;
      if(rnd()<lit){ const c=rnd()<.7?0xffd66b:0x6bd6ff; g.fillStyle(c,.12*al).fillRect(ox-3,oy-3,ww+6,wh+6); g.fillStyle(c,al).fillRect(ox,oy,ww,wh); }
      else g.fillStyle(0x080c1e).fillRect(ox,oy,ww,wh); } });
  tile('win_tower',0x141c3a,32,32,14,18,.4,1); tile('win_brick',0x2a1a32,32,32,16,20,.35,1,true);
  tile('win_ware',0x1a2338,64,64,44,20,.4,1); tile('win_far',0x0d1330,32,32,6,8,.12,.5);
  mk('fog',1280,200,()=>g.fillGradientStyle(0x3a1f6e,0x3a1f6e,0x3a1f6e,0x3a1f6e,0,0,.5,.5).fillRect(0,0,1280,200));
  if(!T.exists('vig')){ const t=T.createCanvas('vig',1280,720), c=t.getContext(), gr=c.createRadialGradient(640,360,280,640,360,780);
    gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,12,.7)'); c.fillStyle=gr; c.fillRect(0,0,1280,720); t.refresh(); }
}
