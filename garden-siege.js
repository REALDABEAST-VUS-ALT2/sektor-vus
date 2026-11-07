import * as THREE from 'three';

const $=id=>document.getElementById(id);
const canvas=$('gardenCanvas');
const status=$('status');
const joinStatus=$('joinStatus');
const joinScreen=$('joinScreen');
const shopItems=$('shopItems');
const seedSelect=$('seedSelect');
const weaponSelect=$('weaponSelect');
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9bc5a0);
scene.fog=new THREE.Fog(0x9bc5a0,24,46);
scene.add(new THREE.HemisphereLight(0xe5f5da,0x405b42,2.1));
const sunlight=new THREE.DirectionalLight(0xfff0ce,2.2);sunlight.position.set(-5,12,8);scene.add(sunlight);
const camera=new THREE.PerspectiveCamera(42,1,.1,80);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const state={
  socket:null,roomId:'',playerId:'',roomMode:'',day:1,phase:'day',phaseRemaining:0,gardenHealth:100,
  players:new Map(),plants:new Map(),zombies:new Map(),sprinklers:new Set(),plantMeshes:new Map(),zombieMeshes:new Map(),playerMeshes:new Map(),
  selectedTile:null,selectedSeed:'',selectedShop:'seeds',seedCategory:'all',keys:new Set(),x:0,z:4.7,lastMove:0,
  yaw:0,pitch:-.28,velocity:new THREE.Vector2(),targetX:0,targetZ:4.7,weather:'clear',ponds:[],
  weatherRemaining:0,weatherKnown:false,clientId:'',trowelFrom:null,nearbyStation:'',
  dismissedStation:'',
  seedSignature:null,shopSignature:null,partsSignature:null,disposed:false,
};
const seeds=[
  {id:'sunflower',name:'Sunflower',cost:20,kind:'crop',description:'Grows into a coin crop · sell for 38'},
  {id:'berry',name:'Berry Bush',cost:15,kind:'crop',description:'Fast crop · sell for 27'},
  {id:'moonberry',name:'Moonberry',cost:34,kind:'crop',description:'Four harvests · aurora mutations are especially valuable'},
  {id:'starfruit',name:'Starfruit',cost:42,kind:'crop',description:'Rare, valuable single-harvest crop'},
  {id:'pumpkin',name:'Pumpkin',cost:32,kind:'crop',description:'Hardy crop · sell for 52'},
  {id:'glowMushroom',name:'Glow Mushroom',cost:28,kind:'crop',description:'Two harvests · sells for 42 each'},
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

const floor=new THREE.Mesh(new THREE.PlaneGeometry(17,19),new THREE.MeshStandardMaterial({color:0x507944,roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.set(0,-.16,0);floor.receiveShadow=true;scene.add(floor);
const garden=new THREE.Group();scene.add(garden);
const plotMaterial=new THREE.MeshStandardMaterial({color:0x704b31,roughness:1});
const plotEdgeMaterial=new THREE.MeshStandardMaterial({color:0x9a7045,roughness:1});
const plotMeshes=[];
for(let row=0;row<4;row++)for(let col=0;col<6;col++){
  const tile=new THREE.Mesh(new THREE.BoxGeometry(1.7,.12,1.7),plotMaterial.clone());
  tile.position.set(-4.5+col*1.8,-.04,-2.7+row*1.8);tile.receiveShadow=true;tile.userData={col,row};garden.add(tile);plotMeshes.push(tile);
  const edge=new THREE.Mesh(new THREE.BoxGeometry(1.78,.06,1.78),plotEdgeMaterial);
  edge.position.set(tile.position.x,-.12,tile.position.z);garden.add(edge);
}
const selectionHighlight=new THREE.Mesh(new THREE.BoxGeometry(1.82,.045,1.82),new THREE.MeshBasicMaterial({color:0xf2d56c,transparent:true,opacity:.65}));
selectionHighlight.visible=false;garden.add(selectionHighlight);
for(const z of [-5.5,5.5])for(let x=-7;x<=7;x+=1.4){
  const post=new THREE.Mesh(new THREE.BoxGeometry(.14,.75,.14),new THREE.MeshStandardMaterial({color:0x78563a}));
  post.position.set(x,.22,z);post.castShadow=true;scene.add(post);
}
function marketStall(x,z,title,color){
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
  plate.position.set(0,1.05,-.44);stall.add(plate);stall.position.set(x,0,z);scene.add(stall);
}
marketStall(-6.1,-7,'SEEDS',0x69a953);
marketStall(-2,-7,'GEAR',0x5489a0);
marketStall(2.2,-7,'SELL',0xb8834d);
marketStall(6,-7,'LANDS',0x9b69a9);
marketStall(0,7.8,'GUN CRAFT',0x8c65be);
const workbenchMetal=new THREE.MeshStandardMaterial({color:0x70858a,metalness:.65,roughness:.3});
const barrelMesh=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.8,12),workbenchMetal);
barrelMesh.rotation.z=Math.PI/2;barrelMesh.position.set(0,1.55,7.22);scene.add(barrelMesh);
const barrelTip=new THREE.Mesh(new THREE.TorusGeometry(.105,.025,8,16),new THREE.MeshStandardMaterial({color:0x8de4cb,emissive:0x39ad8c,emissiveIntensity:.7}));
barrelTip.rotation.y=Math.PI/2;barrelTip.position.set(.42,1.55,7.22);scene.add(barrelTip);
const workbenchGrip=new THREE.Mesh(new THREE.BoxGeometry(.2,.38,.2),new THREE.MeshStandardMaterial({color:0x73934d}));
workbenchGrip.position.set(-.12,1.32,7.22);workbenchGrip.rotation.z=-.28;scene.add(workbenchGrip);
const workbenchCrystals=new THREE.Mesh(new THREE.OctahedronGeometry(.2),new THREE.MeshStandardMaterial({color:0x9c7dff,emissive:0x6341d8,emissiveIntensity:.7}));
workbenchCrystals.position.set(.08,1.78,7.22);scene.add(workbenchCrystals);
const gardenStalls=[
  {id:'seeds',title:'Seeds stall',x:-6.1,z:-7},
  {id:'gear',title:'Gear stall',x:-2,z:-7},
  {id:'sell',title:'Sell stall',x:2.2,z:-7},
  {id:'lands',title:'Land stall',x:6,z:-7},
  {id:'workbench',title:'Gun making station',x:0,z:7.8},
];
for(const [x,z]of [[-7,7],[7,7]]){
  const pond=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.4,.2,24),new THREE.MeshStandardMaterial({color:0x438fa0,roughness:.25,metalness:.1}));
  pond.position.set(x,-.03,z);scene.add(pond);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.25,.12,8,24),new THREE.MeshStandardMaterial({color:0xb6d2a0}));
  ring.rotation.x=Math.PI/2;ring.position.set(x,.08,z);scene.add(ring);
}

function makeFlower(type){
  const group=new THREE.Group();
  const material=(color,roughness=.72,emissive=0)=>new THREE.MeshStandardMaterial({color,roughness,emissive,emissiveIntensity:emissive?1.4:0});
  const leaf=(x,y,z,rotation,color=0x5cae54,scale=1)=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),material(color));
    mesh.scale.set(scale,.3,scale*1.6);mesh.position.set(x,y,z);mesh.rotation.z=rotation;group.add(mesh);return mesh;
  };
  const createStem=(height=.65,color=0x45874a,radius=.065)=>{
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.75,radius,height,9),material(color));
    mesh.position.y=height/2;mesh.castShadow=true;group.add(mesh);return mesh;
  };
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

function disposeGroup(group){
  group.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material){if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());else object.material.dispose();}});
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
  updateObjects(state.plants.values(),state.plantMeshes,
    plant=>makeFlower(plant.type),(mesh,plant)=>{
      mesh.position.set(plant.x,0,plant.z);
      const grow=Math.min(1,Math.max(.25,(Date.now()-plant.plantedAt)/Math.max(1,plant.matureAt-plant.plantedAt)));
      mesh.scale.setScalar(grow*(plant.fruitSize||1));
      mesh.rotation.y=(plant.col*1.71+plant.row*.83)%6.28;
    });
  updateObjects(state.zombies.values(),state.zombieMeshes,
    zombie=>{const mesh=makeZombie();mesh.userData.zombieId=zombie.id;return mesh;},
    (mesh,zombie)=>{mesh.position.set(zombie.x,0,zombie.z);mesh.rotation.y=Math.PI;});
  updateObjects(state.players.values(),state.playerMeshes,
    player=>makePlayer(player.color),(mesh,player)=>{mesh.visible=player.id!==state.playerId;mesh.position.set(player.x,0,player.z);mesh.rotation.y=Math.PI;});
  updateObjects(Array.from(state.sprinklers,key=>{
    const [col,row]=key.split(':').map(Number);return{id:key,col,row,x:-4.5+col*1.8,z:-2.7+row*1.8};
  }),state.sprinklerMeshes||=new Map(),()=>{
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.19,.23,.16,10),new THREE.MeshStandardMaterial({color:0x82bdcc,metalness:.25,roughness:.4}));
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.055,.07,.45,8),new THREE.MeshStandardMaterial({color:0x8db7a5}));stem.position.y=.27;base.add(stem);return base;
  },(mesh,item)=>mesh.position.set(item.x,.12,item.z));
  if(state.selectedTile){
    const tile=plotMeshes.find(mesh=>mesh.userData.col===state.selectedTile.col&&mesh.userData.row===state.selectedTile.row);
    if(tile){
      selectionHighlight.position.set(tile.position.x,.045,tile.position.z);selectionHighlight.visible=true;
    }
  }else selectionHighlight.visible=false;
}

function resize(){
  const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}
function send(action,data={}){
  if(!state.socket||state.socket.readyState!==WebSocket.OPEN){status.textContent='Join a garden before using its shops and tools.';return;}
  state.socket.send(JSON.stringify({type:'garden:action',action,...data}));
}
function connect(mode,roomId=''){
  const name=$('playerName').value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,20);
  if(!name){joinStatus.textContent='Enter your name before joining.';$('playerName').focus();return;}
  localStorage.setItem('gardenfallName',name);
  state.joinedPosition=false;state.selectedTile=null;state.trowelFrom=null;state.seedSignature=null;
  if(!state.clientId){
    state.clientId=localStorage.getItem('gardenfallClientId')||crypto.randomUUID();
    localStorage.setItem('gardenfallClientId',state.clientId);
  }
  if(state.socket)state.socket.close();
  const scheme=location.protocol==='https:'?'wss:':'ws:';
  const socket=new WebSocket(scheme+'//'+location.host);state.socket=socket;
  status.textContent='Connecting…';joinStatus.textContent='Connecting to the garden server…';
  socket.addEventListener('open',()=>socket.send(JSON.stringify({type:'garden:join',mode,roomId,name,clientId:state.clientId})));
  socket.addEventListener('message',event=>{
    if(state.socket!==socket)return;
    let message;try{message=JSON.parse(event.data);}catch(error){console.warn('Could not read garden update.',error);return;}
    if(message.type==='garden:error'){if(message.message){joinStatus.textContent=message.message;status.textContent=message.message;clearTimeout(statusTimeout);statusTimeout=setTimeout(()=>{if(state.socket===socket)status.textContent=state.roomId?'Garden connected':'Not in a garden';},4000);}return;}
    if(message.type!=='garden:sync')return;
    state.roomId=message.roomId;state.roomMode=message.mode;state.playerId=message.playerId||state.playerId;
    state.day=message.day;state.phase=message.phase;state.phaseRemaining=message.phaseRemaining;state.gardenHealth=message.gardenHealth;
    state.players=new Map((message.players||[]).map(player=>[player.id,player]));
    state.plants=new Map((message.plants||[]).map(plant=>[`${plant.col}:${plant.row}`,plant]));
    state.zombies=new Map((message.zombies||[]).map(zombie=>[zombie.id,zombie]));
    state.sprinklers=new Set(message.sprinklers||[]);
    state.ponds=message.ponds||[];
    const previousWeather=state.weather;
    state.weather=message.weather||'clear';
    state.weatherRemaining=message.weatherRemaining||0;
    updateWeather(state.weather,state.weatherKnown?state.weather!==previousWeather:state.weather!=='clear');
    state.weatherKnown=true;
    const local=state.players.get(state.playerId);
    if(local){
      if(!state.joinedPosition){state.x=local.x;state.z=local.z;state.joinedPosition=true;}
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
}
function formatTime(ms){
  const seconds=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function weatherName(weather){
  return ({solarFlare:'Solar Flare',aurora:'Aurora',fireworks:'Fireworks',rain:'Rain',clear:'Clear'})[weather]||weather;
}
function updateWeather(weather,announce=false){
  const styles={
    clear:{sky:0x9bc5a0,light:0xfff0ce,intensity:2.2},
    rain:{sky:0x71899a,light:0xb8cde0,intensity:1.55},
    aurora:{sky:0x586783,light:0xc3b5ff,intensity:1.8},
    solarFlare:{sky:0xc99a67,light:0xffd18c,intensity:2.8},
    fireworks:{sky:0x394765,light:0xc8bcff,intensity:1.65},
  };
  const style=styles[weather]||styles.clear;
  const color=new THREE.Color(style.sky);
  scene.background.copy(color);scene.fog.color.copy(color);
  sunlight.color.setHex(style.light);sunlight.intensity=style.intensity;
  $('weatherEffects').dataset.weather=weather;
  $('weatherLabel').textContent=`Weather · ${weatherName(weather)} · ${formatTime(state.weatherRemaining)}`;
  if(!announce)return;
  const descriptions={
    clear:'Clear skies return. Make the most of the calm.',
    rain:'Rain speeds crop growth and refills your watering can.',
    aurora:'Aurora light may mutate growing crops.',
    solarFlare:'Solar flares can mutate growing crops.',
    fireworks:'Fireworks may trigger rare crop mutations.',
  };
  const banner=$('weatherEvent');
  banner.dataset.weather=weather;
  $('weatherEventTitle').textContent=`${weatherName(weather).toUpperCase()} EVENT`;
  $('weatherEventDescription').textContent=descriptions[weather]||'A new weather event is sweeping through the garden.';
  banner.hidden=false;clearTimeout(weatherBannerTimer);
  weatherBannerTimer=setTimeout(()=>{banner.hidden=true;},7000);
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
function updateNearbyStation(){
  if(!state.roomId||joinScreen.hidden===false)return;
  const closest=gardenStalls
    .map(stall=>({...stall,distance:Math.hypot(state.x-stall.x,state.z-stall.z)}))
    .filter(stall=>stall.distance<=2.6)
    .sort((a,b)=>a.distance-b.distance)[0];
  if(!closest){
    state.nearbyStation='';
    state.dismissedStation='';
    hideInteractionPopups();
    return;
  }
  if(closest.id!==state.nearbyStation){
    state.nearbyStation=closest.id;
    if(state.dismissedStation!==closest.id)openStationPopup(closest.id);
  }else if(state.dismissedStation!==closest.id&&$('shopPopup').hidden&&$('workbenchPopup').hidden){
    openStationPopup(closest.id);
  }
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
  return state.plants.get(`${state.selectedTile.col}:${state.selectedTile.row}`)||null;
}
function updateActions(player){
  if(!player)return;
  const plant=selectedPlant();
  const defenderInfo={peashooter:'unlock Pea Blaster + 10 ammo',cornzooka:'unlock Rocket Corn + 2 ammo'};
  $('selectedTile').textContent=state.selectedTile?plant?`${seeds.find(item=>item.id===plant.type)?.name||plant.type} · ${Date.now()>=plant.matureAt?'Ready to harvest':'Growing'}${plant.mutation?` · ${plant.mutation} mutation`:''}${defenderInfo[plant.type]?` · Harvest to ${defenderInfo[plant.type]}`:''}${plant.reusable?' · Reusable; shovel to remove':` · ${plant.harvestsLeft??1} harvest(s) left`} · ${Math.ceil(plant.health)} HP`:`Plot ${state.selectedTile.col+1}, ${state.selectedTile.row+1} · Empty`:'Select a garden plot';
  $('plantButton').disabled=!state.selectedTile||!!plant||!state.selectedSeed;
  $('harvestButton').disabled=!plant||Date.now()<plant.matureAt||plant.ownerId!==state.playerId;
  $('harvestButton').textContent=plant&&defenderInfo[plant.type]?`Harvest · ${defenderInfo[plant.type]}`:'Harvest plant or fruit';
  $('waterButton').disabled=!plant||plant.ownerId!==state.playerId||!player.gear.wateringCan;
  $('shovelButton').disabled=!plant||plant.ownerId!==state.playerId||!player.gear.shovel;
  $('sprinklerButton').disabled=!state.selectedTile||state.sprinklers.has(`${state.selectedTile.col}:${state.selectedTile.row}`)||!(player.gear.sprinkler>0);
  $('trowelButton').disabled=!plant||plant.ownerId!==state.playerId||!player.gear.trowel;
  $('trowelButton').textContent=state.trowelFrom?'Choose destination plot':'Move plant (trowel)';
  $('refillButton').disabled=!player.gear.wateringCan||player.wateringCanCharges>=5;
  const custom=player.customGuns?.find(gun=>gun.id===player.weapon);
  const weapon=custom?.name||(player.weapon==='cornZooka'?'Rocket Corn':'Pea Blaster');
  const capacity=custom?.capacity||(player.weapon==='cornZooka'?2:10);
  const loaded=player.magazines?.[player.weapon]||0;
  $('ammoReadout').textContent=`${weapon} · Magazine ${loaded}/${capacity} · Reserve ${player.ammo[player.weapon]||0} · R reloads`;
  $('partsReadout').textContent=`Barrels ${player.parts.bamboo||0} · Reeds ${player.parts.reed||0} · Magazines ${player.parts.magazine||0} · Blast Corn ${player.parts.blastCorn||0} · Fertilizer ${player.gear.fertilizer||0} · Water ${player.wateringCanCharges||0}/5`;
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
  const baseSelect=$('gunBaseSelect');
  if(!player.weapons[baseSelect.value]){
    const availableBase=['peaBlaster','cornZooka'].find(base=>player.weapons[base]);
    if(availableBase)baseSelect.value=availableBase;
  }
  baseSelect.querySelector('[value="peaBlaster"]').disabled=!player.weapons.peaBlaster;
  baseSelect.querySelector('[value="cornZooka"]').disabled=!player.weapons.cornZooka;
  const partLabels={bamboo:'Bamboo',reed:'Reed Tube',magazine:'Magazine Vine',blastCorn:'Blast Corn',shell:'Pumpkin Shell',pollen:'Pollen Pod',trigger:'Trigger Bloom',grip:'Thorn Vine',crystal:'Crystal Bud'};
  const componentSelect=$('componentSelect');
  const partsSignature=JSON.stringify([player.parts,player.gear.fertilizer,$('gunBaseSelect').value]);
  if(partsSignature!==state.partsSignature){
    state.partsSignature=partsSignature;
    const selection=new Set(Array.from(componentSelect.querySelectorAll('input:checked'),input=>input.value));
    componentSelect.replaceChildren();
    for(const [part,label]of Object.entries(partLabels)){
      const wrapper=document.createElement('label'),input=document.createElement('input');
      input.type='checkbox';input.value=part;input.disabled=!(player.parts[part]>0);input.checked=selection.has(part);
      input.addEventListener('change',()=>{
        const selected=componentSelect.querySelectorAll('input:checked');
        if(selected.length>4){input.checked=false;status.textContent='Choose up to four plant parts per gun.';}
        $('craftCustomButton').disabled=!(player.gear.fertilizer>0&&componentSelect.querySelectorAll('input:checked').length>=1&&player.weapons[$('gunBaseSelect').value]);
        const selectedComponents=componentSelect.querySelectorAll('input:checked').length;
        const availableBase=!!player.weapons[baseSelect.value];
        $('craftHelp').textContent=!availableBase
          ?'Harvest a Pea Shooter or Rocket Corn to unlock a weapon base.'
          :!Object.values(player.parts).some(quantity=>quantity>0)
            ?'Harvest a special plant (Bamboo, Reed Tube, Magazine Vine, Blast Corn, and more) for a crafting part.'
            :!player.gear.fertilizer
              ?'Buy Plant Fertilizer in Gear to bind your selected plant parts into a gun.'
              :selectedComponents<1
                ?'Select at least one available plant part below. You can combine up to four.'
                :'Ready to craft. Your selected parts set the custom gun stats.';
      });
      wrapper.append(input,document.createTextNode(`${label} ×${player.parts[part]||0}`));componentSelect.append(wrapper);
    }
  }
  $('craftCustomButton').disabled=!(player.gear.fertilizer>0&&componentSelect.querySelectorAll('input:checked').length>=1&&player.weapons[$('gunBaseSelect').value]);
  const goods=Object.entries(player.goods||{}).filter(([,amount])=>amount>0);
  $('goodsReadout').textContent=goods.length?goods.map(([type,amount])=>`${seeds.find(item=>item.id===type)?.name||type} ×${amount}`).join(' · '):'No harvested goods yet.';
  $('sellAllButton').disabled=!goods.length;
  if(state.selectedShop==='gear'||state.selectedShop==='lands')renderShop();
  renderSeedSelect(player);
}

function selectPlot(col,row){
  state.selectedTile={col,row};
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
  state.selectedTile={col:plant.col,row:plant.row};
  updateWorld();updateActions(state.players.get(state.playerId));
  send('harvest',{tile:`${plant.col}:${plant.row}`});
  return true;
}
function plantAimedSeed(){
  if(!state.selectedSeed){status.textContent='Choose or buy a seed before planting.';return;}
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hit=raycaster.intersectObjects(plotMeshes,false)[0];
  const tile=hit?.object.userData||state.selectedTile;
  if(!tile){status.textContent='Aim at a garden plot or select one before planting.';return;}
  send('plant',{item:state.selectedSeed,tile:{col:tile.col,row:tile.row}});
}
function findRoot(object,property){
  let node=object;while(node){if(node.userData?.[property])return node;node=node.parent;}return null;
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
    if(zombie){send('shoot',{target:zombie.id});return;}
  }
  const plotHit=raycaster.intersectObjects(plotMeshes,false)[0];
  if(plotHit){
    const tile=plotHit.object.userData;
    if(state.trowelFrom){
      send('move-plant',{from:state.trowelFrom,to:tile});state.trowelFrom=null;
      updateActions(state.players.get(state.playerId));
    }else selectPlot(tile.col,tile.row);
    return;
  }
  const point=raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
  if(point){const col=Math.round((point.x+4.5)/1.8),row=Math.round((point.z+2.7)/1.8);if(col>=0&&col<6&&row>=0&&row<4){
    if(state.trowelFrom){send('move-plant',{from:state.trowelFrom,to:{col,row}});state.trowelFrom=null;updateActions(state.players.get(state.playerId));}
    else selectPlot(col,row);
  }}
});
function bindAction(id,action,extra=()=>({})){
  $(id).addEventListener('click',()=>{if(!state.selectedTile)return;send(action,{tile:`${state.selectedTile.col}:${state.selectedTile.row}`,...extra()});});
}
bindAction('plantButton','plant',()=>({item:state.selectedSeed,tile:{...state.selectedTile}}));
bindAction('harvestButton','harvest');
bindAction('waterButton','water');
bindAction('shovelButton','shovel');
bindAction('sprinklerButton','sprinkler',()=>({tile:{...state.selectedTile}}));
$('craftCustomButton').addEventListener('click',()=>{
  const components=Array.from($('componentSelect').querySelectorAll('input:checked'),input=>input.value);
  if(components.length>=1)send('craft',{item:'customGun',base:$('gunBaseSelect').value,components});
});
$('gunBaseSelect').addEventListener('change',()=>updateActions(state.players.get(state.playerId)));
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
window.addEventListener('keydown',event=>{
  const popupOpen=!$('shopPopup').hidden||!$('workbenchPopup').hidden;
  if(popupOpen&&['KeyQ','KeyR'].includes(event.code)){event.preventDefault();return;}
  if(popupOpen&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){
    event.preventDefault();return;
  }
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)&&!['INPUT','SELECT'].includes(document.activeElement.tagName)){state.keys.add(event.code);event.preventDefault();}
  if(event.repeat||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(event.code==='KeyQ'){plantAimedSeed();return;}
  if(event.code==='KeyR'){send('reload');return;}
  if(event.code==='KeyF')send('refill-water');
  if(event.code==='KeyE'){
    if(harvestNearbyPlant()){
      status.textContent='Harvested the nearest ripe plant.';
      return;
    }
    const station=gardenStalls.find(item=>Math.hypot(state.x-item.x,state.z-item.z)<=2.6);
    if(station)openStationPopup(station.id);
    else status.textContent='No ripe plant or stall nearby.';
  }
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
  if(state.roomId&&state.socket?.readyState===WebSocket.OPEN){
    const interactionOpen=!$('shopPopup').hidden||!$('workbenchPopup').hidden;
    const forward=interactionOpen?0:(state.keys.has('KeyW')||state.keys.has('ArrowUp')?1:0)-(state.keys.has('KeyS')||state.keys.has('ArrowDown')?1:0);
    const side=interactionOpen?0:(state.keys.has('KeyD')||state.keys.has('ArrowRight')?1:0)-(state.keys.has('KeyA')||state.keys.has('ArrowLeft')?1:0);
    const length=Math.hypot(forward,side)||1;
    const inputX=(Math.sin(state.yaw)*forward+Math.cos(state.yaw)*side)/length;
    const inputZ=(-Math.cos(state.yaw)*forward+Math.sin(state.yaw)*side)/length;
    const blend=1-Math.exp(-11*delta);
    state.velocity.x+=(inputX*4.2-state.velocity.x)*blend;
    state.velocity.y+=(inputZ*4.2-state.velocity.y)*blend;
    if(!forward&&!side){state.velocity.multiplyScalar(Math.exp(-8*delta));}
    state.x=Math.max(-8.5,Math.min(8.5,state.x+state.velocity.x*delta));
    state.z=Math.max(-8.5,Math.min(8.5,state.z+state.velocity.y*delta));
    if(!forward&&!side&&Math.hypot(state.targetX-state.x,state.targetZ-state.z)<1){
      state.x+=(state.targetX-state.x)*Math.min(1,delta*3);
      state.z+=(state.targetZ-state.z)*Math.min(1,delta*3);
    }
    if(performance.now()-state.lastMove>100){send('move',{x:state.x,z:state.z});state.lastMove=performance.now();}
    updateNearbyStation();
    camera.position.set(state.x,1.65,state.z);
    const cosPitch=Math.cos(state.pitch);
    camera.lookAt(state.x+Math.sin(state.yaw)*cosPitch,1.65+Math.sin(state.pitch),state.z-Math.cos(state.yaw)*cosPitch);
  }
  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}
const clock=new THREE.Clock();
function uiTick(){
  if(state.roomId){
    state.phaseRemaining=Math.max(0,state.phaseRemaining-1000);
    const local=state.players.get(state.playerId);updateHud(local);updateActions(local);
  }
  setTimeout(uiTick,1000);
}
function init(){
  try{$('playerName').value=localStorage.getItem('gardenfallName')||'';}catch(error){console.warn('Could not load saved garden name.',error);}
  renderShop();resize();requestAnimationFrame(animate);uiTick();
}
window.addEventListener('pagehide',()=>{
  state.disposed=true;state.socket?.close();renderer.setAnimationLoop(null);renderer.dispose();
});
init();
