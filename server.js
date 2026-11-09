const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { randomUUID, randomBytes, scrypt, createHash, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const scryptAsync = promisify(scrypt);
const gardenSavePath = path.join(__dirname, '.gardenfall-saves.json');
const gardenAccountPath = path.join(__dirname, '.gardenfall-accounts.json');

const root = __dirname;
const port = process.env.PORT || 3001;
const GARDEN_COIN_CAP = 1_000_000_000;
const rooms = new Map();
const dormRooms = new Map();
const dormFurnitureTypes = new Set(['bed', 'desk', 'chair', 'plant', 'lamp', 'shelf']);
const gardenRooms = new Map();
const gardenAccounts = new Map();
const gardenAccountsById = new Map();
const gardenSessions = new Map();
let gardenAccountSaveQueue = Promise.resolve();
const gardenPlants = {
  clover:{cost:22,grow:18000,sell:25,kind:'crop',health:25,harvests:1},
  berry:{cost:28,grow:24000,sell:27,kind:'crop',health:24,harvests:999999,regrow:12000,reusable:true,fruitCount:5,fruitRegrow:15000},
  reedTube:{cost:30,grow:19000,sell:4,kind:'part',health:28,part:'reed',harvests:1},
  sunflower:{cost:35,grow:28000,sell:38,kind:'crop',health:30,harvests:1},
  bamboo:{cost:38,grow:30000,sell:6,kind:'part',health:35,part:'bamboo',harvests:1},
  bluebell:{cost:42,grow:33000,sell:35,kind:'crop',health:28,harvests:1},
  iris:{cost:48,grow:38000,sell:32,kind:'crop',health:28,harvests:1},
  glowMushroom:{cost:54,grow:44000,sell:42,kind:'crop',health:28,harvests:999999,regrow:14000,reusable:true},
  apple:{cost:58,grow:50000,sell:43,kind:'crop',health:80,harvests:999999,reusable:true,fruitCount:5,fruitRegrow:18000},
  pumpkin:{cost:64,grow:52000,sell:52,kind:'crop',health:90,harvests:1},
  thornVine:{cost:68,grow:36000,sell:7,kind:'part',health:65,part:'grip',harvests:1},
  sunpetal:{cost:70,grow:54000,sell:46,kind:'crop',health:34,harvests:1},
  marigold:{cost:72,grow:56000,sell:46,kind:'crop',health:34,harvests:1},
  peashooter:{cost:78,grow:34000,kind:'defense',health:55,damage:8,range:7,rate:900,ammo:'peaBlaster',yield:10,harvests:1},
  roseTurret:{cost:84,grow:38000,kind:'defense',health:65,damage:7,range:8,rate:520,ammo:'peaBlaster',yield:10,harvests:1},
  lavender:{cost:88,grow:62000,sell:48,kind:'crop',health:32,harvests:1},
  frostPetal:{cost:92,grow:76000,sell:57,kind:'crop',health:30,harvests:1},
  snowdrop:{cost:96,grow:70000,sell:54,kind:'crop',health:30,harvests:1},
  snapdragon:{cost:100,grow:43000,kind:'defense',health:90,damage:13,range:4.5,rate:700,ammo:'peaBlaster',yield:6,harvests:1},
  moonberry:{cost:110,grow:82000,sell:64,kind:'crop',health:40,harvests:999999,regrow:17000,reusable:true},
  fireBloom:{cost:115,grow:90000,sell:66,kind:'crop',health:32,harvests:1},
  frostFern:{cost:118,grow:47000,kind:'defense',health:75,damage:9,range:9,rate:950,ammo:'peaBlaster',yield:10,harvests:1},
  moonLotus:{cost:126,grow:98000,sell:74,kind:'crop',health:36,harvests:1},
  starfruit:{cost:130,grow:94000,sell:78,kind:'crop',health:38,harvests:999999,regrow:18000,reusable:true,fruitCount:4,fruitRegrow:20000},
  cornzooka:{cost:140,grow:54000,kind:'defense',health:75,damage:24,range:8,rate:2600,ammo:'cornZooka',yield:2,blast:2,harvests:1},
  nightshade:{cost:150,grow:104000,sell:72,kind:'crop',health:30,harvests:999999,regrow:17000,reusable:true,fruitCount:4,fruitRegrow:18000},
  melonMortar:{cost:165,grow:62000,kind:'defense',health:95,damage:30,range:11,rate:2700,ammo:'cornZooka',yield:3,blast:3,harvests:1},
  dragonfruit:{cost:175,grow:118000,sell:92,kind:'crop',health:72,harvests:999999,reusable:true,fruitCount:4,fruitRegrow:22000},
  magazineVine:{cost:42,grow:25000,sell:8,kind:'part',health:35,part:'magazine',harvests:1},
  pumpkinShell:{cost:52,grow:42000,sell:6,kind:'part',health:45,part:'shell',harvests:1},
  blastCorn:{cost:60,grow:47000,sell:10,kind:'part',health:40,part:'blastCorn',harvests:1},
  pollenPod:{cost:66,grow:43000,sell:6,kind:'part',health:32,part:'pollen',harvests:1},
  triggerBloom:{cost:76,grow:48000,sell:7,kind:'part',health:34,part:'trigger',harvests:1},
  crystalBud:{cost:96,grow:70000,sell:12,kind:'part',health:35,part:'crystal',harvests:1},
  epicSoil:{cost:120,grow:82000,kind:'soil',health:100,harvests:999999},
  thornGuard:{cost:160,grow:74000,kind:'defense',health:220,damage:0,range:0,rate:0,part:'grip',harvests:1},
};
const sortedGardenPlantIds = Object.keys(gardenPlants).sort((a,b)=>(gardenPlants[a].cost||0)-(gardenPlants[b].cost||0));
const gardenWeapons={
  peaBlaster:{name:'Pea Blaster',damage:18,range:13,rate:450,capacity:10,ammoPack:10,ammoCost:18,shopCost:0,blast:0},
  cornZooka:{name:'Cornzooka',damage:55,range:16,rate:450,capacity:2,ammoPack:2,ammoCost:25,shopCost:0,blast:2},
  brambleRifle:{name:'Bramble Rifle',damage:32,range:21,rate:450,capacity:8,ammoPack:16,ammoCost:32,shopCost:90,blast:0},
  bloomShotgun:{name:'Bloom Shotgun',damage:46,range:8.5,rate:450,capacity:6,ammoPack:12,ammoCost:30,shopCost:165,blast:0},
  sunseedRepeater:{name:'Sunseed Repeater',damage:22,range:17,rate:450,capacity:18,ammoPack:36,ammoCost:48,shopCost:220,blast:0},
};
const gardenGear={wateringCan:20,shovel:25,trowel:25,sprinkler:45,fertilizer:30,backpack:125,lights:120,drone:10000,farmLayer:50000};
const gardenLands=[
  {id:'common',name:'Common',cost:0,multiplier:1},
  {id:'uncommon',name:'Uncommon',cost:100,multiplier:1.25},
  {id:'rare',name:'Rare',cost:300,multiplier:1.6},
  {id:'epic',name:'Epic',cost:750,multiplier:2.1},
  {id:'legendary',name:'Legendary',cost:1600,multiplier:3},
];
const gardenGrid={columns:6,rows:4,maxFarmLayers:10,farmCount:8,farmRadius:70,mapRadius:95};
const gardenWeatherTypes=['clear','rain','aurora','solarFlare','fireworks','rainbow','snowstorm','bloodMoon'];
const gardenWeatherPool=['clear','clear','clear','clear','clear','clear','clear','clear','rain','rain','aurora','solarFlare','fireworks','rainbow','snowstorm','bloodMoon'];
const gardenWeatherDurations={clear:10*60*1000,event:45*1000,bloodMoon:50*1000};
const gardenShopRestockMs=5*60*1000;
const gardenSolidObjects=[
  {x:0,z:-4.1,radius:1.35},{x:4.1,z:0,radius:1.35},{x:0,z:4.1,radius:1.35},
  {x:-4.1,z:0,radius:1.35},{x:0,z:0,radius:1.5},
];
const gardenCycle={day:20*60*1000,night:5*60*1000};
let nextPublicGarden=1;
let gardenSaveBusy=false;
let gardenSaveRequested=false;

function gardenFarmOffset(farmIndex){
  const angle=Math.PI/2-farmIndex*Math.PI*2/gardenGrid.farmCount;
  const radialX=Math.cos(angle),radialZ=-Math.sin(angle),tangentX=Math.sin(angle),tangentZ=Math.cos(angle);
  return {x:radialX*gardenGrid.farmRadius,z:radialZ*gardenGrid.farmRadius,angle,radialX,radialZ,tangentX,tangentZ};
}

function gardenFarmSpawn(farmIndex){
  const offset=gardenFarmOffset(farmIndex);
  return {x:offset.x-offset.radialX*5.7,z:offset.z-offset.radialZ*5.7};
}

function gardenPlotKey(tile){
  return `${tile.farmIndex}:${tile.col}:${tile.row}`;
}

function gardenTileFromKey(value){
  const parts=String(value||'').split(':').map(Number);
  if(parts.length===2)parts.unshift(0);
  return parts.length===3?gardenTile({farmIndex:parts[0],col:parts[1],row:parts[2]}):null;
}

function gardenPlotKeyFor(value){
  const tile=typeof value==='string'?gardenTileFromKey(value):gardenTile(value);
  return tile?gardenPlotKey(tile):'';
}

function assignGardenFarm(room,clientId,preferred){
  const assigned=room.farmAssignments.get(clientId);
  if(Number.isInteger(assigned)&&assigned>=0&&assigned<gardenGrid.farmCount)return assigned;
  const occupied=new Set(Array.from(room.farmAssignments,([owner,index])=>owner!==clientId?index:-1).filter(index=>index>=0));
  if(Number.isInteger(preferred)&&preferred>=0&&preferred<gardenGrid.farmCount&&!occupied.has(preferred)){
    room.farmAssignments.set(clientId,preferred);return preferred;
  }
  for(let index=0;index<gardenGrid.farmCount;index++)if(!occupied.has(index)){room.farmAssignments.set(clientId,index);return index;}
  return -1;
}

function clampGardenCoins(value){
  const numeric=Number(value)||0;
  if(!Number.isFinite(numeric))return 0;
  return Math.max(0,Math.min(GARDEN_COIN_CAP,numeric));
}

function gardenPlayerView(player) {
  player.coins = clampGardenCoins(player.coins);
  return {
    id:player.id,clientId:player.clientId,name:player.name,color:player.color,x:player.x,z:player.z,
    farmIndex:player.farmIndex,safetyOn:!!player.safetyOn,
    coins:player.coins,seeds:player.seeds,goods:player.goods,parts:player.parts,gear:player.gear,
    ammo:player.ammo,magazines:player.magazines,weapons:player.weapons,customGuns:player.customGuns,weapon:player.weapon,
    kills:player.kills,wateringCanCharges:player.wateringCanCharges,
    farmLayers:Math.max(0,Math.min(gardenGrid.maxFarmLayers,Number(player.farmLayers)||0)),
    landTier:player.landTier||'common',
  };
}

function gardenShopStockValue(itemId,defaultStock,now=Date.now()){
  const cycle=Math.floor(now/gardenShopRestockMs);
  const hash=Array.from(String(itemId||'')).reduce((total,char)=>total+char.charCodeAt(0),0);
  const maxStock=Math.max(1,Number(defaultStock)||1);
  return 1 + ((cycle + hash) % maxStock);
}

function gardenMutateCrops(room,weather,now=Date.now()){
  const candidates=Array.from(room.plants.values()).filter(plant=>
    gardenPlants[plant.type]?.kind==='crop'&&plant.mutation===''&&((now<plant.matureAt)||Number(plant.fruitsAvailable)>0)
  );
  for(let index=candidates.length-1;index>0;index--){
    const swap=Math.floor(Math.random()*(index+1));
    [candidates[index],candidates[swap]]=[candidates[swap],candidates[index]];
  }
  let mutated=0;
  for(const plant of candidates){
    if(mutated>=6)break;
    if(Math.random()<.45){plant.mutation=weather;mutated++;}
  }
}

function gardenSeedCount(player){
  return Object.values(player.seeds||{}).reduce((total,amount)=>total+Math.max(0,Math.floor(Number(amount)||0)),0);
}

function gardenCreateSeedDrops(room,player,type,count=1){
  for(let index=0;index<count;index++){
    const angle=Math.random()*Math.PI*2,radius=1.05+Math.floor(index/8)*.2,id=randomUUID();
    room.seedDrops.set(id,{id,type,x:player.x+Math.cos(angle)*radius,z:player.z+Math.sin(angle)*radius,ownerId:player.id});
  }
}

function gardenEnforceSeedCapacity(room,player){
  let overflow=Math.max(0,gardenSeedCount(player)-(player.gear?.backpack?10:1));
  for(const type of Object.keys(player.seeds||{}).sort()){
    if(!overflow)break;
    const amount=Math.max(0,Math.floor(Number(player.seeds[type])||0));
    const dropped=Math.min(amount,overflow);
    if(!dropped)continue;
    const remaining=amount-dropped;
    if(remaining)player.seeds[type]=remaining;else delete player.seeds[type];
    gardenCreateSeedDrops(room,player,type,dropped);
    overflow-=dropped;
  }
}

function gardenGrantSeed(room,player,type){
  gardenEnforceSeedCapacity(room,player);
  if(gardenSeedCount(player)>=(player.gear?.backpack?10:1)){
    gardenCreateSeedDrops(room,player,type);
    return false;
  }
  player.seeds[type]=(Number(player.seeds[type])||0)+1;
  return true;
}

function gardenDropSeed(room,player,type){
  gardenEnforceSeedCapacity(room,player);
  const amount=Math.max(0,Math.floor(Number(player.seeds?.[type])||0));
  if(!amount)return false;
  if(amount===1)delete player.seeds[type];else player.seeds[type]=amount-1;
  gardenCreateSeedDrops(room,player,type);
  return true;
}

function gardenRefreshShopStock(room,now=Date.now()){
  if(!room.shopRestockAt||now>=room.shopRestockAt){
    const cycle=Math.floor(now/gardenShopRestockMs);
    room.shopRestockAt=(cycle+1)*gardenShopRestockMs;
    room.shopStock={
      seeds:Object.fromEntries(sortedGardenPlantIds.map(id=>[id,gardenShopStockValue(id,4,now)])),
      gear:Object.fromEntries(Object.keys(gardenGear).map(id=>[id,gardenShopStockValue(id,3,now)])),
      weapons:Object.fromEntries(Object.keys(gardenWeapons).map(id=>[id,gardenShopStockValue(id,2,now)])),
    };
  }
  return room.shopStock;
}

function gardenSnapshot(room) {
  const now=Date.now();
  const cycleElapsed=(now-room.cycleStart)% (gardenCycle.day+gardenCycle.night);
  const shopStock=gardenRefreshShopStock(room,now);
  return {
    type:'garden:sync',roomId:room.id,mode:room.mode,day:room.day,
    phase:cycleElapsed>=gardenCycle.day?'night':'day',
    phaseRemaining:cycleElapsed>=gardenCycle.day?gardenCycle.day+gardenCycle.night-cycleElapsed:gardenCycle.day-cycleElapsed,
    gardenHealth:room.gardenHealth,weather:room.weather,weatherRemaining:Math.max(0,room.nextWeatherAt-now),
    players:Array.from(room.players.values(),gardenPlayerView),
    plants:Array.from(room.plants.values()),
    seedDrops:Array.from(room.seedDrops.values()),
    zombies:Array.from(room.zombies.values()),
    projectiles:room.projectiles.filter(projectile=>projectile.expiresAt>now),
    sprinklers:Array.from(room.sprinklers),
    lanterns:Array.from(room.lanterns.values()),
    soil:Array.from(room.soil),
    ponds:room.ponds,
    shopStock,
    shopRestockAt: Math.max(0, Number(room.shopRestockAt) || 0),
  };
}

function gardenSendError(socket,message) {
  sendJson(socket,{type:'garden:error',message});
}

function gardenBroadcast(room) {
  gardenSaveRequested=true;
  const snapshot=gardenSnapshot(room);
  for(const player of room.players.values())sendJson(player.socket,snapshot);
}

function createGardenRoom(id,mode) {
  const now=Date.now();
  return {
    id,mode,players:new Map(),savedPlayers:new Map(),farmAssignments:new Map(),plants:new Map(),seedDrops:new Map(),zombies:new Map(),projectiles:[],
    sprinklers:new Set(),sprinklerExpires:new Map(),lanterns:new Map(),soil:new Set(),ponds:[{x:-8,z:4},{x:8,z:4}],
    createdAt:now,cycleStart:now,day:1,gardenHealth:100,lastSpawn:now,nextZombie:1,
    weather:'clear',nextWeatherAt:now+gardenWeatherDurations.clear,lastBroadcast:0,lastActivity:now,lastTick:now,
    shopRestockAt:now+gardenShopRestockMs,shopStock:{},
  };
}

function removeGardenPlayer(socket) {
  const session=socket.gardenSession;
  if(!session)return;
  socket.gardenSession=null;
  const room=gardenRooms.get(session.roomId);
  if(!room)return;
  const player=room.players.get(session.playerId);
  if(player?.clientId)room.savedPlayers.set(player.clientId,gardenPersistentPlayer(player));
  room.players.delete(session.playerId);
  room.lastActivity=Date.now();
  gardenSaveRequested=true;
  if(room.players.size>0)gardenBroadcast(room);
}

function gardenPersistentPlayer(player) {
  const {socket,lastActions,lastMove,lastShot,...saved}=player;
  return saved;
}

function gardenPersistedRoom(room) {
  const players=Object.fromEntries(room.savedPlayers);
  for(const player of room.players.values())players[player.clientId]=gardenPersistentPlayer(player);
  return {
    id:room.id,mode:room.mode,cycleStart:room.cycleStart,day:room.day,gardenHealth:room.gardenHealth,
    nextZombie:room.nextZombie,weather:room.weather,nextWeatherAt:room.nextWeatherAt,
    plants:Array.from(room.plants.values()),seedDrops:Array.from(room.seedDrops.values()),sprinklers:Array.from(room.sprinklers),
    soil:Array.from(room.soil),players,
  };
}

function restoreGardenRoom(record) {
  const id=String(record?.id||''),mode=record?.mode==='public'?'public':'private';
  if(!record||typeof record!=='object'||!(/^\d{5}$/.test(id)||mode==='public'&&/^garden-public-\d+$/.test(id)))return null;
  const room=createGardenRoom(id,mode);
  room.cycleStart=Number(record.cycleStart)||room.cycleStart;
  room.day=Math.max(1,Math.floor(Number(record.day)||1));
  const savedGardenHealth=Number(record.gardenHealth);
  room.gardenHealth=Number.isFinite(savedGardenHealth)?Math.max(0,Math.min(100,savedGardenHealth)):100;
  room.nextZombie=Math.max(1,Math.floor(Number(record.nextZombie)||1));
    room.weather=gardenWeatherTypes.includes(record.weather)?record.weather:'clear';
  room.nextWeatherAt=Math.max(Date.now(),Number(record.nextWeatherAt)||room.nextWeatherAt);
  const usedFarmIndices=new Set();
  if(record.players&&typeof record.players==='object'&&!Array.isArray(record.players)){
    for(const [clientId,player]of Object.entries(record.players)){
      if(!/^[\w-]{8,64}$/.test(clientId)||!player||typeof player!=='object')continue;
      let farmIndex=Number.isInteger(player.farmIndex)&&player.farmIndex>=0&&player.farmIndex<gardenGrid.farmCount&&!usedFarmIndices.has(player.farmIndex)?player.farmIndex:-1;
      if(farmIndex<0)for(let index=0;index<gardenGrid.farmCount;index++)if(!usedFarmIndices.has(index)){farmIndex=index;break;}
      if(farmIndex<0)continue;
      const restoredPlayer={...player,farmIndex};
      room.savedPlayers.set(clientId,restoredPlayer);room.farmAssignments.set(clientId,farmIndex);usedFarmIndices.add(farmIndex);
    }
  }
  const ownerFarms=new Map(Array.from(room.savedPlayers.values(),player=>[player.id,player.farmIndex]));
  for(const plant of Array.isArray(record.plants)?record.plants:[]){
    const farmIndex=Number.isInteger(plant?.farmIndex)?plant.farmIndex:ownerFarms.get(String(plant?.ownerId||''))??0;
    const tile=gardenTile({farmIndex,col:plant?.col,row:plant?.row});
    const definition=gardenPlants[plant?.type];
    if(!definition||!tile)continue;
    room.plants.set(gardenPlotKey(tile),{
      ...plant,farmIndex:tile.farmIndex,x:tile.x,z:tile.z,health:Math.max(1,Number(plant.health)||1),harvestsLeft:Math.min(definition.harvests,Math.max(1,Number(plant.harvestsLeft)||1)),
      ownerId:String(plant.ownerId||''),reusable:!!definition.reusable,
      fruitSize:Math.max(1,Number(plant.fruitSize)||1),
      fruitsAvailable:definition.fruitCount?Math.max(0,Math.min(definition.fruitCount,Number.isFinite(Number(plant.fruitsAvailable))?Number(plant.fruitsAvailable):definition.fruitCount)):0,
      nextFruitAt:Math.max(0,Number(plant.nextFruitAt)||0),
    });
  }
  for(const drop of Array.isArray(record.seedDrops)?record.seedDrops:[]){
    if(!drop||!/^[\w-]{8,64}$/.test(String(drop.id||''))||!gardenPlants[drop.type]||!Number.isFinite(Number(drop.x))||!Number.isFinite(Number(drop.z)))continue;
    room.seedDrops.set(drop.id,{id:drop.id,type:drop.type,x:Number(drop.x),z:Number(drop.z),ownerId:String(drop.ownerId||'')});
  }
  for(const key of Array.isArray(record.sprinklers)?record.sprinklers:[]){const tile=gardenTileFromKey(key);if(tile)room.sprinklers.add(gardenPlotKey(tile));}
  for(const key of Array.isArray(record.soil)?record.soil:[]){const tile=gardenTileFromKey(key);if(tile)room.soil.add(gardenPlotKey(tile));}
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
    if(room){
      gardenRooms.set(room.id,room);
      const publicId=room.id.match(/^garden-public-(\d+)$/);
      if(publicId)nextPublicGarden=Math.max(nextPublicGarden,Number(publicId[1])+1);
    }
  }
}

async function saveGardenSaves() {
  if(gardenSaveBusy||!gardenSaveRequested)return;
  gardenSaveBusy=true;gardenSaveRequested=false;
  try {
    const data=JSON.stringify(Array.from(gardenRooms.values(),gardenPersistedRoom));
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

function sendGardenApiJson(res,status,payload){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(payload));
}

function readGardenApiBody(req){
  return new Promise((resolve,reject)=>{
    let body='';
    req.setEncoding('utf8');
    req.on('data',chunk=>{
      body+=chunk;
      if(body.length>8192){reject(new Error('Request is too large.'));req.destroy();}
    });
    req.on('end',()=>{
      try{
        const value=JSON.parse(body||'{}');
        if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid request.');
        resolve(value);
      }catch(error){reject(error);}
    });
    req.on('error',reject);
  });
}

function gardenBearerToken(req){
  const match=String(req.headers.authorization||'').match(/^Bearer ([a-f0-9]{64})$/i);
  return match?match[1].toLowerCase():'';
}

function gardenSessionAccount(token){
  if(!/^[a-f0-9]{64}$/i.test(token||''))return null;
  const tokenHash=createHash('sha256').update(token).digest('hex');
  const session=gardenSessions.get(tokenHash);
  if(!session)return null;
  if(session.expiresAt<=Date.now()){gardenSessions.delete(tokenHash);return null;}
  return gardenAccountsById.get(session.accountId)||null;
}

async function saveGardenAccounts(){
  const payload=JSON.stringify({
    accounts:Array.from(gardenAccounts.values()),
    sessions:Array.from(gardenSessions,([tokenHash,session])=>({tokenHash,...session})),
  });
  gardenAccountSaveQueue=gardenAccountSaveQueue.catch(()=>{}).then(async()=>{
    const temporaryPath=gardenAccountPath+'.tmp';
    await fs.promises.writeFile(temporaryPath,payload,{mode:0o600});
    await fs.promises.rename(temporaryPath,gardenAccountPath);
  });
  return gardenAccountSaveQueue;
}

async function loadGardenAccounts(){
  let contents;
  try{contents=await fs.promises.readFile(gardenAccountPath,'utf8');}
  catch(error){if(error.code==='ENOENT')return;throw error;}
  const parsed=JSON.parse(contents);
  if(!parsed||!Array.isArray(parsed.accounts)||!Array.isArray(parsed.sessions))throw new Error('Saved Gardenfall accounts are invalid.');
  for(const account of parsed.accounts){
    if(!account||!/^[a-z0-9_]{3,20}$/.test(account.normalizedUsername)||!/^[\w-]{8,64}$/.test(account.id)||!/^[a-f0-9]{32}$/.test(account.salt)||!/^[a-f0-9]{128}$/.test(account.passwordHash))continue;
    gardenAccounts.set(account.normalizedUsername,account);gardenAccountsById.set(account.id,account);
  }
  for(const session of parsed.sessions){
    if(!/^[a-f0-9]{64}$/.test(session?.tokenHash)||!gardenAccountsById.has(session.accountId)||!Number.isFinite(session.expiresAt)||session.expiresAt<=Date.now())continue;
    gardenSessions.set(session.tokenHash,{accountId:session.accountId,expiresAt:session.expiresAt});
  }
}

function gardenAuthPayload(account,token){
  return {token,user:{id:account.id,username:account.username}};
}

async function handleGardenAuthRequest(req,res,route){
  if(route==='session'&&req.method==='GET'){
    const account=gardenSessionAccount(gardenBearerToken(req));
    if(!account)return sendGardenApiJson(res,401,{error:'Your Gardenfall session has expired. Log in again.'});
    return sendGardenApiJson(res,200,{user:{id:account.id,username:account.username}});
  }
  if(!['signup','login','logout'].includes(route)||!['POST'].includes(req.method)){
    res.setHeader('Allow',route==='session'?'GET':'POST');
    return sendGardenApiJson(res,405,{error:'Method not allowed.'});
  }
  let body;
  try{body=await readGardenApiBody(req);}
  catch(error){return sendGardenApiJson(res,400,{error:error.message||'Invalid request.'});}
  if(route==='logout'){
    const token=gardenBearerToken(req)||String(body.token||'');
    if(/^[a-f0-9]{64}$/i.test(token))gardenSessions.delete(createHash('sha256').update(token).digest('hex'));
    await saveGardenAccounts();
    return sendGardenApiJson(res,200,{ok:true});
  }
  const username=String(body.username||'').trim();
  const normalizedUsername=username.toLowerCase();
  const password=String(body.password||'');
  if(!/^[a-zA-Z0-9_]{3,20}$/.test(username))return sendGardenApiJson(res,400,{error:'Username must be 3 to 20 letters, numbers, or underscores.'});
  if(password.length<8||password.length>128)return sendGardenApiJson(res,400,{error:'Password must be between 8 and 128 characters.'});
  let account=gardenAccounts.get(normalizedUsername);
  let createdAccount=false;
  if(route==='signup'){
    if(account)return sendGardenApiJson(res,409,{error:'That username is already taken.'});
    const salt=randomBytes(16).toString('hex');
    const passwordHash=(await scryptAsync(password,salt,64)).toString('hex');
    if(gardenAccounts.has(normalizedUsername))return sendGardenApiJson(res,409,{error:'That username is already taken.'});
    account={id:randomUUID(),username,normalizedUsername,salt,passwordHash};
    gardenAccounts.set(normalizedUsername,account);gardenAccountsById.set(account.id,account);createdAccount=true;
  }else{
    const salt=account?.salt||'gardenfall-invalid-login';
    const expected=account?Buffer.from(account.passwordHash,'hex'):Buffer.alloc(64);
    const actual=await scryptAsync(password,salt,64);
    if(!account||expected.length!==actual.length||!timingSafeEqual(expected,actual))return sendGardenApiJson(res,401,{error:'Incorrect username or password.'});
  }
  const token=randomBytes(32).toString('hex');
  const tokenHash=createHash('sha256').update(token).digest('hex');
  gardenSessions.set(tokenHash,{accountId:account.id,expiresAt:Date.now()+30*24*60*60*1000});
  try{await saveGardenAccounts();}
  catch(error){
    gardenSessions.delete(tokenHash);
    if(createdAccount){gardenAccounts.delete(normalizedUsername);gardenAccountsById.delete(account.id);}
    console.error('Could not save Gardenfall accounts:',error);
    return sendGardenApiJson(res,500,{error:'Could not save your Gardenfall account. Please try again.'});
  }
  return sendGardenApiJson(res,200,gardenAuthPayload(account,token));
}

function gardenRoomForSocket(socket) {
  const session=socket.gardenSession;
  const room=session&&gardenRooms.get(session.roomId);
  return room&&room.players.get(session.playerId)?room:null;
}

function gardenTile(value,player=null) {
  const farmIndex=value?.farmIndex===undefined?0:value.farmIndex;
  if(!Number.isInteger(farmIndex)||farmIndex<0||farmIndex>=gardenGrid.farmCount||!Number.isInteger(value.col)||!Number.isInteger(value.row)||value.col<0||value.col>=gardenGrid.columns||value.row<0||value.row>=gardenGrid.rows+gardenGrid.maxFarmLayers)return null;
  if(player&&farmIndex===player.farmIndex&&value.row>=gardenGrid.rows+Math.max(0,Math.min(gardenGrid.maxFarmLayers,Number(player.farmLayers)||0)))return null;
  const offset=gardenFarmOffset(farmIndex);
  const radial=(value.col-2.5)*1.8,tangent=(value.row-1.5)*1.8;
  return {farmIndex,col:value.col,row:value.row,x:offset.x+offset.radialX*radial+offset.tangentX*tangent,z:offset.z+offset.radialZ*radial+offset.tangentZ*tangent};
}

function gardenPositionBlocked(room,x,z){
  if(Array.from(room.plants.values()).some(plant=>Math.hypot(x-plant.x,z-plant.z)<.82))return true;
  if(gardenSolidObjects.some(object=>Math.hypot(x-object.x,z-object.z)<object.radius+.45))return true;
  return room.ponds.some(pond=>Math.hypot(x-pond.x,z-pond.z)<1.9);
}

function gardenDamageZombie(room,zombie,damage,player) {
  zombie.health-=damage;
  if(zombie.health>0)return;
  room.zombies.delete(zombie.id);
  if(player){player.coins+=8;player.kills++;}
}

function handleGardenJoin(socket,message) {
  removeGardenPlayer(socket);
  const account=gardenSessionAccount(String(message.accountToken||''));
  if(!account){gardenSendError(socket,'Log in to your Gardenfall account before joining.');return;}
  const accountKey=account.id,accountUsername=account.username;
  const clientId=accountKey;
  const name=String(message.name||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,20);
  if(!name){gardenSendError(socket,'Choose a player name first.');return;}
  let room;
  let roomId='';
  let mode=String(message.mode||'');
  if(mode==='public') {
    room=Array.from(gardenRooms.values()).find(candidate=>candidate.mode==='public'&&candidate.players.size<8&&(candidate.farmAssignments.has(clientId)||candidate.farmAssignments.size<gardenGrid.farmCount));
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
  if(Array.from(room.players.values()).some(player=>player.clientId===clientId)){gardenSendError(socket,'This Gardenfall account is already playing in this garden.');return;}
  const saved=room.savedPlayers.get(clientId);
  const farmIndex=assignGardenFarm(room,clientId,saved?.farmIndex);
  if(farmIndex<0){gardenSendError(socket,'All eight farms are assigned in this garden.');return;}
  const farmSpawn=gardenFarmSpawn(farmIndex),resumePosition=saved?.farmIndex===farmIndex;
  const id=saved?.id||randomUUID();
  room.savedPlayers.delete(clientId);
  const player={
    ...saved,id,clientId,accountKey,accountUsername,name,color:typeof message.color==='string'&&/^#[0-9a-f]{6}$/i.test(message.color)?message.color:saved?.color||'#79d98a',
    farmIndex,
    x:resumePosition&&Number.isFinite(Number(saved?.x))?Number(saved.x):farmSpawn.x,z:resumePosition&&Number.isFinite(Number(saved?.z))?Number(saved.z):farmSpawn.z,
    coins:Math.max(0,Number.isFinite(Number(saved?.coins))?Number(saved.coins):100),seeds:saved?.seeds&&typeof saved.seeds==='object'?saved.seeds:{},
    goods:saved?.goods&&typeof saved.goods==='object'?saved.goods:{},
    parts:saved?.parts&&typeof saved.parts==='object'?saved.parts:{},
    gear:{wateringCan:false,shovel:false,trowel:false,sprinkler:0,fertilizer:0,backpack:false,lights:false,drone:0,...(saved?.gear&&typeof saved.gear==='object'?saved.gear:{})},
    ammo:{...Object.fromEntries(Object.keys(gardenWeapons).map(weapon=>[weapon,0])),...(saved?.ammo&&typeof saved.ammo==='object'?saved.ammo:{}),peaBlaster:saved?.ammo&&typeof saved.ammo==='object'?Math.max(0,Number(saved.ammo.peaBlaster)||0):20},
    weapons:{...Object.fromEntries(Object.keys(gardenWeapons).map(weapon=>[weapon,false])),...(saved?.weapons&&typeof saved.weapons==='object'?saved.weapons:{}),peaBlaster:true,cornZooka:!!saved?.weapons?.cornZooka},
    customGuns:Array.isArray(saved?.customGuns)?saved.customGuns:[],
    landTier:gardenLands.some(land=>land.id===saved?.landTier)?saved.landTier:'common',
    farmLayers:Math.max(0,Math.min(10,Number(saved?.farmLayers)||0)),
    nextDroneRun:0,
    wateringCanCharges:Math.max(0,Math.min(5,Number(saved?.wateringCanCharges)||((saved?.gear?.wateringCan)?5:0))),
    kills:Math.max(0,Number(saved?.kills)||0),socket,lastActions:Object.create(null),lastMove:0,lastShot:0,
    weapon:saved?.weapon||'peaBlaster',safetyOn:saved?.safetyOn===true,
  };
  player.gear.drone=Math.max(0,Math.min(2,Math.floor(Number(player.gear.drone)||0)));
  player.magazines=Object.fromEntries(Object.entries(gardenWeapons).map(([weapon,definition])=>[weapon,weapon==='peaBlaster'?definition.capacity:0]));
  for(const gun of player.customGuns)player.magazines[gun.id]=0;
  if(saved?.magazines&&typeof saved.magazines==='object'){
    for(const [weapon,capacity]of Object.entries({...Object.fromEntries(Object.entries(gardenWeapons).map(([id,definition])=>[id,definition.capacity])),...Object.fromEntries(player.customGuns.map(gun=>[gun.id,gun.capacity]))})){
      player.magazines[weapon]=Math.max(0,Math.min(capacity,Math.floor(Number(saved.magazines[weapon])||0)));
    }
  }
  if(saved?.weapons?.peaBlaster!==true){
    player.magazines.peaBlaster=Math.max(player.magazines.peaBlaster,10);
    player.ammo.peaBlaster=Math.max(player.ammo.peaBlaster,10);
  }
  room.players.set(id,player);
  gardenEnforceSeedCapacity(room,player);
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
  const gardenHealthBeforeAction=room.gardenHealth;
  const action=String(message.action||'');
  const aliasAction=action==='weather'||action==='seed'||action==='gear'||action==='coins'||action==='zombie'||action==='restock'||action==='toggle-phase'? 'dev' : action;
  const actionName=aliasAction==='dev' && action!=='dev' ? action : action;
  if(now-(player.lastActions[actionName]||0)<70)return;
  player.lastActions[actionName]=now;
  room.lastActivity=now;
  gardenSaveRequested=true;
  const devMessage = aliasAction==='dev' ? { ...message, kind: action==='weather'?'weather':action==='seed'?'seed':action==='gear'?'gear':action==='coins'?'coins':action==='zombie'?'zombie':action==='restock'?'restock':action==='toggle-phase'?'toggle-phase':message.kind } : message;
  if(aliasAction==='dev') {
    const kind=String(devMessage.kind||'');
    if(kind==='weather'){
      const weather=String(devMessage.value||'clear');
      const allowed=['clear','rain','aurora','solarFlare','fireworks','rainbow','snowstorm','bloodMoon'];
      if(!allowed.includes(weather)){gardenSendError(socket,'Unknown dev weather');return;}
      room.weather=weather;room.nextWeatherAt=now+(weather==='clear'?gardenWeatherDurations.clear:gardenWeatherDurations.event);
      if(['aurora','solarFlare','fireworks','rainbow','bloodMoon'].includes(weather))gardenMutateCrops(room,weather,now);
    } else if(kind==='seed') {
      const type=String(devMessage.id||'');if(!Object.prototype.hasOwnProperty.call(gardenPlants,type)){gardenSendError(socket,'Unknown seed type.');return;}
      gardenGrantSeed(room,player,type);
    } else if(kind==='gear') {
      const type=String(devMessage.id||'');
      if(type==='wateringCan'){player.gear.wateringCan=true;player.wateringCanCharges=Math.max(player.wateringCanCharges||0,5);}
      else if(type==='shovel'||type==='trowel'||type==='backpack'){player.gear[type]=true;}
      else if(type==='lights'){player.gear.lights=(Number(player.gear.lights)||0)+1;}
      else if(type==='sprinkler'){player.gear.sprinkler++;}
      else if(type==='fertilizer'){player.gear.fertilizer=(Number(player.gear.fertilizer)||0)+1;}
      else {gardenSendError(socket,'Unknown dev gear type.');return;}
    } else if(kind==='coins') {
      player.coins=clampGardenCoins((Number(player.coins)||0)+Math.max(0,Number(devMessage.amount)||0));
    } else if(kind==='zombie') {
      const angle=Math.random()*Math.PI*2;const radius=7+Math.random()*3;room.zombies.set(`dev-${now}-${Math.random()}`,{id:`dev-${now}-${Math.random()}`,x:player.x+Math.cos(angle)*radius,z:player.z+Math.sin(angle)*radius,health:40,speed:0.3+Math.random()*0.15});
    } else if(kind==='restock') {
      room.shopRestockAt=now;room.shopStock={};gardenRefreshShopStock(room,now);
    } else if(kind==='toggle-phase') {
      room.cycleStart=now-(gardenCycle.day+gardenCycle.night)/2;
    } else {
      gardenSendError(socket,'Unsupported dev action.');return;
    }
    gardenBroadcast(room);return;
  }
  if(action==='move') {
    if(now-player.lastMove<45)return;
    const x=Number(message.x),z=Number(message.z);
    if(!Number.isFinite(x)||!Number.isFinite(z)||Math.hypot(x,z)>gardenGrid.mapRadius||gardenPositionBlocked(room,x,z))return;
    player.x=x;player.z=z;player.lastMove=now;return;
  }
  if(action==='drop-seed') {
    const type=String(message.item||'');
    if(!gardenDropSeed(room,player,type)){gardenSendError(socket,'You do not have that seed to drop.');return;}
  } else if(action==='buy-seed') {
    const type=String(message.item||'');const definition=Object.prototype.hasOwnProperty.call(gardenPlants,type)?gardenPlants[type]:null;
    if(!definition){gardenSendError(socket,'That seed is not available.');return;}
    const shopStock=gardenRefreshShopStock(room,now);
    if((shopStock?.seeds?.[type]||0)<=0){gardenSendError(socket,'That seed is not in stock. It restocks in 5 minutes.');return;}
    if(player.coins<definition.cost){gardenSendError(socket,'Not enough coins for those seeds.');return;}
    player.coins-=definition.cost;
    shopStock.seeds[type]=Math.max(0,(shopStock.seeds[type]||0)-1);
    gardenGrantSeed(room,player,type);
  } else if(action==='pickup-seed') {
    const drop=room.seedDrops.get(String(message.id||''));
    if(!drop){gardenSendError(socket,'That seed is no longer on the ground.');return;}
    gardenEnforceSeedCapacity(room,player);
    if(gardenSeedCount(player)>=(player.gear.backpack?10:1)){gardenSendError(socket,player.gear.backpack?'Your backpack is full.':'You are already carrying a seed. Buy a backpack to carry more.');return;}
    gardenGrantSeed(room,player,drop.type);room.seedDrops.delete(drop.id);
  } else if(action==='buy-gear') {
    const type=String(message.item||''),cost=Object.prototype.hasOwnProperty.call(gardenGear,type)?gardenGear[type]:0;
    if(!cost){gardenSendError(socket,'That gear is not available.');return;}
    if(type==='drone'&&Number(player.gear.drone||0)>=2){gardenSendError(socket,'You already own the maximum of 2 scout drones.');return;}
    if(type==='farmLayer'&&Number(player.farmLayers||0)>=gardenGrid.maxFarmLayers){gardenSendError(socket,'Your farm already has the maximum of 10 layers.');return;}
    const shopStock=gardenRefreshShopStock(room,now);
    if((shopStock?.gear?.[type]||0)<=0){gardenSendError(socket,'That item is not in stock. It restocks in 5 minutes.');return;}
    if(player.coins<cost){gardenSendError(socket,'Not enough coins for that gear.');return;}
    player.coins-=cost;
    shopStock.gear[type]=Math.max(0,(shopStock.gear[type]||0)-1);
    if(type==='wateringCan'){player.gear[type]=true;player.wateringCanCharges=Math.max(player.wateringCanCharges||0,5);}
    else if(type==='shovel'||type==='trowel')player.gear[type]=true;
    else if(type==='lights')player.gear.lights=(Number(player.gear.lights)||0)+1;
    else if(type==='sprinkler')player.gear.sprinkler++;
    else if(type==='backpack')player.gear.backpack=true;
    else if(type==='drone'){player.gear.drone=Math.min(2,(player.gear.drone||0)+1);player.nextDroneRun=now;room.lastDroneRun=now;}
    else if(type==='farmLayer'){player.farmLayers=Math.min(10,(Number(player.farmLayers)||0)+1);}
    else player.gear.fertilizer++;
  } else if(action==='buy-weapon') {
    const type=String(message.item||''),definition=gardenWeapons[type];
    if(!definition?.shopCost){gardenSendError(socket,'That weapon is not available for purchase.');return;}
    const shopStock=gardenRefreshShopStock(room,now);
    if((shopStock?.weapons?.[type]||0)<=0){gardenSendError(socket,'That weapon is not in stock. It restocks in 5 minutes.');return;}
    if(player.weapons[type]){gardenSendError(socket,'You already own that weapon.');return;}
    if(player.coins<definition.shopCost){gardenSendError(socket,'Not enough coins for that weapon.');return;}
    player.coins-=definition.shopCost;
    shopStock.weapons[type]=Math.max(0,(shopStock.weapons[type]||0)-1);
    player.weapons[type]=true;
    player.magazines[type]=definition.capacity;player.ammo[type]=definition.ammoPack;
  } else if(action==='buy-ammo') {
    const type=String(message.item||'');
    let weapon,quantity,cost,capacity=100;
    const listing=gardenWeapons[type];
    if(listing){
      if(!player.weapons[type]){gardenSendError(socket,'Buy or unlock that weapon before purchasing ammo.');return;}
      weapon=type;quantity=listing.ammoPack;cost=listing.ammoCost;
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
    const type=String(message.item||''),definition=Object.prototype.hasOwnProperty.call(gardenPlants,type)?gardenPlants[type]:null,tile=gardenTile(message.tile,player);
    if(!definition||!tile||tile.farmIndex!==player.farmIndex||room.plants.has(gardenPlotKey(tile))||room.sprinklers.has(gardenPlotKey(tile))){gardenSendError(socket,'Choose an empty plot on your farm and a valid seed.');return;}
    if(!(player.seeds[type]>0)){gardenSendError(socket,'Buy that seed before planting it.');return;}
    player.seeds[type]--;
    const soil=definition.kind==='soil';
    const boosted=Array.from(room.soil).some(key=>{
      const soilTile=gardenTileFromKey(key);
      return soilTile?.farmIndex===tile.farmIndex&&Math.abs(soilTile.col-tile.col)<=1&&Math.abs(soilTile.row-tile.row)<=1;
    });
    const land=gardenLands.find(item=>item.id===player.landTier)||gardenLands[0];
    const key=gardenPlotKey(tile);
    const plant={id:randomUUID(),type,farmIndex:tile.farmIndex,col:tile.col,row:tile.row,x:tile.x,z:tile.z,ownerId:player.id,plantedAt:now,matureAt:now+definition.grow*(boosted?.7:1),health:definition.health,lastAttack:0,harvestsLeft:definition.harvests,regrow:definition.regrow||0,reusable:!!definition.reusable,fruitSize:definition.kind==='crop'?land.multiplier:1,fruitsAvailable:definition.fruitCount||0,nextFruitAt:0,mutation:'',lastHarvest:0};
    room.plants.set(key,plant);
    if(soil)room.soil.add(key);
  } else if(action==='harvest') {
    const key=gardenPlotKeyFor(message.tile),plant=room.plants.get(key);
    if(!plant||plant.ownerId!==player.id){gardenSendError(socket,'You can harvest your own plants.');return;}
    if(plant.favorite&&message.confirmFavorite!==true){gardenSendError(socket,'That plant is a favorite. Confirm before harvesting it.');return;}
    if(now<plant.matureAt){gardenSendError(socket,'That plant is still growing.');return;}
    const definition=gardenPlants[plant.type];
    if(definition.kind==='crop'){
      if(definition.fruitCount&&!(plant.fruitsAvailable>0)){gardenSendError(socket,'No fruit is ready yet.');return;}
      const mutationMultiplier=plant.mutation==='rainbow'?4:plant.mutation==='aurora'?3:plant.mutation==='solarFlare'||plant.mutation==='fireworks'?2:1;
      player.goods[plant.type]=(player.goods[plant.type]||0)+Math.max(1,Math.floor(mutationMultiplier));
      if(definition.fruitCount){
        plant.fruitsAvailable--;plant.nextFruitAt=now+definition.fruitRegrow;gardenBroadcast(room);return;
      }
    }else if(definition.kind==='part'){
      player.parts[definition.part]=(player.parts[definition.part]||0)+1;
      player.goods[plant.type]=(player.goods[plant.type]||0)+1;
    }else if(definition.kind==='defense'){
      if(definition.part){player.parts[definition.part]=(player.parts[definition.part]||0)+1;room.plants.delete(key);gardenBroadcast(room);return;}
      if(!definition.ammo||!definition.yield){gardenSendError(socket,'This defensive plant cannot be harvested. Use a shovel to remove it.');return;}
      player.ammo[definition.ammo]=Math.min(100,(player.ammo[definition.ammo]||0)+definition.yield);
      player.weapons[definition.ammo]=true;
      room.plants.delete(key);
      gardenBroadcast(room);return;
    }else {gardenSendError(socket,'Epic soil cannot be harvested. Use your shovel to remove it.');return;}
    plant.harvestsLeft--;
    if(definition.reusable){plant.matureAt=now+(plant.regrow||definition.harvestCooldown||definition.grow);plant.plantedAt=now;plant.mutation='';}
    else if(plant.harvestsLeft>0){plant.matureAt=now+(plant.regrow||definition.grow);plant.plantedAt=now;plant.mutation='';}
    else {room.plants.delete(key);if(definition.kind==='soil')room.soil.delete(key);}
  } else if(action==='favorite') {
    const key=gardenPlotKeyFor(message.tile),plant=room.plants.get(key);
    if(!plant||plant.ownerId!==player.id){gardenSendError(socket,'You can favorite your own plants.');return;}
    plant.favorite=message.favorite===true;
  } else if(action==='water') {
    const key=gardenPlotKeyFor(message.tile),plant=room.plants.get(key);
    if(!player.gear.wateringCan){gardenSendError(socket,'Buy a watering can from Gear first.');return;}
    if(!plant||plant.ownerId!==player.id){gardenSendError(socket,'Select one of your plants to water.');return;}
    if(!(player.wateringCanCharges>0)){gardenSendError(socket,'Your watering can is empty. Refill it at a pond or in the rain.');return;}
    player.wateringCanCharges--;
    plant.matureAt=Math.max(now,plant.matureAt-12000);
  } else if(action==='shovel') {
    const key=gardenPlotKeyFor(message.tile),plant=room.plants.get(key);
    if(!player.gear.shovel){gardenSendError(socket,'Buy a shovel from Gear first.');return;}
    if(!plant||plant.ownerId!==player.id){gardenSendError(socket,'Select one of your plants to remove.');return;}
    room.plants.delete(key);
    room.soil.delete(key);
  } else if(action==='sprinkler') {
    const tile=gardenTile(message.tile,player),key=tile&&gardenPlotKey(tile);
    if(!tile||tile.farmIndex!==player.farmIndex||room.plants.has(key)||room.sprinklers.has(key)||room.lanterns.has(key)){gardenSendError(socket,'Choose an empty plot on your farm for the sprinkler.');return;}
    if(!(player.gear.sprinkler>0)){gardenSendError(socket,'Buy a sprinkler from Gear first.');return;}
    room.sprinklers.add(key);room.sprinklerExpires.set(key,now+120000);player.gear.sprinkler--;
  } else if(action==='place-lantern') {
    const tile=gardenTile(message.tile,player),key=tile&&gardenPlotKey(tile);
    if(!tile||tile.farmIndex!==player.farmIndex||room.plants.has(key)||room.sprinklers.has(key)||room.lanterns.has(key)){gardenSendError(socket,'Choose an empty plot on your farm for the lantern.');return;}
    if(!(Number(player.gear.lights||0)>0)){gardenSendError(socket,'Buy Garden Lights before placing a lantern.');return;}
    player.gear.lights=Math.max(0,(Number(player.gear.lights)||0)-1);
    room.lanterns.set(key,{id:randomUUID(),farmIndex:tile.farmIndex,col:tile.col,row:tile.row,x:tile.x,z:tile.z,ownerId:player.id});
  } else if(action==='refill-water') {
    if(!player.gear.wateringCan){gardenSendError(socket,'Buy a watering can from Gear first.');return;}
    const atPond=room.ponds.some(pond=>Math.hypot(pond.x-player.x,pond.z-player.z)<=2.5);
    if(!atPond&&room.weather!=='rain'){gardenSendError(socket,'Stand by a pond or wait for rain to refill your watering can.');return;}
    player.wateringCanCharges=5;
  } else if(action==='move-plant') {
    const from=gardenTile(message.from,player),to=gardenTile(message.to,player);
    if(!player.gear.trowel){gardenSendError(socket,'Buy a trowel from Gear first.');return;}
    if(!from||!to||from.farmIndex!==player.farmIndex||to.farmIndex!==player.farmIndex||room.plants.has(gardenPlotKey(to))||room.sprinklers.has(gardenPlotKey(to))){gardenSendError(socket,'Choose an empty destination plot on your farm.');return;}
    const fromKey=gardenPlotKey(from),toKey=gardenPlotKey(to),plant=room.plants.get(fromKey);
    if(!plant||plant.ownerId!==player.id){gardenSendError(socket,'You can move your own plants.');return;}
    room.plants.delete(fromKey);
    room.plants.set(toKey,{...plant,farmIndex:to.farmIndex,col:to.col,row:to.row,x:to.x,z:to.z});
    player.gear.trowel=false;
    if(room.soil.delete(fromKey))room.soil.add(toKey);
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
  } else if(action==='cheat') {
    if(String(message.code||'').toLowerCase()!=='theyseeyou'){gardenSendError(socket,'Unknown cheat code.');return;}
    player.coins = clampGardenCoins((Number(player.coins)||0) + 10000);
  } else if(action==='dev') {
    const kind=String(message.kind||'');
    if(kind==='weather'){
      const weather=String(message.value||'clear');
      const allowed=['clear','rain','aurora','solarFlare','fireworks','rainbow','snowstorm','bloodMoon'];
      if(!allowed.includes(weather)){gardenSendError(socket,'Unknown dev weather');return;}
      room.weather=weather;room.nextWeatherAt=now+(weather==='clear'?gardenWeatherDurations.clear:gardenWeatherDurations.event);
      if(['aurora','solarFlare','fireworks','rainbow','bloodMoon'].includes(weather))gardenMutateCrops(room,weather,now);
    } else if(kind==='seed') {
      const type=String(message.id||'');if(!Object.prototype.hasOwnProperty.call(gardenPlants,type)){gardenSendError(socket,'Unknown seed type.');return;}
      gardenGrantSeed(room,player,type);
    } else if(kind==='gear') {
      const type=String(message.id||'');
      if(type==='wateringCan'){player.gear.wateringCan=true;player.wateringCanCharges=Math.max(player.wateringCanCharges||0,5);}
      else if(type==='shovel'||type==='trowel'||type==='backpack'){player.gear[type]=true;}
      else if(type==='lights'){player.gear.lights=(Number(player.gear.lights)||0)+1;}
      else if(type==='sprinkler'){player.gear.sprinkler++;}
      else if(type==='fertilizer'){player.gear.fertilizer=(Number(player.gear.fertilizer)||0)+1;}
      else {gardenSendError(socket,'Unknown dev gear type.');return;}
    } else if(kind==='coins') {
      player.coins=clampGardenCoins((Number(player.coins)||0)+Math.max(0,Number(message.amount)||0));
    } else if(kind==='zombie') {
      const angle=Math.random()*Math.PI*2;const radius=7+Math.random()*3;room.zombies.set(`dev-${now}-${Math.random()}`,{id:`dev-${now}-${Math.random()}`,x:player.x+Math.cos(angle)*radius,z:player.z+Math.sin(angle)*radius,health:40,speed:0.3+Math.random()*0.15});
    } else if(kind==='restock') {
      room.shopRestockAt=now;room.shopStock={};gardenRefreshShopStock(room,now);
    } else if(kind==='toggle-phase') {
      room.cycleStart=now-(gardenCycle.day+gardenCycle.night)/2;
    } else {
      gardenSendError(socket,'Unsupported dev action.');return;
    }
  } else if(action==='safety') {
    player.safetyOn=message.enabled===true;
  } else if(action==='reload') {
    const weapon=player.weapon,custom=player.customGuns.find(gun=>gun.id===weapon);
    if(!player.weapons[weapon]&&!custom){gardenSendError(socket,'Unlock or craft a weapon before reloading.');return;}
    const capacity=custom?.capacity||gardenWeapons[weapon]?.capacity||10;
    const loaded=player.magazines[weapon]||0,reserve=player.ammo[weapon]||0;
    if(loaded>=capacity){gardenSendError(socket,'That magazine is already full.');return;}
    if(reserve<=0){gardenSendError(socket,'No reserve ammo. Harvest a defender plant or buy ammo from Gear.');return;}
    const amount=Math.min(capacity-loaded,reserve);
    player.magazines[weapon]=loaded+amount;player.ammo[weapon]=reserve-amount;
  } else if(action==='shoot') {
    if(player.safetyOn){gardenSendError(socket,'Safety is on. Press G to switch it off before firing.');return;}
    const weapon=player.weapon,custom=player.customGuns.find(gun=>gun.id===weapon),definition=gardenWeapons[weapon];
    if(now-player.lastShot<(definition?.rate||450))return;
    if(!player.weapons[weapon]&&!custom){gardenSendError(socket,'Unlock or craft a weapon before firing.');return;}
    const range=custom?.range||definition?.range||13;
    let directionX=0,directionZ=-1;
    let zombie=room.zombies.get(String(message.target||''));
    if(!zombie){
      const direction=message.direction||{},length=Math.hypot(Number(direction.x),Number(direction.z));
      if(!Number.isFinite(length)||length<.5){gardenSendError(socket,'Aim your shot in a valid direction.');return;}
      directionX=Number(direction.x)/length;directionZ=Number(direction.z)/length;
      zombie=Array.from(room.zombies.values()).map(candidate=>{
        const offsetX=candidate.x-player.x,offsetZ=candidate.z-player.z;
        return {candidate,distance:offsetX*directionX+offsetZ*directionZ,side:Math.abs(offsetX*directionZ-offsetZ*directionX)};
      }).filter(hit=>hit.distance>0&&hit.distance<=range&&hit.side<=1.1).sort((a,b)=>a.distance-b.distance)[0]?.candidate||null;
    }
    if(zombie&&Math.hypot(zombie.x-player.x,zombie.z-player.z)>range){gardenSendError(socket,'That zombie is out of range.');return;}
    if(zombie){const distance=Math.hypot(zombie.x-player.x,zombie.z-player.z)||1;directionX=(zombie.x-player.x)/distance;directionZ=(zombie.z-player.z)/distance;}
    if(!(player.magazines[weapon]>0)){gardenSendError(socket,'Your magazine is empty. Press R to reload.');return;}
    const damage=custom?.damage||definition?.damage||18;
    player.magazines[weapon]--;player.lastShot=now;
    const blast=custom?.blast||definition?.blast||0;
    room.projectiles.push({id:randomUUID(),kind:blast?'rocket':'player',from:{x:player.x,y:1.45,z:player.z},to:{x:zombie?.x??player.x+directionX*range,y:.72,z:zombie?.z??player.z+directionZ*range},duration:320,expiresAt:now+1200});
    if(zombie&&blast){
      for(const nearby of Array.from(room.zombies.values())){
        if(Math.hypot(nearby.x-zombie.x,nearby.z-zombie.z)<blast)gardenDamageZombie(room,nearby,damage,player);
      }
    }else if(zombie)gardenDamageZombie(room,zombie,damage,player);
  } else if(action==='craft') {
    const recipe=String(message.item||'');
    if(recipe==='customGun'){
      const requested=message.components;
      const base=String(message.base||'peaBlaster');
      const partIds=['bamboo','reed','magazine','blastCorn','shell','pollen','trigger','grip','crystal'];
      if(!['peaBlaster','cornZooka'].includes(base)){
        gardenSendError(socket,'Choose a valid custom gun receiver.');return;
      }
      if(!Array.isArray(requested)||requested.length!==4||requested.some(part=>!partIds.includes(part))){
        gardenSendError(socket,'Choose exactly four plant attachments for your custom gun.');return;
      }
      const counts=Object.create(null);
      for(const part of requested)counts[part]=(counts[part]||0)+1;
      if((player.gear.fertilizer||0)<1||Object.entries(counts).some(([part,count])=>(player.parts[part]||0)<count)){
        gardenSendError(socket,'You need one fertilizer and all four selected plant attachments.');return;
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
    gardenSendError(socket,'Choose four plant attachments and one fertilizer at the workbench.');
    return;
  } else {gardenSendError(socket,'Unknown garden action.');return;}
  if(action==='plant')room.gardenHealth=gardenHealthBeforeAction;
  player.coins = clampGardenCoins(player.coins);
  gardenBroadcast(room);
}

function tickGardenRooms() {
  const now=Date.now();
  for(const room of gardenRooms.values()) {
    room.projectiles=room.projectiles.filter(projectile=>projectile.expiresAt>now);
    for(const [key,expiresAt] of room.sprinklerExpires){if(now>=expiresAt){room.sprinklerExpires.delete(key);room.sprinklers.delete(key);}}
    const offline=room.players.size===0;
    if(offline&&room.mode==='public')continue;
    const cycleLength=gardenCycle.day+gardenCycle.night;
    if(now>=room.lastDroneRun||!room.lastDroneRun){
      room.lastDroneRun=now+30000;
      for(const player of room.players.values()){
        const drones=Math.max(0,Number(player.gear?.drone)||0);
        if(drones<=0)continue;
        const options=sortedGardenPlantIds.concat(Object.keys(gardenGear).filter(id=>!['drone','farmLayer'].includes(id)));
        for(let index=0;index<drones;index++){
          const choice=options[Math.floor(Math.random()*options.length)];
          if(Object.prototype.hasOwnProperty.call(gardenPlants,choice)){
            gardenGrantSeed(room,player,choice);
          }else if(Object.prototype.hasOwnProperty.call(gardenGear,choice)){
            if(choice==='wateringCan'){player.gear.wateringCan=true;player.wateringCanCharges=Math.max(player.wateringCanCharges||0,5);}
            else if(choice==='shovel'||choice==='trowel')player.gear[choice]=true;
            else if(choice==='sprinkler')player.gear.sprinkler++;
            else if(choice==='backpack')player.gear.backpack=true;
            else if(choice==='fertilizer')player.gear.fertilizer=(player.gear.fertilizer||0)+1;
          }
        }
      }
    }
    if(now-room.cycleStart>=cycleLength) {
      const cycles=Math.floor((now-room.cycleStart)/cycleLength);
      room.cycleStart+=cycles*cycleLength;room.day+=cycles;
    }
    const elapsed=now-room.cycleStart;
    const isNight=elapsed>=gardenCycle.day;
    if(!isNight&&room.zombies.size)room.zombies.clear();
    const delta=Math.min(1000,Math.max(0,now-(room.lastTick||now)));
    room.lastTick=now;
    if(now>=room.nextWeatherAt) {
      const previous=room.weather;
      const availableWeather=gardenWeatherPool.filter(weather=>weather!==previous);
      room.weather=availableWeather[Math.floor(Math.random()*availableWeather.length)];
      room.nextWeatherAt=now+(room.weather==='clear'?gardenWeatherDurations.clear:room.weather==='bloodMoon'?gardenWeatherDurations.bloodMoon:gardenWeatherDurations.event);
      if(room.weather!==previous&&['aurora','solarFlare','fireworks','rainbow','bloodMoon'].includes(room.weather))gardenMutateCrops(room,room.weather,now);
      gardenSaveRequested=true;
    }
    if(offline) {
      for(const plant of room.plants.values())if(now<plant.matureAt&&room.weather==='rain')plant.matureAt-=delta*.5;
      if(now-room.lastBroadcast>=15000){gardenSaveRequested=true;room.lastBroadcast=now;}
      continue;
    }
    const bloodMoon=room.weather==='bloodMoon';
    if(isNight&&now-room.lastSpawn>=7000&&room.zombies.size<(bloodMoon?16:5)) {
      const angle=Math.random()*Math.PI*2;
      const radius=7+Math.random()*3,spawnX=Math.cos(angle)*radius,spawnZ=Math.sin(angle)*radius;
      const health=bloodMoon?85:40;
      const speed=bloodMoon ? 0.6 : 0.28 + Math.random() * 0.12;
      room.zombies.set(`z${room.nextZombie++}`,{id:`z${room.nextZombie-1}`,x:spawnX,z:spawnZ,health,speed});
      room.lastSpawn=now;
    }
    for(const plant of room.plants.values()) {
      const definition=gardenPlants[plant.type];
      if(definition.fruitCount&&now>=plant.matureAt&&plant.fruitsAvailable<definition.fruitCount&&now>=plant.nextFruitAt){
        plant.fruitsAvailable++;plant.nextFruitAt=plant.fruitsAvailable<definition.fruitCount?now+definition.fruitRegrow:0;
      }
      if(now<plant.matureAt&&room.weather==='rain')plant.matureAt-=delta*.5;
      if(now<plant.matureAt&&room.weather==='snowstorm')plant.matureAt+=delta*.25;
      if(now<plant.matureAt&&Array.from(room.sprinklers).some(key=>{
        const tile=gardenTileFromKey(key);
        return tile?.farmIndex===plant.farmIndex&&Math.abs(tile.col-plant.col)<=1&&Math.abs(tile.row-plant.row)<=1;
      }))plant.matureAt-=delta;
      if(definition.kind!=='defense'||!isNight||now-plant.lastAttack<definition.rate)continue;
      const target=Array.from(room.zombies.values()).filter(zombie=>Math.hypot(zombie.x-plant.x,zombie.z-plant.z)<=definition.range).sort((a,b)=>Math.hypot(a.x-plant.x,a.z-plant.z)-Math.hypot(b.x-plant.x,b.z-plant.z))[0];
      if(target){
        plant.lastAttack=now;
        room.projectiles.push({id:randomUUID(),kind:definition.blast?'rocket':'plant',from:{x:plant.x,y:.78,z:plant.z},to:{x:target.x,y:.72,z:target.z},duration:320,expiresAt:now+1200});
        if(definition.blast){
          for(const nearby of Array.from(room.zombies.values()))if(Math.hypot(nearby.x-target.x,nearby.z-target.z)<definition.blast)gardenDamageZombie(room,nearby,definition.damage,room.players.get(plant.ownerId));
        }else gardenDamageZombie(room,target,definition.damage,room.players.get(plant.ownerId));
      }
    }
    if(isNight)for(const zombie of room.zombies.values()) {
      const target=Array.from(room.plants.values()).sort((a,b)=>Math.hypot(zombie.x-a.x,zombie.z-a.z)-Math.hypot(zombie.x-b.x,zombie.z-b.z))[0];
      if(target&&Math.hypot(zombie.x-target.x,zombie.z-target.z)<.65) {
        target.health-=delta*.006;
        if(target.health<=0){const key=gardenPlotKey(target);room.plants.delete(key);room.soil.delete(key);}
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

const server = http.createServer(async (req, res) => {
  const requestUrl=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
  const reqPath=decodeURIComponent(requestUrl.pathname);
  if(reqPath.startsWith('/api/garden/auth/')){
    const route=reqPath.slice('/api/garden/auth/'.length);
    try{await handleGardenAuthRequest(req,res,route);}
    catch(error){console.error('Gardenfall authentication request failed:',error);if(!res.headersSent)sendGardenApiJson(res,500,{error:'Gardenfall authentication failed. Please try again.'});}
    return;
  }
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

  if(reqPath.split('/').some(segment=>segment.startsWith('.'))){
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('Not found');
    return;
  }

  if (reqPath === '/rally.html' || reqPath === '/rally.css' || reqPath === '/rally.js') {
    res.writeHead(301, { Location: '/garden-siege.html' });
    res.end();
    return;
  }

  const safePath = reqPath === '/' ? '/garden-siege.html' : reqPath;
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
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const isStaticAppAsset = ['.html', '.js', '.css', '.json'].includes(ext);
    const headers = {
      'Content-Type': contentType,
    };
    if (isStaticAppAsset) {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }
    res.writeHead(200, headers);
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

Promise.all([loadGardenSaves(),loadGardenAccounts()]).then(()=>{
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
