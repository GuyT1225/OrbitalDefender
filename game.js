"use strict";

const $=id=>document.getElementById(id);
const canvas=$("field"),ctx=canvas.getContext("2d");
const weaponButtons=[...document.querySelectorAll(".weaponCard")];

const ui={
  status:$("status"),missionStatus:$("missionStatus"),topStatus:$("topStatus"),
  passReadout:$("passReadout"),stagePass:$("stagePass"),attackWindowVal:$("attackWindowVal"),
  attackWindowMeter:$("attackWindowMeter"),orbitDot:$("orbitDot"),trackMode:$("trackMode"),
  unknownCount:$("unknownCount"),hostileCount:$("hostileCount"),friendlyCount:$("friendlyCount"),friendlyHp:$("friendlyHp"),
  fireCtrlState:$("fireCtrlState"),targetClass:$("targetClass"),targetConfidence:$("targetConfidence"),
  zoomTarget:$("zoomTarget"),hitBanner:$("hitBanner"),reticleLabel:$("reticleLabel"),
  weaponName:$("weaponName"),weaponRole:$("weaponRole"),weaponSilhouette:$("weaponSilhouette"),
  damageStat:$("damageStat"),radiusStat:$("radiusStat"),reloadStat:$("reloadStat"),
  gridReadout:$("gridReadout"),rangeReadout:$("rangeReadout"),etaReadout:$("etaReadout"),solutionTarget:$("solutionTarget"),
  reload:$("reload"),cooldownFill:$("cooldownFill"),heatValue:$("heatValue"),heatFill:$("heatFill"),
  stabilityValue:$("stabilityValue"),stabilityFill:$("stabilityFill"),
  ammoLight:$("ammoLight"),ammoMedium:$("ammoMedium"),ammoHeavy:$("ammoHeavy"),
  scanBtn:$("scanBtn"),fireBtn:$("fireBtn"),threatMeter:$("threatMeter")
};

let cssW=1,cssH=1,dpr=1,last=performance.now();
let orbit=0.25,orbitTurns=0,pass=1,reticle={x:57,z:48},weapon="light",shot=null,impactFx=[];
let readyAt=0,heat=0,stability=1,audioCtx=null,bannerTimer=null,missionOver=false;
let orbitPauseUntil=0,pointerId=null,nextEnemyFire=performance.now()+4500;

const weaponDefs={
  light:{name:"40mm AUTO",role:"FAST / PRECISION",reload:620,damage:1,radius:4,travel:650,color:"#78ef9a",ammo:120,maxAmmo:120,heat:.10,shape:"lightShape",damageLabel:"LOW"},
  medium:{name:"105mm HE",role:"AREA / HEAVY",reload:2200,damage:2,radius:9,travel:1050,color:"#f0aa43",ammo:18,maxAmmo:18,heat:.24,shape:"mediumShape",damageLabel:"HIGH"},
  heavy:{name:"GUIDED STRIKE",role:"PRECISION / LONG CYCLE",reload:5200,damage:5,radius:15,travel:1550,color:"#ff665b",ammo:6,maxAmmo:6,heat:.40,shape:"heavyShape",damageLabel:"EXTREME"}
};

const structures=[
  {x:35,z:31,w:15,d:10,h:13,hp:4,maxHp:4,type:"bunker"},
  {x:58,z:31,w:11,d:8,h:10,hp:3,maxHp:3,type:"building"},
  {x:65,z:59,w:17,d:10,h:9,hp:4,maxHp:4,type:"building"},
  {x:46,z:69,w:10,d:8,h:8,hp:3,maxHp:3,type:"building"},
  {x:75,z:41,w:8,d:8,h:18,hp:3,maxHp:3,type:"tower"}
];

const ornaments=[
  {x:27,z:37,type:"tree"},{x:21,z:46,type:"tree"},{x:29,z:56,type:"tree"},
  {x:72,z:72,type:"tree"},{x:82,z:66,type:"tree"},{x:79,z:27,type:"tree"},
  {x:53,z:42,type:"crate"},{x:55,z:45,type:"crate"},
  {x:68,z:50,type:"barrier"},{x:41,z:49,type:"barrier"},{x:61,z:21,type:"radar"}
];

const friendlies=[
  {x:18,z:73,hp:3,maxHp:3,label:"CONVOY-1",kind:"truck"},
  {x:25,z:70,hp:3,maxHp:3,label:"CONVOY-2",kind:"truck"},
  {x:31,z:67,hp:3,maxHp:3,label:"ESCORT",kind:"apc"}
];

const contacts=[
  {x:72,z:28,hp:2,maxHp:2,state:0,label:"T-01",kind:"technical"},
  {x:68,z:44,hp:3,maxHp:3,state:0,label:"T-02",kind:"apc"},
  {x:78,z:62,hp:4,maxHp:4,state:0,label:"T-03",kind:"aa"},
  {x:54,z:38,hp:2,maxHp:2,state:0,label:"T-04",kind:"technical"}
];

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}

function ensureAudio(){
  if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
}
function tone(freq,dur=.08,type="square",gain=.03){
  ensureAudio(); if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime;
  o.type=type;o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(audioCtx.destination);
  g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.start(t);o.stop(t+dur);
}
function sfxFire(type){
  if(type==="light"){tone(210,.06,"square",.025);setTimeout(()=>tone(170,.05,"square",.018),45);}
  else if(type==="medium"){tone(95,.16,"sawtooth",.05);setTimeout(()=>tone(58,.22,"square",.025),35);}
  else {tone(72,.28,"sawtooth",.06);setTimeout(()=>tone(41,.42,"square",.032),55);}
}
function sfxHit(){tone(520,.07,"square",.028);setTimeout(()=>tone(760,.08,"square",.023),75);}
function sfxWarn(){tone(210,.09,"square",.025);setTimeout(()=>tone(190,.09,"square",.022),120);}

function resize(){
  const r=canvas.getBoundingClientRect();
  cssW=Math.max(1,r.width);cssH=Math.max(1,r.height);dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize",resize);resize();

function project(x,z,y=0){
  const dx=x-50,dz=z-50,ct=Math.cos(orbit),st=Math.sin(orbit);
  const rx=dx*ct-dz*st,rz=dx*st+dz*ct;
  const sx=cssW/116,sy=cssH/186,yScale=cssH/145;
  const perspective=1-rz/280;
  return {x:cssW/2+rx*sx*perspective,y:cssH*.57+rz*sy-y*yScale,depth:rz};
}
function screenToGround(sx,sy){
  const rx=(sx-cssW/2)/(cssW/116),rz=(sy-cssH*.57)/(cssH/186);
  const ct=Math.cos(orbit),st=Math.sin(orbit);
  const dx=rx*ct+rz*st,dz=-rx*st+rz*ct;
  return{x:clamp(dx+50,0,100),z:clamp(dz+50,0,100)};
}
function gridCoord(x,z){
  const col=String.fromCharCode(65+clamp(Math.floor(x/10),0,9));
  return col+"-"+clamp(Math.floor(z/10),0,9);
}
function path(points,stroke,fill,lineWidth=1){
  ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
}
function line(a,b,color,w=1,dash=null){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=w;if(dash)ctx.setLineDash(dash);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
}

function drawBoard(){
  ctx.fillStyle="#020706";ctx.fillRect(0,0,cssW,cssH);
  const q=[project(0,0),project(100,0),project(100,100),project(0,100)];
  path(q,"rgba(120,230,150,.42)","#07110b",1.5);

  for(let i=0;i<=100;i+=10){
    line(project(i,0),project(i,100),"rgba(74,151,96,.17)",1);
    line(project(0,i),project(100,i),"rgba(74,151,96,.17)",1);
  }

  drawRoad([{x:5,z:78},{x:28,z:68},{x:52,z:59},{x:77,z:48},{x:96,z:42}],6,"#203127");
  drawRoad([{x:18,z:20},{x:40,z:38},{x:60,z:48},{x:87,z:60}],4,"#17261d");

  const zone=[project(50,21,.08),project(88,21,.08),project(88,72,.08),project(50,72,.08)];
  path(zone,"rgba(255,95,85,.28)","rgba(255,95,85,.035)",1.2);

  const friendlyZone=[project(8,60,.05),project(38,60,.05),project(38,84,.05),project(8,84,.05)];
  path(friendlyZone,"rgba(106,216,232,.28)","rgba(106,216,232,.025)",1.2);
}
function drawRoad(points,width,color){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,width*cssW/130);ctx.lineCap="round";ctx.lineJoin="round";
  ctx.beginPath();
  points.forEach((p,i)=>{const s=project(p.x,p.z,.02);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y);});
  ctx.stroke();ctx.restore();
}

function drawExtrudedBox(o){
  if(o.hp<=0)return;
  const x0=o.x-o.w/2,x1=o.x+o.w/2,z0=o.z-o.d/2,z1=o.z+o.d/2;
  const b=[project(x0,z0),project(x1,z0),project(x1,z1),project(x0,z1)];
  const t=[project(x0,z0,o.h),project(x1,z0,o.h),project(x1,z1,o.h),project(x0,z1,o.h)];
  path([b[3],b[2],t[2],t[3]],"rgba(118,167,129,.35)","#13231a",1);
  path([b[1],b[2],t[2],t[1]],"rgba(118,167,129,.35)","#17291e",1);
  const topFill=o.hp<o.maxHp?"#3a331d":"#23392a";
  path(t,"rgba(170,225,184,.7)",topFill,1.15);

  if(o.type==="tower"){
    const p=project(o.x,o.z,o.h+3);ctx.strokeStyle="#98d5aa";ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.stroke();
  }
  if(o.type==="bunker"){
    const p=project(o.x,o.z,o.h+.3);ctx.strokeStyle="#6c9276";ctx.beginPath();ctx.moveTo(p.x-8,p.y);ctx.lineTo(p.x+8,p.y);ctx.stroke();
  }
}
function drawOrnament(o){
  const p=project(o.x,o.z,0);
  if(o.type==="tree"){
    const top=project(o.x,o.z,7);
    line(p,top,"#31543b",2);
    ctx.fillStyle="#274b34";ctx.beginPath();ctx.arc(top.x,top.y,4,0,Math.PI*2);ctx.fill();
  }else if(o.type==="crate"){
    const s=project(o.x,o.z,2);ctx.fillStyle="#34472f";ctx.strokeStyle="#6e8e72";ctx.fillRect(s.x-4,s.y-4,8,8);ctx.strokeRect(s.x-4,s.y-4,8,8);
  }else if(o.type==="barrier"){
    line(project(o.x-3,o.z,1),project(o.x+3,o.z,1),"#8b8f69",3);
  }else if(o.type==="radar"){
    const top=project(o.x,o.z,10);line(p,top,"#447654",2);ctx.strokeStyle="#83c898";ctx.beginPath();ctx.arc(top.x,top.y,6,-Math.PI*.85,Math.PI*.15);ctx.stroke();
  }
}

function drawVehicle(v,isFriendly){
  if(v.hp<=0)return;
  const p=project(v.x,v.z,1.8),base=project(v.x,v.z,0),c=isFriendly?"#6ad8e8":(v.state===2?"#ff665b":"#f0aa43");
  line(base,p,c,2);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(orbit*.18);
  ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.fillStyle="rgba(5,15,9,.82)";
  if(v.kind==="apc"){
    ctx.beginPath();ctx.moveTo(-9,-5);ctx.lineTo(7,-5);ctx.lineTo(10,0);ctx.lineTo(6,5);ctx.lineTo(-9,5);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeRect(-3,-8,6,5);
  }else if(v.kind==="aa"){
    ctx.strokeRect(-8,-5,16,10);ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,-15);ctx.moveTo(-6,-12);ctx.lineTo(0,-16);ctx.lineTo(6,-12);ctx.stroke();
  }else{
    ctx.strokeRect(-9,-5,18,10);ctx.strokeRect(3,-8,5,4);
  }
  ctx.restore();

  ctx.fillStyle=c;ctx.font="700 8px "+getComputedStyle(document.body).fontFamily;
  ctx.textAlign="left";
  if(isFriendly)ctx.fillText(v.label+" "+v.hp+"/"+v.maxHp,p.x+12,p.y+3);
  else if(v.state===2)ctx.fillText(v.label+" "+v.hp+"/"+v.maxHp,p.x+12,p.y+3);
}
function drawContact(c){
  if(c.hp<=0)return;
  const p=project(c.x,c.z,1.8);
  if(c.state===0){
    ctx.save();ctx.strokeStyle="#f0aa43";ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.stroke();ctx.restore();
    ctx.fillStyle="#f0aa43";ctx.font="900 15px monospace";ctx.fillText("?",p.x-4,p.y+5);
  }else if(c.state===1){
    ctx.save();ctx.strokeStyle="#6ad8e8";ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(p.x,p.y,15,0,Math.PI*2);ctx.stroke();ctx.restore();
    ctx.fillStyle="#6ad8e8";ctx.font="800 8px monospace";ctx.fillText("TRACK",p.x-14,p.y-20);
    drawVehicle(c,false);
  }else{
    drawVehicle(c,false);
    ctx.strokeStyle="#ff665b";ctx.lineWidth=1.2;ctx.strokeRect(p.x-14,p.y-14,28,28);
  }
}
function drawReticle(){
  const p=project(reticle.x,reticle.z,.3);
  const def=weaponDefs[weapon];
  ctx.save();ctx.strokeStyle=def.color;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(p.x-28,p.y);ctx.lineTo(p.x-8,p.y);ctx.moveTo(p.x+8,p.y);ctx.lineTo(p.x+28,p.y);
  ctx.moveTo(p.x,p.y-28);ctx.lineTo(p.x,p.y-8);ctx.moveTo(p.x,p.y+8);ctx.lineTo(p.x,p.y+28);ctx.stroke();

  const blastPx=def.radius*(cssW/116)*.55;
  ctx.globalAlpha=.4;ctx.setLineDash([4,4]);ctx.beginPath();ctx.ellipse(p.x,p.y,blastPx,blastPx*.45,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();

  ui.reticleLabel.style.left=p.x+"px";ui.reticleLabel.style.top=p.y+"px";ui.reticleLabel.textContent=gridCoord(reticle.x,reticle.z);
}

function quadratic3D(a,b,c,t){
  const u=1-t;
  return{x:u*u*a.x+2*u*t*b.x+t*t*c.x,z:u*u*a.z+2*u*t*b.z+t*t*c.z,y:u*u*a.y+2*u*t*b.y+t*t*c.y};
}
function shotPosition(s,t){
  return quadratic3D(s.start,s.control,s.end,clamp(t,0,1));
}
function drawShot(now){
  if(!shot)return;
  const t=(now-shot.startTime)/shot.duration;
  const def=weaponDefs[shot.weapon];

  if(t>=1){
    const resolved=shot;shot=null;resolveImpact(resolved);
    return;
  }

  const pts=[];
  const startT=Math.max(0,t-.28);
  for(let k=0;k<9;k++){
    const tt=lerp(startT,t,k/8),w=shotPosition(shot,tt),p=project(w.x,w.z,w.y);
    pts.push({p,alpha:k/8});
  }
  ctx.save();
  for(let i=1;i<pts.length;i++){
    ctx.globalAlpha=.08+.75*(i/pts.length);
    line(pts[i-1].p,pts[i].p,def.color,1+i*.32);
  }
  const w=shotPosition(shot,t),p=project(w.x,w.z,w.y);
  ctx.globalAlpha=1;ctx.fillStyle="#fff8d8";ctx.shadowColor=def.color;ctx.shadowBlur=12;
  const r=shot.weapon==="heavy"?7:shot.weapon==="medium"?5:3.5;
  ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawImpactEffects(now){
  impactFx=impactFx.filter(f=>now-f.start<f.duration);
  for(const f of impactFx){
    const t=(now-f.start)/f.duration,p=project(f.x,f.z,.1);
    ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle=f.color;ctx.fillStyle=f.color;
    ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,10+t*46,5+t*20,0,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=.16*(1-t);ctx.beginPath();ctx.arc(p.x,p.y,8+t*28,0,Math.PI*2);ctx.fill();
    if(f.kind==="hit"||f.kind==="friendly"){
      ctx.globalAlpha=(1-t)*.8;ctx.beginPath();ctx.arc(p.x,p.y,6+t*10,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
}

function nearestContact(radius=12){
  let best=null,bestD=Infinity;
  for(const c of contacts){
    if(c.hp<=0)continue;
    const d=Math.hypot(c.x-reticle.x,c.z-reticle.z);
    if(d<bestD&&d<=radius){best=c;bestD=d;}
  }
  return best;
}
function currentTargetInfo(){
  const c=nearestContact(14);
  if(!c)return{label:"NO LOCK",confidence:0,state:-1};
  const d=Math.hypot(c.x-reticle.x,c.z-reticle.z);
  const base=c.state===0?26:c.state===1?68:94;
  return{label:c.state===2?c.label:(c.state===1?"TRACKING":"UNIDENTIFIED"),confidence:clamp(Math.round(base+(14-d)*.4),0,99),state:c.state,contact:c};
}
function showBanner(text,type="scan"){
  ui.hitBanner.textContent=text;ui.hitBanner.className="hitBanner show "+type;
  clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>ui.hitBanner.className="hitBanner",1000);
}
function scan(){
  if(missionOver)return;
  ensureAudio();const c=nearestContact(13);
  if(!c){ui.status.textContent="SCAN NEGATIVE // no contact inside sensor gate.";showBanner("SCAN NEGATIVE","warn");tone(280,.06);return;}
  c.state=Math.min(2,c.state+1);
  if(c.state===1){ui.status.textContent="TRACK ESTABLISHED // hold sensor on contact.";showBanner("CONTACT TRACKED","scan");tone(440,.08,"square",.025);}
  else{ui.status.textContent="HOSTILE CONFIRMED // weapons release authorized.";showBanner("HOSTILE CONFIRMED","scan");tone(640,.08,"square",.025);}
  updateHud();
}
function fire(){
  if(missionOver||shot)return;
  const now=performance.now(),def=weaponDefs[weapon];
  if(now<readyAt||def.ammo<=0||heat>.92)return;
  ensureAudio();

  const ang=orbit-Math.PI*.15;
  const start={x:50+Math.cos(ang)*72,z:50+Math.sin(ang)*72,y:55};
  const end={x:reticle.x,z:reticle.z,y:0};
  const control={x:lerp(start.x,end.x,.48),z:lerp(start.z,end.z,.48),y:75+(weapon==="heavy"?12:0)};
  shot={weapon,start,control,end,startTime:now,duration:def.travel};
  def.ammo--;readyAt=now+def.reload;heat=clamp(heat+def.heat,0,1);stability=clamp(stability-(weapon==="heavy"?.28:weapon==="medium"?.16:.07),.35,1);

  ui.status.textContent="SHOT AWAY // "+def.name+" // IMPACT "+(def.travel/1000).toFixed(1)+"s";
  showBanner("SHOT AWAY","warn");sfxFire(weapon);updateHud();
}
function resolveImpact(s){
  const def=weaponDefs[s.weapon];let hostileHit=false,friendlyHit=false,structureHit=false,destroyed=false,denied=false;
  impactFx.push({x:s.end.x,z:s.end.z,start:performance.now(),duration:950,color:def.color,kind:"miss"});

  for(const f of friendlies){
    if(f.hp<=0)continue;
    const d=Math.hypot(f.x-s.end.x,f.z-s.end.z);
    if(d<=def.radius){f.hp=Math.max(0,f.hp-def.damage);friendlyHit=true;}
  }

  for(const c of contacts){
    if(c.hp<=0)continue;
    const d=Math.hypot(c.x-s.end.x,c.z-s.end.z);
    if(d<=def.radius){
      if(c.state<2){denied=true;continue;}
      const before=c.hp;c.hp=Math.max(0,c.hp-def.damage);hostileHit=true;if(before>0&&c.hp===0)destroyed=true;
    }
  }

  for(const o of structures){
    if(o.hp<=0)continue;
    const d=Math.hypot(o.x-s.end.x,o.z-s.end.z);
    if(d<=def.radius){o.hp=Math.max(0,o.hp-def.damage);structureHit=true;}
  }

  const fx=impactFx[impactFx.length-1];
  if(friendlyHit){
    fx.color="#ff5f55";fx.kind="friendly";ui.status.textContent="FRIENDLY FIRE // CHECK TARGET ID";showBanner("FRIENDLY HIT","hit");sfxWarn();
  }else if(destroyed){
    fx.color="#ff5f55";fx.kind="hit";ui.status.textContent="TARGET DESTROYED // BATTLE DAMAGE CONFIRMED";showBanner("TARGET DESTROYED","hit");sfxHit();
  }else if(hostileHit){
    fx.color="#ff5f55";fx.kind="hit";ui.status.textContent="HOSTILE HIT // DAMAGE CONFIRMED";showBanner("HOSTILE HIT","hit");sfxHit();
  }else if(denied){
    fx.color="#f0aa43";ui.status.textContent="IMPACT NEAR UNCONFIRMED CONTACT // SCAN REQUIRED";showBanner("NO ID / NO CONFIRM","warn");
  }else if(structureHit){
    fx.color="#f0aa43";ui.status.textContent="STRUCTURE HIT // COVER DEGRADED";showBanner("COVER DAMAGED","warn");
  }else{
    fx.color="#d9ffe3";ui.status.textContent="IMPACT // NO TARGET DAMAGE";showBanner("NO TARGET DAMAGE","warn");
  }
  updateHud();checkMission();
}
function enemyPressure(now){
  if(missionOver||now<nextEnemyFire)return;
  nextEnemyFire=now+4200+Math.random()*2600;
  const alive=friendlies.filter(f=>f.hp>0);if(!alive.length)return;
  const tgt=alive[Math.floor(Math.random()*alive.length)];
  if(Math.random()<.48){
    tgt.hp=Math.max(0,tgt.hp-1);
    impactFx.push({x:tgt.x,z:tgt.z,start:now,duration:780,color:"#ff5f55",kind:"friendly"});
    ui.status.textContent="INCOMING // "+tgt.label+" TAKING FIRE";showBanner("INCOMING","hit");sfxWarn();
  }else{
    ui.status.textContent="INCOMING // hostile fire missed convoy.";showBanner("INCOMING / MISS","warn");
  }
  updateHud();checkMission();
}
function checkMission(){
  const aliveF=friendlies.filter(f=>f.hp>0).length,aliveH=contacts.filter(c=>c.hp>0).length;
  if(!aliveF){
    missionOver=true;ui.missionStatus.textContent="FAILED";ui.missionStatus.className="";ui.topStatus.textContent="CONVOY LOST";
    ui.status.textContent="MISSION FAILED // convoy lost.";showBanner("MISSION FAILED","hit");
  }else if(!aliveH){
    missionOver=true;ui.missionStatus.textContent="COMPLETE";ui.missionStatus.className="greenText";ui.topStatus.textContent="AIR CORRIDOR SECURE";
    ui.status.textContent="MISSION COMPLETE // hostile contacts neutralized.";showBanner("MISSION COMPLETE","scan");
  }
  ui.scanBtn.disabled=missionOver;ui.fireBtn.disabled=missionOver;
}

function updateWeaponUi(){
  const def=weaponDefs[weapon];
  weaponButtons.forEach(b=>b.classList.toggle("active",b.dataset.weapon===weapon));
  ui.weaponName.textContent=def.name;ui.weaponRole.textContent=def.role;
  ui.damageStat.textContent=def.damageLabel;ui.radiusStat.textContent=def.radius+" m";ui.reloadStat.textContent=(def.reload/1000).toFixed(1)+" s";
  ui.weaponSilhouette.className="weaponSilhouette "+def.shape;
}
weaponButtons.forEach(b=>b.addEventListener("click",()=>{
  weapon=b.dataset.weapon;updateWeaponUi();ui.status.textContent=weaponDefs[weapon].name+" SELECTED";tone(360,.04);updateHud();
}));
ui.scanBtn.addEventListener("click",scan);ui.fireBtn.addEventListener("click",fire);

canvas.addEventListener("pointerdown",e=>{
  if(missionOver)return;
  pointerId=e.pointerId;orbitPauseUntil=performance.now()+1200;
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  moveAim(e);ensureAudio();
});
canvas.addEventListener("pointermove",e=>{if(pointerId===e.pointerId)moveAim(e);});
canvas.addEventListener("pointerup",e=>{if(pointerId===e.pointerId){moveAim(e);pointerId=null;orbitPauseUntil=performance.now()+900;}});
canvas.addEventListener("pointercancel",()=>pointerId=null);
function moveAim(e){
  const r=canvas.getBoundingClientRect();
  reticle=screenToGround(e.clientX-r.left,e.clientY-r.top);
  updateHud();
}

function updateHud(now=performance.now()){
  const def=weaponDefs[weapon],remaining=Math.max(0,readyAt-now),info=currentTargetInfo();
  const aliveUnknown=contacts.filter(c=>c.hp>0&&c.state<2).length;
  const aliveHostile=contacts.filter(c=>c.hp>0&&c.state===2).length;
  const aliveFriendly=friendlies.filter(f=>f.hp>0),friendlyHp=aliveFriendly.reduce((a,f)=>a+f.hp,0);

  ui.passReadout.textContent=pass+" / 6";ui.stagePass.textContent="PASS "+pass+"/6";
  ui.unknownCount.textContent=aliveUnknown;ui.hostileCount.textContent=aliveHostile;
  ui.friendlyCount.textContent=aliveFriendly.length;ui.friendlyHp.textContent=friendlyHp;
  ui.targetClass.textContent="TARGET: "+info.label;ui.targetConfidence.textContent="CONFIDENCE "+String(info.confidence).padStart(2,"0")+"%";
  ui.zoomTarget.textContent=info.label;ui.solutionTarget.textContent=info.label;
  ui.gridReadout.textContent=gridCoord(reticle.x,reticle.z);
  ui.rangeReadout.textContent=Math.round(Math.hypot(reticle.x-50,reticle.z-50)*18)+" m";
  ui.etaReadout.textContent=(def.travel/1000).toFixed(1)+" s";
  ui.reload.textContent=remaining>0?(remaining/1000).toFixed(1)+" s":"READY";
  const cooldownPct=remaining>0?100*(1-remaining/def.reload):100;ui.cooldownFill.style.width=clamp(cooldownPct,0,100)+"%";
  ui.heatValue.textContent=Math.round(heat*100)+"%";ui.heatFill.style.width=Math.round(heat*100)+"%";
  ui.stabilityValue.textContent=Math.round(stability*100)+"%";ui.stabilityFill.style.width=Math.round(stability*100)+"%";
  ui.ammoLight.textContent=weaponDefs.light.ammo;ui.ammoMedium.textContent=weaponDefs.medium.ammo;ui.ammoHeavy.textContent=weaponDefs.heavy.ammo;
  ui.fireCtrlState.textContent=heat>.92?"HOT":"ONLINE";
  ui.fireCtrlState.style.color=heat>.92?"#ff5f55":"";
  ui.fireBtn.disabled=missionOver||remaining>0||!!shot||def.ammo<=0||heat>.92;

  const threat=Math.min(8,aliveHostile*2+Math.ceil(aliveUnknown*.7));
  [...ui.threatMeter.children].forEach((n,i)=>n.classList.toggle("active",i<threat));

  const phase=(orbit%(Math.PI*2))/(Math.PI*2),windowSec=Math.round(8+12*(1-Math.abs(.5-phase)*2));
  ui.attackWindowVal.textContent=windowSec+" s";
  [...ui.attackWindowMeter.children].forEach((n,i)=>n.classList.toggle("active",i<Math.round(windowSec/2.5)));
  ui.orbitDot.style.transform="rotate("+Math.round(phase*360)+"deg)";
}
function drawScene(now){
  drawBoard();

  const drawables=[];
  structures.forEach(o=>{if(o.hp>0)drawables.push({depth:project(o.x,o.z).depth,fn:()=>drawExtrudedBox(o)});});
  ornaments.forEach(o=>drawables.push({depth:project(o.x,o.z).depth,fn:()=>drawOrnament(o)}));
  friendlies.forEach(f=>{if(f.hp>0)drawables.push({depth:project(f.x,f.z).depth,fn:()=>drawVehicle(f,true)});});
  contacts.forEach(c=>{if(c.hp>0)drawables.push({depth:project(c.x,c.z).depth,fn:()=>drawContact(c)});});
  drawables.sort((a,b)=>a.depth-b.depth).forEach(d=>d.fn());

  drawReticle();
  drawShot(now);
  drawImpactEffects(now);
}
function frame(now){
  const dt=Math.min(40,now-last);last=now;
  if(now>orbitPauseUntil&&!pointerId){
    const before=orbit;orbit+=dt*.000055;
    if(Math.floor(before/(Math.PI*2))!==Math.floor(orbit/(Math.PI*2))){
      orbitTurns++;pass=Math.min(6,1+orbitTurns);
    }
  }
  heat=clamp(heat-dt*.000045,0,1);
  stability=clamp(stability+dt*.00007,0,1);
  drawScene(now);enemyPressure(now);updateHud(now);
  requestAnimationFrame(frame);
}

updateWeaponUi();updateHud();requestAnimationFrame(frame);
