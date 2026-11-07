const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { randomUUID } = require('crypto');
const gardenSavePath = path.join(__dirname, '.gardenfall-saves.json');

const root = __dirname;
const port = process.env.PORT || 3000;
const rooms = new Map();
const dormRooms = new Map();
const dormFurnitureTypes = new Set(['bed', 'desk', 'chair', 'plant', 'lamp', 'shelf']);
const gardenRooms = new Map();
const gardenPlants = {
  sunflower:{cost:20,grow:25000,sell:38,kind:'crop',health:30,harvests:1},
  berry:{cost:15,grow:18000,sell:27,kind:'crop',health:24,harvests:999999,regrow:12000,reusable:true},
  moonberry:{cost:34,grow:32000,sell:64,kind:'crop',health:40,harvests:999999,regrow:17000,reusable:true},
  starfruit:{cost:42,grow:38000,sell:78,kind:'crop',health:38,harvests:1},
  pumpkin:{cost:32,grow:33000,sell:52,kind:'crop',health:90,harvests:1},
  glowMushroom:{cost:28,grow:24000,sell:42,kind:'crop',health:28,harvests:999999,regrow:14000,reusable:true},
  bamboo:{cost:30,grow:22000,sell:6,kind:'part',health:35,part:'bamboo',harvests:999999,regrow:14000,reusable:true},
  reedTube:{cost:24,grow:18000,sell:4,kind:'part',health:28,part:'reed',harvests:999999,regrow:12000,reusable:true},
  magazineVine:{cost:38,grow:25000,sell:8,kind:'part',health:35,part:'magazine',harvests:999999,regrow:15000,reusable:true},
  pumpkinShell:{cost:31,grow:27000,sell:6,kind:'part',health:45,part:'shell',harvests:999999,regrow:16000,reusable:true},
  blastCorn:{cost:45,grow:28000,sell:10,kind:'part',health:40,part:'blastCorn',harvests:999999,regrow:17000,reusable:true},
  pollenPod:{cost:37,grow:26000,sell:6,kind:'part',health:32,part:'pollen',harvests:999999,regrow:15000,reusable:true},
  triggerBloom:{cost:39,grow:25000,sell:7,kind:'part',health:34,part:'trigger',harvests:999999,regrow:15000,reusable:true},
  thornVine:{cost:34,grow:23000,sell:7,kind:'part',health:65,part:'grip',harvests:999999,regrow:14000,reusable:true},
  crystalBud:{cost:54,grow:36000,sell:12,kind:'part',health:35,part:'crystal',harvests:999999,regrow:20000,reusable:true},
  epicSoil:{cost:75,grow:28000,kind:'soil',health:100,harvests:999999},
  peashooter:{cost:55,grow:12000,kind:'defense',health:55,damage:8,range:7,rate:900,ammo:'peaBlaster',yield:10,harvests:999999,harvestCooldown:45000,reusable:true},
  cornzooka:{cost:95,grow:18000,kind:'defense',health:75,damage:24,range:8,rate:2600,ammo:'cornZooka',yield:2,blast:2,harvests:999999,harvestCooldown:60000,reusable:true},
  thornGuard:{cost:64,grow:26000,kind:'defense',health:220,damage:0,range:0,rate:0,harvests:999999},
};
const gardenGear={wateringCan:20,shovel:25,trowel:25,sprinkler:45,fertilizer:30};
const gardenLands=[
  {id:'common',name:'Common',cost:0,multiplier:1},
  {id:'uncommon',name:'Uncommon',cost:100,multiplier:1.25},
  {id:'rare',name:'Rare',cost:300,multiplier:1.6},
  {id:'epic',name:'Epic',cost:750,multiplier:2.1},
  {id:'legendary',name:'Legendary',cost:1600,multiplier:3},
];
const gardenGrid={columns:6,rows:4};
const gardenCycle={day:20*60*1000,night:2*60*1000};
let nextPublicGarden=1;
let gardenSaveBusy=false;
let gardenSaveRequested=false;

function gardenPlayerView(player) {
  return {
    id:player.id,clientId:player.clientId,name:player.name,color:player.color,x:player.x,z:player.z,
    coins:player.coins,seeds:player.seeds,goods:player.goods,parts:player.parts,gear:player.gear,
    ammo:player.ammo,magazines:player.magazines,weapons:player.weapons,customGuns:player.customGuns,weapon:player.weapon,
    kills:player.kills,wateringCanCharges:player.wateringCanCharges,
    landTier:player.landTier||'common',
  };
}

function gardenSnapshot(room) {
  const now=Date.now();
  const cycleElapsed=(now-room.cycleStart)% (gardenCycle.day+gardenCycle.night);
  return {
    type:'garden:sync',roomId:room.id,mode:room.mode,day:room.day,
    phase:cycleElapsed>=gardenCycle.day?'night':'day',
    phaseRemaining:cycleElapsed>=gardenCycle.day?gardenCycle.day+gardenCycle.night-cycleElapsed:gardenCycle.day-cycleElapsed,
    gardenHealth:room.gardenHealth,weather:room.weather,weatherRemaining:Math.max(0,room.nextWeatherAt-now),
    players:Array.from(room.players.values(),gardenPlayerView),
    plants:Array.from(room.plants.values()),
    zombies:Array.from(room.zombies.values()),
    sprinklers:Array.from(room.sprinklers),
    soil:Array.from(room.soil),
    ponds:room.ponds,
  };
}

function gardenSendError(socket,message) {
  sendJson(socket,{type:'garden:error',message});
}

function gardenBroadcast(room) {
  const snapshot=gardenSnapshot(room);
  for(const player of room.players.values())sendJson(player.socket,snapshot);
}

function createGardenRoom(id,mode) {
  const now=Date.now();
  return {
    id,mode,players:new Map(),savedPlayers:new Map(),plants:new Map(),zombies:new Map(),
    sprinklers:new Set(),soil:new Set(),ponds:[{x:-7,z:7},{x:7,z:7}],
    createdAt:now,cycleStart:now,day:1,gardenHealth:100,lastSpawn:now,nextZombie:1,
    weather:'clear',nextWeatherAt:now+45000,lastBroadcast:0,lastActivity:now,lastTick:now,
  };
}

function removeGardenPlayer(socket) {
  const session=socket.gardenSession;
  if(!session)return;
  socket.gardenSession=null;
  const room=gardenRooms.get(session.roomId);
  if(!room)return;
  const player=room.players.get(session.playerId);
  if(player?.clientId&&room.mode==='private')room.savedPlayers.set(player.clientId,gardenPersistentPlayer(player));
  room.players.delete(session.playerId);
  room.lastActivity=Date.now();
  gardenSaveRequested=true;
  if(room.players.size===0&&room.mode==='public')gardenRooms.delete(room.id);
  else gardenBroadcast(room);
}

function gardenPersistentPlayer(player) {
  const {socket,lastActions,lastMove,lastShot,...saved}=player;
  return saved;
}

function gardenPersistedRoom(room) {
  const players=Object.fromEntries(room.savedPlayers);
  for(const player of room.players.values())players[player.clientId]=gardenPersistentPlayer(player);
  return {
    id:room.id,cycleStart:room.cycleStart,day:room.day,gardenHealth:room.gardenHealth,
    nextZombie:room.nextZombie,weather:room.weather,nextWeatherAt:room.nextWeatherAt,
    plants:Array.from(room.plants.values()),sprinklers:Array.from(room.sprinklers),
    soil:Array.from(room.soil),players,
  };
}

function restoreGardenRoom(record) {
  if(!record||typeof record!=='object'||!/^\d{5}$/.test(String(record.id||'')))return null;
  const room=createGardenRoom(String(record.id),'private');
  room.cycleStart=Number(record.cycleStart)||room.cycleStart;
  room.day=Math.max(1,Math.floor(Number(record.day)||1));
  room.gardenHealth=Math.max(0,Math.min(100,Number(record.gardenHealth)||100));
  room.nextZombie=Math.max(1,Math.floor(Number(record.nextZombie)||1));
  room.weather=['clear','rain','aurora','solarFlare','fireworks'].includes(record.weather)?record.weather:'clear';
  room.nextWeatherAt=Math.max(Date.now(),Number(record.nextWeatherAt)||room.nextWeatherAt);
  for(const plant of Array.isArray(record.plants)?record.plants:[]){
    if(!gardenPlants[plant?.type]||!gardenTile({col:plant.col,row:plant.row}))continue;
    room.plants.set(`${plant.col}:${plant.row}`,{
      ...plant,health:Math.max(1,Number(plant.health)||1),harvestsLeft:Math.max(1,Number(plant.harvestsLeft)||1),
      ownerId:String(plant.ownerId||''),reusable:!!gardenPlants[plant.type].reusable,
      fruitSize:Math.max(1,Number(plant.fruitSize)||1),
    });
  }
  for(const key of Array.isArray(record.sprinklers)?record.sprinklers:[])if(/^[0-5]:[0-3]$/.test(key))room.sprinklers.add(key);
  for(const key of Array.isArray(record.soil)?record.soil:[])if(/^[0-5]:[0-3]$/.test(key))room.soil.add(key);
  if(record.players&&typeof record.players==='object'&&!Array.isArray(record.players)){
    for(const [clientId,player]of Object.entries(record.players)){
      if(/^[\w-]{8,64}$/.test(clientId)&&player&&typeof player==='object')room.savedPlayers.set(clientId,player);
    }
  }
  room.lastActivity=Date.now();
  return room;
}

async function loadGardenSaves() {
  let contents;
  try {contents=await fs.promises.readFile(gardenSavePath,'utf8');}
  catch(error) {
    if(error.code==='ENOENT')return;
    throw new Error('Could not load saved Gardenfall gardens: '+error.message);
  }
  let parsed;
  try {parsed=JSON.parse(contents);}
  catch(error) {throw new Error('Saved Gardenfall data is invalid JSON: '+error.message);}
  if(!Array.isArray(parsed))throw new Error('Saved Gardenfall data must be a garden list.');
  for(const record of parsed){
    const room=restoreGardenRoom(record);
    if(room)gardenRooms.set(room.id,room);
  }
}

async function saveGardenSaves() {
  if(gardenSaveBusy||!gardenSaveRequested)return;
  gardenSaveBusy=true;gardenSaveRequested=false;
  try {
    const data=JSON.stringify(Array.from(gardenRooms.values())
      .filter(room=>room.mode==='private')
      .map(gardenPersistedRoom));
    const temporaryPath=gardenSavePath+'.tmp';
    await fs.promises.writeFile(temporaryPath,data);
    await fs.promises.rename(temporaryPath,gardenSavePath);
  } catch(error) {
    gardenSaveRequested=true;
    console.error('Could not save Gardenfall gardens:',error);
  } finally {
    gardenSaveBusy=false;
  }
}

function gardenRoomForSocket(socket) {
  const session=socket.gardenSession;
  const room=session&&gardenRooms.get(session.roomId);
  return room&&room.players.get(session.playerId)?room:null;
}

function gardenTile(value) {
  if(!value||!Number.isInteger(value.col)||!Number.isInteger(value.row)||value.col<0||value.col>=gardenGrid.columns||value.row<0||value.row>=gardenGrid.rows)return null;
  return {col:value.col,row:value.row,x:-4.5+value.col*1.8,z:-2.7+value.row*1.8};
}

function gardenDamageZombie(room,zombie,damage,player) {
  zombie.health-=damage;
  if(zombie.health>0)return;
  room.zombies.delete(zombie.id);
  if(player){player.coins+=8;player.kills++;}
}

function handleGardenJoin(socket,message) {
  removeGardenPlayer(socket);
  const name=String(message.name||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,20);
  if(!name){gardenSendError(socket,'Choose a player name first.');return;}
  const requestedClientId=String(message.clientId||'');
  const clientId=/^[\w-]{8,64}$/.test(requestedClientId)?requestedClientId:randomUUID();
  let room;
  let roomId='';
  let mode=String(message.mode||'');
  if(mode==='public') {
    room=Array.from(gardenRooms.values()).find(candidate=>candidate.mode==='public'&&candidate.players.size<8);
    if(!room){roomId='garden-public-'+nextPublicGarden++;room=createGardenRoom(roomId,'public');gardenRooms.set(roomId,room);}
  } else if(mode==='private-create') {
    for(let attempt=0;attempt<30;attempt++) {
      roomId=String(Math.floor(10000+Math.random()*90000));
      if(!gardenRooms.has(roomId))break;
    }
    if(gardenRooms.has(roomId)){gardenSendError(socket,'Could not create a private garden. Try again.');return;}
    room=createGardenRoom(roomId,'private');gardenRooms.set(roomId,room);
  } else if(mode==='private-join') {
    roomId=String(message.roomId||'').trim();
    if(!/^\d{5}$/.test(roomId)){gardenSendError(socket,'Private garden codes must be exactly five digits.');return;}
    room=gardenRooms.get(roomId);
    if(!room||room.mode!=='private'){gardenSendError(socket,'That private garden code was not found.');return;}
  } else {gardenSendError(socket,'Choose public matchmaking or a private garden.');return;}
  if(room.players.size>=8){gardenSendError(socket,'This garden is full (8 players maximum).');return;}
  const saved=room.mode==='private'?room.savedPlayers.get(clientId):null;
  const id=saved?.id||randomUUID();
  room.savedPlayers.delete(clientId);
  const player={
    ...saved,id,clientId,name,color:typeof message.color==='string'&&/^#[0-9a-f]{6}$/i.test(message.color)?message.color:saved?.color||'#79d98a',
    x:Number.isFinite(Number(saved?.x))?Number(saved.x):((room.players.size%4-1.5)*1.1),z:Number.isFinite(Number(saved?.z))?Number(saved.z):4.7,
    coins:Math.max(0,Number.isFinite(Number(saved?.coins))?Number(saved.coins):100),seeds:saved?.seeds&&typeof saved.seeds==='object'?saved.seeds:{},
    goods:saved?.goods&&typeof saved.goods==='object'?saved.goods:{},
    parts:saved?.parts&&typeof saved.parts==='object'?saved.parts:{},
    gear:saved?.gear&&typeof saved.gear==='object'?saved.gear:{wateringCan:false,shovel:false,trowel:false,sprinkler:0,fertilizer:0},
    ammo:saved?.ammo&&typeof saved.ammo==='object'?saved.ammo:{peaBlaster:0,cornZooka:0},
    weapons:saved?.weapons&&typeof saved.weapons==='object'?saved.weapons:{peaBlaster:false,cornZooka:false},
    customGuns:Array.isArray(saved?.customGuns)?saved.customGuns:[],
    landTier:gardenLands.some(land=>land.id===saved?.landTier)?saved.landTier:'common',
    wateringCanCharges:Math.max(0,Math.min(5,Number(saved?.wateringCanCharges)||((saved?.gear?.wateringCan)?5:0))),
    kills:Math.max(0,Number(saved?.kills)||0),socket,lastActions:Object.create(null),lastMove:0,lastShot:0,
    weapon:saved?.weapon||'peaBlaster',
  };
  player.magazines={peaBlaster:0,cornZooka:0};
  for(const gun of player.customGuns)player.magazines[gun.id]=0;
  if(saved?.magazines&&typeof saved.magazines==='object'){
    for(const [weapon,capacity]of Object.entries({peaBlaster:10,cornZooka:2,...Object.fromEntries(player.customGuns.map(gun=>[gun.id,gun.capacity]))})){
      player.magazines[weapon]=Math.max(0,Math.min(capacity,Math.floor(Number(saved.magazines[weapon])||0)));
    }
  }
  room.players.set(id,player);
  room.lastActivity=Date.now();
  gardenSaveRequested=true;
  socket.gardenSession={roomId:room.id,playerId:id};
  const snapshot=gardenSnapshot(room);snapshot.playerId=id;sendJson(socket,snapshot);
}

function handleGardenAction(socket,message) {
  const room=gardenRoomForSocket(socket);
  if(!room){gardenSendError(socket,'Join a garden before playing.');return;}
  const player=room.players.get(socket.gardenSession.playerId);
  const now=Date.now();
  const action=String(message.action||'');
  if(now-(player.lastActions[action]||0)<70)return;
  player.lastActions[action]=now;
  room.lastActivity=now;
  if(action==='move') {
    if(now-player.lastMove<45)return;
    const x=Number(message.x),z=Number(message.z);
    if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>9||z<-9||z>9)return;
    player.x=x;player.z=z;player.lastMove=now;return;
  }
  if(action==='buy-seed') {
    const type=String(message.item||'');const definition=Object.prototype.hasOwnProperty.call(gardenPlants,type)?gardenPlants[type]:null;
    if(!definition){gardenSendError(socket,'That seed is not available.');return;}
    if(player.coins<definition.cost){gardenSendError(socket,'Not enough coins for those seeds.');return;}
    player.coins-=definition.cost;player.seeds[type]=(player.seeds[type]||0)+1;
  } else if(action==='buy-gear') {
    const type=String(message.item||''),cost=Object.prototype.hasOwnProperty.call(gardenGear,type)?gardenGear[type]:0;
    if(!cost){gardenSendError(socket,'That gear is not available.');return;}
    if(player.coins<cost){gardenSendError(socket,'Not enough coins for that gear.');return;}
    player.coins-=cost;
    if(type==='wateringCan'){player.gear[type]=true;player.wateringCanCharges=Math.max(player.wateringCanCharges||0,5);}
    else if(type==='shovel'||type==='trowel')player.gear[type]=true;
    else if(type==='sprinkler')player.gear.sprinkler++;
    else player.gear.fertilizer++;
  } else if(action==='buy-ammo') {
    const type=String(message.item||'');
    let weapon,quantity,cost,capacity=100;
    if(type==='peaBlaster'||type==='cornZooka'){
      if(!player.weapons[type]){gardenSendError(socket,'Harvest the matching defender plant to unlock its weapon first.');return;}
      weapon=type;quantity=type==='peaBlaster'?10:2;cost=type==='peaBlaster'?18:25;
    }else{
      const gun=player.customGuns.find(candidate=>candidate.id===type);
      if(!gun){gardenSendError(socket,'That custom weapon is not available.');return;}
      weapon=gun.id;quantity=gun.capacity;cost=gun.capacity*3;
    }
    if(player.coins<cost){gardenSendError(socket,'Not enough coins to buy that ammo.');return;}
    const current=Number(player.ammo[weapon])||0;
    if(current>=capacity){gardenSendError(socket,'That weapon is already fully stocked.');return;}
    player.coins-=cost;player.ammo[weapon]=Math.min(capacity,current+quantity);
  } else if(action==='buy-land') {
    const index=gardenLands.findIndex(land=>land.id===(player.landTier||'common'));
    const next=gardenLands[index+1],requested=String(message.item||'');
    if(!next||next.id!==requested){gardenSendError(socket,'You can only buy the next land tier.');return;}
    if(player.coins<next.cost){gardenSendError(socket,`You need ${next.cost} coins for ${next.name} land.`);return;}
    player.coins-=next.cost;player.landTier=next.id;
  } else if(action==='plant') {
    const type=String(message.item||''),definition=Object.prototype.hasOwnProperty.call(gardenPlants,type)?gardenPlants[type]:null,tile=gardenTile(message.tile);
    if(!definition||!tile||room.plants.has(`${tile.col}:${tile.row}`)){gardenSendError(socket,'Choose an empty garden plot and a valid seed.');return;}
    if(!(player.seeds[type]>0)){gardenSendError(socket,'Buy that seed before planting it.');return;}
    player.seeds[type]--;
    const soil=definition.kind==='soil';
    const boosted=Array.from(room.soil).some(key=>{
      const [col,row]=key.split(':').map(Number);
      return Math.abs(col-tile.col)<=1&&Math.abs(row-tile.row)<=1;
    });
    const land=gardenLands.find(item=>item.id===player.landTier)||gardenLands[0];
    const plant={id:randomUUID(),type,col:tile.col,row:tile.row,x:tile.x,z:tile.z,ownerId:player.id,plantedAt:now,matureAt:now+definition.grow*(boosted?.7:1),health:definition.health,lastAttack:0,harvestsLeft:definition.harvests,regrow:definition.regrow||0,reusable:!!definition.reusable,fruitSize:definition.kind==='crop'?land.multiplier:1,mutation:'',lastHarvest:0};
    room.plants.set(`${tile.col}:${tile.row}`,plant);
    if(soil)room.soil.add(`${tile.col}:${tile.row}`);
  } else if(action==='harvest') {
    const plant=room.plants.get(String(message.tile||''));
    if(!plant||plant.ownerId!==player.id){gardenSendError(socket,'You can harvest your own plants.');return;}
    if(now<plant.matureAt){gardenSendError(socket,'That plant is still growing.');return;}
    const definition=gardenPlants[plant.type];
    if(definition.kind==='crop'){
      const mutationMultiplier=plant.mutation==='aurora'?3:plant.mutation==='solarFlare'||plant.mutation==='fireworks'?2:1;
      player.goods[plant.type]=(player.goods[plant.type]||0)+Math.max(1,Math.floor(mutationMultiplier));
    }else if(definition.kind==='part'){
      player.parts[definition.part]=(player.parts[definition.part]||0)+1;
      player.goods[plant.type]=(player.goods[plant.type]||0)+1;
    }else if(definition.kind==='defense'){
      if(now-(plant.lastHarvest||0)<definition.harvestCooldown){gardenSendError(socket,'That defender needs time to regrow its ammo.');return;}
      player.ammo[definition.ammo]=Math.min(100,(player.ammo[definition.ammo]||0)+definition.yield);
      player.weapons[definition.ammo]=true;
      plant.lastHarvest=now;plant.matureAt=now+definition.harvestCooldown;
      gardenBroadcast(room);return;
    }else {gardenSendError(socket,'Epic soil cannot be harvested. Use your shovel to remove it.');return;}
    plant.harvestsLeft--;
    if(definition.reusable){plant.matureAt=now+(plant.regrow||definition.harvestCooldown||definition.grow);plant.plantedAt=now;plant.mutation='';}
    else if(plant.harvestsLeft>0){plant.matureAt=now+(plant.regrow||definition.grow);plant.plantedAt=now;plant.mutation='';}
    else {room.plants.delete(`${plant.col}:${plant.row}`);if(definition.kind==='soil')room.soil.delete(`${plant.col}:${plant.row}`);}
  } else if(action==='water') {
    const key=String(message.tile||''),plant=room.plants.get(key);
    if(!player.gear.wateringCan){gardenSendError(socket,'Buy a watering can from Gear first.');return;}
    if(!plant||plant.ownerId!==player.id){gardenSendError(socket,'Select one of your plants to water.');return;}
    if(!(player.wateringCanCharges>0)){gardenSendError(socket,'Your watering can is empty. Refill it at a pond or in the rain.');return;}
    player.wateringCanCharges--;
    plant.matureAt=Math.max(now,plant.matureAt-12000);
  } else if(action==='shovel') {
    const key=String(message.tile||''),plant=room.plants.get(key);
    if(!player.gear.shovel){gardenSendError(socket,'Buy a shovel from Gear first.');return;}
    if(!plant||plant.ownerId!==player.id){gardenSendError(socket,'Select one of your plants to remove.');return;}
    room.plants.delete(key);
    room.soil.delete(key);
  } else if(action==='sprinkler') {
    const tile=gardenTile(message.tile);
    if(!tile||room.sprinklers.has(`${tile.col}:${tile.row}`)){gardenSendError(socket,'Choose an empty tile for the sprinkler.');return;}
    if(!(player.gear.sprinkler>0)){gardenSendError(socket,'Buy a sprinkler from Gear first.');return;}
    room.sprinklers.add(`${tile.col}:${tile.row}`);player.gear.sprinkler--;
  } else if(action==='refill-water') {
    if(!player.gear.wateringCan){gardenSendError(socket,'Buy a watering can from Gear first.');return;}
    const atPond=room.ponds.some(pond=>Math.hypot(pond.x-player.x,pond.z-player.z)<=2.5);
    if(!atPond&&room.weather!=='rain'){gardenSendError(socket,'Stand by a pond or wait for rain to refill your watering can.');return;}
    player.wateringCanCharges=5;
  } else if(action==='move-plant') {
    const from=gardenTile(message.from),to=gardenTile(message.to);
    if(!player.gear.trowel){gardenSendError(socket,'Buy a trowel from Gear first.');return;}
    if(!from||!to||room.plants.has(`${to.col}:${to.row}`)){gardenSendError(socket,'Choose an empty destination plot.');return;}
    const plant=room.plants.get(`${from.col}:${from.row}`);
    if(!plant||plant.ownerId!==player.id){gardenSendError(socket,'You can move your own plants.');return;}
    room.plants.delete(`${from.col}:${from.row}`);
    room.plants.set(`${to.col}:${to.row}`,{...plant,col:to.col,row:to.row,x:to.x,z:to.z});
    if(room.soil.delete(`${from.col}:${from.row}`))room.soil.add(`${to.col}:${to.row}`);
  } else if(action==='sell') {
    const item=String(message.item||'');
    let earned=0;
    for(const [type,quantity]of Object.entries(player.goods)){
      if(item!=='all'&&item!==type)continue;
      const definition=gardenPlants[type];
      if(!definition||!['crop','part'].includes(definition.kind))continue;
      const available=Math.max(0,Math.floor(Number(quantity)||0));
      const amount=definition.kind==='part'?Math.min(available,Math.max(0,Number(player.parts[definition.part])||0)):available;
      if(!amount)continue;
      const land=gardenLands.find(candidate=>candidate.id===player.landTier)||gardenLands[0];
      earned+=Math.floor(amount*definition.sell*land.multiplier);
      delete player.goods[type];
      if(definition.kind==='part'&&definition.part)player.parts[definition.part]=Math.max(0,(player.parts[definition.part]||0)-amount);
    }
    if(!earned){gardenSendError(socket,'You have no harvested goods to sell.');return;}
    player.coins+=earned;
  } else if(action==='equip') {
    const weapon=String(message.item||'');
    if(!player.weapons[weapon]&&!player.customGuns.some(gun=>gun.id===weapon)){gardenSendError(socket,'You have not crafted that weapon yet.');return;}
    player.weapon=weapon;
  } else if(action==='reload') {
    const weapon=player.weapon,custom=player.customGuns.find(gun=>gun.id===weapon);
    if(!player.weapons[weapon]&&!custom){gardenSendError(socket,'Unlock or craft a weapon before reloading.');return;}
    const capacity=custom?.capacity||(weapon==='cornZooka'?2:10);
    const loaded=player.magazines[weapon]||0,reserve=player.ammo[weapon]||0;
    if(loaded>=capacity){gardenSendError(socket,'That magazine is already full.');return;}
    if(reserve<=0){gardenSendError(socket,'No reserve ammo. Harvest a defender plant or buy ammo from Gear.');return;}
    const amount=Math.min(capacity-loaded,reserve);
    player.magazines[weapon]=loaded+amount;player.ammo[weapon]=reserve-amount;
  } else if(action==='shoot') {
    if(now-player.lastShot<450)return;
    const weapon=player.weapon,custom=player.customGuns.find(gun=>gun.id===weapon);
    if(!player.weapons[weapon]&&!custom){gardenSendError(socket,'Unlock or craft a weapon before firing.');return;}
    const zombie=room.zombies.get(String(message.target||''));
    const range=custom?.range||(weapon==='cornZooka'?16:13);
    if(!zombie||Math.hypot(zombie.x-player.x,zombie.z-player.z)>range){gardenSendError(socket,'That zombie is out of range.');return;}
    if(!(player.magazines[weapon]>0)){gardenSendError(socket,'Your magazine is empty. Press R to reload.');return;}
    const damage=custom?.damage||(weapon==='cornZooka'?55:18);
    player.magazines[weapon]--;player.lastShot=now;
    if(custom?.blast||weapon==='cornZooka'){
      for(const nearby of Array.from(room.zombies.values())){
        if(Math.hypot(nearby.x-zombie.x,nearby.z-zombie.z)<(custom?.blast||2))gardenDamageZombie(room,nearby,damage,player);
      }
    }else gardenDamageZombie(room,zombie,damage,player);
  } else if(action==='craft') {
    const recipe=String(message.item||'');
    if(recipe==='customGun'){
      const requested=message.components;
      const base=String(message.base||'');
      const partIds=['bamboo','reed','magazine','blastCorn','shell','pollen','trigger','grip','crystal'];
      if(!['peaBlaster','cornZooka'].includes(base)||!player.weapons[base]){
        gardenSendError(socket,'Harvest a Pea Shooter or Rocket Corn plant to unlock its weapon as a crafting base.');return;
      }
      if(!Array.isArray(requested)||requested.length<1||requested.length>4||requested.some(part=>!partIds.includes(part))){
        gardenSendError(socket,'Choose one to four valid plant components for your custom gun.');return;
      }
      const counts=Object.create(null);
      for(const part of requested)counts[part]=(counts[part]||0)+1;
      if((player.gear.fertilizer||0)<1||Object.entries(counts).some(([part,count])=>(player.parts[part]||0)<count)){
        gardenSendError(socket,'You need all selected plant parts and one fertilizer.');return;
      }
      for(const [part,count]of Object.entries(counts)){
        player.parts[part]-=count;
        const plantType=Object.keys(gardenPlants).find(type=>gardenPlants[type].part===part);
        if(plantType)player.goods[plantType]=Math.max(0,(player.goods[plantType]||0)-count);
      }
      player.gear.fertilizer--;
      const baseDamage=base==='cornZooka'?55:18;
      const damage=Math.min(90,baseDamage+(counts.blastCorn||0)*12+(counts.crystal||0)*17+(counts.trigger||0)*12+(counts.pollen||0)*8);
      const gun={id:`custom-${randomUUID()}`,name:`${requested.map(part=>part[0].toUpperCase()+part.slice(1)).join(' ')} Blaster`,
        base,damage,range:(base==='cornZooka'?16:13)+(counts.reed||0)*2+(counts.crystal||0)*2,
        blast:base==='cornZooka'?2+(counts.blastCorn||0):counts.blastCorn?2.5+counts.blastCorn:0,
        capacity:Math.min(20,(base==='cornZooka'?2:10)+(counts.magazine||0)*4+(counts.shell||0)*2),components:requested};
      player.customGuns.push(gun);player.magazines[gun.id]=gun.capacity;player.ammo[gun.id]=0;player.weapon=gun.id;
      gardenBroadcast(room);return;
    }
    gardenSendError(socket,'Harvest a Pea Shooter or Rocket Corn plant to unlock that weapon. Use its weapon as the base for custom crafting.');
    return;
  } else {gardenSendError(socket,'Unknown garden action.');return;}
  gardenBroadcast(room);
}

function tickGardenRooms() {
  const now=Date.now();
  for(const room of gardenRooms.values()) {
    const offline=room.players.size===0;
    if(offline&&room.mode==='public')continue;
    const cycleLength=gardenCycle.day+gardenCycle.night;
    if(now-room.cycleStart>=cycleLength) {
      const cycles=Math.floor((now-room.cycleStart)/cycleLength);
      room.cycleStart+=cycles*cycleLength;room.day+=cycles;
    }
    const elapsed=now-room.cycleStart;
    const isNight=elapsed>=gardenCycle.day;
    const delta=Math.min(1000,Math.max(0,now-(room.lastTick||now)));
    room.lastTick=now;
    if(now>=room.nextWeatherAt) {
      const previous=room.weather;
      room.weather=['clear','rain','aurora','solarFlare','fireworks'][Math.floor(Math.random()*5)];
      room.nextWeatherAt=now+45000;
      if(room.weather!==previous&&['aurora','solarFlare','fireworks'].includes(room.weather)) {
        const candidates=Array.from(room.plants.values()).filter(plant=>plant.matureAt>now&&plant.mutation==='');
        for(const plant of candidates)if(Math.random()<.45)plant.mutation=room.weather;
      }
      gardenSaveRequested=true;
    }
    if(offline) {
      for(const plant of room.plants.values())if(now<plant.matureAt&&room.weather==='rain')plant.matureAt-=delta*.5;
      if(now-room.lastBroadcast>=15000){gardenSaveRequested=true;room.lastBroadcast=now;}
      continue;
    }
    if(isNight&&now-room.lastSpawn>=7000&&room.zombies.size<24) {
      room.zombies.set(`z${room.nextZombie++}`,{id:`z${room.nextZombie-1}`,x:(Math.random()-.5)*8,z:-6.3,health:40,speed:.28+Math.random()*.12});
      room.lastSpawn=now;
    }
    for(const plant of room.plants.values()) {
      if(now<plant.matureAt&&room.weather==='rain')plant.matureAt-=delta*.5;
      if(now<plant.matureAt&&Array.from(room.sprinklers).some(key=>{
        const [col,row]=key.split(':').map(Number);
        return Math.abs(col-plant.col)<=1&&Math.abs(row-plant.row)<=1;
      }))plant.matureAt-=delta;
      const definition=gardenPlants[plant.type];
      if(definition.kind!=='defense'||!isNight||now-plant.lastAttack<definition.rate)continue;
      const target=Array.from(room.zombies.values()).filter(zombie=>Math.hypot(zombie.x-plant.x,zombie.z-plant.z)<=definition.range).sort((a,b)=>Math.hypot(a.x-plant.x,a.z-plant.z)-Math.hypot(b.x-plant.x,b.z-plant.z))[0];
      if(target){plant.lastAttack=now;gardenDamageZombie(room,target,definition.damage,room.players.get(plant.ownerId));}
    }
    if(isNight)for(const zombie of room.zombies.values()) {
      const target=Array.from(room.plants.values()).sort((a,b)=>Math.hypot(zombie.x-a.x,zombie.z-a.z)-Math.hypot(zombie.x-b.x,zombie.z-b.z))[0];
      if(target&&Math.hypot(zombie.x-target.x,zombie.z-target.z)<.65) {
        target.health-=delta*.006;
        if(target.health<=0){const key=`${target.col}:${target.row}`;room.plants.delete(key);room.soil.delete(key);}
      } else if(target) {
        const distance=Math.hypot(target.x-zombie.x,target.z-zombie.z)||1;
        zombie.x+=(target.x-zombie.x)/distance*zombie.speed*delta/1000;
        zombie.z+=(target.z-zombie.z)/distance*zombie.speed*delta/1000;
      } else if(zombie.z<3.6)zombie.z+=zombie.speed*delta/1000;
      else {room.gardenHealth=Math.max(0,room.gardenHealth-delta*.002);zombie.z=3.55;}
    }
    if(now-room.lastBroadcast>=400) {gardenBroadcast(room);room.lastBroadcast=now;gardenSaveRequested=true;}
  }
}

setInterval(tickGardenRooms,250).unref();
setInterval(saveGardenSaves,3000).unref();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { players: new Map() });
  }
  return rooms.get(roomId);
}

function sendJson(socket, payload) {
  if (socket.readyState === 1) socket.send(JSON.stringify(payload));
}

function broadcast(room, payload) {
  for (const player of room.players.values()) {
    sendJson(player.socket, payload);
  }
}

function dormPlayerView(player) {
  return { id:player.id,name:player.name,color:player.color,x:player.x,z:player.z,yaw:player.yaw };
}

function dormSnapshot(roomId, room) {
  return {
    type:'dorm:sync',
    roomId,
    ownerId:room.ownerId,
    layout:room.layout,
    players:Array.from(room.players.values(),dormPlayerView),
  };
}

function removeDormPlayer(socket) {
  const session=socket.dormSession;
  if(!session)return;
  const room=dormRooms.get(session.roomId);
  socket.dormSession=null;
  if(!room)return;
  room.players.delete(session.playerId);
  if(room.ownerId===session.playerId)room.ownerId=room.players.keys().next().value||'';
  for(const player of room.players.values()) {
    sendJson(player.socket,{type:'dorm:player-left',id:session.playerId});
    sendJson(player.socket,{type:'dorm:owner',ownerId:room.ownerId});
  }
}

function normalizeDormLayout(value) {
  if(!Array.isArray(value)||value.length>80)return null;
  const items=[];
  for(const item of value) {
    if(!item||typeof item!=='object'||!dormFurnitureTypes.has(item.type)||typeof item.id!=='string'||!/^[\w-]{1,64}$/.test(item.id))return null;
    const x=Number(item.x),z=Number(item.z),rotation=Number(item.rotation);
    if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(rotation)||Math.abs(x)>4.5||Math.abs(z)>4.5)return null;
    items.push({id:item.id,type:item.type,x:Math.round(x*4)/4,z:Math.round(z*4)/4,rotation:Math.round(rotation/(Math.PI/12))*(Math.PI/12)});
  }
  return items;
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

const server = http.createServer((req, res) => {
  const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (req.method === 'GET' && reqPath === '/api/music') {
    const musicDirectory = path.join(root, 'rally songs');
    fs.readdir(musicDirectory, (error, files) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Could not load the rally playlist.' }));
        return;
      }

      const tracks = files
        .filter((file) => /\.(mp3|wav|ogg)$/i.test(file))
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ name, url: `/rally%20songs/${encodeURIComponent(name)}` }));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(tracks));
    });
    return;
  }

  const safePath = reqPath === '/' ? '/rally.html' : reqPath;
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, maxPayload:64*1024 });

wss.on('connection', (socket) => {
  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch (error) {
      return;
    }

    if(message.type==='garden:join') {
      handleGardenJoin(socket,message);
      return;
    }

    if(message.type==='garden:action') {
      handleGardenAction(socket,message);
      return;
    }

    if(message.type==='dorm:join') {
      removeDormPlayer(socket);
      const roomId=String(message.roomId||'').trim();
      const name=String(message.name||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24);
      if(!/^[a-zA-Z0-9_-]{4,32}$/.test(roomId)||!name) {
        sendJson(socket,{type:'dorm:error',message:'Enter a valid room code and player name.'});
        return;
      }
      let room=dormRooms.get(roomId);
      if(!room){room={ownerId:'',players:new Map(),layout:[]};dormRooms.set(roomId,room);}
      if(room.players.size>=8) {
        sendJson(socket,{type:'dorm:error',message:'This room is full (8 players maximum).'});
        return;
      }
      const color=typeof message.color==='string'&&/^#[0-9a-f]{6}$/i.test(message.color)?message.color:'#ff8b79';
      const seat=room.players.size;
      const player={id:randomUUID(),name,color,x:seat===0?0:(seat%2?-1:1)*1.2,z:2.6+Math.floor(seat/3)*.65,yaw:0,socket,lastStateAt:0};
      if(!room.ownerId)room.ownerId=player.id;
      room.players.set(player.id,player);
      socket.dormSession={roomId,playerId:player.id};
      const snapshot=dormSnapshot(roomId,room);snapshot.playerId=player.id;sendJson(socket,snapshot);
      for(const other of room.players.values()) {
        if(other.id!==player.id)sendJson(other.socket,{type:'dorm:player-joined',player:dormPlayerView(player)});
      }
      return;
    }

    if(message.type==='dorm:state') {
      const session=socket.dormSession;
      const room=session&&dormRooms.get(session.roomId);
      const player=room?.players.get(session.playerId);
      const state=message.state;
      if(!player||!state||typeof state!=='object'||Date.now()-player.lastStateAt<40)return;
      const x=Number(state.x),z=Number(state.z),yaw=Number(state.yaw);
      if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(yaw)||Math.abs(x)>4.5||Math.abs(z)>4.5)return;
      player.x=x;player.z=z;player.yaw=yaw;player.lastStateAt=Date.now();
      const payload={type:'dorm:player-state',player:dormPlayerView(player)};
      for(const other of room.players.values())if(other.id!==player.id)sendJson(other.socket,payload);
      return;
    }

    if(message.type==='dorm:layout') {
      const session=socket.dormSession;
      const room=session&&dormRooms.get(session.roomId);
      if(!room||room.ownerId!==session.playerId) {
        sendJson(socket,{type:'dorm:error',message:'Only the room owner can change furniture.'});
        return;
      }
      const layout=normalizeDormLayout(message.layout);
      if(!layout) {
        sendJson(socket,{type:'dorm:error',message:'That furniture layout is invalid.'});
        return;
      }
      room.layout=layout;
      for(const player of room.players.values())sendJson(player.socket,{type:'dorm:layout',layout});
      return;
    }

    const roomId = message.room || 'default';
    const room = getRoom(roomId);

    if (message.type === 'join') {
      const id = String(message.id || `player-${Date.now()}-${Math.random().toString(16).slice(2)}`);
      const player = {
        id,
        name: String(message.name || 'Player'),
        color: String(message.color || '#7fb5ff'),
        carName: String(message.carName || ''),
        trackId: String(message.trackId || ''),
        socket,
      };
      room.players.set(id, player);
      const payload = {
        type: 'room-sync',
        players: Array.from(room.players.values()).map(({ id, name, color, carName, trackId }) => ({ id, name, color, carName, trackId })),
      };
      broadcast(room, payload);
      return;
    }

    if (message.type === 'state') {
      const player = Array.from(room.players.values()).find((entry) => entry.socket === socket);
      if (!player) return;
      const payload = {
        type: 'player-update',
        id: player.id,
        state: message.state,
      };
      broadcast(room, payload);
      return;
    }

    if (message.type === 'ping') {
      sendJson(socket, { type: 'pong', time: Date.now() });
    }
  });

  socket.on('close', () => {
    removeGardenPlayer(socket);
    removeDormPlayer(socket);
    for (const room of rooms.values()) {
      for (const [id, player] of room.players.entries()) {
        if (player.socket === socket) {
          room.players.delete(id);
          broadcast(room, { type: 'player-left', id });
          break;
        }
      }
    }
  });
});

loadGardenSaves().then(()=>{
  gardenSaveRequested=true;
  return saveGardenSaves();
}).then(()=>{
  server.listen(port, () => {
    console.log(`Sektor rally server listening on http://localhost:${port}`);
  });
}).catch(error=>{
  console.error(error);
  process.exitCode=1;
});

for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{
  server.close(()=>{
    saveGardenSaves().finally(()=>process.exit(0));
  });
});
