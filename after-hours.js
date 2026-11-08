import * as THREE from 'three';

const $=id=>document.getElementById(id);
const canvas=$('world');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x29382e);
scene.fog=new THREE.Fog(0x29382e,48,180);
const camera=new THREE.PerspectiveCamera(54,1,.08,180);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=false;
const clock=new THREE.Clock();
const ambient=new THREE.HemisphereLight(0xe4e9d8,0x354337,1.5);scene.add(ambient);
const keyLight=new THREE.DirectionalLight(0xffddb0,1.35);keyLight.position.set(-14,28,12);scene.add(keyLight);
const fillLight=new THREE.DirectionalLight(0xb9d7c4,.55);fillLight.position.set(13,15,-18);scene.add(fillLight);
const storeGroup=new THREE.Group();scene.add(storeGroup);
const lootGroup=new THREE.Group();scene.add(lootGroup);
const buildGroup=new THREE.Group();scene.add(buildGroup);
const staffGroup=new THREE.Group();scene.add(staffGroup);
const colors={floor:0x62685a,wall:0x717466,metal:0x65746a,shelf:0x839080,wood:0x947855,woodDark:0x584b3a,cream:0xe9e5d7,green:0x6f916f,orange:0xc98652,red:0xb95d4c,blue:0x6e8d9c};
const chunkSize=48,gridSize=2,dayLength=360000,nightLength=180000;
const buildDefinitions={
  pallet:{label:'Pallet wall',cost:1,width:3.6,height:1.55,depth:.38,color:0x9e7951},
  shelf:{label:'Shelf block',cost:2,width:2.4,height:2.65,depth:.9,color:0x72877a},
  table:{label:'Table',cost:1,width:2.6,height:1.08,depth:1.45,color:0xb39363},
};
const state={
  chunks:new Map(),worldItems:new Map(),collected:new Set(),blockers:[],builds:[],staff:[],
  keys:new Set(),touchKeys:new Set(),player:new THREE.Vector3(0,0,0),yaw:0,pitch:-.08,velocity:new THREE.Vector3(),
  health:100,hunger:100,stamina:100,inventory:{food:0,med:0,furniture:0},selectedBuild:'pallet',buildMode:false,buildRotation:0,preview:null,
  day:1,cycleElapsed:0,night:false,paused:false,jumpY:0,jumpVelocity:0,lastDamageAt:0,nextAutoSave:0,lastUi:0,
  toastTimer:0,bannerTimer:0,lastChunk:'',lookPointer:null,audioContext:null,hum:null,disposed:false,
};
const materials={
  floor:new THREE.MeshStandardMaterial({color:colors.floor,roughness:.92}),
  shelf:new THREE.MeshStandardMaterial({color:colors.shelf,roughness:.75}),
  shelfDark:new THREE.MeshStandardMaterial({color:0x44544b,roughness:.84}),
  wood:new THREE.MeshStandardMaterial({color:colors.wood,roughness:.9}),
  pillar:new THREE.MeshStandardMaterial({color:0xb3b4a2,roughness:.8}),
  light:new THREE.MeshBasicMaterial({color:0xffe6b3}),
};
const sharedMaterials=new Set(Object.values(materials));
function box(parent,width,height,depth,material,x,y,z){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function hashSeed(x,z,index=0){
  let value=(x*374761393+z*668265263+index*2246822519)|0;
  value=(value^(value>>>13))*1274126177;
  return(value^(value>>>16))>>>0;
}
function seeded(seed){let value=seed>>>0;return()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};}
function textureSign(text){
  const sign=document.createElement('canvas');sign.width=512;sign.height=128;
  const context=sign.getContext('2d');context.fillStyle='#28352d';context.fillRect(0,0,512,128);
  context.fillStyle='#d9dfc9';context.font='700 34px system-ui';context.textAlign='center';context.textBaseline='middle';context.fillText(text,256,64);
  const texture=new THREE.CanvasTexture(sign);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
}
function shelfRow(parent,cx,cz,zOffset,blockers){
  const rowZ=cz+zOffset,length=chunkSize-5;
  const shelf=box(parent,length,3.2,1.15,materials.shelf,cx,1.6,rowZ);
  shelf.position.y=1.6;
  for(const height of [.25,1.15,2.1,3.0])box(parent,length+.08,.09,1.36,materials.shelfDark,cx,height,rowZ);
  for(const xOffset of [-length*.45,-length*.15,length*.15,length*.45])box(parent,.14,3.3,1.42,materials.shelfDark,cx+xOffset,1.62,rowZ);
  blockers.push({x:cx,z:rowZ,halfX:length/2,halfZ:.78});
  if(Math.abs(zOffset)===12){
    const sign=box(parent,4,.65,.1,textureSign(zOffset<0?'HOME / SLEEP':'LIVING / LIGHT'),cx,3.8,rowZ+(zOffset<0?-.8:.8));
    sign.rotation.y=zOffset<0?0:Math.PI;
  }
}
function makePillar(parent,x,z){
  box(parent,1.15,7.8,1.15,materials.pillar,x,3.9,z);
  box(parent,1.35,.2,1.35,materials.shelfDark,x,7.82,z);
}
function lootMesh(type){
  const group=new THREE.Group();
  if(type==='food'){
    const packageColor=[0xc78350,0x739c80,0xd1ad68][Math.floor(Math.random()*3)];
    box(group,.62,.62,.52,new THREE.MeshStandardMaterial({color:packageColor,roughness:.45}),0,.36,0);
    box(group,.4,.06,.54,new THREE.MeshStandardMaterial({color:0xf0e3c3,roughness:.35}),0,.34,.01);
  }else if(type==='med'){
    box(group,.58,.42,.46,new THREE.MeshStandardMaterial({color:0xe4e4d7,roughness:.5}),0,.25,0);
    box(group,.12,.27,.03,new THREE.MeshBasicMaterial({color:0xb95d4c}),0,.25,-.24);
    box(group,.32,.1,.03,new THREE.MeshBasicMaterial({color:0xb95d4c}),0,.25,-.24);
  }else{
    box(group,.9,.42,.72,new THREE.MeshStandardMaterial({color:0x96754f,roughness:.88}),0,.25,0);
    for(const z of [-.22,.22])box(group,.94,.06,.08,new THREE.MeshStandardMaterial({color:0xc3a475,roughness:.8}),0,.25,z);
  }
  return group;
}
function addLoot(chunk,cx,cz,index,type,x,z){
  const id=`${cx}:${cz}:${index}`;
  if(state.collected.has(id))return;
  const mesh=lootMesh(type);mesh.position.set(x,.04,z);lootGroup.add(mesh);
  const data={id,type,mesh,x:cx*chunkSize+x,z:cz*chunkSize+z,amount:1};
  mesh.userData.loot=data;state.worldItems.set(id,data);chunk.userData.items.push(id);
}
function makeChunk(cx,cz){
  const key=`${cx},${cz}`;
  if(state.chunks.has(key))return;
  const group=new THREE.Group();group.position.set(cx*chunkSize,0,cz*chunkSize);group.userData={items:[],blockers:[]};
  const blockers=group.userData.blockers;
  box(group,chunkSize,.14,chunkSize,materials.floor,0,-.08,0);
  for(const rowZ of [-12,12])shelfRow(group,0,0,rowZ,blockers);
  for(const cornerX of [-chunkSize/2+1,chunkSize/2-1])for(const cornerZ of [-chunkSize/2+1,chunkSize/2-1])makePillar(group,cornerX,cornerZ);
  for(const beamZ of [-chunkSize/2+2,chunkSize/2-2])box(group,chunkSize,.18,.28,materials.shelfDark,0,7.7,beamZ);
  for(const lightX of [-14,0,14])box(group,7,.08,.42,materials.light,lightX,7.45,0);
  const random=seeded(hashSeed(cx,cz));
  const lootSpots=[[-10+random()*5,-3+random()*6,'food'],[5+random()*5,-3+random()*6,random()<.7?'furniture':'med']];
  lootSpots.forEach(([x,z,type],index)=>addLoot(group,cx,cz,index,type,x,z));
  storeGroup.add(group);state.chunks.set(key,group);
}
function disposeTree(group){
  group.traverse(object=>{
    if(object.geometry)object.geometry.dispose();
    if(object.material){
      const list=Array.isArray(object.material)?object.material:[object.material];
      for(const material of list)if(!sharedMaterials.has(material)){material.map?.dispose();material.dispose();}
    }
  });
}
function ensureChunks(){
  const cx=Math.floor(state.player.x/chunkSize),cz=Math.floor(state.player.z/chunkSize),chunkKey=`${cx},${cz}`;
  if(chunkKey===state.lastChunk)return;state.lastChunk=chunkKey;
  for(const [key,group]of state.chunks){
    const [gx,gz]=key.split(',').map(Number);
    if(Math.abs(gx-cx)>1||Math.abs(gz-cz)>1){
      for(const id of group.userData.items){const item=state.worldItems.get(id);if(item){lootGroup.remove(item.mesh);disposeTree(item.mesh);state.worldItems.delete(id);}}
      storeGroup.remove(group);disposeTree(group);state.chunks.delete(key);
    }
  }
  state.blockers=[];
  for(const group of state.chunks.values())state.blockers.push(...group.userData.blockers.map(blocker=>({x:blocker.x+group.position.x,z:blocker.z+group.position.z,halfX:blocker.halfX,halfZ:blocker.halfZ})));
  for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)makeChunk(x,z);
  state.blockers=[];
  for(const group of state.chunks.values())state.blockers.push(...group.userData.blockers.map(blocker=>({x:blocker.x+group.position.x,z:blocker.z+group.position.z,halfX:blocker.halfX,halfZ:blocker.halfZ})));
  updateMap();
}
function makeStaff(id,x,z){
  const group=new THREE.Group();
  const shirt=new THREE.MeshStandardMaterial({color:0x899c84,roughness:.82});
  const trousers=new THREE.MeshStandardMaterial({color:0x33433b,roughness:.9});
  const skin=new THREE.MeshStandardMaterial({color:0xc29d7c,roughness:.9});
  const vest=new THREE.MeshStandardMaterial({color:0xb85f48,roughness:.8});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.68,4,8),shirt);body.position.y=1.22;group.add(body);
  const waist=new THREE.Mesh(new THREE.CapsuleGeometry(.3,.4,3,7),trousers);waist.position.y=.56;group.add(waist);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.24,12,10),skin);head.position.y=1.93;group.add(head);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.24,.25,.12,12),vest);cap.position.y=2.16;group.add(cap);
  const badge=box(group,.2,.26,.045,new THREE.MeshStandardMaterial({color:0xe5d6a7,metalness:.2}),0,1.42,-.33);
  group.position.set(x,0,z);staffGroup.add(group);
  const staff={id,group,x,z,mode:'idle',speed:2.2,nextAttack:0,roamAt:0,targetX:x,targetZ:z,lastSeenX:x,lastSeenZ:z};state.staff.push(staff);return staff;
}
function makeStructure(type,x,z,rotation=0,locked=true){
  const definition=buildDefinitions[type],group=new THREE.Group();
  const main=new THREE.MeshStandardMaterial({color:definition.color,roughness:.82});
  const dark=new THREE.MeshStandardMaterial({color:0x554b3c,roughness:.9});
  if(type==='pallet'){
    for(let index=0;index<5;index++)box(group,definition.width,.22,.13,main,0,.2+index*.27,0);
    for(const xx of [-1.45,0,1.45])box(group,.24,1.5,.4,dark,xx,.76,0);
  }else if(type==='shelf'){
    for(const xx of [-1,1])box(group,.12,definition.height,.1,dark,xx,definition.height/2,0);
    for(const yy of [.22,.92,1.62,2.42])box(group,definition.width,.1,definition.depth,main,0,yy,0);
    box(group,definition.width,.14,.12,dark,0,definition.height-.08,0);
  }else{
    box(group,definition.width,.12,definition.depth,main,0,.84,0);
    for(const xx of [-1.08,1.08])for(const zz of [-.5,.5])box(group,.12,.82,.12,dark,xx,.42,zz);
  }
  group.position.set(x,0,z);group.rotation.y=rotation;buildGroup.add(group);
  const build={type,group,x,z,rotation,locked};state.builds.push(build);
  if(!locked)toggleStructureMaterial(build,false);
  return build;
}
function toggleStructureMaterial(build,locked){
  build.group.traverse(object=>{if(object.material?.color)object.material.color.setHex(locked?buildDefinitions[build.type].color:0xa8a15f);});
}
function makePreview(){
  if(state.preview){buildGroup.remove(state.preview);disposeTree(state.preview);}
  const definition=buildDefinitions[state.selectedBuild];
  const group=new THREE.Group(),ghost=new THREE.MeshBasicMaterial({color:0xa8d58a,transparent:true,opacity:.38,depthWrite:false});
  const dims=state.selectedBuild==='pallet'?[definition.width,definition.height,definition.depth]:state.selectedBuild==='shelf'?[definition.width,definition.height,definition.depth]:[definition.width,definition.height,definition.depth];
  const body=new THREE.Mesh(new THREE.BoxGeometry(...dims),ghost);body.position.y=definition.height/2;group.add(body);
  group.userData.body=body;state.preview=group;buildGroup.add(group);
}
function intersectsBlock(x,z,halfX,halfZ){
  for(const blocker of state.blockers){if(Math.abs(x-blocker.x)<halfX+blocker.halfX&&Math.abs(z-blocker.z)<halfZ+blocker.halfZ)return true;}
  for(const build of state.builds){
    const definition=buildDefinitions[build.type],rotated=Math.abs(Math.sin(build.rotation))>.5;
    const bx=rotated?definition.depth/2:definition.width/2,bz=rotated?definition.width/2:definition.depth/2;
    if(Math.abs(x-build.x)<halfX+bx&&Math.abs(z-build.z)<halfZ+bz)return true;
  }
  return false;
}
function updatePreview(){
  if(!state.buildMode||!state.preview)return;
  const definition=buildDefinitions[state.selectedBuild];
  const targetX=state.player.x,targetZ=state.player.z-4;
  const x=Math.round(targetX/gridSize)*gridSize,z=Math.round(targetZ/gridSize)*gridSize;
  const rotated=Math.abs(Math.sin(state.buildRotation))>.5;
  const halfX=(rotated?definition.depth:definition.width)/2,halfZ=(rotated?definition.width:definition.depth)/2;
  const valid=state.inventory.furniture>=definition.cost&&!intersectsBlock(x,z,halfX,halfZ)&&Math.hypot(x-state.player.x,z-state.player.z)>2.1;
  state.preview.position.set(x,0,z);state.preview.rotation.y=state.buildRotation;
  state.preview.userData.body.material.color.setHex(valid?0xa8d58a:0xdf795f);state.preview.userData.valid=valid;
}
function placeBuild(){
  if(!state.buildMode||!state.preview?.userData.valid)return;
  const definition=buildDefinitions[state.selectedBuild];state.inventory.furniture-=definition.cost;
  makeStructure(state.selectedBuild,state.preview.position.x,state.preview.position.z,state.buildRotation,true);
  showToast(`${definition.label} placed and locked.`);updateHud();saveGame();
}
function selectBuild(type){
  if(!buildDefinitions[type])return;state.selectedBuild=type;
  document.querySelectorAll('[data-build]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.build===type)));
  if(state.buildMode){makePreview();updatePreview();}
}
function toggleBuildMode(){
  state.buildMode=!state.buildMode;
  $('buildModeButton').setAttribute('aria-pressed',String(state.buildMode));
  $('buildState').textContent=state.buildMode?`Placing ${buildDefinitions[state.selectedBuild].label}`:'Scavenge furniture to build';
  if(state.buildMode&&!state.preview)makePreview();
  if(state.preview)state.preview.visible=state.buildMode;
  if(!state.buildMode&&state.preview){buildGroup.remove(state.preview);disposeTree(state.preview);state.preview=null;}
  canvas.classList.toggle('building',state.buildMode);
}
function canMove(x,z){
  const radius=.38;
  for(const blocker of state.blockers){if(Math.abs(x-blocker.x)<blocker.halfX+radius&&Math.abs(z-blocker.z)<blocker.halfZ+radius)return false;}
  for(const build of state.builds){
    const definition=buildDefinitions[build.type],rotated=Math.abs(Math.sin(build.rotation))>.5;
    const halfX=(rotated?definition.depth:definition.width)/2,halfZ=(rotated?definition.width:definition.depth)/2;
    if(Math.abs(x-build.x)<halfX+radius&&Math.abs(z-build.z)<halfZ+radius)return false;
  }
  return true;
}
function distance2(x1,z1,x2,z2){return Math.hypot(x1-x2,z1-z2);}
function nearestLoot(){
  let nearest=null,best=3.2;
  for(const item of state.worldItems.values()){
    const distance=distance2(state.player.x,state.player.z,item.x,item.z);
    if(distance<best){best=distance;nearest=item;}
  }
  return nearest;
}
function interact(){
  const item=nearestLoot();
  if(!item){showToast('Nothing close enough to scavenge.');return;}
  state.collected.add(item.id);state.worldItems.delete(item.id);lootGroup.remove(item.mesh);disposeTree(item.mesh);
  if(item.type==='food'){state.inventory.food++;showToast('Meal packed. Press F when hunger drops.');}
  else if(item.type==='med'){state.inventory.med++;showToast('First-aid kit secured. Press M to use it.');}
  else{state.inventory.furniture+=item.amount;showToast('Furniture salvaged. Build with B.');}
  updateHud();saveGame();
}
function eatFood(){
  if(!state.inventory.food){showToast('No food in your pack.');return;}
  if(state.hunger>=96){showToast('You are not hungry yet.');return;}
  state.inventory.food--;state.hunger=Math.min(100,state.hunger+38);state.health=Math.min(100,state.health+4);updateHud();showToast('You eat a meal. Hunger restored.');saveGame();
}
function useMed(){
  if(!state.inventory.med){showToast('No first-aid kit in your pack.');return;}
  if(state.health>=96){showToast('You are already in good shape.');return;}
  state.inventory.med--;state.health=Math.min(100,state.health+42);updateHud();showToast('First-aid kit used.');saveGame();
}
function lockNearby(){
  const nearby=state.builds.map(build=>({...build,distance:distance2(state.player.x,state.player.z,build.x,build.z)})).filter(build=>build.distance<5).sort((a,b)=>a.distance-b.distance)[0];
  if(!nearby){showToast('No structure close enough to lock.');return;}
  const build=state.builds.find(item=>item.group===nearby.group);build.locked=!build.locked;toggleStructureMaterial(build,build.locked);
  showToast(`${buildDefinitions[build.type].label} ${build.locked?'locked':'unlocked'}.`);saveGame();
}
function checkLineOfSight(a,b){
  for(const blocker of state.blockers){
    const steps=8;
    for(let index=1;index<steps;index++){
      const t=index/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      if(Math.abs(x-blocker.x)<blocker.halfX&&Math.abs(z-blocker.z)<blocker.halfZ)return false;
    }
  }
  return true;
}
function moveStaff(staff,dx,dz,delta){
  const distance=Math.hypot(dx,dz)||1,step=staff.speed*delta;
  const x=staff.x+dx/distance*step,z=staff.z+dz/distance*step;
  if(canMove(x,staff.z))staff.x=x;
  else if(canMove(staff.x+(-dz/distance)*step,staff.z))staff.x+=(-dz/distance)*step;
  if(canMove(staff.x,z))staff.z=z;
  else if(canMove(staff.x,staff.z+(dx/distance)*step))staff.z+=(dx/distance)*step;
  staff.group.position.set(staff.x,0,staff.z);staff.group.rotation.y=Math.atan2(dx,dz);
}
function updateStaff(delta,now){
  for(const staff of state.staff){
    const dx=state.player.x-staff.x,dz=state.player.z-staff.z,distance=Math.hypot(dx,dz);
    if(state.night){
      const visible=checkLineOfSight(staff,state.player);
      if(visible){staff.lastSeenX=state.player.x;staff.lastSeenZ=state.player.z;}
      const targetX=visible?state.player.x:staff.lastSeenX,targetZ=visible?state.player.z:staff.lastSeenZ;
      const targetDistance=distance2(staff.x,staff.z,targetX,targetZ);
      staff.mode=visible?(distance<2.1?'attack':'chase'):'search';staff.speed=state.day%4===0?3.7:3.05;
      if(targetDistance>.55)moveStaff(staff,targetX-staff.x,targetZ-staff.z,delta);
      if(distance<2&&now>staff.nextAttack){
        const damage=state.day%4===0?16:12;
        staff.nextAttack=now+1650;state.health=Math.max(0,state.health-damage);state.lastDamageAt=now;playHitSound();showToast('A Staff caught up to you. Find cover!');
      }
    }else{
      staff.mode='idle';staff.speed=1.1;
      if(now>staff.roamAt){staff.targetX=staff.x+(Math.random()-.5)*8;staff.targetZ=staff.z+(Math.random()-.5)*8;staff.roamAt=now+4500+Math.random()*3500;}
      if(distance2(staff.x,staff.z,staff.targetX,staff.targetZ)>.55)moveStaff(staff,staff.targetX-staff.x,staff.targetZ-staff.z,delta*.7);
    }
  }
}
function showToast(message){
  const toast=$('toast');toast.textContent=message;toast.hidden=false;
  clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>{toast.hidden=true;},2400);
}
function showPhaseBanner(night){
  const bloodNight=night&&state.day%4===0;
  $('bannerTitle').textContent=bloodNight?'BLOOD NIGHT':night?'STORE CLOSED':'DAY SHIFT';
  $('bannerText').textContent=bloodNight?'Emergency lighting is red. Staff are moving faster and hitting harder.':night?'Please exit the building. Staff are now searching the aisles.':'The doors are open. Gather supplies and secure a place to sleep.';
  $('phaseBanner').classList.toggle('blood-night',bloodNight);
  const banner=$('phaseBanner');banner.hidden=false;clearTimeout(state.bannerTimer);state.bannerTimer=setTimeout(()=>{banner.hidden=true;},7200);
  if(night)playNightSound();
}
function updateCycle(delta){
  state.cycleElapsed+=delta*1000;
  const full=dayLength+nightLength;
  while(state.cycleElapsed>=full){state.cycleElapsed-=full;state.day++;}
  const night=state.cycleElapsed>=dayLength;
  if(night!==state.night){state.night=night;showPhaseBanner(night);}
  const phaseElapsed=night?state.cycleElapsed-dayLength:state.cycleElapsed;
  const phaseRemaining=(night?nightLength:dayLength)-phaseElapsed;
  const mins=Math.floor(phaseRemaining/60000),secs=Math.floor((phaseRemaining%60000)/1000);
  $('clock').textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  $('phaseName').textContent=night?'CLOSED':'DAY SHIFT';$('dayStamp').textContent=`DAY ${String(state.day).padStart(2,'0')}`;
  document.querySelector('.cycle-status').classList.toggle('night',night);
  const darkness=night?1:Math.max(0,Math.min(1,phaseElapsed/(dayLength*.82)))*.08,bloodNight=night&&state.day%4===0;
  scene.background.setRGB(bloodNight?.18:night?.075:.16,bloodNight?.055:night?.095:.22,bloodNight?.065:night?.12:.18);
  scene.fog.color.copy(scene.background);ambient.intensity=night?(bloodNight?.52:.48):1.5;keyLight.intensity=night?(bloodNight?.3:.22):1.35;fillLight.intensity=night?.08:.55;
  $('cycleDot').style.background=night?'var(--coral)':'var(--lime)';
}
function updateSurvival(delta){
  const sprinting=(state.keys.has('ShiftLeft')||state.keys.has('ShiftRight'))&&state.stamina>2;
  const moving=state.keys.size>0||state.touchKeys.size>0;
  state.hunger=Math.max(0,state.hunger-delta*(moving?.024:.012));
  if(sprinting&&moving)state.stamina=Math.max(0,state.stamina-delta*23);else state.stamina=Math.min(100,state.stamina+delta*17);
  if(state.hunger===0)state.health=Math.max(0,state.health-delta*2.2);
  else if(state.hunger>65&&!state.night&&performance.now()-state.lastDamageAt>5000)state.health=Math.min(100,state.health+delta*.22);
  const speedBase=sprinting?6.6:state.hunger<18?2.45:4.15;
  return speedBase;
}
function updateHud(){
  for(const [valueId,barId,value]of [['healthValue','healthBar',state.health],['hungerValue','hungerBar',state.hunger],['staminaValue','staminaBar',state.stamina]]){
    $(valueId).textContent=Math.ceil(value);$(barId).style.width=`${Math.max(0,Math.min(100,value))}%`;
  }
  $('foodCount').textContent=state.inventory.food;$('medCount').textContent=state.inventory.med;$('furnitureCount').textContent=state.inventory.furniture;
  $('objectiveText').textContent=state.night?'Stay alive until the doors reopen.':state.inventory.furniture<3?'Scavenge furniture and food before closing.':'Fortify a quiet aisle before closing.';
  $('buildState').textContent=state.buildMode?`Place ${buildDefinitions[state.selectedBuild].label} · ${state.inventory.furniture} salvaged`:`${state.inventory.furniture} furniture salvaged`;
}
function updateInteraction(){
  const item=nearestLoot(),prompt=$('interactionPrompt');
  if(item){prompt.hidden=false;$('interactionText').textContent=`Scavenge ${item.type==='med'?'first-aid kit':item.type==='food'?'meal':'furniture'}`;}
  else prompt.hidden=true;
}
function updateMap(){
  const map=$('mapPlayer'),fractionX=((state.player.x/chunkSize)%1+1)%1,fractionZ=((state.player.z/chunkSize)%1+1)%1;
  map.style.left=`${15+fractionX*70}%`;map.style.top=`${31+fractionZ*55}%`;
}
function showGameOver(){
  state.paused=true;$('pauseScreen').hidden=false;$('pauseScreen').querySelector('.section-label').textContent='SHIFT ENDED';
  $('pauseScreen').querySelector('h1').textContent='You did not make it.';$('pauseScreen').querySelector('p').textContent='Your supplies and store position are saved on this device.';
  $('resumeButton').textContent='Try again';
}
function saveGame(){
  try{
    const data={version:1,day:state.day,cycleElapsed:state.cycleElapsed,health:state.health,hunger:state.hunger,stamina:state.stamina,inventory:state.inventory,player:{x:state.player.x,z:state.player.z,yaw:state.yaw},collected:Array.from(state.collected),builds:state.builds.map(({type,x,z,rotation,locked})=>({type,x,z,rotation,locked}))};
    localStorage.setItem('afterHoursSave',JSON.stringify(data));$('saveStatus').textContent='Autosaved';
  }catch(error){$('saveStatus').textContent='Save unavailable';}
}
function loadGame(){
  try{
    const data=JSON.parse(localStorage.getItem('afterHoursSave')||'null');if(!data||data.version!==1)return;
    state.day=Math.max(1,Number(data.day)||1);state.cycleElapsed=Math.max(0,Number(data.cycleElapsed)||0);
    state.health=Math.max(1,Math.min(100,Number(data.health)||100));state.hunger=Math.max(0,Math.min(100,Number(data.hunger)||100));state.stamina=Math.max(0,Math.min(100,Number(data.stamina)||100));
    state.inventory={food:0,med:0,furniture:0,...data.inventory};state.player.set(Number(data.player?.x)||0,0,Number(data.player?.z)||0);state.yaw=Number(data.player?.yaw)||0;
    state.collected=new Set(Array.isArray(data.collected)?data.collected:[]);
    for(const build of Array.isArray(data.builds)?data.builds:[])if(buildDefinitions[build.type]&&Number.isFinite(build.x)&&Number.isFinite(build.z))makeStructure(build.type,build.x,build.z,Number(build.rotation)||0,build.locked!==false);
  }catch(error){console.warn('Could not restore the local After Hours save.',error);}
}
function resetGame(){
  localStorage.removeItem('afterHoursSave');location.reload();
}
function startAudio(){
  if(state.audioContext)return;
  try{
    const context=new AudioContext(),oscillator=context.createOscillator(),gain=context.createGain(),filter=context.createBiquadFilter();
    oscillator.type='sine';oscillator.frequency.value=56;filter.type='lowpass';filter.frequency.value=120;gain.gain.value=.009;
    oscillator.connect(filter).connect(gain).connect(context.destination);oscillator.start();state.audioContext=context;state.hum={oscillator,gain};
  }catch(error){console.warn('Ambient audio is unavailable.',error);}
}
function playNightSound(){
  startAudio();if(!state.audioContext)return;
  const context=state.audioContext,oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type='triangle';oscillator.frequency.setValueAtTime(190,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(72,context.currentTime+1.1);
  gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.exponentialRampToValueAtTime(.12,context.currentTime+.06);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+1.3);
  oscillator.connect(gain).connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+1.35);
}
function playHitSound(){
  if(!state.audioContext)return;
  const context=state.audioContext,oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type='sawtooth';oscillator.frequency.value=95;gain.gain.value=.055;oscillator.connect(gain).connect(context.destination);oscillator.start();gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.16);oscillator.stop(context.currentTime+.18);
}
function resize(){
  const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}
function setPaused(paused){
  state.paused=paused;$('pauseScreen').hidden=!paused;
  if(paused&&document.pointerLockElement===canvas)document.exitPointerLock();
  if(paused){$('pauseScreen').querySelector('.section-label').textContent='STORE 01 · SHIFT PAUSED';$('pauseScreen').querySelector('h1').textContent='Take a breath.';$('pauseScreen').querySelector('p').textContent='Your progress is saved on this device.';$('resumeButton').textContent='Resume shift';}
}
function movePlayer(delta){
  const forward=(state.keys.has('KeyW')||state.keys.has('ArrowUp')||state.touchKeys.has('forward')?1:0)-(state.keys.has('KeyS')||state.keys.has('ArrowDown')||state.touchKeys.has('back')?1:0);
  const side=(state.keys.has('KeyD')||state.keys.has('ArrowRight')||state.touchKeys.has('right')?1:0)-(state.keys.has('KeyA')||state.keys.has('ArrowLeft')||state.touchKeys.has('left')?1:0);
  const length=Math.hypot(forward,side)||1,speed=updateSurvival(delta);
  const dx=side/length*speed*delta;
  const dz=-forward/length*speed*delta;
  const nextX=state.player.x+dx,nextZ=state.player.z+dz;
  if(canMove(nextX,state.player.z))state.player.x=nextX;
  if(canMove(state.player.x,nextZ))state.player.z=nextZ;
  state.jumpVelocity-=18*delta;state.jumpY+=state.jumpVelocity*delta;
  if(state.jumpY<0){state.jumpY=0;state.jumpVelocity=0;}
  ensureChunks();
}
function updateCamera(){
  camera.up.set(0,0,-1);
  camera.position.set(state.player.x,34+state.jumpY,state.player.z+15);
  camera.lookAt(state.player.x,0,state.player.z);
}
function animate(){
  if(state.disposed)return;requestAnimationFrame(animate);
  const delta=Math.min(clock.getDelta(),.05);
  if(!state.paused){
    movePlayer(delta);updateCycle(delta);updateStaff(delta,performance.now());
    if(state.health<=0)showGameOver();
    if(state.buildMode)updatePreview();
    if(performance.now()-state.lastUi>120){state.lastUi=performance.now();updateHud();updateInteraction();updateMap();}
    if(performance.now()>state.nextAutoSave){state.nextAutoSave=performance.now()+5000;saveGame();}
  }
  updateCamera();renderer.render(scene,camera);
}
function init(){
  loadGame();ensureChunks();
  for(const [index,position]of [[0,[9,8]],[1,[-16,-12]],[2,[18,-18]],[3,[-20,18]]])makeStaff(index,position[0],position[1]);
  resize();updateHud();updateMap();requestAnimationFrame(animate);
}
canvas.addEventListener('pointerdown',event=>{
  startAudio();
  if(state.buildMode&&event.button===0){placeBuild();return;}
});
window.addEventListener('keydown',event=>{
  if(event.code==='Escape'){setPaused(!state.paused);return;}
  if(state.paused)return;
  if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  state.keys.add(event.code);
  if(event.repeat)return;
  if(event.code==='KeyE')interact();
  if(event.code==='KeyB')toggleBuildMode();
  if(event.code==='KeyQ'){state.buildRotation+=Math.PI/2;}
  if(event.code==='KeyL')lockNearby();
  if(event.code==='KeyF')eatFood();
  if(event.code==='KeyM')useMed();
  if(event.code==='Space'&&state.jumpY===0&&state.stamina>12){state.jumpVelocity=7.2;state.stamina-=10;}
  if(event.code==='Digit1')selectBuild('pallet');if(event.code==='Digit2')selectBuild('shelf');if(event.code==='Digit3')selectBuild('table');
});
window.addEventListener('keyup',event=>state.keys.delete(event.code));
window.addEventListener('blur',()=>state.keys.clear());
$('buildModeButton').addEventListener('click',toggleBuildMode);
$('rotateBuildButton').addEventListener('click',()=>{state.buildRotation+=Math.PI/2;});
$('lockButton').addEventListener('click',lockNearby);
$('eatButton').addEventListener('click',eatFood);
$('pauseButton').addEventListener('click',()=>setPaused(true));
$('resumeButton').addEventListener('click',()=>{if(state.health<=0){resetGame();return;}setPaused(false);});
$('newGameButton').addEventListener('click',resetGame);
document.querySelectorAll('[data-build]').forEach(button=>button.addEventListener('click',()=>selectBuild(button.dataset.build)));
document.querySelectorAll('[data-move]').forEach(button=>{
  const direction=button.dataset.move;
  button.addEventListener('pointerdown',event=>{event.preventDefault();state.touchKeys.add(direction);button.setPointerCapture(event.pointerId);});
  for(const eventName of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(eventName,()=>state.touchKeys.delete(direction));
});
window.addEventListener('resize',resize);
window.addEventListener('pagehide',()=>{state.disposed=true;saveGame();if(state.audioContext)state.audioContext.close();renderer.dispose();});
init();
