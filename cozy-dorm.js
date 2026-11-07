import * as THREE from 'three';

const $=id=>document.getElementById(id);
const canvas=$('dormCanvas');
const connectionStatus=$('connectionStatus');
const roomForm=$('roomForm');
const roomLobby=$('roomLobby');
const roomCodeInput=$('roomCode');
const roomCodeLabel=$('roomCodeLabel');
const lobbyStatus=$('lobbyStatus');
const playerList=$('playerList');
const shareButton=$('shareRoom');
const furnitureType=$('furnitureType');
const placeButton=$('placeFurniture');
const rotateButton=$('rotateFurniture');
const deleteButton=$('deleteFurniture');
const computerHint=$('computerHint');
const computerAppWindow=$('computerAppWindow');
const computerAppFrame=$('computerAppFrame');
const computerModeBar=$('computerModeBar');
const movementHint=$('movementHint');
const radioFileInput=$('radioFiles');
const radioTrackSelect=$('radioTrack');
const radioStatus=$('radioStatus');
const radioAudio=new Audio();
radioAudio.preload='metadata';
radioAudio.volume=.7;
const computerAppButtons=Array.from(document.querySelectorAll('[data-computer-app]'));
const computerApps=[
  {id:'arcade',label:'Pong'},
  {id:'stream',label:'Radio'},
  {id:'room',label:'Room'},
  {id:'sektor',label:'Sektor'},
  {id:'sketch',label:'Retro Sketch'},
];
const snapSize=.25;
const roomPalette={wood:0x3d2314,cream:0xf4efe6,sunset:0xffb77d,shadow:0x2d3250,pink:0xff6b8b,foliage:0x4a7c59};
const state={socket:null,roomId:'',playerId:'',ownerId:'',name:'',color:'#ff8b79',players:new Map(),layout:[],isOwner:false,placingType:'',selectedItem:null,draggingItem:false,lookDragging:false,suppressClick:false,lastLookPoint:null,keys:new Set(),yaw:0,pitch:0,lastStateAt:0,usingComputer:false,returnFromComputer:null,themeId:'sunset',computerApp:'arcade',arcadeRunning:true,arcadeScore:0,leftPaddleY:.5,rightPaddleY:.5,ball:{x:.5,y:.5,vx:.005,vy:.003},computerDrawElapsed:0,roomItems:new Map(),remoteAvatars:new Map(),screenTexture:null,radioTracks:[],radioTrackIndex:-1,disposed:false};
const dormantThemes={
  sunset:{label:'Cozy sunset',floor:0x3d2314,wall:0xf0dfcf,side:0xead8c8,ceiling:0xf3e7d8,accent:'#ffb77d',light:0xffdfb8,background:0x41353d},
  forest:{label:'Forest',floor:0x314b39,wall:0xd9e8d4,side:0xbdd3c0,ceiling:0xe9f0e2,accent:'#8be0a4',light:0xd9ffd5,background:0x263a30},
  midnight:{label:'Midnight',floor:0x24283f,wall:0x42445f,side:0x34364f,ceiling:0x292d47,accent:'#a6a2ff',light:0xc4c6ff,background:0x171827},
  lofi:{label:'Lo-fi',floor:0x493c42,wall:0x92777a,side:0x80686e,ceiling:0xb99a91,accent:'#ffb777',light:0xffccb2,background:0x332a36},
};
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=false;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.xr.enabled=true;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x41353d);
scene.fog=new THREE.Fog(0x41353d,13,28);
const camera=new THREE.PerspectiveCamera(58,1,.1,80);
const clock=new THREE.Clock();
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const roomGroup=new THREE.Group();
scene.add(roomGroup);
scene.add(new THREE.HemisphereLight(roomPalette.sunset,roomPalette.shadow,.8));
const keyLight=new THREE.DirectionalLight(0xffdfb8,2.1);
keyLight.position.set(-4,8,5);keyLight.castShadow=false;scene.add(keyLight);

function material(color,roughness=.82,emissive=0x000000) {
  return new THREE.MeshStandardMaterial({color,roughness,emissive,emissiveIntensity:emissive?0.35:0});
}
function makeBox(parent,w,h,d,color,x,y,z,castShadow=true) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));
  mesh.position.set(x,y,z);mesh.castShadow=castShadow;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function makeRoom() {
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),material(roomPalette.wood));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.03;floor.receiveShadow=true;floor.name='floor';roomGroup.add(floor);state.floor=floor;
  for(let i=0;i<20;i++)makeBox(roomGroup,10,.012,.018,0x68412a,0,-.02,-4.75+i*.5,false);
  state.backWall=makeBox(roomGroup,10,5,.25,0xf0dfcf,0,2.5,-5.05);
  state.leftWall=makeBox(roomGroup,.25,5,10,0xead8c8,-5.05,2.5,0);
  state.rightWall=makeBox(roomGroup,.25,5,10,0xe8cdbb,5.05,2.5,0);
  state.frontWall=makeBox(roomGroup,10,5,.25,0xead8c8,0,2.5,5.05);
  state.ceiling=makeBox(roomGroup,10,.25,10,0xf3e7d8,0,5.05,0,false);
  state.roomFloor=floor;
  state.sideWalls=[state.leftWall,state.rightWall,state.frontWall];
  makeComputer();
  const windowLight=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.5),new THREE.MeshBasicMaterial({color:0xffc99c,side:THREE.DoubleSide}));
  windowLight.rotation.y=Math.PI/2;windowLight.position.set(-4.89,2.4,-3.8);roomGroup.add(windowLight);
  makeBox(roomGroup,.14,1.9,.12,0x5c3b31,-4.86,2.4,-4.49);
  makeBox(roomGroup,.14,1.9,.12,0x5c3b31,-4.86,2.4,-3.11);
  makeBox(roomGroup,.14,.12,1.5,0x5c3b31,-4.86,3.29,-3.8);
  makeBox(roomGroup,.14,.12,1.5,0x5c3b31,-4.86,1.51,-3.8);
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(4.2,2.6),material(0x704653));
  rug.rotation.x=-Math.PI/2;rug.position.set(0,.01,1);rug.receiveShadow=true;roomGroup.add(rug);
  makeBox(roomGroup,.08,4.7,.08,0x5e4439,-4.88,2.35,-4.88);
  makeBox(roomGroup,.08,4.7,.08,0x5e4439,4.88,2.35,-4.88);
  makeDust();
  applyDormTheme(state.themeId);
}
function applyDormTheme(themeId,save=false){
  const theme=dormantThemes[themeId]||dormantThemes.sunset;
  state.themeId=themeId in dormantThemes?themeId:'sunset';
  if(state.roomFloor)state.roomFloor.material.color.setHex(theme.floor);
  if(state.backWall)state.backWall.material.color.setHex(theme.wall);
  if(state.ceiling)state.ceiling.material.color.setHex(theme.ceiling);
  for(const wall of state.sideWalls||[])wall.material.color.setHex(theme.side);
  scene.background.setHex(theme.background);
  scene.fog.color.setHex(theme.background);
  keyLight.color.setHex(theme.light);
  document.documentElement.style.setProperty('--sunset',theme.accent);
  if($('dormTheme'))$('dormTheme').value=state.themeId;
  if(save){
    try{localStorage.setItem('cozyDormTheme',state.themeId);}
    catch(error){console.warn('Could not save the selected Dorm theme.',error);}
  }
}

function makeComputer() {
  makeBox(roomGroup,2,.1,.78,0x624434,0,.78,-4.2);
  makeBox(roomGroup,.1,.68,.1,0x4c3730,-.82,.39,-3.96);
  makeBox(roomGroup,.1,.68,.1,0x4c3730,.82,.39,-3.96);
  makeBox(roomGroup,.16,.28,.16,0x3d373c,0,1.02,-4.58);
  makeBox(roomGroup,.68,.07,.38,0x3d373c,0,.84,-4.43);
  const monitor=makeBox(roomGroup,1.65,.98,.12,0x28272d,0,1.62,-4.65);
  monitor.userData.computer=true;
  state.computerMonitor=monitor;
  const screenCanvas=document.createElement('canvas');screenCanvas.width=1024;screenCanvas.height=576;
  state.screenCanvas=screenCanvas;state.screenContext=screenCanvas.getContext('2d');
  state.screenTexture=new THREE.CanvasTexture(screenCanvas);state.screenTexture.colorSpace=THREE.SRGBColorSpace;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.48,.82),new THREE.MeshBasicMaterial({map:state.screenTexture}));
  screen.position.set(0,1.62,-4.58);screen.userData.computer=true;roomGroup.add(screen);state.computerScreen=screen;
  drawComputer();
}

function drawComputer() {
  const ctx=state.screenContext;if(!ctx)return;
  const w=state.screenCanvas.width,h=state.screenCanvas.height;
  computerAppButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.computerApp===state.computerApp)));
  $('radioControls').hidden=state.computerApp!=='stream';
  const appHint=$('computerAppHint');
  if(appHint)appHint.textContent=state.computerApp==='sektor'||state.computerApp==='sketch'?'App is open at the computer. Use the buttons above to switch apps.':state.computerApp==='stream'?'Pick local audio files for the Dorm Radio. Only you will hear them.':'Use these buttons to switch apps. Pong plays automatically.';
  ctx.fillStyle='#1b1b2b';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#11111b';ctx.fillRect(0,0,w,82);
  computerApps.forEach((app,index)=>{
    const tabWidth=w/computerApps.length;
    ctx.fillStyle=state.computerApp===app.id?'#ffb77d':'#b2a1a1';
    ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.fillText(app.id==='sketch'?'SKETCH':app.label.toUpperCase(),tabWidth*(index+.5),52);
  });
  if(state.computerApp==='arcade') {
    ctx.textAlign='left';ctx.fillStyle='#333448';ctx.fillRect(28,100,w-56,h-132);
    ctx.strokeStyle='#ffb77d';ctx.setLineDash([12,10]);ctx.beginPath();ctx.moveTo(w/2,118);ctx.lineTo(w/2,h-48);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#f4efe6';ctx.fillRect(88,state.leftPaddleY*h-55,18,110);ctx.fillRect(w-106,state.rightPaddleY*h-55,18,110);
    ctx.beginPath();ctx.arc(state.ball.x*w,state.ball.y*h,14,0,Math.PI*2);ctx.fill();
    ctx.font='bold 23px monospace';ctx.fillText('PONG  '+state.arcadeScore,52,145);
    ctx.fillStyle='#ffb77d';ctx.font='bold 16px system-ui';ctx.fillText('AUTOPLAY · SIT BACK AND WATCH',w/2-153,h-50);
  } else if(state.computerApp==='stream') {
    ctx.textAlign='left';
    ctx.fillStyle='#09090d';ctx.fillRect(28,92,w-56,h-120);
    ctx.fillStyle='#ffb77d';ctx.font='bold 27px system-ui';ctx.fillText('DORM RADIO',58,148);
    ctx.fillStyle='#e3d6d1';ctx.font='18px system-ui';
    const currentTrack=state.radioTracks[state.radioTrackIndex];
    ctx.fillText(currentTrack?.name||'Choose files to start your local playlist',58,190,{maxWidth:w-116});
    ctx.fillStyle='#c9b8b8';ctx.font='16px system-ui';
    ctx.fillText(currentTrack?(radioAudio.paused?'Paused · local playback':'Playing · only you can hear it'):'Your music stays on this device',58,230);
    const progress=radioAudio.duration?radioAudio.currentTime/radioAudio.duration:0;
    ctx.fillStyle='#3d3446';ctx.fillRect(58,h-112,w-116,12);
    ctx.fillStyle='#ff6b8b';ctx.fillRect(58,h-112,progress*(w-116),12);
    ctx.fillStyle='#c9b8b8';ctx.font='14px system-ui';
    ctx.fillText(`${formatRadioTime(radioAudio.currentTime)} / ${formatRadioTime(radioAudio.duration)}`,58,h-72);
  } else if(state.computerApp==='room') {
    ctx.textAlign='left';
    ctx.fillStyle='#252333';ctx.fillRect(28,92,w-56,h-120);
    ctx.fillStyle='#ffb77d';ctx.font='bold 25px system-ui';ctx.fillText('ROOM DASHBOARD',58,145);
    ctx.fillStyle='#e9d8c6';ctx.font='17px system-ui';ctx.fillText('Room '+(state.roomId||'—'),58,190);
    ctx.fillText('Guests '+state.players.size+'/8',58,226);
    ctx.fillStyle='#8b7b7f';ctx.fillText(state.isOwner?'You can arrange the room decor.':'The room owner is arranging the decor.',58,278);
  } else if(state.computerApp==='sektor') {
    ctx.textAlign='left';ctx.fillStyle='#17241e';ctx.fillRect(28,100,w-56,h-132);
    ctx.fillStyle='#65e6ad';ctx.font='bold 50px system-ui';ctx.fillText('SEKTOR',58,190);
    ctx.fillStyle='#edf7f2';ctx.font='22px system-ui';ctx.fillText('Your social space',58,242);
    ctx.fillStyle='#a5c5b9';ctx.font='bold 17px system-ui';ctx.fillText('CLICK COMPUTER TO USE',58,330);
  } else {
    ctx.textAlign='left';ctx.fillStyle='#111a17';ctx.fillRect(28,100,w-56,h-132);
    ctx.fillStyle='#65e6ad';ctx.font='bold 34px system-ui';ctx.fillText('RETRO SKETCH',58,190);
    ctx.fillStyle='#edf7f2';ctx.font='22px system-ui';ctx.fillText('Draw · Guess · Repeat',58,242);
    ctx.fillStyle='#a5c5b9';ctx.font='bold 17px system-ui';ctx.fillText('CLICK COMPUTER TO USE',58,330);
  }
  state.screenTexture.needsUpdate=true;
}

function makeDust() {
  const count=140,positions=new Float32Array(count*3);
  for(let i=0;i<count;i++){positions[i*3]=(Math.random()-.5)*9;positions[i*3+1]=Math.random()*4;positions[i*3+2]=(Math.random()-.5)*9;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const particles=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffe6c9,size:.035,transparent:true,opacity:.55,depthWrite:false}));
  scene.add(particles);state.dust=particles;
}

function textSprite(text,color) {
  const labelCanvas=document.createElement('canvas');labelCanvas.width=384;labelCanvas.height=96;
  const ctx=labelCanvas.getContext('2d');ctx.fillStyle='rgba(29,23,24,.82)';ctx.beginPath();ctx.roundRect(4,4,376,88,22);ctx.fill();
  ctx.fillStyle=color;ctx.font='bold 34px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text.slice(0,24),192,48);
  const texture=new THREE.CanvasTexture(labelCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.scale.set(1.45,.36,1);return sprite;
}

function setAvatarIdentity(avatar,name,color) {
  avatar.userData.playerName=name;
  const body=avatar.children.find(child=>child.isMesh);
  if(body)body.material.color.set(color);
  const previous=avatar.children.find(child=>child.isSprite);
  if(previous){avatar.remove(previous);previous.material.map?.dispose();previous.material.dispose();}
  const label=textSprite(name,color);label.position.y=1.72;avatar.add(label);
}

function makeAvatar(name,color,isLocal=false) {
  const group=new THREE.Group();group.userData.playerName=name;
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.28,.58,4,8),material(color));
  body.position.y=.66;body.castShadow=true;group.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.22,16,12),material(0xf0c7a8));
  head.position.y=1.22;head.castShadow=true;group.add(head);
  const label=textSprite(name,color);label.position.y=1.72;group.add(label);
  if(!isLocal)scene.add(group);
  return group;
}
const localAvatar=makeAvatar('You','#ff8b79',true);

function createFurniture(item) {
  const group=new THREE.Group();group.userData.dormItem=item;
  const wood=material(0x79543f),lightWood=material(0xa77b5d),fabric=material(0xc28b8e),green=material(roomPalette.foliage),pot=material(0x9a5c4b);
  const box=(w,h,d,mat,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
  const cylinder=(rt,rb,h,mat,x,y,z,segments=12)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),mat);mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;};
  if(item.type==='bed'){
    box(1.65,.32,2.5,wood,0,.32,0);box(1.58,.22,2.2,fabric,0,.58,.02);box(1.62,.45,.16,lightWood,0,.73,-1.23);
    box(.48,.16,.43,material(0xe8d8c9),-.4,.77,-.77);box(.48,.16,.43,material(0xe8d8c9),.4,.77,-.77);
    for(const x of [-.68,.68])for(const z of [-1.08,1.08])box(.13,.32,.13,wood,x,.16,z);
  } else if(item.type==='desk'){
    box(1.7,.12,.8,lightWood,0,1.05,0);box(.1,1.02,.1,wood,-.72,.52,-.3);box(.1,1.02,.1,wood,.72,.52,-.3);box(.1,1.02,.1,wood,-.72,.52,.3);box(.1,1.02,.1,wood,.72,.52,.3);
    box(.45,.08,.32,material(0x4f566b),0,1.18,0);box(.18,.18,.12,material(0x28272d),0,1.05,.05);
  } else if(item.type==='chair'){
    box(.72,.12,.68,fabric,0,.55,0);box(.72,.72,.12,wood,0,.96,-.28);
    for(const x of [-.29,.29])for(const z of [-.24,.24])box(.08,.52,.08,wood,x,.27,z);
  } else if(item.type==='plant'){
    cylinder(.32,.23,.42,pot,0,.21,0);cylinder(.025,.025,.5,wood,0,.66,0,8);
    [[-.22,1.05,0],[.2,1.18,.06],[0,1.3,-.08],[-.12,.98,.15],[.19,.96,-.12]].forEach(([x,y,z])=>{const leaf=new THREE.Mesh(new THREE.SphereGeometry(.24,10,8),green);leaf.scale.set(.6,1.35,.55);leaf.position.set(x,y,z);leaf.castShadow=true;group.add(leaf);});
  } else if(item.type==='lamp'){
    cylinder(.29,.29,.12,wood,0,.06,0);cylinder(.045,.045,1.65,lightWood,0,.88,0);cylinder(.32,.1,.42,material(0xffd49b,.4,0xffbb78),0,1.8,0);
  } else if(item.type==='shelf'){
    for(const x of [-.58,.58])box(.12,1.95,.36,wood,x,.98,0);
    for(const y of [.12,.72,1.32,1.92])box(1.28,.1,.42,lightWood,0,y,0);
    for(let i=0;i<8;i++){const book=box(.12,.42+Math.random()*.24,.25,[0x9c5e65,0x6c8390,0xc49b62,0x648367][i%4],-.48+i*.13,.43,0);book.rotation.z=(Math.random()-.5)*.12;}
  }
  group.position.set(item.x||0,0,item.z||0);group.rotation.y=Number(item.rotation)||0;
  group.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}});
  return group;
}

function renderLayout() {
  for(const group of state.roomItems.values()) {
    group.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material?.map)object.material.map.dispose();if(object.material)object.material.dispose();});
    roomGroup.remove(group);
  }
  state.roomItems.clear();state.selectedItem=null;updateFurnitureControls();
  for(const item of state.layout) {
    const group=createFurniture(item);group.userData.dormItem=item;roomGroup.add(group);state.roomItems.set(item.id,group);
  }
}
function snap(value) { return Math.round(value/snapSize)*snapSize; }
function updateFurnitureControls() {
  $('dormTheme').disabled=state.usingComputer;
  furnitureType.disabled=!state.isOwner||state.usingComputer;
  placeButton.disabled=!state.isOwner||state.usingComputer;
  rotateButton.disabled=!state.isOwner||!state.selectedItem||state.usingComputer;
  deleteButton.disabled=!state.isOwner||!state.selectedItem||state.usingComputer;
  document.querySelectorAll('.touch-pad button').forEach(button=>{button.disabled=state.usingComputer;});
  movementHint.textContent=state.usingComputer?'Computer controls are active · use Go back to room to move again':'Click once to look around · Esc releases mouse · WASD move'+(state.isOwner?' · drag decor to move':'');
}
function selectItem(itemId) {
  state.selectedItem=itemId||null;
  state.roomItems.forEach((group,id)=>group.traverse(object=>{
    if(object.isMesh)object.material.emissive?.setHex(id===itemId?0x4c251b:0);
  }));
  updateFurnitureControls();
}
function saveLayout() {
  if(!state.socket||state.socket.readyState!==WebSocket.OPEN||!state.isOwner)return;
  state.socket.send(JSON.stringify({type:'dorm:layout',layout:state.layout}));
}
function syncFurnitureFromScene() {
  state.layout=state.layout.map(item=>{
    const group=state.roomItems.get(item.id);if(!group)return item;
    return {...item,x:snap(group.position.x),z:snap(group.position.z),rotation:Math.round(group.rotation.y/(Math.PI/12))*(Math.PI/12)};
  });
  saveLayout();
}

function updatePlayerList() {
  playerList.textContent=Array.from(state.players.values(),player=>player.id===state.playerId?player.name+' (you)':player.name).join(' · ')||'You are alone for now';
  drawComputer();
}
function updateRemotePlayer(player) {
  if(!player||player.id===state.playerId)return;
  let avatar=state.remoteAvatars.get(player.id);
  if(!avatar){avatar=makeAvatar(player.name,player.color);state.remoteAvatars.set(player.id,avatar);scene.add(avatar);}
  else setAvatarIdentity(avatar,player.name,player.color);
  avatar.position.set(Number(player.x)||0,0,Number(player.z)||0);avatar.rotation.y=Number(player.yaw)||0;
  state.players.set(player.id,player);
  updatePlayerList();
}
function removeRemotePlayer(id) {
  const avatar=state.remoteAvatars.get(id);if(avatar){scene.remove(avatar);avatar.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material?.map)object.material.map.dispose();if(object.material)object.material.dispose();});state.remoteAvatars.delete(id);}
  state.players.delete(id);updatePlayerList();
}
function setOwner(ownerId) {
  state.ownerId=ownerId;state.isOwner=ownerId===state.playerId;
  updateFurnitureControls();
}

function connectRoom(roomId,name,color) {
  if(state.socket)state.socket.close();
  state.roomId=roomId;state.name=name;state.color=color;state.players.clear();state.remoteAvatars.forEach((_,id)=>removeRemotePlayer(id));
  const scheme=location.protocol==='https:'?'wss:':'ws:';
  const socket=new WebSocket(scheme+'//'+location.host);state.socket=socket;
  connectionStatus.textContent='Connecting…';lobbyStatus.textContent='Connecting to the room server…';
  socket.addEventListener('open',()=>{
    if(state.socket!==socket)return;
    socket.send(JSON.stringify({type:'dorm:join',roomId,name,color}));
  });
  socket.addEventListener('message',event=>{
    if(state.socket!==socket)return;
    let message;try{message=JSON.parse(event.data);}catch(error){return;}
    if(message.type==='dorm:error') {
      lobbyStatus.textContent=message.message||'Could not join this room.';
      connectionStatus.textContent='Not connected';
      return;
    }
    if(message.type==='dorm:sync') {
      state.roomId=message.roomId;state.playerId=message.playerId||'';
      const current=message.players?.find(player=>player.id===state.playerId);
      if(!current){lobbyStatus.textContent='The room could not assign your player. Try again.';return;}
      setAvatarIdentity(localAvatar,name,color);
      localAvatar.position.set(Number(current.x)||0,0,Number(current.z)||0);localAvatar.rotation.y=Number(current.yaw)||0;
      state.layout=Array.isArray(message.layout)?message.layout:[];
      state.players.clear();state.remoteAvatars.forEach((_,id)=>removeRemotePlayer(id));state.players.set(current.id,current);
      for(const player of message.players||[])if(player.id!==current.id)updateRemotePlayer(player);
      setOwner(message.ownerId);renderLayout();
      roomCodeLabel.textContent=state.roomId.toUpperCase();roomCodeInput.value=state.roomId;
      roomLobby.hidden=true;shareButton.disabled=false;connectionStatus.textContent=state.isOwner?'Room owner · online':'Connected · online';
      lobbyStatus.textContent='Joined room '+state.roomId+'.';history.replaceState(null,'','?room='+encodeURIComponent(state.roomId));
      computerHint.hidden=false;updatePlayerList();
      return;
    }
    if(message.type==='dorm:player-joined'){updateRemotePlayer(message.player);return;}
    if(message.type==='dorm:player-state'){updateRemotePlayer(message.player);return;}
    if(message.type==='dorm:player-left'){removeRemotePlayer(message.id);return;}
    if(message.type==='dorm:owner'){setOwner(message.ownerId);connectionStatus.textContent=state.isOwner?'Room owner · online':'Connected · online';drawComputer();return;}
    if(message.type==='dorm:layout'){if(Array.isArray(message.layout)){state.layout=message.layout;renderLayout();}}
  });
  socket.addEventListener('close',()=>{
    if(state.socket!==socket)return;
    if(state.usingComputer)leaveComputerMode();
    connectionStatus.textContent='Disconnected';
    if(!roomLobby.hidden){lobbyStatus.textContent='Room server connection closed. Make sure the Sektor server is running.';return;}
    roomLobby.hidden=false;lobbyStatus.textContent='Connection to the dorm room was lost. Rejoin to continue.';shareButton.disabled=true;
  });
  socket.addEventListener('error',()=>{
    if(state.socket===socket)lobbyStatus.textContent='Could not reach the room server on this port.';
  });
}

function createRoomCode() {
  const bytes=crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes,byte=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[byte%32]).join('');
}
function joinFromForm(event,createNew=false) {
  event?.preventDefault();
  const name=$('playerName').value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,24);
  if(!name){lobbyStatus.textContent='Add a nickname first.';$('playerName').focus();return;}
  const roomId=createNew?createRoomCode():(roomCodeInput.value.trim()||createRoomCode()).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,32);
  if(roomId.length<4){lobbyStatus.textContent='Room codes need at least four characters.';return;}
  $('playerName').value=name;state.color=$('playerColor').value;
  localStorage.setItem('cozyDormProfile',JSON.stringify({name,color:state.color}));
  roomCodeInput.value=roomId;connectRoom(roomId,name,state.color);
}

function worldPoint(event) {
  if(document.pointerLockElement===canvas)pointer.set(0,0);
  else{
    const bounds=canvas.getBoundingClientRect();pointer.x=(event.clientX-bounds.left)/bounds.width*2-1;pointer.y=-(event.clientY-bounds.top)/bounds.height*2+1;
  }
  raycaster.setFromCamera(pointer,camera);
}
function furnitureGroupFromObject(object) {
  let current=object;
  while(current&&current!==roomGroup){if(current.userData?.dormItem)return current;current=current.parent;}
  return null;
}
function openComputerApp(appId) {
  const path=appId==='sektor'?'./VUS-Servers.html':'./retro-sketch.html';
  computerAppWindow.hidden=false;
  computerAppWindow.setAttribute('aria-hidden','false');
  state.computerScreen.visible=false;
  if(computerAppFrame.getAttribute('src')!==path)computerAppFrame.src=path;
}
function closeComputerApp() {
  computerAppWindow.hidden=true;
  computerAppWindow.setAttribute('aria-hidden','true');
  state.computerScreen.visible=true;
  computerAppFrame.src='about:blank';
}
function enterComputerMode() {
  if(state.usingComputer)return;
  state.returnFromComputer={
    x:localAvatar.position.x,z:localAvatar.position.z,yaw:state.yaw,pitch:state.pitch,
  };
  if(document.pointerLockElement)document.exitPointerLock();
  state.keys.clear();
  state.usingComputer=true;
  state.draggingItem=false;
  state.placingType='';
  localAvatar.position.set(0,0,-3.15);
  state.yaw=0;state.pitch=0;localAvatar.rotation.y=0;
  computerModeBar.hidden=false;
  computerHint.hidden=false;
  updateFurnitureControls();
  if(state.computerApp==='sektor'||state.computerApp==='sketch')openComputerApp(state.computerApp);
  sendPlayerState();
}
function leaveComputerMode() {
  if(!state.usingComputer)return;
  const saved=state.returnFromComputer;
  if(saved){
    localAvatar.position.set(saved.x,0,saved.z);
    state.yaw=saved.yaw;state.pitch=saved.pitch;
    localAvatar.rotation.y=saved.yaw;
  }
  state.returnFromComputer=null;
  state.usingComputer=false;
  state.keys.clear();
  computerModeBar.hidden=true;
  closeComputerApp();
  updateFurnitureControls();
  sendPlayerState();
}
function selectComputerApp(appId) {
  state.computerApp=appId;
  if(appId==='sektor'||appId==='sketch'){
    enterComputerMode();
    openComputerApp(appId);
  }
  else closeComputerApp();
  computerHint.hidden=false;
  drawComputer();
}
function handleWorldClick(event) {
  if(roomLobby.hidden===false||state.draggingItem||state.usingComputer)return;
  if(state.suppressClick){state.suppressClick=false;return;}
  worldPoint(event);
  const screenHit=raycaster.intersectObject(state.computerScreen,false)[0];
  const monitorHit=raycaster.intersectObject(state.computerMonitor,false)[0];
  if(screenHit||monitorHit) {
    enterComputerMode();
    if(screenHit?.uv) {
    const screenX=screenHit.uv.x*state.screenCanvas.width;
    const screenY=(1-screenHit.uv.y)*state.screenCanvas.height;
    if(screenY<82) {
      const tab=Math.min(computerApps.length-1,Math.floor(screenX/(state.screenCanvas.width/computerApps.length)));
      selectComputerApp(computerApps[tab].id);
    }
    }
    computerHint.hidden=false;
    return;
  }
  const intersects=raycaster.intersectObjects(roomGroup.children,true);
  const hit=intersects[0]?.object;
  if(state.placingType) {
    const floorHit=raycaster.intersectObject(state.floor)[0];
    if(!floorHit)return;
    const item={id:crypto.randomUUID(),type:state.placingType,x:Math.max(-4.5,Math.min(4.5,snap(floorHit.point.x))),z:Math.max(-4.5,Math.min(4.5,snap(floorHit.point.z))),rotation:0};
    state.layout.push(item);const group=createFurniture(item);roomGroup.add(group);state.roomItems.set(item.id,group);state.placingType='';selectItem(item.id);saveLayout();return;
  }
  const group=furnitureGroupFromObject(hit);
  if(group){selectItem(group.userData.dormItem.id);return;}
  selectItem(null);
  if(!document.pointerLockElement&&typeof canvas.requestPointerLock==='function'){
    try{
      const request=canvas.requestPointerLock();
      request?.catch(error=>{console.warn('Could not lock the Dorm view to the pointer.',error);connectionStatus.textContent='Click-to-look is unavailable in this browser.';});
    }catch(error){console.warn('Could not lock the Dorm view to the pointer.',error);connectionStatus.textContent='Click-to-look is unavailable in this browser.';}
  }
}
function handlePointerDown(event) {
  if(!roomLobby.hidden||event.button!==0||state.usingComputer||document.pointerLockElement)return;
  state.suppressClick=false;
  if(state.isOwner) {
    worldPoint(event);
    const hits=raycaster.intersectObjects(Array.from(state.roomItems.values()),true);
    const group=hits.length?furnitureGroupFromObject(hits[0].object):null;
    if(group) {
      selectItem(group.userData.dormItem.id);state.draggingItem=true;canvas.setPointerCapture(event.pointerId);event.preventDefault();return;
    }
  }
}
function moveFurnitureFromPointer(event) {
  if(!state.draggingItem||!state.selectedItem)return;
  state.suppressClick=true;
  worldPoint(event);const hit=raycaster.intersectObject(state.floor)[0];if(!hit)return;
  const group=state.roomItems.get(state.selectedItem);if(!group)return;
  group.position.x=Math.max(-4.5,Math.min(4.5,snap(hit.point.x)));
  group.position.z=Math.max(-4.5,Math.min(4.5,snap(hit.point.z)));
}
function lookFromPointer(event) {
  if(document.pointerLockElement!==canvas||state.usingComputer)return;
  state.yaw-=event.movementX*.003;
  state.pitch=Math.max(-1.15,Math.min(1.15,state.pitch-event.movementY*.003));
  localAvatar.rotation.y=state.yaw;
  sendPlayerState();
}
function sendPlayerState() {
  const socket=state.socket,now=performance.now();
  if(!socket||socket.readyState!==WebSocket.OPEN||now-state.lastStateAt<50)return;
  state.lastStateAt=now;socket.send(JSON.stringify({type:'dorm:state',state:{x:localAvatar.position.x,z:localAvatar.position.z,yaw:localAvatar.rotation.y}}));
}
function movePlayer(delta) {
  if(!state.roomId||state.draggingItem||state.usingComputer)return;
  const forward=(state.keys.has('KeyW')||state.keys.has('ArrowUp')?1:0)-(state.keys.has('KeyS')||state.keys.has('ArrowDown')?1:0);
  const side=(state.keys.has('KeyD')||state.keys.has('ArrowRight')?1:0)-(state.keys.has('KeyA')||state.keys.has('ArrowLeft')?1:0);
  if(!forward&&!side)return;
  const speed=(state.keys.has('ShiftLeft')||state.keys.has('ShiftRight')?4.4:2.5)*delta;
  const length=Math.hypot(forward,side)||1;
  localAvatar.position.x+=((side*Math.cos(state.yaw)-forward*Math.sin(state.yaw))/length)*speed;
  localAvatar.position.z+=((-side*Math.sin(state.yaw)-forward*Math.cos(state.yaw))/length)*speed;
  localAvatar.position.x=Math.max(-4,Math.min(4,localAvatar.position.x));
  localAvatar.position.z=Math.max(-4,Math.min(4,localAvatar.position.z));
  localAvatar.rotation.y=state.yaw;
  sendPlayerState();
}
function animateDust(delta) {
  const positions=state.dust.geometry.attributes.position.array;
  for(let i=1;i<positions.length;i+=3){positions[i]-=delta*.035;if(positions[i]<.08)positions[i]=4.6;}
  state.dust.geometry.attributes.position.needsUpdate=true;
}
function updateComputer(delta) {
  if(state.computerApp==='arcade') {
    const ball=state.ball;
    ball.x+=ball.vx*delta*60;ball.y+=ball.vy*delta*60;
    state.leftPaddleY+=(ball.y-state.leftPaddleY)*Math.min(1,delta*1.8);
    state.rightPaddleY+=(ball.y-state.rightPaddleY)*Math.min(1,delta*2.8);
    if(ball.y<.18){ball.y=.18;ball.vy=Math.abs(ball.vy);}
    else if(ball.y>.82){ball.y=.82;ball.vy=-Math.abs(ball.vy);}
    if(ball.vx<0&&ball.x<=.12) {
      ball.x=.12;
      if(Math.abs(ball.y-state.leftPaddleY)<.13){ball.vx=Math.abs(ball.vx);state.arcadeScore++;}
      else {ball.x=.5;ball.y=.5;ball.vx=Math.abs(ball.vx);ball.vy=-ball.vy;}
    } else if(ball.vx>0&&ball.x>=.88) {
      ball.x=.88;
      if(Math.abs(ball.y-state.rightPaddleY)<.13){ball.vx=-Math.abs(ball.vx);state.arcadeScore++;}
      else {ball.x=.5;ball.y=.5;ball.vx=-Math.abs(ball.vx);ball.vy=-ball.vy;}
    }
  }
  state.computerDrawElapsed+=delta;
  if(state.computerDrawElapsed>=.08){state.computerDrawElapsed=0;drawComputer();}
}
function formatRadioTime(seconds){
  if(!Number.isFinite(seconds))return'--:--';
  return`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
}
function setRadioTrack(index,autoplay=false){
  const track=state.radioTracks[index];
  if(!track)return;
  state.radioTrackIndex=index;
  radioTrackSelect.value=String(index);
  radioAudio.src=track.url;
  radioAudio.load();
  radioStatus.textContent=`Ready · ${track.name} · only you can hear it`;
  $('radioPlay').textContent='Play';
  drawComputer();
  if(autoplay)radioAudio.play().catch(error=>{
    console.warn('Could not play the selected radio track.',error);
    radioStatus.textContent='Could not play this file. Try another audio format.';
  });
}
function renderRadioPlaylist(){
  radioTrackSelect.replaceChildren();
  for(const [index,track]of state.radioTracks.entries()){
    const option=document.createElement('option');
    option.value=String(index);option.textContent=track.name;radioTrackSelect.append(option);
  }
  const hasTracks=state.radioTracks.length>0;
  radioTrackSelect.disabled=!hasTracks;
  $('radioPlay').disabled=!hasTracks;
  $('radioPrevious').disabled=!hasTracks;
  $('radioNext').disabled=!hasTracks;
  if(!hasTracks){
    const option=document.createElement('option');option.textContent='No local tracks loaded';radioTrackSelect.append(option);
    radioStatus.textContent='Choose audio files from this device. Playback is private to you.';
    state.radioTrackIndex=-1;
  }
}
function positionComputerApp(){
  if(computerAppWindow.hidden||!state.usingComputer)return;
  const bounds=canvas.getBoundingClientRect();
  const worldBounds=canvas.parentElement.getBoundingClientRect();
  const halfWidth=.74,halfHeight=.41;
  const corners=[
    new THREE.Vector3(-halfWidth,halfHeight,0),
    new THREE.Vector3(halfWidth,halfHeight,0),
    new THREE.Vector3(-halfWidth,-halfHeight,0),
    new THREE.Vector3(halfWidth,-halfHeight,0),
  ];
  for(const corner of corners){
    state.computerScreen.localToWorld(corner);
    corner.project(camera);
  }
  const xs=corners.map(point=>bounds.left-worldBounds.left+(point.x+1)*.5*bounds.width);
  const ys=corners.map(point=>bounds.top-worldBounds.top+(1-point.y)*.5*bounds.height);
  const left=Math.min(...xs),top=Math.min(...ys);
  computerAppWindow.style.left=`${left}px`;
  computerAppWindow.style.top=`${top}px`;
  computerAppWindow.style.width=`${Math.max(...xs)-left}px`;
  computerAppWindow.style.height=`${Math.max(...ys)-top}px`;
}
function animate() {
  if(state.disposed)return;
  const delta=Math.min(clock.getDelta(),.05);
  movePlayer(delta);animateDust(delta);updateComputer(delta);
  camera.position.set(localAvatar.position.x,1.62,localAvatar.position.z);
  camera.rotation.order='YXZ';
  camera.rotation.set(state.pitch,state.yaw,0);
  renderer.render(scene,camera);
  positionComputerApp();
}
function resize() {
  const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}

canvas.addEventListener('pointerdown',handlePointerDown);
canvas.addEventListener('pointermove',event=>{moveFurnitureFromPointer(event);lookFromPointer(event);});
const finishPointer=()=>{
  if(state.draggingItem){state.draggingItem=false;syncFurnitureFromScene();}
  state.lookDragging=false;state.lastLookPoint=null;
};
canvas.addEventListener('pointerup',finishPointer);
canvas.addEventListener('pointercancel',finishPointer);
canvas.addEventListener('click',handleWorldClick);
radioFileInput.addEventListener('change',()=>{
  const files=Array.from(radioFileInput.files||[]);
  const audioFiles=files.filter(file=>file.type.startsWith('audio/')||/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name));
  if(!audioFiles.length){
    radioStatus.textContent='Choose audio files such as MP3, WAV, OGG or M4A.';
    return;
  }
  radioAudio.pause();
  for(const track of state.radioTracks)URL.revokeObjectURL(track.url);
  state.radioTracks=audioFiles.map(file=>({name:file.name,url:URL.createObjectURL(file)}));
  renderRadioPlaylist();setRadioTrack(0);
  radioStatus.textContent=`Loaded ${audioFiles.length} local track${audioFiles.length===1?'':'s'} · only you can hear them`;
});
$('chooseRadioFiles').addEventListener('click',()=>radioFileInput.click());
radioTrackSelect.addEventListener('change',()=>setRadioTrack(Number(radioTrackSelect.value)));
$('radioPlay').addEventListener('click',()=>{
  if(radioAudio.paused){
    radioAudio.play().catch(error=>{
      console.warn('Could not play the selected radio track.',error);
      radioStatus.textContent='Could not play this file. Try another audio format.';
    });
  }else radioAudio.pause();
});
$('radioPrevious').addEventListener('click',()=>setRadioTrack((state.radioTrackIndex-1+state.radioTracks.length)%state.radioTracks.length,true));
$('radioNext').addEventListener('click',()=>setRadioTrack((state.radioTrackIndex+1)%state.radioTracks.length,true));
$('radioVolume').addEventListener('input',event=>{radioAudio.volume=Number(event.currentTarget.value);});
radioAudio.addEventListener('play',()=>{
  $('radioPlay').textContent='Pause';
  const track=state.radioTracks[state.radioTrackIndex];
  if(track)radioStatus.textContent=`Playing · ${track.name} · only you can hear it`;
  drawComputer();
});
radioAudio.addEventListener('pause',()=>{
  $('radioPlay').textContent='Play';
  drawComputer();
});
radioAudio.addEventListener('ended',()=>{
  if(state.radioTracks.length)setRadioTrack((state.radioTrackIndex+1)%state.radioTracks.length,true);
});
radioAudio.addEventListener('timeupdate',()=>{if(state.computerApp==='stream')drawComputer();});
radioAudio.addEventListener('error',()=>{
  if(radioAudio.currentSrc){
    console.warn('The selected radio file could not be decoded.',radioAudio.error);
    radioStatus.textContent='This audio file could not be played. Try a different file.';
  }
});
window.addEventListener('keydown',event=>{
  if(state.usingComputer)return;
  if(event.target instanceof HTMLElement&&event.target.closest('input,select,textarea,button'))return;
  if(event.key==='Escape'){state.placingType='';updateFurnitureControls();}
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(event.code)){state.keys.add(event.code);event.preventDefault();}
  if(event.code==='Delete'||event.code==='Backspace')deleteSelectedFurniture();
});
window.addEventListener('keyup',event=>state.keys.delete(event.code));
window.addEventListener('blur',()=>state.keys.clear());
document.addEventListener('pointerlockerror',()=>{
  connectionStatus.textContent='Could not capture the mouse. Click-to-look may be blocked by browser permissions.';
});
$('dormTheme').addEventListener('change',event=>applyDormTheme(event.currentTarget.value,true));
document.querySelectorAll('[data-move-code]').forEach(button=>{
  const code=button.dataset.moveCode;
  const release=()=>state.keys.delete(code);
  button.addEventListener('pointerdown',event=>{event.preventDefault();state.keys.add(code);button.setPointerCapture(event.pointerId);});
  button.addEventListener('pointerup',release);
  button.addEventListener('pointercancel',release);
  button.addEventListener('lostpointercapture',release);
});
window.addEventListener('resize',resize);
$('roomForm').addEventListener('submit',event=>joinFromForm(event,false));
$('createRoom').addEventListener('click',()=>joinFromForm(null,true));
shareButton.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);lobbyStatus.textContent='Invite link copied. Share it with your friends.';}
  catch(error){lobbyStatus.textContent='Copy this invite link: '+location.href;}
});
placeButton.addEventListener('click',()=>{state.placingType=furnitureType.value;selectItem(null);updateFurnitureControls();});
computerAppButtons.forEach(button=>button.addEventListener('click',()=>{
  selectComputerApp(button.dataset.computerApp);
}));
$('leaveComputer').addEventListener('click',leaveComputerMode);
rotateButton.addEventListener('click',()=>{
  const group=state.roomItems.get(state.selectedItem);if(!group)return;
  group.rotation.y=Math.round((group.rotation.y+Math.PI/12)/(Math.PI/12))*(Math.PI/12);syncFurnitureFromScene();
});
deleteButton.addEventListener('click',deleteSelectedFurniture);
function deleteSelectedFurniture() {
  if(!state.isOwner||!state.selectedItem)return;
  state.layout=state.layout.filter(item=>item.id!==state.selectedItem);
  const group=state.roomItems.get(state.selectedItem);
  if(group){group.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material?.map)object.material.map.dispose();if(object.material)object.material.dispose();});roomGroup.remove(group);state.roomItems.delete(state.selectedItem);}
  selectItem(null);saveLayout();
}
function init() {
  try{const profile=JSON.parse(localStorage.getItem('cozyDormProfile')||'{}');$('playerName').value=profile.name||'';$('playerColor').value=profile.color||'#ff8b79';}catch(error){console.warn('Could not load the saved dorm profile.',error);}
  try{state.themeId=localStorage.getItem('cozyDormTheme')||'sunset';}catch(error){console.warn('Could not load the saved Dorm theme.',error);}
  const room=new URLSearchParams(location.search).get('room');if(room)roomCodeInput.value=room;
  renderRadioPlaylist();makeRoom();resize();renderer.setAnimationLoop(animate);
  if(navigator.xr?.isSessionSupported) {
    navigator.xr.isSessionSupported('immersive-vr').then(supported=>{
      if(supported)$('enterXR').hidden=false;
    }).catch(error=>console.warn('Could not check VR support.',error));
    $('enterXR').addEventListener('click',async()=>{
      try {
        const session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor','hand-tracking']});
        await renderer.xr.setSession(session);
      } catch(error) {
        connectionStatus.textContent='Could not start VR: '+error.message;
      }
    });
  }
  updateFurnitureControls();
}

window.addEventListener('pagehide',()=>{
  state.disposed=true;state.socket?.close();radioAudio.pause();
  for(const track of state.radioTracks)URL.revokeObjectURL(track.url);
  renderer.setAnimationLoop(null);state.screenTexture?.dispose();renderer.dispose();
});
init();
