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
const hemisphere=new THREE.HemisphereLight(0xe5f5da,0x405b42,2.1);scene.add(hemisphere);
const sunlight=new THREE.DirectionalLight(0xfff0ce,2.2);sunlight.position.set(-5,12,8);scene.add(sunlight);
const camera=new THREE.PerspectiveCamera(42,1,.1,240);
scene.add(camera);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const heldWeapon=new THREE.Group();camera.add(heldWeapon);heldWeapon.visible=false;

const nightLanterns=[
  {x:-18,z:18,color:0xfff1b8,intensity:1.1},
  {x:18,z:18,color:0xfff1b8,intensity:1.1},
  {x:-18,z:-18,color:0xfff1b8,intensity:1.1},
  {x:18,z:-18,color:0xfff1b8,intensity:1.1},
].map(config=>{
  const light=new THREE.PointLight(config.color,0,38,2);
  light.position.set(config.x,3.4,config.z);
  scene.add(light);
  return light;
});
const GARDEN_COIN_CAP = 1_000_000_000;
const state={
  socket:null,roomId:'',playerId:'',roomMode:'',gardenAccount:null,offline:false,day:1,phase:'day',phaseRemaining:0,phaseDeadline:0,weatherDeadline:0,gardenHealth:100,
  players:new Map(),plants:new Map(),seedDrops:new Map(),zombies:new Map(),sprinklers:new Set(),plantMeshes:new Map(),seedDropMeshes:new Map(),zombieMeshes:new Map(),playerMeshes:new Map(),projectileMeshes:new Map(),droneMeshes:new Map(),
  selectedTile:null,selectedSeed:'',selectedShop:'seeds',seedCategory:'all',keys:new Set(),x:0,z:4.7,lastMove:0,
  yaw:0,pitch:-.28,velocity:new THREE.Vector2(),targetX:0,targetZ:4.7,weather:'clear',ponds:[],jumpHeight:0,jumpVelocity:0,
  weatherRemaining:0,weatherKnown:false,clientId:'',trowelFrom:null,nearbyStation:'',ziplineTarget:'',ziplineRide:null,pendingPlantKey:'',cheatBuffer:'',devMenuOpen:false,
  dismissedStation:'',sprinklerExpiry:new Map(),shopStock:{seeds:{},gear:{},weapons:{}},shopRestockAt:0,shopRestockNotified:false,restockBannerTimer:0,lanterns:new Map(),lanternMeshes:new Map(),
  seedSignature:null,shopSignature:null,partsSignature:null,weaponSignature:'',weaponClock:0,weaponKick:0,mapDrawElapsed:0,weatherFrameDisabled:false,mutationFramesDisabled:false,offlineFrameWarned:false,disposed:false,
};
const seeds=[
  {id:'clover',name:'Clover Patch',cost:22,kind:'crop',description:'Quick-growing lucky crop · sell for 25'},
  {id:'berry',name:'Berry Bush',cost:28,kind:'crop',description:'Fast crop · sell for 27'},
  {id:'reedTube',name:'Reed Tube',cost:30,kind:'special',description:'Long-range custom gun barrel'},
  {id:'sunflower',name:'Sunflower',cost:35,kind:'crop',description:'Grows into a coin crop · sell for 38'},
  {id:'bamboo',name:'Bamboo Stalk',cost:38,kind:'special',description:'Sell for 6 coins or craft a gun barrel'},
  {id:'bluebell',name:'Bluebell',cost:42,kind:'crop',description:'Quick-growing spring flower · sell for 35'},
  {id:'magazineVine',name:'Magazine Vine',cost:42,kind:'special',description:'Adds capacity to your crafted gun'},
  {id:'iris',name:'Iris Bloom',cost:48,kind:'crop',description:'A vibrant flower with high-value petals · sell for 32'},
  {id:'glowMushroom',name:'Glow Mushroom',cost:54,kind:'crop',description:'Two harvests · sells for 42 each'},
  {id:'apple',name:'Apple Tree',cost:58,kind:'crop',description:'A sturdy orchard crop · sell for 43'},
  {id:'pumpkin',name:'Pumpkin',cost:64,kind:'crop',description:'Hardy crop · sell for 52'},
  {id:'pumpkinShell',name:'Pumpkin Shell',cost:52,kind:'special',description:'Adds extra capacity and protection'},
  {id:'pollenPod',name:'Pollen Pod',cost:66,kind:'special',description:'Adds power to a custom gun'},
  {id:'thornVine',name:'Thorn Vine',cost:68,kind:'special',description:'Craft a sturdy custom gun grip'},
  {id:'sunpetal',name:'Sunpetal',cost:70,kind:'crop',description:'Bright golden petals · sell for 46'},
  {id:'marigold',name:'Marigold',cost:72,kind:'crop',description:'Bright garden bloom · sell for 46'},
  {id:'peashooter',name:'Pea Shooter',cost:78,kind:'attack',description:'Auto-attacks zombies · harvest to unlock the Pea Blaster + 10 ammo'},
  {id:'roseTurret',name:'Rose Turret',cost:84,kind:'attack',description:'Rapid thorn shots · harvest for Pea Blaster ammo'},
  {id:'lavender',name:'Lavender',cost:88,kind:'crop',description:'Aromatic purple crop · sell for 48'},
  {id:'frostPetal',name:'Frost Petal',cost:92,kind:'crop',description:'Cool-toned bloom with very slow growth · sell for 57'},
  {id:'snowdrop',name:'Snowdrop',cost:96,kind:'crop',description:'Cold-hardy flower · sell for 54'},
  {id:'crystalBud',name:'Crystal Bud',cost:96,kind:'special',description:'Adds range and damage to custom guns'},
  {id:'snapdragon',name:'Snapdragon',cost:100,kind:'attack',description:'Fast close-range fire bursts · harvest for Pea Blaster ammo'},
  {id:'moonberry',name:'Moonberry',cost:110,kind:'crop',description:'Four harvests · aurora mutations are especially valuable'},
  {id:'fireBloom',name:'Firebloom',cost:115,kind:'crop',description:'Hot crimson bloom with long growth time · sell for 66'},
  {id:'frostFern',name:'Frost Fern',cost:118,kind:'attack',description:'Long-range frost volleys · harvest for Pea Blaster ammo'},
  {id:'epicSoil',name:'Epic Soil',cost:120,kind:'special',description:'Makes neighboring crops grow 30% faster'},
  {id:'moonLotus',name:'Moon Lotus',cost:126,kind:'crop',description:'A slow rare lotus with a luminous bloom · sell for 74'},
  {id:'starfruit',name:'Starfruit',cost:130,kind:'crop',description:'Rare, valuable single-harvest crop'},
  {id:'cornzooka',name:'Rocket Corn',cost:140,kind:'attack',description:'Splash-damage defender · harvest to unlock Rocket Corn + 2 ammo'},
  {id:'nightshade',name:'Nightshade',cost:150,kind:'crop',description:'Unusual dusk fruit · sell for 72'},
  {id:'thornGuard',name:'Thorn Guard',cost:160,kind:'attack',description:'Very tough defensive plant'},
  {id:'melonMortar',name:'Melon Mortar',cost:165,kind:'attack',description:'Heavy splash-damage shots · harvest for Rocket Corn ammo'},
  {id:'dragonfruit',name:'Dragon Fruit',cost:175,kind:'crop',description:'Rare, high-value fruit · sell for 92'},
  {id:'blastCorn',name:'Blast Corn',cost:60,kind:'special',description:'Adds splash damage to custom guns'},
  {id:'triggerBloom',name:'Trigger Bloom',cost:76,kind:'special',description:'Increases custom gun damage'},
];
seeds.sort((a,b)=>a.cost-b.cost);
const seedIcons={sunflower:'🌻',berry:'🫐',moonberry:'🌙',starfruit:'⭐',pumpkin:'🎃',glowMushroom:'🍄',clover:'🍀',lavender:'💜',snowdrop:'❄️',apple:'🍎',dragonfruit:'🐉',bluebell:'🔔',marigold:'🌼',nightshade:'🌑',peashooter:'🟢',cornzooka:'🌽',snapdragon:'🌺',frostFern:'❄️',melonMortar:'🍈',roseTurret:'🌹',thornGuard:'🌵',bamboo:'🎋',reedTube:'🌾',magazineVine:'🍃',pumpkinShell:'🎃',blastCorn:'🌽',pollenPod:'🌼',triggerBloom:'🌸',thornVine:'🌿',crystalBud:'💎',epicSoil:'🪴',iris:'🦋',sunpetal:'🌞',frostPetal:'❄️',fireBloom:'🔥',moonLotus:'🌙'};
const fruitPlantSpecs={berry:{count:5,regrow:15000},apple:{count:5,regrow:18000},starfruit:{count:4,regrow:20000},dragonfruit:{count:4,regrow:22000},nightshade:{count:4,regrow:18000}};
const gear=[
  {id:'wateringCan',name:'Watering Can',cost:20,description:'Water your own plant for a growth boost'},
  {id:'shovel',name:'Garden Shovel',cost:25,description:'Remove your own plant and free its plot'},
  {id:'trowel',name:'Trowel',cost:25,description:'One use · move one of your plants to another plot'},
  {id:'sprinkler',name:'Sprinkler',cost:45,description:'Auto-waters plants in nearby plots'},
  {id:'fertilizer',name:'Plant Fertilizer',cost:30,description:'Required to craft a garden gun'},
  {id:'backpack',name:'Seed Backpack',cost:125,description:'Carry up to 10 seeds instead of one'},
  {id:'lights',name:'Garden Lights',cost:120,description:'Brightens night lanterns so the farm stays usable after dark'},
  {id:'drone',name:'Scout Drone',cost:10000,description:'Auto-buys seed or tool drops for you · max 2'},
  {id:'farmLayer',name:'Extra Farm Layer',cost:50000,description:'Adds a second connected farm layer · max 10'},
];
const ammoListings=[
  {id:'peaBlaster',name:'Pea Blaster ammo',cost:18,amount:10},
  {id:'cornZooka',name:'Rocket Corn ammo',cost:25,amount:2},
  {id:'brambleRifle',name:'Bramble Rifle ammo',cost:32,amount:16},
  {id:'bloomShotgun',name:'Bloom Shotgun shells',cost:30,amount:12},
  {id:'sunseedRepeater',name:'Sunseed Repeater ammo',cost:48,amount:36},
];
const weaponSpecs={
  peaBlaster:{name:'Pea Blaster',damage:18,range:13,capacity:10,blast:0},
  cornZooka:{name:'Cornzooka',damage:55,range:16,capacity:2,blast:2},
  brambleRifle:{name:'Bramble Rifle',damage:32,range:21,capacity:8,blast:0},
  bloomShotgun:{name:'Bloom Shotgun',damage:46,range:8.5,capacity:6,blast:0},
  sunseedRepeater:{name:'Sunseed Repeater',damage:22,range:17,capacity:18,blast:0},
};
const purchasableWeapons=[
  {id:'brambleRifle',name:'Bramble Rifle',cost:90,description:'Long-range, hard-hitting shots. Includes one magazine and reserve ammo.'},
  {id:'bloomShotgun',name:'Bloom Shotgun',cost:165,description:'Heavy damage up close. Includes one magazine and reserve shells.'},
  {id:'sunseedRepeater',name:'Sunseed Repeater',cost:220,description:'Fast follow-up shots with a larger magazine and ammo reserve.'},
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
let offlineWorldElapsed=0;
let offlineSaveElapsed=0;
let gardenAuthMode='login';

const farmGrid={count:8,rows:4,maxLayers:10,radius:70,mapRadius:95};
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
  if(parts.length!==3||!parts.every(Number.isInteger)||parts[0]<0||parts[0]>=farmGrid.count||parts[1]<0||parts[1]>=6||parts[2]<0||parts[2]>=farmGrid.rows+farmGrid.maxLayers)return null;
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
  const start=new THREE.Vector3(offset.radialX*hubEndpoint,6.2,offset.radialZ*hubEndpoint);
  const end=new THREE.Vector3(offset.radialX*farmEndpoint,6.2,offset.radialZ*farmEndpoint);
  const line=new THREE.LineCurve3(start,end);ziplineCurves.push(line);
  const cable=new THREE.Mesh(new THREE.TubeGeometry(line,48,.045,7,false),ziplineMaterial);scene.add(cable);
  makeZiplineTower(offset,hubEndpoint);makeZiplineTower(offset,farmEndpoint);
}
const garden=new THREE.Group();scene.add(garden);
const plotMaterial=new THREE.MeshStandardMaterial({color:0x704b31,roughness:1});
const plotEdgeMaterial=new THREE.MeshStandardMaterial({color:0x9a7045,roughness:1});
const plotMeshes=[];
const farmLayerRows=new Map();
const farmLayerFences=new Map();
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
  for(const piece of borderPieces){const fence=new THREE.Mesh(new THREE.BoxGeometry(piece.w,piece.h,piece.d),farmFenceMaterial);const position=farmLocalPosition(offset,piece.x,piece.z);fence.position.set(position.x,-.04,position.z);fence.rotation.y=offset.angle;garden.add(fence);if(piece.x===0&&piece.z>0)farmLayerFences.set(farmIndex,fence);}
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
function syncFarmLayers(players=state.players.values()){
  for(const player of players){
    const farmIndex=Number(player.farmIndex);
    if(!Number.isInteger(farmIndex)||farmIndex<0||farmIndex>=farmGrid.count)continue;
    const count=Math.max(0,Math.min(farmGrid.maxLayers,Math.floor(Number(player.farmLayers)||0)));
    const rows=farmLayerRows.get(farmIndex)||new Set(),offset=farmOffset(farmIndex);
    farmLayerFences.get(farmIndex).visible=count===0;
    for(let layer=0;layer<count;layer++){
      const row=farmGrid.rows+layer;
      if(rows.has(row))continue;
      const groundCenter=5.1+(layer+.5)*1.8,groundPosition=farmLocalPosition(offset,0,groundCenter);
      const ground=new THREE.Mesh(new THREE.BoxGeometry(13.4,.04,1.8),farmGroundMaterials[farmIndex%farmGroundMaterials.length]);
      ground.position.set(groundPosition.x,-.135,groundPosition.z);ground.rotation.y=offset.angle;ground.receiveShadow=true;garden.add(ground);
      for(let col=0;col<6;col++){
        const radial=(col-2.5)*1.8,tangent=(row-1.5)*1.8,position=farmLocalPosition(offset,radial,tangent);
        const tile=new THREE.Mesh(new THREE.BoxGeometry(1.7,.12,1.7),plotMaterial.clone());
        tile.position.set(position.x,-.04,position.z);tile.rotation.y=offset.angle;tile.receiveShadow=true;tile.userData={farmIndex,col,row};garden.add(tile);plotMeshes.push(tile);
        const edge=new THREE.Mesh(new THREE.BoxGeometry(1.78,.06,1.78),plotEdgeMaterial);
        edge.position.set(position.x,-.12,position.z);edge.rotation.y=offset.angle;garden.add(edge);
      }
      for(const side of [-1,1]){
        const sidePosition=farmLocalPosition(offset,side*6.8,groundCenter),sideFence=new THREE.Mesh(new THREE.BoxGeometry(.18,.22,1.8),farmFenceMaterial);
        sideFence.position.set(sidePosition.x,-.04,sidePosition.z);sideFence.rotation.y=offset.angle;garden.add(sideFence);
      }
      const fencePosition=farmLocalPosition(offset,0,5.1+(layer+1)*1.8),outerFence=new THREE.Mesh(new THREE.BoxGeometry(13.6,.22,.18),farmFenceMaterial);
      outerFence.position.set(fencePosition.x,-.04,fencePosition.z);outerFence.rotation.y=offset.angle;garden.add(outerFence);
      rows.add(row);
    }
    farmLayerRows.set(farmIndex,rows);
  }
}
function marketStall(x,z,title,primaryColor,rotation=0,secondaryColor=0xffffff){
  const stall=new THREE.Group();
  const wood=new THREE.MeshStandardMaterial({color:0x7d5636,roughness:.92});
  const darkWood=new THREE.MeshStandardMaterial({color:0x5a3b25,roughness:.9});
  const awningCanvas=document.createElement('canvas');awningCanvas.width=512;awningCanvas.height=256;
  const awningCtx=awningCanvas.getContext('2d');
  const stripeA=primaryColor.toString(16).padStart(6,'0');
  const stripeB=secondaryColor.toString(16).padStart(6,'0');
  for(let stripe=0;stripe<18;stripe++){
    awningCtx.fillStyle=stripe%2===0?`#${stripeA}`:`#${stripeB}`;
    awningCtx.fillRect(0,stripe*16,512,16);
  }
  awningCtx.strokeStyle='#b16236';awningCtx.lineWidth=6;awningCtx.strokeRect(6,6,500,244);
  const awningTexture=new THREE.CanvasTexture(awningCanvas);awningTexture.colorSpace=THREE.SRGBColorSpace;
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.9,.95,.14,18),new THREE.MeshStandardMaterial({color:0xd7c1a1,roughness:.9}));
  base.position.y=.06;stall.add(base);
  for(const [offsetX,offsetZ] of [[-.72,-.42],[.72,-.42],[-.72,.42],[.72,.42]]){
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.14,1.32,.14),darkWood);leg.position.set(offsetX,.66,offsetZ);stall.add(leg);
  }
  const stand=new THREE.Mesh(new THREE.BoxGeometry(2.0,1.08,.94),wood);stand.position.y=.62;stall.add(stand);
  const counter=new THREE.Mesh(new THREE.BoxGeometry(2.05,.18,1.05),darkWood);counter.position.y=1.14;stall.add(counter);
  const roofFrame=new THREE.Mesh(new THREE.BoxGeometry(2.44,.14,1.44),new THREE.MeshStandardMaterial({color:0x7a4a2f}));roofFrame.position.y=1.72;stall.add(roofFrame);
  const awning=new THREE.Mesh(new THREE.BoxGeometry(2.55,.18,1.58),new THREE.MeshStandardMaterial({map:awningTexture,roughness:.9}));awning.position.y=1.95;awning.rotation.x=-.12;stall.add(awning);
  const braceLeft=new THREE.Mesh(new THREE.BoxGeometry(.14,1.3,.14),new THREE.MeshStandardMaterial({color:0x70472e}));braceLeft.position.set(-.9,1.4,-.45);braceLeft.rotation.z=.45;stall.add(braceLeft);
  const braceRight=braceLeft.clone();braceRight.position.x=.9;braceRight.rotation.z=-.45;stall.add(braceRight);
  const crate1=new THREE.Mesh(new THREE.BoxGeometry(.44,.42,.42),new THREE.MeshStandardMaterial({color:0x9d6e49,roughness:.9}));crate1.position.set(-.68,1.35,-.2);stall.add(crate1);
  const crate2=crate1.clone();crate2.position.set(.68,1.35,-.2);stall.add(crate2);
  const vendor=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.42,4,8),new THREE.MeshStandardMaterial({color:0xf0c39b}));torso.position.y=1.12;vendor.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),new THREE.MeshStandardMaterial({color:0xf3d0ae}));head.position.y=1.62;vendor.add(head);
  const hat=new THREE.Mesh(new THREE.CylinderGeometry(.21,.24,.18,10),new THREE.MeshStandardMaterial({color:0x3a2d21}));hat.position.y=1.84;vendor.add(hat);
  const armLeft=new THREE.Mesh(new THREE.BoxGeometry(.11,.42,.11),new THREE.MeshStandardMaterial({color:0xf0c39b}));armLeft.position.set(-.26,1.2,0);armLeft.rotation.z=.9;vendor.add(armLeft);
  const armRight=armLeft.clone();armRight.position.x=.26;armRight.rotation.z=-.9;vendor.add(armRight);
  const legLeft=new THREE.Mesh(new THREE.BoxGeometry(.14,.5,.14),new THREE.MeshStandardMaterial({color:0x534538}));legLeft.position.set(-.11,.52,0);vendor.add(legLeft);
  const legRight=legLeft.clone();legRight.position.x=.11;vendor.add(legRight);
  vendor.position.z=.18;vendor.position.x=.05;stall.add(vendor);
  const sign=document.createElement('canvas');sign.width=256;sign.height=64;
  const context=sign.getContext('2d');context.fillStyle='#1b2b1f';context.fillRect(0,0,256,64);
  context.strokeStyle='#d7d9a8';context.lineWidth=4;context.strokeRect(4,4,248,56);
  context.fillStyle='#f4f4dc';context.font='bold 26px sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(title,128,32);
  const texture=new THREE.CanvasTexture(sign);texture.colorSpace=THREE.SRGBColorSpace;
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(1.65,.38),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));plate.position.set(0,1.2,-.9);stall.add(plate);
  stall.userData={id:title.toLowerCase().replace(/[^a-z]+/g,'-').replace(/^-|-$/g,'')||'stall',title,vendor,awning,armLeft,armRight};
  stall.position.set(x,0,z);stall.rotation.y=rotation;scene.add(stall);
}
marketStall(0,-4.1,'SEEDS',0xe13f3f,Math.PI,0xffffff);
marketStall(4.1,0,'GEAR',0xf4f3ef,Math.PI/2,0x5ea9c8);
marketStall(0,4.1,'SELL',0xf4f3ef,0,0xd1a16f);
marketStall(-4.1,0,'LANDS',0xf4f3ef,-Math.PI/2,0xb381d9);
marketStall(0,0,'GUN CRAFT',0xf4f3ef,0,0xb97bbb);
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

function addMutationFruitVisual(group,mutation){
  const colors={aurora:0x5ff2d1,solarFlare:0xff9b45,fireworks:0xff67bf,rainbow:0xb978ff};
  const color=colors[mutation];if(!color)return;
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.28,.03,12,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.84}));
  halo.rotation.x=Math.PI/2;halo.position.y=.18;group.add(halo);
  for(let index=0;index<3;index++){
    const angle=index*Math.PI*2/3;
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.05,8,8),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.7}));
    dot.position.set(Math.cos(angle)*.18,.14+(index%2)*.06,Math.sin(angle)*.18);group.add(dot);
  }
}
function addMutationVisual(group,mutation){
  const styles={
    aurora:{label:'AURORA',color:0x67f2d1,text:'#c5fff2'},
    solarFlare:{label:'SOLAR FLARE',color:0xffad48,text:'#ffe2a3'},
    fireworks:{label:'FIREWORKS',color:0xff70bc,text:'#ffd1e8'},
    rainbow:{label:'RAINBOW',color:0xc987ff,text:'#f2d5ff'},
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
  context.fillStyle='rgba(12,24,18,.7)';context.beginPath();context.roundRect(2,2,380,68,18);context.fill();
  context.strokeStyle=special?'#c8e585':'#f0d788';context.lineWidth=3;context.stroke();
  const texture=new THREE.CanvasTexture(labelCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,opacity:.72,depthTest:false}));
  sprite.position.y=2;sprite.scale.set(2.15,.4,1);sprite.renderOrder=10;group.add(sprite);
  group.userData.plantLabel={name:plant.name,canvas:labelCanvas,context,texture,sprite,text:''};
}
function updatePlantLabels(){
  const now=Date.now();
  for(const mesh of state.plantMeshes.values()){
    const plant=mesh.userData.plantData,label=mesh.userData.plantLabel;
    if(!plant||!label)continue;
    const isReady=now>=plant.matureAt;
    label.sprite.visible=!isReady;
    if(isReady)continue;
    const seconds=Math.max(0,Math.ceil((plant.matureAt-now)/1000));
    const timer=seconds?`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:'READY';
    const fruitSpec=fruitPlantSpecs[plant.type],fruitText=fruitSpec?` · ${Number(plant.fruitsAvailable)||0}/${fruitSpec.count} FRUIT`:'';
    const text=`${label.name.toUpperCase()} · ${timer}${fruitText}`;
    if(text===label.text)continue;
    label.text=text;label.context.clearRect(0,0,label.canvas.width,label.canvas.height);
    label.context.fillStyle='rgba(12,24,18,.7)';label.context.beginPath();label.context.roundRect(2,2,380,68,18);label.context.fill();
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

function addHarvestableFruit(group,type,count,mutation=''){
  const total=Math.max(0,Number(count)||0);
  if(total===0)return;
  const fruitPositions={
    apple:[[0,2.75,.78],[-.61,2.48,.54],[.62,2.58,-.52],[-.24,3.3,-.55],[.83,2.32,.06]],
    berry:[[.08,.72,.28],[-.25,.61,.18],[.2,.46,-.27],[-.12,.78,-.22],[.31,.57,-.04]],
    starfruit:[[.31,1.86,.34],[-.38,1.98,.25],[.34,1.62,-.3],[-.3,1.72,-.35]],
    nightshade:[[.08,2.28,.6],[-.49,2.26,.33],[.48,2.34,-.32],[-.08,2.78,-.37]],
    dragonfruit:[[.2,.82,.03],[-.2,1.38,.03],[.2,1.92,.03],[-.2,2.47,.03]],
  };
  const positions=fruitPositions[type]||[[0,1.1,.35],[.3,1.2,-.2],[-.3,1.2,-.2]];
  const mutationPalette={aurora:0x5ff2d1,solarFlare:0xff9b45,fireworks:0xff67bf,rainbow:0xc98cff};
  const mutationColor=mutation&&mutationPalette[mutation]?new THREE.Color(mutationPalette[mutation]):null;
  for(let index=0;index<total;index++){
    const [x,y,z]=positions[index%positions.length];
    const angle=index*(Math.PI*2/Math.max(2,total));
    const tint=(baseColor)=>mutationColor?new THREE.Color(baseColor).lerp(mutationColor,0.55):new THREE.Color(baseColor);
    if(type==='apple'){
      const apple=new THREE.Mesh(new THREE.SphereGeometry(.18,14,12),new THREE.MeshStandardMaterial({color:tint(index%2?0xd94335:0xe9873c).getHex(),roughness:.36,emissive:mutationColor?mutationColor.getHex():0x000000,emissiveIntensity:mutation?0.38:0}));
      apple.scale.set(1.1,1.2,1.1);apple.position.set(x,y,z);group.add(apple);
      const twigStart=new THREE.Vector3(x,y-.1,z),twigEnd=new THREE.Vector3(x*.58,y-.16,z*.58),twigVector=twigEnd.clone().sub(twigStart);
      const twig=new THREE.Mesh(new THREE.CylinderGeometry(.018,.026,twigVector.length(),6),new THREE.MeshStandardMaterial({color:0x60452b}));
      twig.position.copy(twigStart).add(twigEnd).multiplyScalar(.5);twig.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),twigVector.normalize());group.add(twig);
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.016,.022,.1,6),new THREE.MeshStandardMaterial({color:0x60452b}));stem.position.set(x,y+.1,z);group.add(stem);
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),new THREE.MeshStandardMaterial({color:0x73ad4e}));leaf.scale.set(1.25,.35,.75);leaf.position.set(x+.07,y+.15,z);group.add(leaf);
    }else if(type==='berry'){
      const berry=new THREE.Mesh(new THREE.SphereGeometry(.085,10,8),new THREE.MeshStandardMaterial({color:tint(index%2?0xb52a67:0x8f1f4f).getHex(),roughness:.28,emissive:mutationColor?mutationColor.getHex():0x000000,emissiveIntensity:mutation?0.42:0}));
      berry.position.set(x,y,z);group.add(berry);
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.014,.09,6),new THREE.MeshStandardMaterial({color:0x4c7c45}));stem.position.set(x,y+.07,z);group.add(stem);
    }else if(type==='starfruit'){
      const starShape=new THREE.Shape();
      for(let point=0;point<10;point++){
        const theta=-Math.PI/2+point*(Math.PI/5); const radius=point%2===0?0.14:0.05; const sx=Math.cos(theta)*radius, sy=Math.sin(theta)*radius; if(point===0)starShape.moveTo(sx,sy); else starShape.lineTo(sx,sy);
      }
      starShape.closePath();
      const star=new THREE.Mesh(new THREE.ExtrudeGeometry(starShape,{depth:.08,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.012,bevelThickness:.012}),new THREE.MeshStandardMaterial({color:tint(index%2?0xf4d049:0xf0a82f).getHex(),roughness:.35,emissive:mutationColor?mutationColor.getHex():0x000000,emissiveIntensity:mutation?0.46:0}));
      star.position.set(x,y,z);star.rotation.x=Math.PI/2;star.rotation.z=angle;group.add(star);
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,.12,6),new THREE.MeshStandardMaterial({color:0x5b3c20}));stem.position.set(x,y+.06,z);group.add(stem);
    }else if(type==='nightshade'){
      const berry=new THREE.Mesh(new THREE.SphereGeometry(.14,12,10),new THREE.MeshStandardMaterial({color:tint(index%2?0x5a3a88:0x7e56c9).getHex(),roughness:.32,metalness:.15,emissive:mutationColor?mutationColor.getHex():0x000000,emissiveIntensity:mutation?0.38:0}));
      berry.scale.set(1,.9,1.05);berry.position.set(x,y,z);group.add(berry);
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(.08,8,6),new THREE.MeshStandardMaterial({color:0x4d7f50}));leaf.scale.set(1.2,.3,.8);leaf.position.set(x+.1,y+.12,z);group.add(leaf);
    }else if(type==='dragonfruit'){
      const fruit=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.24,7,10),new THREE.MeshStandardMaterial({color:tint(index%2?0xefd3d7:0xd55f88).getHex(),roughness:.28,emissive:mutationColor?mutationColor.getHex():0x000000,emissiveIntensity:mutation?0.38:0}));
      fruit.rotation.z=Math.PI/2;fruit.position.set(x,y,z);group.add(fruit);
      const branch=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.2,6),new THREE.MeshStandardMaterial({color:0x4b8c4b}));branch.position.set(x*.42,y,z);branch.rotation.z=x>0?-.75:.75;group.add(branch);
      for(let bract=0;bract<4;bract++){
        const a=bract*Math.PI/2,leaf=new THREE.Mesh(new THREE.ConeGeometry(.045,.15,5),new THREE.MeshStandardMaterial({color:0x66ae57}));
        leaf.position.set(x+Math.cos(a)*.16,y+.04,z+Math.sin(a)*.16);leaf.rotation.z=Math.cos(a)*-.8;leaf.rotation.x=Math.sin(a)*.8;group.add(leaf);
      }
    }else{
      const fruit=new THREE.Mesh(new THREE.SphereGeometry(.2,14,12),new THREE.MeshStandardMaterial({color:tint(index%2?0xed5598:0xc93382).getHex(),roughness:.3,emissive:mutationColor?mutationColor.getHex():0x000000,emissiveIntensity:mutation?0.44:0}));
      fruit.scale.set(.9,1.4,.9);fruit.position.set(x,y,z);group.add(fruit);
      for(let bract=0;bract<4;bract++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.06,.2,6),new THREE.MeshStandardMaterial({color:0x71b44b}));leaf.position.set(x+Math.cos(bract*Math.PI/2)*.18,y+.12,z+Math.sin(bract*Math.PI/2)*.18);leaf.rotation.z=Math.cos(bract*Math.PI/2)*-.9;leaf.rotation.x=Math.sin(bract*Math.PI/2)*.9;group.add(leaf);}
    }
  }
}
function makeFlower(type,mutation='',fruitsAvailable=0,showLabel=true,showSignature=true){
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
    addHarvestableFruit(group,type,fruitsAvailable,mutation);
  }else if(type==='snapdragon'){
    createStem(.78,0x498b48,.09);leaf(-.16,.35,0,.6);leaf(.16,.48,.02,-.6);
    const bloom=new THREE.Mesh(new THREE.SphereGeometry(.27,12,8),material(0xe35748));bloom.position.set(0,.82,-.06);bloom.scale.set(1,.75,1.15);group.add(bloom);
    for(let index=0;index<5;index++){const angle=index*Math.PI*2/5,petal=new THREE.Mesh(new THREE.ConeGeometry(.1,.27,7),material(index%2?0xffb34f:0xf16a48));petal.position.set(Math.cos(angle)*.23,.82,Math.sin(angle)*.23);petal.rotation.x=Math.PI/2;group.add(petal);}
  }else if(type==='frostFern'){
    createStem(.9,0x54874f,.055);
    for(let side of [-1,1])for(let index=0;index<4;index++){const y=.25+index*.17;leaf(side*(.18+index*.025),y,0,side*(.4+index*.12),0x6bb98c,.72);}
    for(let index=0;index<3;index++)bud((index-1)*.13,1.02,0,.1,0x8be9ef,true);
  }else if(type==='melonMortar'){
    const melon=new THREE.Mesh(new THREE.SphereGeometry(.34,14,10),material(0x54a84b));melon.position.y=.48;melon.scale.set(1,.9,1);group.add(melon);
    for(let index=0;index<6;index++){const angle=index*Math.PI/3,rib=new THREE.Mesh(new THREE.SphereGeometry(.13,8,7),material(0x78c94b));rib.scale.set(.55,1,.75);rib.position.set(Math.cos(angle)*.22,.47,Math.sin(angle)*.22);group.add(rib);}
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,.42,10),material(0x4a7440));tube.rotation.x=Math.PI/2;tube.position.set(0,.68,-.34);group.add(tube);
  }else if(type==='roseTurret'){
    createStem(.82,0x477f48,.065);leaf(-.18,.34,0,.6);leaf(.18,.45,.02,-.6);
    petalRing(.88,.16,8,0xd94157,.13);bud(0,.88,0,.14,0xff8b72);
    for(let index=0;index<5;index++){const thorn=new THREE.Mesh(new THREE.ConeGeometry(.045,.15,5),material(0xe2d58d));thorn.position.set(Math.sin(index*2)*.07,.25+index*.12,.04);group.add(thorn);}
  }else if(type==='peashooter'){
    const head=new THREE.Mesh(new THREE.SphereGeometry(.27,12,9),new THREE.MeshStandardMaterial({color:0x63d26d,emissive:0x1f4d2c,emissiveIntensity:.22}));head.position.set(0,.8,-.05);head.scale.set(1,1,.82);group.add(head);
    const snout=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,.42,12),new THREE.MeshStandardMaterial({color:0x3c7c42,metalness:.18,roughness:.55}));snout.rotation.x=Math.PI/2;snout.position.set(0,.77,-.34);group.add(snout);
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),new THREE.MeshBasicMaterial({color:0xffffff}));eye.position.set(.13,.89,-.24);group.add(eye);
    const eye2=eye.clone();eye2.position.x=-.13;group.add(eye2);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:0xc8ff8c,transparent:true,opacity:.7}));glow.position.set(0,.76,-.46);group.add(glow);
  }else if(type==='cornzooka'){
    const cob=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.48,5,8),new THREE.MeshStandardMaterial({color:0xffd75c,emissive:0x94540c,emissiveIntensity:.18}));cob.position.set(0,.79,0);group.add(cob);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.18,.23,.54,10),new THREE.MeshStandardMaterial({color:0x9b733c,metalness:.3,roughness:.4}));barrel.rotation.x=Math.PI/2;barrel.position.set(0,.8,-.34);group.add(barrel);
    const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.05,.09,.18,8),new THREE.MeshStandardMaterial({color:0xe9b74a}));nozzle.rotation.x=Math.PI/2;nozzle.position.set(0,.8,-.62);group.add(nozzle);
    for(const side of [-1,1])leaf(side*.2,.36,0,side*.4,0x4d983f,1.2);
  }else if(type==='moonberry'){
    const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(.42,1),material(0x356b4b));bush.position.y=.43;group.add(bush);
    for(let i=0;i<8;i++){
      const a=i*Math.PI*2/8,y=.32+(i%3)*.17;
      bud(Math.cos(a)*.32,y,Math.sin(a)*.32,.09,i%2?0xa64cf5:0x48d7db,true);
    }
    leaf(-.25,.62,.08,-.55,0x7dcb68,.9);leaf(.25,.55,-.08,.55,0x7dcb68,.9);
  }else if(type==='starfruit'){
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,2.1,10),material(0x764a2a));trunk.position.y=1.05;group.add(trunk);
    for(const side of [-1,1]){const branch=new THREE.Mesh(new THREE.CylinderGeometry(.06,.1,1.15,7),material(0x764a2a));branch.position.set(side*.24,1.5,0);branch.rotation.z=side*-.8;group.add(branch);}
    for(const side of [-1,1]){const leafMesh=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),material(0x54a757));leafMesh.scale.set(1.25,.3,1.25);leafMesh.position.set(side*.32,1.75,0);leafMesh.rotation.z=side*.4;group.add(leafMesh);}
    addHarvestableFruit(group,type,fruitsAvailable,mutation);
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
  }else if(type==='apple'||type==='dragonfruit'||type==='bluebell'||type==='marigold'||type==='nightshade'){
    if(type==='apple'){
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,3.3,10),material(0x795335));trunk.position.y=1.65;group.add(trunk);
      for(const side of [-1,1]){const branch=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,1.3,7),material(0x795335));branch.position.set(side*.42,2.4,0);branch.rotation.z=side*-.72;group.add(branch);}
      for(const [x,y,z,radius]of [[0,2.7,0,.88],[-.48,2.45,.08,.62],[.52,2.52,-.02,.7],[0,3.0,-.18,.74],[-.82,2.25,.05,.48],[.82,2.3,-.04,.46]]){const crown=new THREE.Mesh(new THREE.SphereGeometry(radius,12,9),material(0x5d9147));crown.position.set(x,y,z);crown.scale.set(1,.82,1);group.add(crown);}
      addHarvestableFruit(group,type,fruitsAvailable,mutation);
    }else if(type==='dragonfruit'){
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.17,.24,3.1,12),material(0x3e8749));trunk.position.y=1.55;group.add(trunk);
      const upperStem=new THREE.Mesh(new THREE.CylinderGeometry(.08,.14,1.2,8),material(0x4fa95d));upperStem.position.set(0,2.5,0);upperStem.rotation.z=.1;group.add(upperStem);
      for(const side of [-1,1]){
        const arm=new THREE.Mesh(new THREE.CylinderGeometry(.07,.11,1.1,8),material(0x4da765));arm.position.set(side*.38,2.15,0);arm.rotation.z=side*-.82;group.add(arm);
        const leafMesh=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),material(0x63b96c));leafMesh.scale.set(1.6,.32,1.1);leafMesh.position.set(side*.56,2.7,0);leafMesh.rotation.z=side*.6;group.add(leafMesh);
      }
      for(let thorn=0;thorn<9;thorn++){
        const angle=thorn*Math.PI/4.5;
        const spike=new THREE.Mesh(new THREE.ConeGeometry(.035,.16,5),material(0xd5dda2));
        spike.position.set(Math.cos(angle)*.16,1.0+thorn*.19,Math.sin(angle)*.16);spike.rotation.z=Math.cos(angle)*1.1;spike.rotation.x=Math.sin(angle)*1.1;group.add(spike);
      }
      addHarvestableFruit(group,type,fruitsAvailable,mutation);
    }else if(type==='bluebell'){
      for(let index=0;index<5;index++){const x=(index-2)*.12;createStem(.64+(index%2)*.12,0x54884d,.035);const bell=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),material(0x718de0));bell.scale.set(.8,1.25,.8);bell.position.set(x,.72+(index%2)*.12,0);group.add(bell);}
    }else if(type==='marigold'){
      createStem(.62,0x4e8a45,.05);petalRing(.72,.18,10,0xf28d25,.12);bud(0,.72,0,.11,0x70421d);
    }else if(type==='nightshade'){
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.22,2.8,10),material(0x4d3a54));trunk.position.y=1.4;group.add(trunk);
      for(const side of [-1,1]){const branch=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,1.2,7),material(0x4d3a54));branch.position.set(side*.34,2.1,0);branch.rotation.z=side*-.9;group.add(branch);}
      for(const [x,y,z,radius]of [[0,2.2,0,.7],[-.4,2.05,.1,.52],[.4,2.08,-.05,.56],[-.18,2.7,.12,.44],[.18,2.7,-.08,.44]]){const crown=new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),material(0x4f6e46));crown.position.set(x,y,z);crown.scale.set(1,.8,1);group.add(crown);}
      addHarvestableFruit(group,type,fruitsAvailable,mutation);
    }else{
      createStem(.65,0x514b69,.05);leaf(-.16,.35,0,.7,0x53694d);leaf(.16,.48,.02,-.7,0x53694d);
      for(let index=0;index<5;index++){const angle=index*Math.PI*2/5;bud(Math.cos(angle)*.18,.58+(index%2)*.12,Math.sin(angle)*.18,.085,0x7355a6,true);}
    }
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
    const bulb=new THREE.Mesh(new THREE.IcosahedronGeometry(.34,1),new THREE.MeshStandardMaterial({color:0x5e9d4d,emissive:0x2c5d2e,emissiveIntensity:.18}));bulb.position.y=.42;group.add(bulb);
    for(let i=0;i<10;i++){
      const a=i*Math.PI*2/10,spike=new THREE.Mesh(new THREE.ConeGeometry(.07,.27,6),material(0xc8d58a));
      spike.position.set(Math.cos(a)*.29,.43+(i%2)*.17,Math.sin(a)*.29);spike.rotation.z=Math.cos(a)*.85;spike.rotation.x=Math.sin(a)*.85;group.add(spike);
    }
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.46,.035,10,28),new THREE.MeshBasicMaterial({color:0x8ecf72,transparent:true,opacity:.7}));ring.rotation.x=Math.PI/2;ring.position.y=.08;group.add(ring);
  }else{
    const height=.7;const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,height,8),material(0x45874a));stalk.position.y=height/2;group.add(stalk);
    for(let i=0;i<4;i++){const kernel=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),material(0xffb52d));kernel.position.set(Math.sin(i*1.6)*.17,.48+(i%2)*.2,Math.cos(i*1.6)*.17);group.add(kernel);}
  }
  if(showSignature)addSpecialPlantSignature(group,type);
  if(showLabel)addPlantLabel(group,type);
  if(type==='apple'||type==='berry'||type==='starfruit'||type==='nightshade'||type==='dragonfruit'){
    addHarvestableFruit(group,type,fruitsAvailable,mutation);
  }
  if(mutation){addMutationFruitVisual(group,mutation);addMutationVisual(group,mutation);}
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
  const seedType=state.selectedSeed&&player?.seeds?.[state.selectedSeed]>0?state.selectedSeed:'';
  heldWeapon.visible=unlocked||!!seedType;
  if(!unlocked&&!seedType)return;
  const attachments=custom?.components||[],components=new Set(attachments),counts=attachments.reduce((total,part)=>{total[part]=(total[part]||0)+1;return total;},{});
  const signature=JSON.stringify([weapon,seedType,[...attachments].sort()]);
  if(signature===state.weaponSignature)return;
  state.weaponSignature=signature;
  for(const child of [...heldWeapon.children])disposeGroup(child);
  if(seedType){
    heldWeapon.position.set(.34,-.29,-.46);heldWeapon.rotation.set(-.04,.08,.02);heldWeapon.scale.setScalar(1);
    const packet=makeSeedPacket(seedType);packet.position.set(-.05,-.1,-.18);packet.scale.setScalar(.82);
    packet.traverse(object=>{if(object.isMesh&&object.material){object.material.transparent=true;object.material.opacity=.92;}});
    heldWeapon.add(packet);
    const plant=makeFlower(seedType,'',0,false,false);plant.scale.setScalar(.29);plant.position.set(.1,-.02,-.38);
    plant.traverse(object=>{if(object.isMesh&&object.material){const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials){material.transparent=true;material.opacity=.68;}}});
    heldWeapon.add(plant);
    heldWeapon.userData.baseY=-.29;return;
  }
  const launcher=weapon==='cornZooka'||custom?.base==='cornZooka';
  const bramble=weapon==='brambleRifle',shotgun=weapon==='bloomShotgun',repeater=weapon==='sunseedRepeater';
  const bodyColor=launcher?0x765633:bramble?0x546c43:shotgun?0x557868:repeater?0x788249:0x426744;
  const darkColor=launcher?0x443423:bramble?0x2d3f2a:shotgun?0x30443c:repeater?0x494e2c:0x263e2b;
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
  const barrelLength=(launcher?.55:bramble?.58:shotgun?.26:repeater?.43:.36)+Math.min(.6,(counts.reed||0)*.24)+Math.min(.36,(counts.bamboo||0)*.12);
  const bodySize=launcher?[.3,.19,.44]:bramble?[.22,.15,.48]:shotgun?[.3,.18,.34]:repeater?[.25,.17,.38]:[.22,.15,.38];
  addBox(bodySize,bodyColor,{x:0,y:-.045,z:-.29});
  addBox([.13,.13,.2],darkColor,{x:0,y:-.03,z:-.05});
  addBox([.105,.22,.14],darkColor,{x:.045,y:-.2,z:-.2});
  const barrelRadius=launcher?.072:shotgun?.052:.045;
  const barrelXs=shotgun?[-.065,.065]:[0];
  for(const barrelX of barrelXs){
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(barrelRadius,barrelRadius,barrelLength,12),new THREE.MeshStandardMaterial({color:repeater?0xb5aa5e:0x737d68,metalness:.68,roughness:.3}));
    barrel.rotation.x=Math.PI/2;barrel.position.set(barrelX,.01,-.48-barrelLength/2);barrel.castShadow=true;heldWeapon.add(barrel);
  }
  const muzzleZ=-.48-barrelLength;
  for(const barrelX of barrelXs)addRing(launcher?.09:shotgun?.065:.062,.018,launcher?0xe2a447:bramble?0xa4b67a:shotgun?0xd4aa70:repeater?0xe0c855:0x9cad80,{x:barrelX,y:.01,z:muzzleZ});
  addBox([.11,.035,.15],0x819773,{x:0,y:.095,z:-.32});
  addOrb(.045,launcher?0xffbd45:bramble?0xa9d975:shotgun?0xe57d63:repeater?0xffdf62:0x75e690,{x:0,y:.19,z:-.31});
  if(repeater)addBox([.1,.22,.15],0x948e43,{x:.14,y:-.18,z:-.28});
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
function makeSeedPacket(type){
  const group=new THREE.Group(),colors={apple:0xc96246,dragonfruit:0xd64d8d,sunflower:0xe5b94c,berry:0x9a5272,pumpkin:0xd17a38};
  const color=colors[type]||0x678e62;
  const packet=new THREE.Mesh(new THREE.BoxGeometry(.4,.5,.09),new THREE.MeshStandardMaterial({color,roughness:.72}));group.add(packet);
  const label=document.createElement('canvas');label.width=128;label.height=128;
  const context=label.getContext('2d');context.fillStyle='#f0ead4';context.fillRect(10,10,108,108);
  context.fillStyle=`#${color.toString(16).padStart(6,'0')}`;context.font='56px serif';context.textAlign='center';context.textBaseline='middle';context.fillText(seedIcons[type]||'🌱',64,63);
  context.fillStyle='#26352a';context.font='bold 11px sans-serif';context.fillText((seeds.find(seed=>seed.id===type)?.name||type).slice(0,14).toUpperCase(),64,105);
  const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(.34,.34),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));face.position.z=-.048;group.add(face);
  group.userData.seedType=type;return group;
}
function makeSprinkler(){
  const group=new THREE.Group();
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.19,.23,.16,10),new THREE.MeshStandardMaterial({color:0x82bdcc,metalness:.25,roughness:.4}));group.add(base);
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.45,8),new THREE.MeshStandardMaterial({color:0x8db7a5}));stem.position.y=.27;group.add(stem);
  const rotor=new THREE.Group();rotor.position.y=.51;group.add(rotor);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),new THREE.MeshStandardMaterial({color:0x8ed2d3,metalness:.32,roughness:.35}));rotor.add(head);
  const arm=new THREE.Mesh(new THREE.BoxGeometry(.07,.045,.66),new THREE.MeshStandardMaterial({color:0x89b8ac,metalness:.22,roughness:.4}));rotor.add(arm);
  const secondArm=arm.clone();secondArm.rotation.y=Math.PI/2;rotor.add(secondArm);
  const droplets=[];
  for(let index=0;index<8;index++){
    const drop=new THREE.Mesh(new THREE.SphereGeometry(.035,7,5),new THREE.MeshBasicMaterial({color:0xb8f3ff,transparent:true,opacity:.8,depthWrite:false}));
    group.add(drop);droplets.push(drop);
  }
  group.userData.sprinkler={rotor,droplets,time:0};
  return group;
}
function makeLantern(){
  const group=new THREE.Group();
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,.8,8),new THREE.MeshStandardMaterial({color:0x74614e,roughness:.7}));
  post.position.y=.4;group.add(post);
  const lantern=new THREE.Mesh(new THREE.CylinderGeometry(.17,.19,.2,12),new THREE.MeshStandardMaterial({color:0xf4d894,emissive:0xffc95e,emissiveIntensity:.35,roughness:.5}));
  lantern.position.y=.9;group.add(lantern);
  const glow=new THREE.PointLight(0xffd995,0.9,12,2.2);
  glow.position.y=.9;group.add(glow);
  group.userData.lantern={glow};
  return group;
}
function makeScoutDrone(){
  const group=new THREE.Group(),shell=new THREE.MeshStandardMaterial({color:0x9bc8b1,metalness:.45,roughness:.3}),dark=new THREE.MeshStandardMaterial({color:0x344c46,metalness:.55,roughness:.32});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.24,12,8),shell);body.scale.set(1.35,.72,1);group.add(body);
  const lens=new THREE.Mesh(new THREE.SphereGeometry(.085,10,8),new THREE.MeshBasicMaterial({color:0x8cfff0}));lens.position.set(0,-.015,-.27);group.add(lens);
  const rotors=[];
  for(const x of [-.34,.34])for(const z of [-.32,.32]){
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.46,.045,.055),dark);arm.position.set(x*.48,.035,z*.48);arm.rotation.y=Math.atan2(z,x);group.add(arm);
    const rotor=new THREE.Group();rotor.position.set(x,.07,z);group.add(rotor);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.08,8),shell);rotor.add(hub);
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.42,.025,.055),dark);rotor.add(blade);
    const cross=blade.clone();cross.rotation.y=Math.PI/2;rotor.add(cross);rotors.push(rotor);
  }
  group.userData.rotors=rotors;return group;
}
function syncScoutDrones(){
  const expected=new Set(),time=performance.now()*.001;
  for(const player of state.players.values()){
    const count=Math.max(0,Math.min(2,Math.floor(Number(player.gear?.drone)||0)));
    const isLocal=player.id===state.playerId,baseX=isLocal?state.x:player.x,baseZ=isLocal?state.z:player.z;
    for(let index=0;index<count;index++){
      const id=`${player.id}:${index}`;expected.add(id);
      let drone=state.droneMeshes.get(id);
      if(!drone){drone=makeScoutDrone();state.droneMeshes.set(id,drone);scene.add(drone);}
      const angle=time*.72+index*Math.PI,orbit=1.05+index*.32;
      drone.position.set(baseX+Math.cos(angle)*orbit,3.8+Math.sin(time*1.6+index)*.16+index*.28,baseZ+Math.sin(angle)*orbit);
      drone.rotation.y=-angle+Math.PI/2;
    }
  }
  for(const [id,drone]of state.droneMeshes)if(!expected.has(id)){disposeGroup(drone);state.droneMeshes.delete(id);}
}
function animateScoutDrones(delta){
  for(const drone of state.droneMeshes.values())for(const rotor of drone.userData.rotors)rotor.rotation.y+=delta*22;
}
function animateSprinklers(delta){
  for(const mesh of state.sprinklerMeshes?.values()||[]){
    const sprinkler=mesh.userData.sprinkler;if(!sprinkler)continue;
    sprinkler.time+=delta;sprinkler.rotor.rotation.y+=delta*4.5;
    sprinkler.droplets.forEach((drop,index)=>{
      const phase=sprinkler.time*4+index*Math.PI/4,radius=.43+Math.sin(phase)*.12;
      drop.position.set(Math.cos(phase)*radius,.45+Math.sin(phase*1.7)*.14,Math.sin(phase)*radius);
    });
  }
}
function animateLanterns(){
  const night=state.phase==='night';
  for(const mesh of state.lanternMeshes.values()){
    const glow=mesh.userData.lantern?.glow;if(!glow)continue;
    glow.intensity=night?2.1:0;
  }
}

function updateWorld(){
  syncFarmLayers(state.players.values());
  syncScoutDrones();
  const visibleMutations=new Map(Array.from(state.plants.values())
    .filter(plant=>plant.mutation)
    .sort((a,b)=>String(a.id).localeCompare(String(b.id)))
    .slice(0,6)
    .map(plant=>[plant.id,plant.mutation]));
  for(const plant of state.plants.values()){
    const mesh=state.plantMeshes.get(plant.id);
    const visualMutation=visibleMutations.get(plant.id)||'';
    const fruitsAvailable=Date.now()>=plant.matureAt?Number(plant.fruitsAvailable)||0:0;
    if(mesh&&(mesh.userData.mutation!==visualMutation||mesh.userData.fruitsAvailable!==fruitsAvailable)){disposeGroup(mesh);state.plantMeshes.delete(plant.id);}
  }
  updateObjects(state.plants.values(),state.plantMeshes,
    plant=>makeFlower(plant.type,visibleMutations.get(plant.id)||'',Date.now()>=plant.matureAt?Number(plant.fruitsAvailable)||0:0,Date.now()<plant.matureAt,Date.now()<plant.matureAt),(mesh,plant)=>{
      mesh.userData.plantData=plant;
      mesh.userData.fruitsAvailable=Date.now()>=plant.matureAt?Number(plant.fruitsAvailable)||0:0;
      mesh.position.set(plant.x,0,plant.z);
      const grow=Math.min(1,Math.max(.62,(Date.now()-plant.plantedAt)/Math.max(1,plant.matureAt-plant.plantedAt)));
      const fruitScale=1+Math.min(.25,Math.max(0,(plant.fruitSize||1)-1)*.125);
      mesh.scale.setScalar(grow*fruitScale);
      mesh.rotation.y=(plant.col*1.71+plant.row*.83)%6.28;
    });
  updateObjects(state.seedDrops.values(),state.seedDropMeshes,drop=>makeSeedPacket(drop.type),
    (mesh,drop)=>{mesh.position.set(drop.x,.28,drop.z);mesh.rotation.y=Math.sin(performance.now()*.001+drop.id.length)*.08;});
  updateObjects(state.zombies.values(),state.zombieMeshes,
    zombie=>{const mesh=makeZombie();mesh.userData.zombieId=zombie.id;mesh.userData.lastX=zombie.x;mesh.userData.lastZ=zombie.z;return mesh;},
    (mesh,zombie)=>{
        const moveX=zombie.x - (mesh.userData.lastX ?? zombie.x),moveZ=zombie.z - (mesh.userData.lastZ ?? zombie.z);
      const heading=Math.atan2(moveZ,moveX) + Math.PI / 2;
      mesh.position.set(zombie.x,0,zombie.z);
      mesh.rotation.y=heading;
      mesh.userData.lastX=zombie.x;mesh.userData.lastZ=zombie.z;
    });
  updateObjects(state.players.values(),state.playerMeshes,
    player=>makePlayer(player.color),(mesh,player)=>{mesh.visible=player.id!==state.playerId;mesh.position.set(player.x,0,player.z);mesh.rotation.y=Math.PI;});
  updateObjects(Array.from(state.sprinklers,key=>{
    const tile=gardenTileFromKey(key);return tile?{id:key,...tile}:null;
  }).filter(Boolean),state.sprinklerMeshes||=new Map(),makeSprinkler,
  (mesh,item)=>mesh.position.set(item.x,.12,item.z));
  updateObjects(Array.from(state.lanterns.values()),state.lanternMeshes,makeLantern,
    (mesh,item)=>mesh.position.set(item.x,0,item.z));
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
  if(state.offline){handleOfflineAction(action,data);return;}
  if(!state.socket||state.socket.readyState!==WebSocket.OPEN){status.textContent='Join a garden before using its shops and tools.';return;}
  state.socket.send(JSON.stringify({type:'garden:action',action,...data}));
}
function buildDevMenu(){
  if($('gardenDevMenu'))return $('gardenDevMenu');
  const allSeeds=[...seeds].sort((a,b)=>a.cost-b.cost).map(seed=>seed.id);
  const allEvents=['clear','rain','aurora','solarFlare','fireworks','rainbow','snowstorm','bloodMoon'];
  const menu=document.createElement('div');
  menu.id='gardenDevMenu';
  menu.hidden=true;
  menu.setAttribute('aria-live','polite');
  menu.style.position='fixed';menu.style.right='18px';menu.style.top='78px';menu.style.zIndex='50';menu.style.width='320px';menu.style.maxWidth='calc(100vw - 24px)';menu.style.padding='12px';menu.style.border='1px solid rgba(177,224,188,.45)';menu.style.borderRadius='14px';menu.style.background='rgba(10,15,14,.95)';menu.style.boxShadow='0 20px 50px rgba(0,0,0,.45)';menu.style.color='#edf5ec';menu.style.fontFamily='Arial, sans-serif';
  menu.addEventListener('click',event=>event.stopPropagation());
  const seedOptions=allSeeds.map(seedId=>`<option value="${seedId}">${seedId}</option>`).join('');
  const eventOptions=allEvents.map(eventName=>`<option value="${eventName}">${eventName}</option>`).join('');
  menu.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;"><strong style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;">Dev menu</strong><button type="button" data-dev-close="true" style="padding:4px 8px;border-radius:7px;border:1px solid rgba(177,224,188,.45);background:#1d3029;color:#edf5ec;cursor:pointer;">Close</button></div><div style="display:grid;gap:9px;"> <label style="font-size:12px;">Event<select id="devEventSelect" style="width:100%;margin-top:4px;padding:6px 8px;border-radius:7px;border:1px solid rgba(177,224,188,.25);background:#14241e;color:#edf5ec;">${eventOptions}</select></label> <button type="button" data-dev-action="weather" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(177,224,188,.25);background:#35261a;color:#f8d7a6;cursor:pointer;">Trigger selected event</button> <label style="font-size:12px;">Spawn seed<select id="devSeedSelect" style="width:100%;margin-top:4px;padding:6px 8px;border-radius:7px;border:1px solid rgba(177,224,188,.25);background:#14241e;color:#edf5ec;">${seedOptions}</select></label> <button type="button" data-dev-action="seed" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(177,224,188,.25);background:#1c2a28;color:#edf5ec;cursor:pointer;">Spawn selected seed</button> <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;"> <button type="button" data-dev-action="gear" data-dev-value="backpack" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(177,224,188,.25);background:#1d2d28;color:#edf5ec;cursor:pointer;">+ Backpack</button> <button type="button" data-dev-action="gear" data-dev-value="wateringCan" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(177,224,188,.25);background:#1d2d28;color:#edf5ec;cursor:pointer;">+ Water</button> <button type="button" data-dev-action="coins" data-dev-value="10000" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(177,224,188,.25);background:#31251f;color:#fbe0a2;cursor:pointer;">+10k coins</button> <button type="button" data-dev-action="zombie" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(177,224,188,.25);background:#2e2418;color:#f4d2a0;cursor:pointer;">Spawn zombie</button> <button type="button" data-dev-action="restock" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(177,224,188,.25);background:#1c2d2d;color:#d9f9ee;cursor:pointer;">Restock</button> <button type="button" data-dev-action="toggle-phase" style="padding:8px 10px;border-radius:8px;border:1px solid rgba(177,224,188,.25);background:#1f1d2d;color:#d7d0ff;cursor:pointer;">Night toggle</button></div></div>`;
  const eventSelect=menu.querySelector('#devEventSelect');
  const seedSelect=menu.querySelector('#devSeedSelect');
  if(eventSelect){eventSelect.value=allEvents[0];}
  if(seedSelect){seedSelect.value=allSeeds[0];}
  const chooseSelectedValue=button=>{
    if(button.dataset.devAction==='weather')return menu.querySelector('#devEventSelect')?.value||'';
    if(button.dataset.devAction==='seed')return menu.querySelector('#devSeedSelect')?.value||'';
    return button.dataset.devValue||'';
  };
  menu.querySelectorAll('[data-dev-action]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    handleDevAction(button.dataset.devAction, chooseSelectedValue(button));
  }));
  menu.querySelector('[data-dev-close]').addEventListener('click',()=>{menu.hidden=true;state.devMenuOpen=false;});
  document.body.appendChild(menu);
  return menu;
}
function openDevMenu(){
  if(document.pointerLockElement===canvas)document.exitPointerLock();
  state.keys.clear();state.velocity.set(0,0);
  const menu=buildDevMenu();
  menu.hidden=false;state.devMenuOpen=true;status.textContent='Dev menu active';
}
function closeDevMenu(){const menu=$('gardenDevMenu');if(menu){menu.hidden=true;state.devMenuOpen=false;}}
function handleDevAction(action,value=''){
  const player=state.players.get(state.playerId);
  const canUseRoom=state.offline||!!(state.socket&&state.socket.readyState===WebSocket.OPEN);
  if(!canUseRoom && action!=='seed' && action!=='coins' && action!=='weather' && action!=='gear' && action!=='zombie' && action!=='restock' && action!=='toggle-phase'){
    status.textContent='Join a garden to use a dev action.';return;
  }
  const fallbackSelect=document.getElementById(action==='seed'?'devSeedSelect':action==='weather'?'devEventSelect':'');
  const selectedValue=fallbackSelect&&(!value||value===action)?fallbackSelect.value:value;
  const finalValue=selectedValue||value||'';
  if(action!=='weather'&&action!=='seed'&&action!=='gear'&&action!=='coins'&&action!=='restock'&&action!=='zombie'&&action!=='toggle-phase'){
    closeDevMenu();
  }
  if(action==='weather'){
    const weather=finalValue||'solarFlare';
    if(state.offline){state.weather=weather;updateWeather(weather,true);status.textContent=`Dev weather: ${weather}`;return;}
    send('dev',{kind:'weather',value:weather});
  }else if(action==='seed'){
    const seedId=finalValue||'berry';
    if(state.offline){handleOfflineAction('buy-seed',{item:seedId});status.textContent=`Dev spawn: ${seedId}`;return;}
    send('dev',{kind:'seed',id:seedId});
  }else if(action==='gear'){
    const item=finalValue||'backpack';
    if(state.offline){handleOfflineAction('buy-gear',{item});status.textContent=`Dev gear: ${item}`;return;}
    send('dev',{kind:'gear',id:item});
  }else if(action==='coins'){
    const amount=Number(finalValue)||10000;
    if(state.offline){if(player){player.coins=clampGardenCoins((Number(player.coins)||0)+amount);updateHud(player);saveOfflineGarden();}status.textContent=`Dev coins: +${amount}`;return;}
    send('dev',{kind:'coins',amount});
  }else if(action==='restock'){
    if(state.offline){state.shopRestockAt=Math.max(0,Date.now()-1000);showRestockNotification();status.textContent='Dev restock triggered';return;}
    send('dev',{kind:'restock'});
  }else if(action==='zombie'){
    if(state.offline){const angle=Math.random()*Math.PI*2;state.zombies.set(`dev-z-${Date.now()}-${Math.random()}`,{id:`dev-z-${Date.now()}` ,x:state.x+Math.cos(angle)*8,z:state.z+Math.sin(angle)*8,health:45,speed:.42});status.textContent='Dev zombie spawned';return;}
    send('dev',{kind:'zombie'});
  }else if(action==='toggle-phase'){
    if(state.offline){state.phase=state.phase==='day'?'night':'day';status.textContent=`Dev phase: ${state.phase}`;return;}
    send('dev',{kind:'toggle-phase'});
  }else{
    status.textContent='Unknown dev action.';return;
  }
  if(!state.offline){status.textContent=`Dev action: ${action}`;}
}
const offlineGrowthTimes={sunflower:25000,berry:18000,moonberry:32000,starfruit:38000,pumpkin:33000,glowMushroom:24000,clover:16000,lavender:28000,snowdrop:30000,apple:38000,dragonfruit:44000,bluebell:21000,marigold:27000,nightshade:35000,peashooter:12000,cornzooka:18000,thornGuard:26000,snapdragon:15000,frostFern:17000,melonMortar:22000,roseTurret:14000,bamboo:22000,reedTube:18000,magazineVine:25000,pumpkinShell:27000,blastCorn:28000,pollenPod:26000,triggerBloom:25000,thornVine:23000,crystalBud:36000,epicSoil:28000};
const offlineSellValues={sunflower:38,berry:27,moonberry:64,starfruit:78,pumpkin:52,glowMushroom:42,clover:25,lavender:48,snowdrop:54,apple:43,dragonfruit:92,bluebell:35,marigold:46,nightshade:72,bamboo:6,reedTube:4,magazineVine:8,pumpkinShell:6,blastCorn:10,pollenPod:6,triggerBloom:7,thornVine:7,crystalBud:12};
const offlinePartTypes={bamboo:'bamboo',reedTube:'reed',magazineVine:'magazine',pumpkinShell:'shell',blastCorn:'blastCorn',pollenPod:'pollen',triggerBloom:'trigger',thornVine:'grip',crystalBud:'crystal'};
const offlineDefenders={peashooter:{health:55,damage:8,range:7,rate:900,ammo:'peaBlaster',yield:10},cornzooka:{health:75,damage:24,range:8,rate:2600,ammo:'cornZooka',yield:2,blast:2},snapdragon:{health:90,damage:13,range:4.5,rate:700,ammo:'peaBlaster',yield:6},frostFern:{health:75,damage:9,range:9,rate:950,ammo:'peaBlaster',yield:10},melonMortar:{health:95,damage:30,range:11,rate:2700,ammo:'cornZooka',yield:3,blast:3},roseTurret:{health:65,damage:7,range:8,rate:520,ammo:'peaBlaster',yield:10},thornGuard:{health:220,damage:0,range:0,rate:0}};
function saveOfflineGarden(){
  if(!state.offline)return;
  const player=state.players.get(state.playerId);
  if(!player)return;
  try{
    localStorage.setItem('gardenfallOfflineSave',JSON.stringify({player,plants:Array.from(state.plants.values()),seedDrops:Array.from(state.seedDrops.values()),sprinklers:Array.from(state.sprinklers),lanterns:Array.from(state.lanterns.values()),soil:Array.from(state.soil),gardenHealth:state.gardenHealth,day:state.day,weather:state.weather}));
  }catch(error){status.textContent='Could not save this offline garden in browser storage.';}
}
function offlineRefresh(){
  const player=state.players.get(state.playerId);
  renderSeedSelect(player);updateWorld();updateHud(player);updateActions(player);saveOfflineGarden();
}
function offlineSeedCount(player){
  return Object.values(player.seeds||{}).reduce((total,amount)=>total+Math.max(0,Math.floor(Number(amount)||0)),0);
}
function offlineCreateSeedDrops(player,type,count=1){
  for(let index=0;index<count;index++){
    const angle=Math.random()*Math.PI*2,radius=1.05+Math.floor(index/8)*.2,id=`offline-seed-${Date.now()}-${Math.random()}`;
    state.seedDrops.set(id,{id,type,x:state.x+Math.cos(angle)*radius,z:state.z+Math.sin(angle)*radius,ownerId:player.id});
  }
}
function offlineEnforceSeedCapacity(player){
  let overflow=Math.max(0,offlineSeedCount(player)-(player.gear.backpack?10:1));
  for(const type of Object.keys(player.seeds||{}).sort()){
    if(!overflow)break;
    const amount=Math.max(0,Math.floor(Number(player.seeds[type])||0)),dropped=Math.min(amount,overflow);
    if(!dropped)continue;
    const remaining=amount-dropped;
    if(remaining)player.seeds[type]=remaining;else delete player.seeds[type];
    offlineCreateSeedDrops(player,type,dropped);overflow-=dropped;
  }
}
function offlineGrantSeed(player,type){
  offlineEnforceSeedCapacity(player);
  if(offlineSeedCount(player)>=(player.gear.backpack?10:1)){
    offlineCreateSeedDrops(player,type);return false;
  }
  player.seeds[type]=(Number(player.seeds[type])||0)+1;return true;
}
function offlineDropSeed(player,type){
  offlineEnforceSeedCapacity(player);
  const amount=Math.max(0,Math.floor(Number(player.seeds?.[type])||0));
  if(!amount)return false;
  if(amount===1)delete player.seeds[type];else player.seeds[type]=amount-1;
  offlineCreateSeedDrops(player,type);return true;
}
function startOfflineGarden(guestMode=false){
  const account=updateAccountGate();
  if(!account&&!guestMode){$('accountStatus').textContent='Sign in to Gardenfall or choose local guest play.';return;}
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem('gardenfallOfflineSave')||'null');}catch(error){localStorage.removeItem('gardenfallOfflineSave');}
  const player=saved?.player&&typeof saved.player==='object'?saved.player:{
    id:'offline-player',clientId:'offline',name:($('playerName').value.trim()||$('accountUsername').value.trim()).slice(0,20)||'Garden Guest',color:'#79d98a',farmIndex:0,farmLayers:0,
    coins:100,seeds:{},goods:{},parts:{},gear:{wateringCan:false,shovel:false,trowel:false,sprinkler:0,fertilizer:0,backpack:false},
    ammo:{peaBlaster:20,cornZooka:0,brambleRifle:0,bloomShotgun:0,sunseedRepeater:0},magazines:{peaBlaster:10,cornZooka:0,brambleRifle:0,bloomShotgun:0,sunseedRepeater:0},weapons:{peaBlaster:true,cornZooka:false,brambleRifle:false,bloomShotgun:false,sunseedRepeater:false},customGuns:[],weapon:'peaBlaster',
    kills:0,landTier:'common',safetyOn:false,wateringCanCharges:0,x:0,z:-64.3,
  };
  player.id='offline-player';player.clientId='offline';player.farmIndex=0;
  player.weapons={peaBlaster:true,cornZooka:false,brambleRifle:false,bloomShotgun:false,sunseedRepeater:false,...player.weapons};
  player.ammo={peaBlaster:20,cornZooka:0,brambleRifle:0,bloomShotgun:0,sunseedRepeater:0,...player.ammo};
  player.magazines={peaBlaster:10,cornZooka:0,brambleRifle:0,bloomShotgun:0,sunseedRepeater:0,...player.magazines};
  player.gear={wateringCan:false,shovel:false,trowel:false,sprinkler:0,fertilizer:0,backpack:false,lights:false,...player.gear};
  player.gear.drone=Math.max(0,Math.min(2,Math.floor(Number(player.gear.drone)||0)));
  player.farmLayers=Math.max(0,Math.min(farmGrid.maxLayers,Math.floor(Number(player.farmLayers)||0)));
  state.offline=true;state.socket=null;state.roomId='offline-garden';state.roomMode='offline';state.playerId=player.id;state.clientId='offline';state.players=new Map([[player.id,player]]);
  state.plants=new Map((Array.isArray(saved?.plants)?saved.plants:[]).map(plant=>[gardenPlotKey(plant),plant]));
  state.seedDrops=new Map((Array.isArray(saved?.seedDrops)?saved.seedDrops:[]).map(drop=>[drop.id,drop]));
  state.lanterns=new Map((Array.isArray(saved?.lanterns)?saved.lanterns:[]).map(lantern=>[gardenPlotKey(lantern),lantern]));
  state.sprinklers=new Set(saved?.sprinklers||[]);state.soil=new Set(saved?.soil||[]);state.zombies.clear();state.gardenHealth=Number(saved?.gardenHealth)||100;state.day=Math.max(1,Number(saved?.day)||1);
  state.weather='clear';state.weatherKnown=true;state.x=Number.isFinite(Number(player.x))?Number(player.x):0;state.z=Number.isFinite(Number(player.z))?Number(player.z):-64.3;
  offlineEnforceSeedCapacity(player);
  state.targetX=state.x;state.targetZ=state.z;state.joinedPosition=true;state.selectedTile=null;state.phase='day';state.phaseRemaining=90000;state.phaseDeadline=performance.now()+90000;state.offlineNextZombieAt=0;state.offlineLastWeatherAt=performance.now()+45000;
  updateWeather('clear');$('status').textContent='Offline solo garden';joinStatus.textContent='Playing offline. Progress saves in this browser.';joinScreen.hidden=true;$('leaveButton').hidden=false;
  canvas.focus({preventScroll:true});
  $('roomTitle').textContent='Offline Garden';$('copyCode').disabled=true;$('playerCount').textContent='1/1 player';
  state.seedSignature=null;offlineRefresh();
}
function offlineTile(value,player=null){
  const tile=typeof value==='string'?gardenTileFromKey(value):value&&Number.isInteger(value.farmIndex)&&Number.isInteger(value.col)&&Number.isInteger(value.row)?gardenTileFromKey(`${value.farmIndex}:${value.col}:${value.row}`):null;
  if(tile&&player&&tile.farmIndex===player.farmIndex&&tile.row>=farmGrid.rows+Math.max(0,Math.min(farmGrid.maxLayers,Number(player.farmLayers)||0)))return null;
  return tile;
}
function handleOfflineAction(action,data={}){
  const player=state.players.get(state.playerId);if(!player)return;
  const fail=message=>{status.textContent=message;};
  const tile=offlineTile(data.tile,player),key=tile&&gardenPlotKey(tile),plant=key&&state.plants.get(key),now=Date.now();
  if(action==='move'){player.x=state.x=Number(data.x)||0;player.z=state.z=Number(data.z)||0;return;}
  if(action==='cheat'){
    if(String(data.code||'').toLowerCase()!=='theyseeyou'){fail('Unknown cheat code.');return;}
    awardCheatTokens(player);
    player.coins=clampGardenCoins(player.coins);
    if(state.offline)saveOfflineGarden();
    return;
  }
  if(action==='drop-seed'){
    const type=String(data.item||'');if(!offlineDropSeed(player,type)){fail('You do not have that seed to drop.');return;}
    if(state.selectedSeed===type)state.selectedSeed='';
  }else if(action==='buy-seed'){
    const seed=seeds.find(item=>item.id===data.item);if(!seed||player.coins<seed.cost){fail('Not enough coins for those seeds.');return;}player.coins-=seed.cost;
    if(offlineGrantSeed(player,seed.id))state.selectedSeed=seed.id;
    else status.textContent=`${seed.name} dropped beside you because your seed pack is full.`;
  }else if(action==='pickup-seed'){
    const drop=state.seedDrops.get(String(data.id||''));if(!drop){fail('That seed is no longer on the ground.');return;}
    offlineEnforceSeedCapacity(player);
    if(offlineSeedCount(player)>=(player.gear.backpack?10:1)){fail(player.gear.backpack?'Your backpack is full. Drop a seed to make room.':'You are already carrying a seed. Drop it or buy a backpack.');return;}
    offlineGrantSeed(player,drop.type);state.seedDrops.delete(drop.id);
  }else if(action==='buy-gear'){
    const item=gear.find(entry=>entry.id===data.item);if(!item||player.coins<item.cost){fail('Not enough coins for that gear.');return;}
    if(item.id==='drone'&&player.gear.drone>=2){fail('You already own the maximum of 2 scout drones.');return;}
    if(item.id==='farmLayer'&&player.farmLayers>=farmGrid.maxLayers){fail('Your farm already has the maximum of 10 layers.');return;}
    player.coins-=item.cost;
    if(item.id==='wateringCan'){player.gear.wateringCan=true;player.wateringCanCharges=Math.max(player.wateringCanCharges||0,5);}
    else if(item.id==='shovel'||item.id==='trowel'||item.id==='backpack')player.gear[item.id]=true;
    else if(item.id==='lights')player.gear.lights=(Number(player.gear.lights)||0)+1;
    else if(item.id==='drone')player.gear.drone=Math.min(2,player.gear.drone+1);
    else if(item.id==='farmLayer')player.farmLayers=Math.min(farmGrid.maxLayers,player.farmLayers+1);
    else player.gear[item.id]=(player.gear[item.id]||0)+1;
  }else if(action==='place-lantern'){
    const key=tile&&gardenPlotKey(tile);if(!tile||tile.farmIndex!==player.farmIndex||!(Number(player.gear.lights||0)>0)){fail('Select a valid plot on your farm and own Garden Lights.');return;}if(state.plants.has(key)||state.sprinklers.has(key)||state.lanterns.has(key)){fail('That plot is occupied.');return;}
    player.gear.lights=Math.max(0,(Number(player.gear.lights)||0)-1);state.lanterns.set(key,{id:`lantern-${Date.now()}-${Math.random()}`,farmIndex:tile.farmIndex,col:tile.col,row:tile.row,x:tile.x,z:tile.z,ownerId:player.id});
  }else if(action==='buy-weapon'){
    const item=purchasableWeapons.find(weapon=>weapon.id===data.item),specification=item&&weaponSpecs[item.id];
    if(!item||!specification||player.weapons[item.id]){fail('That weapon is unavailable or already owned.');return;}
    if(player.coins<item.cost){fail('Not enough coins for that weapon.');return;}
    player.coins-=item.cost;player.weapons[item.id]=true;player.magazines[item.id]=specification.capacity;
    player.ammo[item.id]=ammoListings.find(listing=>listing.id===item.id)?.amount||0;
  }else if(action==='buy-ammo'){
    const weapon=data.item,custom=player.customGuns?.find(gun=>gun.id===weapon),listing=ammoListings.find(item=>item.id===weapon),amount=custom?.capacity||listing?.amount,cost=custom?custom.capacity*3:listing?.cost;
    if(!player.weapons[weapon]&&!custom){fail('Unlock that weapon before buying ammo.');return;}if(!amount||player.coins<cost){fail('Not enough coins for that ammo.');return;}player.coins-=cost;player.ammo[weapon]=(player.ammo[weapon]||0)+amount;
  }else if(action==='buy-land'){
    const index=landTiers.findIndex(item=>item.id===(player.landTier||'common')),next=landTiers[index+1];if(!next||next.id!==data.item||player.coins<next.cost){fail('You need more coins for the next land tier.');return;}player.coins-=next.cost;player.landTier=next.id;
  }else if(action==='plant'){
    const seed=seeds.find(item=>item.id===data.item);if(!seed||!tile||tile.farmIndex!==player.farmIndex||state.plants.has(key)||state.sprinklers.has(key)||!(player.seeds[seed.id]>0)){fail('Choose an empty plot on your farm and a seed you own.');return;}
    player.seeds[seed.id]--;const defender=offlineDefenders[seed.id],fruitSpec=fruitPlantSpecs[seed.id];const definition={id:`offline-${now}-${Math.random()}`,type:seed.id,farmIndex:tile.farmIndex,col:tile.col,row:tile.row,x:tile.x,z:tile.z,ownerId:player.id,plantedAt:now,matureAt:now+(offlineGrowthTimes[seed.id]||25000),health:defender?.health||35,lastAttack:0,harvestsLeft:fruitSpec?999999:1,reusable:!!fruitSpec,fruitCount:fruitSpec?.count||0,fruitsAvailable:fruitSpec?.count||0,nextFruitAt:0,mutation:'',fruitSize:1};
    state.plants.set(key,definition);if(seed.id==='epicSoil')state.soil.add(key);
  }else if(action==='harvest'){
    const target=plant||state.plants.get(String(data.tile||''));if(!target||target.ownerId!==player.id||now<target.matureAt){fail('That plant is not ready to harvest.');return;}
    if(target.favorite&&data.confirmFavorite!==true){fail('Confirm before harvesting this favorite plant.');return;}
    const seed=seeds.find(item=>item.id===target.type),defender=offlineDefenders[target.type],fruitSpec=fruitPlantSpecs[target.type];
    if(defender){if(!defender.ammo||!defender.yield){fail('Use a shovel to remove this defensive plant.');return;}player.weapons[defender.ammo]=true;player.ammo[defender.ammo]=(player.ammo[defender.ammo]||0)+defender.yield;state.plants.delete(gardenPlotKey(target));}
    else if(fruitSpec){if(!(target.fruitsAvailable>0)){fail('No fruit is ready yet.');return;}const multiplier=target.mutation==='rainbow'?4:target.mutation==='aurora'?3:target.mutation==='solarFlare'||target.mutation==='fireworks'?2:1;player.goods[target.type]=(player.goods[target.type]||0)+multiplier;target.fruitsAvailable--;target.nextFruitAt=now+fruitSpec.regrow;}
    else if(seed?.kind==='crop'){player.goods[target.type]=(player.goods[target.type]||0)+(target.mutation==='aurora'?3:target.mutation==='rainbow'?4:1);state.plants.delete(gardenPlotKey(target));}
    else if(offlinePartTypes[target.type]){const part=offlinePartTypes[target.type];player.parts[part]=(player.parts[part]||0)+1;player.goods[target.type]=(player.goods[target.type]||0)+1;state.plants.delete(gardenPlotKey(target));}
    else fail('This plant cannot be harvested.');
  }else if(action==='favorite'){
    if(!plant||plant.ownerId!==player.id){fail('Select one of your plants to favorite.');return;}plant.favorite=data.favorite===true;
  }else if(action==='water'){
    if(!player.gear.wateringCan||!plant||plant.ownerId!==player.id||player.wateringCanCharges<=0){fail('Buy and refill a watering can first.');return;}player.wateringCanCharges--;plant.matureAt=Math.max(now,plant.matureAt-12000);
  }else if(action==='shovel'){
    if(!player.gear.shovel||!plant||plant.ownerId!==player.id){fail('Buy a shovel and select one of your plants.');return;}state.plants.delete(key);state.soil.delete(key);
  }else if(action==='sprinkler'){
    if(!tile||tile.farmIndex!==player.farmIndex||plant||state.sprinklers.has(key)||!(player.gear.sprinkler>0)){fail('Buy a sprinkler and select an empty plot.');return;}state.sprinklers.add(key);state.sprinklerExpiry.set(key,Date.now()+120000);player.gear.sprinkler--;
  }else if(action==='refill-water'){
    if(!player.gear.wateringCan){fail('Buy a watering can from Gear first.');return;}if(Math.hypot(state.x,state.z)>12&&state.weather!=='rain'){fail('Stand by the market pond or wait for rain to refill your can.');return;}player.wateringCanCharges=5;
  }else if(action==='move-plant'){
    const from=offlineTile(data.from,player),to=offlineTile(data.to,player),fromKey=from&&gardenPlotKey(from),toKey=to&&gardenPlotKey(to),moving=fromKey&&state.plants.get(fromKey);if(!player.gear.trowel||!moving||moving.ownerId!==player.id||!to||to.farmIndex!==player.farmIndex||state.plants.has(toKey)||state.sprinklers.has(toKey)){fail('Buy a trowel and select an empty plot on your farm.');return;}state.plants.delete(fromKey);state.plants.set(toKey,{...moving,...to});player.gear.trowel=false;
  }else if(action==='sell'){
    let earned=0;for(const [type,quantity]of Object.entries(player.goods)){if(data.item!=='all'&&data.item!==type)continue;const value=offlineSellValues[type]||0;earned+=value*Math.max(0,Number(quantity)||0);delete player.goods[type];}if(!earned){fail('You have no harvested goods to sell.');return;}player.coins+=earned;
  }else if(action==='equip'){
    if(!player.weapons[data.item]&&!player.customGuns?.some(gun=>gun.id===data.item)){fail('You have not unlocked that weapon.');return;}player.weapon=data.item;
  }else if(action==='safety')player.safetyOn=data.enabled===true;
  else if(action==='reload'){
    const weapon=player.weapon,capacity=player.customGuns?.find(gun=>gun.id===weapon)?.capacity||weaponSpecs[weapon]?.capacity||10,needed=capacity-(player.magazines[weapon]||0),loaded=Math.min(needed,player.ammo[weapon]||0);player.magazines[weapon]=(player.magazines[weapon]||0)+loaded;player.ammo[weapon]=(player.ammo[weapon]||0)-loaded;
  }else if(action==='shoot'){
    const weapon=player.weapon,custom=player.customGuns?.find(gun=>gun.id===weapon);if(player.safetyOn){fail('Gun safety is on. Press G to switch it off.');return;}if(!player.weapons[weapon]&&!custom){fail('Unlock a weapon before shooting.');return;}if(!(player.magazines[weapon]>0)){fail('Your magazine is empty. Press R to reload.');return;}
    player.magazines[weapon]--;const direction=data.direction||{},target=state.zombies.get(String(data.target||''))||Array.from(state.zombies.values()).sort((a,b)=>Math.hypot(a.x-state.x,a.z-state.z)-Math.hypot(b.x-state.x,b.z-state.z))[0];
    const specification=weaponSpecs[weapon],range=custom?.range||specification?.range||13,damage=custom?.damage||specification?.damage||18,blast=custom?.blast||specification?.blast||0;
    if(target&&Math.hypot(target.x-state.x,target.z-state.z)<range){
      const targets=blast?Array.from(state.zombies.values()).filter(zombie=>Math.hypot(zombie.x-target.x,zombie.z-target.z)<blast):[target];
      for(const zombie of targets){zombie.health-=damage;if(zombie.health<=0){state.zombies.delete(zombie.id);player.coins+=8;player.kills++;}}
    }
  }else if(action==='craft')fail('Custom crafting is available in multiplayer gardens.');
  player.coins=clampGardenCoins(player.coins);
  offlineRefresh();
}
function updateOfflineSimulation(delta){
  if(!state.offline)return;
  const now=performance.now(),time=Date.now();
  for(const [key,expiresAt] of state.sprinklerExpiry){if(time>=expiresAt){state.sprinklerExpiry.delete(key);state.sprinklers.delete(key);}}
  state.phaseRemaining=Math.max(0,state.phaseDeadline-now);
  if(state.phaseRemaining===0){
    if(state.phase==='day'){state.phase='night';state.phaseRemaining=300000;state.phaseDeadline=now+300000;state.offlineNextZombieAt=now+700;status.textContent='Nightfall. Defend the garden!';updateWeather(state.weather,true);}
    else{state.phase='day';state.day++;state.phaseRemaining=90000;state.phaseDeadline=now+90000;state.zombies.clear();status.textContent='Daylight. Grow and prepare.';updateWeather(state.weather,true);saveOfflineGarden();}
  }
  if(now>=state.offlineLastWeatherAt){
    const weatherPool=['clear','clear','clear','rain','aurora','solarFlare','fireworks','rainbow','snowstorm'];
    const next=state.weather==='aurora'?'clear':weatherPool[Math.floor(Math.random()*weatherPool.length)];
    state.weather=next;state.weatherRemaining=45000;state.weatherDeadline=now+45000;updateWeather(next,true);
    if(['aurora','solarFlare','fireworks','rainbow'].includes(next)){
      const candidates=Array.from(state.plants.values()).filter(plant=>seeds.find(seed=>seed.id===plant.type)?.kind==='crop'&&!plant.mutation&&((plant.matureAt>time)||Number(plant.fruitsAvailable)>0));
      for(let index=candidates.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[candidates[index],candidates[swap]]=[candidates[swap],candidates[index]];}
      let mutations=0;
      for(const plant of candidates){if(mutations>=6)break;if(Math.random()<.45){plant.mutation=next;mutations++;}}
    }
    state.offlineLastWeatherAt=now+45000;
  }
  if(state.phase==='night'&&now>=state.offlineNextZombieAt&&state.zombies.size<12){
    const angle=Math.random()*Math.PI*2,radius=7+Math.random()*3;state.zombies.set(`offline-z${time}`,{id:`offline-z${time}`,x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,health:40,speed:.8});state.offlineNextZombieAt=now+4500;
  }
  for(const [key,plant]of state.plants){
    const fruitSpec=fruitPlantSpecs[plant.type];
    if(fruitSpec&&time>=plant.matureAt&&plant.fruitsAvailable<fruitSpec.count&&time>=(plant.nextFruitAt||0)){
      plant.fruitsAvailable++;plant.nextFruitAt=plant.fruitsAvailable<fruitSpec.count?time+fruitSpec.regrow:0;
    }
    const defender=offlineDefenders[plant.type];if(!defender?.damage||time<plant.matureAt||state.phase!=='night'||now-(plant.lastAttack||0)<defender.rate)continue;
    const target=Array.from(state.zombies.values()).filter(zombie=>Math.hypot(zombie.x-plant.x,zombie.z-plant.z)<=defender.range).sort((a,b)=>Math.hypot(a.x-plant.x,a.z-plant.z)-Math.hypot(b.x-plant.x,b.z-plant.z))[0];
    if(!target)continue;plant.lastAttack=now;
    const targets=defender.blast?Array.from(state.zombies.values()).filter(zombie=>Math.hypot(zombie.x-target.x,zombie.z-target.z)<defender.blast):[target];
    for(const zombie of targets){zombie.health-=defender.damage;if(zombie.health<=0){state.zombies.delete(zombie.id);const owner=state.players.get(plant.ownerId);if(owner){owner.coins+=8;owner.kills++;}}}
  }
  for(const zombie of state.zombies.values()){
    const target=Array.from(state.plants.values()).sort((a,b)=>Math.hypot(zombie.x-a.x,zombie.z-a.z)-Math.hypot(zombie.x-b.x,zombie.z-b.z))[0];
    if(target&&Math.hypot(zombie.x-target.x,zombie.z-target.z)<.7){target.health-=delta*8;if(target.health<=0){const key=gardenPlotKey(target);state.plants.delete(key);state.soil.delete(key);}}
    else{const x=target?.x??state.x,z=target?.z??state.z,distance=Math.hypot(x-zombie.x,z-zombie.z)||1;zombie.x+=(x-zombie.x)/distance*zombie.speed*delta;zombie.z+=(z-zombie.z)/distance*zombie.speed*delta;}
  }
  offlineWorldElapsed+=delta;if(offlineWorldElapsed>=.12){offlineWorldElapsed=0;updateWorld();}
  offlineSaveElapsed+=delta;if(offlineSaveElapsed>=5){offlineSaveElapsed=0;saveOfflineGarden();}
}
function readGardenAccount(){
  try{
    const account=JSON.parse(localStorage.getItem('gardenfallSession')||'null');
    return account&&/^[\w-]{8,64}$/.test(String(account.id||''))&&/^[a-f0-9]{64}$/i.test(String(account.token||''))&&typeof account.username==='string'
      ?{id:String(account.id),token:String(account.token),username:account.username.trim().slice(0,20)}:null;
  }catch(error){return null;}
}
function updateAccountGate(){
  const account=state.gardenAccount||readGardenAccount();state.gardenAccount=account;
  $('accountStatus').textContent='This account belongs to Gardenfall.';
  $('accountGate').hidden=!!account;$('gameOptions').hidden=!account;
  $('accountWelcome').textContent=account?`Signed in as ${account.username}. Choose how to play.`:'';
  $('publicButton').disabled=!account;$('createPrivateButton').disabled=!account;
  if(account&&!$('playerName').value)$('playerName').value=account.username;
  return account;
}
async function restoreGardenAccount(){
  const account=readGardenAccount();state.gardenAccount=account;
  if(account){
    try{
      const response=await fetch('/api/garden/auth/session',{headers:{Authorization:`Bearer ${account.token}`},cache:'no-store'});
      if(response.ok){const result=await response.json();state.gardenAccount={...account,...result.user};}
      else{localStorage.removeItem('gardenfallSession');state.gardenAccount=null;}
    }catch(error){state.gardenAccount=account;}
  }
  const current=updateAccountGate();
  if(current){
    try{$('playerName').value=localStorage.getItem(`gardenfallName:${current.id}`)||current.username;}
    catch(error){$('playerName').value=current.username;}
  }
}
function setGardenAuthMode(mode){
  gardenAuthMode=mode;
  const isSignup=mode==='signup';
  $('loginModeButton').classList.toggle('active',!isSignup);$('loginModeButton').setAttribute('aria-selected',String(!isSignup));
  $('signupModeButton').classList.toggle('active',isSignup);$('signupModeButton').setAttribute('aria-selected',String(isSignup));
  $('accountSubmit').textContent=isSignup?'Create account':'Log in';$('accountPassword').autocomplete=isSignup?'new-password':'current-password';
  $('accountStatus').textContent=isSignup?'Choose a username and password for Gardenfall.':'This account belongs to Gardenfall.';
}
async function submitGardenAccount(event){
  event.preventDefault();
  const submit=$('accountSubmit'),username=$('accountUsername').value.trim(),password=$('accountPassword').value;
  submit.disabled=true;$('accountStatus').textContent=gardenAuthMode==='signup'?'Creating your account…':'Logging in…';
  try{
    const response=await fetch(`/api/garden/auth/${gardenAuthMode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Gardenfall account request failed.');
    state.gardenAccount={...result.user,token:result.token};localStorage.setItem('gardenfallSession',JSON.stringify(state.gardenAccount));
    $('accountPassword').value='';$('playerName').value=state.gardenAccount.username;
    $('joinStatus').textContent='Signed in. Choose a garden to play.';updateAccountGate();
  }catch(error){$('accountStatus').textContent=error.message||'Could not reach Gardenfall account service.';}
  finally{submit.disabled=false;}
}
async function logoutGardenAccount(){
  const account=state.gardenAccount;
  if(state.offline)saveOfflineGarden();
  if(account?.token)fetch('/api/garden/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${account.token}`,'Content-Type':'application/json'},body:'{}'}).catch(()=>{});
  state.socket?.close();state.socket=null;state.offline=false;state.roomId='';state.gardenAccount=null;
  localStorage.removeItem('gardenfallSession');joinScreen.hidden=false;$('leaveButton').hidden=true;$('status').textContent='Not in a garden';
  updateAccountGate();
}
function connect(mode,roomId=''){
  const account=updateAccountGate();
  if(!account){$('accountStatus').textContent='Log in to your Gardenfall account before joining.';return;}
  const name=$('playerName').value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,20);
  if(!name){joinStatus.textContent='Enter your name before joining.';$('playerName').focus();return;}
  localStorage.setItem(`gardenfallName:${account.id}`,name);
  state.joinedPosition=false;state.selectedTile=null;state.trowelFrom=null;state.seedSignature=null;
  state.clientId=account.id;
  if(state.socket)state.socket.close();
  const scheme=location.protocol==='https:'?'wss:':'ws:';
  const socket=new WebSocket(scheme+'//'+location.host);state.socket=socket;
  status.textContent='Connecting…';joinStatus.textContent='Connecting to the garden server…';
  socket.addEventListener('open',()=>socket.send(JSON.stringify({type:'garden:join',mode,roomId,name,accountToken:account.token})));
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
    state.seedDrops=new Map((message.seedDrops||[]).map(drop=>[drop.id,drop]));
    state.zombies=new Map((message.zombies||[]).map(zombie=>[zombie.id,zombie]));
    state.lanterns=new Map((message.lanterns||[]).map(lantern=>[gardenPlotKey(lantern),lantern]));
    state.shopStock={seeds:message.shopStock?.seeds||{},gear:message.shopStock?.gear||{},weapons:message.shopStock?.weapons||{}};
    state.shopRestockAt=Number(message.shopRestockAt)||0;
    state.shopRestockNotified = state.shopRestockAt && state.shopRestockAt <= Date.now() ? state.shopRestockNotified : false;
    updateRestockState(Date.now());
    renderShop();
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
    if(!state.playerId || !state.players.has(state.playerId)){
      const fallbackPlayer = Array.from(state.players.values()).find(player => player.clientId === state.clientId) || Array.from(state.players.values())[0];
      if(fallbackPlayer){state.playerId=fallbackPlayer.id;}
    }
    const local=state.players.get(state.playerId) || Array.from(state.players.values()).find(player => player.clientId === state.clientId);
    if(local){
      if(!state.joinedPosition){
        state.x=local.x;state.z=local.z;
        const offset=farmOffset(local.farmIndex);state.yaw=Math.atan2(-offset.radialX,offset.radialZ);
        state.joinedPosition=true;
      }
      state.targetX=local.x;state.targetZ=local.z;
    }
    joinScreen.hidden=true;$('leaveButton').hidden=false;$('copyCode').disabled=message.mode!=='private';canvas.focus({preventScroll:true});
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

function applyLandVisualTier(landTier='common'){
  const palette={
    common:{ground:0x507944,plot:0x704b31,edge:0x9a7045,path:0x9b865d,trim:0x8cb56d},
    uncommon:{ground:0x628a74,plot:0x7c684d,edge:0xa17d44,path:0xc5ae7d,trim:0x92c08f},
    rare:{ground:0x5b678d,plot:0x6d736a,edge:0x8e8c8d,path:0x8fa0c5,trim:0x92a7c2},
    epic:{ground:0x4c7a6a,plot:0x6a5d4f,edge:0x8d7264,path:0xd7c49d,trim:0x8ed7b1},
    legendary:{ground:0x6a5d82,plot:0x7a6a5e,edge:0xa08479,path:0xe0d4ff,trim:0xd0a9ff},
  };
  const colors=palette[landTier]||palette.common;
  floor.material.color.setHex(colors.ground);
  for(const material of farmGroundMaterials)material.color.setHex(colors.ground);
  plotMaterial.color.setHex(colors.plot);
  plotEdgeMaterial.color.setHex(colors.edge);
  pathMaterial.color.setHex(colors.path);
  for(const mesh of plotMeshes)mesh.material.color.setHex(colors.plot);
  selectionHighlight.material.color.setHex(colors.trim);
}
function updateHud(player){
  $('phaseBadge').textContent=state.phase==='night'?'☾ NIGHT · ZOMBIES!':'☀ DAY · PREPARE';
  $('phaseBadge').classList.toggle('night',state.phase==='night');
  document.querySelector('.world-wrap').classList.toggle('night-shift',state.phase==='night');
  $('dayClock').textContent=`DAY ${state.day} · ${formatTime(state.phaseRemaining)}`;
  $('coins').textContent=`🪙 ${player?.coins??0}`;
  const land=landTiers.find(tier=>tier.id===(player?.landTier||'common'))||landTiers[0];
  applyLandVisualTier(land.id);
  $('landBadge').textContent=`🏡 ${land.name} land · ${land.multiplier}×`;
  $('gardenHealth').textContent=`🌿 Garden ${Math.ceil(state.gardenHealth)}%`;
  $('playerCount').textContent=`${state.players.size}/8 players`;
  $('farmBadge').textContent=`🌾 Farm ${(player?.farmIndex??0)+1}/8`;
  $('droneBadge').textContent=`🚁 Drones ${Math.min(2,Number(player?.gear?.drone)||0)}/2`;
  $('farmLayerBadge').textContent=`▤ Layers ${Math.min(farmGrid.maxLayers,Number(player?.farmLayers)||0)}/${farmGrid.maxLayers}`;
}
function clampGardenCoins(value){
  const numeric=Number(value)||0;
  if(!Number.isFinite(numeric))return 0;
  return Math.max(0,Math.min(GARDEN_COIN_CAP,numeric));
}
function awardCheatTokens(player){
  if(!player)return false;
  player.coins=clampGardenCoins((Number(player.coins)||0)+10000);
  status.textContent='Cheat activated: +10,000 tokens.';
  clearTimeout(statusTimeout);statusTimeout=setTimeout(()=>{if(state.socket&&state.socket.readyState===WebSocket.OPEN)status.textContent='Garden connected';else status.textContent='Not in a garden';},3000);
  return true;
}
function formatTime(ms){
  const value=Number(ms),seconds=Math.max(0,Math.ceil((Number.isFinite(value)?value:0)/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function formatCountdown(ms){
  const value=Math.max(0,Number(ms)||0),seconds=Math.ceil(value/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function updateShopRestockUi(){
  const timer=$('shopRestockTimer');
  if(!timer)return;
  if(!state.shopRestockAt){timer.textContent='Restocks soon';timer.classList.remove('ready');return;}
  const remaining=state.shopRestockAt-Date.now();
  if(remaining<=0){timer.textContent='Restocked';timer.classList.add('ready');return;}
  timer.textContent=`Restocks in ${formatCountdown(remaining)}`;
  timer.classList.remove('ready');
}
function showRestockNotification(){
  const banner=$('restockBanner');
  if(!banner)return;
  banner.hidden=false;
  banner.textContent='Market restocked!';
  clearTimeout(state.restockBannerTimer);
  state.restockBannerTimer=setTimeout(()=>{banner.hidden=true;},3000);
}
function updateRestockState(now=Date.now()){
  if(!state.shopRestockAt){updateShopRestockUi();return;}
  if(now>=state.shopRestockAt){
    if(!state.shopRestockNotified){showRestockNotification();state.shopRestockNotified=true;}
  }else{
    state.shopRestockNotified=false;
  }
  updateShopRestockUi();
}
function weatherName(weather){
  return ({solarFlare:'Solar Flare',aurora:'Aurora',fireworks:'Fireworks',rainbow:'Rainbow',snowstorm:'Snowstorm',rain:'Rain',clear:'Clear',bloodMoon:'Blood Moon'})[weather]||weather;
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
    bloodMoon:{sky:0x3a1624,light:0xffb4c3,intensity:1.2},
  };
  const style=styles[weather]||styles.clear;
  const night=state.phase==='night',bloodNight=night&&weather==='bloodMoon';
  const player=state.players.get(state.playerId);
  const color=new THREE.Color(style.sky);
  if(night)color.lerp(new THREE.Color(bloodNight?0x5c2038:0x18263e),.7);
  scene.background.copy(color);scene.fog.color.copy(color);
  sunlight.color.setHex(night?(bloodNight?0xd07988:0x8798bc):style.light);sunlight.intensity=style.intensity*(night?(bloodNight?0.34:0.24):1);
  hemisphere.intensity=night?(bloodNight?0.65:0.48):2.1;
  const lanternBoost = !!player?.gear?.lights ? 1.6 : 1;
  const lanternFactor = night ? (bloodNight ? 1.6 : 0.9 * lanternBoost) : 0.1;
  for (const [index, light] of nightLanterns.entries()) { light.intensity = 0.5 + lanternFactor * (index % 2 ? 0.8 : 1.0); }
  $('weatherEffects').dataset.weather=weather;
  $('weatherLabel').textContent=`Weather · ${weatherName(weather)} · ${formatTime(state.weatherRemaining)}`;
  rainLines.visible=weather==='rain';snowflakes.visible=weather==='snowstorm';rainbowGroup.visible=weather==='rainbow';
  cloudMaterial.color.setHex(weather==='snowstorm'?0xc6d4dc:weather==='rain'?0x8798a5:0xf1f3eb);
  cloudMaterial.opacity=weather==='snowstorm'?0.72:weather==='rain'?0.58:0.34;
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
    bloodMoon:'The blood moon is out. Zombies run heavier and deadlier tonight.',
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

function getShopStock(category,id){
  const stock=state.shopStock?.[category]?.[id];
  if(Number.isFinite(Number(stock)))return Math.max(0,Number(stock));
  if(!state.offline&&state.roomId)return null;
  if(category==='seeds'&&seeds.some(item=>item.id===id))return 3;
  if(category==='gear'&&gear.some(item=>item.id===id))return 2;
  if(category==='weapons'&&purchasableWeapons.some(item=>item.id===id))return 1;
  return 0;
}
function renderShop(){
  const listings=state.selectedShop==='seeds'?seeds:state.selectedShop==='gear'?gear:[];
  const player=state.players.get(state.playerId);
  const signature=JSON.stringify([state.selectedShop,state.seedCategory,player?.landTier,player?.farmLayers,player?.coins,player?.seeds,player?.gear,player?.weapons,player?.ammo,player?.customGuns,player?.goods,state.shopStock,state.shopRestockAt]);
  if(signature===state.shopSignature)return;
  state.shopSignature=signature;
  document.querySelector('.seed-filters').hidden=state.selectedShop!=='seeds';
  shopItems.replaceChildren();
  const addRow=(name,description,label,onBuy,disabled=false,icon='',stockCount=null)=>{
    const row=document.createElement('div');row.className='shop-item';
    if(icon){const preview=document.createElement('span');preview.className='seed-icon';preview.textContent=icon;preview.setAttribute('aria-hidden','true');row.append(preview);}
    const copy=document.createElement('div');copy.className='shop-item-copy';
    const title=document.createElement('strong');title.textContent=name;
    const detail=document.createElement('span');
    const isInStock=stockCount===null||stockCount>0;
    detail.textContent=description;
    copy.append(title,detail);
    const stockBadge=document.createElement('span');
    if(stockCount===null){
      stockBadge.className='stock-badge syncing';
      stockBadge.textContent='Checking stock';
    }else{
      stockBadge.className=`stock-badge ${isInStock?'available':'sold-out'}`;
      stockBadge.textContent=stockCount>0?`${stockCount} in stock`:'Out of stock';
      stockBadge.setAttribute('aria-label',stockCount>0?`${stockCount} in stock`:'Out of stock');
    }
    copy.append(stockBadge);
    const buy=document.createElement('button');buy.type='button';buy.textContent=label;buy.disabled=disabled||stockCount===0||stockCount===null;buy.addEventListener('click',onBuy);
    row.append(copy,buy);shopItems.append(row);
  };
  if(state.selectedShop==='sell'){
    const goods=Object.entries(player?.goods||{}).filter(([,quantity])=>Number(quantity)>0);
    const land=landTiers.find(item=>item.id===(player?.landTier||'common'))||landTiers[0];
    if(!goods.length){
      const row=document.createElement('div');row.className='shop-item';
      const copy=document.createElement('div');copy.className='shop-item-copy';
      const title=document.createElement('strong');title.textContent='No goods to sell';
      const description=document.createElement('span');description.textContent='Harvest ripe crops or plant parts to stock this stall.';
      copy.append(title,description);row.append(copy);shopItems.append(row);
    }
    for(const [type,quantityValue]of goods){
      const quantity=Math.max(0,Math.floor(Number(quantityValue)||0)),definition=seeds.find(item=>item.id===type);
      const unitValue=offlineSellValues[type]||0,multiplier=definition?.kind==='crop'?land.multiplier:1;
      const total=Math.floor(quantity*unitValue*multiplier);
      addRow(`${definition?.name||type} ×${quantity}`,`${unitValue} coins each${multiplier>1?` · ${multiplier}× land bonus`:''}`,
        `Sell · ${total} 🪙`,()=>send('sell',{item:type}));
    }
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
    const inStock=getShopStock(state.selectedShop==='seeds'?'seeds':'gear',item.id);
    const upgradeCount=item.id==='drone'?Math.min(2,Number(player?.gear?.drone)||0):item.id==='farmLayer'?Math.min(farmGrid.maxLayers,Number(player?.farmLayers)||0):null;
    const upgradeLimit=item.id==='drone'?2:item.id==='farmLayer'?farmGrid.maxLayers:null;
    const upgradeMaxed=upgradeLimit!==null&&upgradeCount>=upgradeLimit;
    const description=upgradeLimit===null?item.description:`${item.description} · ${upgradeCount}/${upgradeLimit} owned`;
    const label=upgradeMaxed?'Max owned':`Buy · ${item.cost} 🪙`;
    addRow(item.name,description,label,
      ()=>{if(state.selectedShop==='seeds'){state.selectedSeed=item.id;send('buy-seed',{item:item.id});} else send('buy-gear',{item:item.id});},upgradeMaxed||Number(player?.coins||0)<item.cost,state.selectedShop==='seeds'?seedIcons[item.id]||'🌱':'',inStock);
  }
  if(state.selectedShop==='gear'){
    const player=state.players.get(state.playerId);
    for(const item of purchasableWeapons){
      const owned=!!player?.weapons[item.id];
      const inStock=getShopStock('weapons',item.id);
      addRow(`${item.name}${owned?' · Owned':''}`,item.description,owned?'Owned':`Buy · ${item.cost} 🪙`,
        ()=>send('buy-weapon',{item:item.id}),owned||Number(player?.coins||0)<item.cost||inStock<=0,'',inStock);
    }
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
  const seedDrop=nearestSeedDrop();
  if(seedDrop&&Math.hypot(state.x-seedDrop.x,state.z-seedDrop.z)<=2.5)prompts.push(`E · Pick up ${seeds.find(seed=>seed.id===seedDrop.type)?.name||'seed'} seed`);
  if(state.ziplineTarget)prompts.push(`T · Zipline to ${state.ziplineTarget==='farm'?'your farm':'the market'}`);
  if(closest)prompts.push(`H · ${closest.title}`);
  const player=state.players.get(state.playerId);
  if(player && Number(player.gear?.lights||0)>0)prompts.push('L · Place lantern on selected plot');
  interactionPrompt.hidden=prompts.length===0;
  interactionPrompt.textContent=prompts.join(' · ');
}
function renderSeedSelect(player){
  if(!player)return;
  const capacity=player.gear.backpack?10:1,carried=Object.values(player.seeds||{}).reduce((total,amount)=>total+Math.max(0,Number(amount)||0),0);
  $('seedCapacity').textContent=`Seed pack ${carried} / ${capacity}${player.gear.backpack?' · Backpack':''}`;
  $('dropSeedButton').disabled=!(Number(player.seeds?.[state.selectedSeed])>0);
  const signature=JSON.stringify([player.seeds,player.gear.backpack]);
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
  const defenderInfo={peashooter:'unlock Pea Blaster + ammo',cornzooka:'unlock Rocket Corn + ammo',snapdragon:'unlock Pea Blaster + ammo',frostFern:'unlock Pea Blaster + ammo',melonMortar:'unlock Rocket Corn + ammo',roseTurret:'unlock Pea Blaster + ammo'};
  const fruitSpec=plant&&fruitPlantSpecs[plant.type];
  $('selectedTile').textContent=state.selectedTile?plant?`Farm ${state.selectedTile.farmIndex+1} · ${seeds.find(item=>item.id===plant.type)?.name||plant.type} · ${Date.now()>=plant.matureAt?'Ready to harvest':'Growing'}${fruitSpec?` · ${Number(plant.fruitsAvailable)||0}/${fruitSpec.count} fruits ready`:''}${plant.favorite?' · ★ Favorite':''}${plant.mutation?` · ${plant.mutation} mutation`:''}${defenderInfo[plant.type]?` · Harvest to ${defenderInfo[plant.type]}`:''}${plant.reusable?' · Reusable; shovel to remove':` · ${plant.harvestsLeft??1} harvest(s) left`} · ${Math.ceil(plant.health)} HP`:`Farm ${state.selectedTile.farmIndex+1} · Plot ${state.selectedTile.col+1}, ${state.selectedTile.row+1} · Empty`:'Select a garden plot';
  $('plantButton').disabled=!state.selectedTile||state.selectedTile.farmIndex!==player.farmIndex||!!plant||!state.selectedSeed;
  const shovelOnly=plant?.type==='epicSoil';
  $('harvestButton').disabled=!plant||shovelOnly||Date.now()<plant.matureAt||plant.ownerId!==state.playerId||!!fruitSpec&&!(plant.fruitsAvailable>0);
  $('harvestButton').textContent=shovelOnly?'Remove with shovel':fruitSpec?`Harvest fruit · ${plant.fruitsAvailable||0} ready`:plant&&defenderInfo[plant.type]?`Harvest · ${defenderInfo[plant.type]}`:'Harvest plant or fruit';
  $('waterButton').disabled=!plant||plant.ownerId!==state.playerId||!player.gear.wateringCan;
  $('shovelButton').disabled=!plant||plant.ownerId!==state.playerId||!player.gear.shovel;
  $('sprinklerButton').disabled=!state.selectedTile||state.selectedTile.farmIndex!==player.farmIndex||state.sprinklers.has(gardenPlotKey(state.selectedTile))||!!plant||!(player.gear.sprinkler>0);
  $('trowelButton').disabled=!plant||plant.ownerId!==state.playerId||!player.gear.trowel;
  $('trowelButton').textContent=state.trowelFrom?'Choose destination plot':'Move plant (trowel)';
  $('favoriteButton').disabled=!plant||plant.ownerId!==state.playerId;
  $('favoriteButton').textContent=plant?.favorite?'Unfavorite plant':'Favorite plant';
  $('refillButton').disabled=!player.gear.wateringCan||player.wateringCanCharges>=5;
  const custom=player.customGuns?.find(gun=>gun.id===player.weapon);
  const specification=weaponSpecs[player.weapon];
  const weapon=custom?.name||specification?.name||'Pea Blaster';
  const capacity=custom?.capacity||specification?.capacity||10;
  const loaded=player.magazines?.[player.weapon]||0;
  $('ammoReadout').textContent=`${weapon} · Magazine ${loaded}/${capacity} · Reserve ${player.ammo[player.weapon]||0} · R reloads · Safety ${player.safetyOn?'ON':'OFF'} (G)`;
  $('gunSafety').textContent=`Gun safety · ${player.safetyOn?'ON':'OFF'}`;
  $('gunSafety').classList.toggle('safety-on',!!player.safetyOn);
  $('partsReadout').textContent=`Bamboo ${player.parts.bamboo||0} · Reed ${player.parts.reed||0} · Magazine ${player.parts.magazine||0} · Shell ${player.parts.shell||0} · Blast ${player.parts.blastCorn||0} · Pollen ${player.parts.pollen||0} · Trigger ${player.parts.trigger||0} · Grip ${player.parts.grip||0} · Crystal ${player.parts.crystal||0} · Fertilizer ${player.gear.fertilizer||0}`;
  weaponSelect.disabled=false;
  for(const option of Array.from(weaponSelect.options)){
    if(option.value.startsWith('custom-')&&!player.customGuns?.some(gun=>gun.id===option.value))option.remove();
    else option.disabled=!player.weapons[option.value]&&!player.customGuns?.some(gun=>gun.id===option.value);
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
  if(state.selectedShop==='gear'||state.selectedShop==='lands'||state.selectedShop==='sell')renderShop();
  renderSeedSelect(player);updateHeldWeapon(player);
}

function selectPlot(tile){
  state.selectedTile={...tile};
  updateWorld();updateActions(state.players.get(state.playerId));
}
function nearestSeedDrop(){
  return Array.from(state.seedDrops.values()).map(drop=>({...drop,distance:Math.hypot(state.x-drop.x,state.z-drop.z)})).filter(drop=>drop.distance<=2.5).sort((a,b)=>a.distance-b.distance)[0]||null;
}
function harvestNearbyPlant(){
  const seedDrop=nearestSeedDrop();
  if(seedDrop){send('pickup-seed',{id:seedDrop.id});return true;}
  const selected=selectedPlant();
  const harvestable=plant=>plant&&plant.ownerId===state.playerId&&plant.type!=='epicSoil'&&Date.now()>=plant.matureAt&&(!fruitPlantSpecs[plant.type]||plant.fruitsAvailable>0);
  const isNearby=plant=>Math.hypot(plant.x-state.x,plant.z-state.z)<=2.5;
  const plant=harvestable(selected)&&isNearby(selected)?selected:Array.from(state.plants.values())
    .filter(harvestable)
    .map(candidate=>({plant:candidate,distance:Math.hypot(candidate.x-state.x,candidate.z-state.z)}))
    .filter(candidate=>candidate.distance<=2.5)
    .sort((a,b)=>a.distance-b.distance)[0]?.plant;
  if(!plant)return false;
  if(plant.favorite&&!window.confirm('This plant is favorited. Harvest it anyway?'))return false;
  state.selectedTile={farmIndex:plant.farmIndex,col:plant.col,row:plant.row};
  updateWorld();updateActions(state.players.get(state.playerId));
  send('harvest',{tile:gardenPlotKey(plant),confirmFavorite:true});
  return true;
}
function placeLanternAt(tile){
  const player=state.players.get(state.playerId);
  if(!tile){status.textContent='Select a plot on your farm for the lantern.';return;}
  if(tile.farmIndex!==player?.farmIndex){status.textContent='Lanterns must be placed on your own farm.';return;}
  if(!(Number(player?.gear?.lights||0)>0)){status.textContent='Buy Garden Lights before placing lanterns.';return;}
  const key=gardenPlotKey(tile);
  if(state.plants.has(key)||state.sprinklers.has(key)||state.lanterns.has(key)){status.textContent='That plot is already occupied by a plant, sprinkler, or lantern.';return;}
  send('place-lantern',{tile:{...tile}});
}
function plantSeedAt(tile){
  if(!state.selectedSeed){status.textContent='Choose or buy a seed before planting.';return;}
  if(!tile){status.textContent='Select an empty plot on your farm before planting.';return;}
  const key=gardenPlotKey(tile);
  if(tile.farmIndex!==state.players.get(state.playerId)?.farmIndex){status.textContent='You can only plant on your own farm.';return;}
  if(state.plants.has(key)||state.sprinklers.has(key)||state.lanterns.has(key)){status.textContent='That plot is occupied. Select another plot.';return;}
  if(!state.offline&&(!state.socket||state.socket.readyState!==WebSocket.OPEN)){status.textContent='Reconnect to the garden before planting.';return;}
  state.pendingPlantKey=key;
  send('plant',{item:state.selectedSeed,tile:{...tile}});
  if(state.offline){state.selectedSeed='';}
}
function plantAimedSeed(pointerOverride=null){
  if(!state.selectedSeed){status.textContent='Choose or buy a seed before planting.';return;}
  const screenPointer=pointerOverride||new THREE.Vector2(0,0);
  raycaster.setFromCamera(screenPointer,camera);
  const hit=raycaster.intersectObjects(plotMeshes,false)[0];
  const tile=hit?.object.userData||state.selectedTile;
  plantSeedAt(tile);
}
function findRoot(object,property){
  let node=object;while(node){if(node.userData?.[property])return node;node=node.parent;}return null;
}
function isHoldingGardenItem(player=state.players.get(state.playerId)){
  if(!player)return false;
  if(state.trowelFrom)return true;
  return !!(state.selectedSeed && (player.seeds?.[state.selectedSeed] ?? 0) > 0);
}
function fireGun(target=null){
  const player=state.players.get(state.playerId);
  if(isHoldingGardenItem(player)){status.textContent='Put the item in your hand away before firing.';return;}
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
canvas.addEventListener('touchstart',event=>{
  if(joinScreen.hidden===false||state.disposed||event.touches.length<2)return;
  event.preventDefault();
  const touch=event.touches[0]||event.changedTouches[0];
  if(!touch)return;
  const bounds=canvas.getBoundingClientRect();
  const touchPointer=new THREE.Vector2((touch.clientX-bounds.left)/bounds.width*2-1,-(touch.clientY-bounds.top)/bounds.height*2+1);
  plantAimedSeed(touchPointer);
}, { passive: false });
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
    if(state.selectedSeed && (state.players.get(state.playerId)?.seeds?.[state.selectedSeed] ?? 0) > 0){
      plantSeedAt(tile);
      return;
    }
    if(state.trowelFrom){
      send('move-plant',{from:state.trowelFrom,to:tile});state.trowelFrom=null;
      updateActions(state.players.get(state.playerId));
    }else selectPlot(tile);
    return;
  }
  const point=raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
  if(point){const tile=plotMeshes.find(mesh=>Math.abs(point.x-mesh.position.x)<=.88&&Math.abs(point.z-mesh.position.z)<=.88)?.userData;if(tile){
    if(state.selectedSeed && (state.players.get(state.playerId)?.seeds?.[state.selectedSeed] ?? 0) > 0){
      plantSeedAt(tile);return;
    }
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
$('harvestButton').addEventListener('click',()=>{
  const plant=selectedPlant();if(!plant||!state.selectedTile)return;
  if(plant.favorite&&!window.confirm('This plant is favorited. Harvest it anyway?'))return;
  send('harvest',{tile:gardenPlotKey(state.selectedTile),confirmFavorite:true});
});
$('favoriteButton').addEventListener('click',()=>{
  const plant=selectedPlant();if(!plant||!state.selectedTile)return;
  send('favorite',{tile:gardenPlotKey(state.selectedTile),favorite:!plant.favorite});
});
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
seedSelect.addEventListener('change',()=>{state.selectedSeed=seedSelect.value;const player=state.players.get(state.playerId);renderSeedSelect(player);updateActions(player);});
$('dropSeedButton').addEventListener('click',()=>{if(state.selectedSeed)send('drop-seed',{item:state.selectedSeed});});
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
$('offlineButton').addEventListener('click',startOfflineGarden);
$('offlineGuestButton').addEventListener('click',()=>startOfflineGarden(true));
window.addEventListener('gardenfall:account',event=>{state.gardenAccount=event.detail||null;updateAccountGate();});
$('accountLogout').addEventListener('click',logoutGardenAccount);
$('privateForm').addEventListener('submit',event=>{event.preventDefault();connect('private-join',$('privateCode').value.trim());});
$('copyCode').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(state.roomId);status.textContent='Private garden code copied.';}
  catch(error){status.textContent=`Share private code: ${state.roomId}`;}
});
$('leaveButton').addEventListener('click',()=>{
  if(state.offline){saveOfflineGarden();state.offline=false;state.roomId='';state.zombies.clear();joinScreen.hidden=false;$('leaveButton').hidden=true;$('status').textContent='Not in a garden';updateAccountGate();return;}
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
  const typedChar=event.key&&event.key.length===1?event.key.toLowerCase():'';
  if(event.code==='Backquote'&&!typing){
    event.preventDefault();
    if(state.devMenuOpen)closeDevMenu();
    else openDevMenu();
    return;
  }
  if(!typing&&typedChar){
    const cleaned=event.key===' '?'' : typedChar;
    state.cheatBuffer=(state.cheatBuffer+cleaned).replace(/\s+/g,'').slice(-20);
    if(state.cheatBuffer.includes('theyseeyou')){
      state.cheatBuffer='';
      const player=state.players.get(state.playerId);
      if(player){
        awardCheatTokens(player);
        if(state.offline){saveOfflineGarden();offlineRefresh();}
        else{send('cheat',{code:'theyseeyou'});}
      }
      openDevMenu();
    }
  }
  if(popupOpen&&movementKeys.includes(event.code)){event.preventDefault();return;}
  if(movementKeys.includes(event.code)&&!typing){state.keys.add(event.code);event.preventDefault();}
  if(event.code==='Space'&&!typing){event.preventDefault();if(!event.repeat&&!popupOpen&&!state.ziplineRide&&state.jumpHeight===0)state.jumpVelocity=8;return;}
  if(event.repeat||typing)return;
  if(/^Digit[1-9]$/.test(event.code)){selectSeedIndex(Number(event.code.slice(-1))-1);return;}
  if(event.code==='KeyQ'){plantAimedSeed();return;}
  if(event.code==='KeyR'){send('reload');return;}
  if(event.code==='KeyG'){toggleGunSafety();return;}
  if(event.code==='KeyL'){placeLanternAt(state.selectedTile);return;}
  if(event.code==='KeyB'){cycleWeapon();return;}
  if(event.code==='KeyN'){cycleSeed(1);return;}
  if(event.code==='KeyJ'){if(state.selectedSeed)send('drop-seed',{item:state.selectedSeed});return;}
  if(event.code==='KeyF'){send('refill-water');return;}
  if(event.code==='KeyE'){if(harvestNearbyPlant())status.textContent=nearestSeedDrop()?'Picked up a seed.':'Harvested the nearest ripe plant.';return;}
  if(event.code==='KeyH'){if(state.nearbyStation)openStationPopup(state.nearbyStation);return;}
  if(event.code==='KeyU'){activateAction('waterButton');return;}
  if(event.code==='KeyX'){activateAction('shovelButton');return;}
  if(event.code==='KeyC'){activateAction('sprinklerButton');return;}
  if(event.code==='KeyV'){activateAction('trowelButton');return;}
  if(event.code==='KeyY'){activateAction('sellAllButton');return;}
  if(event.code==='KeyP'){if(!$('workbenchPopup').hidden)activateAction('craftCustomButton');else status.textContent='Open the workbench with E before crafting.';return;}
  if(event.code==='KeyT'){startZipline();return;}
  if(event.code==='KeyK')$('keybinds').open=!$('keybinds').open;
});
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
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

function animateMarketStalls(delta){
  const time=performance.now()*0.001;
  for(const object of scene.children){
    if(!object.userData?.id || !object.userData?.title || !object.userData?.awning)continue;
    const bob=Math.sin(time*2+object.position.x)*.05;
    object.userData.awning.position.y=1.95+bob;
    object.userData.awning.rotation.x=-.12+Math.sin(time*2.4+object.position.z)*.06;
    if(object.userData.armLeft){
      object.userData.armLeft.rotation.z=.9+Math.sin(time*2.1+object.position.x)*.12;
      object.userData.armRight.rotation.z=-.9-Math.sin(time*2.1+object.position.x)*.12;
    }
  }
}

function animate(){
  if(state.disposed)return;
  requestAnimationFrame(animate);
  const delta=Math.min(clock.getDelta(),.05);
  state.mapDrawElapsed+=delta;
  if(state.mapDrawElapsed>=.12){state.mapDrawElapsed=0;drawFarmMap();}
  animateMarketStalls(delta);
  if(state.offline){
    try{updateOfflineSimulation(delta);}
    catch(error){
      state.offlineLastWeatherAt=performance.now()+45000;
      if(!state.offlineFrameWarned){console.error('Gardenfall recovered from an offline simulation error.',error);state.offlineFrameWarned=true;}
    }
  }
  if(!state.weatherFrameDisabled){
    try{updateWeatherInWorld(delta);}
    catch(error){
      state.weatherFrameDisabled=true;rainLines.visible=false;snowflakes.visible=false;rainbowGroup.visible=false;
      console.error('Gardenfall disabled a failing weather animation.',error);
    }
  }
  if(state.roomId&&(state.offline||state.socket?.readyState===WebSocket.OPEN)){
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
  if(!state.mutationFramesDisabled){
    try{animateMutationEffects(delta);}
    catch(error){state.mutationFramesDisabled=true;console.error('Gardenfall disabled a failing crop mutation animation.',error);}
  }
  animateScoutDrones(delta);animateSprinklers(delta);animateHeldWeapon(delta);animateProjectiles();
  renderer.render(scene,camera);
}
const clock=new THREE.Clock();
function uiTick(){
  if(state.roomId){
    const now=performance.now();
    state.phaseRemaining=Math.max(0,state.phaseDeadline-now);
    state.weatherRemaining=Math.max(0,state.weatherDeadline-now);
    const local=state.players.get(state.playerId);updateHud(local);updateActions(local);updatePlantLabels();
    $('weatherLabel').textContent=`Weather · ${weatherName(state.weather)} · ${formatTime(state.weatherRemaining)}`;
    updateRestockState(Date.now());
  }
  setTimeout(uiTick,250);
}
function init(){
  updateAccountGate();
  restoreGardenAccount();
  renderShop();resize();drawFarmMap();requestAnimationFrame(animate);uiTick();
}
window.addEventListener('pagehide',()=>{
  state.disposed=true;state.socket?.close();renderer.setAnimationLoop(null);renderer.dispose();
});
init();
if('serviceWorker' in navigator){
  const localDevHost=location.hostname==='localhost'||location.hostname==='127.0.0.1'||location.hostname.endsWith('.app.github.dev');
  navigator.serviceWorker.getRegistrations().then(async registrations => {
    await Promise.all(registrations.map(registration => registration.unregister()));
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.filter(key=>key.startsWith('gardenfall-offline-')).map(key=>caches.delete(key)));
    }
    if(localDevHost){
      console.info('Gardenfall local development mode: bypassing cached service worker assets.');
      return;
    }
    return navigator.serviceWorker.register('./garden-siege-sw.js?v=20261109-upgrade-visual-fix-1').catch(error => console.warn('Could not cache Gardenfall for offline play.', error));
  }).catch(error => console.warn('Could not clear old Gardenfall service workers.', error));
}
