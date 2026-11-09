import * as THREE from 'three';

const $=id=>document.getElementById(id);
const canvas=$('world');
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(68,1,.08,150);
let renderer;
try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=false;
}catch(error){
  $('engineError').hidden=false;
  console.error('After Hours could not start WebGL.',error);
}
const clock=new THREE.Clock();
const store=new THREE.Group();scene.add(store);
const lootGroup=new THREE.Group();scene.add(lootGroup);
const buildGroup=new THREE.Group();scene.add(buildGroup);
const staffGroup=new THREE.Group();scene.add(staffGroup);
const materialCache=new Map();
const state={
  player:new THREE.Vector3(0,0,31),yaw:0,pitch:-.04,keys:new Set(),touch:new Set(),
  health:100,hunger:100,stamina:100,inventory:{food:1,med:0,furniture:0},
  day:1,cycleElapsed:0,night:false,paused:false,over:false,jumpY:0,jumpVelocity:0,
  loot:[],staff:[],blocks:[],built:[],lastUi:0,nextSave:0,lastDamage:0,
  selectedBuild:'pallet',rotation:0,buildMode:false,preview:null,
  disposed:false,toastTimer:0,bannerTimer:0,lastNoise:0,
};
const dims={width:88,depth:88,half:44,day:360000,night:180000};
const buildSpecs={
  pallet:{label:'Pallet barricade',cost:1,size:[3.4,1.6,.38],color:0x9a7954,block:[1.7,.35]},
  shelf:{label:'Shelf wall',cost:2,size:[2.6,2.7,.9],color:0x788b78,block:[1.3,.55]},
  table:{label:'Work table',cost:1,size:[2.8,1.1,1.5],color:0xb49565,block:[1.4,.85]},
};
const colors={
  floor:0x62675c,wall:0x77786b,metal:0x444c46,wood:0x947855,woodDark:0x514839,
  ceiling:0x303833,fixture:0xe9ddb7,leaf:0xbdd47a,amber:0xe9a15c,coral:0xdc7565,
};
const sharedMaterials=new Set();
function material(color,options={}){
  const key=`${color}:${options.roughness??.8}:${options.emissive??0}:${options.emissiveIntensity??0}:${options.metalness??0}`;
  if(materialCache.has(key))return materialCache.get(key);
  const value=new THREE.MeshStandardMaterial({color,roughness:options.roughness??.8,metalness:options.metalness??0,emissive:options.emissive??0,emissiveIntensity:options.emissiveIntensity??0});
  materialCache.set(key,value);sharedMaterials.add(value);return value;
}
const basicLight=new THREE.MeshBasicMaterial({color:colors.fixture});sharedMaterials.add(basicLight);
function box(parent,width,height,depth,mat,x,y,z){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),mat);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function signTexture(title,subtitle='STORE 01'){
  const surface=document.createElement('canvas');surface.width=512;surface.height=128;
  const context=surface.getContext('2d');
  context.fillStyle='#19221d';context.fillRect(0,0,512,128);
  context.fillStyle='#c2d77c';context.font='800 16px monospace';context.fillText(subtitle,22,32);
  context.fillStyle='#f0e9d8';context.font='600 42px Georgia';context.fillText(title,22,88);
  const texture=new THREE.CanvasTexture(surface);texture.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
  return mat;
}
function addSign(parent,title,x,y,z,rotation=0){
  const sign=box(parent,5,.9,.13,signTexture(title),x,y,z);sign.rotation.y=rotation;return sign;
}
function addShelf(x,z,length,aisleIndex){
  const group=new THREE.Group();
  const rack=material(0x687a6d,{roughness:.7,metalness:.18}),dark=material(0x39463f,{roughness:.86});
  box(group,1.7,2.8,.22,rack,0,1.4,0);
  for(const height of [.25,.92,1.62,2.32,2.78])box(group,2.05,.1,.75,dark,0,height,0);
  for(const side of [-.78,.78])box(group,.12,2.9,.92,rack,side,1.42,0);
  const productColors=[0xc78350,0x739c80,0xd1ad68,0x71899a,0xb85f48];
  const spacing=length/6;
  for(let section=0;section<5;section++){
    const productMat=material(productColors[(section+aisleIndex)%productColors.length],{roughness:.72});
    const zAt=-length/2+spacing*(section+1);
    for(let level=0;level<3;level++){
      const xOffset=(section%2?-.23:.23);
      box(group,.48,.42,.42,productMat,xOffset,.52+level*.7,zAt);
      box(group,.38,.35,.36,productMat,-xOffset,.52+level*.7,zAt+.48);
    }
  }
  group.position.set(x,0,z);store.add(group);
  state.blocks.push({x,z,halfX:1.13,halfZ:length/2+.38});
}
function buildStore(){
  scene.background=new THREE.Color(0x505c52);scene.fog=new THREE.Fog(0x505c52,45,105);
  box(store,dims.width,.3,dims.depth,material(colors.floor,{roughness:.95}),0,-.2,0);
  const ceiling=box(store,dims.width,.24,dims.depth,material(colors.ceiling),0,8.7,0);
  for(const z of [-32,-16,0,16,32])box(store,dims.width,.18,.32,material(0x232b27),0,8.45,z);
  for(const x of [-32,-16,0,16,32]){
    box(store,.28,.18,dims.depth,material(0x232b27),x,8.45,0);
    for(const z of [-30,-10,10,30])box(store,5,.09,.55,basicLight,x,8.28,z);
  }
  box(store,.8,8, dims.depth,material(colors.wall),-44.2,4,0);
  box(store,.8,8, dims.depth,material(colors.wall),44.2,4,0);
  box(store,dims.width,8,.8,material(colors.wall),0,4,-44.2);
  box(store,32,8,.8,material(colors.wall),-28,4,44.2);
  box(store,32,8,.8,material(colors.wall),28,4,44.2);
  const aisleXs=[-31,-21,-11,11,21,31];
  aisleXs.forEach((x,index)=>{
    addShelf(x,-16,22,index);
    addShelf(x,13,22,index+1);
    addSign(['HOME','PANTRY','GARDEN','LIGHTING','HARDWARE','SEASONAL'][index],x,4.1,-31,.0);
  });
  const counter=material(0x9a7954,{roughness:.88});
  box(store,7,1.3,1.6,counter,0,.65,-36);
  box(store,7.2,.12,1.75,material(0x3f4942),0,1.36,-36);
  addSign('SERVICE DESK',0,2.55,-36,0);
  for(const x of [-7,7]){
    box(store,.12,4,.12,material(0x514d40),x,2,-40);
    box(store,6,.1,.12,material(0x514d40),0,3.8,-40);
  }
  addSign('STAFF ONLY',0,3.3,-40,0);
  const entrance=material(0x444d46,{metalness:.32});
  for(const x of [-5.7,5.7])box(store,.22,4,.5,entrance,x,2,43.25);
  for(const x of [-28,-14,0,14,28]){
    const lamp=new THREE.PointLight(0xffe6be,1.15,26,1.7);lamp.position.set(x,7.8,2);store.add(lamp);
  }
  const keyLight=new THREE.DirectionalLight(0xffdcae,1.1);keyLight.position.set(-15,28,12);scene.add(keyLight);
  const ambient=new THREE.HemisphereLight(0xe4e9d8,0x303c35,1.45);scene.add(ambient);
  state.keyLight=keyLight;state.ambient=ambient;
  state.blocks.push({x:0,z:-36,halfX:3.8,halfZ:1.2},{x:0,z:-40,halfX:7,halfZ:.4});
  ceiling.visible=true;
}
function makeLootMesh(type){
  const group=new THREE.Group();
  const colorsByType={food:0xd19a4f,med:0xe9e5d8,furniture:0x9d7954};
  const body=material(colorsByType[type],{roughness:.45});
  box(group,.72,.56,.58,body,0,.34,0);
  if(type==='med'){
    const red=material(0xb64943,{roughness:.4});
    box(group,.15,.4,.06,red,0,.35,-.3);box(group,.42,.14,.06,red,0,.35,-.3);
  }else{
    box(group,.5,.08,.61,material(0xf1e8d5),0,.38,-.02);
  }
  const glow=new THREE.PointLight(type==='med'?0xb3d6c6:type==='food'?0xe9a15c:0xc2d77c,.25,3,2);
  glow.position.y=.6;group.add(glow);
  return group;
}
function canStand(x,z,radius=.42){
  if(Math.abs(x)>dims.half-1.2||Math.abs(z)>dims.half-1.2)return false;
  for(const block of state.blocks){
    if(Math.abs(x-block.x)<block.halfX+radius&&Math.abs(z-block.z)<block.halfZ+radius)return false;
  }
  for(const structure of state.built){
    if(Math.abs(x-structure.x)<structure.halfX+radius&&Math.abs(z-structure.z)<structure.halfZ+radius)return false;
  }
  return true;
}
function seedLoot(){
  let randomSeed=721;
  const random=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
  const kinds=['food','food','food','med','furniture','furniture'];
  for(let index=0;index<30;index++){
    let x=0,z=0;
    for(let attempt=0;attempt<80;attempt++){
      x=-37+random()*74;z=-31+random()*63;
      if(canStand(x,z,1.1)&&Math.hypot(x,z-31)>6)break;
    }
    const type=kinds[Math.floor(random()*kinds.length)],mesh=makeLootMesh(type);
    mesh.position.set(x,.04,z);lootGroup.add(mesh);
    state.loot.push({id:`stock-${index}`,type,x,z,mesh,taken:false,phase:random()*Math.PI*2});
  }
}
function makeStaff(index,x,z){
  const group=new THREE.Group();
  const shirt=material(index%2?0x687f76:0x8c644d,{roughness:.8});
  const skin=material(0xc29d7c,{roughness:.9});
  const dark=material(0x29332d,{roughness:.9});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.7,4,8),shirt);body.position.y=1.18;group.add(body);
  const legs=new THREE.Mesh(new THREE.CapsuleGeometry(.15,.55,3,7),dark);legs.position.set(0,.42,0);group.add(legs);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.24,12,10),skin);head.position.y=1.82;group.add(head);
  const cap=box(group,.5,.12,.48,material(0x332a23),0,2.06,0);
  const eye=material(0xd25f4f,{emissive:0xd25f4f,emissiveIntensity:.3});
  for(const side of [-1,1]){const dot=new THREE.Mesh(new THREE.SphereGeometry(.035,6,5),eye);dot.position.set(side*.08,1.84,-.205);group.add(dot);}
  group.position.set(x,0,z);staffGroup.add(group);
  const staff={id:index,group,x,z,speed:2.1,nextAttack:0,roamAt:0,targetX:x,targetZ:z,lastSeenX:x,lastSeenZ:z,mode:'idle'};
  state.staff.push(staff);return staff;
}
function createThreats(){
  [[-36,-28],[35,-22],[-34,22],[34,30]].forEach(([x,z],index)=>makeStaff(index,x,z));
}
function makeBuild(type,x,z,rotation=0,locked=true){
  const spec=buildSpecs[type],group=new THREE.Group();
  const core=material(locked?spec.color:0xb4a06a,{roughness:.86});
  const trim=material(0x4c4940,{roughness:.9});
  if(type==='pallet'){
    for(let level=0;level<5;level++)box(group,spec.size[0],.22,.13,core,0,.18+level*.27,0);
    for(const xx of [-1.45,0,1.45])box(group,.24,1.5,.4,trim,xx,.76,0);
  }else if(type==='shelf'){
    for(const xx of [-1,1])box(group,.12,spec.size[1],.12,trim,xx,spec.size[1]/2,0);
    for(const yy of [.22,.92,1.62,2.42])box(group,spec.size[0],.1,spec.size[2],core,0,yy,0);
  }else{
    box(group,spec.size[0],.13,spec.size[2],core,0,.84,0);
    for(const xx of [-1.1,1.1])for(const zz of [-.55,.55])box(group,.13,.82,.13,trim,xx,.42,zz);
  }
  group.position.set(x,0,z);group.rotation.y=rotation;buildGroup.add(group);
  const rotated=Math.abs(Math.sin(rotation))>.5;
  const structure={type,group,x,z,rotation,locked,halfX:rotated?spec.size[2]/2:spec.block[0],halfZ:rotated?spec.block[0]:spec.block[1]};
  state.built.push(structure);return structure;
}
function makePreview(){
  if(state.preview){buildGroup.remove(state.preview);state.preview.geometry?.dispose();state.preview.material?.dispose();}
  const spec=buildSpecs[state.selectedBuild],geo=new THREE.BoxGeometry(...spec.size);
  const mat=new THREE.MeshBasicMaterial({color:0xbedd76,transparent:true,opacity:.36,depthWrite:false});
  state.preview=new THREE.Mesh(geo,mat);buildGroup.add(state.preview);
}
function disposeTree(group){
  group.traverse(object=>{
    if(object.geometry)object.geometry.dispose();
    if(object.material){const items=Array.isArray(object.material)?object.material:[object.material];for(const item of items)if(!sharedMaterials.has(item)){item.map?.dispose();item.dispose();}}
  });
  group.parent?.remove(group);
}
function toast(text){
  const element=$('toast');element.textContent=text;element.hidden=false;
  clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>{element.hidden=true;},2400);
}
function showAnnouncement(title,copy,night=false){
  $('bannerTitle').textContent=title;$('bannerText').textContent=copy;
  $('phaseBanner').classList.toggle('night',night);$('phaseBanner').hidden=false;
  clearTimeout(state.bannerTimer);state.bannerTimer=setTimeout(()=>{$('phaseBanner').hidden=true;},6500);
}
function updateLighting(){
  const darkness=state.night;
  const sky=new THREE.Color(darkness?0x202c32:0x7d8c7c);
  scene.background.copy(sky);scene.fog.color.copy(sky);
  state.keyLight.intensity=darkness?.18:1.1;
  state.ambient.intensity=darkness?.48:1.45;
  for(const child of store.children)if(child.isPointLight)child.intensity=darkness?1.5:1.15;
}
function nearestLoot(){
  let closest=null,best=3.1;
  for(const item of state.loot){
    if(item.taken)continue;
    const distance=Math.hypot(state.player.x-item.x,state.player.z-item.z);
    if(distance<best){best=distance;closest=item;}
  }
  return closest;
}
function collectLoot(item){
  item.taken=true;lootGroup.remove(item.mesh);disposeTree(item.mesh);
  if(item.type==='food'){state.inventory.food++;toast('Ration secured.');}
  else if(item.type==='med'){state.inventory.med++;toast('First-aid kit secured.');}
  else{state.inventory.furniture++;toast('Salvage secured. Build materials +1.');}
  updateHud();saveGame();
}
function interact(){
  const item=nearestLoot();
  if(!item){toast('Nothing within reach.');return;}
  collectLoot(item);
}
function eatFood(){
  if(!state.inventory.food){toast('No rations left.');return;}
  if(state.hunger>94){toast('You are not hungry yet.');return;}
  state.inventory.food--;state.hunger=Math.min(100,state.hunger+42);state.health=Math.min(100,state.health+5);
  updateHud();toast('Meal eaten. Hunger restored.');saveGame();
}
function useMed(){
  if(!state.inventory.med){toast('No first-aid kit in your pack.');return;}
  if(state.health>92){toast('You are in good condition.');return;}
  state.inventory.med--;state.health=Math.min(100,state.health+45);state.lastDamage=performance.now();
  updateHud();toast('First aid applied.');saveGame();
}
function updateBuildPreview(){
  if(!state.buildMode||!state.preview)return;
  const ahead=6,forwardX=-Math.sin(state.yaw),forwardZ=-Math.cos(state.yaw);
  const x=Math.round((state.player.x+forwardX*ahead)/2)*2,z=Math.round((state.player.z+forwardZ*ahead)/2)*2;
  const spec=buildSpecs[state.selectedBuild],rotated=Math.abs(Math.sin(state.rotation))>.5;
  const halfX=rotated?spec.size[2]/2:spec.block[0],halfZ=rotated?spec.block[0]:spec.block[1];
  const valid=state.inventory.furniture>=spec.cost&&canStand(x,z,0)&&!state.built.some(item=>Math.abs(x-item.x)<halfX+item.halfX&&Math.abs(z-item.z)<halfZ+item.halfZ)&&Math.hypot(x-state.player.x,z-state.player.z)>2.2;
  state.preview.position.set(x,spec.size[1]/2,z);state.preview.rotation.y=state.rotation;
  state.preview.material.color.setHex(valid?0xbedd76:0xdc7565);state.preview.visible=valid;
  state.preview.userData={valid,x,z};
}
function placeBuild(){
  const preview=state.preview;
  if(!state.buildMode||!preview?.userData.valid)return;
  const spec=buildSpecs[state.selectedBuild];
  if(state.inventory.furniture<spec.cost){toast(`Need ${spec.cost} salvage for ${spec.label.toLowerCase()}.`);return;}
  state.inventory.furniture-=spec.cost;
  makeBuild(state.selectedBuild,preview.userData.x,preview.userData.z,state.rotation,true);
  toast(`${spec.label} placed and secured.`);updateHud();saveGame();
}
function selectBuild(type){
  if(!buildSpecs[type])return;
  state.selectedBuild=type;
  document.querySelectorAll('[data-build]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.build===type)));
  $('buildState').textContent=state.buildMode?`PLACING ${buildSpecs[type].label.toUpperCase()}`:`${state.inventory.furniture} SALVAGE AVAILABLE`;
  updateBuildPreview();
}
function toggleBuildMode(){
  state.buildMode=!state.buildMode;
  $('buildModeButton').setAttribute('aria-pressed',String(state.buildMode));
  $('buildState').textContent=state.buildMode?`PLACING ${buildSpecs[state.selectedBuild].label.toUpperCase()}`:`${state.inventory.furniture} SALVAGE AVAILABLE`;
  if(state.buildMode&&!state.preview)makePreview();
  if(state.preview)state.preview.visible=state.buildMode;
  canvas.classList.toggle('building',state.buildMode);
  if(state.buildMode&&document.pointerLockElement===canvas)document.exitPointerLock();
}
function lockNearby(){
  const nearby=state.built.map(item=>({...item,distance:Math.hypot(item.x-state.player.x,item.z-state.player.z)})).filter(item=>item.distance<5).sort((a,b)=>a.distance-b.distance)[0];
  if(!nearby){toast('No structure close enough to secure.');return;}
  const structure=state.built.find(item=>item.group===nearby.group);
  structure.locked=!structure.locked;
  structure.group.traverse(object=>{if(object.material?.color)object.material.color.setHex(structure.locked?buildSpecs[structure.type].color:0xb4a06a);});
  toast(`${buildSpecs[structure.type].label} ${structure.locked?'secured':'unlocked'}.`);saveGame();
}
function updateSurvival(delta){
  const moving=state.keys.size>0||state.touch.size>0;
  const sprint=(state.keys.has('ShiftLeft')||state.keys.has('ShiftRight'))&&state.stamina>2;
  state.hunger=Math.max(0,state.hunger-delta*(moving?.022:.011));
  if(sprint&&moving)state.stamina=Math.max(0,state.stamina-delta*24);else state.stamina=Math.min(100,state.stamina+delta*16);
  if(state.hunger===0)state.health=Math.max(0,state.health-delta*2.4);
  else if(state.hunger>68&&!state.night&&performance.now()-state.lastDamage>4500)state.health=Math.min(100,state.health+delta*.22);
  return sprint?6.5:state.hunger<18?2.45:4.1;
}
function movePlayer(delta){
  const forward=(state.keys.has('KeyW')||state.keys.has('ArrowUp')||state.touch.has('forward')?1:0)-(state.keys.has('KeyS')||state.keys.has('ArrowDown')||state.touch.has('back')?1:0);
  const side=(state.keys.has('KeyD')||state.keys.has('ArrowRight')||state.touch.has('right')?1:0)-(state.keys.has('KeyA')||state.keys.has('ArrowLeft')||state.touch.has('left')?1:0);
  const length=Math.hypot(forward,side)||1,speed=updateSurvival(delta);
  const sprinting=(state.keys.has('ShiftLeft')||state.keys.has('ShiftRight'))&&state.stamina>2;
  const scale=sprinting?1:.72;
  const moveX=(Math.sin(state.yaw)*forward+Math.cos(state.yaw)*side)/length*speed*scale*delta;
  const moveZ=(-Math.cos(state.yaw)*forward+Math.sin(state.yaw)*side)/length*speed*scale*delta;
  const nextX=state.player.x+moveX,nextZ=state.player.z+moveZ;
  if(canStand(nextX,state.player.z))state.player.x=nextX;
  if(canStand(state.player.x,nextZ))state.player.z=nextZ;
  state.jumpVelocity-=19*delta;state.jumpY+=state.jumpVelocity*delta;
  if(state.jumpY<0){state.jumpY=0;state.jumpVelocity=0;}
}
function moveStaff(staff,dx,dz,delta){
  const distance=Math.hypot(dx,dz)||1,step=staff.speed*delta;
  const nextX=staff.x+dx/distance*step,nextZ=staff.z+dz/distance*step;
  if(canStand(nextX,staff.z,.55))staff.x=nextX;
  else if(canStand(staff.x-dz/distance*step,staff.z,.55))staff.x-=dz/distance*step;
  if(canStand(staff.x,nextZ,.55))staff.z=nextZ;
  else if(canStand(staff.x,staff.z+dx/distance*step,.55))staff.z+=dx/distance*step;
  staff.group.position.set(staff.x,0,staff.z);staff.group.rotation.y=Math.atan2(dx,dz);
}
function updateStaff(delta,now){
  for(const staff of state.staff){
    const dx=state.player.x-staff.x,dz=state.player.z-staff.z,distance=Math.hypot(dx,dz);
    if(state.night){
      staff.mode=distance<1.65?'attack':'hunt';staff.speed=state.day%4===0?3.5:2.85;
      if(distance>1.45)moveStaff(staff,dx,dz,delta);
      if(distance<1.8&&now>staff.nextAttack){
        staff.nextAttack=now+1450;state.health=Math.max(0,state.health-(state.day%4===0?18:12));
        state.lastDamage=now;state.lastNoise=now;toast('Staff found you. Break line of sight or get moving.');
      }
    }else{
      staff.mode='patrol';staff.speed=1.05;
      if(now>staff.roamAt){staff.targetX=staff.x+(Math.random()-.5)*12;staff.targetZ=staff.z+(Math.random()-.5)*12;staff.roamAt=now+3500+Math.random()*3500;}
      if(Math.hypot(staff.targetX-staff.x,staff.targetZ-staff.z)>.7)moveStaff(staff,staff.targetX-staff.x,staff.targetZ-staff.z,delta*.7);
    }
  }
}
function showGameOver(){
  state.over=true;state.paused=true;
  $('pauseScreen').querySelector('.section-label').textContent='SHIFT COMPLETE / PERSONNEL LOST';
  $('pauseScreen').querySelector('h1').textContent='The store got you.';
  $('pauseScreen').querySelector('p').textContent='Your supplies and shift record are saved on this device.';
  $('resumeButton').textContent='Start over';$('pauseScreen').hidden=false;
}
function updateCycle(delta){
  state.cycleElapsed+=delta*1000;
  const full=dims.day+dims.night;
  while(state.cycleElapsed>=full){state.cycleElapsed-=full;state.day++;}
  const night=state.cycleElapsed>=dims.day;
  if(night!==state.night){
    state.night=night;updateLighting();
    showAnnouncement(night?'STORE CLOSED':'DOORS OPEN',night?'Closing alarm. Staff are sweeping the aisles. Secure a room.':'The shift starts again. Stock up and fortify before closing.',night);
  }
  const elapsed=night?state.cycleElapsed-dims.day:state.cycleElapsed;
  const remaining=(night?dims.night:dims.day)-elapsed;
  $('clock').textContent=`${String(Math.floor(remaining/60000)).padStart(2,'0')}:${String(Math.floor(remaining%60000/1000)).padStart(2,'0')}`;
  $('phaseName').textContent=night?'CLOSED':'OPEN HOURS';$('dayStamp').textContent=`SHIFT ${String(state.day).padStart(2,'0')}`;
  $('.shift-readout').classList.toggle('closed',night);
}
function updateHud(){
  for(const [valueId,barId,value]of [['healthValue','healthBar',state.health],['hungerValue','hungerBar',state.hunger],['staminaValue','staminaBar',state.stamina]]){
    $(valueId).textContent=Math.ceil(value);$(barId).style.width=`${Math.max(0,Math.min(100,value))}%`;
  }
  $('foodCount').textContent=state.inventory.food;$('medCount').textContent=state.inventory.med;$('furnitureCount').textContent=state.inventory.furniture;
  $('buildState').textContent=state.buildMode?`PLACING ${buildSpecs[state.selectedBuild].label.toUpperCase()}`:`${state.inventory.furniture} SALVAGE AVAILABLE`;
  $('objectiveText').textContent=state.night?'Stay out of sight until the doors reopen.':state.inventory.furniture<3?'Find supplies and salvage before closing.':'Secure a quiet aisle before closing.';
  $('objectiveMeta').textContent=state.night?'Keep moving. Locked barricades buy time.':'Rations and first aid are limited. Choose what to carry.';
}
function updateInteraction(){
  const item=nearestLoot(),prompt=$('interactionPrompt');
  if(item){
    const type=item.type==='food'?'ration':item.type==='med'?'first-aid kit':'salvage';
    prompt.hidden=false;$('interactionText').textContent=`Scavenge ${type}`;
  }else prompt.hidden=true;
}
function updateMap(){
  const map=$('mapPlayer');
  map.style.left=`${50+state.player.x/(dims.half*2)*76}%`;
  map.style.top=`${50+state.player.z/(dims.half*2)*76}%`;
}
function updateUi(){
  const now=performance.now();
  if(now-state.lastUi<100)return;
  state.lastUi=now;updateHud();updateInteraction();updateMap();
}
function saveGame(){
  try{
    const save={version:2,day:state.day,cycleElapsed:state.cycleElapsed,health:state.health,hunger:state.hunger,stamina:state.stamina,inventory:state.inventory,player:{x:state.player.x,z:state.player.z,yaw:state.yaw},loot:state.loot.filter(item=>item.taken).map(item=>item.id),built:state.built.map(({type,x,z,rotation,locked})=>({type,x,z,rotation,locked}))};
    localStorage.setItem('afterHoursSaveV2',JSON.stringify(save));$('saveStatus').textContent='SAVED LOCALLY';
  }catch(error){$('saveStatus').textContent='SAVE UNAVAILABLE';}
}
function loadGame(){
  try{
    const save=JSON.parse(localStorage.getItem('afterHoursSaveV2')||'null');
    if(!save||save.version!==2)return;
    state.day=Math.max(1,Number(save.day)||1);state.cycleElapsed=Math.max(0,Number(save.cycleElapsed)||0);
    state.health=Math.max(1,Math.min(100,Number(save.health)||100));state.hunger=Math.max(0,Math.min(100,Number(save.hunger)||100));state.stamina=Math.max(0,Math.min(100,Number(save.stamina)||100));
    state.inventory={food:0,med:0,furniture:0,...save.inventory};
    state.player.set(Number(save.player?.x)||0,0,Number(save.player?.z)||31);state.yaw=Number(save.player?.yaw)||0;
    const taken=new Set(Array.isArray(save.loot)?save.loot:[]);
    for(const item of state.loot)if(taken.has(item.id)){item.taken=true;lootGroup.remove(item.mesh);disposeTree(item.mesh);}
    for(const item of Array.isArray(save.built)?save.built:[])if(buildSpecs[item.type]&&Number.isFinite(item.x)&&Number.isFinite(item.z))makeBuild(item.type,item.x,item.z,Number(item.rotation)||0,item.locked!==false);
  }catch(error){console.warn('Could not restore the After Hours shift.',error);}
}
function resetGame(){localStorage.removeItem('afterHoursSaveV2');location.reload();}
function setPaused(paused){
  state.paused=paused;$('pauseScreen').hidden=!paused;
  if(paused){saveGame();if(document.pointerLockElement===canvas)document.exitPointerLock();}
  if(paused&&!state.over){
    $('pauseScreen').querySelector('.section-label').textContent='STORE 01 / SHIFT PAUSED';
    $('pauseScreen').querySelector('h1').textContent='Shift suspended.';
    $('pauseScreen').querySelector('p').textContent='Your position and supplies are saved on this device.';
    $('resumeButton').textContent='Resume shift';
  }
}
function resize(){
  if(!renderer)return;
  const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}
function animate(){
  if(state.disposed||!renderer)return;
  requestAnimationFrame(animate);
  const delta=Math.min(clock.getDelta(),.05),now=performance.now();
  if(!state.paused){
    movePlayer(delta);updateCycle(delta);updateStaff(delta,now);updateBuildPreview();
    if(state.health<=0&&!state.over)showGameOver();
    if(now>state.nextSave){state.nextSave=now+5000;saveGame();}
    updateUi();
  }
  camera.position.set(state.player.x,1.66+state.jumpY,state.player.z);
  camera.rotation.order='YXZ';camera.rotation.y=state.yaw;camera.rotation.x=state.pitch;
  renderer.render(scene,camera);
}
function init(){
  if(!renderer)return;
  buildStore();seedLoot();createThreats();loadGame();updateLighting();resize();updateHud();updateMap();requestAnimationFrame(animate);
}
canvas.addEventListener('pointerdown',event=>{
  if(state.paused)return;
  if(state.buildMode&&event.button===0){placeBuild();return;}
  if(document.pointerLockElement!==canvas)canvas.requestPointerLock?.();
});
document.addEventListener('pointerlockchange',()=>canvas.classList.toggle('locked',document.pointerLockElement===canvas));
document.addEventListener('mousemove',event=>{
  if(document.pointerLockElement!==canvas||state.paused)return;
  state.yaw-=event.movementX*.0023;state.pitch=Math.max(-1.3,Math.min(1.2,state.pitch-event.movementY*.0018));
});
window.addEventListener('keydown',event=>{
  if(event.code==='Escape'){setPaused(!state.paused);return;}
  if(state.paused||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  state.keys.add(event.code);
  if(event.repeat)return;
  if(event.code==='KeyE')interact();
  if(event.code==='KeyB')toggleBuildMode();
  if(event.code==='KeyQ'){state.rotation+=Math.PI/2;updateBuildPreview();}
  if(event.code==='KeyL')lockNearby();
  if(event.code==='KeyF')eatFood();
  if(event.code==='KeyM')useMed();
  if(event.code==='Space'&&state.jumpY===0&&state.stamina>12){state.jumpVelocity=7.1;state.stamina-=10;}
  if(event.code==='Digit1')selectBuild('pallet');
  if(event.code==='Digit2')selectBuild('shelf');
  if(event.code==='Digit3')selectBuild('table');
});
window.addEventListener('keyup',event=>state.keys.delete(event.code));
window.addEventListener('blur',()=>{state.keys.clear();state.touch.clear();});
$('pauseButton').addEventListener('click',()=>setPaused(true));
$('resumeButton').addEventListener('click',()=>{if(state.over){resetGame();return;}setPaused(false);});
$('newGameButton').addEventListener('click',resetGame);
$('buildModeButton').addEventListener('click',toggleBuildMode);
$('rotateBuildButton').addEventListener('click',()=>{state.rotation+=Math.PI/2;updateBuildPreview();});
$('lockButton').addEventListener('click',lockNearby);
$('eatButton').addEventListener('click',eatFood);
document.querySelectorAll('[data-build]').forEach(button=>button.addEventListener('click',()=>selectBuild(button.dataset.build)));
document.querySelectorAll('[data-move]').forEach(button=>{
  const direction=button.dataset.move;
  button.addEventListener('pointerdown',event=>{event.preventDefault();state.touch.add(direction);button.setPointerCapture(event.pointerId);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>state.touch.delete(direction));
});
window.addEventListener('resize',resize);
window.addEventListener('pagehide',()=>{state.disposed=true;saveGame();renderer?.dispose();});
init();
