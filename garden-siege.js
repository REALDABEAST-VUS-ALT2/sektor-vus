import * as THREE from 'three';

const $=id=>document.getElementById(id);
const canvas=$('gardenCanvas');
const farmMap=$('farmMap');
const farmMapContext=farmMap.getContext('2d');
const status=$('status');
const joinStatus=$('joinStatus');
const joinScreen=$('joinScreen');
const interactionPrompt=$('interactionPrompt');
const shopItems=$('shopItems');
const seedSelect=$('seedSelect');
const weaponSelect=$('weaponSelect');
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9bc5a0);
scene.fog=new THREE.Fog(0x9bc5a0,90,220);
scene.add(new THREE.HemisphereLight(0xe5f5da,0x405b42,2.1));
const sunlight=new THREE.DirectionalLight(0xfff0ce,2.2);sunlight.position.set(-5,12,8);scene.add(sunlight);
const camera=new THREE.PerspectiveCamera(42,1,.1,240);
scene.add(camera);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const heldWeapon=new THREE.Group();camera.add(heldWeapon);heldWeapon.visible=false;

const state={
  socket:null,roomId:'',playerId:'',roomMode:'',day:1,phase:'day',phaseRemaining:0,phaseDeadline:0,weatherDeadline:0,gardenHealth:100,
  players:new Map(),plants:new Map(),zombies:new Map(),sprinklers:new Set(),plantMeshes:new Map(),zombieMeshes:new Map(),playerMeshes:new Map(),projectileMeshes:new Map(),
  selectedTile:null,selectedSeed:'',selectedShop:'seeds',seedCategory:'all',keys:new Set(),x:0,z:4.7,lastMove:0,
  yaw:0,pitch:-.28,velocity:new THREE.Vector2(),targetX:0,targetZ:4.7,weather:'clear',ponds:[],jumpHeight:0,jumpVelocity:0,
  weatherRemaining:0,weatherKnown:false,clientId:'',trowelFrom:null,nearbyStation:'',ziplineTarget:'',ziplineRide:null,pendingPlantKey:'',
  dismissedStation:'',
  seedSignature:null,shopSignature:null,partsSignature:null,weaponSignature:'',weaponClock:0,weaponKick:0,mapDrawElapsed:0,disposed:false,
};
const seeds=[
  {id:'sunflower',name:'Sunflower',cost:20,kind:'crop',description:'Grows into a coin crop · sell for 38'},
  {id:'berry',name:'Berry Bush',cost:15,kind:'crop',description:'Fast crop · sell for 27'},
  {id:'moonberry',name:'Moonberry',cost:34,kind:'crop',description:'Four harvests · aurora mutations are especially valuable'},
  {id:'starfruit',name:'Starfruit',cost:42,kind:'crop',description:'Rare, valuable single-harvest crop'},
  {id:'pumpkin',name:'Pumpkin',cost:32,kind:'crop',description:'Hardy crop · sell for 52'},
  {id:'glowMushroom',name:'Glow Mushroom',cost:28,kind:'crop',description:'Two harvests · sells for 42 each'},
  {id:'clover',name:'Clover Patch',cost:18,kind:'crop',description:'Quick-growing lucky crop · sell for 25'},
  {id:'lavender',name:'Lavender',cost:36,kind:'crop',description:'Aromatic purple crop · sell for 48'},
  {id:'snowdrop',name:'Snowdrop',cost:40,kind:'crop',description:'Cold-hardy flower · sell for 54'},
  {id:'peashooter',name:'Pea Shooter',cost:55,kind:'attack',description:'Auto-attacks zombies · harvest to unlock the Pea Blaster + 10 ammo'},
  {id:'cornzooka',name:'Rocket Corn',cost:95,kind:'attack',description:'Splash-damage defender · harvest to unlock Rocket Corn + 2 ammo'},
  {id:'thornGuard',name:'Thorn Guard',cost:64,kind:'attack',description:'Very tough defensive plant'},
  {id:'bamboo',name:'Bamboo Stalk',cost:30,kind:'special',description:'Sell for 6 coins or craft a gun barrel'},
  {id:'reedTube',name:'Reed Tube',cost:24,kind:'special',description:'Long-range custom gun barrel'},
  {id:'magazineVine',name:'Magazine Vine',cost:38,kind:'special',description:'Adds capacity to your crafted gun'},
  {id:'pumpkinShell',name:'Pumpkin Shell',cost:31,kind:'special',description:'Adds extra capacity and protection'},
  {id:'blastCorn',name:'Blast Corn',cost:45,kind:'special',description:'Adds splash damage to custom guns'},
  {id:'pollenPod',name:'Pollen Pod',cost:37,kind:'special',description:'Adds power to a custom gun'},
  {id:'triggerBloom',name:'Trigger Bloom',cost:39,kind:'special',description:'Increases custom gun damage'},
  {id:'thornVine',name:'Thorn Vine',cost:34,kind:'special',description:'Craft a sturdy custom gun grip'},
  {id:'crystalBud',name:'Crystal Bud',cost:54,kind:'special',description:'Adds range and damage to custom guns'},
  {id:'epicSoil',name:'Epic Soil',cost:75,kind:'special',description:'Makes neighboring crops grow 30% faster'},
];
const gear=[
  {id:'wateringCan',name:'Watering Can',cost:20,description:'Water your own plant for a growth boost'},
  {id:'shovel',name:'Garden Shovel',cost:25,description:'Remove your own plant and free its plot'},
  {id:'trowel',name:'Trowel',cost:25,description:'Move your own plants to a different plot'},
  {id:'sprinkler',name:'Sprinkler',cost:45,description:'Auto-waters plants in nearby plots'},
  {id:'fertilizer',name:'Plant Fertilizer',cost:30,description:'Required to craft a garden gun'},
];
const ammoListings=[
  {id:'peaBlaster',name:'Pea Blaster ammo',cost:18,amount:10},
  {id:'cornZooka',name:'Rocket Corn ammo',cost:25,amount:2},
];
const landTiers=[
  {id:'common',name:'Common',cost:0,multiplier:1},
  {id:'uncommon',name:'Uncommon',cost:100,multiplier:1.25},
  {id:'rare',name:'Rare',cost:300,multiplier:1.6},
  {id:'epic',name:'Epic',cost:750,multiplier:2.1},
  {id:'legendary',name:'Legendary',cost:1600,multiplier:3},
];
let statusTimeout;
let weatherBannerTimer;

const farmGrid={count:8,radius:70,mapRadius:95};
function farmOffset(farmIndex){
  const angle=Math.PI/2-farmIndex*Math.PI*2/farmGrid.count;
  const radialX=Math.cos(angle),radialZ=-Math.sin(angle),tangentX=Math.sin(angle),tangentZ=Math.cos(angle);
  return{x:radialX*farmGrid.radius,z:radialZ*farmGrid.radius,angle,radialX,radialZ,tangentX,tangentZ};
}
function farmLocalPosition(offset,radial,tangent){return{x:offset.x+offset.radialX*radial+offset.tangentX*tangent,z:offset.z+offset.radialZ*radial+offset.tangentZ*tangent};}
function gardenPlotKey(tile){return`${tile.farmIndex}:${tile.col}:${tile.row}`;}
function gardenTileFromKey(value){
  const parts=String(value||'').split(':').map(Number);
  if(parts.length===2)parts.unshift(0);
  if(parts.length!==3||!parts.every(Number.isInteger)||parts[0]<0||parts[0]>=farmGrid.count||parts[1]<0||parts[1]>=6||parts[2]<0||parts[2]>=4)return null;
  const offset=farmOffset(parts[0]),radial=(parts[1]-2.5)*1.8,tangent=(parts[2]-1.5)*1.8;
  const position=farmLocalPosition(offset,radial,tangent);
  return {farmIndex:parts[0],col:parts[1],row:parts[2],...position};
}
const floor=new THREE.Mesh(new THREE.CylinderGeometry(farmGrid.mapRadius,farmGrid.mapRadius,.2,72),new THREE.MeshStandardMaterial({color:0x507944,roughness:1}));
floor.position.set(0,-.26,0);floor.receiveShadow=true;scene.add(floor);
const mapRim=new THREE.Mesh(new THREE.TorusGeometry(farmGrid.mapRadius,.2,8,96),new THREE.MeshStandardMaterial({color:0x5e4932,roughness:.9}));
mapRim.rotation.x=Math.PI/2;mapRim.position.y=-.05;scene.add(mapRim);
const pathMaterial=new THREE.MeshStandardMaterial({color:0x9b865d,roughness:1});
function makeRadialPath(offset,startRadius,endRadius,width){
  const length=endRadius-startRadius,path=new THREE.Mesh(new THREE.BoxGeometry(length,.035,width),pathMaterial);
  path.rotation.y=offset.angle;path.position.set(offset.radialX*(startRadius+length/2),-.12,offset.radialZ*(startRadius+length/2));scene.add(path);
}
for(let farmIndex=0;farmIndex<farmGrid.count;farmIndex++){
  makeRadialPath(farmOffset(farmIndex),5.5,farmGrid.radius-6.7,2.4);
}
const ziplineCurves=[];
const ziplineMaterial=new THREE.MeshStandardMaterial({color:0x344c49,metalness:.7,roughness:.3,emissive:0x102e2a,emissiveIntensity:.3});
function makeZiplineTower(offset,radius){
  const tower=new THREE.Group();
  const foot=new THREE.Mesh(new THREE.CylinderGeometry(.42,.52,.24,10),new THREE.MeshStandardMaterial({color:0x7a6040}));foot.position.y=.12;tower.add(foot);
  const post=new THREE.Mesh(new THREE.BoxGeometry(.24,6.1,.24),new THREE.MeshStandardMaterial({color:0x59645b,metalness:.55,roughness:.38}));post.position.y=3.15;tower.add(post);
  const crossbar=new THREE.Mesh(new THREE.BoxGeometry(1.7,.22,.24),new THREE.MeshStandardMaterial({color:0x778776,metalness:.48,roughness:.36}));crossbar.position.y=6.15;tower.add(crossbar);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),new THREE.MeshBasicMaterial({color:0x80e8d1}));lamp.position.set(0,6.35,0);tower.add(lamp);
  tower.position.set(offset.radialX*radius,0,offset.radialZ*radius);tower.rotation.y=offset.angle;scene.add(tower);
}
for(let farmIndex=0;farmIndex<farmGrid.count;farmIndex++){
  const offset=farmOffset(farmIndex),farmEndpoint=farmGrid.radius-6.7,hubEndpoint=8;
  const points=[
    new THREE.Vector3(offset.radialX*hubEndpoint,6.2,offset.radialZ*hubEndpoint),
    new THREE.Vector3(offset.radialX*23,16,offset.radialZ*23),
    new THREE.Vector3(offset.radialX*47,16,offset.radialZ*47),
    new THREE.Vector3(offset.radialX*farmEndpoint,6.2,offset.radialZ*farmEndpoint),
  ];
  const curve=new THREE.CatmullRomCurve3(points);ziplineCurves.push(curve);
  const cable=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.045,7,false),ziplineMaterial);scene.add(cable);
  makeZiplineTower(offset,hubEndpoint);makeZiplineTower(offset,farmEndpoint);
}
const garden=new THREE.Group();scene.add(garden);
const plotMaterial=new THREE.MeshStandardMaterial({color:0x704b31,roughness:1});
const plotEdgeMaterial=new THREE.MeshStandardMaterial({color:0x9a7045,roughness:1});
const plotMeshes=[];
const farmGroundMaterials=[0x658449,0x71884b,0x5e7d49,0x74884e].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
const farmFenceMaterial=new THREE.MeshStandardMaterial({color:0x805b3d,roughness:1});
for(let farmIndex=0;farmIndex<farmGrid.count;farmIndex++){
  const offset=farmOffset(farmIndex);
  const farmGround=new THREE.Mesh(new THREE.BoxGeometry(13.4,.04,10.2),farmGroundMaterials[farmIndex%farmGroundMaterials.length]);
  farmGround.rotation.y=offset.angle;farmGround.position.set(offset.x,-.135,offset.z);farmGround.receiveShadow=true;garden.add(farmGround);
  const borderPieces=[
    {w:13.6,h:.22,d:.18,x:0,z:-5.15},
    {w:13.6,h:.22,d:.18,x:0,z:5.15},
    {w:.18,h:.22,d:3.1,x:-6.8,z:-3.55},
    {w:.18,h:.22,d:3.1,x:-6.8,z:3.55},
    {w:.18,h:.22,d:10.4,x:6.8,z:0},
  ];
  for(const piece of borderPieces){const fence=new THREE.Mesh(new THREE.BoxGeometry(piece.w,piece.h,piece.d),farmFenceMaterial);const position=farmLocalPosition(offset,piece.x,piece.z);fence.position.set(position.x,-.04,position.z);fence.rotation.y=offset.angle;garden.add(fence);}
  const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=64;
  const signContext=signCanvas.getContext('2d');signContext.fillStyle='#19251e';signContext.fillRect(0,0,256,64);
  signContext.strokeStyle='#c9d995';signContext.lineWidth=4;signContext.strokeRect(3,3,250,58);
  signContext.fillStyle='#f4f4dc';signContext.font='bold 30px sans-serif';signContext.textAlign='center';signContext.textBaseline='middle';signContext.fillText(`FARM ${farmIndex+1}`,128,33);
  const sign=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(signCanvas),depthTest:false}));
  const signPosition=farmLocalPosition(offset,-5.8,0);sign.position.set(signPosition.x,2.1,signPosition.z);sign.scale.set(3,.75,1);garden.add(sign);
  for(let row=0;row<4;row++)for(let col=0;col<6;col++){
    const tile=new THREE.Mesh(new THREE.BoxGeometry(1.7,.12,1.7),plotMaterial.clone());
    const position=farmLocalPosition(offset,(col-2.5)*1.8,(row-1.5)*1.8);
    tile.position.set(position.x,-.04,position.z);tile.rotation.y=offset.angle;tile.receiveShadow=true;tile.userData={farmIndex,col,row};garden.add(tile);plotMeshes.push(tile);
    const edge=new THREE.Mesh(new THREE.BoxGeometry(1.78,.06,1.78),plotEdgeMaterial);
    edge.position.set(tile.position.x,-.12,tile.position.z);edge.rotation.y=offset.angle;garden.add(edge);
  }
}
const selectionHighlight=new THREE.Mesh(new THREE.BoxGeometry(1.82,.045,1.82),new THREE.MeshBasicMaterial({color:0xf2d56c,transparent:true,opacity:.65}));
selectionHighlight.visible=false;garden.add(selectionHighlight);
function marketStall(x,z,title,color,rotation=0){
  const stall=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.15,.85),new THREE.MeshStandardMaterial({color:0x795b3f}));
  body.position.y=.62;stall.add(body);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(2,.2,1.1),new THREE.MeshStandardMaterial({color}));
  roof.position.y=1.35;stall.add(roof);
  const sign=document.createElement('canvas');sign.width=256;sign.height=64;
  const context=sign.getContext('2d');context.fillStyle='#19251e';context.fillRect(0,0,256,64);
  context.fillStyle='#f4f4dc';context.font='bold 30px sans-serif';context.textAlign='center';context.fillText(title,128,42);
  const texture=new THREE.CanvasTexture(sign);
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.36),new THREE.MeshBasicMaterial({map:texture}));
  plate.position.set(0,1.05,-.44);stall.add(plate);stall.position.set(x,0,z);stall.rotation.y=rotation;scene.add(stall);
}
marketStall(0,-4.1,'SEEDS',0x69a953,Math.PI);
marketStall(4.1,0,'GEAR',0x5489a0,Math.PI/2);
marketStall(0,4.1,'SELL',0xb8834d);
marketStall(-4.1,0,'LANDS',0x9b69a9,-Math.PI/2);
marketStall(0,0,'GUN CRAFT',0x8c65be);
const workbenchMetal=new THREE.MeshStandardMaterial({color:0x70858a,metalness:.65,roughness:.3});
const barrelMesh=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.8,12),workbenchMetal);
barrelMesh.rotation.z=Math.PI/2;barrelMesh.position.set(0,1.55,.85);scene.add(barrelMesh);
const barrelTip=new THREE.Mesh(new THREE.TorusGeometry(.105,.025,8,16),new THREE.MeshStandardMaterial({color:0x8de4cb,emissive:0x39ad8c,emissiveIntensity:.7}));
barrelTip.rotation.y=Math.PI/2;barrelTip.position.set(.42,1.55,.85);scene.add(barrelTip);
const workbenchGrip=new THREE.Mesh(new THREE.BoxGeometry(.2,.38,.2),new THREE.MeshStandardMaterial({color:0x73934d}));
workbenchGrip.position.set(-.12,1.32,.85);workbenchGrip.rotation.z=-.28;scene.add(workbenchGrip);
const workbenchCrystals=new THREE.Mesh(new THREE.OctahedronGeometry(.2),new THREE.MeshStandardMaterial({color:0x9c7dff,emissive:0x6341d8,emissiveIntensity:.7}));
workbenchCrystals.position.set(.08,1.78,.85);scene.add(workbenchCrystals);
const gardenStalls=[
  {id:'seeds',title:'Seeds stall',x:0,z:-4.1},
  {id:'gear',title:'Gear stall',x:4.1,z:0},
  {id:'sell',title:'Sell stall',x:0,z:4.1},
  {id:'lands',title:'Land stall',x:-4.1,z:0},
  {id:'workbench',title:'Gun making station',x:0,z:0},
];
function gardenPositionBlocked(x,z){
  if(Array.from(state.plants.values()).some(plant=>Math.hypot(x-plant.x,z-plant.z)<.82))return true;
  if(gardenStalls.some(stall=>Math.hypot(x-stall.x,z-stall.z)<1.8))return true;
  return state.ponds.some(pond=>Math.hypot(x-pond.x,z-pond.z)<1.9);
}
for(const [x,z]of [[-8,4],[8,4]]){
  const pond=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.4,.2,24),new THREE.MeshStandardMaterial({color:0x438fa0,roughness:.25,metalness:.1}));
  pond.position.set(x,-.03,z);scene.add(pond);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.12,8,24),new THREE.MeshStandardMaterial({color:0xb6d2a0}));
  ring.rotation.x=Math.PI/2;ring.position.set(x,.08,z);scene.add(ring);
}
const rainCount=520,rainPositions=new Float32Array(rainCount*6),rainGeometry=new THREE.BufferGeometry();
rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
const rainLines=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:0xc2e7ff,transparent:true,opacity:.48,depthWrite:false}));
rainLines.frustumCulled=false;rainLines.visible=false;scene.add(rainLines);
const snowCount=700,snowPositions=new Float32Array(snowCount*3),snowGeometry=new THREE.BufferGeometry();
snowGeometry.setAttribute('position',new THREE.BufferAttribute(snowPositions,3));
const snowflakes=new THREE.Points(snowGeometry,new THREE.PointsMaterial({color:0xf0f8ff,size:.24,transparent:true,opacity:.8,depthWrite:false,sizeAttenuation:true}));
snowflakes.frustumCulled=false;snowflakes.visible=false;scene.add(snowflakes);
function randomWeatherPosition(height){
  const angle=Math.random()*Math.PI*2,radius=Math.sqrt(Math.random())*62;
  return{x:state.x+Math.cos(angle)*radius,y:Math.random()*height+4,z:state.z+Math.sin(angle)*radius};
}
function resetWeatherParticles(){
  for(let index=0;index<rainCount;index++){
    const point=randomWeatherPosition(48),base=index*6;
    rainPositions[base]=point.x;rainPositions[base+1]=point.y;rainPositions[base+2]=point.z;
    rainPositions[base+3]=point.x-.12;rainPositions[base+4]=point.y-.9;rainPositions[base+5]=point.z-.08;
  }
  rainGeometry.attributes.position.needsUpdate=true;
  for(let index=0;index<snowCount;index++){
    const point=randomWeatherPosition(38),base=index*3;
    snowPositions[base]=point.x;snowPositions[base+1]=point.y;snowPositions[base+2]=point.z;
  }
  snowGeometry.attributes.position.needsUpdate=true;
}
resetWeatherParticles();
const cloudMaterial=new THREE.MeshStandardMaterial({color:0xf1f3eb,transparent:true,opacity:.34,roughness:1,depthWrite:false});
const clouds=[];
for(let cloudIndex=0;cloudIndex<16;cloudIndex++){
  const cloud=new THREE.Group(),angle=cloudIndex*Math.PI*2/16,radius=24+(cloudIndex%4)*15;
  for(let puff=0;puff<5;puff++){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),cloudMaterial);
    mesh.position.set((puff-2)*2.1,Math.sin(puff*2+cloudIndex)*.4,Math.cos(puff*1.7)*1.3);
    mesh.scale.set(3.2+(puff%2)*.7,1.2+(puff%3)*.2,1.8);cloud.add(mesh);
  }
  cloud.position.set(Math.cos(angle)*radius,23+(cloudIndex%3)*2,Math.sin(angle)*radius);cloud.userData.wind=.15+(cloudIndex%4)*.06;scene.add(cloud);clouds.push(cloud);
}
const rainbowGroup=new THREE.Group();
const rainbowColors=[0xf34545,0xff9838,0xffdf55,0x68d16f,0x52a9ff,0x7164d9,0xc96cdf];
for(let index=0;index<rainbowColors.length;index++){
  const lift=index*.42,points=[new THREE.Vector3(-26,8+lift,0),new THREE.Vector3(-22,25+lift,0),new THREE.Vector3(0,34+lift,0),new THREE.Vector3(22,25+lift,0),new THREE.Vector3(26,8+lift,0)];
  const curve=new THREE.CatmullRomCurve3(points);
  rainbowGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve,48,.3,7,false),new THREE.MeshBasicMaterial({color:rainbowColors[index],transparent:true,opacity:.78,depthWrite:false})));
}
rainbowGroup.visible=false;scene.add(rainbowGroup);
function drawFarmMap(){
  const context=farmMapContext,size=farmMap.width,center=size/2,scale=(center-12)/farmGrid.mapRadius;
  context.clearRect(0,0,size,size);context.save();context.beginPath();context.arc(center,center,center-2,0,Math.PI*2);context.clip();
  context.fillStyle='#618c43';context.fillRect(0,0,size,size);
  context.lineCap='round';context.strokeStyle='#b89d69';context.lineWidth=2.4*scale;
  for(let farmIndex=0;farmIndex<farmGrid.count;farmIndex++){
    const offset=farmOffset(farmIndex);
    context.beginPath();context.moveTo(center+offset.radialX*5.5*scale,center+offset.radialZ*5.5*scale);context.lineTo(center+offset.radialX*11.1*scale,center+offset.radialZ*11.1*scale);context.stroke();
  }
  for(let farmIndex=0;farmIndex<farmGrid.count;farmIndex++){
    const offset=farmOffset(farmIndex);context.save();context.translate(center+offset.x*scale,center+offset.z*scale);context.rotate(-offset.angle);
    context.fillStyle=['#7b8951','#71834a','#687f48','#7d8c51'][farmIndex%4];context.fillRect(-6.7*scale,-5.1*scale,13.4*scale,10.2*scale);
    context.strokeStyle='#d2c294';context.lineWidth=1.2;context.strokeRect(-6.7*scale,-5.1*scale,13.4*scale,10.2*scale);
    context.strokeStyle='rgba(55,46,29,.48)';context.lineWidth=.6;
    for(let col=0;col<=6;col++){const x=(-5.4+col*1.8)*scale;context.beginPath();context.moveTo(x,-3.6*scale);context.lineTo(x,3.6*scale);context.stroke();}
    for(let row=0;row<=4;row++){const z=(-3.6+row*1.8)*scale;context.beginPath();context.moveTo(-5.4*scale,z);context.lineTo(5.4*scale,z);context.stroke();}
    context.fillStyle='#fff4c4';context.font='bold 8px sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(String(farmIndex+1),-5.8*scale,0);
    context.restore();
  }
  const standColors={seeds:'#69a953',gear:'#5489a0',sell:'#b8834d',lands:'#9b69a9',workbench:'#8c65be'};
  for(const stall of gardenStalls){context.fillStyle=standColors[stall.id];context.fillRect(center+stall.x*scale-3,center+stall.z*scale-3,6,6);}
  for(const player of state.players.values()){
    const playerX=player.id===state.playerId?state.x:player.x,playerZ=player.id===state.playerId?state.z:player.z;
    const x=center+playerX*scale,y=center+playerZ*scale;context.beginPath();context.arc(x,y,player.id===state.playerId?3.5:2.5,0,Math.PI*2);
    context.fillStyle=player.id===state.playerId?'#fff':player.color;context.fill();
  }
  context.restore();context.beginPath();context.arc(center,center,center-2,0,Math.PI*2);context.strokeStyle='rgba(230,241,207,.7)';context.lineWidth=2;context.stroke();
}

function addMutationVisual(group,mutation){
  const styles={
    aurora:{label:'AURORA',color:0x67f2d1,text:'#c5fff2'},
    solarFlare:{label:'SOLAR FLARE',color:0xffad48,text:'#ffe2a3'},
    fireworks:{label:'FIREWORKS',color:0xff70bc,text:'#ffd1e8'},
  };
  const style=styles[mutation];
  if(!style)return;
  const effects=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.43,.025,6,32),new THREE.MeshBasicMaterial({color:style.color,transparent:true,opacity:.8}));
  ring.rotation.x=Math.PI/2;ring.position.y=.05;effects.add(ring);
  const motes=[];
  for(let index=0;index<4;index++){
    const mote=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color:style.color}));
    mote.userData.orbitIndex=index;effects.add(mote);motes.push(mote);
  }
  const badge=document.createElement('canvas');badge.width=256;badge.height=64;
  const context=badge.getContext('2d');
  context.fillStyle='rgba(12,22,20,.9)';context.beginPath();context.roundRect(3,3,250,58,18);context.fill();
  context.strokeStyle=`#${style.color.toString(16).padStart(6,'0')}`;context.lineWidth=3;context.stroke();
  context.fillStyle=style.text;context.font='bold 22px system-ui';context.textAlign='center';context.textBaseline='middle';context.fillText(style.label,128,32);
  const texture=new THREE.CanvasTexture(badge);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  label.position.y=1.42;label.scale.set(1.05,.27,1);effects.add(label);
  effects.userData={ring,motes,elapsed:0,label};
  group.userData.mutation=mutation;group.userData.mutationEffects=effects;group.add(effects);
}

function addPlantLabel(group,type){
  const plant=seeds.find(item=>item.id===type);
  if(!plant)return;
  const labelCanvas=document.createElement('canvas');labelCanvas.width=384;labelCanvas.height=72;
  const context=labelCanvas.getContext('2d');
  const special=plant.kind==='special';
  context.fillStyle='rgba(12,24,18,.94)';context.beginPath();context.roundRect(2,2,380,68,18);context.fill();
  context.strokeStyle=special?'#c8e585':'#f0d788';context.lineWidth=3;context.stroke();
  const texture=new THREE.CanvasTexture(labelCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.position.y=2;sprite.scale.set(2.15,.4,1);sprite.renderOrder=10;group.add(sprite);
  group.userData.plantLabel={name:plant.name,canvas:labelCanvas,context,texture,sprite,text:''};
}
function updatePlantLabels(){
  const now=Date.now();
  for(const mesh of state.plantMeshes.values()){
    const plant=mesh.userData.plantData,label=mesh.userData.plantLabel;
    if(!plant||!label)continue;
    const seconds=Math.max(0,Math.ceil((plant.matureAt-now)/1000));
    const timer=seconds?`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:'READY';
    const text=`${label.name.toUpperCase()} · ${timer}`;
    if(text===label.text)continue;
    label.text=text;label.context.clearRect(0,0,label.canvas.width,label.canvas.height);
    label.context.fillStyle='rgba(12,24,18,.94)';label.context.beginPath();label.context.roundRect(2,2,380,68,18);label.context.fill();
    label.context.strokeStyle=seeds.find(item=>item.name===label.name)?.kind==='special'?'#c8e585':'#f0d788';label.context.lineWidth=3;label.context.stroke();
    label.context.fillStyle='#f4f4dc';label.context.font='bold 20px system-ui';label.context.textAlign='center';label.context.textBaseline='middle';label.context.fillText(text,192,36);
    label.texture.needsUpdate=true;
  }
}
function addSpecialPlantSignature(group,type){
  const colors={bamboo:0xc2dc64,reedTube:0xd9ce81,magazineVine:0x70dc7c,pumpkinShell:0xffa64d,blastCorn:0xffd24f,pollenPod:0xffdf70,triggerBloom:0xff83ac,thornVine:0x7fca64,crystalBud:0x8da7ff,epicSoil:0x68e8de};
  const color=colors[type];if(!color)return;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.56,.035,7,28),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.88}));
  ring.rotation.x=Math.PI/2;ring.position.y=.035;group.add(ring);
  for(let index=0;index<4;index++){
    const angle=index*Math.PI/2;
    const mote=new THREE.Mesh(new THREE.OctahedronGeometry(.065),new THREE.MeshBasicMaterial({color}));
    mote.position.set(Math.cos(angle)*.48,.2,Math.sin(angle)*.48);group.add(mote);
  }
}

function makeFlower(type,mutation=''){
  const group=new THREE.Group();
  group.userData.mutation=mutation||'';
  const material=(color,roughness=.72,emissive=0)=>new THREE.MeshStandardMaterial({color,roughness,emissive,emissiveIntensity:emissive?1.4:0});
  const leaf=(x,y,z,rotation,color=0x5cae54,scale=1)=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),material(color));
    mesh.scale.set(scale,.3,scale*1.6);mesh.position.set(x,y,z);mesh.rotation.z=rotation;group.add(mesh);return mesh;
  };
  const createStem=(height=.65,color=0x45874a,radius=.065)=>{
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.75,radius,height,9),material(color));
    mesh.position.y=height/2;mesh.castShadow=true;group.add(mesh);return mesh;
  };
  const stem=createStem;
  const bud=(x,y,z,size,color,glow=false)=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(size,12,9),material(color,.32,glow?color:0));
    mesh.position.set(x,y,z);group.add(mesh);return mesh;
  };
  const petalRing=(y,radius,count,color,size=.13)=>{
    for(let i=0;i<count;i++){
      const angle=i*Math.PI*2/count;
      const petal=new THREE.Mesh(new THREE.SphereGeometry(size,9,7),material(color));
      petal.scale.set(.72,1.1,1.35);petal.position.set(Math.cos(angle)*radius,y,Math.sin(angle)*radius);
      petal.rotation.y=-angle;group.add(petal);
    }
  };
  createStem();
  const leafMat=new THREE.MeshStandardMaterial({color:0x5cae54});
  for(const side of [-1,1]){
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),leafMat);
    leaf.scale.set(1,.35,1.5);leaf.position.set(side*.14,.38,0);leaf.rotation.z=side*-.5;group.add(leaf);
  }
  if(type==='sunflower'){
    const center=new THREE.Mesh(new THREE.SphereGeometry(.15,12,8),new THREE.MeshStandardMaterial({color:0x71431f}));center.position.y=.81;group.add(center);
    for(let i=0;i<9;i++){
      const a=i*Math.PI*2/9;
      const petal=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshStandardMaterial({color:0xffd24f}));
      petal.scale.set(.75,1,1);petal.position.set(Math.cos(a)*.2,.81,Math.sin(a)*.2);group.add(petal);
    }
  }else if(type==='berry'){
    const bush=new THREE.Mesh(new THREE.SphereGeometry(.35,12,9),new THREE.MeshStandardMaterial({color:0x3f8e4b}));bush.position.y=.52;group.add(bush);
    for(let i=0;i<5;i++){
      const berry=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),new THREE.MeshStandardMaterial({color:0xa73363}));berry.position.set(Math.sin(i*4)*.26,.45+(i%2)*.22,Math.cos(i*4)*.25);group.add(berry);
    }
  }else if(type==='peashooter'){
    const head=new THREE.Mesh(new THREE.SphereGeometry(.27,12,9),new THREE.MeshStandardMaterial({color:0x55b85c}));head.position.set(0,.8,-.05);head.scale.set(1,1,.82);group.add(head);
    const snout=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,.38,12),new THREE.MeshStandardMaterial({color:0x387e42}));snout.rotation.x=Math.PI/2;snout.position.set(0,.77,-.32);group.add(snout);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),new THREE.MeshBasicMaterial({color:0xffffff}));eye.position.set(.13,.89,-.24);group.add(eye);
  }else if(type==='cornzooka'){
    const cob=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.48,5,8),new THREE.MeshStandardMaterial({color:0xffcf48}));cob.position.set(0,.79,0);group.add(cob);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.18,.23,.5,10),new THREE.MeshStandardMaterial({color:0x98733b}));barrel.rotation.x=Math.PI/2;barrel.position.set(0,.8,-.32);group.add(barrel);
    for(const side of [-1,1])leaf(side*.2,.36,0,side*.4,0x4d983f,1.2);
  }else if(type==='moonberry'){
    const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(.42,1),material(0x356b4b));bush.position.y=.43;group.add(bush);
    for(let i=0;i<8;i++){
      const a=i*Math.PI*2/8,y=.32+(i%3)*.17;
      bud(Math.cos(a)*.32,y,Math.sin(a)*.32,.09,i%2?0xa64cf5:0x48d7db,true);
    }
    leaf(-.25,.62,.08,-.55,0x7dcb68,.9);leaf(.25,.55,-.08,.55,0x7dcb68,.9);
  }else if(type==='starfruit'){
    stem(.53,0x4a8543,.055);leaf(-.16,.33,0,.7);leaf(.17,.43,.04,-.7);
    const shape=new THREE.Shape();
    for(let i=0;i<10;i++){
      const angle=-Math.PI/2+i*Math.PI/5,r=i%2?.13:.3,x=Math.cos(angle)*r,y=Math.sin(angle)*r;
      if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
    }
    shape.closePath();
    const star=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.035,bevelThickness:.03}),material(0xffc928));
    star.position.set(-.16,.7,0);star.rotation.y=-.2;group.add(star);
    const second=star.clone();second.position.set(.19,.62,.12);second.rotation.y=.35;second.scale.setScalar(.68);group.add(second);
  }else if(type==='pumpkin'||type==='pumpkinShell'){
    const color=type==='pumpkin'?0xf47d28:0xd9a34b;
    const center=new THREE.Mesh(new THREE.SphereGeometry(.37,16,12),material(color));center.position.y=.43;center.scale.set(1,.83,1);group.add(center);
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      const rib=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),material(type==='pumpkin'?0xffa13b:0xf0c66f));
      rib.scale.set(.63,.78,.85);rib.position.set(Math.cos(a)*.24,.42,Math.sin(a)*.24);group.add(rib);
    }
    const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,.2,8),material(0x598545));stalk.position.y=.75;stalk.rotation.z=.2;group.add(stalk);
    leaf(.22,.7,0,-.8,0x73a949,.65);
  }else if(type==='glowMushroom'){
    for(const [x,z,size]of [[-.18,0,.9],[.16,.08,.72],[0,-.18,.66]]){
      const shroom=new THREE.Group();shroom.position.set(x,0,z);group.add(shroom);
      const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,.38*size,9),material(0xd9dfb9));stalk.position.y=.19*size;shroom.add(stalk);
      const cap=new THREE.Mesh(new THREE.SphereGeometry(.21*size,14,9),material(0x65d985,.3,0x27da75));cap.scale.y=.48;cap.position.y=.38*size;shroom.add(cap);
      for(let dot=0;dot<3;dot++){const spot=new THREE.Mesh(new THREE.SphereGeometry(.035*size,6,5),material(0xffeaa0));spot.position.set((dot-1)*.09*size,.44*size,.11*size);shroom.add(spot);}
    }
  }else if(type==='clover'){
    createStem(.42,0x43894b,.045);
    for(let index=0;index<3;index++){const angle=index*Math.PI*2/3;leaf(Math.cos(angle)*.14,.42,Math.sin(angle)*.14,angle,0x69bd58,.72);}
    bud(0,.68,0,.11,0xf4dd81);
  }else if(type==='lavender'){
    createStem(.95,0x477f48,.04);leaf(-.12,.28,0,.5,0x78a94e,.55);leaf(.12,.46,0,-.5,0x78a94e,.55);
    for(let index=0;index<7;index++){const y=.52+index*.085;bud(Math.sin(index*1.7)*.07,y,Math.cos(index*1.7)*.05,.075,index%2?0x9d69c5:0xb480d8);}
  }else if(type==='snowdrop'){
    createStem(.78,0x5b974e,.035);leaf(-.11,.34,0,.5,0x8bc86a,.66);leaf(.11,.22,.02,-.5,0x6da84f,.58);
    const bell=new THREE.Mesh(new THREE.SphereGeometry(.17,12,9),material(0xf3f4dc,.32));bell.scale.set(.72,1.1,.72);bell.position.set(0,.82,0);group.add(bell);
    bud(0,.71,0,.07,0x9bbd70);
  }else if(type==='bamboo'||type==='reedTube'){
    const tall=type==='bamboo'?1.18:.86;
    const radius=type==='bamboo'?.09:.075;
    const stalkMesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.78,radius,tall,10,1,type==='reedTube'),material(type==='bamboo'?0x71a849:0xa7a45c));
    stalkMesh.position.y=tall/2;group.add(stalkMesh);
    if(type==='bamboo'){
      for(const y of [.34,.7,1.04]){
        const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.022,6,12),material(0xd1c875));ring.position.y=y;group.add(ring);
      }
      leaf(.16,.76,0,-.8,0x70b74d,.8);leaf(-.14,.42,0,.65,0x4c9a48,.7);
    }else{
      const rim=new THREE.Mesh(new THREE.TorusGeometry(radius*.82,.018,6,12),material(0xd6c57f));rim.position.y=tall+.005;group.add(rim);
      for(const side of [-1,1])leaf(side*.13,.37,0,side*.6,0x7eb555,.8);
    }
  }else if(type==='magazineVine'){
    stem(.85,0x448542,.045);
    for(let i=0;i<5;i++){
      const angle=i*2.35,y=.2+i*.14;
      const pod=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.12,3,7),material(i%2?0x9cdb62:0x5fb352));
      pod.position.set(Math.cos(angle)*.18,y,Math.sin(angle)*.18);pod.rotation.z=Math.cos(angle)*.55;group.add(pod);
    }
    for(const side of [-1,1])leaf(side*.16,.34,0,side*.5,0x4e9d4c,.75);
  }else if(type==='blastCorn'){
    stem(.25);
    const cob=new THREE.Mesh(new THREE.CapsuleGeometry(.2,.48,5,10),material(0xffc43d));cob.position.y=.67;group.add(cob);
    for(let row=0;row<4;row++)for(let col=0;col<3;col++){
      const angle=col*Math.PI*2/3,y=.43+row*.16;
      const kernel=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),material((row+col)%2?0xffe46a:0xf3a92d));
      kernel.position.set(Math.cos(angle)*.18,y,Math.sin(angle)*.18);group.add(kernel);
    }
    for(const side of [-1,1])leaf(side*.19,.39,0,side*.6,0x559d43,1.2);
  }else if(type==='pollenPod'){
    stem(.55);leaf(-.15,.32,0,.65,0x5d9d43,.9);leaf(.15,.38,0,-.65,0x5d9d43,.9);
    bud(0,.72,0,.19,0xe6a43b);
    petalRing(.7,.19,7,0xffd45b,.1);
    for(let i=0;i<5;i++){
      const mote=new THREE.Mesh(new THREE.SphereGeometry(.035,6,5),material(0xffeb9a,.3,0xffcc48));
      const a=i*1.25;mote.position.set(Math.cos(a)*.27,.85+(i%2)*.08,Math.sin(a)*.27);group.add(mote);
    }
  }else if(type==='triggerBloom'){
    stem(.42,0x4e8144,.05);bud(0,.62,0,.19,0x9e3f73);
    petalRing(.64,.22,6,0xf06a92,.13);
    const center=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),material(0xffc650));center.position.y=.69;group.add(center);
    for(const side of [-1,1])leaf(side*.15,.35,0,side*.6,0x68a74a,.8);
  }else if(type==='thornVine'){
    for(let i=0;i<3;i++){
      const vine=new THREE.Mesh(new THREE.TorusGeometry(.24+i*.055,.045,7,20),material(i%2?0x477f3e:0x609343));
      vine.rotation.x=Math.PI/2+(i-1)*.25;vine.rotation.y=i*1.2;vine.position.y=.25+i*.16;group.add(vine);
    }
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,y=.2+(i%3)*.17;
      const thorn=new THREE.Mesh(new THREE.ConeGeometry(.055,.2,6),material(0xd6d2a4));
      thorn.position.set(Math.cos(a)*.28,y,Math.sin(a)*.28);thorn.rotation.z=Math.cos(a)*.9;thorn.rotation.x=Math.sin(a)*.9;group.add(thorn);
    }
  }else if(type==='crystalBud'){
    stem(.18,0x527b48,.055);
    for(let i=0;i<5;i++){
      const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.21-i*.018,0),material(i%2?0x7ce8ef:0x9b7aff,.25,i%2?0x37dce3:0x7545ff));
      const a=i*Math.PI*2/5;crystal.position.set(Math.cos(a)*.15,.43+(i%2)*.14,Math.sin(a)*.15);
      crystal.scale.y=1.5;crystal.rotation.y=a;group.add(crystal);
    }
  }else if(type==='epicSoil'){
    const earth=new THREE.Mesh(new THREE.CylinderGeometry(.51,.58,.2,8),material(0x46382f));earth.position.y=.1;group.add(earth);
    for(let i=0;i<3;i++){
      const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.19+i*.03),material(i===1?0x8c67ff:0x5fe8d3,.25,i===1?0x6a2fff:0x20daba));
      const a=i*Math.PI*2/3;crystal.position.set(Math.cos(a)*.2,.35+i*.08,Math.sin(a)*.2);crystal.scale.y=1.7;group.add(crystal);
    }
    for(const side of [-1,1])leaf(side*.27,.2,0,side*.5,0x527b46,.75);
  }else if(type==='thornGuard'){
    const bulb=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),material(0x4f893f));bulb.position.y=.42;group.add(bulb);
    for(let i=0;i<10;i++){
      const a=i*Math.PI*2/10,spike=new THREE.Mesh(new THREE.ConeGeometry(.07,.27,6),material(0xc8d58a));
      spike.position.set(Math.cos(a)*.29,.43+(i%2)*.17,Math.sin(a)*.29);spike.rotation.z=Math.cos(a)*.85;spike.rotation.x=Math.sin(a)*.85;group.add(spike);
    }
  }else{
    const height=.7;const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,height,8),material(0x45874a));stalk.position.y=height/2;group.add(stalk);
    for(let i=0;i<4;i++){const kernel=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),material(0xffb52d));kernel.position.set(Math.sin(i*1.6)*.17,.48+(i%2)*.2,Math.cos(i*1.6)*.17);group.add(kernel);}
  }
  addSpecialPlantSignature(group,type);addPlantLabel(group,type);
  if(mutation)addMutationVisual(group,mutation);
  group.traverse(object=>{if(object.isMesh)object.castShadow=true;});
  return group;
}

function makeZombie(){
  const group=new THREE.Group();
  const skin=new THREE.MeshStandardMaterial({color:0x7d9a64});
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.27,.5,4,8),new THREE.MeshStandardMaterial({color:0x546a4e}));
  torso.position.y=.65;group.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.23,12,8),skin);head.position.y=1.2;group.add(head);
  const eyeMat=new THREE.MeshBasicMaterial({color:0xff543e});
  for(const x of [-.09,.09]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.035,6,5),eyeMat);eye.position.set(x,1.24,-.19);group.add(eye);}
  group.traverse(object=>{if(object.isMesh)object.castShadow=true;});
  return group;
}

function makePlayer(color){
  const group=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.48,4,8),new THREE.MeshStandardMaterial({color}));torso.position.y=.55;group.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),new THREE.MeshStandardMaterial({color:0xf0c8a4}));head.position.y=1.02;group.add(head);
  group.traverse(object=>{if(object.isMesh)object.castShadow=true;});
  return group;
}

function updateHeldWeapon(player){
  const weapon=player?.weapon||'',custom=player?.customGuns?.find(gun=>gun.id===weapon);
  const unlocked=!!player?.weapons?.[weapon]||!!custom;
  heldWeapon.visible=unlocked;
  if(!unlocked)return;
  const attachments=custom?.components||[],components=new Set(attachments),counts=attachments.reduce((total,part)=>{total[part]=(total[part]||0)+1;return total;},{});
  const signature=JSON.stringify([weapon,[...attachments].sort()]);
  if(signature===state.weaponSignature)return;
  state.weaponSignature=signature;
  for(const child of [...heldWeapon.children])disposeGroup(child);
  const launcher=weapon==='cornZooka'||custom?.base==='cornZooka';
  const bodyColor=launcher?0x765633:0x426744,darkColor=launcher?0x443423:0x263e2b;
  heldWeapon.position.set(.32,-.27,-.48);heldWeapon.rotation.set(-.08,.12,.04);heldWeapon.scale.setScalar(launcher?1.12:1);
  const addBox=(size,color,position,emissive=0)=>{
    const material=new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.18,emissive,emissiveIntensity:emissive?.65:0});
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(position.x,position.y,position.z);mesh.castShadow=true;heldWeapon.add(mesh);return mesh;
  };
  const addRing=(radius,tube,color,position,emissive=0)=>{
    const material=new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.25,emissive,emissiveIntensity:emissive?.75:0});
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,7,18),material);mesh.rotation.x=Math.PI/2;mesh.position.set(position.x,position.y,position.z);heldWeapon.add(mesh);return mesh;
  };
  const addOrb=(radius,color,position)=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,10,8),new THREE.MeshStandardMaterial({color,roughness:.28,emissive:color,emissiveIntensity:.8}));
    mesh.position.set(position.x,position.y,position.z);heldWeapon.add(mesh);return mesh;
  };
  const barrelLength=(launcher?.55:.36)+Math.min(.6,(counts.reed||0)*.24)+Math.min(.36,(counts.bamboo||0)*.12);
  addBox(launcher?[.3,.19,.44]:[.22,.15,.38],bodyColor,{x:0,y:-.045,z:-.29});
  addBox([.13,.13,.2],darkColor,{x:0,y:-.03,z:-.05});
  addBox([.105,.22,.14],darkColor,{x:.045,y:-.2,z:-.2});
  const barrelRadius=launcher?.072:.045;
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(barrelRadius,barrelRadius,barrelLength,12),new THREE.MeshStandardMaterial({color:0x737d68,metalness:.68,roughness:.3}));
  barrel.rotation.x=Math.PI/2;barrel.position.set(0,.01,-.48-barrelLength/2);barrel.castShadow=true;heldWeapon.add(barrel);
  const muzzleZ=-.48-barrelLength;
  addRing(launcher?.09:.062,.018,launcher?0xe2a447:0x9cad80,{x:0,y:.01,z:muzzleZ});
  addBox([.11,.035,.15],0x819773,{x:0,y:.095,z:-.32});
  addOrb(.045,launcher?0xffbd45:0x75e690,{x:0,y:.19,z:-.31});
  for(let index=0;index<Math.min(6,(counts.bamboo||0)*3);index++)addRing(barrelRadius+.012,.018,0x9bbd56,{x:0,y:.01,z:-.54-index*barrelLength*.16});
  for(let index=0;index<(counts.magazine||0);index++)addBox([.105,.19,.13],0x5e8b47,{x:.13+index*.09,y:-.16,z:-.29});
  for(let index=0;index<(counts.shell||0);index++)addBox([.09,.12,.3],0xc59b4f,{x:-.145-index*.08,y:-.06,z:-.3});
  if(components.has('blastCorn'))addRing((launcher?.13:.105)+Math.min(.04,((counts.blastCorn||1)-1)*.012),.028,0xffa53e,{x:0,y:.01,z:muzzleZ-.035},0xff7a20);
  for(let index=0;index<(counts.pollen||0);index++)addOrb(.075,0xffd15a,{x:-.17-index*.075,y:.1,z:-.25});
  for(let index=0;index<(counts.trigger||0);index++)addRing(.065,.012,0xf1789a,{x:.08+index*.035,y:-.125,z:-.16});
  for(let index=0;index<(counts.grip||0)*3;index++)addRing(.08,.012,index%2?0x83c768:0x4c9d55,{x:.045,y:-.15-index*.025,z:-.2});
  for(let index=0;index<(counts.crystal||0);index++){
    const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.105),new THREE.MeshStandardMaterial({color:0x78eaff,emissive:0x35b9e8,emissiveIntensity:1.2,roughness:.2}));
    crystal.position.set((index-(counts.crystal-1)/2)*.14,.19,-.4);crystal.scale.y=1.35;heldWeapon.add(crystal);
  }
  heldWeapon.userData.baseY=-.27;
}
function animateHeldWeapon(delta){
  if(!heldWeapon.visible)return;
  state.weaponClock+=delta;state.weaponKick=Math.max(0,state.weaponKick-delta*.65);
  heldWeapon.position.y=heldWeapon.userData.baseY+Math.sin(state.weaponClock*2.2)*.006-state.weaponKick;
  heldWeapon.rotation.x=-.08+Math.sin(state.weaponClock*2.2)*.008+state.weaponKick*.7;
}

function disposeGroup(group){
  group.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials){material.map?.dispose();material.dispose();}}});
  group.parent?.remove(group);
}
function updateObjects(source,meshes,create,place){
  const alive=new Set();
  for(const item of source){
    alive.add(item.id);let mesh=meshes.get(item.id);
    if(!mesh){mesh=create(item);meshes.set(item.id,mesh);scene.add(mesh);}
    place(mesh,item);
  }
  for(const [id,mesh]of meshes)if(!alive.has(id)){disposeGroup(mesh);meshes.delete(id);}
}

function updateWorld(){
  for(const plant of state.plants.values()){
    const mesh=state.plantMeshes.get(plant.id);
    if(mesh&&mesh.userData.mutation!==(plant.mutation||'')){disposeGroup(mesh);state.plantMeshes.delete(plant.id);}
  }
  updateObjects(state.plants.values(),state.plantMeshes,
    plant=>makeFlower(plant.type,plant.mutation||''),(mesh,plant)=>{
      mesh.userData.plantData=plant;
      mesh.position.set(plant.x,0,plant.z);
      const grow=Math.min(1,Math.max(.62,(Date.now()-plant.plantedAt)/Math.max(1,plant.matureAt-plant.plantedAt)));
      const fruitScale=1+Math.min(.25,Math.max(0,(plant.fruitSize||1)-1)*.125);
      mesh.scale.setScalar(grow*fruitScale);
      mesh.rotation.y=(plant.col*1.71+plant.row*.83)%6.28;
    });
  updateObjects(state.zombies.values(),state.zombieMeshes,
    zombie=>{const mesh=makeZombie();mesh.userData.zombieId=zombie.id;return mesh;},
    (mesh,zombie)=>{mesh.position.set(zombie.x,0,zombie.z);mesh.rotation.y=Math.PI;});
  updateObjects(state.players.values(),state.playerMeshes,
    player=>makePlayer(player.color),(mesh,player)=>{mesh.visible=player.id!==state.playerId;mesh.position.set(player.x,0,player.z);mesh.rotation.y=Math.PI;});
  updateObjects(Array.from(state.sprinklers,key=>{
    const tile=gardenTileFromKey(key);return tile?{id:key,...tile}:null;
  }).filter(Boolean),state.sprinklerMeshes||=new Map(),()=>{
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.19,.23,.16,10),new THREE.MeshStandardMaterial({color:0x82bdcc,metalness:.25,roughness:.4}));
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.45,8),new THREE.MeshStandardMaterial({color:0x8db7a5}));stem.position.y=.27;base.add(stem);return base;
  },(mesh,item)=>mesh.position.set(item.x,.12,item.z));
  if(state.selectedTile){
    const tile=plotMeshes.find(mesh=>mesh.userData.farmIndex===state.selectedTile.farmIndex&&mesh.userData.col===state.selectedTile.col&&mesh.userData.row===state.selectedTile.row);
    if(tile){
      selectionHighlight.position.set(tile.position.x,.045,tile.position.z);selectionHighlight.visible=true;
    }
  }else selectionHighlight.visible=false;
}
function syncProjectiles(projectiles){
  for(const projectile of projectiles){
    if(!projectile?.id||state.projectileMeshes.has(projectile.id))continue;
    const from=projectile.from,to=projectile.to;
    if(!from||!to||![from.x,from.y,from.z,to.x,to.y,to.z].every(Number.isFinite))continue;
    const color=projectile.kind==='rocket'?0xff8a36:projectile.kind==='plant'?0x9cff70:0xffe6a1;
    const group=new THREE.Group();
    const trail=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1,7),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false}));
    const core=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),new THREE.MeshBasicMaterial({color,toneMapped:false}));
    group.add(trail,core);scene.add(group);
    state.projectileMeshes.set(projectile.id,{group,trail,core,from:new THREE.Vector3(from.x,from.y,from.z),to:new THREE.Vector3(to.x,to.y,to.z),startedAt:performance.now(),duration:Math.max(180,Number(projectile.duration)||320),lifetime:850});
  }
}
function animateProjectiles(){
  const now=performance.now();
  for(const [id,projectile]of state.projectileMeshes){
    const elapsed=now-projectile.startedAt;
    if(elapsed>=projectile.lifetime){disposeGroup(projectile.group);state.projectileMeshes.delete(id);continue;}
    const progress=Math.min(1,elapsed/projectile.duration),head=projectile.from.clone().lerp(projectile.to,progress);
    const direction=head.clone().sub(projectile.from),length=Math.max(.02,direction.length());
    projectile.trail.position.copy(projectile.from).add(head).multiplyScalar(.5);
    projectile.trail.scale.y=length;
    projectile.trail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    projectile.trail.material.opacity=.9*(1-elapsed/projectile.lifetime);
    projectile.core.position.copy(head);
    projectile.core.visible=progress<1;
  }
}
function animateMutationEffects(delta){
  for(const mesh of state.plantMeshes.values()){
    const effects=mesh.userData.mutationEffects;
    if(!effects)continue;
    effects.elapsed+=delta;
    effects.ring.rotation.z=effects.elapsed*.55;
    effects.ring.material.opacity=.55+Math.sin(effects.elapsed*3)*.2;
    for(const mote of effects.motes){
      const angle=effects.elapsed*.85+mote.userData.orbitIndex*Math.PI/2;
      mote.position.set(Math.cos(angle)*.46,.48+Math.sin(effects.elapsed*1.7+mote.userData.orbitIndex)*.14,Math.sin(angle)*.46);
    }
    effects.label.material.opacity=.82+Math.sin(effects.elapsed*2.2)*.16;
  }
}

function resize(){
  const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}
function send(action,data={}){
  if(!state.socket||state.socket.readyState!==WebSocket.OPEN){status.textContent='Join a garden before using its shops and tools.';return;}
  state.socket.send(JSON.stringify({type:'garden:action',action,...data}));
}
function readSektorAccount(){
  try{
    const account=JSON.parse(localStorage.getItem('vusServersSession')||'null');
    return account&&/^[\w-]{8,64}$/.test(String(account.key||''))&&typeof account.username==='string'
      ?{key:String(account.key),username:account.username.trim().slice(0,20)}:null;
  }catch(error){return null;}
}
function updateAccountGate(){
  const account=readSektorAccount();
  $('accountStatus').textContent=account?`Connected to Sektor as ${account.username}. Your garden saves to this account.`:'Connect a Sektor account to play and save your garden.';
  $('accountLink').hidden=!!account;
  $('publicButton').disabled=!account;$('createPrivateButton').disabled=!account;
  if(account&&!$('playerName').value)$('playerName').value=account.username;
  return account;
}
function connect(mode,roomId=''){
  const account=updateAccountGate();
  if(!account){joinStatus.textContent='Log in to Sektor before joining Garden Siege.';return;}
  const name=$('playerName').value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,20);
  if(!name){joinStatus.textContent='Enter your name before joining.';$('playerName').focus();return;}
  localStorage.setItem(`gardenfallName:${account.key}`,name);
  state.joinedPosition=false;state.selectedTile=null;state.trowelFrom=null;state.seedSignature=null;
  state.clientId=account.key;
  if(state.socket)state.socket.close();
  const scheme=location.protocol==='https:'?'wss:':'ws:';
  const socket=new WebSocket(scheme+'//'+location.host);state.socket=socket;
  status.textContent='Connecting…';joinStatus.textContent='Connecting to the garden server…';
  socket.addEventListener('open',()=>socket.send(JSON.stringify({type:'garden:join',mode,roomId,name,clientId:state.clientId,accountKey:account.key,accountUsername:account.username})));
  socket.addEventListener('message',event=>{
    if(state.socket!==socket)return;
    let message;try{message=JSON.parse(event.data);}catch(error){console.warn('Could not read garden update.',error);return;}
    if(message.type==='garden:error'){state.pendingPlantKey='';if(message.message){joinStatus.textContent=message.message;status.textContent=message.message;clearTimeout(statusTimeout);statusTimeout=setTimeout(()=>{if(state.socket===socket)status.textContent=state.roomId?'Garden connected':'Not in a garden';},4000);}return;}
    if(message.type!=='garden:sync')return;
    state.roomId=message.roomId;state.roomMode=message.mode;state.playerId=message.playerId||state.playerId;
    state.day=message.day;state.phase=message.phase;
    state.phaseRemaining=Number.isFinite(Number(message.phaseRemaining))?Math.max(0,Number(message.phaseRemaining)):0;
    state.phaseDeadline=performance.now()+state.phaseRemaining;state.gardenHealth=message.gardenHealth;
    state.players=new Map((message.players||[]).map(player=>[player.id,player]));
    state.plants=new Map((message.plants||[]).map(plant=>[gardenPlotKey(plant),plant]));
    state.zombies=new Map((message.zombies||[]).map(zombie=>[zombie.id,zombie]));
    syncProjectiles(message.projectiles||[]);
    state.sprinklers=new Set(message.sprinklers||[]);
    state.ponds=message.ponds||[];
    if(state.pendingPlantKey){
      const planted=state.plants.get(state.pendingPlantKey),local=state.players.get(state.playerId);
      if(planted?.ownerId===state.playerId){
        const next=plotMeshes.find(mesh=>mesh.userData.farmIndex===local.farmIndex&&!state.plants.has(gardenPlotKey(mesh.userData))&&!state.sprinklers.has(gardenPlotKey(mesh.userData)));
        state.selectedTile=next?{...next.userData}:null;state.pendingPlantKey='';
      }
    }
    const previousWeather=state.weather;
    state.weather=message.weather||'clear';
    state.weatherRemaining=Number.isFinite(Number(message.weatherRemaining))?Math.max(0,Number(message.weatherRemaining)):0;
    state.weatherDeadline=performance.now()+state.weatherRemaining;
    updateWeather(state.weather,state.weatherKnown?state.weather!==previousWeather:state.weather!=='clear');
    state.weatherKnown=true;
    const local=state.players.get(state.playerId);
    if(local){
        if(!state.joinedPosition){
        state.x=local.x;state.z=local.z;
          const offset=farmOffset(local.farmIndex);state.yaw=Math.atan2(-offset.radialX,offset.radialZ);
        state.joinedPosition=true;
      }
      state.targetX=local.x;state.targetZ=local.z;
    }
    joinScreen.hidden=true;$('leaveButton').hidden=false;$('copyCode').disabled=message.mode!=='private';
    $('roomTitle').textContent=message.mode==='public'?'Public Garden':'Private · '+message.roomId;
    status.textContent=message.mode==='public'?'Public lobby · connected':'Private garden · connected';
    updateHud(local);updateWorld();renderSeedSelect(local);updateActions(local);
  });
  socket.addEventListener('close',()=>{
    if(state.socket!==socket)return;
    state.socket=null;status.textContent='Disconnected';joinScreen.hidden=false;joinStatus.textContent='Garden connection closed. Rejoin to continue.';
    $('leaveButton').hidden=true;
  });
  socket.addEventListener('error',()=>{if(state.socket===socket)joinStatus.textContent='Could not reach the garden server on this port.';});
}

function updateHud(player){
  $('phaseBadge').textContent=state.phase==='night'?'☾ NIGHT · ZOMBIES!':'☀ DAY · PREPARE';
  $('phaseBadge').classList.toggle('night',state.phase==='night');
  $('dayClock').textContent=`DAY ${state.day} · ${formatTime(state.phaseRemaining)}`;
  $('coins').textContent=`🪙 ${player?.coins??0}`;
  const land=landTiers.find(tier=>tier.id===(player?.landTier||'common'))||landTiers[0];
  $('landBadge').textContent=`🏡 ${land.name} land · ${land.multiplier}×`;
  $('gardenHealth').textContent=`🌿 Garden ${Math.ceil(state.gardenHealth)}%`;
  $('playerCount').textContent=`${state.players.size}/8 players`;
  $('farmBadge').textContent=`🌾 Farm ${(player?.farmIndex??0)+1}/8`;
}
function formatTime(ms){
  const value=Number(ms),seconds=Math.max(0,Math.ceil((Number.isFinite(value)?value:0)/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function weatherName(weather){
  return ({solarFlare:'Solar Flare',aurora:'Aurora',fireworks:'Fireworks',rainbow:'Rainbow',snowstorm:'Snowstorm',rain:'Rain',clear:'Clear'})[weather]||weather;
}
function updateWeather(weather,announce=false){
  const styles={
    clear:{sky:0x9bc5a0,light:0xfff0ce,intensity:2.2},
    rain:{sky:0x71899a,light:0xb8cde0,intensity:1.55},
    aurora:{sky:0x586783,light:0xc3b5ff,intensity:1.8},
    solarFlare:{sky:0xc99a67,light:0xffd18c,intensity:2.8},
    fireworks:{sky:0x394765,light:0xc8bcff,intensity:1.65},
    rainbow:{sky:0x88b6b0,light:0xfff0cb,intensity:2.35},
    snowstorm:{sky:0x9aaab0,light:0xd9e8ef,intensity:1.25},
  };
  const style=styles[weather]||styles.clear;
  const color=new THREE.Color(style.sky);
  scene.background.copy(color);scene.fog.color.copy(color);
  sunlight.color.setHex(style.light);sunlight.intensity=style.intensity;
  $('weatherEffects').dataset.weather=weather;
  $('weatherLabel').textContent=`Weather · ${weatherName(weather)} · ${formatTime(state.weatherRemaining)}`;
  rainLines.visible=weather==='rain';snowflakes.visible=weather==='snowstorm';rainbowGroup.visible=weather==='rainbow';
  cloudMaterial.color.setHex(weather==='snowstorm'?0xc6d4dc:weather==='rain'?0x8798a5:0xf1f3eb);
  cloudMaterial.opacity=weather==='snowstorm'?.72:weather==='rain'?.58:.34;
  if(announce&&(weather==='rain'||weather==='snowstorm'))resetWeatherParticles();
  const winter=weather==='snowstorm',wet=weather==='rain';
  floor.material.color.setHex(winter?0xc4d1ce:wet?0x465b56:0x507944);
  for(let index=0;index<farmGroundMaterials.length;index++)farmGroundMaterials[index].color.setHex(winter?0xb2c5bd:wet?0x526d61:[0x658449,0x71884b,0x5e7d49,0x74884e][index]);
  plotMeshes.forEach(tile=>tile.material.color.setHex(winter?0xb5c4c0:wet?0x584b3d:0x704b31));
  plotEdgeMaterial.color.setHex(winter?0xcdd5d0:0x9a7045);
  pathMaterial.color.setHex(winter?0xd4dedb:wet?0x65736f:0x9b865d);
  if(!announce)return;
  const descriptions={
    clear:'Clear skies return. Make the most of the calm.',
    rain:'Rain crosses the farms, darkens the soil, and speeds crop growth.',
    aurora:'Aurora light may mutate growing crops.',
    solarFlare:'Solar flares can mutate growing crops.',
    fireworks:'Fireworks may trigger rare crop mutations.',
    rainbow:'Rainbow light can create valuable crop mutations.',
    snowstorm:'Snow sweeps across the island and slows crop growth and movement.',
  };
  const banner=$('weatherEvent');
  banner.dataset.weather=weather;
  $('weatherEventTitle').textContent=`${weatherName(weather).toUpperCase()} EVENT`;
  $('weatherEventDescription').textContent=descriptions[weather]||'A new weather event is sweeping through the garden.';
  banner.hidden=false;clearTimeout(weatherBannerTimer);
  weatherBannerTimer=setTimeout(()=>{banner.hidden=true;},7000);
}
function updateWeatherInWorld(delta){
  if(state.weather==='rain'){
    for(let index=0;index<rainCount;index++){
      const base=index*6;rainPositions[base+1]-=36*delta;rainPositions[base]-=2.2*delta;rainPositions[base+3]=rainPositions[base]-.12;rainPositions[base+4]=rainPositions[base+1]-.9;rainPositions[base+5]=rainPositions[base+2]-.08;
      if(rainPositions[base+1]<0){const point=randomWeatherPosition(45);rainPositions[base]=point.x;rainPositions[base+1]=point.y;rainPositions[base+2]=point.z;}
    }
    rainGeometry.attributes.position.needsUpdate=true;
  }else if(state.weather==='snowstorm'){
    for(let index=0;index<snowCount;index++){
      const base=index*3;snowPositions[base+1]-=(4+(index%7))*delta;snowPositions[base]+=(.8+(index%5)*.12)*delta;snowPositions[base+2]+=Math.sin(index+state.weaponClock)*.25*delta;
      if(snowPositions[base+1]<0){const point=randomWeatherPosition(35);snowPositions[base]=point.x;snowPositions[base+1]=point.y;snowPositions[base+2]=point.z;}
    }
    snowGeometry.attributes.position.needsUpdate=true;
  }
  for(const cloud of clouds){cloud.position.x+=cloud.userData.wind*delta;cloud.position.z+=Math.sin(state.weaponClock*.12+cloud.position.x)*.025;if(cloud.position.x>farmGrid.mapRadius)cloud.position.x=-farmGrid.mapRadius;}
}

function renderShop(){
  const listings=state.selectedShop==='seeds'?seeds:state.selectedShop==='gear'?gear:[];
  const player=state.players.get(state.playerId);
  const signature=JSON.stringify([state.selectedShop,state.seedCategory,player?.landTier,player?.coins,player?.seeds,player?.gear,player?.weapons,player?.ammo,player?.customGuns,player?.goods]);
  if(signature===state.shopSignature)return;
  state.shopSignature=signature;
  document.querySelector('.seed-filters').hidden=state.selectedShop!=='seeds';
  shopItems.replaceChildren();
  const addRow=(name,description,label,onBuy,disabled=false)=>{
    const row=document.createElement('div');row.className='shop-item';
    const copy=document.createElement('div');copy.className='shop-item-copy';
    const title=document.createElement('strong');title.textContent=name;
    const detail=document.createElement('span');detail.textContent=description;
    copy.append(title,detail);
    const buy=document.createElement('button');buy.type='button';buy.textContent=label;buy.disabled=disabled;buy.addEventListener('click',onBuy);
    row.append(copy,buy);shopItems.append(row);
  };
  if(state.selectedShop==='sell'){
    const row=document.createElement('div');row.className='shop-item';
    const copy=document.createElement('div');copy.className='shop-item-copy';
    const title=document.createElement('strong');title.textContent='Sell harvested goods';
    const description=document.createElement('span');description.textContent='Harvesting stores fruit and plant parts. Sell them only when you choose.';
    copy.append(title,description);row.append(copy);shopItems.append(row);
    $('sellAllButton').hidden=false;
    return;
  }
  $('sellAllButton').hidden=true;
  if(state.selectedShop==='lands'){
    const player=state.players.get(state.playerId),current=landTiers.findIndex(land=>land.id===(player?.landTier||'common'));
    for(let index=0;index<landTiers.length;index++){
      const land=landTiers[index],owned=index<=current,next=index===current+1;
      const label=owned?'Owned':next?`Buy · ${land.cost} 🪙`:'Locked';
      addRow(`${land.name} land · ${land.multiplier}× fruit value`,
        owned?'Your harvest fruit sells for more on this land.':`Larger fruit sells for ${land.multiplier}×. Upgrade in tier order.`,
        label,()=>send('buy-land',{item:land.id}),!next);
    }
    return;
  }
  for(const item of listings){
    if(state.selectedShop==='seeds'&&state.seedCategory!=='all'&&item.kind!==state.seedCategory)continue;
    addRow(item.name,item.description,`Buy · ${item.cost} 🪙`,
      ()=>send(state.selectedShop==='seeds'?'buy-seed':'buy-gear',{item:item.id}));
  }
  if(state.selectedShop==='gear'){
    const player=state.players.get(state.playerId);
    for(const item of ammoListings){
      const unlocked=!!player?.weapons[item.id],ammo=Number(player?.ammo[item.id])||0;
      addRow(item.name,`${item.amount} rounds · ${ammo} in inventory`, `Buy · ${item.cost} 🪙`,
        ()=>send('buy-ammo',{item:item.id}),!unlocked||ammo>=100);
    }
    for(const gun of player?.customGuns||[]){
      const ammo=Number(player.ammo[gun.id])||0,cost=gun.capacity*3;
      addRow(`${gun.name} ammo`,`${gun.capacity} rounds · ${ammo} in inventory`, `Buy · ${cost} 🪙`,
        ()=>send('buy-ammo',{item:gun.id}),ammo>=100);
    }
  }
}
function hideInteractionPopups(){
  $('shopPopup').hidden=true;
  $('workbenchPopup').hidden=true;
}
function openStationPopup(stationId){
  if(document.pointerLockElement===canvas)document.exitPointerLock();
  state.keys.clear();state.velocity.set(0,0);
  state.nearbyStation=stationId;
  state.dismissedStation='';
  interactionPrompt.hidden=true;
  hideInteractionPopups();
  if(stationId==='workbench'){
    $('workbenchPopup').hidden=false;
    return;
  }
  const stall=gardenStalls.find(item=>item.id===stationId);
  if(!stall)return;
  state.selectedShop=stationId;
  $('shopPopupTitle').textContent=stall.title;
  document.querySelectorAll('[data-shop-tab]').forEach(tab=>{
    const active=tab.dataset.shopTab===stationId;
    tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));
  });
  renderShop();
  $('shopPopup').hidden=false;
}
function ziplineTargetAtPlayer(){
  const player=state.players.get(state.playerId);
  if(!player)return'';
  const offset=farmOffset(player.farmIndex),farmRadius=farmGrid.radius-5.7;
  const farmX=offset.radialX*farmRadius,farmZ=offset.radialZ*farmRadius;
  const hubX=offset.radialX*8,hubZ=offset.radialZ*8;
  if(Math.hypot(state.x-farmX,state.z-farmZ)<=5)return'hub';
  if(Math.hypot(state.x-hubX,state.z-hubZ)<=5)return'farm';
  return'';
}
function startZipline(){
  if(!state.ziplineTarget||state.ziplineRide)return;
  const player=state.players.get(state.playerId),curve=ziplineCurves[player?.farmIndex];
  if(!curve)return;
  if(document.pointerLockElement===canvas)document.exitPointerLock();
  state.keys.clear();state.velocity.set(0,0);
  const direction=state.ziplineTarget==='farm'?1:-1;
  state.ziplineRide={curve,direction,progress:direction===1?0:1,duration:3.2,cameraY:6};
  status.textContent=direction===1?'Riding zipline to your farm.':'Riding zipline to the market.';
  interactionPrompt.hidden=true;
}
function updateNearbyStation(){
  if(!state.roomId||joinScreen.hidden===false){interactionPrompt.hidden=true;return;}
  state.ziplineTarget=ziplineTargetAtPlayer();
  const closest=gardenStalls
    .map(stall=>({...stall,distance:Math.hypot(state.x-stall.x,state.z-stall.z)}))
    .filter(stall=>stall.distance<=3.4)
    .sort((a,b)=>a.distance-b.distance)[0];
  state.nearbyStation=closest?.id||'';
  if(!$('shopPopup').hidden||!$('workbenchPopup').hidden){interactionPrompt.hidden=true;return;}
  const prompts=[];
  if(state.ziplineTarget)prompts.push(`T · Zipline to ${state.ziplineTarget==='farm'?'your farm':'the market'}`);
  if(closest)prompts.push(`E · ${closest.title}`);
  interactionPrompt.hidden=prompts.length===0;
  interactionPrompt.textContent=prompts.join(' · ');
}
function renderSeedSelect(player){
  if(!player)return;
  const signature=JSON.stringify(player.seeds);
  if(signature===state.seedSignature)return;
  state.seedSignature=signature;
  const available=seeds.filter(item=>(player.seeds[item.id]||0)>0);
  const current=state.selectedSeed;
  seedSelect.replaceChildren();
  if(!available.some(item=>item.id===current))state.selectedSeed=available[0]?.id||'';
  for(const item of available){
    const option=document.createElement('option');option.value=item.id;option.textContent=`${item.name} ×${player.seeds[item.id]}`;seedSelect.append(option);
  }
  if(state.selectedSeed)seedSelect.value=state.selectedSeed;
  seedSelect.disabled=available.length===0;
  $('plantButton').disabled=!state.selectedTile||!state.selectedSeed;
}
function selectedPlant(){
  if(!state.selectedTile)return null;
  return state.plants.get(gardenPlotKey(state.selectedTile))||null;
}
function updateActions(player){
  if(!player)return;
  const plant=selectedPlant();
  const defenderInfo={peashooter:'unlock Pea Blaster + 10 ammo',cornzooka:'unlock Rocket Corn + 2 ammo'};
  $('selectedTile').textContent=state.selectedTile?plant?`Farm ${state.selectedTile.farmIndex+1} · ${seeds.find(item=>item.id===plant.type)?.name||plant.type} · ${Date.now()>=plant.matureAt?'Ready to harvest':'Growing'}${plant.mutation?` · ${plant.mutation} mutation`:''}${defenderInfo[plant.type]?` · Harvest to ${defenderInfo[plant.type]}`:''}${plant.reusable?' · Reusable; shovel to remove':` · ${plant.harvestsLeft??1} harvest(s) left`} · ${Math.ceil(plant.health)} HP`:`Farm ${state.selectedTile.farmIndex+1} · Plot ${state.selectedTile.col+1}, ${state.selectedTile.row+1} · Empty`:'Select a garden plot';
  $('plantButton').disabled=!state.selectedTile||state.selectedTile.farmIndex!==player.farmIndex||!!plant||!state.selectedSeed;
  const shovelOnly=plant?.type==='epicSoil';
  $('harvestButton').disabled=!plant||shovelOnly||Date.now()<plant.matureAt||plant.ownerId!==state.playerId;
  $('harvestButton').textContent=shovelOnly?'Remove with shovel':plant&&defenderInfo[plant.type]?`Harvest · ${defenderInfo[plant.type]}`:'Harvest plant or fruit';
  $('waterButton').disabled=!plant||plant.ownerId!==state.playerId||!player.gear.wateringCan;
  $('shovelButton').disabled=!plant||plant.ownerId!==state.playerId||!player.gear.shovel;
  $('sprinklerButton').disabled=!state.selectedTile||state.selectedTile.farmIndex!==player.farmIndex||state.sprinklers.has(gardenPlotKey(state.selectedTile))||!!plant||!(player.gear.sprinkler>0);
  $('trowelButton').disabled=!plant||plant.ownerId!==state.playerId||!player.gear.trowel;
  $('trowelButton').textContent=state.trowelFrom?'Choose destination plot':'Move plant (trowel)';
  $('refillButton').disabled=!player.gear.wateringCan||player.wateringCanCharges>=5;
  const custom=player.customGuns?.find(gun=>gun.id===player.weapon);
  const weapon=custom?.name||(player.weapon==='cornZooka'?'Rocket Corn':'Pea Blaster');
  const capacity=custom?.capacity||(player.weapon==='cornZooka'?2:10);
  const loaded=player.magazines?.[player.weapon]||0;
  $('ammoReadout').textContent=`${weapon} · Magazine ${loaded}/${capacity} · Reserve ${player.ammo[player.weapon]||0} · R reloads · Safety ${player.safetyOn?'ON':'OFF'} (G)`;
  $('gunSafety').textContent=`Gun safety · ${player.safetyOn?'ON':'OFF'}`;
  $('gunSafety').classList.toggle('safety-on',!!player.safetyOn);
  $('partsReadout').textContent=`Bamboo ${player.parts.bamboo||0} · Reed ${player.parts.reed||0} · Magazine ${player.parts.magazine||0} · Shell ${player.parts.shell||0} · Blast ${player.parts.blastCorn||0} · Pollen ${player.parts.pollen||0} · Trigger ${player.parts.trigger||0} · Grip ${player.parts.grip||0} · Crystal ${player.parts.crystal||0} · Fertilizer ${player.gear.fertilizer||0}`;
  weaponSelect.disabled=false;
  weaponSelect.querySelector('[value="peaBlaster"]').disabled=!player.weapons.peaBlaster;
  weaponSelect.querySelector('[value="cornZooka"]').disabled=!player.weapons.cornZooka;
  for(const option of Array.from(weaponSelect.options)){
    if(option.value.startsWith('custom-')&&!player.customGuns?.some(gun=>gun.id===option.value))option.remove();
  }
  for(const gun of player.customGuns||[]){
    let option=weaponSelect.querySelector(`[value="${gun.id}"]`);
    if(!option){option=document.createElement('option');option.value=gun.id;weaponSelect.append(option);}
    option.textContent=`${gun.name} · ${gun.damage} dmg`;
  }
  weaponSelect.value=player.weapon;
  updateHeldWeapon(player);
  const partLabels={bamboo:'Bamboo',reed:'Reed Tube',magazine:'Magazine Vine',blastCorn:'Blast Corn',shell:'Pumpkin Shell',pollen:'Pollen Pod',trigger:'Trigger Bloom',grip:'Thorn Vine',crystal:'Crystal Bud'};
  const componentSelect=$('componentSelect');
  const partsSignature=JSON.stringify([player.parts,player.gear.fertilizer]);
  if(partsSignature!==state.partsSignature){
    state.partsSignature=partsSignature;
    const selection=new Set(Array.from(componentSelect.querySelectorAll('input:checked'),input=>input.value).filter(part=>player.parts[part]>0));
    componentSelect.replaceChildren();
    for(const [part,label]of Object.entries(partLabels)){
      const wrapper=document.createElement('label'),input=document.createElement('input');
      input.type='checkbox';input.value=part;input.disabled=!(player.parts[part]>0);input.checked=selection.has(part)&&player.parts[part]>0;
      input.addEventListener('change',()=>{
        const selected=componentSelect.querySelectorAll('input:checked');
        if(selected.length>4){input.checked=false;status.textContent='Choose exactly four attachments.';}
        const selectedComponents=componentSelect.querySelectorAll('input:checked').length;
        const availableParts=Object.keys(partLabels).filter(attachment=>player.parts[attachment]>0).length;
        const attachmentsAvailable=Array.from(selected).every(component=>player.parts[component.value]>0);
        $('craftCustomButton').disabled=!(player.gear.fertilizer>0&&selectedComponents===4&&attachmentsAvailable);
        $('craftHelp').textContent=!player.gear.fertilizer
          ?'Buy one Plant Fertilizer in Gear.'
          :availableParts<4
            ?`Harvest ${4-availableParts} more attachment types.`
            :selectedComponents<4
              ?`Select ${4-selectedComponents} more attachments.`
              :'Ready to craft with one fertilizer and four attachments.';
      });
      wrapper.append(input,document.createTextNode(`${label} ×${player.parts[part]||0}`));componentSelect.append(wrapper);
    }
  }
  const selectedAttachments=Array.from(componentSelect.querySelectorAll('input:checked'));
  $('craftCustomButton').disabled=!(player.gear.fertilizer>0&&selectedAttachments.length===4&&selectedAttachments.every(input=>player.parts[input.value]>0));
  const goods=Object.entries(player.goods||{}).filter(([,amount])=>amount>0);
  $('goodsReadout').textContent=goods.length?goods.map(([type,amount])=>`${seeds.find(item=>item.id===type)?.name||type} ×${amount}`).join(' · '):'No harvested goods yet.';
  $('sellAllButton').disabled=!goods.length;
  if(state.selectedShop==='gear'||state.selectedShop==='lands')renderShop();
  renderSeedSelect(player);
}

function selectPlot(tile){
  state.selectedTile={...tile};
  updateWorld();updateActions(state.players.get(state.playerId));
}
function harvestNearbyPlant(){
  const selected=selectedPlant();
  const harvestable=plant=>plant&&plant.ownerId===state.playerId&&plant.type!=='epicSoil'&&Date.now()>=plant.matureAt;
  const isNearby=plant=>Math.hypot(plant.x-state.x,plant.z-state.z)<=2.5;
  const plant=harvestable(selected)&&isNearby(selected)?selected:Array.from(state.plants.values())
    .filter(harvestable)
    .map(candidate=>({plant:candidate,distance:Math.hypot(candidate.x-state.x,candidate.z-state.z)}))
    .filter(candidate=>candidate.distance<=2.5)
    .sort((a,b)=>a.distance-b.distance)[0]?.plant;
  if(!plant)return false;
  state.selectedTile={farmIndex:plant.farmIndex,col:plant.col,row:plant.row};
  updateWorld();updateActions(state.players.get(state.playerId));
  send('harvest',{tile:gardenPlotKey(plant)});
  return true;
}
function plantSeedAt(tile){
  if(!state.selectedSeed){status.textContent='Choose or buy a seed before planting.';return;}
  if(!tile){status.textContent='Select an empty plot on your farm before planting.';return;}
  const key=gardenPlotKey(tile);
  if(tile.farmIndex!==state.players.get(state.playerId)?.farmIndex){status.textContent='You can only plant on your own farm.';return;}
  if(state.plants.has(key)||state.sprinklers.has(key)){status.textContent='That plot is occupied. Select another plot.';return;}
  if(!state.socket||state.socket.readyState!==WebSocket.OPEN){status.textContent='Reconnect to the garden before planting.';return;}
  state.pendingPlantKey=key;
  send('plant',{item:state.selectedSeed,tile:{...tile}});
}
function plantAimedSeed(){
  if(!state.selectedSeed){status.textContent='Choose or buy a seed before planting.';return;}
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hit=raycaster.intersectObjects(plotMeshes,false)[0];
  const tile=hit?.object.userData||state.selectedTile;
  plantSeedAt(tile);
}
function findRoot(object,property){
  let node=object;while(node){if(node.userData?.[property])return node;node=node.parent;}return null;
}
function fireGun(target=null){
  const player=state.players.get(state.playerId);
  if(player?.safetyOn){status.textContent='Gun safety is on. Press G to switch it off.';return;}
  if(!player?.weapons?.[player.weapon]&&!player?.customGuns?.some(gun=>gun.id===player.weapon)){status.textContent='Unlock or craft a weapon before shooting.';return;}
  if(!(player.magazines?.[player.weapon]>0)){status.textContent='Your magazine is empty. Press R to reload.';return;}
  const direction=target
    ?new THREE.Vector3(target.x-camera.position.x,target.y+0.5-camera.position.y,target.z-camera.position.z).normalize()
    :new THREE.Vector3(Math.sin(state.yaw)*Math.cos(state.pitch),Math.sin(state.pitch),-Math.cos(state.yaw)*Math.cos(state.pitch)).normalize();
  const origin=camera.position.clone().addScaledVector(direction,.5),end=origin.clone().addScaledVector(direction,18);
  const tracer=new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin,end]),new THREE.LineBasicMaterial({color:0xffe6a1,transparent:true,opacity:.8}));
  scene.add(tracer);setTimeout(()=>disposeGroup(tracer),100);
  state.weaponKick=.11;
  send('shoot',{...(target?{target:target.id}:{}),direction:{x:direction.x,z:direction.z}});
}
canvas.addEventListener('click',event=>{
  if(joinScreen.hidden===false||state.disposed)return;
  if(document.pointerLockElement!==canvas){
    if(typeof canvas.requestPointerLock==='function'){
      try{
        const lockRequest=canvas.requestPointerLock();
        lockRequest?.catch(error=>{console.warn('Could not lock the garden view to the pointer.',error);status.textContent='Could not capture the mouse. Check browser pointer-lock permissions.';});
      }catch(error){console.warn('Could not lock the garden view to the pointer.',error);status.textContent='Could not capture the mouse. Check browser pointer-lock permissions.';}
    }else status.textContent='This browser does not support click-to-look.';
  }
  if(document.pointerLockElement===canvas){pointer.set(0,0);}
  else {
    const bounds=canvas.getBoundingClientRect();pointer.x=(event.clientX-bounds.left)/bounds.width*2-1;pointer.y=-(event.clientY-bounds.top)/bounds.height*2+1;
  }
  raycaster.setFromCamera(pointer,camera);
  const zombieMeshes=Array.from(state.zombieMeshes.values());
  const hit=raycaster.intersectObjects(zombieMeshes,true)[0];
  if(hit){
    const root=findRoot(hit.object,'zombieId'),zombie=root&&state.zombies.get(root.userData.zombieId);
    if(zombie){fireGun(zombie);return;}
  }
  const plotHit=raycaster.intersectObjects(plotMeshes,false)[0];
  if(plotHit){
    const tile=plotHit.object.userData;
    if(state.trowelFrom){
      send('move-plant',{from:state.trowelFrom,to:tile});state.trowelFrom=null;
      updateActions(state.players.get(state.playerId));
    }else selectPlot(tile);
    return;
  }
  const point=raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
  if(point){const tile=plotMeshes.find(mesh=>Math.abs(point.x-mesh.position.x)<=.88&&Math.abs(point.z-mesh.position.z)<=.88)?.userData;if(tile){
    if(state.trowelFrom){send('move-plant',{from:state.trowelFrom,to:tile});state.trowelFrom=null;updateActions(state.players.get(state.playerId));}
    else selectPlot(tile);
    return;
  }}
  fireGun();
});
function bindAction(id,action,extra=()=>({})){
  $(id).addEventListener('click',()=>{if(!state.selectedTile)return;send(action,{tile:gardenPlotKey(state.selectedTile),...extra()});});
}
$('plantButton').addEventListener('click',()=>plantSeedAt(state.selectedTile));
bindAction('harvestButton','harvest');
bindAction('waterButton','water');
bindAction('shovelButton','shovel');
bindAction('sprinklerButton','sprinkler',()=>({tile:{...state.selectedTile}}));
$('craftCustomButton').addEventListener('click',()=>{
  const components=Array.from($('componentSelect').querySelectorAll('input:checked'),input=>input.value);
  if(components.length===4)send('craft',{item:'customGun',base:'peaBlaster',components});
});
$('sellAllButton').addEventListener('click',()=>send('sell',{item:'all'}));
$('trowelButton').addEventListener('click',()=>{
  if(!state.selectedTile)return;
  state.trowelFrom={...state.selectedTile};state.selectedTile=null;
  $('selectedTile').textContent='Select an empty destination plot for the plant';
  updateWorld();updateActions(state.players.get(state.playerId));
});
$('refillButton').addEventListener('click',()=>send('refill-water'));
seedSelect.addEventListener('change',()=>{state.selectedSeed=seedSelect.value;});
weaponSelect.addEventListener('change',()=>send('equip',{item:weaponSelect.value}));
document.querySelectorAll('[data-shop-tab]').forEach(button=>button.addEventListener('click',()=>{
  state.selectedShop=button.dataset.shopTab;
  document.querySelectorAll('[data-shop-tab]').forEach(tab=>{const active=tab===button;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));});
  renderShop();
}));
document.querySelectorAll('[data-seed-filter]').forEach(button=>button.addEventListener('click',()=>{
  state.seedCategory=button.dataset.seedFilter;
  document.querySelectorAll('[data-seed-filter]').forEach(filter=>filter.classList.toggle('active',filter===button));
  renderShop();
}));
$('publicButton').addEventListener('click',()=>connect('public'));
$('createPrivateButton').addEventListener('click',()=>connect('private-create'));
$('privateForm').addEventListener('submit',event=>{event.preventDefault();connect('private-join',$('privateCode').value.trim());});
$('copyCode').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(state.roomId);status.textContent='Private garden code copied.';}
  catch(error){status.textContent=`Share private code: ${state.roomId}`;}
});
$('leaveButton').addEventListener('click',()=>{
  state.socket?.close();state.socket=null;joinScreen.hidden=false;$('leaveButton').hidden=true;
  state.nearbyStation='';state.dismissedStation='';hideInteractionPopups();
});
function toggleGunSafety(){
  const player=state.players.get(state.playerId);if(!player)return;
  player.safetyOn=!player.safetyOn;updateActions(player);send('safety',{enabled:player.safetyOn});
}
function selectSeedIndex(index){
  const player=state.players.get(state.playerId),available=seeds.filter(item=>(player?.seeds[item.id]||0)>0),seed=available[index];
  if(!seed)return;
  state.selectedSeed=seed.id;seedSelect.value=seed.id;updateActions(player);
}
function cycleSeed(direction){
  const player=state.players.get(state.playerId),available=seeds.filter(item=>(player?.seeds[item.id]||0)>0);
  if(!available.length)return;
  const index=available.findIndex(item=>item.id===state.selectedSeed);
  selectSeedIndex((index+direction+available.length)%available.length);
}
function cycleWeapon(){
  const player=state.players.get(state.playerId);if(!player)return;
  const available=Array.from(weaponSelect.options).filter(option=>player.weapons[option.value]||player.customGuns?.some(gun=>gun.id===option.value));
  if(!available.length)return;
  const index=available.findIndex(option=>option.value===player.weapon),next=available[(index+1)%available.length];
  weaponSelect.value=next.value;send('equip',{item:next.value});
}
function activateAction(id){const button=$(id);if(!button.disabled)button.click();}
window.addEventListener('keydown',event=>{
  const popupOpen=!$('shopPopup').hidden||!$('workbenchPopup').hidden;
  const typing=['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName);
  const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
  if(popupOpen&&movementKeys.includes(event.code)){event.preventDefault();return;}
  if(movementKeys.includes(event.code)&&!typing){state.keys.add(event.code);event.preventDefault();}
  if(event.code==='Space'&&!typing){event.preventDefault();if(!event.repeat&&!popupOpen&&!state.ziplineRide&&state.jumpHeight===0)state.jumpVelocity=8;return;}
  if(event.repeat||typing)return;
  if(/^Digit[1-9]$/.test(event.code)){selectSeedIndex(Number(event.code.slice(-1))-1);return;}
  if(event.code==='KeyQ'){plantAimedSeed();return;}
  if(event.code==='KeyR'){send('reload');return;}
  if(event.code==='KeyG'){toggleGunSafety();return;}
  if(event.code==='KeyB'){cycleWeapon();return;}
  if(event.code==='KeyN'){cycleSeed(1);return;}
  if(event.code==='KeyF'){send('refill-water');return;}
  if(event.code==='KeyH'){if(harvestNearbyPlant())status.textContent='Harvested the nearest ripe plant.';return;}
  if(event.code==='KeyU'){activateAction('waterButton');return;}
  if(event.code==='KeyX'){activateAction('shovelButton');return;}
  if(event.code==='KeyC'){activateAction('sprinklerButton');return;}
  if(event.code==='KeyV'){activateAction('trowelButton');return;}
  if(event.code==='KeyY'){activateAction('sellAllButton');return;}
  if(event.code==='KeyP'){if(!$('workbenchPopup').hidden)activateAction('craftCustomButton');else status.textContent='Open the workbench with E before crafting.';return;}
  if(event.code==='KeyT'){startZipline();return;}
  if(event.code==='KeyE'){if(state.nearbyStation)openStationPopup(state.nearbyStation);return;}
  if(event.code==='KeyK')$('keybinds').open=!$('keybinds').open;
});
$('closeShopPopup').addEventListener('click',()=>{
  state.dismissedStation=state.nearbyStation;
  $('shopPopup').hidden=true;
});
$('closeWorkbenchPopup').addEventListener('click',()=>{
  state.dismissedStation=state.nearbyStation;
  $('workbenchPopup').hidden=true;
});
window.addEventListener('keyup',event=>state.keys.delete(event.code));
window.addEventListener('blur',()=>state.keys.clear());
window.addEventListener('resize',resize);
canvas.addEventListener('contextmenu',event=>event.preventDefault());
canvas.addEventListener('pointerlockerror',()=>{status.textContent='Could not capture the mouse. Check browser pointer-lock permissions.';});
document.addEventListener('mousemove',event=>{
  if(document.pointerLockElement!==canvas)return;
  state.yaw+=event.movementX*.0022;
  state.pitch=Math.max(-1.1,Math.min(.5,state.pitch-event.movementY*.002));
});

function animate(){
  if(state.disposed)return;
  const delta=Math.min(clock.getDelta(),.05);
  state.mapDrawElapsed+=delta;
  if(state.mapDrawElapsed>=.12){state.mapDrawElapsed=0;drawFarmMap();}
  updateWeatherInWorld(delta);
  if(state.roomId&&state.socket?.readyState===WebSocket.OPEN){
    const interactionOpen=!$('shopPopup').hidden||!$('workbenchPopup').hidden;
    let cameraY=1.65;
    if(state.ziplineRide){
      const ride=state.ziplineRide;
      ride.progress=Math.max(0,Math.min(1,ride.progress+ride.direction*delta/ride.duration));
      const point=ride.curve.getPoint(ride.progress);
      state.x=point.x;state.z=point.z;cameraY=point.y+1.15;
      const finished=ride.direction===1?ride.progress>=1:ride.progress<=0;
      if(finished){state.ziplineRide=null;state.targetX=state.x;state.targetZ=state.z;status.textContent='Zipline ride complete.';cameraY=1.65;}
    }else{
      const forward=interactionOpen?0:(state.keys.has('KeyW')||state.keys.has('ArrowUp')?1:0)-(state.keys.has('KeyS')||state.keys.has('ArrowDown')?1:0);
      const side=interactionOpen?0:(state.keys.has('KeyD')||state.keys.has('ArrowRight')?1:0)-(state.keys.has('KeyA')||state.keys.has('ArrowLeft')?1:0);
      const length=Math.hypot(forward,side)||1;
      const inputX=(Math.sin(state.yaw)*forward+Math.cos(state.yaw)*side)/length;
      const inputZ=(-Math.cos(state.yaw)*forward+Math.sin(state.yaw)*side)/length;
      const blend=1-Math.exp(-11*delta);
      const moveSpeed=state.weather==='snowstorm'?2.8:4.2;
      state.velocity.x+=(inputX*moveSpeed-state.velocity.x)*blend;
      state.velocity.y+=(inputZ*moveSpeed-state.velocity.y)*blend;
      if(!forward&&!side)state.velocity.multiplyScalar(Math.exp(-8*delta));
      const nextX=state.x+state.velocity.x*delta,nextZ=state.z+state.velocity.y*delta;
      if(!gardenPositionBlocked(nextX,state.z))state.x=nextX;else state.velocity.x=0;
      if(!gardenPositionBlocked(state.x,nextZ))state.z=nextZ;else state.velocity.y=0;
      const mapDistance=Math.hypot(state.x,state.z);
      if(mapDistance>farmGrid.mapRadius-.6){const scale=(farmGrid.mapRadius-.6)/mapDistance;state.x*=scale;state.z*=scale;}
      if(!forward&&!side&&Math.hypot(state.targetX-state.x,state.targetZ-state.z)<1){
        state.x+=(state.targetX-state.x)*Math.min(1,delta*3);
        state.z+=(state.targetZ-state.z)*Math.min(1,delta*3);
      }
    }
    if(!state.ziplineRide){
      state.jumpVelocity-=20*delta;state.jumpHeight+=state.jumpVelocity*delta;
      if(state.jumpHeight<0){state.jumpHeight=0;state.jumpVelocity=0;}
    }
    if(performance.now()-state.lastMove>100){send('move',{x:state.x,z:state.z});state.lastMove=performance.now();}
    updateNearbyStation();
    camera.position.set(state.x,cameraY+state.jumpHeight,state.z);
    if(state.ziplineRide){
      const nextProgress=Math.max(0,Math.min(1,state.ziplineRide.progress+state.ziplineRide.direction*.025));
      const ahead=state.ziplineRide.curve.getPoint(nextProgress);camera.lookAt(ahead.x,ahead.y+1.15,ahead.z);
    }else{
      const cosPitch=Math.cos(state.pitch);
      camera.lookAt(state.x+Math.sin(state.yaw)*cosPitch,1.65+Math.sin(state.pitch),state.z-Math.cos(state.yaw)*cosPitch);
    }
  }
  animateMutationEffects(delta);animateHeldWeapon(delta);animateProjectiles();
  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}
const clock=new THREE.Clock();
function uiTick(){
  if(state.roomId){
    const now=performance.now();
    state.phaseRemaining=Math.max(0,state.phaseDeadline-now);
    state.weatherRemaining=Math.max(0,state.weatherDeadline-now);
    const local=state.players.get(state.playerId);updateHud(local);updateActions(local);updatePlantLabels();
    $('weatherLabel').textContent=`Weather · ${weatherName(state.weather)} · ${formatTime(state.weatherRemaining)}`;
  }
  setTimeout(uiTick,250);
}
function init(){
  try{
    const account=readSektorAccount();
    $('playerName').value=account?localStorage.getItem(`gardenfallName:${account.key}`)||account.username:'';
  }catch(error){console.warn('Could not load the Sektor account session.',error);}
  updateAccountGate();
  renderShop();resize();drawFarmMap();requestAnimationFrame(animate);uiTick();
}
window.addEventListener('pagehide',()=>{
  state.disposed=true;state.socket?.close();renderer.setAnimationLoop(null);renderer.dispose();
});
init();
window.addEventListener('pagehide',()=>{
  state.disposed=true;state.socket?.close();renderer.setAnimationLoop(null);renderer.dispose();
});
init();
