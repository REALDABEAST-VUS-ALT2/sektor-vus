import * as THREE from 'three';

const wrapSelector='.nexus-war-map-wrap';
let renderer,scene,camera,wrap,canvas,weaponRig,muzzleFlashMesh,muzzleLight,grappleLine,armorShield,supportMarker,supportBeam,scopeOverlay,scopeReadout;
let builtMapSignature='';
let builtWeaponSignature='';
let rendererUnavailable=false;
let resizeObserver;
const dynamicLayers=new Map();
const traceMeshes=new Map();
const laserMeshes=new Map();
const teamColors={vortex:0x61a7ff,krypton:0xff6575,neutral:0xe8c86d};

function material(color,roughness=.8,metalness=0,emissive=0){
  return new THREE.MeshStandardMaterial({color,roughness,metalness,emissive,emissiveIntensity:emissive?.7:0});
}
function addMesh(group,geometry,mat,x=0,y=0,z=0){
  const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}
function clearGroup(group){
  for(const child of [...group.children]){
    child.traverse(object=>{
      if(object.geometry)object.geometry.dispose();
      if(object.material){const list=Array.isArray(object.material)?object.material:[object.material];for(const item of list){item.map?.dispose();item.dispose();}}
    });
    group.remove(child);
  }
}
function labelSprite(text,color='#f2f6e8'){
  const label=document.createElement('canvas');label.width=512;label.height=96;
  const context=label.getContext('2d');context.fillStyle='rgba(8,15,12,.8)';context.fillRect(0,0,label.width,label.height);
  context.strokeStyle=color;context.lineWidth=5;context.strokeRect(4,4,label.width-8,label.height-8);
  context.fillStyle=color;context.font='bold 38px system-ui';context.textAlign='center';context.textBaseline='middle';context.fillText(String(text||'').slice(0,36),256,50);
  const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.scale.set(260,49,1);sprite.renderOrder=5;return sprite;
}
function createRenderer(){
  if(renderer||rendererUnavailable)return;
  wrap=document.querySelector(wrapSelector);if(!wrap)return;
  canvas=document.createElement('canvas');canvas.className='nexus-war-3d-canvas';canvas.setAttribute('aria-label','First-person 3D Dropzone battlefield');
  wrap.prepend(canvas);
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});}
  catch(error){rendererUnavailable=true;wrap.classList.add('nexus-war-3d-fallback');canvas.remove();canvas=null;console.warn('[Dropzone 3D] WebGL unavailable; using the 2D battlefield.',error);return;}
  wrap.classList.add('dropzone-3d-ready');
  const reticle=document.createElement('span');reticle.className='nexus-war-3d-reticle';reticle.setAttribute('aria-hidden','true');reticle.textContent='+';wrap.append(reticle);
  scopeOverlay=document.createElement('div');scopeOverlay.className='nexus-war-scope-overlay';scopeOverlay.hidden=true;
  scopeReadout=document.createElement('span');scopeReadout.className='nexus-war-scope-readout';scopeOverlay.append(scopeReadout);wrap.append(scopeOverlay);
  window.dropzone3DActive=true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x89928a);scene.fog=new THREE.Fog(0x89928a,1500,5600);
  camera=new THREE.PerspectiveCamera(76,1,.1,6000);
  scene.add(new THREE.HemisphereLight(0xe4f0e2,0x293329,2.1));
  const sun=new THREE.DirectionalLight(0xffedce,2.4);sun.position.set(-900,1700,600);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
  const ambient=new THREE.AmbientLight(0xffffff,.25);scene.add(ambient);
  weaponRig=new THREE.Group();
  camera.add(weaponRig);scene.add(camera);
  muzzleFlashMesh=new THREE.Mesh(new THREE.SphereGeometry(10,8,6),new THREE.MeshBasicMaterial({color:0xffd26b,transparent:true,opacity:0,toneMapped:false}));
  muzzleFlashMesh.position.set(39,-29,-194);muzzleFlashMesh.visible=false;camera.add(muzzleFlashMesh);
  muzzleLight=new THREE.PointLight(0xffa53c,0,250);muzzleLight.position.copy(muzzleFlashMesh.position);camera.add(muzzleLight);
  armorShield=new THREE.Mesh(new THREE.TorusGeometry(38,4,8,36),new THREE.MeshBasicMaterial({color:0x79e8d0,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
  armorShield.position.set(0,0,-165);armorShield.visible=false;camera.add(armorShield);
  grappleLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xffd675,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));
  grappleLine.frustumCulled=false;grappleLine.visible=false;scene.add(grappleLine);
  supportMarker=new THREE.Mesh(new THREE.TorusGeometry(42,4,8,36),new THREE.MeshBasicMaterial({color:0xffbf55,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));
  supportMarker.rotation.x=Math.PI/2;supportMarker.visible=false;scene.add(supportMarker);
  supportBeam=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineDashedMaterial({color:0xffbf55,dashSize:32,gapSize:24,transparent:true,opacity:.55,depthWrite:false}));
  supportBeam.frustumCulled=false;supportBeam.visible=false;scene.add(supportBeam);
  resizeObserver=new ResizeObserver(resize);resizeObserver.observe(wrap);window.addEventListener('resize',resize);
  resize();
}
function resize(){
  if(!renderer||!wrap)return;
  const width=wrap.clientWidth,height=wrap.clientHeight;if(!width||!height)return;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}
function updateWeaponModel(weapon){
  if(!weapon){weaponRig.visible=false;return;}
  weaponRig.visible=true;
  const weaponId=String(weapon.weaponId||weapon.id||weapon.name||'rifle');
  const custom=weapon.customColors||{};
  const attachmentIds=weapon.attachmentIds||[];
  const signature=JSON.stringify([weaponId,weapon.type,custom,attachmentIds]);
  if(signature===builtWeaponSignature)return;
  builtWeaponSignature=signature;clearGroup(weaponRig);
  let seed=0;for(const character of weaponId)seed=(seed*31+character.charCodeAt(0))>>>0;
  const hue=(seed%360)/360;
  const receiverColor=/^#[0-9a-f]{6}$/i.test(custom.receiver||'')?custom.receiver:new THREE.Color().setHSL(hue,.24,.43).getStyle();
  const barrelColor=/^#[0-9a-f]{6}$/i.test(custom.barrel||'')?custom.barrel:'#1b2420';
  const gripColor=/^#[0-9a-f]{6}$/i.test(custom.grip||'')?custom.grip:'#354139';
  const stockColor=/^#[0-9a-f]{6}$/i.test(custom.stock||'')?custom.stock:'#56645a';
  const accentColor=/^#[0-9a-f]{6}$/i.test(custom.accent||'')?custom.accent:new THREE.Color().setHSL((hue+.45)%1,.5,.61).getStyle();
  const receiver=material(receiverColor,.46,.38),barrelMat=material(barrelColor,.37,.62),grip=material(gripColor,.75,.12),stock=material(stockColor,.63,.24),accent=material(accentColor,.35,.4,0x18251e);
  const type=weapon.type||'Assault rifle';
  const box=(w,h,d,mat,x,y,z)=>addMesh(weaponRig,new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  const tube=(length,radius,mat,x,y,z)=>{const mesh=addMesh(weaponRig,new THREE.CylinderGeometry(radius*.82,radius,length,9),mat,x,y,z);mesh.rotation.x=-Math.PI/2;return mesh;};
  if(type==='Pistol'){
    box(21,14,39,receiver,38,-29,-121);box(15,28,17,grip,38,-47,-108);
    tube(43,4,barrelMat,38,-26,-161);box(11,5,11,accent,38,-17,-127);
  }else if(type==='Shotgun'){
    box(28,18,49,receiver,38,-29,-116);box(21,12,35,stock,38,-30,-78);
    tube(81,5,barrelMat,38,-25,-179);box(24,12,28,grip,38,-43,-113);
  }else if(type==='Sniper rifle'||type==='Marksman rifle'){
    box(29,17,62,receiver,38,-29,-117);box(23,13,39,stock,38,-30,-70);
    tube(type==='Sniper rifle'?112:84,4.2,barrelMat,38,-25,-204);
    const scope=addMesh(weaponRig,new THREE.CylinderGeometry(5,5,37,10),accent,38,-14,-122);scope.rotation.x=Math.PI/2;
    box(6,17,10,grip,38,-44,-116);
  }else if(type==='Light machine gun'){
    box(33,22,63,receiver,38,-29,-111);box(23,13,45,stock,38,-30,-63);
    tube(91,5,barrelMat,38,-24,-187);box(22,25,26,grip,38,-48,-113);
    box(28,29,25,accent,38,-53,-126);
  }else if(type==='Explosive'||weapon.model==='launcher'){
    const launcher=addMesh(weaponRig,new THREE.CylinderGeometry(13,15,98,12),receiver,38,-29,-133);launcher.rotation.x=-Math.PI/2;
    tube(22,7,barrelMat,38,-29,-193);box(22,29,24,grip,38,-52,-116);
    box(35,12,34,accent,38,-7,-124);
  }else if(type==='Special'){
    box(34,24,68,receiver,38,-29,-111);tube(70,7,barrelMat,38,-26,-178);
    const cell=addMesh(weaponRig,new THREE.OctahedronGeometry(12),accent,38,-9,-124);cell.rotation.set(.3,.4,.5);
    box(19,31,24,grip,38,-48,-113);
  }else{
    box(29,19,59,receiver,38,-29,-114);box(22,13,42,stock,38,-30,-67);
    tube(78,4.4,barrelMat,38,-25,-181);box(19,24,24,grip,38,-48,-114);
    box(15,6,25,accent,38,-14,-123);
    if(seed%3===0)box(34,5,10,accent,38,-10,-110);
    if(seed%3===1){const optic=addMesh(weaponRig,new THREE.CylinderGeometry(5,5,20,10),accent,38,-12,-117);optic.rotation.x=Math.PI/2;}
  }
  const has=id=>attachmentIds.includes(id);
  if(has('optic_iron')){
    box(5,17,5,barrelMat,38,-8,-101);box(5,20,5,barrelMat,38,-8,-169);
    box(23,5,5,barrelMat,38,-1,-101);
  }else if(has('optic_holo')||has('optic_reflex')){
    box(26,5,22,barrelMat,38,-13,-124);
    const ring=addMesh(weaponRig,new THREE.TorusGeometry(8,2,6,20),accent,38,-7,-124);
    const lens=new THREE.Mesh(new THREE.CircleGeometry(7,20),new THREE.MeshBasicMaterial({color:0x79e8cf,transparent:true,opacity:.38,side:THREE.DoubleSide}));lens.position.set(38,-7,-124);weaponRig.add(lens);
  }else if(has('optic_3x')||has('optic_thermal')||has('optic_variable')){
    box(29,5,32,barrelMat,38,-12,-122);
    const scope=addMesh(weaponRig,new THREE.CylinderGeometry(7,7,48,12),receiver,38,-3,-128);scope.rotation.x=Math.PI/2;
    for(const z of [-147,-109]){
      const ring=addMesh(weaponRig,new THREE.CylinderGeometry(10,10,5,12),accent,38,-3,z);ring.rotation.x=Math.PI/2;
    }
    const lensColor=has('optic_thermal')?0xf27b42:0x88c8d0;
    const lens=new THREE.Mesh(new THREE.CircleGeometry(7,20),new THREE.MeshBasicMaterial({color:lensColor,transparent:true,opacity:.65,side:THREE.DoubleSide}));lens.position.set(38,-3,-154);weaponRig.add(lens);
    if(has('optic_variable'))box(13,17,12,accent,52,-3,-128);
    if(has('optic_thermal'))box(15,14,16,accent,38,7,-128);
  }
  if(attachmentIds.some(id=>id.startsWith('underbarrel_')&&!id.includes('reserve')&&!id.includes('pouch'))){
    box(17,9,38,grip,38,-44,-147);tube(40,5,barrelMat,38,-43,-174);
  }
  if(has('mag_drum')){
    const drum=addMesh(weaponRig,new THREE.CylinderGeometry(12,12,18,14),accent,38,-49,-119);drum.rotation.z=Math.PI/2;
  }else if(has('mag_extended')||has('mag_fast_reload')||has('mag_subsonic'))box(15,34,18,grip,38,-51,-117);
  if(has('suppressor_compact')||has('suppressor_integral'))tube(42,6,barrelMat,38,-25,-209);
  if(has('barrel_precision'))tube(38,4,accent,38,-25,-226);
  if(has('barrel_light')){
    tube(28,4.6,accent,38,-25,-203);
    for(let index=0;index<3;index++)box(9,3,4,barrelMat,38,-19,-194-index*7);
  }
  if(has('barrel_ported')||has('muzzle_brake')||has('muzzle_flash_hider')){
    box(15,13,16,accent,38,-25,-205);
    if(has('barrel_ported')||has('muzzle_brake'))for(const side of [-1,1])box(19,3,4,barrelMat,38,-17,-204+side*4);
  }
  if(has('laser_red')||has('laser_tac')){
    const laser=addMesh(weaponRig,new THREE.BoxGeometry(12,8,18),accent,54,-34,-138);
    addMesh(weaponRig,new THREE.SphereGeometry(3,8,6),new THREE.MeshBasicMaterial({color:has('laser_red')?0xff3344:0x87ffc0}),54,-32,-150);
  }
  if(has('stock_skeleton')){
    box(7,28,40,stock,28,-30,-66);box(7,28,40,stock,48,-30,-66);
    box(26,6,8,accent,38,-18,-49);box(26,6,8,accent,38,-42,-82);
  }
  if(has('stock_heavy')||has('stock_precision')||has('stock_recoil')){
    box(27,25,12,has('stock_recoil')?grip:accent,38,-30,-47);
    if(has('stock_precision'))box(24,7,30,stock,38,-16,-72);
  }
  if(has('control_grip')||has('control_comp')){
    const brace=addMesh(weaponRig,new THREE.CylinderGeometry(2.5,2.5,30,8),accent,23,-30,-105);brace.rotation.z=Math.PI/2;
  }
  if(has('grip_vertical')||has('grip_stubby')||has('handstop_angled')){
    const gripLength=has('grip_vertical')?27:16;
    box(12,gripLength,12,accent,38,-43,-151);
  }
  if(has('rail_light'))box(10,9,23,accent,56,-23,-114);
  if(has('trigger_light')||has('trigger_binary')){
    const trigger=addMesh(weaponRig,new THREE.TorusGeometry(5,1.5,5,12),accent,38,-41,-105);trigger.rotation.x=Math.PI/2;
  }
  if(attachmentIds.some(id=>id.startsWith('ammo_'))){
    box(18,3,23,accent,38,-60,-117);
    if(has('ammo_armor'))box(20,4,9,barrelMat,38,-57,-109);
  }
}
function addTreeInstances(group,width,height){
  const trunkGeometry=new THREE.CylinderGeometry(11,17,100,6);
  const crownGeometry=new THREE.ConeGeometry(58,190,7);
  const trunkMaterial=material(0x574a37),crownMaterial=material(0x526d49);
  const count=240,trunks=new THREE.InstancedMesh(trunkGeometry,trunkMaterial,count),crowns=new THREE.InstancedMesh(crownGeometry,crownMaterial,count);
  const dummy=new THREE.Object3D();let made=0;
  for(let index=0;index<count;index++){
    const roll=Math.abs(Math.sin(index*12.9898+4.1)*43758.5453)%1;
    const x=roll*width,z=(Math.abs(Math.sin(index*78.233+9.2)*24634.6345)%1)*height;
    const roadX=Math.abs((x%2880)-1440),roadZ=Math.abs((z%2880)-1440);
    if(roadX<250||roadZ<250)continue;
    const size=.7+roll*.65;
    dummy.position.set(x,48*size,z);dummy.scale.setScalar(size);dummy.updateMatrix();trunks.setMatrixAt(made,dummy.matrix);
    dummy.position.y=174*size;dummy.updateMatrix();crowns.setMatrixAt(made,dummy.matrix);made++;
  }
  trunks.count=made;crowns.count=made;trunks.instanceMatrix.needsUpdate=true;crowns.instanceMatrix.needsUpdate=true;
  group.add(trunks,crowns);
}
function addBase(group,team,position,safeRadius){
  const color=teamColors[team]||teamColors.neutral,base=new THREE.Group();
  addMesh(base,new THREE.CylinderGeometry(210,250,22,12),material(0x515e55),0,11,0);
  addMesh(base,new THREE.BoxGeometry(330,145,250),material(team==='vortex'?0x586f83:0x80585a,.72,.15),0,94,0);
  addMesh(base,new THREE.BoxGeometry(125,68,256),material(0x27362e,.62,.2),0,194,0);
  const beacon=addMesh(base,new THREE.CylinderGeometry(20,29,220,8),material(color,.4,.15,color),-145,120,-100);beacon.rotation.z=.12;
  const sign=labelSprite(team.toUpperCase()+' BASE',team==='vortex'?'#86bdff':'#ff9da7');sign.position.set(0,310,0);base.add(sign);
  base.position.set(position.x,0,position.y);group.add(base);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(safeRadius,8,8,80),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.38,depthWrite:false}));
  ring.rotation.x=Math.PI/2;ring.position.set(position.x,8,position.y);group.add(ring);
}
function addObstacle(group,item){
  const itemGroup=new THREE.Group(),width=Math.max(40,Number(item.w)||100),depth=Math.max(40,Number(item.h)||100);
  if(item.type==='barrier'){
    addMesh(itemGroup,new THREE.BoxGeometry(width,82,depth),material(0x657063,.9),0,41,0);
    addMesh(itemGroup,new THREE.BoxGeometry(width+10,9,depth+10),material(0xc1b48b,.6),0,85,0);
  }else{
    const building=item.type==='building',height=building?Math.max(180,Math.min(520,width*.32)):190;
    const wall=material(building?0x777e78:0x9b8b71,.86),roof=material(building?0x414d49:0x584b3d,.82);
    addMesh(itemGroup,new THREE.BoxGeometry(width,height,depth),wall,0,height/2,0);
    addMesh(itemGroup,new THREE.BoxGeometry(width+24,26,depth+24),roof,0,height+13,0);
    for(const side of [-1,1]){
      addMesh(itemGroup,new THREE.BoxGeometry(24,56,24),material(0x303a33,.7),side*(width*.28),height+52,side*(depth*.28));
    }
    if(item.label){const sign=labelSprite(item.label);sign.position.set(0,height+90,0);itemGroup.add(sign);}
    addMesh(itemGroup,new THREE.BoxGeometry(Math.min(140,width*.22),8,5),material(0x28362d,.45,.2),0,62,depth/2+3);
  }
  itemGroup.position.set(Number(item.x)+width/2,0,Number(item.y)+depth/2);itemGroup.userData.obstacleId=item.id;group.add(itemGroup);
}
function addRelay(group,id,node){
  const marker=new THREE.Group(),platform=addMesh(marker,new THREE.CylinderGeometry(90,112,22,12),material(0x596257),0,12,0);
  const mast=addMesh(marker,new THREE.CylinderGeometry(13,20,260,8),material(0x8c9782,.44,.55),0,151,0);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(82,9,8,32),new THREE.MeshBasicMaterial({color:teamColors.neutral,emissive:teamColors.neutral}));ring.rotation.x=Math.PI/2;ring.position.y=235;marker.add(ring);
  const pennant=addMesh(marker,new THREE.BoxGeometry(85,44,5),material(teamColors.neutral,.35,.1),46,232,0);
  const sign=labelSprite(node.label||id.toUpperCase(),'#f2df94');sign.position.set(0,350,0);marker.add(sign);
  marker.userData={nodeId:id,ring,pennant};marker.position.set(Number(node.x),0,Number(node.y));group.add(marker);return marker;
}
function buildWorld(detail){
  const width=Number(detail.worldWidth)||18000,height=Number(detail.worldHeight)||9000;
  const mapSignature=JSON.stringify([detail.mapId,width,height,(detail.mapObstacles||[]).map(item=>[item.id,item.x,item.y,item.w,item.h,item.type])]);
  if(mapSignature===builtMapSignature)return;
  builtMapSignature=mapSignature;
  for(const [name,layer]of dynamicLayers){clearGroup(layer);scene.remove(layer);dynamicLayers.delete(name);}
  for(const child of [...scene.children])if(child.userData.staticDropzone){clearGroup(child);scene.remove(child);}
  const world=new THREE.Group();world.userData.staticDropzone=true;scene.add(world);
  const terrainColors={'red-canyon':0x93704d,'salt-flats':0xb1a47c,'floodplain':0x557973,'frostline':0x81999a,'blackout-district':0x35403e,'steel-district':0x56635f,'foundry':0x635346};
  scene.background.setHex(terrainColors[detail.mapId]||0x818b7e);scene.fog.color.copy(scene.background);
  const ground=addMesh(world,new THREE.PlaneGeometry(width,height),material(terrainColors[detail.mapId]||0x66765a,1),width/2,-8,height/2);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;
  const roadMaterial=material(detail.mapId==='red-canyon'?0x665c4d:0x3f4943,.92),lineMaterial=material(0xc1b486,.8);
  for(let x=2880;x<width;x+=2880){
    addMesh(world,new THREE.BoxGeometry(156,5,height),roadMaterial,x,-2,height/2);
    for(let z=160;z<height;z+=360)addMesh(world,new THREE.BoxGeometry(8,2,128),lineMaterial,x,1,z);
  }
  for(let z=2880;z<height;z+=2880){
    addMesh(world,new THREE.BoxGeometry(width,5,156),roadMaterial,width/2,-2,z);
    for(let x=160;x<width;x+=360)addMesh(world,new THREE.BoxGeometry(128,2,8),lineMaterial,x,1,z);
  }
  addTreeInstances(world,width,height);
  for(const team of ['vortex','krypton'])addBase(world,team,detail.basePositions[team],detail.safeZoneRadius);
  for(const [id,node]of Object.entries(detail.nodePositions||{}))addRelay(world,id,node);
  for(const item of detail.mapObstacles||[])addObstacle(world,item);
  const dirt=new THREE.Mesh(new THREE.BoxGeometry(width,3,height),material(0x52604e,.95));dirt.position.set(width/2,-18,height/2);world.add(dirt);
}
function entityLayer(name){
  let group=dynamicLayers.get(name);
  if(!group){group=new THREE.Group();scene.add(group);dynamicLayers.set(name,group);}
  return group;
}
function makeSoldier(team){
  const group=new THREE.Group(),color=teamColors[team]||teamColors.neutral;
  addMesh(group,new THREE.CapsuleGeometry(28,38,5,8),material(team==='vortex'?0x526d86:team==='krypton'?0x795458:0x6a7165,.8),0,59,0);
  addMesh(group,new THREE.SphereGeometry(22,12,8),material(0xc7a886),0,108,0);
  addMesh(group,new THREE.BoxGeometry(12,9,19),new THREE.MeshBasicMaterial({color}),0,110,-18);
  return group;
}
function makeVehicle(type,team,colors={}){
  const group=new THREE.Group(),air=type==='transport_helicopter'||type==='apache';
  const bodyColor=material(/^#[0-9a-f]{6}$/i.test(colors.body||'')?colors.body:team==='krypton'?0x80565a:0x637b68,.62,.2);
  const trimColor=material(/^#[0-9a-f]{6}$/i.test(colors.trim||'')?colors.trim:teamColors[team]||0x9ca99e,.48,.28);
  const accentColor=/^#[0-9a-f]{6}$/i.test(colors.accent||'')?colors.accent:'#d3b263';
  const dark=material(0x202723,.82,.16),glass=new THREE.MeshStandardMaterial({color:0x8db7bd,roughness:.2,metalness:.25,transparent:true,opacity:.76});
  const wheel=(x,z,radius=30)=>{
    const tire=addMesh(group,new THREE.CylinderGeometry(radius,radius,18,12),dark,x,radius,z);tire.rotation.z=Math.PI/2;
    const hub=addMesh(group,new THREE.CylinderGeometry(radius*.42,radius*.42,20,10),trimColor,x,radius,z);hub.rotation.z=Math.PI/2;
  };
  const barrel=(parent,x,y,z,length=90,radius=7)=>{
    const tube=addMesh(parent,new THREE.CylinderGeometry(radius*.8,radius,length,9),dark,x,y,z);tube.rotation.x=-Math.PI/2;
    addMesh(parent,new THREE.CylinderGeometry(radius*1.35,radius*1.35,8,9),trimColor,x,y,z-length/2);
  };
  if(type==='scout_bike'){
    wheel(0,-78,31);wheel(0,77,31);
    addMesh(group,new THREE.BoxGeometry(18,28,100),trimColor,0,66,0);
    addMesh(group,new THREE.BoxGeometry(48,24,44),bodyColor,0,91,-14);
    addMesh(group,new THREE.BoxGeometry(42,14,44),dark,0,112,37);
    addMesh(group,new THREE.BoxGeometry(12,74,15),trimColor,0,71,-62).rotation.x=.24;
    addMesh(group,new THREE.BoxGeometry(82,9,10),dark,0,119,-77);
    addMesh(group,new THREE.BoxGeometry(25,8,32),material(0xf0c76b,.35),0,59,-91);
  }else if(type==='tank'){
    for(const side of [-1,1]){
      addMesh(group,new THREE.BoxGeometry(40,68,248),dark,side*76,41,0);
      for(let index=0;index<7;index++)wheel(side*78,-90+index*30,22);
      addMesh(group,new THREE.BoxGeometry(20,36,190),trimColor,side*91,37,0);
    }
    addMesh(group,new THREE.BoxGeometry(128,58,208),bodyColor,0,72,5);
    addMesh(group,new THREE.BoxGeometry(115,20,94),trimColor,0,110,-32);
    const turret=new THREE.Group();addMesh(turret,new THREE.CylinderGeometry(48,58,32,12),bodyColor,0,0,0);
    addMesh(turret,new THREE.BoxGeometry(68,28,62),trimColor,0,21,2);barrel(turret,0,25,-78,116,9);
    turret.position.set(0,127,-2);group.add(turret);
    addMesh(group,new THREE.BoxGeometry(36,18,30),dark,-35,115,78);
  }else if(type==='anti_air'){
    for(const side of [-1,1])for(const z of [-75,76])wheel(side*79,z,31);
    addMesh(group,new THREE.BoxGeometry(140,46,220),bodyColor,0,55,0);
    addMesh(group,new THREE.BoxGeometry(82,52,72),glass,0,97,48);
    addMesh(group,new THREE.BoxGeometry(116,14,70),trimColor,0,83,-38);
    const mount=new THREE.Group();addMesh(mount,new THREE.CylinderGeometry(42,48,20,12),dark,0,0,0);
    addMesh(mount,new THREE.BoxGeometry(82,32,72),bodyColor,0,21,0);
    barrel(mount,-19,30,-63,114,6);barrel(mount,19,30,-63,114,6);
    mount.position.set(0,101,-22);group.add(mount);
  }else if(type==='transport_helicopter'||type==='apache'){
    const apache=type==='apache',fuselage=new THREE.Mesh(new THREE.CapsuleGeometry(apache?27:34,apache?112:145,5,10),bodyColor);
    fuselage.rotation.x=Math.PI/2;fuselage.position.set(0,apache?106:112,apache?4:0);fuselage.castShadow=true;group.add(fuselage);
    const cockpit=addMesh(group,new THREE.SphereGeometry(apache?31:38,14,10),glass,0,apache?111:118,-64);cockpit.scale.set(1,.72,1.3);
    addMesh(group,new THREE.BoxGeometry(34,24,118),bodyColor,0,95,111);
    addMesh(group,new THREE.BoxGeometry(13,91,14),trimColor,0,117,166);
    addMesh(group,new THREE.BoxGeometry(98,10,36),bodyColor,0,92,166);
    addMesh(group,new THREE.BoxGeometry(132,12,16),dark,0,52,7);
    for(const side of [-1,1])addMesh(group,new THREE.BoxGeometry(10,12,156),dark,side*61,49,7);
    const rotorGroup=new THREE.Group();
    addMesh(rotorGroup,new THREE.BoxGeometry(10,6,310),dark,0,0,0);
    addMesh(rotorGroup,new THREE.BoxGeometry(310,6,10),trimColor,0,2,0);
    rotorGroup.position.set(0,apache?175:188,4);rotorGroup.userData.rotor=true;group.add(rotorGroup);
    const tailRotor=new THREE.Group();
    addMesh(tailRotor,new THREE.BoxGeometry(8,74,7),dark,0,0,0);
    addMesh(tailRotor,new THREE.BoxGeometry(60,8,7),trimColor,0,0,0);
    tailRotor.position.set(0,105,182);tailRotor.userData.tailRotor=true;group.add(tailRotor);
    if(apache){
      addMesh(group,new THREE.BoxGeometry(48,22,64),dark,0,84,-20);
      for(const side of [-1,1]){
        addMesh(group,new THREE.BoxGeometry(150,16,30),bodyColor,side*92,73,4);
        for(const z of [-12,19])addMesh(group,new THREE.CylinderGeometry(10,10,48,9),trimColor,side*129,67,z).rotation.x=Math.PI/2;
        barrel(group,side*27,85,-68,74,7);
      }
    }
  }else{
    for(const side of [-1,1])for(const z of [-72,73])wheel(side*73,z,31);
    addMesh(group,new THREE.BoxGeometry(146,48,212),bodyColor,0,54,0);
    addMesh(group,new THREE.BoxGeometry(124,48,78),trimColor,0,93,42);
    addMesh(group,new THREE.BoxGeometry(100,30,7),glass,0,102,2);
    addMesh(group,new THREE.BoxGeometry(118,12,44),dark,0,83,-66);
    addMesh(group,new THREE.BoxGeometry(148,18,18),dark,0,37,-111);
    addMesh(group,new THREE.BoxGeometry(152,12,18),trimColor,0,34,108);
    if(type==='jeep'){
      for(const side of [-1,1])addMesh(group,new THREE.BoxGeometry(10,92,10),dark,side*54,105,10);
      addMesh(group,new THREE.BoxGeometry(118,10,10),dark,0,151,10);
      addMesh(group,new THREE.BoxGeometry(76,10,72),dark,0,37,48);
      const mount=new THREE.Group();addMesh(mount,new THREE.CylinderGeometry(27,31,16,10),dark,0,0,0);
      addMesh(mount,new THREE.BoxGeometry(35,21,34),bodyColor,0,16,0);barrel(mount,0,24,-33,77,6);
      mount.position.set(0,123,22);group.add(mount);
    }else{
      addMesh(group,new THREE.BoxGeometry(88,28,56),dark,0,90,16);
      addMesh(group,new THREE.BoxGeometry(92,12,62),trimColor,0,107,14);
    }
  }
  const badge=addMesh(group,new THREE.BoxGeometry(38,9,42),new THREE.MeshBasicMaterial({color:accentColor}),0,air?155:130,0);
  group.userData.vehicleType=type;return group;
}
function makeCrate(color=0xb08b50){
  const group=new THREE.Group();addMesh(group,new THREE.BoxGeometry(70,55,65),material(color,.78,.08),0,29,0);
  addMesh(group,new THREE.BoxGeometry(76,8,12),material(0xd0ba83,.6),0,31,0);
  addMesh(group,new THREE.BoxGeometry(12,58,68),material(0x4c584a,.65),0,29,0);return group;
}
function makeBomb(){
  const group=new THREE.Group(),body=addMesh(group,new THREE.CapsuleGeometry(10,32,4,8),material(0x59644e,.48,.42),0,0,0);
  body.rotation.x=-Math.PI/2;
  for(const side of [-1,1])addMesh(group,new THREE.BoxGeometry(18,6,16),material(0x313a32,.5,.3),side*13,0,14);
  const nose=addMesh(group,new THREE.ConeGeometry(9,20,8),material(0xd0a551,.36,.25),0,0,-27);nose.rotation.x=-Math.PI/2;
  const blast=new THREE.Mesh(new THREE.TorusGeometry(1,.035,6,40),new THREE.MeshBasicMaterial({color:0xffc45b,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
  blast.rotation.x=Math.PI/2;blast.visible=false;group.add(blast);group.userData.bomb=body;group.userData.blast=blast;return group;
}
function syncLayer(name,entries,create,place){
  const group=entityLayer(name),alive=new Set();
  for(const [id,item]of entries){
    if(!item||!Number.isFinite(Number(item.x))||!Number.isFinite(Number(item.y)))continue;
    alive.add(String(id));let mesh=group.getObjectByName(String(id));
    if(!mesh){mesh=create(item);mesh.name=String(id);group.add(mesh);}
    place(mesh,item);
  }
  for(const child of [...group.children])if(!alive.has(child.name)){child.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];for(const mat of materials){mat.map?.dispose();mat.dispose();}}});group.remove(child);}
}
function syncTraces(traces){
  const now=Date.now(),alive=new Set();
  for(const trace of traces||[]){
    const id=`${trace.time}:${trace.x1}:${trace.y1}:${trace.x2}:${trace.y2}`;alive.add(id);
    if(!traceMeshes.has(id)){
      const start=new THREE.Vector3(trace.x1,Number(trace.height)||76,trace.y1),end=new THREE.Vector3(trace.x2,Number(trace.height)||76,trace.y2);
      const direction=end.clone().sub(start),length=Math.max(.1,direction.length()),mesh=new THREE.Group();
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(3.2,1.3,length,7),new THREE.MeshBasicMaterial({color:trace.color||0xffdf8b,transparent:true,opacity:.96,toneMapped:false,depthWrite:false}));
      beam.position.copy(start).add(end).multiplyScalar(.5);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.add(beam);
      const impact=new THREE.Mesh(new THREE.SphereGeometry(7,8,6),new THREE.MeshBasicMaterial({color:0xfff0a3,toneMapped:false}));impact.position.copy(end);impact.visible=!!trace.impact;mesh.add(impact);
      scene.add(mesh);traceMeshes.set(id,{mesh,time:trace.time});
    }
  }
  for(const [id,item]of traceMeshes)if(now-item.time>140||!alive.has(id)){
    item.mesh.traverse(object=>{if(object.geometry)object.geometry.dispose();object.material?.dispose();});scene.remove(item.mesh);traceMeshes.delete(id);
  }
}
function laserWallDistance(origin,direction,maxDistance,obstacles){
  let nearest=maxDistance;
  for(const obstacle of obstacles||[]){
    const minX=Number(obstacle.x),minY=Number(obstacle.y),maxX=minX+Number(obstacle.w||0),maxY=minY+Number(obstacle.h||0);
    if(!Number.isFinite(minX+minY+maxX+maxY)||maxX<=minX||maxY<=minY)continue;
    let enter=0,exit=nearest,blocked=false;
    for(const [position,velocity,min,max]of [[origin.x,direction.x,minX,maxX],[origin.y,direction.y,minY,maxY]]){
      if(Math.abs(velocity)<1e-6){if(position<min||position>max){blocked=true;break;}continue;}
      let first=(min-position)/velocity,last=(max-position)/velocity;
      if(first>last)[first,last]=[last,first];
      enter=Math.max(enter,first);exit=Math.min(exit,last);
      if(enter>exit){blocked=true;break;}
    }
    if(!blocked&&exit>=0&&enter<nearest)nearest=Math.max(0,enter);
  }
  return nearest;
}
function syncWeaponLasers(detail,state,localPosition){
  const active=new Set(),entries=Object.entries(state.players||{}).filter(([,player])=>player?.online&&
    !player.transportId&&!player.vehicle&&Array.isArray(player.attachments)&&player.attachments.some(id=>id==='laser_red'||id==='laser_tac'));
  for(const [id,player]of entries){
    const self=id===detail.playerKey,position=self?localPosition:player;
    if(!position||Math.hypot(Number(position.x)-camera.position.x,Number(position.y)-camera.position.z)>2600)continue;
    const attachmentIds=self?(detail.weapon?.attachmentIds||player.attachments):player.attachments;
    const red=attachmentIds.includes('laser_red'),color=red?0xff3048:0x84ffbd;
    let angle=Number(player.facingAngle)||0;
    if(self){
      if(detail.aim){const dx=Number(detail.aim.x)-Number(position.x),dy=Number(detail.aim.y)-Number(position.y);if(Math.hypot(dx,dy)>20)angle=Math.atan2(dy,dx);}
      else angle=-Number(detail.viewYaw||0)-Math.PI/2;
    }
    const origin={x:Number(position.x)+Math.cos(angle)*38,y:Number(position.y)+Math.sin(angle)*38};
    const direction={x:Math.cos(angle),y:Math.sin(angle)},length=laserWallDistance(origin,direction,Number(detail.weapon?.range)||720,detail.mapObstacles);
    const end={x:origin.x+direction.x*length,y:origin.y+direction.y*length};
    let beam=laserMeshes.get(id);
    if(!beam){
      const group=new THREE.Group(),core=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,1,6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));
      const glow=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,1,6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.22,depthWrite:false,toneMapped:false}));
      group.add(glow,core);scene.add(group);beam={group,core,glow};laserMeshes.set(id,beam);
    }
    active.add(id);beam.core.material.color.setHex(color);beam.glow.material.color.setHex(color);
    const startPoint=new THREE.Vector3(origin.x,72,origin.y),endPoint=new THREE.Vector3(end.x,72,end.y),vector=endPoint.clone().sub(startPoint),beamLength=Math.max(.1,vector.length()),rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),vector.normalize());
    for(const mesh of [beam.core,beam.glow]){mesh.position.copy(startPoint).add(endPoint).multiplyScalar(.5);mesh.scale.y=beamLength;mesh.quaternion.copy(rotation);}
  }
  for(const [id,beam]of laserMeshes)if(!active.has(id)){scene.remove(beam.group);beam.group.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});laserMeshes.delete(id);}
}
function syncMuzzleFlash(flashes){
  if(!muzzleFlashMesh||!muzzleLight)return;
  const latest=(flashes||[]).reduce((newest,flash)=>Math.max(newest,Number(flash.time)||0),0),age=Date.now()-latest;
  const intensity=latest&&age>=-30&&age<95?Math.max(0,1-Math.max(0,age)/95):0;
  muzzleFlashMesh.visible=intensity>0;muzzleFlashMesh.material.opacity=intensity;
  muzzleFlashMesh.scale.setScalar(1+intensity*1.8);muzzleLight.intensity=intensity*5;
}
function syncGrapple(detail,position){
  const anchor=detail.grapplePull;
  if(!grappleLine||!anchor||!position){if(grappleLine)grappleLine.visible=false;return;}
  grappleLine.visible=true;
  const vertices=grappleLine.geometry.attributes.position;
  vertices.setXYZ(0,Number(position.x),68,Number(position.y));
  vertices.setXYZ(1,Number(anchor.x),68,Number(anchor.y));vertices.needsUpdate=true;
  grappleLine.geometry.computeBoundingSphere();grappleLine.material.opacity=.7+Math.sin(Date.now()/55)*.2;
}
function syncArmorPulse(remaining){
  if(!armorShield)return;
  const intensity=Math.max(0,Math.min(1,Number(remaining)/900));
  armorShield.visible=intensity>0;armorShield.material.opacity=intensity*.82;
  armorShield.scale.setScalar(.65+(1-intensity)*1.05);
}
function setThermalVision(mesh,enabled,enemy){
  if(!mesh.userData.thermalOriginals){
    mesh.userData.thermalOriginals=[];
    mesh.traverse(object=>{
      if(!object.isMesh)return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      for(const mat of materials)if(mat.color)mesh.userData.thermalOriginals.push({mat,color:mat.color.clone(),emissive:mat.emissive?.clone()||null});
    });
  }
  for(const entry of mesh.userData.thermalOriginals){
    entry.mat.color.copy(enabled?(enemy?new THREE.Color(0xff643f):new THREE.Color(0x43d3c4)):entry.color);
    if(entry.mat.emissive)entry.mat.emissive.copy(enabled?(enemy?new THREE.Color(0xff391e):new THREE.Color(0x176f70)):entry.emissive||new THREE.Color(0));
    if(entry.mat.emissive)entry.mat.emissiveIntensity=enabled?1.8:.7;
  }
}
function syncScopeOverlay(detail,remote){
  const active=!!detail.aimMode&&!remote,optic=detail.opticId||'';
  scopeOverlay.hidden=!active;scopeOverlay.dataset.scope=optic.replace('optic_','')||'iron';
  if(!active)return;
  const label=optic==='optic_variable'?`${Number(detail.scopeZoom||1).toFixed(1)}×`:
    optic==='optic_3x'?'3×':optic==='optic_thermal'?'THERMAL':optic==='optic_holo'?'HOLO':optic==='optic_reflex'?'REFLEX':'IRON';
  scopeReadout.textContent=label;
}
function syncSupportTarget(detail,position){
  const active=!!detail.supportTargeting&&!!detail.aim&&!!position;
  supportMarker.visible=active;supportBeam.visible=active;
  if(!active)return;
  const color=detail.supportTargeting==='bunker_buster'?0xc9d878:0xffbf55;
  supportMarker.material.color.setHex(color);supportBeam.material.color.setHex(color);
  supportMarker.position.set(Number(detail.aim.x),5,Number(detail.aim.y));
  const points=supportBeam.geometry.attributes.position;
  points.setXYZ(0,Number(position.x),76,Number(position.y));points.setXYZ(1,Number(detail.aim.x),76,Number(detail.aim.y));
  points.needsUpdate=true;supportBeam.geometry.computeBoundingSphere();supportBeam.computeLineDistances();
  supportMarker.rotation.z=Date.now()/850;
}
function failRenderer(error){
  rendererUnavailable=true;window.dropzone3DActive=false;
  renderer?.dispose();renderer=null;
  canvas?.remove();canvas=null;
  wrap?.classList.remove('dropzone-3d-ready');wrap?.classList.add('nexus-war-3d-fallback');
  wrap?.querySelectorAll('.nexus-war-scope-overlay,.nexus-war-3d-reticle').forEach(element=>element.remove());
  const status=document.querySelector('[data-war-status]');
  if(status)status.textContent='3D view failed; showing tactical fallback. '+(error?.message||'Unknown renderer error');
  console.error('[Dropzone 3D] Rendering failed; restored the tactical fallback.',error);
}
function updateRelayOwners(state){
  scene.traverse(object=>{
    if(!object.userData.nodeId)return;
    const node=state.nodes?.[object.userData.nodeId],owner=node?.owner||node?.team||node?.ownerTeam,color=teamColors[owner]||teamColors.neutral;
    object.userData.ring.material.color.setHex(color);object.userData.pennant.material.color.setHex(color);
  });
}
function renderFrame(detail){
  createRenderer();if(!renderer||!detail?.warState)return;
  buildWorld(detail);
  const state=detail.warState,player=state.players?.[detail.playerKey],remote=detail.activeDrone&&state.drones?.[detail.playerKey];
  const position=remote?detail.localDronePosition||remote:detail.localPosition||detail.cameraPosition;
  if(!position)return;
  const vehicle=player?.transportId&&state.vehicles?.[player.transportId];
  const rideType=vehicle?.type||player?.vehicle||'';
  const cameraHeight=remote?(remote.type==='rc_car'||remote.type==='mini_rc_car'?52:105):/helicopter|apache/.test(rideType)?120+(Number(vehicle?.altitude)||0)*.65:rideType?110:detail.houseInside?90:76;
  camera.position.set(Number(position.x),cameraHeight,Number(position.y));
  const optic=detail.opticId||'';
  const magnification=!detail.aimMode||remote?1:optic==='optic_variable'?Math.max(1,Math.min(8,Number(detail.scopeZoom)||1)):
    optic==='optic_3x'?3:optic==='optic_thermal'?2.5:optic==='optic_holo'?1.5:optic==='optic_reflex'?1.4:optic==='optic_iron'?1.2:1.45;
  const nextFov=76/magnification;
  if(Math.abs(camera.fov-nextFov)>.01){camera.fov=nextFov;camera.updateProjectionMatrix();}
  camera.rotation.order='YXZ';camera.rotation.set(Number(detail.viewPitch)||0,Number(detail.viewYaw)||0,0);
  updateWeaponModel(remote||detail.hasVehicleWeapon?null:detail.weapon);
  syncScopeOverlay(detail,!!remote);
  const visiblePlayers=Object.entries(state.players||{}).filter(([id,item])=>id!==detail.playerKey&&item?.online&&Date.now()-Number(item.lastSeen||0)<20000&&!item.transportId);
  const thermal=!!detail.aimMode&&optic==='optic_thermal';
  syncLayer('players',visiblePlayers,(item)=>makeSoldier(item.team),(mesh,item)=>{
    mesh.position.set(Number(item.x),0,Number(item.y));mesh.rotation.y=-(Number(item.facingAngle)||0)-Math.PI/2;
    setThermalVision(mesh,thermal,item.team!==detail.playerTeam);
  });
  const vehicles=Object.entries(state.vehicles||{}).map(([id,item])=>{
    const driver=Object.entries(state.players||{}).find(([,candidate])=>candidate?.vehicleId===id&&candidate.vehicle&&!candidate.transportId);
    if(!driver||item.parked)return[id,item];
    const position=driver[0]===detail.playerKey?detail.localPosition||driver[1]:driver[1];
    return[id,{...item,x:Number(position.x),y:Number(position.y),facingAngle:Number(driver[1].facingAngle)||Number(item.facingAngle)||0}];
  });
  syncLayer('vehicles',vehicles,(item)=>makeVehicle(item.type,item.team,item.colors),(mesh,item)=>{mesh.position.set(Number(item.x),Math.max(0,Number(item.altitude)||0)*.65,Number(item.y));mesh.rotation.y=-(Number(item.facingAngle)||0)-Math.PI/2;});
  syncLayer('turrets',Object.entries(state.turrets||{}),()=>{const group=new THREE.Group();addMesh(group,new THREE.CylinderGeometry(38,48,50,10),material(0x71836f,.5,.4),0,25,0);addMesh(group,new THREE.CylinderGeometry(9,12,75,8),material(0x303a33,.35,.65),0,66,-28).rotation.x=-Math.PI/2;return group;},(mesh,item)=>{mesh.position.set(Number(item.x),0,Number(item.y));mesh.rotation.y=-(Number(item.angle)||0)-Math.PI/2;});
  syncLayer('drones',Object.entries(state.drones||{}),()=>{const group=new THREE.Group();addMesh(group,new THREE.SphereGeometry(26,12,8),material(0x8ab2a0,.35,.4,0x36b8a4),0,85,0);for(const side of [-1,1])addMesh(group,new THREE.BoxGeometry(100,5,8),material(0x35423a,.5,.4),side*54,97,0);return group;},(mesh,item)=>{mesh.position.set(Number(item.x),0,Number(item.y));mesh.rotation.y=-(Number(item.angle)||0)-Math.PI/2;});
  syncLayer('loot',Object.entries(state.lootBoxes||{}).filter(([,item])=>item?.available&&(!item.expiresAt||Number(item.expiresAt)>Date.now())),()=>makeCrate(0xb68f4d),(mesh,item)=>mesh.position.set(Number(item.x),0,Number(item.y)));
  syncLayer('plates',Object.entries(state.plateBoxes||{}).filter(([,item])=>Number(item?.uses)>0&&Number(item?.hp)>0),()=>makeCrate(0x85a4af),(mesh,item)=>mesh.position.set(Number(item.x),0,Number(item.y)));
  syncLayer('grenades',Object.entries(state.grenades||{}).filter(([,item])=>item&&Number(item.expiresAt)>Date.now()),makeBomb,(mesh,item)=>{
    const bomb=mesh.userData.bomb,blast=mesh.userData.blast,x=Number(item.targetX??item.x),z=Number(item.targetY??item.y);
    if(item.detonatedAt){
      const progress=Math.max(0,Math.min(1,(Date.now()-Number(item.detonatedAt))/Math.max(1,Number(item.expiresAt)-Number(item.detonatedAt))));
      bomb.visible=false;blast.visible=true;blast.scale.setScalar(Math.max(.01,progress*Number(item.radius||155)));blast.material.opacity=1-progress;
      mesh.position.set(x,3,z);return;
    }
    bomb.visible=true;blast.visible=false;
    const duration=Math.max(1,Number(item.detonateAt)-Number(item.createdAt)),progress=Math.max(0,Math.min(1,(Date.now()-Number(item.createdAt))/duration));
    const startX=Number(item.startX??item.x),startZ=Number(item.startY??item.y),flightX=startX+(x-startX)*progress,flightZ=startZ+(z-startZ)*progress;
    const height=['airstrike','bunker_gas'].includes(item.effect)?850*(1-progress):Math.sin(progress*Math.PI)*Math.min(180,Math.hypot(x-startX,z-startZ)*.16);
    mesh.position.set(flightX,height,flightZ);mesh.rotation.y=-Math.atan2(z-startZ,x-startX)-Math.PI/2;
  });
  syncLayer('smokes',Object.entries(state.smokes||{}),()=>{
    const group=new THREE.Group();
    for(let index=0;index<4;index++){
      const puff=new THREE.Mesh(new THREE.SphereGeometry(58+index*8,10,8),new THREE.MeshBasicMaterial({color:0xaab8ad,transparent:true,opacity:.2,depthWrite:false}));
      puff.position.set(Math.sin(index*2)*42,90+index*48,Math.cos(index*2)*42);group.add(puff);
    }
    return group;
  },(mesh,item)=>{mesh.position.set(Number(item.x),0,Number(item.y));mesh.rotation.y=Date.now()/1600;});
  syncLayer('burns',Object.entries(state.burns||{}).map(([id,burn])=>{const target=state.players?.[id];return[id,target?{...burn,x:target.x,y:target.y}:null];}),()=>{
    const group=new THREE.Group();
    for(let index=0;index<3;index++)addMesh(group,new THREE.ConeGeometry(24-index*5,90-index*12,7),new THREE.MeshBasicMaterial({color:index===0?0xff542e:index===1?0xffa43b:0xffe477,transparent:true,opacity:.78}),0,48+index*13,(index-1)*15);
    return group;
  },(mesh,item)=>{mesh.position.set(Number(item.x),0,Number(item.y));mesh.rotation.y=Date.now()/180;});
  syncLayer('gas',Object.entries(state.gasHazards||{}),()=>{const group=new THREE.Group();addMesh(group,new THREE.SphereGeometry(95,14,10),new THREE.MeshBasicMaterial({color:0x9aca55,transparent:true,opacity:.16,depthWrite:false}),0,90,0);return group;},(mesh,item)=>mesh.position.set(Number(item.x),0,Number(item.y)));
  syncLayer('fire',Object.entries(state.fireHazards||{}),()=>{const group=new THREE.Group();addMesh(group,new THREE.CylinderGeometry(82,92,12,16),new THREE.MeshBasicMaterial({color:0xff7c39,transparent:true,opacity:.55}),0,8,0);return group;},(mesh,item)=>mesh.position.set(Number(item.x),0,Number(item.y)));
  syncLayer('claymores',Object.entries(state.claymores||{}),()=>{const group=new THREE.Group();addMesh(group,new THREE.BoxGeometry(42,22,22),material(0x687450,.7),0,11,0);return group;},(mesh,item)=>mesh.position.set(Number(item.x),0,Number(item.y)));
  syncLayer('c4s',Object.entries(state.c4s||{}),()=>{const group=new THREE.Group();addMesh(group,new THREE.BoxGeometry(32,12,26),material(0x494e40,.7),0,8,0);return group;},(mesh,item)=>mesh.position.set(Number(item.x),0,Number(item.y)));
  const localBlast=detail.localExplosion&&Number(detail.localExplosion.expiresAt)>Date.now()?detail.localExplosion:null;
  syncLayer('remote-blasts',localBlast?[['local',localBlast]]:[],()=>{
    const group=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(1,.055,8,40),new THREE.MeshBasicMaterial({color:0xffaa43,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}));
    ring.rotation.x=Math.PI/2;group.add(ring);group.userData.blastRing=ring;return group;
  },(mesh,item)=>{
    const progress=Math.max(0,Math.min(1,(Date.now()-Number(item.startedAt))/Math.max(1,Number(item.expiresAt)-Number(item.startedAt))));
    mesh.position.set(Number(item.x),5,Number(item.y));mesh.userData.blastRing.scale.setScalar(Math.max(.01,Number(item.radius||180)*progress));
    mesh.userData.blastRing.material.opacity=1-progress;
  });
  updateRelayOwners(state);
  syncWeaponLasers(detail,state,position);
  syncTraces(detail.traces);
  syncMuzzleFlash(detail.muzzleFlashes);
  syncGrapple(detail,detail.localPosition);
  syncArmorPulse(detail.armorPulse);
  syncSupportTarget(detail,position);
  for(const layer of dynamicLayers.values())layer.traverse(object=>{if(object.userData.rotor)object.rotation.y+=.045;if(object.userData.tailRotor)object.rotation.z+=.08;});
  renderer.render(scene,camera);
}
window.addEventListener('dropzone:frame',event=>{
  try{renderFrame(event.detail);}catch(error){failRenderer(error);}
});
window.addEventListener('pagehide',()=>{
  resizeObserver?.disconnect();window.removeEventListener('resize',resize);renderer?.dispose();
},{once:true});
