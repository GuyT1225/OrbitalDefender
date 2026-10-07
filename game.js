"use strict";
const canvas=document.getElementById("field"),ctx=canvas.getContext("2d");
const statusEl=document.getElementById("status"),weaponName=document.getElementById("weaponName"),reloadEl=document.getElementById("reload"),contactEl=document.getElementById("contact"),friendliesEl=document.getElementById("friendlies"),reticleLabel=document.getElementById("reticleLabel");
const weaponButtons=[...document.querySelectorAll(".weapon")];
const scanBtn=document.getElementById("scanBtn"),fireBtn=document.getElementById("fireBtn");

let cssW=1,cssH=1,dpr=1,orbit=0,last=performance.now(),reticle={x:50,y:50},weapon="light",shot=null,impactFx=[],audioCtx=null;
const weaponDefs={
  light:{name:"LIGHT",reload:550,damage:1,radius:4,color:"#7de49c"},
  medium:{name:"MEDIUM",reload:1400,damage:2,radius:8,color:"#e2a44a"},
  heavy:{name:"HEAVY",reload:3200,damage:4,radius:14,color:"#ff665b"}
};
let readyAt=0;

const structures=[
  {x:34,y:31,w:12,h:7,hp:3,maxHp:3},
  {x:61,y:58,w:14,h:8,hp:4,maxHp:4},
  {x:48,y:76,w:9,h:7,hp:2,maxHp:2}
];
const friendlies=[
  {x:22,y:64,hp:3,maxHp:3,label:"CONVOY A"},
  {x:28,y:69,hp:3,maxHp:3,label:"CONVOY B"},
  {x:34,y:73,hp:3,maxHp:3,label:"ESCORT"}
];
const contacts=[
  {x:72,y:27,hp:2,maxHp:2,state:0,label:"C-01"},
  {x:66,y:45,hp:3,maxHp:3,state:0,label:"C-02"},
  {x:79,y:63,hp:4,maxHp:4,state:0,label:"C-03"},
  {x:54,y:37,hp:2,maxHp:2,state:0,label:"C-04"}
];

function ensureAudio(){
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended")audioCtx.resume().catch(()=>{});
}
function tone(freq,dur=.08,type="square",gain=.035){
  ensureAudio();if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type;o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(audioCtx.destination);
  const t=audioCtx.currentTime;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.start(t);o.stop(t+dur);
}
function boom(kind){
  if(kind==="heavy"){tone(65,.28,"sawtooth",.06);setTimeout(()=>tone(42,.36,"square",.035),45);}
  else if(kind==="medium"){tone(105,.18,"sawtooth",.045);}
  else tone(185,.09,"square",.03);
}
function resize(){
  const r=canvas.getBoundingClientRect();cssW=r.width;cssH=r.height;dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize",resize);resize();

function worldToScreen(x,y){
  const a=orbit,cx=50,cy=50,dx=x-cx,dy=y-cy,ct=Math.cos(a),st=Math.sin(a);
  const rx=dx*ct-dy*st,ry=dx*st+dy*ct;
  return{x:cssW/2+rx*cssW/115,y:cssH/2+ry*cssH/115};
}
function screenToWorld(sx,sy){
  const rx=(sx-cssW/2)/(cssW/115),ry=(sy-cssH/2)/(cssH/115),ct=Math.cos(orbit),st=Math.sin(orbit);
  const dx=rx*ct+ry*st,dy=-rx*st+ry*ct;
  return{x:Math.max(0,Math.min(100,dx+50)),y:Math.max(0,Math.min(100,dy+50))};
}
function line(a,b,color,w=1){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
function drawGrid(){
  ctx.fillStyle="#061009";ctx.fillRect(0,0,cssW,cssH);
  for(let i=0;i<=100;i+=10){
    let a=worldToScreen(i,0),b=worldToScreen(i,100);line(a,b,"rgba(74,151,96,.18)",1);
    a=worldToScreen(0,i);b=worldToScreen(100,i);line(a,b,"rgba(74,151,96,.18)",1);
  }
  ctx.strokeStyle="rgba(100,218,134,.28)";ctx.lineWidth=1.2;
  const corners=[[0,0],[100,0],[100,100],[0,100]].map(p=>worldToScreen(p[0],p[1]));
  ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.stroke();
}
function drawStructure(s){
  if(s.hp<=0)return;
  const p=worldToScreen(s.x,s.y);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(orbit);
  const w=s.w*cssW/115,h=s.h*cssH/115;
  ctx.fillStyle=s.hp<s.maxHp?"#3f3820":"#203326";ctx.strokeStyle="#719078";ctx.lineWidth=1;
  ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeRect(-w/2,-h/2,w,h);
  ctx.restore();
}
function drawFriendly(f){
  if(f.hp<=0)return;const p=worldToScreen(f.x,f.y);
  ctx.fillStyle="#7de49c";ctx.beginPath();ctx.moveTo(p.x,p.y-7);ctx.lineTo(p.x+8,p.y+6);ctx.lineTo(p.x-8,p.y+6);ctx.closePath();ctx.fill();
  ctx.fillStyle="#8fb79a";ctx.font="9px monospace";ctx.fillText(f.label+" "+f.hp+"/"+f.maxHp,p.x+10,p.y+3);
}
function drawContact(c){
  if(c.hp<=0)return;const p=worldToScreen(c.x,c.y);
  ctx.save();
  if(c.state===0){
    ctx.strokeStyle="#d5a145";ctx.setLineDash([5,4]);ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#d5a145";ctx.font="bold 16px monospace";ctx.fillText("?",p.x-5,p.y+5);
  }else if(c.state===1){
    ctx.strokeStyle="#73d7d1";ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(p.x,p.y,14,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#73d7d1";ctx.font="10px monospace";ctx.fillText("TRACK",p.x-15,p.y-20);
  }else{
    ctx.strokeStyle="#ff665b";ctx.strokeRect(p.x-10,p.y-10,20,20);
    ctx.fillStyle="#ff665b";ctx.font="bold 9px monospace";ctx.fillText(c.label+" "+c.hp+"/"+c.maxHp,p.x+14,p.y+3);
  }
  ctx.restore();
}
function drawReticle(){
  const p=worldToScreen(reticle.x,reticle.y);
  ctx.save();ctx.strokeStyle="#e2a44a";ctx.lineWidth=1.4;
  ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(p.x-28,p.y);ctx.lineTo(p.x-8,p.y);ctx.moveTo(p.x+8,p.y);ctx.lineTo(p.x+28,p.y);
  ctx.moveTo(p.x,p.y-28);ctx.lineTo(p.x,p.y-8);ctx.moveTo(p.x,p.y+8);ctx.lineTo(p.x,p.y+28);ctx.stroke();
  ctx.restore();
  reticleLabel.style.left=p.x+"px";reticleLabel.style.top=p.y+"px";
  reticleLabel.textContent=gridCoord(reticle.x,reticle.y);
}
function gridCoord(x,y){
  const col=String.fromCharCode(65+Math.max(0,Math.min(9,Math.floor(x/10))));
  const row=Math.max(0,Math.min(9,Math.floor(y/10)));
  return col+"-"+row;
}
function drawEffects(now){
  impactFx=impactFx.filter(f=>now-f.start<f.dur);
  impactFx.forEach(f=>{
    const p=worldToScreen(f.x,f.y),t=(now-f.start)/f.dur;
    ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle=f.color;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(p.x,p.y,8+t*42,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=f.color;ctx.globalAlpha=.18*(1-t);ctx.beginPath();ctx.arc(p.x,p.y,6+t*20,0,Math.PI*2);ctx.fill();ctx.restore();
  });
}
function nearestContact(radius=10){
  let best=null,dist=1e9;
  contacts.forEach(c=>{if(c.hp<=0)return;const d=Math.hypot(c.x-reticle.x,c.y-reticle.y);if(d<dist&&d<=radius){best=c;dist=d;}});
  return best;
}
function nearestFriendly(radius){
  return friendlies.find(f=>f.hp>0&&Math.hypot(f.x-reticle.x,f.y-reticle.y)<=radius);
}
function scan(){
  ensureAudio();const c=nearestContact(12);
  if(!c){statusEl.textContent="SCAN NEGATIVE // no contact inside sensor gate.";tone(280,.06);return;}
  c.state=Math.min(2,c.state+1);
  contactEl.textContent=c.state===1?"TRACKING "+c.label:"CONFIRMED "+c.label;
  statusEl.textContent=c.state===1?"TRACK ESTABLISHED // hold sensor on contact.":"HOSTILE CONFIRMED // weapons release authorized.";
  tone(c.state===2?640:440,.08,"square",.025);
}
function fire(){
  const now=performance.now(),def=weaponDefs[weapon];
  if(now<readyAt||shot)return;
  ensureAudio();readyAt=now+def.reload;shot={x:reticle.x,y:reticle.y,start:now,dur:420,weapon};
  statusEl.textContent="SHOT AWAY // "+def.name+" ORDNANCE";boom(weapon);
}
function resolveShot(s){
  const def=weaponDefs[s.weapon];
  impactFx.push({x:s.x,y:s.y,start:performance.now(),dur:850,color:def.color});
  let friendlyHit=false,hostileHit=false,structureHit=false;
  friendlies.forEach(f=>{
    if(f.hp<=0)return;const d=Math.hypot(f.x-s.x,f.y-s.y);
    if(d<=def.radius){f.hp=Math.max(0,f.hp-def.damage);friendlyHit=true;}
  });
  contacts.forEach(c=>{
    if(c.hp<=0)return;const d=Math.hypot(c.x-s.x,c.y-s.y);
    if(d<=def.radius){
      if(c.state<2){statusEl.textContent="ENGAGEMENT DENIED // contact not confirmed.";return;}
      c.hp=Math.max(0,c.hp-def.damage);hostileHit=true;
    }
  });
  structures.forEach(o=>{
    if(o.hp<=0)return;const d=Math.hypot(o.x-s.x,o.y-s.y);
    if(d<=def.radius){o.hp=Math.max(0,o.hp-def.damage);structureHit=true;}
  });
  if(friendlyHit)statusEl.textContent="WARNING // FRIENDLY FIRE";
  else if(hostileHit)statusEl.textContent="HOSTILE HIT // target damage confirmed.";
  else if(structureHit)statusEl.textContent="STRUCTURE HIT // cover degraded.";
  else statusEl.textContent="IMPACT // no confirmed target damage.";
  updateReadouts();
}
function enemyPressure(now){
  if(!enemyPressure.next)enemyPressure.next=now+3600;
  if(now<enemyPressure.next)return;
  enemyPressure.next=now+3600+Math.random()*2400;
  const alive=friendlies.filter(f=>f.hp>0);if(!alive.length)return;
  const tgt=alive[Math.floor(Math.random()*alive.length)];
  const hit=Math.random()<.45;
  if(hit){tgt.hp=Math.max(0,tgt.hp-1);impactFx.push({x:tgt.x,y:tgt.y,start:now,dur:750,color:"#ff665b"});statusEl.textContent="INCOMING // "+tgt.label+" TAKING FIRE";}
  else statusEl.textContent="INCOMING // hostile fire missed convoy.";
  updateReadouts();
}
function updateReadouts(){
  const aliveF=friendlies.filter(f=>f.hp>0).length,aliveH=contacts.filter(c=>c.hp>0).length;
  friendliesEl.textContent=aliveF+"/3";
  contactEl.textContent=aliveH+" HOSTILES";
  if(!aliveF){statusEl.textContent="MISSION FAILED // convoy lost.";fireBtn.disabled=true;scanBtn.disabled=true;}
  else if(!aliveH){statusEl.textContent="MISSION COMPLETE // air corridor secure.";fireBtn.disabled=true;scanBtn.disabled=true;}
}
function updateWeaponUi(){
  weaponButtons.forEach(b=>b.classList.toggle("active",b.dataset.weapon===weapon));
  weaponName.textContent=weaponDefs[weapon].name;
}
weaponButtons.forEach(b=>b.addEventListener("click",()=>{weapon=b.dataset.weapon;updateWeaponUi();statusEl.textContent=weaponDefs[weapon].name+" ORDNANCE SELECTED";tone(360,.04);}));
scanBtn.addEventListener("click",scan);fireBtn.addEventListener("click",fire);

let pointerId=null;
canvas.addEventListener("pointerdown",e=>{
  pointerId=e.pointerId;canvas.setPointerCapture(e.pointerId);moveAim(e);ensureAudio();
});
canvas.addEventListener("pointermove",e=>{if(pointerId===e.pointerId)moveAim(e);});
canvas.addEventListener("pointerup",e=>{if(pointerId===e.pointerId){moveAim(e);pointerId=null;}});
canvas.addEventListener("pointercancel",()=>pointerId=null);
function moveAim(e){
  const r=canvas.getBoundingClientRect(),w=screenToWorld(e.clientX-r.left,e.clientY-r.top);
  reticle=w;
}

function frame(now){
  const dt=Math.min(40,now-last);last=now;orbit+=(dt/1000)*.035;
  drawGrid();structures.forEach(drawStructure);friendlies.forEach(drawFriendly);contacts.forEach(drawContact);drawReticle();drawEffects(now);
  if(shot){
    const t=(now-shot.start)/shot.dur;
    if(t>=1){const s=shot;shot=null;resolveShot(s);}
    else{
      const p=worldToScreen(shot.x,shot.y),r=6+(1-t)*18;
      ctx.fillStyle=weaponDefs[shot.weapon].color;ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    }
  }
  const remain=Math.max(0,readyAt-now);reloadEl.textContent=remain>0?(remain/1000).toFixed(1)+"s":"READY";
  fireBtn.disabled=remain>0||!!shot;
  enemyPressure(now);
  requestAnimationFrame(frame);
}
updateWeaponUi();updateReadouts();requestAnimationFrame(frame);
