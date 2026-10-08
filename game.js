"use strict";

const $=id=>document.getElementById(id);
const canvas=$("field"),ctx=canvas.getContext("2d");
const weaponButtons=[...document.querySelectorAll(".weaponCard")];

const ui={
  status:$("status"),combatEvent:$("combatEvent"),missionStatus:$("missionStatus"),topStatus:$("topStatus"),
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
  scanBtn:$("scanBtn"),fireBtn:$("fireBtn"),tacticalAudio:$("tacticalAudio"),tacticalChargeReadout:$("tacticalChargeReadout"),threatMeter:$("threatMeter"),
  roeState:$("roeState"),scanProgress:$("scanProgress"),
  restartBtn:$("restartBtn"),nextBtn:$("nextBtn"),missionOverlay:$("missionOverlay"),
  missionResult:$("missionResult"),missionSummary:$("missionSummary"),
  overlayRestart:$("overlayRestart"),overlayNext:$("overlayNext")
};

let cssW=1,cssH=1,dpr=1,last=performance.now();
let orbit=0.25,orbitTurns=0,pass=1,reticle={x:57,z:48},weapon="cannon",shot=null,impactFx=[],wrecks=[],incomingFx=[];
let readyAt=0,heat=0,stability=1,audioCtx=null,bannerTimer=null,missionOver=false;
let orbitPauseUntil=0,pointerId=null,nextEnemyFire=performance.now()+4500,scenarioIndex=0;
let tacticalHoverContact=null,tacticalHoverSince=0,tacticalFirePointer=null,tacticalChargeStart=0;
let shotsFired=0,hostilesDestroyed=0,friendliesLost=0;

const weaponDefs={
  cannon:{name:"CANNON",role:"FAST / PRECISION",reload:420,damage:1.25,radius:5,travel:430,color:"#7de49c",heat:.07,shape:"lightShape",damageLabel:"LOW"},
  heavy:{name:"HEAVY",role:"SPLASH / IMPACT",reload:900,damage:2.3,radius:8,travel:620,color:"#f0aa43",heat:.15,shape:"mediumShape",damageLabel:"HIGH"},
  orbital:{name:"ORBITAL",role:"ASSIST / MAX BLAST",reload:1700,damage:4.2,radius:12,travel:900,color:"#ff665b",heat:.27,shape:"heavyShape",damageLabel:"EXTREME"},
  cluster:{name:"CLUSTER",role:"MULTI-HIT / AREA",reload:1350,damage:1.15,radius:4.5,travel:760,color:"#ffd36a",heat:.20,shape:"mediumShape",damageLabel:"MULTI"},
  penetrator:{name:"PENETRATOR",role:"ARMOR / CONCENTRATED",reload:1150,damage:4.8,radius:3.2,travel:560,color:"#8ee7ff",heat:.18,shape:"lightShape",damageLabel:"PIERCE"}
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
const baseContactPositions=contacts.map(c=>({x:c.x,z:c.z}));
const baseFriendlyPositions=friendlies.map(f=>({x:f.x,z:f.z}));

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
  const flashing=v.flashUntil&&performance.now()<v.flashUntil;
  ctx.save();
  ctx.globalAlpha=isFriendly?.22:(v.state===0?.18:.32);
  ctx.fillStyle=isFriendly?"#6ad8e8":(v.state===2?"#ff8a5b":"#ffd17a");
  ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=isFriendly?12:20;
  ctx.beginPath();ctx.ellipse(p.x,p.y,15,8,0,0,Math.PI*2);ctx.fill();ctx.restore();
  line(base,p,c,flashing?3.5:2);
  if(flashing){
    ctx.save();ctx.strokeStyle="#fff4d8";ctx.globalAlpha=.8;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(p.x,p.y,21,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(orbit*.18);
  ctx.strokeStyle=flashing?"#fff4d8":c;ctx.lineWidth=flashing?2.7:1.5;ctx.fillStyle=flashing?"rgba(90,20,10,.9)":"rgba(5,15,9,.82)";
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
    ctx.save();ctx.strokeStyle="#ff665b";ctx.lineWidth=tacticalHoverContact===c?2.4:1.2;
    if(tacticalHoverContact===c){ctx.shadowColor="#ff665b";ctx.shadowBlur=18;ctx.globalAlpha=.92;}
    ctx.strokeRect(p.x-14,p.y-14,28,28);
    if(tacticalHoverContact===c){
      ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(p.x,p.y,24+Math.sin(performance.now()*.012)*2,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);ctx.fillStyle="#ffd7ce";ctx.font="900 8px monospace";ctx.textAlign="center";ctx.fillText("COMBATANT",p.x,p.y-30);
    }
    ctx.restore();
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
  const tier=shot.tier||tacticalChargeTier(0),power=tier.label==="OVERCHARGE"?1.65:tier.label==="HEAVY"?1.3:1;
  ctx.save();
  for(let i=1;i<pts.length;i++){
    ctx.globalAlpha=.08+.82*(i/pts.length);ctx.shadowColor=def.color;ctx.shadowBlur=6*power;
    line(pts[i-1].p,pts[i].p,def.color,(1+i*.32)*power);
  }
  const w=shotPosition(shot,t),p=project(w.x,w.z,w.y);
  ctx.globalAlpha=1;ctx.fillStyle=power>1.5?"#ffffff":"#fff8d8";ctx.shadowColor=def.color;ctx.shadowBlur=18*power;
  const baseR=shot.weapon==="orbital"?7:shot.weapon==="heavy"?5.5:shot.weapon==="cluster"?5:shot.weapon==="penetrator"?3:3.8;
  ctx.beginPath();ctx.arc(p.x,p.y,baseR*power,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawImpactEffects(now){
  impactFx=impactFx.filter(f=>now-f.start<f.duration);
  for(const f of impactFx){
    const t=(now-f.start)/f.duration,p=project(f.x,f.z,.1);
    ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle=f.color;ctx.fillStyle=f.color;
    ctx.lineWidth=f.kind==="hit"?3.5:2;ctx.beginPath();ctx.ellipse(p.x,p.y,12+t*58,6+t*27,0,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=.2*(1-t);ctx.beginPath();ctx.arc(p.x,p.y,10+t*34,0,Math.PI*2);ctx.fill();
    if(f.kind==="hit"||f.kind==="friendly"){
      ctx.globalAlpha=(1-t)*.95;ctx.beginPath();ctx.arc(p.x,p.y,8+t*14,0,Math.PI*2);ctx.fill();
    }
    if(f.label){
      ctx.globalAlpha=Math.min(1,(1-t)*1.4);ctx.font="900 14px monospace";ctx.textAlign="center";
      ctx.fillStyle=f.color;ctx.fillText(f.label,p.x,p.y-32-t*14);
    }
    ctx.restore();
  }
}
function drawWrecks(){
  for(const w of wrecks){
    const p=project(w.x,w.z,1.1);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(orbit*.18);
    ctx.strokeStyle="#a0463c";ctx.fillStyle="rgba(55,20,16,.72)";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(-10,-6);ctx.lineTo(9,-4);ctx.lineTo(7,6);ctx.lineTo(-8,5);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-8,-7);ctx.lineTo(8,7);ctx.moveTo(8,-7);ctx.lineTo(-8,7);ctx.stroke();
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
function updateTacticalIdentification(now=performance.now()){
  const c=nearestContact(14);
  if(!c){tacticalHoverContact=null;tacticalHoverSince=0;return;}
  if(tacticalHoverContact!==c){
    tacticalHoverContact=c;tacticalHoverSince=now;
    if(c.state<2){ui.status.textContent="CONTACT ACQUIRED // HOLD RETICLE FOR COMBATANT ID";setCombatEvent(c.label+" // ANALYZING SIGNATURE","scan");}
  }
  if(c.state>=2)return;
  const dwell=now-tacticalHoverSince;
  if(dwell>=300&&c.state===0){
    c.state=1;showBanner("SIGNATURE MATCH","scan");setCombatEvent(c.label+" // COMBATANT SIGNATURE MATCH","scan");
    if(typeof arcadeTone==="function")arcadeTone(440,.08,"square",.018);
  }
  if(dwell>=760&&c.state<2){
    c.state=2;showBanner("COMBATANT CONFIRMED","scan");setCombatEvent(c.label+" // COMBATANT CONFIRMED // WEAPONS FREE","scan");
    ui.status.textContent="COMBATANT CONFIRMED // WEAPONS RELEASE AUTHORIZED";
    if(typeof arcadeTone==="function"){arcadeTone(620,.09,"square",.022);arcadeTone(820,.08,"sine",.012,.08);}
  }
}
function currentTargetInfo(){
  const c=nearestContact(14);
  if(!c)return{label:"NO LOCK",confidence:0,state:-1};
  const d=Math.hypot(c.x-reticle.x,c.z-reticle.z);
  const base=c.state===0?28:c.state===1?74:97;
  const label=c.state===2?c.label+" // COMBATANT":(c.state===1?"SIGNATURE MATCH":"CONTACT");
  return{label,confidence:clamp(Math.round(base+(14-d)*.25),0,99),state:c.state,contact:c};
}
function showBanner(text,type="scan"){
  ui.hitBanner.textContent=text;ui.hitBanner.className="hitBanner show "+type;
  clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>ui.hitBanner.className="hitBanner",1300);
}
function setCombatEvent(text,type="neutral"){
  if(!ui.combatEvent)return;
  ui.combatEvent.className="combatEvent "+type;
  const span=ui.combatEvent.querySelector("span");
  if(span)span.textContent=text;
}
function tacticalChargeTier(hold){
  if(hold<450)return{label:"SNAP",mult:1,radius:1,cool:1,heat:1};
  if(hold<1250)return{label:"HEAVY",mult:1.7,radius:1.5,cool:1.5,heat:1.45};
  return{label:"OVERCHARGE",mult:2.6,radius:2.15,cool:2.3,heat:2.05};
}
function fire(hold=0){
  if(missionOver||shot)return;
  const now=performance.now(),def=weaponDefs[weapon],aimed=nearestContact(13),tier=tacticalChargeTier(hold);
  if(!aimed||aimed.state<2){
    ui.status.textContent="WEAPONS HOLD // ACQUIRE AND CONFIRM COMBATANT";
    showBanner("COMBATANT ID REQUIRED","warn");setCombatEvent((aimed?aimed.label:"NO CONTACT")+" // FIRE CONTROL HOLD","warn");sfxWarn();return;
  }
  if(now<readyAt||heat>.92)return;
  ensureAudio();

  const ang=orbit-Math.PI*.15,start={x:50+Math.cos(ang)*72,z:50+Math.sin(ang)*72,y:55};
  const end={x:reticle.x,z:reticle.z,y:0};
  if(weapon==="orbital"){
    const d=Math.hypot(aimed.x-end.x,aimed.z-end.z);
    if(d<11){end.x=lerp(end.x,aimed.x,.38);end.z=lerp(end.z,aimed.z,.38);}
  }
  const control={x:lerp(start.x,end.x,.48),z:lerp(start.z,end.z,.48),y:75+(tier.label==="OVERCHARGE"?12:0)};
  shot={weapon,tier,start,control,end,startTime:now,duration:def.travel};
  shotsFired++;readyAt=now+def.reload*tier.cool;heat=clamp(heat+def.heat*tier.heat,0,1);
  stability=clamp(stability-(tier.label==="OVERCHARGE"?.28:tier.label==="HEAVY"?.16:.07),.35,1);

  ui.status.textContent=tier.label+" SHOT AWAY // "+def.name+" // IMPACT "+(def.travel/1000).toFixed(1)+"s";
  showBanner(tier.label+" STRIKE","warn");setCombatEvent(def.name+" // "+tier.label+" // ETA "+(def.travel/1000).toFixed(1)+"s","warn");
  if(typeof arcadeSfxLaunch==="function")arcadeSfxLaunch(tier.label,weapon);else sfxFire(weapon);
  updateHud();
}
function resolveImpact(s){
  const def=weaponDefs[s.weapon],tier=s.tier||tacticalChargeTier(0);
  const radius=def.radius*tier.radius,damage=def.damage*tier.mult;
  let hostileHit=false,friendlyHit=false,structureHit=false,destroyed=false,hitContact=null,hitFriendly=null,totalHits=0;
  const now=performance.now();
  impactFx.push({x:s.end.x,z:s.end.z,start:now,duration:1250,color:def.color,kind:"miss",label:""});

  const blastPoints=[];
  if(s.weapon==="cluster"){
    const pellets=tier.label==="OVERCHARGE"?8:tier.label==="HEAVY"?6:5;
    for(let i=0;i<pellets;i++){
      const a=i/pellets*Math.PI*2,spread=radius*(.32+.34*(i%2));
      blastPoints.push({x:s.end.x+Math.cos(a)*spread,z:s.end.z+Math.sin(a)*spread,r:radius*.62,damage:damage*.72});
      impactFx.push({x:s.end.x+Math.cos(a)*spread,z:s.end.z+Math.sin(a)*spread,start:now+i*35,duration:720,color:def.color,kind:"hit",label:""});
    }
  }else blastPoints.push({x:s.end.x,z:s.end.z,r:radius,damage});

  for(const bp of blastPoints){
    for(const f of friendlies){
      if(f.hp<=0)continue;const d=Math.hypot(f.x-bp.x,f.z-bp.z);
      if(d<=bp.r){const dealt=bp.damage*(1-clamp(d/bp.r,0,.75));f.hp=Math.max(0,f.hp-dealt);friendlyHit=true;hitFriendly=f;f.flashUntil=now+700;}
    }
    for(const c of contacts){
      if(c.hp<=0||c.state<2)continue;const d=Math.hypot(c.x-bp.x,c.z-bp.z);
      if(d<=bp.r){
        const bonus=s.weapon==="penetrator"&&(c.kind==="apc"||c.kind==="aa")?1.7:1;
        const dealt=bp.damage*(1-clamp(d/bp.r,0,.75))*bonus,before=c.hp;
        c.hp=Math.max(0,c.hp-dealt);hostileHit=true;hitContact=c;totalHits++;c.flashUntil=now+700;
        if(before>0&&c.hp===0){destroyed=true;hostilesDestroyed++;wrecks.push({x:c.x,z:c.z,kind:c.kind});}
      }
    }
    for(const o of structures){
      if(o.hp<=0)continue;const d=Math.hypot(o.x-bp.x,o.z-bp.z);
      if(d<=bp.r){o.hp=Math.max(0,o.hp-bp.damage*(s.weapon==="penetrator"?1.4:.7));structureHit=true;}
    }
  }

  const fx=impactFx[0+impactFx.length-blastPoints.length-(s.weapon==="cluster"?1:0)]||impactFx[impactFx.length-1];
  const mainFx=impactFx.findLast?impactFx.findLast(x=>x.start===now):impactFx[impactFx.length-1];
  const resultFx=mainFx||fx;
  if(friendlyHit){
    resultFx.color="#ff5f55";resultFx.kind="friendly";resultFx.label="FRIENDLY HIT";
    ui.status.textContent="FRIENDLY FIRE // CHECK TARGET ID";showBanner("FRIENDLY HIT","hit");setCombatEvent((hitFriendly?hitFriendly.label:"FRIENDLY")+" // CEASE FIRE","hit");sfxWarn();
  }else if(destroyed){
    resultFx.color="#ff5f55";resultFx.kind="hit";resultFx.label="DESTROYED";
    ui.status.textContent="TARGET DESTROYED // BATTLE DAMAGE CONFIRMED";showBanner("TARGET DESTROYED","hit");setCombatEvent((hitContact?hitContact.label:"TARGET")+" // DESTROYED // BDA CONFIRMED","hit");
  }else if(hostileHit){
    resultFx.color="#ff5f55";resultFx.kind="hit";resultFx.label="HIT x"+totalHits;
    ui.status.textContent="HOSTILE HIT // DAMAGE CONFIRMED";showBanner("HOSTILE HIT","hit");setCombatEvent((hitContact?hitContact.label:"HOSTILE")+" // "+tier.label+" HIT // "+Math.max(0,hitContact?hitContact.hp:0).toFixed(1)+" HP","hit");
  }else if(structureHit){
    resultFx.color="#f0aa43";resultFx.label="COVER HIT";ui.status.textContent="STRUCTURE HIT // COVER DEGRADED";showBanner("COVER DAMAGED","warn");setCombatEvent("STRUCTURE HIT // COVER DEGRADED","warn");
  }else{
    resultFx.color="#d9ffe3";resultFx.label="MISS";ui.status.textContent="IMPACT // NO TARGET DAMAGE";showBanner("NO TARGET DAMAGE","warn");setCombatEvent("NO TARGET DAMAGE // ADJUST AIM","warn");
  }
  if(typeof arcadeSfxImpact==="function")arcadeSfxImpact(tier.label,hostileHit,s.weapon);
  updateHud();checkMission();
}
function enemyPressure(now){
  if(missionOver||now<nextEnemyFire)return;
  nextEnemyFire=now+4200+Math.random()*2600;
  const aliveF=friendlies.filter(f=>f.hp>0),aliveH=contacts.filter(c=>c.hp>0);
  if(!aliveF.length||!aliveH.length)return;
  const tgt=aliveF[Math.floor(Math.random()*aliveF.length)];
  const src=aliveH[Math.floor(Math.random()*aliveH.length)];
  src.flashUntil=now+900;
  if(src.state===0)src.state=1;
  incomingFx.push({source:src,target:tgt,start:now,duration:900,hit:Math.random()<.55,resolved:false});
  ui.status.textContent="INCOMING // "+src.label+" FIRING ON "+tgt.label;
  setCombatEvent(src.label+" → "+tgt.label+" // INCOMING FIRE","hit");
  showBanner("INCOMING FIRE","hit");sfxWarn();updateHud();
}
function drawIncomingFire(now){
  incomingFx=incomingFx.filter(f=>now-f.start<f.duration+350);
  for(const f of incomingFx){
    const t=clamp((now-f.start)/f.duration,0,1),a=project(f.source.x,f.source.z,2),b=project(f.target.x,f.target.z,1.5);
    const x=lerp(a.x,b.x,t),y=lerp(a.y,b.y,t);
    ctx.save();ctx.strokeStyle="#ff5f55";ctx.lineWidth=2.3;ctx.setLineDash([7,5]);ctx.globalAlpha=.78;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(x,y);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#fff2d2";ctx.shadowColor="#ff5f55";ctx.shadowBlur=12;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.restore();
    if(t>=1&&!f.resolved){f.resolved=true;resolveEnemyShot(f);}
  }
}
function resolveEnemyShot(f){
  if(f.hit&&f.target.hp>0){
    const before=f.target.hp;f.target.hp=Math.max(0,f.target.hp-1);f.target.flashUntil=performance.now()+750;
    if(before>0&&f.target.hp===0)friendliesLost++;
    impactFx.push({x:f.target.x,z:f.target.z,start:performance.now(),duration:900,color:"#ff5f55",kind:"friendly",label:"INCOMING -1 HP"});
    ui.status.textContent=f.source.label+" HIT "+f.target.label;
    setCombatEvent(f.source.label+" → "+f.target.label+" // HIT // -1 HP","hit");showBanner("FRIENDLY HIT","hit");
  }else{
    impactFx.push({x:f.target.x+3,z:f.target.z-2,start:performance.now(),duration:650,color:"#f0aa43",kind:"miss",label:"ENEMY MISS"});
    ui.status.textContent=f.source.label+" MISSED "+f.target.label;
    setCombatEvent(f.source.label+" → "+f.target.label+" // MISS","warn");showBanner("INCOMING / MISS","warn");
  }
  updateHud();checkMission();
}
function checkMission(){
  const aliveF=friendlies.filter(f=>f.hp>0).length,aliveH=contacts.filter(c=>c.hp>0).length;
  if(!aliveF){
    missionOver=true;ui.missionStatus.textContent="FAILED";ui.missionStatus.className="";ui.topStatus.textContent="CONVOY LOST";
    ui.status.textContent="MISSION FAILED // convoy lost.";showBanner("MISSION FAILED","hit");showMissionOverlay(false);
  }else if(!aliveH){
    missionOver=true;ui.missionStatus.textContent="COMPLETE";ui.missionStatus.className="greenText";ui.topStatus.textContent="AIR CORRIDOR SECURE";
    ui.status.textContent="MISSION COMPLETE // hostile contacts neutralized.";showBanner("MISSION COMPLETE","scan");showMissionOverlay(true);
  }
  ui.scanBtn.disabled=missionOver;ui.fireBtn.disabled=missionOver;
}
function showMissionOverlay(success){
  ui.missionResult.textContent=success?"MISSION COMPLETE":"MISSION FAILED";
  ui.missionSummary.textContent="Hostiles destroyed: "+hostilesDestroyed+"  //  Friendlies lost: "+friendliesLost+"  //  Shots fired: "+shotsFired;
  ui.missionOverlay.classList.add("show");ui.missionOverlay.setAttribute("aria-hidden","false");
}
function resetMission(next=false){
  scenarioIndex+=next?1:0;missionOver=false;shot=null;impactFx=[];wrecks=[];incomingFx=[];
  readyAt=0;heat=0;stability=1;shotsFired=0;hostilesDestroyed=0;friendliesLost=0;pass=1;orbitTurns=0;
  const offset=(scenarioIndex%4)*3;
  contacts.forEach((c,i)=>{c.x=clamp(baseContactPositions[i].x+((i%2?1:-1)*offset),45,88);c.z=clamp(baseContactPositions[i].z+(((i+scenarioIndex)%2?1:-1)*offset),20,78);c.hp=c.maxHp;c.state=0;c.flashUntil=0;});
  friendlies.forEach((f,i)=>{f.x=baseFriendlyPositions[i].x;f.z=baseFriendlyPositions[i].z;f.hp=f.maxHp;f.flashUntil=0;});
  structures.forEach(o=>o.hp=o.maxHp);
  tacticalHoverContact=null;tacticalHoverSince=0;tacticalFirePointer=null;tacticalChargeStart=0;
  ui.missionStatus.textContent="IN PROGRESS";ui.missionStatus.className="amber";ui.topStatus.textContent="LINK SECURE";
  ui.missionOverlay.classList.remove("show");ui.missionOverlay.setAttribute("aria-hidden","true");
  ui.fireBtn.disabled=false;nextEnemyFire=performance.now()+4200;
  ui.status.textContent=next?"NEXT MISSION // NEW CONTACT PATTERN":"MISSION RESTARTED // SENSOR SWEEP RESET";
  setCombatEvent(next?"NEW SECTOR LOADED // IDENTIFY CONTACTS":"MISSION RESET // IDENTIFY CONTACTS","scan");updateHud();
}

function updateWeaponUi(){
  const def=weaponDefs[weapon];
  weaponButtons.forEach(b=>b.classList.toggle("active",b.dataset.weapon===weapon));
  ui.weaponName.textContent=def.name;ui.weaponRole.textContent=def.role;
  ui.damageStat.textContent=def.damageLabel;ui.radiusStat.textContent=def.radius+" m";ui.reloadStat.textContent=(def.reload/1000).toFixed(1)+" s";
  ui.weaponSilhouette.className="weaponSilhouette "+def.shape;
}
ui.restartBtn.addEventListener("click",()=>resetMission(false));
ui.nextBtn.addEventListener("click",()=>resetMission(true));
ui.overlayRestart.addEventListener("click",()=>resetMission(false));
ui.overlayNext.addEventListener("click",()=>resetMission(true));
weaponButtons.forEach(b=>b.addEventListener("click",()=>{
  weapon=b.dataset.weapon;updateWeaponUi();ui.status.textContent=weaponDefs[weapon].name+" SELECTED";tone(360,.04);updateHud();
}));
ui.fireBtn.addEventListener("pointerdown",e=>{
  if(ui.fireBtn.disabled||missionOver||shot)return;
  tacticalFirePointer=e.pointerId;tacticalChargeStart=performance.now();ui.fireBtn.classList.add("charging");
  try{ui.fireBtn.setPointerCapture(e.pointerId);}catch(_){}
  ensureAudio();e.preventDefault();
});
ui.fireBtn.addEventListener("pointerup",e=>{
  if(tacticalFirePointer!==e.pointerId)return;
  const hold=performance.now()-tacticalChargeStart;tacticalFirePointer=null;ui.fireBtn.classList.remove("charging");
  fire(hold);e.preventDefault();
});
ui.fireBtn.addEventListener("pointercancel",()=>{tacticalFirePointer=null;ui.fireBtn.classList.remove("charging");});

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
  updateTacticalIdentification(now);
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
  ui.ammoLight.textContent="∞";ui.ammoMedium.textContent="∞";ui.ammoHeavy.textContent="∞";
  ui.fireCtrlState.textContent=heat>.92?"HOT":"ONLINE";
  ui.fireCtrlState.style.color=heat>.92?"#ff5f55":"";
  const aimed=info.contact||null,confirmed=!!(aimed&&aimed.state===2),acquiring=!!(aimed&&aimed.state<2);
  if(confirmed){
    ui.roeState.textContent="WEAPONS FREE";ui.roeState.className="clear";
    ui.scanProgress.textContent="COMBATANT CONFIRMED // "+aimed.label;
    ui.fireBtn.classList.remove("held");ui.fireBtn.classList.add("hot");
  }else{
    ui.roeState.textContent="WEAPONS HOLD";ui.roeState.className="hold";
    ui.scanProgress.textContent=acquiring?(aimed.state===1?"SIGNATURE MATCH // HOLD":"ANALYZING CONTACT // HOLD"):"ACQUIRE COMBATANT";
    ui.fireBtn.classList.add("held");ui.fireBtn.classList.remove("hot");
  }
  const hold=tacticalFirePointer!==null?now-tacticalChargeStart:0,tier=tacticalChargeTier(hold);
  ui.fireBtn.textContent=tacticalFirePointer!==null?tier.label+" // RELEASE":"FIRE // HOLD TO CHARGE";
  ui.tacticalChargeReadout.textContent=tacticalFirePointer!==null?(tier.label+" // "+Math.round(def.radius*tier.radius)+"m EFFECT RADIUS // RELEASE TO FIRE"):"TAP FIRE: SNAP // HOLD FIRE: CHARGE";
  ui.tacticalChargeReadout.classList.toggle("charging",tacticalFirePointer!==null);
  ui.fireBtn.disabled=missionOver||remaining>0||!!shot||heat>.92||!confirmed;

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

  drawWrecks();
  drawReticle();
  drawShot(now);
  drawIncomingFire(now);
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


/* V0.3 — Arcade Overwatch */
const modeSelect=$("modeSelect"),tacticalApp=$("tacticalApp"),arcadeApp=$("arcadeApp");
const chooseTactical=$("chooseTactical"),chooseArcade=$("chooseArcade");
const arcadeCanvas=$("arcadeField"),arcadeCtx=arcadeCanvas.getContext("2d");
const arcadeUi={
  wave:$("arcadeWave"),baseHp:$("arcadeBaseHp"),score:$("arcadeScore"),banner:$("arcadeBanner"),
  chargeReadout:$("chargeReadout"),cooldownFill:$("arcadeCooldownFill"),cooldownText:$("arcadeCooldownText"),
  heatFill:$("arcadeHeatFill"),heatText:$("arcadeHeatText"),chargeFill:$("arcadeChargeFill"),chargeText:$("arcadeChargeText"),
  upgrade:$("arcadeUpgrade"),end:$("arcadeEnd"),endTitle:$("arcadeEndTitle"),endSummary:$("arcadeEndSummary"),
  back:$("arcadeBack"),audio:$("arcadeAudio"),restart:$("arcadeRestart"),endRestart:$("arcadeEndRestart"),endModes:$("arcadeEndModes"),
  orbitLeft:$("orbitLeft"),orbitRight:$("orbitRight"),orbitHeading:$("orbitHeading"),orbitDegrees:$("orbitDegrees"),
  chainChip:$("chainChip"),chainCount:$("chainCount"),chainBonus:$("chainBonus")
};
const arcadeWeaponButtons=[...document.querySelectorAll(".arcadeWeapon")];

let arcadeW=1,arcadeH=1,arcadeDpr=1,arcadeLast=performance.now(),arcadeRunning=false,arcadeOrbit=-.18,arcadeOrbitNudge=0;
let arcadeWeapon="cannon",arcadeHeat=0,arcadeReadyAt=0,arcadeScore=0,arcadeBase=100,arcadeWave=1;
let arcadeEnemies=[],arcadeShots=[],arcadeFx=[],arcadeStructures=[],arcadeSpawnQueue=[],arcadeSpawnAt=0;
let arcadePointer=null,arcadeChargeStart=0,arcadeAim={x:50,z:58},arcadeBannerTimer=null;
let arcadeRunOver=false,arcadeWaveTransition=false,arcadeKills=0;
let arcadeChain=0,arcadeBestChain=0;
let arcadeAudioEnabled=true,arcadeMusicTimer=null,arcadeMusicStep=0,arcadeMusicAudio=null,arcadeMusicTrackId=null,arcadeMusicFallback=false;
const arcadeMods={splash:1,cooldown:1,damage:1};

const arcadeWeaponDefs={
  cannon:{name:"CANNON",damage:1.25,radius:5,cooldown:420,heat:.07,travel:430,color:"#7de49c",role:"rapid"},
  heavy:{name:"HEAVY",damage:2.3,radius:8,cooldown:900,heat:.15,travel:620,color:"#f0aa43",role:"blast"},
  orbital:{name:"ORBITAL",damage:4.2,radius:12,cooldown:1700,heat:.27,travel:900,color:"#ff665b",role:"blast"},
  cluster:{name:"CLUSTER",damage:1.15,radius:4.5,cooldown:1350,heat:.20,travel:760,color:"#ffd36a",role:"cluster"},
  penetrator:{name:"PENETRATOR",damage:4.8,radius:3.2,cooldown:1150,heat:.18,travel:560,color:"#8ee7ff",role:"penetrator"}
};
const arcadeEnemyDefs={
  runner:{hp:1.4,speed:7.4,damage:8,size:5,color:"#ffb061",score:80},
  technical:{hp:3.2,speed:4.9,damage:13,size:7,color:"#ff765d",score:140},
  armor:{hp:6.8,speed:3.0,damage:22,size:9,color:"#ff4f4b",score:260}
};

function arcadeEnsureAudio(){
  if(!arcadeAudioEnabled)return;
  ensureAudio();
  if(audioCtx&&audioCtx.state==="suspended")audioCtx.resume().catch(()=>{});
}
function arcadeTone(freq,dur=.08,type="square",gain=.02,when=0){
  if(!arcadeAudioEnabled)return;
  arcadeEnsureAudio();if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+when;
  o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(gain,t);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+dur+.03);
}
function arcadeNoise(dur=.12,gain=.025,filterFreq=1100,filterType="lowpass",when=0){
  if(!arcadeAudioEnabled)return;
  arcadeEnsureAudio();if(!audioCtx)return;
  const sr=audioCtx.sampleRate,b=audioCtx.createBuffer(1,Math.max(1,Math.floor(sr*dur)),sr),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=audioCtx.createBufferSource(),g=audioCtx.createGain(),f=audioCtx.createBiquadFilter(),t=audioCtx.currentTime+when;
  f.type=filterType;f.frequency.value=filterFreq;g.gain.value=gain;s.buffer=b;s.connect(f);f.connect(g);g.connect(audioCtx.destination);s.start(t);
}
function arcadeSweep(startFreq,endFreq,dur=.2,type="sawtooth",gain=.025,when=0){
  if(!arcadeAudioEnabled)return;
  arcadeEnsureAudio();if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+when;
  o.type=type;o.frequency.setValueAtTime(startFreq,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq),t+dur);
  g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+dur+.03);
}
function arcadeKick(when=0,gain=.035){
  arcadeSweep(120,45,.18,"sine",gain,when);arcadeNoise(.045,gain*.35,160,"lowpass",when);
}
function arcadeSnare(when=0,gain=.014){
  arcadeNoise(.11,gain,1800,"bandpass",when);arcadeTone(190,.06,"triangle",gain*.5,when);
}
function arcadeImpactPulse(kind="impact"){
  const hero=document.querySelector(".arcadeHero");if(!hero)return;
  hero.classList.remove("impactPulse","wavePulse");void hero.offsetWidth;
  hero.classList.add(kind==="wave"?"wavePulse":"impactPulse");
  setTimeout(()=>hero.classList.remove("impactPulse","wavePulse"),120);
}
function arcadeSfxLaunch(tier,weaponName){
  const over=tier==="OVERCHARGE",heavyTier=tier==="HEAVY";
  if(weaponName==="cannon"){
    arcadeNoise(.055,.018,2600,"highpass");arcadeSweep(260,150,.08,"square",.028);
    if(over){arcadeTone(95,.18,"sine",.026,.015);arcadeNoise(.11,.022,900,"bandpass",.02);}
  }else if(weaponName==="heavy"){
    arcadeKick(0,.055);arcadeNoise(.12,.035,700,"lowpass");arcadeSweep(115,62,.24,"sawtooth",.04,.015);
    if(over)arcadeTone(48,.42,"sine",.04,.02);
  }else if(weaponName==="orbital"){
    arcadeSweep(420,72,over?.55:.38,"sawtooth",over?.045:.032);
    arcadeTone(42,over?.72:.48,"sine",over?.05:.035,.02);arcadeNoise(.18,.025,1200,"bandpass",.06);
  }else if(weaponName==="cluster"){
    arcadeTone(145,.12,"sawtooth",.028);[.04,.09,.14].forEach((w,i)=>arcadeTone(390+i*70,.045,"square",.012,w));
  }else if(weaponName==="penetrator"){
    arcadeNoise(.045,.022,3200,"highpass");arcadeSweep(760,180,.11,"triangle",.026);arcadeTone(82,.2,"sine",.025,.02);
  }
  if(heavyTier)arcadeTone(72,.22,"sine",.018,.015);
  if(over)arcadeNoise(.16,.02,500,"lowpass",.03);
}
function arcadeSfxImpact(tier,hit,weaponName){
  const big=tier==="OVERCHARGE";
  if(weaponName==="cannon"){
    arcadeNoise(.09,big?.032:.022,1800,"bandpass");arcadeTone(hit?145:105,.1,"square",.018);
  }else if(weaponName==="heavy"){
    arcadeNoise(big?.38:.25,big?.07:.05,650,"lowpass");arcadeKick(.015,big?.06:.045);arcadeTone(48,big?.5:.32,"sine",big?.05:.035,.02);
  }else if(weaponName==="orbital"){
    arcadeNoise(big?.5:.34,big?.08:.058,520,"lowpass");arcadeSweep(180,38,big?.6:.42,"sine",big?.06:.045);arcadeNoise(.16,.026,2600,"highpass",.04);
  }else if(weaponName==="cluster"){
    [0,.05,.1,.16,.23].forEach((w,i)=>{arcadeNoise(.08,.021-i*.0015,1200+i*180,"bandpass",w);arcadeTone(155+i*32,.055,"square",.01,w);});
  }else if(weaponName==="penetrator"){
    arcadeNoise(.055,.03,3400,"highpass");arcadeTone(880,.04,"triangle",.018,.01);arcadeSweep(110,54,.28,"sine",.038,.015);
  }
  if(hit){arcadeTone(420,.06,"square",.014,.05);arcadeNoise(.075,.012,2200,"bandpass",.06);}
  arcadeImpactPulse("impact");
}
function arcadeSfxWave(){
  arcadeImpactPulse("wave");arcadeNoise(.32,.022,900,"bandpass");
  arcadeTone(110,.35,"sawtooth",.026);arcadeTone(220,.1,"square",.018,.12);arcadeTone(330,.1,"square",.016,.24);arcadeTone(440,.16,"square",.014,.36);
}
function arcadeSfxBaseHit(){
  arcadeKick(0,.065);arcadeSweep(105,42,.42,"sawtooth",.048);arcadeNoise(.3,.052,520,"lowpass");arcadeNoise(.1,.018,2600,"highpass",.05);arcadeImpactPulse("impact");
}
function arcadeSfxUpgrade(){
  arcadeTone(330,.08,"sine",.02);arcadeTone(495,.1,"sine",.018,.08);arcadeTone(660,.14,"sine",.016,.16);arcadeNoise(.08,.008,2200,"bandpass",.1);
}
function arcadeSfxEnd(success){
  const notes=success?[262,330,392,523,659]:[220,185,147,110,82];
  notes.forEach((n,i)=>arcadeTone(n,.28,"sine",.024,i*.16));
  arcadeNoise(success?.16:.35,success?.012:.026,success?1800:500,success?"bandpass":"lowpass",.04);
}
const arcadeTracks={
  sector:{title:"Sector",artist:"SRG774",license:"CC0",url:"https://opengameart.org/sites/default/files/sector.mp3"},
  searching:{title:"Searching",artist:"yd",license:"CC0",url:"https://opengameart.org/sites/default/files/Searching.ogg"},
  pulse:{title:"Pulse",artist:"SRG774",license:"CC0",url:"https://opengameart.org/sites/default/files/pulse.mp3"},
  urgent:{title:"Urgent",artist:"SRG774",license:"CC0",url:"https://opengameart.org/sites/default/files/urgent.mp3"},
  brute:{title:"Brute Force",artist:"vitalezzz",license:"CC0",url:"https://opengameart.org/sites/default/files/brute_force_loop.mp3"},
  transmission:{title:"Transmission",artist:"SRG774",license:"CC0",url:"https://opengameart.org/sites/default/files/transmission.mp3"}
};
function arcadeTrackForWave(wave){
  if(wave<=1)return "sector";
  if(wave===2)return Math.random()<.5?"searching":"pulse";
  if(wave===3)return "pulse";
  if(wave===4)return "urgent";
  return "brute";
}
let tacticalMusicAudio=null,tacticalTrackIndex=0;
const tacticalTrackRotation=["sector","searching","pulse"];
function ensureTacticalMusicAudio(){
  if(tacticalMusicAudio)return tacticalMusicAudio;
  tacticalMusicAudio=new Audio();tacticalMusicAudio.preload="auto";tacticalMusicAudio.volume=.28;
  tacticalMusicAudio.addEventListener("ended",()=>{if(!tacticalApp.classList.contains("modeHidden")&&arcadeAudioEnabled){tacticalTrackIndex=(tacticalTrackIndex+1)%tacticalTrackRotation.length;playTacticalTrack();}});
  tacticalMusicAudio.addEventListener("error",()=>{if(!tacticalApp.classList.contains("modeHidden")&&arcadeAudioEnabled)startProceduralArcadeMusic();});
  return tacticalMusicAudio;
}
function playTacticalTrack(){
  if(!arcadeAudioEnabled)return;
  const id=tacticalTrackRotation[tacticalTrackIndex%tacticalTrackRotation.length],track=arcadeTracks[id];if(!track)return;
  stopProceduralArcadeMusic();
  const a=ensureTacticalMusicAudio();a.pause();a.loop=false;a.volume=.28;a.src=track.url;a.currentTime=0;
  const p=a.play();if(p&&p.catch)p.catch(()=>startProceduralArcadeMusic());
}
function startTacticalMusic(){tacticalTrackIndex=0;playTacticalTrack();}
function stopTacticalMusic(){if(tacticalMusicAudio){tacticalMusicAudio.pause();tacticalMusicAudio.currentTime=0;}}
function ensureArcadeMusicAudio(){
  if(arcadeMusicAudio)return arcadeMusicAudio;
  arcadeMusicAudio=new Audio();
  arcadeMusicAudio.preload="auto";arcadeMusicAudio.loop=true;arcadeMusicAudio.volume=.34;
  arcadeMusicAudio.addEventListener("error",()=>{
    arcadeMusicFallback=true;startProceduralArcadeMusic();
  });
  return arcadeMusicAudio;
}
function playArcadeTrack(id,{loop=true,volume=.34}={}){
  if(!arcadeAudioEnabled)return;
  const track=arcadeTracks[id];if(!track)return;
  const a=ensureArcadeMusicAudio();
  if(arcadeMusicTrackId===id&&!a.paused)return;
  arcadeMusicTrackId=id;arcadeMusicFallback=false;stopProceduralArcadeMusic();
  a.pause();a.loop=loop;a.volume=volume;a.src=track.url;a.currentTime=0;
  const p=a.play();if(p&&p.catch)p.catch(()=>{arcadeMusicFallback=true;startProceduralArcadeMusic();});
}
function syncArcadeTrackToWave(){playArcadeTrack(arcadeTrackForWave(arcadeWave));}
function startProceduralArcadeMusic(){
  if(!arcadeAudioEnabled||arcadeMusicTimer)return;
  arcadeEnsureAudio();arcadeMusicStep=0;
  const pulse=()=>{
    if(!arcadeRunning||!arcadeAudioEnabled)return;
    const step=arcadeMusicStep%16,wave=Math.max(1,arcadeWave),roots=[55,49,65.4,46.25],root=roots[Math.floor(arcadeMusicStep/8)%roots.length];
    const intensity=.75+wave*.12;
    arcadeTone(root,.95,"sine",.0065*intensity);
    if(step%4===0)arcadeKick(0,.018*intensity);
    if(wave>=2&&step%4===2)arcadeSnare(.02,.008*intensity);
    if(step%2===0)arcadeTone(root*2,.12,"triangle",.0035*intensity,.025);
    if(wave>=3&&(step===3||step===11))arcadeTone(root*3,.08,"square",.0038*intensity,.03);
    if(wave>=4&&(step===6||step===14))arcadeNoise(.12,.0065*intensity,1800,"bandpass",.01);
    if(wave>=5&&step%4===1)arcadeTone(root*4,.06,"square",.0038*intensity,.015);
    if(step===0){arcadeNoise(1.05,.0038*intensity,780,"bandpass");arcadeTone(root*.5,1.15,"sine",.0035*intensity,.02);}
    arcadeMusicStep++;
  };
  pulse();arcadeMusicTimer=setInterval(pulse,420);
}
function stopProceduralArcadeMusic(){if(arcadeMusicTimer){clearInterval(arcadeMusicTimer);arcadeMusicTimer=null;}}
function startArcadeMusic(){
  if(!arcadeAudioEnabled)return;
  syncArcadeTrackToWave();
}
function stopArcadeMusic(){
  stopProceduralArcadeMusic();
  if(arcadeMusicAudio){arcadeMusicAudio.pause();arcadeMusicAudio.currentTime=0;}
  arcadeMusicTrackId=null;
}
function setArcadeAudio(enabled){
  arcadeAudioEnabled=enabled;uiAudioUpdate();
  if(!enabled){stopArcadeMusic();stopTacticalMusic();return;}
  if(arcadeRunning)startArcadeMusic();
  else if(!tacticalApp.classList.contains("modeHidden"))startTacticalMusic();
}
function uiAudioUpdate(){
  if(arcadeUi.audio){arcadeUi.audio.setAttribute("aria-pressed",arcadeAudioEnabled?"true":"false");arcadeUi.audio.textContent=arcadeAudioEnabled?"🔊 AUDIO":"🔇 MUTED";}
  if(ui.tacticalAudio){ui.tacticalAudio.setAttribute("aria-pressed",arcadeAudioEnabled?"true":"false");ui.tacticalAudio.textContent=arcadeAudioEnabled?"🔊 AUDIO":"🔇 MUTED";}
}

const arcadeWaveDefs=[
  [{type:"runner",count:6}],
  [{type:"runner",count:5},{type:"technical",count:3}],
  [{type:"runner",count:6},{type:"technical",count:5},{type:"armor",count:1}],
  [{type:"technical",count:7},{type:"armor",count:3},{type:"runner",count:6}],
  [{type:"runner",count:8},{type:"technical",count:8},{type:"armor",count:5}]
];
const arcadeLanes=[28,50,72];

function showMode(name){
  modeSelect.classList.add("modeHidden");
  tacticalApp.classList.toggle("modeHidden",name!=="tactical");
  arcadeApp.classList.toggle("modeHidden",name!=="arcade");
  if(name==="arcade"){stopTacticalMusic();resizeArcade();arcadeEnsureAudio();startArcadeRun();}
  else {arcadeRunning=false;stopArcadeMusic();resize();if(arcadeAudioEnabled)startTacticalMusic();updateHud();}
}
function returnToModes(){
  arcadeRunning=false;stopArcadeMusic();stopTacticalMusic();tacticalApp.classList.add("modeHidden");arcadeApp.classList.add("modeHidden");modeSelect.classList.remove("modeHidden");
}
chooseTactical.addEventListener("click",()=>showMode("tactical"));
chooseArcade.addEventListener("click",()=>showMode("arcade"));
arcadeUi.back.addEventListener("click",returnToModes);
arcadeUi.endModes.addEventListener("click",()=>{arcadeUi.end.classList.remove("show");returnToModes();});
arcadeUi.audio.addEventListener("click",()=>setArcadeAudio(!arcadeAudioEnabled));
ui.tacticalAudio.addEventListener("click",()=>setArcadeAudio(!arcadeAudioEnabled));
function nudgeArcadeOrbit(dir){
  arcadeOrbitNudge+=dir*Math.PI/2;
  showArcadeBanner("ORBIT SHIFT "+(dir>0?"+90°":"-90°"));
  arcadeTone(dir>0?330:260,.08,"square",.015);arcadeTone(dir>0?440:196,.1,"square",.012,.08);
}
arcadeUi.orbitLeft.addEventListener("click",e=>{e.stopPropagation();nudgeArcadeOrbit(-1);});
arcadeUi.orbitRight.addEventListener("click",e=>{e.stopPropagation();nudgeArcadeOrbit(1);});
arcadeUi.restart.addEventListener("click",startArcadeRun);
arcadeUi.endRestart.addEventListener("click",()=>{arcadeUi.end.classList.remove("show");startArcadeRun();});

function resizeArcade(){
  if(!arcadeCanvas)return;
  const r=arcadeCanvas.getBoundingClientRect();
  arcadeW=Math.max(1,r.width);arcadeH=Math.max(1,r.height);arcadeDpr=Math.min(2,window.devicePixelRatio||1);
  arcadeCanvas.width=Math.round(arcadeW*arcadeDpr);arcadeCanvas.height=Math.round(arcadeH*arcadeDpr);
  arcadeCtx.setTransform(arcadeDpr,0,0,arcadeDpr,0,0);
}
window.addEventListener("resize",()=>{if(!arcadeApp.classList.contains("modeHidden"))resizeArcade();});

function arcadeProject(x,z,y=0){
  const dx=x-50,dz=z-50,theta=arcadeOrbit,ct=Math.cos(theta),st=Math.sin(theta);
  const rx=dx*ct-dz*st,rz=dx*st+dz*ct;
  return{x:arcadeW/2+rx*(arcadeW/120),y:arcadeH*.51+rz*(arcadeH/150)-y*(arcadeH/120),depth:rz};
}
function arcadeScreenToGround(sx,sy){
  const rx=(sx-arcadeW/2)/(arcadeW/120),rz=(sy-arcadeH*.51)/(arcadeH/150),theta=arcadeOrbit,ct=Math.cos(theta),st=Math.sin(theta);
  return{x:clamp(rx*ct+rz*st+50,3,97),z:clamp(-rx*st+rz*ct+50,3,97)};
}
function arcadeLine(a,b,color,w=1,dash=null){
  arcadeCtx.save();arcadeCtx.strokeStyle=color;arcadeCtx.lineWidth=w;if(dash)arcadeCtx.setLineDash(dash);
  arcadeCtx.beginPath();arcadeCtx.moveTo(a.x,a.y);arcadeCtx.lineTo(b.x,b.y);arcadeCtx.stroke();arcadeCtx.restore();
}
function arcadePoly(pts,stroke,fill,w=1){
  arcadeCtx.beginPath();pts.forEach((p,i)=>i?arcadeCtx.lineTo(p.x,p.y):arcadeCtx.moveTo(p.x,p.y));arcadeCtx.closePath();
  if(fill){arcadeCtx.fillStyle=fill;arcadeCtx.fill();}if(stroke){arcadeCtx.strokeStyle=stroke;arcadeCtx.lineWidth=w;arcadeCtx.stroke();}
}
function resetArcadeStructures(){
  arcadeStructures=[
    {lane:0,x:28,z:38,w:14,d:5,h:8,hp:5,maxHp:5,type:"wall"},
    {lane:1,x:50,z:42,w:15,d:6,h:10,hp:6,maxHp:6,type:"ridge"},
    {lane:2,x:72,z:36,w:13,d:5,h:8,hp:5,maxHp:5,type:"wall"},
    {lane:0,x:28,z:64,w:12,d:5,h:7,hp:4,maxHp:4,type:"barrier"},
    {lane:1,x:50,z:67,w:14,d:5,h:8,hp:5,maxHp:5,type:"barrier"},
    {lane:2,x:72,z:62,w:12,d:5,h:7,hp:4,maxHp:4,type:"barrier"}
  ];
}
function startArcadeRun(){
  arcadeRunning=true;arcadeRunOver=false;arcadeWaveTransition=false;arcadeWave=1;arcadeOrbitNudge=0;arcadeScore=0;arcadeBase=100;arcadeHeat=0;arcadeReadyAt=0;arcadeKills=0;arcadeChain=0;arcadeBestChain=0;
  arcadeEnemies=[];arcadeShots=[];arcadeFx=[];arcadeMods.splash=1;arcadeMods.cooldown=1;arcadeMods.damage=1;
  arcadeWeapon="cannon";arcadeWeaponButtons.forEach(b=>b.classList.toggle("active",b.dataset.arcadeWeapon===arcadeWeapon));
  resetArcadeStructures();queueArcadeWave(1);arcadeUi.upgrade.classList.remove("show");arcadeUi.end.classList.remove("show");showArcadeBanner("WAVE 1 INBOUND");
  uiAudioUpdate();startArcadeMusic();arcadeSfxWave();updateArcadeHud(performance.now());
}
function queueArcadeWave(n){
  arcadeSpawnQueue=[];
  const def=arcadeWaveDefs[n-1]||arcadeWaveDefs[arcadeWaveDefs.length-1];
  let laneSeed=n;
  def.forEach(group=>{for(let i=0;i<group.count;i++){arcadeSpawnQueue.push({type:group.type,lane:(laneSeed+i)%3});}laneSeed++;});
  arcadeSpawnQueue.sort(()=>Math.random()-.5);arcadeSpawnAt=performance.now()+800;arcadeWaveTransition=false;
}
function spawnArcadeEnemy(spec){
  const d=arcadeEnemyDefs[spec.type],lane=spec.lane;
  arcadeEnemies.push({type:spec.type,lane,x:arcadeLanes[lane]+(Math.random()*5-2.5),z:-6-Math.random()*8,y:0,hp:d.hp,maxHp:d.hp,speed:d.speed,damage:d.damage,size:d.size,color:d.color,score:d.score,climb:null,dead:false});
}
function showArcadeBanner(text){
  arcadeUi.banner.textContent=text;arcadeUi.banner.classList.add("show");clearTimeout(arcadeBannerTimer);arcadeBannerTimer=setTimeout(()=>arcadeUi.banner.classList.remove("show"),1100);
}
function arcadeStructureHeightAt(e){
  let best=null;
  for(const s of arcadeStructures){
    if(s.hp<=0||s.lane!==e.lane)continue;
    if(Math.abs(e.z-s.z)<=s.d/2+2){best=s;break;}
  }
  if(!best){e.climb=null;return 0;}
  const start=best.z-best.d/2-2,end=best.z+best.d/2+2,p=clamp((e.z-start)/(end-start),0,1);
  e.climb=best;
  return Math.sin(p*Math.PI)*best.h;
}
function updateArcadeEnemies(dt,now){
  if(arcadeSpawnQueue.length&&now>=arcadeSpawnAt){
    spawnArcadeEnemy(arcadeSpawnQueue.shift());arcadeSpawnAt=now+Math.max(280,780-arcadeWave*70);
  }
  for(const e of arcadeEnemies){
    if(e.dead)continue;
    const h=arcadeStructureHeightAt(e),slow=h>0?.38:1;
    e.y=h;e.z+=e.speed*slow*(dt/1000)*(1+arcadeWave*.03);
    if(e.climb&&e.type==="armor"&&Math.random()<dt/2500)e.climb.hp=Math.max(0,e.climb.hp-.25);
    if(e.z>=91){
      e.dead=true;arcadeBase=Math.max(0,arcadeBase-e.damage);arcadeFx.push({x:e.x,z:92,start:now,duration:700,color:"#ff5f55",label:"BASE -"+e.damage});
      showArcadeBanner("BASE HIT");arcadeSfxBaseHit();if(arcadeBase<=0)endArcadeRun(false);
    }
  }
  arcadeEnemies=arcadeEnemies.filter(e=>!e.dead);
  if(!arcadeRunOver&&!arcadeWaveTransition&&!arcadeSpawnQueue.length&&!arcadeEnemies.length){
    arcadeWaveTransition=true;
    if(arcadeWave>=5)endArcadeRun(true);else setTimeout(()=>{if(arcadeRunning&&!arcadeRunOver)showArcadeUpgrade();},500);
  }
}
function showArcadeUpgrade(){arcadeUi.upgrade.classList.add("show");arcadeUi.upgrade.setAttribute("aria-hidden","false");arcadeSfxUpgrade();}
document.querySelectorAll("[data-upgrade]").forEach(btn=>btn.addEventListener("click",()=>{
  const k=btn.dataset.upgrade;if(k==="splash")arcadeMods.splash*=1.2;if(k==="cooldown")arcadeMods.cooldown*=.85;if(k==="damage")arcadeMods.damage*=1.2;
  arcadeUi.upgrade.classList.remove("show");arcadeUi.upgrade.setAttribute("aria-hidden","true");arcadeSfxUpgrade();arcadeWave++;queueArcadeWave(arcadeWave);syncArcadeTrackToWave();showArcadeBanner("WAVE "+arcadeWave+" INBOUND");setTimeout(arcadeSfxWave,120);
}));
function endArcadeRun(success){
  if(arcadeRunOver)return;arcadeRunOver=true;arcadeEnemies=[];arcadeSpawnQueue=[];
  arcadeUi.endTitle.textContent=success?"SECTOR HELD":"BASE OVERRUN";
  arcadeUi.endSummary.textContent="Score "+Math.round(arcadeScore)+" // Kills "+arcadeKills+" // Best chain x"+arcadeBestChain+" // Reached wave "+arcadeWave+"/5";
  arcadeUi.end.classList.add("show");arcadeUi.end.setAttribute("aria-hidden","false");arcadeSfxEnd(success);
  if(success)playArcadeTrack("transmission",{loop:false,volume:.38});
}
arcadeWeaponButtons.forEach(b=>b.addEventListener("click",()=>{arcadeWeapon=b.dataset.arcadeWeapon;arcadeWeaponButtons.forEach(x=>x.classList.toggle("active",x===b));}));

function arcadeChargeTier(hold){
  if(hold<450)return{label:"SNAP",mult:1,radius:1,cool:1,heat:1};
  if(hold<1250)return{label:"HEAVY",mult:1.7,radius:1.5,cool:1.5,heat:1.45};
  return{label:"OVERCHARGE",mult:2.6,radius:2.15,cool:2.3,heat:2.05};
}
function launchArcadeShot(hold,now){
  const def=arcadeWeaponDefs[arcadeWeapon],tier=arcadeChargeTier(hold);
  if(now<arcadeReadyAt||arcadeHeat>.94){showArcadeBanner(arcadeHeat>.94?"WEAPON HOT":"COOLDOWN");return;}
  const start={x:12,z:12,y:58},end={x:arcadeAim.x,z:arcadeAim.z,y:0};
  if(arcadeWeapon==="orbital"){
    let best=null,bestD=11;
    for(const e of arcadeEnemies){if(e.dead)continue;const d=Math.hypot(e.x-end.x,e.z-end.z);if(d<bestD){best=e;bestD=d;}}
    if(best){end.x=lerp(end.x,best.x,.38);end.z=lerp(end.z,best.z,.38);}
  }
  const control={x:(start.x+end.x)/2,z:(start.z+end.z)/2,y:78+(tier.label==="OVERCHARGE"?12:0)};
  arcadeShots.push({weapon:arcadeWeapon,tier,start,end,control,startTime:now,duration:def.travel,chainAtFire:arcadeChain});
  arcadeReadyAt=now+def.cooldown*tier.cool*arcadeMods.cooldown;arcadeHeat=clamp(arcadeHeat+def.heat*tier.heat,0,1);
  arcadeSfxLaunch(tier.label,arcadeWeapon);showArcadeBanner(tier.label+" STRIKE");
}
function arcadeQuad(a,b,c,t){const u=1-t;return{x:u*u*a.x+2*u*t*b.x+t*t*c.x,z:u*u*a.z+2*u*t*b.z+t*t*c.z,y:u*u*a.y+2*u*t*b.y+t*t*c.y};}
function updateArcadeShots(now){
  for(const s of arcadeShots){
    if(s.done)continue;const t=(now-s.startTime)/s.duration;if(t>=1){s.done=true;resolveArcadeImpact(s,now);}
  }
  arcadeShots=arcadeShots.filter(s=>!s.done||now-s.startTime<s.duration+120);
}
function resolveArcadeImpact(s,now){
  const def=arcadeWeaponDefs[s.weapon],radius=def.radius*s.tier.radius*arcadeMods.splash;
  const chainBonus=1+Math.min(arcadeChain,8)*.05;
  const damage=def.damage*s.tier.mult*arcadeMods.damage*chainBonus;
  let hit=0;
  const applyBlast=(cx,cz,r,dam,cluster=false)=>{
    for(const e of arcadeEnemies){
      if(e.dead)continue;const d=Math.hypot(e.x-cx,e.z-cz);
      if(d<=r){
        const fall=1-clamp(d/r,0,.78),armorBonus=def.role==="penetrator"&&e.type==="armor"?1.75:1;
        e.hp-=dam*fall*armorBonus;
        if(e.hp<=0){e.dead=true;arcadeScore+=e.score;arcadeKills++;hit++;}else hit++;
      }
    }
    if(cluster)arcadeFx.push({x:cx,z:cz,start:now,duration:520,color:def.color,label:"",radius:r});
  };
  if(def.role==="cluster"){
    const pellets=s.tier.label==="OVERCHARGE"?8:s.tier.label==="HEAVY"?6:5;
    for(let i=0;i<pellets;i++){const a=i/pellets*Math.PI*2,spread=radius*(.35+.35*(i%2));applyBlast(s.end.x+Math.cos(a)*spread,s.end.z+Math.sin(a)*spread,radius*.62,damage*.72,true);}
  }else applyBlast(s.end.x,s.end.z,radius,damage,false);
  if(s.tier.label==="OVERCHARGE"){
    for(const st of arcadeStructures){if(st.hp<=0)continue;const d=Math.hypot(st.x-s.end.x,st.z-s.end.z);if(d<=radius*.72)st.hp=Math.max(0,st.hp-damage*(def.role==="penetrator"?.6:.3));}
  }
  if(hit>0){arcadeChain++;arcadeBestChain=Math.max(arcadeBestChain,arcadeChain);}else arcadeChain=Math.max(0,arcadeChain-2);
  arcadeFx.push({x:s.end.x,z:s.end.z,start:now,duration:850,color:def.color,label:hit?("HIT x"+hit+" // CHAIN x"+arcadeChain):"MISS // CHAIN -",radius});
  arcadeSfxImpact(s.tier.label,hit>0,s.weapon);
}
function drawArcadeBoard(){
  arcadeCtx.fillStyle="#020706";arcadeCtx.fillRect(0,0,arcadeW,arcadeH);
  const q=[arcadeProject(8,0),arcadeProject(92,0),arcadeProject(92,100),arcadeProject(8,100)];arcadePoly(q,"#315f40","#07110b",1.4);
  for(let i=10;i<=90;i+=10)arcadeLine(arcadeProject(i,0),arcadeProject(i,100),"rgba(77,151,96,.13)",1);
  for(let z=0;z<=100;z+=10)arcadeLine(arcadeProject(8,z),arcadeProject(92,z),"rgba(77,151,96,.13)",1);
  for(const x of arcadeLanes){
    arcadeLine(arcadeProject(x,2,.02),arcadeProject(x,94,.02),"rgba(240,170,67,.18)",Math.max(8,arcadeW/85));
    arcadeLine(arcadeProject(x,2,.03),arcadeProject(x,94,.03),"rgba(255,205,100,.14)",1,[7,7]);
  }
  const b=arcadeProject(50,94,2);arcadeCtx.fillStyle="#143421";arcadeCtx.strokeStyle="#6ad8e8";arcadeCtx.lineWidth=2;arcadeCtx.fillRect(b.x-52,b.y-14,104,28);arcadeCtx.strokeRect(b.x-52,b.y-14,104,28);
  arcadeCtx.fillStyle="#9be7ee";arcadeCtx.font="900 11px monospace";arcadeCtx.textAlign="center";arcadeCtx.fillText("DEFENSE BASE",b.x,b.y+4);
}
function drawArcadeStructures(){
  for(const s of arcadeStructures){
    if(s.hp<=0)continue;const x0=s.x-s.w/2,x1=s.x+s.w/2,z0=s.z-s.d/2,z1=s.z+s.d/2;
    const b=[arcadeProject(x0,z0),arcadeProject(x1,z0),arcadeProject(x1,z1),arcadeProject(x0,z1)];
    const t=[arcadeProject(x0,z0,s.h),arcadeProject(x1,z0,s.h),arcadeProject(x1,z1,s.h),arcadeProject(x0,z1,s.h)];
    arcadePoly([b[3],b[2],t[2],t[3]],"#47654e","#12231a",1);arcadePoly([b[1],b[2],t[2],t[1]],"#47654e","#172a1f",1);arcadePoly(t,s.hp<s.maxHp?"#bd8537":"#89b596",s.hp<s.maxHp?"#3b311b":"#243a2b",1.3);
    const p=arcadeProject(s.x,s.z,s.h+2);arcadeCtx.fillStyle="#c9ffd7";arcadeCtx.font="8px monospace";arcadeCtx.fillText(Math.ceil(s.hp)+"/"+s.maxHp,p.x,p.y);
  }
}
function drawArcadeEnemies(){
  for(const e of arcadeEnemies){
    const p=arcadeProject(e.x,e.z,e.y+1.5),hot=e.color;
    arcadeCtx.save();arcadeCtx.shadowColor=hot;arcadeCtx.shadowBlur=14;arcadeCtx.fillStyle=hot;arcadeCtx.globalAlpha=.22;arcadeCtx.beginPath();arcadeCtx.ellipse(p.x,p.y,e.size+7,e.size*.7+4,0,0,Math.PI*2);arcadeCtx.fill();arcadeCtx.globalAlpha=1;arcadeCtx.shadowBlur=0;
    arcadeCtx.strokeStyle=hot;arcadeCtx.lineWidth=2;arcadeCtx.fillStyle="#160807";arcadeCtx.beginPath();arcadeCtx.rect(p.x-e.size,p.y-e.size*.55,e.size*2,e.size*1.1);arcadeCtx.fill();arcadeCtx.stroke();
    const hpw=22;arcadeCtx.fillStyle="#2a0b09";arcadeCtx.fillRect(p.x-hpw/2,p.y-13,hpw,3);arcadeCtx.fillStyle=hot;arcadeCtx.fillRect(p.x-hpw/2,p.y-13,hpw*clamp(e.hp/e.maxHp,0,1),3);
    arcadeCtx.restore();
  }
}
function drawArcadeThreatGuides(){
  const margin=34,baseZ=94;
  for(const e of arcadeEnemies){
    if(e.dead)continue;
    const p=arcadeProject(e.x,e.z,e.y+1.5),toward=arcadeProject(e.x,Math.min(baseZ,e.z+9),e.y+1);
    const visible=p.x>margin&&p.x<arcadeW-margin&&p.y>margin&&p.y<arcadeH-margin;
    if(visible){
      arcadeCtx.save();arcadeCtx.globalAlpha=.42;arcadeCtx.strokeStyle=e.color;arcadeCtx.lineWidth=1.5;arcadeCtx.setLineDash([4,5]);
      arcadeCtx.beginPath();arcadeCtx.moveTo(p.x,p.y);arcadeCtx.lineTo(toward.x,toward.y);arcadeCtx.stroke();arcadeCtx.setLineDash([]);arcadeCtx.restore();
      continue;
    }
    const cx=arcadeW/2,cy=arcadeH/2,dx=p.x-cx,dy=p.y-cy,scale=Math.min((arcadeW/2-margin)/Math.max(1,Math.abs(dx)),(arcadeH/2-margin)/Math.max(1,Math.abs(dy)));
    const ex=cx+dx*scale,ey=cy+dy*scale,ang=Math.atan2(dy,dx);
    arcadeCtx.save();arcadeCtx.translate(ex,ey);arcadeCtx.rotate(ang);arcadeCtx.fillStyle=e.color;arcadeCtx.globalAlpha=.9;arcadeCtx.beginPath();arcadeCtx.moveTo(10,0);arcadeCtx.lineTo(-7,-6);arcadeCtx.lineTo(-4,0);arcadeCtx.lineTo(-7,6);arcadeCtx.closePath();arcadeCtx.fill();
    arcadeCtx.font="900 8px monospace";arcadeCtx.fillStyle="#ffe6cb";arcadeCtx.textAlign="center";arcadeCtx.rotate(-ang);arcadeCtx.fillText(e.type.toUpperCase(),0,-11);arcadeCtx.restore();
  }
}

function drawArcadeAim(now){
  const p=arcadeProject(arcadeAim.x,arcadeAim.z,.2),hold=arcadePointer?now-arcadeChargeStart:0,tier=arcadeChargeTier(hold),def=arcadeWeaponDefs[arcadeWeapon];
  const charge=clamp(hold/2250,0,1),worldRadius=def.radius*tier.radius*arcadeMods.splash;
  const edge=arcadeProject(arcadeAim.x+worldRadius,arcadeAim.z,.2),blastPx=Math.max(12,Math.abs(edge.x-p.x));
  const r=17+(arcadePointer?Math.min(34,hold/55):0);
  arcadeCtx.save();arcadeCtx.strokeStyle=arcadeWeaponDefs[arcadeWeapon].color;arcadeCtx.lineWidth=2;arcadeCtx.beginPath();arcadeCtx.arc(p.x,p.y,r,0,Math.PI*2);arcadeCtx.stroke();
  arcadeCtx.beginPath();arcadeCtx.moveTo(p.x-r-9,p.y);arcadeCtx.lineTo(p.x-r+4,p.y);arcadeCtx.moveTo(p.x+r-4,p.y);arcadeCtx.lineTo(p.x+r+9,p.y);arcadeCtx.stroke();
  if(arcadePointer){
    arcadeCtx.globalAlpha=.18+.18*charge;arcadeCtx.fillStyle=def.color;arcadeCtx.beginPath();arcadeCtx.ellipse(p.x,p.y,blastPx,blastPx*.55,0,0,Math.PI*2);arcadeCtx.fill();
    arcadeCtx.globalAlpha=.85;arcadeCtx.setLineDash([5,4]);arcadeCtx.beginPath();arcadeCtx.ellipse(p.x,p.y,blastPx,blastPx*.55,0,0,Math.PI*2);arcadeCtx.stroke();arcadeCtx.setLineDash([]);
  }
  arcadeCtx.globalAlpha=1;arcadeCtx.fillStyle=def.color;arcadeCtx.font="900 10px monospace";arcadeCtx.textAlign="center";arcadeCtx.fillText(tier.label,p.x,p.y-r-8);arcadeCtx.restore();
}
function drawArcadeShots(now){
  for(const s of arcadeShots){
    const t=clamp((now-s.startTime)/s.duration,0,1),def=arcadeWeaponDefs[s.weapon],pts=[],startT=Math.max(0,t-.28),intensity=1+Math.min(s.chainAtFire||0,8)*.12;
    for(let k=0;k<10;k++){const tt=startT+(t-startT)*(k/9),w=arcadeQuad(s.start,s.control,s.end,tt);pts.push(arcadeProject(w.x,w.z,w.y));}
    for(let i=1;i<pts.length;i++){arcadeCtx.save();arcadeCtx.globalAlpha=.1+.85*i/pts.length;arcadeCtx.shadowColor=def.color;arcadeCtx.shadowBlur=6*intensity;arcadeLine(pts[i-1],pts[i],def.color,(1+i*.35)*intensity);arcadeCtx.restore();}
    const w=arcadeQuad(s.start,s.control,s.end,t),p=arcadeProject(w.x,w.z,w.y);arcadeCtx.save();arcadeCtx.fillStyle=intensity>1.55?"#ffffff":"#fff5cf";arcadeCtx.shadowColor=def.color;arcadeCtx.shadowBlur=16*intensity;arcadeCtx.beginPath();arcadeCtx.arc(p.x,p.y,(s.tier.label==="OVERCHARGE"?7:4)*Math.min(1.6,intensity),0,Math.PI*2);arcadeCtx.fill();arcadeCtx.restore();
  }
}
function drawArcadeFx(now){
  arcadeFx=arcadeFx.filter(f=>now-f.start<f.duration);
  for(const f of arcadeFx){const t=(now-f.start)/f.duration,p=arcadeProject(f.x,f.z,.3);arcadeCtx.save();arcadeCtx.globalAlpha=1-t;arcadeCtx.strokeStyle=f.color;arcadeCtx.fillStyle=f.color;arcadeCtx.lineWidth=3;arcadeCtx.beginPath();arcadeCtx.ellipse(p.x,p.y,12+t*50,6+t*24,0,0,Math.PI*2);arcadeCtx.stroke();arcadeCtx.globalAlpha=.18*(1-t);arcadeCtx.beginPath();arcadeCtx.arc(p.x,p.y,8+t*30,0,Math.PI*2);arcadeCtx.fill();arcadeCtx.globalAlpha=1-t;arcadeCtx.font="900 13px monospace";arcadeCtx.textAlign="center";arcadeCtx.fillText(f.label,p.x,p.y-30-t*12);arcadeCtx.restore();}
}
function updateArcadeHud(now){
  const def=arcadeWeaponDefs[arcadeWeapon],remain=Math.max(0,arcadeReadyAt-now),hold=arcadePointer?now-arcadeChargeStart:0,tier=arcadeChargeTier(hold),charge=clamp(hold/2250,0,1);
  arcadeUi.wave.textContent=arcadeWave;arcadeUi.baseHp.textContent=Math.round(arcadeBase);arcadeUi.score.textContent=Math.round(arcadeScore);
  arcadeUi.cooldownFill.style.width=(remain?100*(1-remain/(def.cooldown*2.2*arcadeMods.cooldown)):100)+"%";arcadeUi.cooldownText.textContent=remain?(remain/1000).toFixed(1)+"s":"READY";
  arcadeUi.heatFill.style.width=Math.round(arcadeHeat*100)+"%";arcadeUi.heatText.textContent=Math.round(arcadeHeat*100)+"%";
  arcadeUi.chargeFill.style.width=Math.round(charge*100)+"%";arcadeUi.chargeText.textContent=tier.label;
  const chainBonusPct=Math.min(arcadeChain,8)*5,chainTier=arcadeChain>=7?3:arcadeChain>=4?2:arcadeChain>=1?1:0;
  arcadeUi.chainChip.dataset.tier=String(chainTier);arcadeUi.chainCount.textContent="x"+arcadeChain;arcadeUi.chainBonus.textContent="+"+chainBonusPct+"% DMG";
  arcadeUi.chargeReadout.textContent=arcadePointer?(tier.label+" // "+Math.round(arcadeWeaponDefs[arcadeWeapon].radius*tier.radius*arcadeMods.splash)+"m "+(def.role==="penetrator"?"PENETRATION":"SPLASH")+" // RELEASE TO FIRE"):"TAP: SNAP // HOLD: CHARGE";
  const deg=((arcadeOrbit*180/Math.PI)%360+360)%360,dirs=["N","NE","E","SE","S","SW","W","NW"];
  arcadeUi.orbitDegrees.textContent=String(Math.round(deg)).padStart(3,"0")+"°";arcadeUi.orbitHeading.textContent=dirs[Math.round(deg/45)%8];
}
arcadeCanvas.addEventListener("pointerdown",e=>{
  if(!arcadeRunning||arcadeRunOver||arcadeWaveTransition)return;const r=arcadeCanvas.getBoundingClientRect();arcadeAim=arcadeScreenToGround(e.clientX-r.left,e.clientY-r.top);arcadePointer=e.pointerId;arcadeChargeStart=performance.now();try{arcadeCanvas.setPointerCapture(e.pointerId);}catch(_){}
});
arcadeCanvas.addEventListener("pointermove",e=>{if(arcadePointer!==e.pointerId)return;const r=arcadeCanvas.getBoundingClientRect();arcadeAim=arcadeScreenToGround(e.clientX-r.left,e.clientY-r.top);});
arcadeCanvas.addEventListener("pointerup",e=>{if(arcadePointer!==e.pointerId)return;const now=performance.now(),hold=now-arcadeChargeStart;const r=arcadeCanvas.getBoundingClientRect();arcadeAim=arcadeScreenToGround(e.clientX-r.left,e.clientY-r.top);arcadePointer=null;launchArcadeShot(hold,now);});
arcadeCanvas.addEventListener("pointercancel",()=>arcadePointer=null);

function arcadeFrame(now){
  const dt=Math.min(40,now-arcadeLast);arcadeLast=now;
  if(arcadeRunning&&!arcadeApp.classList.contains("modeHidden")){
    arcadeOrbit+=dt*.000045;
    if(Math.abs(arcadeOrbitNudge)>.001){const step=Math.sign(arcadeOrbitNudge)*Math.min(Math.abs(arcadeOrbitNudge),dt*.0032);arcadeOrbit+=step;arcadeOrbitNudge-=step;}
    arcadeHeat=clamp(arcadeHeat-dt*.000065,0,1);
    drawArcadeBoard();drawArcadeStructures();updateArcadeEnemies(dt,now);updateArcadeShots(now);drawArcadeEnemies();drawArcadeThreatGuides();drawArcadeAim(now);drawArcadeShots(now);drawArcadeFx(now);updateArcadeHud(now);
  }
  requestAnimationFrame(arcadeFrame);
}
requestAnimationFrame(arcadeFrame);
