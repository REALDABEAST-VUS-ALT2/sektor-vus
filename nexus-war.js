(() => {
  const sharedPath = 'nexus/sharedWorld';
  const gamePath = sharedPath + '/war';
  const sessionKey = 'blobtownSession';
  const localWorldKey = 'blobtownEconomy';
  const localGameKey = 'nexusWarGame';
  const arenaVersion=3;
  const mapScale=6;
  const worldWidth=3000*mapScale;
  const worldHeight=1500*mapScale;
  const basePositions={vortex:{x:150*mapScale,y:750*mapScale},krypton:{x:2850*mapScale,y:750*mapScale}};
  const safeZoneRadius=380;
  const vehiclePadOffsets={
    scout_bike:{x:200,y:-220,label:'BIKE'},
    assault_rover:{x:270,y:-75,label:'ROVER'},
    tank:{x:270,y:75,label:'TANK'},
    anti_air:{x:200,y:220,label:'ANTI-AIR'},
    transport_helicopter:{x:0,y:285,label:'HELICOPTER'}
  };
  const lanMode = new URLSearchParams(location.search).get('lan') === '1';
  const firebaseApi = globalThis.firebase;
  const firebaseMode = !lanMode && !!(firebaseApi && firebaseApi.apps && firebaseApi.apps.length);
  const weapons = {
    ar_pulse:{name:'Pulse AR',type:'Assault rifle',damage:22,rate:180,mag:30,range:680,spread:.035,reload:1500,level:1},
    ar_bulldog:{name:'Bulldog 7.62',type:'Assault rifle',damage:31,rate:290,mag:24,range:620,spread:.05,reload:1750,level:5},
    smg_kestrel:{name:'Kestrel SMG',type:'Submachine gun',damage:14,rate:90,mag:36,range:430,spread:.075,reload:1350,level:10},
    smg_vector:{name:'Vector-9',type:'Submachine gun',damage:11,rate:65,mag:45,range:390,spread:.09,reload:1450,level:18},
    sniper_longshot:{name:'Longshot',type:'Sniper rifle',damage:82,rate:950,mag:5,range:1000,spread:.006,reload:2300,level:25},
    sniper_rail:{name:'Rail sniper',type:'Sniper rifle',damage:67,rate:700,mag:7,range:1000,spread:.008,reload:2100,level:32},
    special_rpg:{name:'RPG-4',type:'Special',damage:115,rate:1300,mag:2,range:760,spread:.018,reload:2800,radius:95,level:40},
    special_xeno:{name:'Xenophage',type:'Special',damage:38,rate:370,mag:18,range:600,spread:.025,reload:1900,level:55}
  };
  const attachments = {
    control_grip:{name:'Angled control grip',effect:'Better recoil control',spread:.68,cost:250},
    control_comp:{name:'Compensator',effect:'Better recoil control',spread:.78,cost:350},
    laser_red:{name:'Red laser',effect:'Tighter hip-fire aim',spread:.72,cost:300},
    laser_tac:{name:'Tactical laser',effect:'Tighter hip-fire aim',spread:.82,cost:400},
    mag_extended:{name:'Extended magazine',effect:'Larger magazine',mag:1.5,cost:500},
    mag_fast:{name:'Fast magazine',effect:'Faster reload',reload:.68,cost:450}
  };
  const vehicles = {
    scout_bike:{name:'Scout bike',speed:2.4,color:'#d8c76f'},
    assault_rover:{name:'Assault rover',speed:3.3,color:'#b8836e'},
    tank:{name:'Battle tank',speed:2.6,color:'#71836e'},
    anti_air:{name:'Anti-air',speed:2.9,color:'#8da1a4'},
    transport_helicopter:{name:'Transport helicopter',speed:3.2,color:'#8da1a4'}
  };
  const vehicleWeapons={
    tank:{name:'Tank cannon',mag:8,damage:125,rate:1100,range:1250,spread:.012,reload:3200},
    anti_air:{name:'Anti-air cannon',mag:16,damage:28,rate:260,range:1350,spread:.02,reload:2600,aircraftDamage:125}
  };
  const transportType='transport_helicopter';
  const transportName='Transport helicopter';
  const largeBuildings=[
    {id:'west-warehouse-a',x:330,y:300,w:240,h:190},
    {id:'west-warehouse-b',x:455,y:515,w:285,h:180},
    {id:'west-office-a',x:700,y:230,w:205,h:245},
    {id:'west-office-b',x:970,y:220,w:280,h:185},
    {id:'west-depot',x:1090,y:485,w:330,h:205},
    {id:'north-district-a',x:1250,y:130,w:230,h:190},
    {id:'north-district-b',x:1510,y:205,w:300,h:220},
    {id:'north-district-c',x:1790,y:145,w:220,h:270},
    {id:'north-district-d',x:2050,y:230,w:320,h:190},
    {id:'north-district-e',x:2370,y:285,w:250,h:220},
    {id:'east-yard-a',x:2440,y:580,w:315,h:190},
    {id:'east-yard-b',x:2570,y:840,w:240,h:265},
    {id:'east-yard-c',x:2250,y:1010,w:305,h:205},
    {id:'south-district-a',x:1960,y:1200,w:275,h:205},
    {id:'south-district-b',x:1650,y:1190,w:330,h:185},
    {id:'south-district-c',x:1360,y:1280,w:250,h:175},
    {id:'south-depot',x:1040,y:1050,w:320,h:220},
    {id:'south-office-a',x:730,y:1190,w:235,h:220},
    {id:'south-office-b',x:480,y:980,w:300,h:190},
    {id:'central-yard-a',x:780,y:690,w:250,h:190},
    {id:'central-yard-b',x:1080,y:780,w:295,h:190},
    {id:'central-office-a',x:1640,y:650,w:260,h:190},
    {id:'central-office-b',x:1930,y:710,w:310,h:200},
    {id:'central-warehouse',x:2250,y:690,w:270,h:190}
  ].map(building=>({...building,type:'building'}));
  const obstacles=[
    {id:'north-home-a',x:650,y:220,w:130,h:110,type:'house',enterable:true,doorX:780,doorY:275},
    {id:'north-home-b',x:1080,y:300,w:150,h:120,type:'house',enterable:false},
    {id:'north-barrier-a',x:760,y:565,w:210,h:32,type:'barrier'},
    {id:'north-barrier-b',x:1030,y:185,w:180,h:32,type:'barrier'},
    {id:'yard-home-a',x:1280,y:560,w:140,h:120,type:'house',enterable:true,doorX:1420,doorY:620},
    {id:'yard-home-b',x:1625,y:825,w:145,h:120,type:'house',enterable:false},
    {id:'yard-barrier-a',x:1320,y:930,w:270,h:34,type:'barrier'},
    {id:'yard-barrier-b',x:1660,y:560,w:220,h:34,type:'barrier'},
    {id:'south-home-a',x:1880,y:890,w:150,h:125,type:'house',enterable:true,doorX:2030,doorY:950},
    {id:'south-home-b',x:2240,y:1150,w:140,h:115,type:'house',enterable:false},
    {id:'south-barrier-a',x:1930,y:1260,w:230,h:34,type:'barrier'},
    {id:'south-barrier-b',x:2280,y:860,w:205,h:34,type:'barrier'},
    ...largeBuildings
  ].map(item=>({...item,x:item.x*mapScale,y:item.y*mapScale,
    ...(item.doorX==null?{}:{doorX:item.doorX*mapScale}),
    ...(item.doorY==null?{}:{doorY:item.doorY*mapScale})}));
  const xpPerLevel=1000;
  const nodePositions = {
    north:{x:900*mapScale,y:420*mapScale,label:'NORTH RELAY'},
    mid:{x:1500*mapScale,y:750*mapScale,label:'SCRAP YARD'},
    south:{x:2100*mapScale,y:1080*mapScale,label:'SOUTH RELAY'}
  };
  const fixedLootLocations={
    north_cache:{x:900,y:520},
    refinery_cache:{x:1500,y:500},
    central_cache:{x:1700,y:1000},
    south_cache:{x:850,y:1000},
    east_cache:{x:2400,y:1300},
    ridge_cache:{x:1600,y:520}
  };
  const randomLootLocations=[
    {x:900,y:520},{x:1500,y:500},{x:1700,y:1000},
    {x:850,y:1000},{x:2400,y:1300},{x:1600,y:520}
  ].map(location=>({x:location.x*mapScale,y:location.y*mapScale}));
  let container = null;
  let ui = null;
  let warRef = null;
  let warState = null;
  let playerKey = '';
  let playerName = '';
  let playerTeam = '';
  let accountData = null;
  let teamLookup = null;
  let animation = 0;
  let incomeTimer = 0;
  let lootTimer=0;
  let heartbeatTimer = 0;
  let refreshTimer = 0;
  let lastPositionWrite = 0;
  let lastShot = 0;
  let reloading = false;
  let captureBusy = false;
  let captureTimer = 0;
  let captureTarget = '';
  let captureStartedAt = 0;
  let captureDuration = 0;
  let vehicleActionBusy=false;
  let localPosition = null;
  let positionWriteBusy = false;
  let movementVelocity={x:0,y:0};
  const renderPositions=new Map();
  let stockTimer = 0;
  let marketHistory = [];
  let reloadTimer=0;
  let reloadEndsAt=0;
  let turretTimer=0;
  let activeDrone=false;
  let droneControlled=true;
  let heldGiveUpTimer=0;
  let giveUpInterval=0;
  let houseInside='';
  let localDronePosition=null;
  let localTransportId='';
  let cameraPosition={x:0,y:0};
  let lastDroneWriteAt=0;
  let giveUpBusy=false;
  let keys = new Set();
  let aim = {x:500,y:280};
  let traces = [];
  let pointerDown = false;
  let spectatorContainer=null;
  let spectatorUi=null;
  let spectatorWarState=null;
  let spectatorRef=null;
  let spectatorEvents=null;
  let spectatorTimer=0;
  let spectatorAnimation=0;
  let spectatorGeneration=0;
  let spectatorSelectedKey='';
  const spectatorPositions=new Map();
  let destroyed = false;
  let respawnBusy = false;
  let lastStatsMarkup = '';
  let lastResetLabel = '';

  function weekKey(date = new Date()) {
    const target = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
    const weekday = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - weekday);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(),0,1));
    const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
    return target.getUTCFullYear() + '-W' + String(week).padStart(2,'0');
  }

  async function toggleFullscreen() {
    if (!container||!ui?.fullscreen) return;
    try {
      if (document.fullscreenElement===container) await document.exitFullscreen();
      else if (container.requestFullscreen) await container.requestFullscreen();
      else setStatus('Fullscreen is not supported by this browser.',true);
    } catch(error) {
      setStatus(error.message||'Could not change fullscreen mode.',true);
    }
  }

  function updateFullscreenButton() {
    if (!ui?.fullscreen) return;
    const isFullscreen=document.fullscreenElement===container;
    ui.fullscreen.textContent=isFullscreen?'Exit fullscreen':'Fullscreen';
    ui.fullscreen.setAttribute('aria-pressed',String(isFullscreen));
  }

  async function hitTurret(id,damage) {
    let destroyedTurret=false;
    await updateWar('turrets/'+id,turret=>{
      destroyedTurret=false;
      if (!turret) return turret;
      const hp=Math.max(0,Number(turret.hp)-damage);
      destroyedTurret=hp===0;
      return {...turret,hp};
    });
    if (destroyedTurret) setStatus('Enemy sentry destroyed.');
  }

  function freshWar() {
    return {
      arenaVersion,
      week:weekKey(),
      players:{},
      nodes:Object.fromEntries(Object.entries(nodePositions).map(([id,node]) => [id,{team:'',owner:'',capturedAt:0}])),
      bases:{
        vortex:{health:1200,destroyedUntil:0},
        krypton:{health:1200,destroyedUntil:0}
      },
      economy:{
        vortex:{resources:0,lastIncomeAt:Date.now()},
        krypton:{resources:0,lastIncomeAt:Date.now()}
      },
      economyClock:Date.now(),
      sekoriumPayoutAt:Date.now(),
      matchResetAt:0,
      vehicles:{},
      turrets:{},
      drones:{},
      smokes:{},
      claymores:{},
      grenades:{},
      lootBoxes:Object.fromEntries(Object.entries(fixedLootLocations).map(([id,position])=>[id,{
        id,type:'fixed',x:position.x*mapScale,y:position.y*mapScale,available:true,respawnAt:0
      }])),
      nextRandomLootAt:Date.now()+45_000
    };
  }

  function safeUserKey(name) {
    return String(name || '').toLowerCase().replace(/[.#$\[\]/]/g,'_').slice(0,32);
  }

  function requestUrl(path) {
    return '/api/data?path=' + encodeURIComponent(path);
  }

  function normalizeProgress(value) {
    const owned=Array.isArray(value && value.ownedAttachments)
      ? [...new Set(value.ownedAttachments.filter(id=>Object.prototype.hasOwnProperty.call(attachments,id)))]
      : [];
    const xp=Math.max(0,Math.min(54*xpPerLevel,Math.floor(Number(value && value.xp)||0)));
    return {xp,level:Math.min(55,Math.floor(xp/xpPerLevel)+1),ownedAttachments:owned};
  }

  function accountWorldFromLocal() {
    try {
      const value=JSON.parse(localStorage.getItem(localWorldKey)||'null');
      if (!value || !Array.isArray(value.users)) throw new Error('No saved Nexus account was found in this browser.');
      return value;
    } catch(error) {
      throw new Error(error.message||'Could not read the saved Nexus account.');
    }
  }

  function accountFor(world,username=playerName) {
    const users=Array.isArray(world && world.users)?world.users:
      world && world.users && typeof world.users==='object'?Object.values(world.users):[];
    const user=users.find(entry=>entry && String(entry.username).toLowerCase()===String(username).toLowerCase());
    if (!user) throw new Error('Your Nexus account could not be found. Connect to Nexus and try again.');
    return user;
  }

  async function readAccountWorld() {
    if (firebaseMode) {
      const snapshot=await firebaseApi.database().ref(sharedPath).get();
      if (!snapshot.exists()) throw new Error('The shared Nexus world is not available.');
      return snapshot.val();
    }
    if (lanMode) {
      const response=await fetch(requestUrl(sharedPath));
      if (!response.ok) throw new Error((await response.text())||'Could not read the shared Nexus account.');
      return response.json();
    }
    return accountWorldFromLocal();
  }

  async function updateAccount(updater,username=playerName) {
    if (firebaseMode) {
      const usersSnapshot=await firebaseApi.database().ref(sharedPath+'/users').get();
      const users=usersSnapshot.val();
      const entries=Array.isArray(users)?users.map((user,index)=>[String(index),user]):
        users&&typeof users==='object'?Object.entries(users):[];
      const entry=entries.find(([,user])=>user&&String(user.username).toLowerCase()===String(username).toLowerCase());
      if (!entry) throw new Error('Your Nexus account could not be found. Reconnect to Nexus and try again.');
      const result=await firebaseApi.database().ref(sharedPath+'/users/'+entry[0]).transaction(current=>{
        if (!current||typeof current!=='object') return;
        const next=JSON.parse(JSON.stringify(current));
        updater(next);
        return next;
      });
      if (!result.committed) throw new Error('Firebase cancelled the account update. Check your connection and retry the purchase.');
      const user=result.snapshot.val();
      if (String(username).toLowerCase()===playerName.toLowerCase()) accountData=user;
      return user;
    }
    const next=await readAccountWorld();
    const user=accountFor(next,username);
    updater(user);
    if (lanMode) {
      const response=await fetch(requestUrl(sharedPath),{
        method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)
      });
      if (!response.ok) throw new Error((await response.text())||'Could not save the shared Nexus account.');
    } else localStorage.setItem(localWorldKey,JSON.stringify(next));
    if (String(username).toLowerCase()===playerName.toLowerCase()) accountData=user;
    return user;
  }

  async function updateAccountByName(username,updater) {
    return updateAccount(updater,username);
  }

  async function refreshAccount() {
    accountData=accountFor(await readAccountWorld());
    accountData.dropzone=normalizeProgress(accountData.dropzone);
    return accountData;
  }

  async function grantXp(amount,reason) {
    return grantXpByName(playerName,amount,reason);
  }

  async function grantXpByName(username,amount,reason) {
    const awarded=Math.max(0,Math.floor(amount));
    if (!awarded) return;
    const own=String(username).toLowerCase()===playerName.toLowerCase();
    const before=own?normalizeProgress(accountData.dropzone).level:0;
    await updateAccountByName(username,user=>{
      const progress=normalizeProgress(user.dropzone);
      progress.xp=Math.min(54*xpPerLevel,progress.xp+awarded);
      progress.level=Math.min(55,Math.floor(progress.xp/xpPerLevel)+1);
      user.dropzone=progress;
    });
    if (own) {
      accountData.dropzone=normalizeProgress(accountData.dropzone);
      const levelMessage=accountData.dropzone.level>before?' Level up: level '+accountData.dropzone.level+'!':'';
      setStatus('+'+awarded+' XP · '+reason+'.'+levelMessage);
      refreshProgressUi();
      draw();
    }
  }

  async function lanGet() {
    const response = await fetch(requestUrl(gamePath));
    if (!response.ok) throw new Error((await response.text()) || 'Could not connect to the shared war game.');
    return response.status === 204 ? null : response.json();
  }

  async function lanPut(value) {
    const response = await fetch(requestUrl(gamePath),{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(value)
    });
    if (!response.ok) throw new Error((await response.text()) || 'Could not save war-game state.');
  }

  async function lanPutAt(path,value) {
    const response=await fetch(requestUrl(path),{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(value)
    });
    if (!response.ok) throw new Error((await response.text())||'Could not save the war update.');
  }

  function normalizeWar(value) {
    const base = freshWar();
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.week !== base.week) return base;
    const sourceVersion=Number(value.arenaVersion||1);
    const legacyArena=sourceVersion<2;
    const legacyMap=sourceVersion<arenaVersion;
    const players=value.players&&typeof value.players==='object'?value.players:{};
    const scaleRecord=record=>{
      if (!record||!legacyMap) return record;
      const oldX=Number(record.x)||0;
      const oldY=Number(record.y)||0;
      return {...record,x:(legacyArena?oldX*3:oldX)*mapScale,
        y:(legacyArena?oldY*(1500/560):oldY)*mapScale};
    };
    const scaleCollection=collection=>Object.fromEntries(Object.entries(collection||{})
      .map(([key,item])=>[key,scaleRecord(item)]));
    return {
      ...base,
      ...value,
      arenaVersion,
      players:Object.fromEntries(Object.entries(players).map(([key,player])=>[key,player?{
        armorPlates:0,armorHp:0,selfRevives:0,droneCharges:0,turretCharges:0,
        smokeCharges:2,stimCharges:2,grenadeCharges:2,claymoreCharges:1,
        tactical:'smoke',lethal:'grenade',downed:false,downedAt:0,vehiclePad:'',vehicleAmmo:0,
        ...player,...(legacyMap?scaleRecord(player):{}),
        vehicleAmmo:vehicleWeapons[player.vehicle]
          ?Math.max(0,Math.min(vehicleWeapons[player.vehicle].mag,
            Math.floor(Number(player.vehicleAmmo??vehicleWeapons[player.vehicle].mag)||0))):0,
        vehiclePad:player.vehiclePad||(!player.transportId&&vehiclePadOffsets[player.vehicle]
          ?(player.team||'vortex')+'_'+player.vehicle:'')
      }:player])),
      nodes:{...base.nodes,...(value.nodes || {})},
      bases:{...base.bases,...(value.bases || {})},
      economy:{...base.economy,...(value.economy || {})},
      lootBoxes:{...base.lootBoxes,...(value.lootBoxes||{})},
      nextRandomLootAt:Number(value.nextRandomLootAt)||base.nextRandomLootAt,
      vehicles:Object.fromEntries(Object.entries(scaleCollection(value.vehicles))
        .map(([id,vehicle])=>[id,vehicle&&vehicle.type===transportType
          ?{...vehicle,passengers:Array.isArray(vehicle.passengers)?vehicle.passengers:[]}:vehicle])),
      turrets:scaleCollection(value.turrets),
      drones:scaleCollection(value.drones),
      smokes:scaleCollection(value.smokes),
      claymores:scaleCollection(value.claymores),
      grenades:scaleCollection(value.grenades)
    };
  }

  async function getPlayerTeam(name) {
    if (firebaseMode) {
      const snapshot = await firebaseApi.database().ref(sharedPath + '/users').get();
      const users = snapshot.val() || [];
      const user = Array.isArray(users)
        ? users.find(entry => entry && String(entry.username).toLowerCase() === name.toLowerCase())
        : Object.values(users).find(entry => entry && String(entry.username).toLowerCase() === name.toLowerCase());
      return user && user.team;
    }
    if (lanMode) {
      const response = await fetch(requestUrl(sharedPath));
      if (!response.ok) throw new Error((await response.text()) || 'Could not read your Nexus team.');
      const data = await response.json();
      const users = data && Array.isArray(data.users) ? data.users : [];
      const user = users.find(entry => entry && String(entry.username).toLowerCase() === name.toLowerCase());
      return user && user.team;
    }
    const data = JSON.parse(localStorage.getItem(localWorldKey) || 'null');
    const user = data && Array.isArray(data.users)
      ? data.users.find(entry => entry && String(entry.username).toLowerCase() === name.toLowerCase())
      : null;
    return user && user.team;
  }

  function setStatus(message, error = false) {
    if (!ui || !ui.status) return;
    ui.status.textContent = message;
    ui.status.classList.toggle('error',error);
  }

  function safeZoneFor(team) {
    const center=basePositions[team];
    return center?{x:center.x,y:center.y,radius:safeZoneRadius,team}:null;
  }

  function safeZoneAt(x,y) {
    return ['vortex','krypton'].map(safeZoneFor)
      .find(zone=>zone&&Math.hypot(x-zone.x,y-zone.y)<zone.radius)||null;
  }

  function isInOwnSafeZone(team,x,y) {
    const zone=safeZoneAt(x,y);
    return !!zone&&zone.team===team;
  }

  function isInEnemySafeZone(team,x,y) {
    const zone=safeZoneAt(x,y);
    return !!zone&&zone.team!==team;
  }

  function vehiclePadPosition(team,type) {
    const offset=vehiclePadOffsets[type];
    const base=basePositions[team];
    if (!offset||!base) return null;
    const direction=team==='vortex'?1:-1;
    return {x:base.x+offset.x*direction,y:base.y+offset.y};
  }

  function playerDefaults() {
    const initial={weapon:'ar_pulse',attachments:[],tactical:'smoke',lethal:'grenade'};
    const spawn=basePositions[playerTeam];
    return {
      name:playerName,team:playerTeam,x:playerTeam==='vortex'?spawn.x+150:spawn.x-150,y:spawn.y,
      hp:100,ammo:effectiveWeapon(initial).mag,kills:0,deaths:0,...initial,loadoutSet:false,
      vehiclePad:'',vehicleAmmo:0,
      armorPlates:0,armorHp:0,selfRevives:0,droneCharges:0,turretCharges:0,
      smokeCharges:2,stimCharges:2,grenadeCharges:2,claymoreCharges:1,
      downed:false,downedAt:0,
      online:true,lastSeen:Date.now(),
      respawnAt:0,lastShotAt:0
    };
  }

  function firebasePlayerRef(key = playerKey) {
    return warRef.child('players').child(key);
  }

  async function initializeGame() {
    if (firebaseMode) {
      await firebaseApi.auth().signInAnonymously().catch(error => {
        if (firebaseApi.auth().currentUser) return;
        throw error;
      });
      warRef = firebaseApi.database().ref(gamePath);
      const initialized = await warRef.transaction(current =>
        !current || current.week !== weekKey() ? freshWar() :
          Number(current.arenaVersion||1)<arenaVersion?{...current,...normalizeWar(current)}:current
      );
      if (!initialized.committed && !initialized.snapshot.exists()) throw new Error('Could not initialize the weekly war.');
      warState = normalizeWar(initialized.snapshot.val());
      warRef.on('value', snapshot => {
        if (destroyed || !snapshot.exists()) return;
        const value = snapshot.val();
        if (!value || value.week !== weekKey()) {
          warRef.transaction(current => !current || current.week !== weekKey() ? freshWar() : current)
            .catch(error=>setStatus('Could not reset the weekly war: '+error.message,true));
          return;
        }
        if (Number(value.arenaVersion||1)<arenaVersion) {
          warRef.transaction(current=>current&&Number(current.arenaVersion||1)<arenaVersion
            ?{...current,...normalizeWar(current)}:current)
            .catch(error=>setStatus('Could not expand the frontline map: '+error.message,true));
          return;
        }
        acceptWarState(value);
      }, error => setStatus('Live war updates disconnected: ' + error.message,true));
      await firebasePlayerRef().onDisconnect().update({online:false});
    } else if (lanMode) {
      const saved = await lanGet();
      warState = normalizeWar(saved);
      if (!saved || saved.week !== weekKey()||Number(saved.arenaVersion||1)<arenaVersion) await lanPut(warState);
      const events = new EventSource('/api/events?path=' + encodeURIComponent(gamePath));
      events.onmessage = event => {
        try {
          const value=JSON.parse(event.data);
          acceptWarState(value);
        } catch (error) {
          setStatus('A live war update could not be read.',true);
        }
      };
      events.onerror = () => setStatus('Live war updates disconnected. Reconnecting…',true);
      warRef = events;
      refreshTimer = window.setInterval(async () => {
        try {
          const value=await lanGet();
          acceptWarState(value);
        } catch (error) { setStatus(error.message,true); }
      },5000);
    } else {
      const saved = JSON.parse(localStorage.getItem(localGameKey) || 'null');
      warState = normalizeWar(saved);
      if (!saved || saved.week !== weekKey()||Number(saved.arenaVersion||1)<arenaVersion) localStorage.setItem(localGameKey,JSON.stringify(warState));
      window.addEventListener('storage',onLocalWarStorage);
    }
    await refreshAccount();
    const activePlayer=await mutatePlayer(player => {
      const initial = playerDefaults();
      const level=accountData.dropzone.level;
      const selectedWeapon=player && weapons[player.weapon] && weapons[player.weapon].level<=level
        ? player.weapon : initial.weapon;
      const selectedAttachments=(player && Array.isArray(player.attachments)?player.attachments:[])
        .filter(id=>accountData.dropzone.ownedAttachments.includes(id));
      const selectedMag=effectiveWeapon({weapon:selectedWeapon,attachments:selectedAttachments}).mag;
      return {...initial,...(player || {}),name:playerName,team:playerTeam,
        weapon:selectedWeapon,attachments:selectedAttachments,
        ammo:player && selectedWeapon===player.weapon?Math.min(Number(player.ammo)||0,selectedMag):selectedMag,
        online:true,lastSeen:Date.now()};
    });
    localPosition={x:Number(activePlayer.x),y:Number(activePlayer.y)};
    cameraPosition={...localPosition};
    refreshProgressUi();
    updateHeader();
    startLoops();
  }

  function onLocalWarStorage(event) {
    if (event.key !== localGameKey || !event.newValue) return;
    try { acceptWarState(JSON.parse(event.newValue)); }
    catch (error) { setStatus('A saved war update could not be loaded.',true); }
  }

  function acceptWarState(value) {
    const previousWeek=warState && warState.week;
    const previousReset=Number(warState&&warState.matchResetAt||0);
    const stale=!value || value.week!==weekKey();
    warState=normalizeWar(value);
    if (stale) {
      if (lanMode) lanPut(warState).catch(error=>setStatus(error.message,true));
      else if (!firebaseMode) localStorage.setItem(localGameKey,JSON.stringify(warState));
    }
    if (previousWeek && previousWeek!==warState.week && playerKey && playerTeam) {
      cancelCapture('Weekly match reset. Capture cancelled.');
      mutatePlayer(()=>playerDefaults()).then(player=>{
        localPosition={x:Number(player.x),y:Number(player.y)};
        if (ui) updateHeader();
      }).catch(error=>setStatus(error.message,true));
    } else if (Number(warState.matchResetAt||0)>previousReset&&playerKey) {
      cancelCapture('Match restarted. Capture cancelled.');
      const player=warState.players[playerKey];
      if (player) {
        localPosition={x:Number(player.x),y:Number(player.y)};
        movementVelocity={x:0,y:0};
        if (ui) updateHeader();
      }
    }
    draw();
  }

  async function updateWar(path, updater) {
    if (firebaseMode) {
      const result = await warRef.child(path).transaction(current => updater(current));
      return result.snapshot.val();
    }
    if (lanMode) {
      const itemPath=gamePath+'/'+path;
      const response=await fetch(requestUrl(itemPath));
      if (!response.ok) throw new Error((await response.text())||'Could not read the war update.');
      const current=response.status===204?null:await response.json();
      const next=updater(current);
      await lanPutAt(itemPath,next);
      warState=normalizeWar(await lanGet());
      draw();
      return next;
    }
    const latest = normalizeWar(JSON.parse(localStorage.getItem(localGameKey) || 'null'));
    const segments = path.split('/');
    let parent = latest;
    for (const segment of segments.slice(0,-1)) parent = parent[segment] || (parent[segment] = {});
    const key = segments[segments.length - 1];
    parent[key] = updater(parent[key]);
    warState = latest;
    localStorage.setItem(localGameKey,JSON.stringify(latest));
    draw();
    return parent[key];
  }

  async function mutatePlayer(updater) {
    const result = await updateWar('players/' + playerKey,updater);
    if (warState) warState.players[playerKey] = result;
    return result;
  }

  function effectiveWeapon(player) {
    const weapon = weapons[player && player.weapon] || weapons.ar_pulse;
    const mods = (player && Array.isArray(player.attachments) ? player.attachments : [])
      .map(id => attachments[id]).filter(Boolean);
    return {
      ...weapon,
      spread:weapon.spread * mods.reduce((value,mod) => value * (mod.spread || 1),1),
      mag:Math.round(weapon.mag * mods.reduce((value,mod) => value * (mod.mag || 1),1)),
      reload:Math.round(weapon.reload * mods.reduce((value,mod) => value * (mod.reload || 1),1))
    };
  }

  function startLoops() {
    if (animation) cancelAnimationFrame(animation);
    if (incomeTimer) clearInterval(incomeTimer);
    if (turretTimer) clearInterval(turretTimer);
    if (lootTimer) clearInterval(lootTimer);
    if (reloadTimer) clearTimeout(reloadTimer);
    if (giveUpInterval) clearTimeout(giveUpInterval);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    animation = requestAnimationFrame(gameFrame);
    incomeTimer = window.setInterval(()=>
      Promise.all([generateTeamResources(),payoutSektorium()])
        .catch(error=>setStatus(error.message||'Resource updates failed.',true)),5000);
    turretTimer=window.setInterval(()=>updateTurrets()
      .then(updateClaymores)
      .catch(error=>setStatus(error.message||'Field equipment update failed.',true)),500);
    lootTimer=window.setInterval(()=>updateLootBoxes()
      .catch(error=>setStatus(error.message||'Loot crates could not be refreshed.',true)),5000);
    heartbeatTimer = window.setInterval(()=>
      mutatePlayer(player=>player?{...player,online:true,lastSeen:Date.now()}:player)
        .catch(error=>setStatus(error.message,true)),5000);
    window.addEventListener('keydown',onKeyDown);
    window.addEventListener('keyup',onKeyUp);
    window.addEventListener('blur',onBlur);
    ui.canvas.addEventListener('pointermove',onPointerMove);
    ui.canvas.addEventListener('pointerdown',onPointerDown);
    ui.canvas.addEventListener('pointerup',onPointerUp);
    ui.canvas.addEventListener('pointercancel',onPointerUp);
    container.addEventListener('pointerdown',onControlPointerDown);
    container.addEventListener('pointerup',onControlPointerUp);
    container.addEventListener('pointercancel',onControlPointerUp);
    container.addEventListener('pointerleave',onControlPointerUp);
    ui.form.addEventListener('submit',equipLoadout);
    ui.reload.addEventListener('click',reloadWeapon);
    document.addEventListener('click',onActionClick);
    document.addEventListener('fullscreenchange',updateFullscreenButton);
    window.addEventListener('pagehide',markOffline,{once:true});
  }

  function gameFrame(timestamp) {
    if (destroyed || !ui || !ui.canvas.isConnected) return;
    const player = warState && warState.players[playerKey];
    if (player&&player.transportId!==localTransportId) {
      localTransportId=player.transportId||'';
      const transport=localTransportId&&warState.vehicles[localTransportId];
      if (transport) localPosition={x:Number(transport.x),y:Number(transport.y)};
      else if (player.x!=null&&player.y!=null) {
        localPosition={x:Number(player.x),y:Number(player.y)};
        movementVelocity={x:0,y:0};
      }
    }
    if (warState&&warState.drones&&warState.drones[playerKey]&&!activeDrone) {
      activeDrone=true;
      droneControlled=!!warState.drones[playerKey].manual;
      lastDroneWriteAt=Date.now();
    }
    if (player && player.hp<=0 && !player.downed && player.respawnAt<=Date.now() && !respawnBusy) {
      respawnBusy=true;
      const spawn=basePositions[playerTeam];
      const respawn={x:playerTeam==='vortex'?spawn.x+150:spawn.x-150,y:spawn.y};
      mutatePlayer(current=>current?{...current,hp:100,
        ...respawn,vehicle:'',ammo:effectiveWeapon(current).mag,
        smokeCharges:2,stimCharges:2,grenadeCharges:2,claymoreCharges:1,
        respawnAt:0,online:true,lastSeen:Date.now()}:current)
        .then(()=>{localPosition=respawn;})
        .catch(error=>setStatus(error.message,true))
        .finally(()=>{respawnBusy=false;});
    }
    if (player && player.downed && Date.now()-Number(player.downedAt||0)>=30000) giveUp();
    if (player && !localPosition) {
      localPosition={x:Number(player.x),y:Number(player.y)};
      houseInside=String(player.houseInside||'');
    }
    if (player && player.online && player.hp>0 && !player.downed && !activeDrone && player.respawnAt<=Date.now() && !reloading && !captureBusy) {
      const elapsed=Math.min(.05,Math.max(0,(timestamp-(gameFrame.lastFrame||timestamp))/1000));
      const transport=player.transportId&&warState.vehicles&&warState.vehicles[player.transportId];
      const pilot=transport&&transport.pilot===playerKey;
      const vehicle=vehicles[player.vehicle];
      const topSpeed=1700*(vehicle?vehicle.speed:1)*(Number(player.speedBoostUntil||0)>Date.now()?1.8:1);
      const canDrive=!player.transportId||pilot;
      const dx=canDrive?((keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)):0;
      const dy=canDrive?((keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)):0;
      if (pilot&&!dx&&!dy) localPosition={x:Number(transport.x),y:Number(transport.y)};
      const length=Math.hypot(dx,dy)||1;
      const ease=1-Math.exp(-30*elapsed);
      movementVelocity.x+=(dx/length*topSpeed-movementVelocity.x)*ease;
      movementVelocity.y+=(dy/length*topSpeed-movementVelocity.y)*ease;
      const next={x:Math.max(70,Math.min(worldWidth-70,localPosition.x+movementVelocity.x*elapsed)),
        y:Math.max(110,Math.min(worldHeight-110,localPosition.y+movementVelocity.y*elapsed))};
      const house=houseInside&&obstacles.find(item=>item.id===houseInside);
      if (house) {
        localPosition.x=Math.max(house.x+24,Math.min(house.x+house.w-24,next.x));
        localPosition.y=Math.max(house.y+24,Math.min(house.y+house.h-24,next.y));
      } else if (isInEnemySafeZone(playerTeam,next.x,next.y)) {
        movementVelocity={x:0,y:0};
        setStatus('That base is protected for the opposing team.');
      } else if (!pilot) {
        const distance=Math.hypot(next.x-localPosition.x,next.y-localPosition.y);
        const steps=Math.max(1,Math.ceil(distance/24));
        const start={...localPosition};
        for (let step=1;step<=steps;step++) {
          const candidate={x:start.x+(next.x-start.x)*step/steps,y:start.y+(next.y-start.y)*step/steps};
          if (obstacles.some(item=>circleIntersectsRect(candidate.x,candidate.y,28,item))||
              lootBoxIntersects(candidate.x,candidate.y,28)) break;
          localPosition=candidate;
        }
      } else localPosition=next;
      if ((dx||dy) && timestamp-lastPositionWrite>(lanMode?180:100) && !positionWriteBusy) {
        lastPositionWrite=timestamp;
        positionWriteBusy=true;
        const next={...localPosition};
        mutatePlayer(current=>current?{...current,...next,lastSeen:Date.now()}:current)
          .catch(error=>setStatus(error.message,true))
          .finally(()=>{positionWriteBusy=false;});
      }
      if (pilot) updateTransportPosition(transport,localPosition,elapsed)
        .catch(error=>setStatus(error.message||'Could not update helicopter lift.',true));
    }
    const viewPosition=player&&player.transportId&&warState.vehicles[player.transportId]
      ?warState.vehicles[player.transportId]:localPosition;
    if (viewPosition) cameraPosition={x:Number(viewPosition.x),y:Number(viewPosition.y)};
    if (activeDrone) updateDrone(timestamp);
    if (reloadEndsAt) {
      const remaining=Math.max(0,reloadEndsAt-Date.now());
      ui.reloadTimer.textContent=remaining?' · '+(remaining/1000).toFixed(1)+'s':'';
    }
    gameFrame.lastFrame = timestamp;
    draw(timestamp);
    animation = requestAnimationFrame(gameFrame);
  }

  function draw() {
    if (!ui || !warState || !ui.canvas.isConnected) return;
    const context = ui.canvas.getContext('2d');
    const width = ui.canvas.width;
    const height = ui.canvas.height;
    context.clearRect(0,0,width,height);
    context.fillStyle = '#101915';
    context.fillRect(0,0,width,height);
    const cameraX=cameraPosition.x||basePositions[playerTeam||'vortex'].x;
    const cameraY=cameraPosition.y||basePositions[playerTeam||'vortex'].y;
    context.save();
    context.translate(width/2-cameraX,height/2-cameraY);
    context.fillStyle='#17231d';
    context.fillRect(0,0,worldWidth,worldHeight);
    context.strokeStyle = 'rgba(147,190,163,.055)';
    context.lineWidth = 1;
    const left=cameraX-width/2,top=cameraY-height/2;
    for (let x=Math.floor(left/720)*720;x<left+width+720;x+=720) {
      context.beginPath();context.moveTo(x,top);context.lineTo(x,top+height);context.stroke();
    }
    for (let y=Math.floor(top/720)*720;y<top+height+720;y+=720) {
      context.beginPath();context.moveTo(left,y);context.lineTo(left+width,y);context.stroke();
    }
    context.strokeStyle = '#54705d';
    context.strokeRect(0,0,worldWidth,worldHeight);
    drawSafeZone(context,'vortex');
    drawSafeZone(context,'krypton');
    drawVehiclePads(context,'vortex');
    drawVehiclePads(context,'krypton');
    drawBase(context,'vortex',basePositions.vortex.x,basePositions.vortex.y,warState.bases.vortex);
    drawBase(context,'krypton',basePositions.krypton.x,basePositions.krypton.y,warState.bases.krypton);
    obstacles.forEach(obstacle=>drawObstacle(context,obstacle));
    Object.entries(nodePositions).forEach(([id,node]) => drawNode(context,id,node,warState.nodes[id]));
    const visiblePlayers = Object.values(warState.players || {}).filter(player => player && player.online && Date.now() - Number(player.lastSeen || 0) < 20000);
    visiblePlayers.forEach(player=>{
      if (player.transportId) return;
      const self=player.name===playerName;
      if (!self) {
        const position=renderPositions.get(player.name)||{x:Number(player.x),y:Number(player.y)};
        position.x+=(Number(player.x)-position.x)*.32;
        position.y+=(Number(player.y)-position.y)*.32;
        renderPositions.set(player.name,position);
        drawPlayer(context,{...player,...position},false);
      } else drawPlayer(context,{...player,...(localPosition||{})},true);
    });
    Object.values(warState.turrets||{}).forEach(turret=>drawTurret(context,turret));
    Object.values(warState.drones||{}).forEach(drone=>drawDrone(context,drone));
    Object.values(warState.vehicles||{}).forEach(vehicle=>drawTransport(context,vehicle));
    Object.values(warState.smokes||{}).forEach(smoke=>drawSmoke(context,smoke));
    Object.values(warState.claymores||{}).forEach(claymore=>drawClaymore(context,claymore));
    Object.values(warState.grenades||{}).forEach(grenade=>drawThrownGrenade(context,grenade));
    Object.values(warState.lootBoxes||{}).forEach(crate=>drawLootBox(context,crate));
    traces = traces.filter(trace => Date.now() - trace.time < 110);
    traces.forEach(trace => {
      context.globalAlpha = Math.max(0,1 - (Date.now() - trace.time) / 110);
      context.strokeStyle = trace.color;
      context.lineWidth = 3;
      context.beginPath();context.moveTo(trace.x1,trace.y1);context.lineTo(trace.x2,trace.y2);context.stroke();
      context.globalAlpha = 1;
    });
    context.restore();
    drawMinimap();
    updateStats(visiblePlayers);
    updateCaptureProgress();
  }

  function drawMinimap() {
    if (!ui||!ui.minimap||!warState) return;
    const context=ui.minimap.getContext('2d');
    const width=ui.minimap.width,height=ui.minimap.height;
    const scaleX=width/worldWidth,scaleY=height/worldHeight;
    const point=(x,y)=>({x:Number(x)*scaleX,y:Number(y)*scaleY});
    context.clearRect(0,0,width,height);
    context.fillStyle='#111a15';
    context.fillRect(0,0,width,height);
    context.fillStyle='rgba(74,126,220,.14)';
    const vortexZone=point(basePositions.vortex.x,basePositions.vortex.y);
    context.beginPath();context.arc(vortexZone.x,vortexZone.y,safeZoneRadius*scaleX,0,Math.PI*2);context.fill();
    context.fillStyle='rgba(220,75,91,.14)';
    const kryptonZone=point(basePositions.krypton.x,basePositions.krypton.y);
    context.beginPath();context.arc(kryptonZone.x,kryptonZone.y,safeZoneRadius*scaleX,0,Math.PI*2);context.fill();
    for (const obstacle of obstacles) {
      const topLeft=point(obstacle.x,obstacle.y);
      context.fillStyle=obstacle.type==='building'?'#829187':obstacle.type==='house'?'#a6b4a8':'#b8a779';
      context.fillRect(topLeft.x,topLeft.y,Math.max(1,obstacle.w*scaleX),Math.max(1,obstacle.h*scaleY));
    }
    for (const team of ['vortex','krypton']) {
      const base=point(basePositions[team].x,basePositions[team].y);
      context.fillStyle=team==='vortex'?'#6fa2f1':'#ed6876';
      context.fillRect(base.x-4,base.y-4,8,8);
    }
    for (const [id,node] of Object.entries(nodePositions)) {
      const location=point(node.x,node.y);
      const owner=warState.nodes[id]?.team;
      context.beginPath();context.arc(location.x,location.y,4,0,Math.PI*2);
      context.fillStyle=owner==='vortex'?'#75a9ff':owner==='krypton'?'#fa7c89':'#e8e8cd';
      context.fill();
    }
    for (const crate of Object.values(warState.lootBoxes||{})) {
      if (!crate||!crate.available) continue;
      const location=point(crate.x,crate.y);
      context.fillStyle=crate.type==='random'?'#ffd36c':'#b7e6b8';
      context.fillRect(location.x-2.5,location.y-2.5,5,5);
      context.strokeStyle='#17231d';
      context.lineWidth=1;
      context.strokeRect(location.x-2.5,location.y-2.5,5,5);
    }
    const now=Date.now();
    for (const player of Object.values(warState.players||{})) {
      if (!player||!player.online||now-Number(player.lastSeen||0)>20000) continue;
      const transport=player.transportId&&warState.vehicles[player.transportId];
      const location=point(transport?transport.x:player.name===playerName&&localPosition?localPosition.x:player.x,
        transport?transport.y:player.name===playerName&&localPosition?localPosition.y:player.y);
      context.beginPath();context.arc(location.x,location.y,player.name===playerName?4:2.5,0,Math.PI*2);
      context.fillStyle=player.team==='vortex'?'#83b3ff':'#ff8792';
      context.fill();
      if (player.name===playerName) {
        context.strokeStyle='#fff';
        context.lineWidth=1.5;
        context.stroke();
      }
    }
    const camera=point(cameraPosition.x,cameraPosition.y);
    const viewWidth=ui.canvas.width*scaleX,viewHeight=ui.canvas.height*scaleY;
    const viewLeft=Math.max(0,camera.x-viewWidth/2),viewTop=Math.max(0,camera.y-viewHeight/2);
    const viewRight=Math.min(width,camera.x+viewWidth/2),viewBottom=Math.min(height,camera.y+viewHeight/2);
    context.strokeStyle='rgba(242,250,244,.7)';
    context.lineWidth=1;
    context.strokeRect(viewLeft,viewTop,Math.max(0,viewRight-viewLeft),Math.max(0,viewBottom-viewTop));
    context.fillStyle='rgba(5,10,7,.78)';
    context.fillRect(5,5,104,19);
    context.fillStyle='#e5efe7';
    context.font='bold 10px system-ui';
    context.textAlign='left';
    context.fillText('TACTICAL MAP',11,19);
  }

  function drawSafeZone(context,team) {
    const zone=safeZoneFor(team);
    const color=team==='vortex'?'#5688df':'#e05b69';
    context.save();
    context.beginPath();
    context.arc(zone.x,zone.y,zone.radius,0,Math.PI*2);
    context.fillStyle=team==='vortex'?'rgba(63,116,203,.09)':'rgba(204,70,88,.09)';
    context.fill();
    context.setLineDash([18,12]);
    context.strokeStyle=color;
    context.lineWidth=4;
    context.stroke();
    context.setLineDash([]);
    context.fillStyle=color;
    context.font='bold 13px system-ui';
    context.textAlign='center';
    context.fillText(teamLabel(team).toUpperCase()+' TEAM ONLY · SAFE ZONE',zone.x,zone.y+zone.radius-16);
    context.restore();
  }

  function drawVehiclePads(context,team) {
    const color=team==='vortex'?'#79a9f5':'#ef7e89';
    for (const [type,offset] of Object.entries(vehiclePadOffsets)) {
      const position=vehiclePadPosition(team,type);
      const padId=team+'_'+type;
      const occupied=type===transportType
        ?Object.values(warState.vehicles||{}).some(vehicle=>vehicle&&vehicle.team===team&&
          vehicle.type===transportType&&vehicle.hp>0)
        :Object.values(warState.players||{}).some(player=>player&&player.vehiclePad===padId&&
          player.vehicle===type&&player.online&&Date.now()-Number(player.lastSeen||0)<20000);
      context.save();
      context.translate(position.x,position.y);
      context.fillStyle=occupied?'rgba(115,126,119,.25)':'rgba(12,19,16,.72)';
      context.strokeStyle=occupied?'#839087':color;
      context.lineWidth=3;
      context.setLineDash([9,6]);
      context.fillRect(-54,-34,108,68);
      context.strokeRect(-54,-34,108,68);
      context.setLineDash([]);
      context.fillStyle=occupied?'#a4afa7':color;
      context.font='bold 12px system-ui';
      context.textAlign='center';
      context.fillText(offset.label,0,5);
      context.font='10px system-ui';
      context.fillText(occupied?'IN USE':'V · SPAWN',0,22);
      context.restore();
    }
  }

  function drawBase(context,team,x,y,base) {
    const color = team === 'vortex' ? '#5688df' : '#e05b69';
    const destroyed = Number(base && base.destroyedUntil || 0) > Date.now();
    context.fillStyle = destroyed ? '#313c37' : team === 'vortex' ? '#142c4a' : '#421c25';
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.fillRect(x-90,y-90,180,180);
    context.strokeRect(x-90,y-90,180,180);
    context.fillStyle = color;
    context.font = 'bold 11px system-ui';
    context.textAlign = 'center';
    context.fillText(team === 'vortex' ? 'VORTEX' : 'KRYPTON',x,y-105);
    context.fillStyle = '#0a0d0c';
    context.fillRect(x-75,y+110,150,12);
    context.fillStyle = color;
    context.fillRect(x-75,y+110,150 * Math.max(0,Number(base && base.health || 0)) / 1200,12);
    context.fillStyle = '#dce9df';
    context.font = '10px system-ui';
    context.fillText(destroyed ? 'RAIDED' : Math.ceil(Number(base && base.health || 0)) + ' / 1200',x,y+145);
  }

  function drawObstacle(context,item) {
    const building=item.type==='building';
    context.fillStyle=building?'#48564f':item.type==='house'?'#59665d':'#807b68';
    context.strokeStyle=building?'#9cad9f':item.type==='house'?'#b5c5b6':'#c6b57e';
    context.lineWidth=building?5:4;
    context.fillRect(item.x,item.y,item.w,item.h);
    context.strokeRect(item.x,item.y,item.w,item.h);
    if (building) {
      context.fillStyle='#344139';
      context.fillRect(item.x+14,item.y+14,item.w-28,item.h-28);
      context.strokeStyle='#748679';
      context.lineWidth=3;
      context.strokeRect(item.x+14,item.y+14,item.w-28,item.h-28);
      context.fillStyle='#202c25';
      context.fillRect(item.x+item.w*.38,item.y+item.h*.36,item.w*.24,item.h*.28);
      context.strokeStyle='#849488';
      context.lineWidth=2;
      const windowSize=Math.max(10,Math.min(22,item.w*.07));
      for (const side of [item.x+30,item.x+item.w-30-windowSize]) {
        for (const row of [item.y+32,item.y+item.h-32-windowSize]) {
          context.fillStyle='#718277';
          context.fillRect(side,row,windowSize,windowSize);
          context.strokeRect(side,row,windowSize,windowSize);
        }
      }
      context.fillStyle='#d2c297';
      context.font='bold 11px system-ui';
      context.textAlign='center';
      context.fillText('BLOCKED BUILDING',item.x+item.w/2,item.y+item.h/2+4);
    } else if (item.type==='house') {
      context.fillStyle='#26352b';
      context.fillRect(item.x+12,item.y+12,item.w-24,item.h-24);
      if (item.enterable) {
        context.fillStyle='#8ee6ac';
        context.fillRect(item.doorX-12,item.doorY-8,24,16);
        context.font='bold 12px system-ui';
        context.textAlign='center';
        context.fillText('Q',item.doorX,item.doorY+4);
      }
    } else {
      context.strokeStyle='#d2c297';
      context.lineWidth=2;
      context.beginPath();
      context.moveTo(item.x+8,item.y+item.h-5);
      context.lineTo(item.x+item.w-8,item.y+5);
      context.stroke();
    }
  }

  function circleIntersectsRect(x,y,r,item) {
    const nearestX=Math.max(item.x,Math.min(x,item.x+item.w));
    const nearestY=Math.max(item.y,Math.min(y,item.y+item.h));
    return Math.hypot(x-nearestX,y-nearestY)<r;
  }

  function lootBoxIntersects(x,y,radius) {
    return Object.values(warState&&warState.lootBoxes||{}).some(crate=>crate&&crate.available&&
      circleIntersectsRect(x,y,radius,{x:Number(crate.x)-15,y:Number(crate.y)-15,w:30,h:30}));
  }

  function drawTurret(context,turret) {
    context.beginPath();
    context.arc(Number(turret.x),Number(turret.y),22,0,Math.PI*2);
    context.fillStyle=turret.team==='vortex'?'#6e9de3':'#df6874';
    context.fill();
    context.strokeStyle='#f0f5e9';
    context.lineWidth=3;
    context.stroke();
    context.fillStyle='#111815';
    context.fillRect(turret.x-20,turret.y-34,40,5);
    context.fillStyle='#65e6ad';
    context.fillRect(turret.x-20,turret.y-34,40*Math.max(0,turret.hp/30),5);
  }

  function drawTransport(context,vehicle) {
    if (!vehicle||vehicle.type!==transportType||!Array.isArray(vehicle.passengers)) return;
    const altitude=Math.max(0,Math.min(100,Number(vehicle.altitude)||0));
    const scale=1+altitude/100;
    const x=Number(vehicle.x),groundY=Number(vehicle.y);
    const y=groundY-altitude*.65;
    context.save();
    context.globalAlpha=.28;
    context.fillStyle='#050806';
    context.beginPath();context.ellipse(x,groundY,42,13,0,0,Math.PI*2);context.fill();
    context.globalAlpha=1;
    context.translate(x,y);
    context.scale(scale,scale);
    context.fillStyle=vehicle.team==='vortex'?'#6f9bd5':'#c4757d';
    context.strokeStyle='#e8eee9';
    context.lineWidth=3/scale;
    context.beginPath();context.ellipse(0,0,38,16,0,0,Math.PI*2);context.fill();context.stroke();
    context.fillRect(-48,-3,24,6);
    context.fillRect(31,-21,4,42);
    context.beginPath();context.moveTo(-28,-2);context.lineTo(-56,-7);context.moveTo(-28,2);context.lineTo(-56,7);context.stroke();
    context.beginPath();context.moveTo(-5,-24);context.lineTo(5,-24);context.stroke();
    context.restore();
    context.fillStyle='#edf5ef';context.font='bold 13px system-ui';context.textAlign='center';
    context.fillText(transportName+' · '+vehicle.passengers.length+'/10 · '+Math.round(altitude)+'m',x,y-34*scale);
  }

  async function updateTransportPosition(vehicle,position,elapsed) {
    if (!vehicle||Date.now()-Number(updateTransportPosition.lastWriteAt||0)<140) return;
    const now=Date.now();
    updateTransportPosition.lastWriteAt=now;
    let updated;
    await updateWar('vehicles/'+vehicle.id,current=>{
      if (!current||current.pilot!==playerKey) return current;
      const lift=Math.min(100,Number(current.altitude||0)+Math.max(0,now-Number(current.lastMovedAt||now))/1000*12);
      updated={...current,x:position.x,y:position.y,altitude:lift,lastMovedAt:now};
      return updated;
    });
    if (!updated) return;
    if (warState) warState.vehicles[vehicle.id]=updated;
  }

  function drawDrone(context,drone) {
    if (!drone || drone.hp<=0) return;
    context.save();
    context.translate(Number(drone.x),Number(drone.y));
    context.rotate(Number(drone.angle)||0);
    context.fillStyle='#f0d365';
    context.beginPath();
    context.moveTo(20,0);context.lineTo(-12,-10);context.lineTo(-8,0);context.lineTo(-12,10);
    context.closePath();context.fill();
    context.restore();
  }

  function drawSmoke(context,smoke) {
    if (!smoke||Number(smoke.expiresAt)<=Date.now()) return;
    const alpha=Math.min(.55,(Number(smoke.expiresAt)-Date.now())/2500*.55);
    const gradient=context.createRadialGradient(smoke.x,smoke.y,20,smoke.x,smoke.y,Number(smoke.radius||190));
    gradient.addColorStop(0,'rgba(190,200,194,'+alpha+')');
    gradient.addColorStop(1,'rgba(150,164,157,0)');
    context.fillStyle=gradient;
    context.beginPath();context.arc(smoke.x,smoke.y,Number(smoke.radius||190),0,Math.PI*2);context.fill();
  }

  function drawClaymore(context,claymore) {
    if (!claymore||claymore.triggeredAt) return;
    context.save();
    context.translate(Number(claymore.x),Number(claymore.y));
    context.rotate(Number(claymore.angle)||0);
    context.fillStyle='#db8067';
    context.beginPath();context.moveTo(0,0);context.lineTo(115,-65);context.lineTo(115,65);context.closePath();context.fill();
    context.fillStyle='#161d18';
    context.fillRect(-9,-12,18,24);
    context.restore();
  }

  function drawThrownGrenade(context,grenade) {
    if (!grenade||Number(grenade.expiresAt)<=Date.now()) return;
    const remaining=Math.max(0,Number(grenade.expiresAt)-Date.now());
    context.fillStyle='#e5bd55';
    context.beginPath();context.arc(Number(grenade.x),Number(grenade.y),8+Math.sin(remaining/45)*2,0,Math.PI*2);context.fill();
  }

  function drawLootBox(context,crate) {
    if (!crate||!crate.available) return;
    const size=30;
    context.fillStyle=crate.type==='random'?'#9b7430':'#426c53';
    context.strokeStyle=crate.type==='random'?'#ffd36c':'#b7e6b8';
    context.lineWidth=4;
    context.fillRect(Number(crate.x)-size/2,Number(crate.y)-size/2,size,size);
    context.strokeRect(Number(crate.x)-size/2,Number(crate.y)-size/2,size,size);
    context.strokeStyle='#17231d';
    context.lineWidth=3;
    context.beginPath();
    context.moveTo(Number(crate.x)-size/2,Number(crate.y));
    context.lineTo(Number(crate.x)+size/2,Number(crate.y));
    context.moveTo(Number(crate.x),Number(crate.y)-size/2);
    context.lineTo(Number(crate.x),Number(crate.y)+size/2);
    context.stroke();
    context.fillStyle='#edf5ef';
    context.font='bold 12px system-ui';
    context.textAlign='center';
    context.fillText(crate.type==='random'?'DROP':'LOOT',Number(crate.x),Number(crate.y)-24);
  }

  function drawNode(context,id,node,state) {
    const colors = {vortex:'#5688df',krypton:'#e05b69'};
    const team = state && state.team;
    context.beginPath();
    context.arc(node.x,node.y,74,0,Math.PI*2);
    context.fillStyle = team ? team === 'vortex' ? '#173255' : '#4b2028' : '#252f2a';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = colors[team] || '#94a99b';
    context.stroke();
    context.fillStyle = '#edf5ef';
    context.font = 'bold 25px system-ui';
    context.textAlign = 'center';
    context.fillText((node.label || id).split(' ')[0],node.x,node.y+6);
    context.font = '20px system-ui';
    context.fillStyle = '#9cac9f';
    context.fillText((state && state.team ? state.team.toUpperCase() : 'NEUTRAL') + ' RESOURCE',node.x,node.y+108);
  }

  function drawPlayer(context,player,isSelf) {
    const color = player.downed?'#e9c967':player.team === 'vortex' ? '#70a6ff' : '#ff7887';
    context.beginPath();
    if (vehicles[player.vehicle]) {
      context.fillStyle=vehicles[player.vehicle].color;
      context.fillRect(Number(player.x)-29,Number(player.y)-20,58,40);
      context.strokeStyle=isSelf?'#fff':'#111815';
      context.lineWidth=4;
      context.strokeRect(Number(player.x)-29,Number(player.y)-20,58,40);
      if (player.vehicle==='tank') {
        context.fillStyle='#344336';
        context.fillRect(Number(player.x)-26,Number(player.y)-24,52,6);
        context.fillRect(Number(player.x)-26,Number(player.y)+18,52,6);
        context.fillStyle='#85967c';
        context.beginPath();context.arc(Number(player.x),Number(player.y),12,0,Math.PI*2);context.fill();
        context.strokeStyle='#344336';context.lineWidth=6;
        context.beginPath();context.moveTo(Number(player.x),Number(player.y));context.lineTo(Number(player.x)+30,Number(player.y));context.stroke();
      } else if (player.vehicle==='anti_air') {
        context.fillStyle='#43595d';
        context.beginPath();context.arc(Number(player.x),Number(player.y),13,0,Math.PI*2);context.fill();
        context.strokeStyle='#d0dcda';context.lineWidth=3;
        context.beginPath();context.moveTo(Number(player.x)+3,Number(player.y)-4);context.lineTo(Number(player.x)+31,Number(player.y)-19);
        context.moveTo(Number(player.x)+3,Number(player.y)+4);context.lineTo(Number(player.x)+31,Number(player.y)+19);context.stroke();
      }
      context.fillStyle='#101713';
      context.font='bold 10px system-ui';
      context.textAlign='center';
      const labels={scout_bike:'BIKE',assault_rover:'ROVER',tank:'TANK',anti_air:'ANTI-AIR'};
      context.fillText(labels[player.vehicle]||'VEHICLE',Number(player.x),Number(player.y)+4);
    } else {
      context.arc(Number(player.x),Number(player.y),isSelf ? 29 : 25,0,Math.PI*2);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = isSelf ? '#ffffff' : '#111815';
      context.lineWidth = isSelf ? 6 : 4;
      context.stroke();
    }
    context.fillStyle = '#101713';
    context.font = 'bold 20px system-ui';
    context.textAlign = 'center';
    context.fillText(String(player.name || '?').slice(0,8),Number(player.x),Number(player.y)+3);
    context.fillStyle = '#070b09';
    context.fillRect(Number(player.x)-44,Number(player.y)-54,88,10);
    context.fillStyle = player.downed?'#e9c967':Number(player.hp) > 50 ? '#65e6ad' : '#ff7782';
    context.fillRect(Number(player.x)-44,Number(player.y)-54,88*Math.max(0,Number(player.hp))/100,10);
  }

  function updateStats(players) {
    const player = warState.players[playerKey];
    if (!player) return;
    const weapon=vehicleWeapons[player.vehicle]||effectiveWeapon(player);
    const ammo=vehicleWeapons[player.vehicle]?Number(player.vehicleAmmo||0):Number(player.ammo||0);
    const progress=accountData && accountData.dropzone?normalizeProgress(accountData.dropzone):normalizeProgress(null);
    const markup = '<span class="nexus-war-vortex">Vortex resources: ' +
      Number(warState.economy.vortex.resources || 0) + '</span><span class="nexus-war-krypton">Krypton resources: ' +
      Number(warState.economy.krypton.resources || 0) + '</span><span>Players online: ' + players.length +
      '</span><span>K / D: ' + Number(player.kills || 0) + ' / ' + Number(player.deaths || 0) +
      '</span><span>Health: ' + Math.ceil(Number(player.hp)) + '</span><span>Armor: '+
      Math.ceil(Number(player.armorHp||0))+' / 150 · '+Number(player.armorPlates||0)+' plates ready'+
      (player.downed?' · DOWNED':'')+'</span><span>'+(vehicleWeapons[player.vehicle]?weapon.name+' ammo':'Ammo')+': ' +
      ammo + ' / ' + weapon.mag + '</span><span>Level ' + progress.level +
      ' · XP ' + progress.xp + ' / ' + (progress.level===55?progress.xp:(progress.level*xpPerLevel)) + '</span>';
    if (markup!==lastStatsMarkup) { ui.stats.innerHTML=markup;lastStatsMarkup=markup; }
    if (ui.giveUp) ui.giveUp.hidden=!player.downed;
    const next = new Date();
    next.setUTCHours(0,0,0,0);
    next.setUTCDate(next.getUTCDate() + ((8 - next.getUTCDay()) % 7 || 7));
    const label='Weekly wipe: Monday ' + next.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' UTC';
    if (label!==lastResetLabel) { ui.reset.textContent=label;lastResetLabel=label; }
  }

  function onPointerMove(event) {
    const rect = ui.canvas.getBoundingClientRect();
    aim = {
      x:cameraPosition.x+(event.clientX-rect.left)*ui.canvas.width/rect.width-ui.canvas.width/2,
      y:cameraPosition.y+(event.clientY-rect.top)*ui.canvas.height/rect.height-ui.canvas.height/2
    };
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    onPointerMove(event);
    pointerDown = true;
    ui.canvas.setPointerCapture(event.pointerId);
    fireWeapon();
  }

  function onPointerUp() { pointerDown = false; }

  function onControlPointerDown(event) {
    const holdButton=event.target.closest('[data-war-action="give-up"]');
    if (holdButton&&container.contains(holdButton)&&warState.players[playerKey]?.downed) {
      event.preventDefault();
      holdButton.setPointerCapture(event.pointerId);
      if (!giveUpInterval) giveUpInterval=window.setTimeout(()=>{giveUp();giveUpInterval=0;},1500);
      return;
    }
    const control=event.target.closest('[data-war-move],[data-war-fire]');
    if (!control || !container.contains(control)) return;
    event.preventDefault();
    control.setPointerCapture(event.pointerId);
    if (control.hasAttribute('data-war-fire')) {
      pointerDown=true;
      fireWeapon();
      return;
    }
    const moveKeys={up:'w',down:'s',left:'a',right:'d'};
    keys.add(moveKeys[control.dataset.warMove]);
  }

  function onControlPointerUp(event) {
    const holdButton=event.target.closest('[data-war-action="give-up"]');
    if (holdButton&&giveUpInterval) { clearTimeout(giveUpInterval);giveUpInterval=0; }
    const control=event.target.closest('[data-war-move],[data-war-fire]');
    if (!control) return;
    if (control.hasAttribute('data-war-fire')) pointerDown=false;
    else keys.delete(({up:'w',down:'s',left:'a',right:'d'})[control.dataset.warMove]);
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    const target=event.target instanceof Element?event.target:null;
    if (target&&target.closest('input,textarea,[contenteditable="true"]')) return;
    if (target instanceof HTMLSelectElement&&key!=='v') return;
    if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','r','e','v','q','f','g','x','c','z'].includes(key)) event.preventDefault();
    if (event.repeat&&!['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)) return;
    if (key==='g'&&warState&&warState.players[playerKey]?.downed&&!giveUpInterval) {
      giveUpInterval=window.setTimeout(()=>{giveUp();giveUpInterval=0;},1500);
    }
    keys.add(key);
    if (key === 'r') reloadWeapon();
    if (key === 'e') captureOrRaid();
    if (key === 'v') deployVehicle();
    if (key === 'q') enterOrExitHouse();
    if (key === 'f') reviveNearby();
    if (key === 'x') useTactical();
    if (key === 'c') useLethal();
    if (key === 'z') applyArmorPlate();
  }

  function onKeyUp(event) {
    const key=event.key.toLowerCase();
    keys.delete(key);
    if (key==='g'&&giveUpInterval) { clearTimeout(giveUpInterval);giveUpInterval=0; }
  }
  function onBlur() {
    keys.clear();pointerDown=false;movementVelocity={x:0,y:0};
    if (giveUpInterval) { clearTimeout(giveUpInterval);giveUpInterval=0; }
  }

  async function fireWeapon() {
    const now = Date.now();
    if (destroyed || now - lastShot < 70 || reloading) return;
    const shooter = warState && warState.players[playerKey];
    if (!shooter || shooter.respawnAt > now || shooter.hp <= 0 || shooter.downed) return;
    const shooterPosition=shooter.transportId&&warState.vehicles[shooter.transportId]
      ?warState.vehicles[shooter.transportId]:localPosition||shooter;
    if (isInOwnSafeZone(shooter.team,Number(shooterPosition.x),Number(shooterPosition.y))) {
      setStatus('Weapons are disabled inside your team safe zone.');
      return;
    }
    const weapon=vehicleWeapons[shooter.vehicle]||effectiveWeapon(shooter);
    const ammoField=vehicleWeapons[shooter.vehicle]?'vehicleAmmo':'ammo';
    if (now - lastShot < weapon.rate) return;
    if (Number(shooter[ammoField]||0) <= 0) { setStatus('Magazine empty. Press R to reload.'); return; }
    lastShot = now;
    let fired;
    try {
      fired = await mutatePlayer(current => {
        if (!current||current.vehicle!==shooter.vehicle||Number(current[ammoField]||0)<=0||
            Date.now()-Number(current.lastShotAt||0)<weapon.rate-20) return current;
        return {...current,[ammoField]:Number(current[ammoField])-1,lastShotAt:Date.now(),lastSeen:Date.now()};
      });
    } catch (error) { setStatus(error.message,true); return; }
    if (!fired||fired[ammoField]!==Number(shooter[ammoField])-1) return;
    const transport=shooter.transportId&&warState.vehicles[shooter.transportId];
    const origin = {...shooter,...(transport?{x:transport.x,y:transport.y}:localPosition||{})};
    const angle = Math.atan2(aim.y-origin.y,aim.x-origin.x) + (Math.random()-.5)*weapon.spread;
    const end = {
      x:Math.max(0,Math.min(worldWidth,origin.x+Math.cos(angle)*weapon.range)),
      y:Math.max(0,Math.min(worldHeight,origin.y+Math.sin(angle)*weapon.range))
    };
    const target = closestTarget(origin,end);
    const aircraftHit=closestTransport(origin,end,shooter.vehicle==='anti_air');
    const baseHit = closestBase(origin,end);
    let impact=target;
    if (aircraftHit&&(!impact||aircraftHit.distance<impact.distance)) impact=aircraftHit;
    if (baseHit&&(!impact||baseHit.distance<impact.distance)) impact=baseHit;
    traces.push({x1:origin.x,y1:origin.y,x2:impact ? impact.x : end.x,y2:impact ? impact.y : end.y,time:Date.now(),color:shooter.team === 'vortex' ? '#80b7ff' : '#ff8792'});
    try {
      if (weapon.radius && baseHit && impact===baseHit) {
        await raidBase(baseHit.team,Math.round(weapon.damage*.7),shooter.team);
        for (const enemy of Object.values(warState.players)) {
          if (enemy.team !== shooter.team&&!enemy.transportId&&Math.hypot(enemy.x-baseHit.x,enemy.y-baseHit.y) < weapon.radius) await hitPlayer(enemy,Math.round(weapon.damage*.65),shooter);
        }
      } else if (impact && impact.target) {
        await hitPlayer(impact.target,weapon.damage,shooter);
      } else if (impact&&impact.turret) {
        await hitTurret(impact.turretId,weapon.damage);
      } else if (impact&&impact.transport) {
        await hitTransport(impact.transportId,weapon.aircraftDamage||125);
      } else if (baseHit) {
        await raidBase(baseHit.team,weapon.damage,shooter.team);
      }
    } catch(error) {
      setStatus(error.message||'The attack could not be completed.',true);
    }
    draw();
    if (pointerDown) window.setTimeout(fireWeapon,weapon.rate);
  }

  function closestTarget(origin,end) {
    let closest = null;
    for (const player of Object.values(warState.players || {})) {
      if (!player || player.team === origin.team || !player.online || (player.hp<=0&&!player.downed) ||
          (player.respawnAt>Date.now()&&!player.downed) || player.transportId ||
          Date.now()-Number(player.lastSeen||0)>20000) continue;
      const hit = pointToSegment(player.x,player.y,origin.x,origin.y,end.x,end.y);
      if (hit.distance <= 38 && !lineBlocked(origin.x,origin.y,player.x,player.y) &&
          (!closest || hit.along < closest.distance)) closest = {target:player,distance:hit.along,x:hit.x,y:hit.y};
    }
    for (const [id,turret] of Object.entries(warState.turrets||{})) {
      if (!turret||turret.team===origin.team||Number(turret.hp)<=0) continue;
      const hit=pointToSegment(turret.x,turret.y,origin.x,origin.y,end.x,end.y);
      if (hit.distance<=30&&!lineBlocked(origin.x,origin.y,turret.x,turret.y)&&
          (!closest||hit.along<closest.distance)) closest={turret,turretId:id,distance:hit.along,x:hit.x,y:hit.y};
    }
    return closest;
  }

  function closestTransport(origin,end,antiAir) {
    if (!antiAir) return null;
    let closest=null;
    for (const [id,transport] of Object.entries(warState.vehicles||{})) {
      if (!transport||transport.type!==transportType||transport.team===origin.team||Number(transport.hp)<=0) continue;
      const targetY=Number(transport.y)-Math.max(0,Number(transport.altitude)||0)*.65;
      const hit=pointToSegment(transport.x,targetY,origin.x,origin.y,end.x,end.y);
      const hitRadius=60+Math.max(0,Number(transport.altitude)||0)*.35;
      if (hit.distance<=hitRadius&&(!closest||hit.along<closest.distance)) {
        closest={transport,transportId:id,distance:hit.along,x:hit.x,y:hit.y};
      }
    }
    return closest;
  }

  async function hitTransport(id,damage) {
    let destroyedTransport=false;
    await updateWar('vehicles/'+id,transport=>{
      destroyedTransport=false;
      if (!transport||transport.type!==transportType||
          isInOwnSafeZone(transport.team,Number(transport.x),Number(transport.y))) return transport;
      const hp=Math.max(0,Number(transport.hp)-damage);
      destroyedTransport=hp===0;
      return {...transport,hp};
    });
    if (destroyedTransport) {
      const transport=warState.vehicles[id];
      for (const occupant of transport&&transport.passengers||[]) {
        await updateWar('players/'+occupant,current=>current?{
          ...current,transportId:'',vehicle:'',vehiclePad:'',hp:Math.max(1,Number(current.hp)-35),
          x:transport.x,y:transport.y,lastSeen:Date.now()
        }:current);
      }
      await updateWar('vehicles',current=>{const next={...(current||{})};delete next[id];return next;});
      if (warState&&warState.vehicles) delete warState.vehicles[id];
      setStatus('Anti-air fire brought down the transport helicopter.');
    }
  }

  function closestBase(origin,end) {
    let closest = null;
    for (const team of ['vortex','krypton']) {
      if (team === origin.team) continue;
      const {x,y}=basePositions[team];
      const hit = pointToSegment(x,y,origin.x,origin.y,end.x,end.y);
      if (hit.distance <= 130 && (!closest || hit.along < closest.distance)) closest = {team,distance:hit.along,x,y};
    }
    return closest;
  }

  function pointToSegment(px,py,x1,y1,x2,y2) {
    const dx=x2-x1,dy=y2-y1;
    const length=dx*dx+dy*dy || 1;
    const t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/length));
    const x=x1+t*dx,y=y1+t*dy;
    return {x,y,along:t*Math.sqrt(length),distance:Math.hypot(px-x,py-y)};
  }

  async function hitPlayer(target,damage,attacker) {
    const targetKey = safeUserKey(target.name);
    let killed = false;
    let downed = false;
    await updateWar('players/' + targetKey,current => {
      killed=false;
      downed=false;
      if (!current || current.team === attacker.team || current.transportId ||
          (current.respawnAt>Date.now()&&!current.downed) || (current.hp<=0&&!current.downed)) return current;
      if (isInOwnSafeZone(current.team,Number(current.x),Number(current.y))) return current;
      if (current.downed) {
        killed=true;
        return {...current,hp:0,downed:false,downedAt:0,deaths:Number(current.deaths||0)+1,respawnAt:Date.now()+5000};
      }
      const tank=current.vehicle==='tank';
      const vehicleDamage=tank?Math.max(1,Math.ceil(damage*.2)):damage;
      const armor=Math.max(0,Number(current.armorHp||0));
      const absorbed=Math.min(armor,vehicleDamage);
      const hp=Math.max(0,Number(current.hp)-(vehicleDamage-absorbed));
      downed=hp===0;
      return {...current,armorHp:armor-absorbed,hp,downed,
        downedAt:downed?Date.now():0,deaths:Number(current.deaths||0),
        respawnAt:downed?Date.now()+30000:Number(current.respawnAt||0)};
    });
    if (killed) {
      const attackerKey=safeUserKey(attacker.name);
      await updateWar('players/'+attackerKey,current=>current?{...current,kills:Number(current.kills||0)+1,lastSeen:Date.now()}:current);
      setStatus(target.name+' eliminated. Respawning in five seconds.');
      try { await grantXpByName(attacker.name,100,'enemy eliminated'); }
      catch(error) { setStatus('Elimination counted, but XP could not be saved: '+error.message,true); }
    } else if (downed && targetKey===playerKey) {
      setStatus('You are downed. A teammate can revive you; hold G to give up.');
    }
  }

  function lineBlocked(x1,y1,x2,y2) {
    for (let step=1;step<20;step++) {
      const t=step/20;
      const x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;
      if (obstacles.some(item=>circleIntersectsRect(x,y,4,item))||lootBoxIntersects(x,y,4)) return true;
    }
    if (warState&&Object.values(warState.smokes||{}).some(smoke=>
      Number(smoke.expiresAt)>Date.now()&&pointToSegment(smoke.x,smoke.y,x1,y1,x2,y2).distance<Number(smoke.radius||190))) return true;
    return false;
  }

  function equipmentChoices(player) {
    const tactical=[['smoke','Smoke grenade · '+Number(player.smokeCharges||0)] ,
      ['stim','Stim · '+Number(player.stimCharges||0)]];
    const lethal=[['grenade','Frag grenade · '+Number(player.grenadeCharges||0)],
      ['claymore','Claymore · '+Number(player.claymoreCharges||0)]];
    if (Number(player.turretCharges||0)>0) tactical.push(['turret','Sentry turret · '+player.turretCharges]);
    if (Number(player.droneCharges||0)>0) lethal.push(['drone','Kamikaze drone · '+player.droneCharges]);
    return {tactical,lethal};
  }

  function refreshEquipmentUi() {
    if (!ui||!ui.tactical||!ui.lethal||!warState) return;
    const player=warState.players[playerKey];
    if (!player) return;
    const choices=equipmentChoices(player);
    const tacticalValue=choices.tactical.some(([id])=>id===player.tactical)?player.tactical:'smoke';
    const lethalValue=choices.lethal.some(([id])=>id===player.lethal)?player.lethal:'grenade';
    ui.tactical.innerHTML=choices.tactical.map(([id,label])=>
      '<option value="'+id+'">'+label+'</option>').join('');
    ui.lethal.innerHTML=choices.lethal.map(([id,label])=>
      '<option value="'+id+'">'+label+'</option>').join('');
    ui.tactical.value=tacticalValue;
    ui.lethal.value=lethalValue;
  }

  async function consumeEquipment(slot,item) {
    const chargeField={smoke:'smokeCharges',stim:'stimCharges',grenade:'grenadeCharges',
      claymore:'claymoreCharges',turret:'turretCharges',drone:'droneCharges'}[item];
    if (!chargeField) throw new Error('Unknown equipment.');
    let used=false;
    await mutatePlayer(current=>{
      used=!!current&&current[slot]===item&&Number(current[chargeField]||0)>0;
      if (!used) return current;
      const remaining=Number(current[chargeField])-1;
      const fallback=slot==='tactical'?'smoke':'grenade';
      return {...current,[chargeField]:remaining,
        ...(remaining===0&&['turret','drone'].includes(item)?{[slot]:fallback}:{})};
    });
    if (!used) throw new Error('Equip this item and make sure you have a charge available.');
  }

  async function useTactical() {
    const player=warState&&warState.players[playerKey];
    if (!player||player.downed||player.transportId) return;
    const item=player.tactical;
    try {
      await consumeEquipment('tactical',item);
      const position=localPosition||player;
      if (item==='smoke') {
        const id='smoke_'+playerKey+'_'+Date.now();
        const distance=Math.min(500,Math.hypot(aim.x-position.x,aim.y-position.y));
        const angle=Math.atan2(aim.y-position.y,aim.x-position.x);
        const smoke={team:playerTeam,x:position.x+Math.cos(angle)*distance,
          y:position.y+Math.sin(angle)*distance,radius:190,expiresAt:Date.now()+12000};
        await updateWar('smokes',current=>({...Object.fromEntries(Object.entries(current||{})
          .filter(([,entry])=>entry&&Number(entry.expiresAt)>Date.now())),[id]:smoke}));
        setStatus('Smoke deployed. It blocks sight for 12 seconds.');
      } else if (item==='stim') {
        await mutatePlayer(current=>({...current,hp:Math.min(100,Number(current.hp)+45),
          speedBoostUntil:Date.now()+8000}));
        setStatus('Stim used: restored health and increased movement speed for 8 seconds.');
      } else if (item==='turret') {
        const id=playerKey+'_'+Date.now();
        await updateWar('turrets/'+id,()=>({owner:playerName,team:playerTeam,
          x:Math.max(100,Math.min(worldWidth-100,position.x+(playerTeam==='vortex'?75:-75))),
          y:position.y,hp:30,lastShotAt:0}));
        setStatus('Sentry turret deployed.');
      }
      refreshEquipmentUi();
    } catch(error) { setStatus(error.message||'Could not use tactical equipment.',true); }
  }

  async function useLethal() {
    const player=warState&&warState.players[playerKey];
    if (!player||player.downed||player.transportId) return;
    const item=player.lethal;
    try {
      if (item==='drone') {
        if (warState.drones[playerKey]) { setStatus('Your drone is already active.',true);return; }
        await launchDrone();
      } else if (item==='claymore') {
        await consumeEquipment('lethal',item);
        const position=localPosition||player;
        const id='claymore_'+playerKey+'_'+Date.now();
        await updateWar('claymores/'+id,()=>({id,owner:playerName,team:playerTeam,
          x:position.x,y:position.y,angle:Math.atan2(aim.y-position.y,aim.x-position.x),
          damage:90,radius:135,triggeredAt:0,createdAt:Date.now()}));
        setStatus('Claymore planted and facing your aim direction.');
      } else if (item==='grenade') {
        await consumeEquipment('lethal',item);
        const position=localPosition||player;
        const distance=Math.min(520,Math.hypot(aim.x-position.x,aim.y-position.y));
        const angle=Math.atan2(aim.y-position.y,aim.x-position.x);
        const impact={x:position.x+Math.cos(angle)*distance,y:position.y+Math.sin(angle)*distance};
        const id='grenade_'+playerKey+'_'+Date.now();
        await updateWar('grenades/'+id,()=>({team:playerTeam,...impact,expiresAt:Date.now()+900}));
        refreshEquipmentUi();
        window.setTimeout(async()=>{
          try {
            for (const enemy of Object.values(warState&&warState.players||{})) {
              if (!enemy||enemy.team===playerTeam||enemy.transportId||!enemy.online) continue;
              const range=Math.hypot(Number(enemy.x)-impact.x,Number(enemy.y)-impact.y);
              if (range<150) await hitPlayer(enemy,range<55?90:50,{name:playerName,team:playerTeam});
            }
            await updateWar('grenades',current=>{const next={...(current||{})};delete next[id];return next;});
            setStatus('Frag grenade detonated.');
          } catch(error) { setStatus(error.message||'Grenade detonation failed.',true); }
        },900);
      }
      refreshEquipmentUi();
    } catch(error) { setStatus(error.message||'Could not use lethal equipment.',true); }
  }

  async function updateClaymores() {
    if (!warState||destroyed) return;
    for (const [id,claymore] of Object.entries(warState.claymores||{})) {
      if (!claymore||claymore.triggeredAt) continue;
      const enemies=Object.values(warState.players||{}).filter(player=>player&&player.online&&
        player.team!==claymore.team&&!player.downed&&!player.transportId&&player.hp>0&&
        Date.now()-Number(player.lastSeen||0)<20000);
      const victim=enemies.find(enemy=>{
        const dx=Number(enemy.x)-Number(claymore.x),dy=Number(enemy.y)-Number(claymore.y);
        const distance=Math.hypot(dx,dy);
        let relative=Math.atan2(dy,dx)-Number(claymore.angle||0);
        relative=Math.atan2(Math.sin(relative),Math.cos(relative));
        return distance<230&&Math.abs(relative)<Math.PI/3;
      });
      if (!victim) continue;
      let triggered=false;
      await updateWar('claymores/'+id,current=>{
        triggered=!!current&&!current.triggeredAt;
        return triggered?{...current,triggeredAt:Date.now()}:current;
      });
      if (!triggered) continue;
      for (const enemy of enemies) {
        const distance=Math.hypot(Number(enemy.x)-Number(claymore.x),Number(enemy.y)-Number(claymore.y));
        if (distance<Number(claymore.radius||135)) {
          await hitPlayer(enemy,enemy===victim?Number(claymore.damage||90):45,
            {name:claymore.owner,team:claymore.team});
        }
      }
      await updateWar('claymores',current=>{const next={...(current||{})};delete next[id];return next;});
    }
  }

  async function updateTurrets() {
    if (!warState||destroyed) return;
    const now=Date.now();
    for (const [id,turret] of Object.entries(warState.turrets||{})) {
      if (!turret||Number(turret.hp)<=0) {
        await updateWar('turrets',current=>{const next={...(current||{})};delete next[id];return next;});
        continue;
      }
      const target=Object.values(warState.players||{}).filter(player=>player&&player.team!==turret.team&&
        player.online&&!player.transportId&&!player.downed&&player.hp>0&&player.respawnAt<=now&&now-Number(player.lastSeen||0)<20000)
        .filter(player=>!isInOwnSafeZone(player.team,Number(player.x),Number(player.y)))
        .map(player=>({player,distance:Math.hypot(Number(player.x)-Number(turret.x),Number(player.y)-Number(turret.y))}))
        .filter(item=>item.distance<520&&!lineBlocked(turret.x,turret.y,item.player.x,item.player.y))
        .sort((a,b)=>a.distance-b.distance)[0];
      if (!target||now-Number(turret.lastShotAt||0)<2400) continue;
      let fired=false;
      await updateWar('turrets/'+id,current=>{
        if (!current||now-Number(current.lastShotAt||0)<2400) return current;
        fired=true;return {...current,lastShotAt:now};
      });
      if (fired) await hitPlayer(target.player,8,{name:turret.owner,team:turret.team});
    }
  }

  async function reviveNearby() {
    const player=warState&&warState.players[playerKey];
    if (!player||player.downed||player.hp<=0) return;
    const ally=Object.entries(warState.players||{}).find(([,candidate])=>candidate&&candidate.team===playerTeam&&
      candidate.downed&&Math.hypot(Number(candidate.x)-Number(localPosition?.x||player.x),
        Number(candidate.y)-Number(localPosition?.y||player.y))<145);
    if (!ally) { setStatus('Move close to a downed teammate to revive them.',true);return; }
    let revived=false;
    await updateWar('players/'+ally[0],current=>{
      if (!current||current.team!==playerTeam||!current.downed) return current;
      revived=true;
      return {...current,hp:60,downed:false,downedAt:0,respawnAt:0,lastSeen:Date.now()};
    });
    setStatus(revived?'Teammate revived.':'That teammate is no longer downed.',!revived);
  }

  async function giveUp() {
    const player=warState&&warState.players[playerKey];
    if (!player||!player.downed||giveUpBusy) return;
    giveUpBusy=true;
    try {
      await mutatePlayer(current=>current&&current.downed?{...current,hp:0,downed:false,
        deaths:Number(current.deaths||0)+1,respawnAt:Date.now()+5000}:current);
      setStatus('You gave up. Respawning in five seconds.');
    } finally { giveUpBusy=false; }
  }

  async function useSelfRevive() {
    let revived=false;
    await mutatePlayer(current=>{
      if (!current||!current.downed||Number(current.selfRevives||0)<1) return current;
      revived=true;
      return {...current,hp:50,downed:false,downedAt:0,respawnAt:0,selfRevives:current.selfRevives-1};
    });
    setStatus(revived?'Self-revive used.':'You need to be downed and have a self-revive available.',!revived);
  }

  async function applyArmorPlate() {
    const player=warState&&warState.players[playerKey];
    if (!player||player.downed||player.hp<=0) return;
    let plated=false;
    await mutatePlayer(current=>{
      plated=!!current&&!current.downed&&Number(current.armorPlates||0)>0&&Number(current.armorHp||0)<150;
      return plated?{...current,armorPlates:Number(current.armorPlates)-1,
        armorHp:Math.min(150,Number(current.armorHp||0)+50)}:current;
    });
    if (plated) setStatus('Armor plate applied. Armor: '+Number(warState.players[playerKey].armorHp||0)+' / 150.');
    else setStatus('Buy or carry an armor plate and make room by taking damage first.',true);
  }

  function nearOwnBase() {
    const position=localPosition||warState.players[playerKey];
    const base=basePositions[playerTeam];
    return Math.hypot(position.x-base.x,position.y-base.y)<230;
  }

  async function enterOrExitHouse() {
    const position=localPosition||warState.players[playerKey];
    if (houseInside) {
      const house=obstacles.find(item=>item.id===houseInside);
      if (house) {
        localPosition={x:house.doorX+32,y:house.doorY};
        houseInside='';
        await mutatePlayer(current=>({...current,...localPosition,houseInside:''}));
        setStatus('Exited the building.');
      }
      return;
    }
    const house=obstacles.find(item=>item.enterable&&Math.hypot(position.x-item.doorX,position.y-item.doorY)<110);
    if (!house) { setStatus('Move to a marked house entrance to enter.',true);return; }
    houseInside=house.id;
    localPosition={x:house.x+house.w/2,y:house.y+house.h/2};
    movementVelocity={x:0,y:0};
    await mutatePlayer(current=>({...current,...localPosition,houseInside}));
    setStatus('Inside '+house.id+'. Press Q to leave.');
  }

  async function purchaseFieldUpgrade(type) {
    const config={armor:{cost:150,label:'armor plate'},selfRevive:{cost:400,label:'self-revive'},
      turret:{cost:350,label:'sentry turret'},drone:{cost:250,label:'kamikaze drone'}};
    const item=config[type];
    if (!item) return;
    if (!nearOwnBase()) { setStatus('Field upgrades can only be purchased at your team base.',true);return; }
    const player=warState.players[playerKey];
    if (type==='armor'&&Number(player.armorPlates||0)+Math.ceil(Number(player.armorHp||0)/50)>=3) {
      setStatus('You can carry or plate up with at most three armor plates.',true);return;
    }
    try {
      let purchaseError='';
      await updateAccount(user=>{
        purchaseError='';
        if (Number(user.balance||0)<item.cost) { purchaseError='You need '+item.cost+' Sektorium for this upgrade.';return; }
        user.balance=Number(user.balance||0)-item.cost;
      });
      if (purchaseError) throw new Error(purchaseError);
      if (type==='armor') {
        await mutatePlayer(current=>({...current,armorPlates:Number(current.armorPlates||0)+1}));
      } else if (type==='selfRevive') {
        await mutatePlayer(current=>({...current,selfRevives:Number(current.selfRevives||0)+1}));
      } else if (type==='drone') {
        await mutatePlayer(current=>({...current,droneCharges:Number(current.droneCharges||0)+1}));
      } else {
        await mutatePlayer(current=>({...current,turretCharges:Number(current.turretCharges||0)+1}));
      }
      refreshProgressUi();
      refreshEquipmentUi();
      setStatus(type==='armor'?'Armor plate purchased. Press Z to apply it.':item.label+' purchased and ready.');
    } catch(error) { setStatus(error.message||'Could not purchase the field upgrade.',true); }
  }

  async function launchDrone() {
    const player=warState&&warState.players[playerKey];
    if (!player||player.lethal!=='drone'||!Number(player.droneCharges||0)) {
      setStatus('Equip a purchased kamikaze drone in your lethal slot first.',true);return;
    }
    const position=localPosition||player;
    const drone={owner:playerName,team:playerTeam,x:position.x,y:position.y,
      angle:Math.atan2(aim.y-position.y,aim.x-position.x),hp:1,manual:true,lastWriteAt:0};
    await mutatePlayer(current=>{
      const remaining=Math.max(0,Number(current.droneCharges||0)-1);
      return {...current,droneCharges:remaining,...(remaining===0?{lethal:'grenade'}:{})};
    });
    refreshEquipmentUi();
    await updateWar('drones/'+playerKey,()=>drone);
    localDronePosition={x:drone.x,y:drone.y,angle:drone.angle};
    lastDroneWriteAt=Date.now();
    activeDrone=true;
    droneControlled=true;
    setStatus('Drone launched. WASD steers it; toggle control to let it fly straight.');
  }

  function updateDrone(timestamp) {
    const current=warState&&warState.drones&&warState.drones[playerKey];
    if (!current||current.hp<=0) { activeDrone=false;localDronePosition=null;return; }
    if (!localDronePosition) localDronePosition={x:Number(current.x),y:Number(current.y),angle:Number(current.angle)||0};
    const elapsed=Math.min(.05,Math.max(0,(timestamp-(updateDrone.lastFrame||timestamp))/1000));
    updateDrone.lastFrame=timestamp;
    let dx=droneControlled?(keys.has('d')?1:0)-(keys.has('a')?1:0):0;
    let dy=droneControlled?(keys.has('s')?1:0)-(keys.has('w')?1:0):0;
    if (dx||dy) localDronePosition.angle=Math.atan2(dy,dx);
    const distance=430*elapsed;
    const next={x:localDronePosition.x+Math.cos(localDronePosition.angle)*distance,
      y:localDronePosition.y+Math.sin(localDronePosition.angle)*distance};
    const obstacle=obstacles.some(item=>circleIntersectsRect(next.x,next.y,10,item))||
      lootBoxIntersects(next.x,next.y,10);
    const hit=Object.values(warState.players||{}).find(enemy=>enemy&&enemy.team!==playerTeam&&enemy.online&&
      enemy.hp>0&&!enemy.downed&&Math.hypot(Number(enemy.x)-next.x,Number(enemy.y)-next.y)<35);
    const outOfBounds=next.x<70||next.x>worldWidth-70||next.y<110||next.y>worldHeight-110;
    if (obstacle||hit||outOfBounds||isInEnemySafeZone(playerTeam,next.x,next.y)) {
      const center=hit?{x:Number(hit.x),y:Number(hit.y)}:localDronePosition;
      const victims=Object.values(warState.players||{}).filter(enemy=>enemy&&enemy.team!==playerTeam&&
        enemy.online&&enemy.hp>0&&Math.hypot(Number(enemy.x)-center.x,Number(enemy.y)-center.y)<=180);
      for (const enemy of victims) {
        const direct=enemy===hit&&Math.hypot(Number(enemy.x)-center.x,Number(enemy.y)-center.y)<45;
        hitPlayer(enemy,direct?60:30,{name:playerName,team:playerTeam})
          .catch(error=>setStatus(error.message||'Drone damage failed.',true));
      }
      updateWar('drones',drones=>{const nextDrones={...(drones||{})};delete nextDrones[playerKey];return nextDrones;})
        .catch(error=>setStatus(error.message||'Could not remove the spent drone.',true));
      activeDrone=false;localDronePosition=null;setStatus(hit?'Drone detonated on target.':'Drone detonated on impact.');return;
    }
    localDronePosition=next;
    const local={...current,...next,angle:localDronePosition.angle};
    warState.drones[playerKey]=local;
    if (Date.now()-lastDroneWriteAt>120&&!updateDrone.writeBusy) {
      updateDrone.writeBusy=true;
      lastDroneWriteAt=Date.now();
      updateWar('drones/'+playerKey,drone=>drone?{...drone,...next,angle:local.angle,lastWriteAt:Date.now()}:drone)
        .catch(error=>setStatus(error.message||'Drone telemetry failed.',true))
        .finally(()=>{updateDrone.writeBusy=false;});
    }
  }

  async function raidBase(team,damage,attackingTeam) {
    let raided = false;
    await updateWar('bases/' + team,base => {
      raided=false;
      if (!base || Number(base.health)<=0) return base;
      const health=Math.max(0,Number(base.health)-damage);
      if (!health) { raided=true;return {health:0,destroyedUntil:0}; }
      return {...base,health};
    });
    if (raided) {
      const reset=await resetMatch();
      if (!reset) {
        setStatus('Enemy base breach failed: the match state could not be reset.',true);
        return;
      }
      const spawn=basePositions[playerTeam];
      localPosition={x:playerTeam==='vortex'?spawn.x+150:spawn.x-150,y:spawn.y};
      movementVelocity={x:0,y:0};
      if (ui) updateHeader();
      setStatus(teamLabel(attackingTeam)+' breached the enemy base. Match reset; account progression retained.');
      try { await grantXp(75,'enemy vault raided'); }
      catch(error) { setStatus('Match reset, but raid XP could not be saved: '+error.message,true); }
    } else setStatus('Enemy base hit.');
  }

  function resetPlayerRecord(player) {
    const team=player.team==='krypton'?'krypton':'vortex';
    const spawn=basePositions[team];
    const initial={name:player.name,team,x:team==='vortex'?spawn.x+150:spawn.x-150,y:spawn.y,hp:100,ammo:weapons.ar_pulse.mag,
      kills:0,deaths:0,weapon:'ar_pulse',attachments:[],loadoutSet:false,vehicle:'',vehiclePad:'',
      online:!!player.online,lastSeen:Date.now(),respawnAt:0,lastShotAt:0};
    return initial;
  }

  async function resetMatch() {
    const previousResetAt=Number(warState.matchResetAt||0);
    const applyReset=current=>{
      if (!current || !current.bases || !['vortex','krypton'].some(team=>Number(current.bases[team]?.health)<=0)) return current;
      const next=freshWar();
      next.matchResetAt=Date.now();
      next.players=Object.fromEntries(Object.entries(current.players||{}).map(([key,player])=>
        [key,resetPlayerRecord(player||{})]));
      return next;
    };
    if (firebaseMode) {
      const result=await warRef.transaction(applyReset);
      if (!result.committed||Number(result.snapshot.val()?.matchResetAt)<=previousResetAt) return false;
      warState=normalizeWar(result.snapshot.val());
      cancelCapture('Match restarted. Capture cancelled.');
      return true;
    }
    if (lanMode) {
      const latest=await lanGet();
      const previous=normalizeWar(latest);
      const reset=applyReset(previous);
      if (reset===previous) return false;
      await lanPut(reset);
      warState=normalizeWar(reset);
      cancelCapture('Match restarted. Capture cancelled.');
      draw();
      return true;
    }
    const latest=normalizeWar(JSON.parse(localStorage.getItem(localGameKey)||'null'));
    const reset=applyReset(latest);
    if (reset===latest) return false;
    warState=normalizeWar(reset);
    cancelCapture('Match restarted. Capture cancelled.');
    localStorage.setItem(localGameKey,JSON.stringify(warState));
    draw();
    return true;
  }

  async function reloadWeapon() {
    const player = warState && warState.players[playerKey];
    if (!player || reloading) return;
    const vehicleWeapon=vehicleWeapons[player.vehicle];
    const weapon=vehicleWeapon||effectiveWeapon(player);
    const ammoField=vehicleWeapon?'vehicleAmmo':'ammo';
    if (Number(player[ammoField]||0)>=weapon.mag) return;
    reloading = true;
    ui.reload.disabled = true;
    ui.reload.textContent = 'Reloading '+(vehicleWeapon?weapon.name:'')+'…';
    reloadEndsAt=Date.now()+weapon.reload;
    reloadTimer=window.setTimeout(async () => {
      try {
        await mutatePlayer(current=>current?{
          ...current,[ammoField]:vehicleWeapons[current.vehicle]&&ammoField==='vehicleAmmo'
            ?vehicleWeapons[current.vehicle].mag:ammoField==='ammo'?effectiveWeapon(current).mag:current[ammoField],
          lastSeen:Date.now()
        }:current);
      } catch (error) { setStatus(error.message,true); }
      reloading=false;reloadEndsAt=0;reloadTimer=0;
      if (!destroyed) { ui.reload.disabled=false;ui.reload.textContent='Reload (R)';ui.reloadTimer.textContent=''; }
    },weapon.reload);
  }

  async function captureOrRaid() {
    if (captureBusy || !warState) return;
    const player=warState.players[playerKey];
    if (!player) return;
    if (player.transportId) { setStatus('Disembark before capturing or raiding.');return; }
    const position=player.name===playerName&&localPosition?localPosition:player;
    const nearestCrate=Object.values(warState.lootBoxes||{})
      .filter(crate=>crate&&crate.available)
      .map(crate=>({crate,distance:Math.hypot(Number(crate.x)-position.x,Number(crate.y)-position.y)}))
      .filter(item=>item.distance<=105)
      .sort((a,b)=>a.distance-b.distance)[0];
    if (nearestCrate) { await lootNearby();return; }
    const nearest=Object.entries(nodePositions).map(([id,node])=>({id,node,distance:Math.hypot(node.x-position.x,node.y-position.y)}))
      .sort((a,b)=>a.distance-b.distance)[0];
    if (nearest && nearest.distance < 145) {
      const current=warState.nodes[nearest.id];
      if (current.team===playerTeam) { setStatus('Your team already controls this resource site.');return; }
      beginCapture(nearest.id,current.team?20_000:10_000);
      return;
    }
    const enemyBase=basePositions[playerTeam==='vortex'?'krypton':'vortex'];
    if (Math.abs(position.x-enemyBase.x)<220 && Math.abs(position.y-enemyBase.y)<250) {
      try { await raidBase(playerTeam==='vortex'?'krypton':'vortex',45,playerTeam); }
      catch(error) { setStatus(error.message,true); }
      return;
    }
    setStatus('Press E beside a marked loot crate to open it, capture a relay, or return to base to deploy a vehicle.');
  }

  async function deployVehicle() {
    if (!warState||vehicleActionBusy) return;
    vehicleActionBusy=true;
    try {
    const player=warState.players[playerKey];
    if (!player) return;
    const position=localPosition||player;
    if (player.transportId) {
      try { await leaveTransport(player); }
      catch(error) { setStatus(error.message||'Could not disembark.',true); }
      return;
    }
    if (player.vehicle) {
      try {
        await mutatePlayer(current=>current?{...current,vehicle:'',vehiclePad:'',lastSeen:Date.now()}:current);
        setStatus('Dismounted.');
      } catch(error) { setStatus(error.message,true); }
      return;
    }
    const type=ui.vehicle.value;
    const atOwnBase=isInOwnSafeZone(playerTeam,Number(position.x),Number(position.y));
    if (type!==transportType&&!atOwnBase) {
      setStatus('Vehicles can only be deployed from the marked pads inside your team base.');
      return;
    }
    try {
      const padId=playerTeam+'_'+type;
      const pad=vehiclePadPosition(playerTeam,type);
      if (!pad) throw new Error('That vehicle has no designated base pad.');
      if (type===transportType) {
        const nearby=Object.entries(warState.vehicles||{}).find(([,transport])=>transport&&
          transport.type===transportType&&transport.team===playerTeam&&transport.hp>0&&
          transport.passengers.length<10&&Math.hypot(position.x-transport.x,position.y-transport.y)<115);
        if (nearby) {
          let boarded=false;
          const [id]=nearby;
          await updateWar('vehicles/'+id,current=>{
            boarded=!!current&&current.team===playerTeam&&current.type===transportType&&
              current.passengers.length<10&&!current.passengers.includes(playerKey);
            return boarded?{...current,pilot:current.pilot||playerKey,
              passengers:[...current.passengers,playerKey]}:current;
          });
          if (!boarded) throw new Error('The helicopter is full or unavailable.');
          await mutatePlayer(current=>({...current,vehicle:transportType,transportId:id,
            vehiclePad:nearby[1].padId||'',x:nearby[1].x,y:nearby[1].y,lastSeen:Date.now()}));
          localPosition={x:nearby[1].x,y:nearby[1].y};
          localTransportId=id;
          setStatus('Boarded transport helicopter ('+(nearby[1].passengers.length+1)+'/10). Press V to disembark.');
          return;
        }
        if (!atOwnBase) {
          setStatus('Approach a friendly helicopter to board, or return to your marked base pad to deploy one.');
          return;
        }
        if (Object.values(warState.vehicles||{}).some(transport=>transport&&transport.team===playerTeam&&
            transport.type===transportType&&transport.hp>0))
          throw new Error('The helicopter pad is occupied. Board the active helicopter or wait for it to return.');
        const id='transport_'+playerKey+'_'+Date.now();
        const transport={id,type:transportType,team:playerTeam,x:pad.x,y:pad.y,padId,
          altitude:0,hp:500,maxHp:500,pilot:playerKey,passengers:[playerKey],lastMovedAt:Date.now()};
        await updateWar('vehicles/'+id,()=>transport);
        warState.vehicles[id]=transport;
        await mutatePlayer(current=>({...current,x:pad.x,y:pad.y,vehicle:transportType,
          transportId:id,vehiclePad:padId,lastSeen:Date.now()}));
        localPosition={x:pad.x,y:pad.y};
        localTransportId=id;
        setStatus('Transport helicopter deployed. W A S D to fly; up to 10 occupants. Press V to exit.');
        return;
      }
      const occupied=Object.entries(warState.players||{}).some(([key,other])=>key!==playerKey&&other&&
        other.team===playerTeam&&other.vehicle===type&&other.vehiclePad===padId&&other.online&&
        Date.now()-Number(other.lastSeen||0)<20000);
      if (occupied) throw new Error('The '+vehicles[type].name+' pad is occupied by a teammate.');
      await mutatePlayer(current=>current?{...current,x:pad.x,y:pad.y,vehicle:type,vehiclePad:padId,
        vehicleAmmo:vehicleWeapons[type]?.mag||0,lastSeen:Date.now()}:current);
      localPosition={x:pad.x,y:pad.y};
      movementVelocity={x:0,y:0};
      setStatus('Spawned '+vehicles[type].name+' at its marked base pad. Press V to dismount.');
    } catch(error) { setStatus(error.message,true); }
    } finally { vehicleActionBusy=false; }
  }

  async function leaveTransport(player) {
    const id=player.transportId;
    const transport=warState.vehicles&&warState.vehicles[id];
    const position=transport?{x:Number(transport.x),y:Number(transport.y)}:localPosition||player;
    let remaining;
    await updateWar('vehicles/'+id,current=>{
      if (!current||!Array.isArray(current.passengers)) return current;
      const passengers=current.passengers.filter(key=>key!==playerKey);
      remaining=passengers.length?{...current,passengers,
        pilot:current.pilot===playerKey?passengers[0]:current.pilot}:null;
      return remaining||null;
    });
    if (!remaining) await updateWar('vehicles',current=>{const next={...(current||{})};delete next[id];return next;});
    else if (playerKey===transport?.pilot) {
      const nextPilot=remaining.pilot;
      await updateWar('players/'+nextPilot,current=>current?{...current,x:position.x,y:position.y}:current);
    }
    await mutatePlayer(current=>current?{...current,vehicle:'',vehiclePad:'',transportId:'',
      x:position.x,y:position.y,lastSeen:Date.now()}:current);
    localPosition=position;
    localTransportId='';
    if (!remaining&&warState.vehicles) delete warState.vehicles[id];
    setStatus('Disembarked from transport.');
  }

  function beginCapture(nodeId,duration) {
    captureBusy=true;
    captureTarget=nodeId;
    captureStartedAt=Date.now();
    captureDuration=duration;
    setStatus((duration===10_000?'Empty relay':'Enemy relay')+' capture started. Hold position for '+duration/1000+' seconds.');
    updateCaptureProgress();
    captureTimer=window.setInterval(async()=>{
      if (!captureBusy) return;
      const node=nodePositions[captureTarget];
      const player=warState&&warState.players[playerKey];
      const pos=localPosition||player;
      if (!node||!player||!pos||Math.hypot(node.x-pos.x,node.y-pos.y)>175) {
        cancelCapture('Capture cancelled: stay near the relay.');
        return;
      }
      if (Date.now()-captureStartedAt<captureDuration) return;
      clearInterval(captureTimer);
      captureTimer=0;
      const id=captureTarget;
      captureBusy=false;
      captureTarget='';
      ui.captureProgress.hidden=true;
      try {
        let captured=false;
        const updated=await updateWar('nodes/'+id,nodeState=>{
          captured=false;
          if (nodeState&&nodeState.team===playerTeam) return nodeState;
          captured=true;
          return {team:playerTeam,owner:playerName,capturedAt:Date.now()};
        });
        if (captured&&updated.team===playerTeam) {
          await updateWar('economy/'+playerTeam,economy=>({...economy,resources:Number(economy&&economy.resources||0)+40}));
          setStatus('Relay secured for '+teamLabel(playerTeam)+'. +40 team resources.');
          try { await grantXp(75,'resource relay captured'); }
          catch(error) { setStatus('Relay secured, but XP could not be saved: '+error.message,true); }
          try { await payoutSektorium(); }
          catch(error) { setStatus('Relay captured, but Sektorium payout failed: '+error.message,true); }
        } else setStatus('Your team already controls that relay.');
      } catch(error) { setStatus(error.message,true); }
    },100);
  }

  function updateCaptureProgress() {
    if (!ui||!ui.captureProgress) return;
    if (!captureBusy) { ui.captureProgress.hidden=true;return; }
    const percent=Math.min(100,(Date.now()-captureStartedAt)/captureDuration*100);
    ui.captureProgress.hidden=false;
    ui.captureProgress.querySelector('span').style.width=percent+'%';
    ui.captureProgress.querySelector('strong').textContent='Capturing '+nodePositions[captureTarget].label+' · '+Math.max(0,Math.ceil((captureDuration-(Date.now()-captureStartedAt))/1000))+'s';
  }

  function cancelCapture(message) {
    if (captureTimer) clearInterval(captureTimer);
    captureTimer=0;
    captureBusy=false;
    captureTarget='';
    if (ui&&ui.captureProgress) ui.captureProgress.hidden=true;
    if (message) setStatus(message);
  }

  async function updateLootBoxes() {
    if (!warState||destroyed) return;
    const now=Date.now();
    for (const [id,crate] of Object.entries(warState.lootBoxes||{})) {
      if (!crate) continue;
      if (crate.type==='fixed'&&!crate.available&&Number(crate.respawnAt)<=now) {
        await updateWar('lootBoxes/'+id,current=>current&&!current.available&&Number(current.respawnAt)<=now
          ?{...current,available:true,respawnAt:0,claimedBy:''}:current);
      } else if (crate.type==='random'&&Number(crate.expiresAt)<=now) {
        await updateWar('lootBoxes/'+id,current=>current&&Number(current.expiresAt)<=now?null:current);
      }
    }

    const randomActive=Object.values(warState.lootBoxes||{})
      .some(crate=>crate&&crate.type==='random'&&crate.available);
    if (randomActive||Number(warState.nextRandomLootAt||0)>now) return;
    const candidate=randomLootLocations[Math.floor(Math.random()*randomLootLocations.length)];
    const occupied=Object.values(warState.lootBoxes||{}).some(crate=>crate&&crate.available&&
      Math.hypot(Number(crate.x)-candidate.x,Number(crate.y)-candidate.y)<420);
    let shouldSpawn=false;
    const nextSpawnAt=occupied?now+15_000:now+45_000+Math.floor(Math.random()*31_000);
    await updateWar('nextRandomLootAt',current=>{
      if (Number(current||0)>now) return current;
      shouldSpawn=!occupied;
      return nextSpawnAt;
    });
    if (shouldSpawn) {
      const id='airdrop_'+now;
      await updateWar('lootBoxes/'+id,current=>current||{
        id,type:'random',x:candidate.x,y:candidate.y,available:true,respawnAt:0,expiresAt:now+180_000
      });
    }
  }

  async function lootNearby() {
    const player=warState&&warState.players[playerKey];
    if (!player||player.downed||player.hp<=0) return;
    if (player.transportId) {
      setStatus('Disembark before opening a loot crate.');
      return;
    }
    const position=localPosition||player;
    const nearest=Object.entries(warState.lootBoxes||{})
      .filter(([,crate])=>crate&&crate.available)
      .map(([id,crate])=>({id,crate,distance:Math.hypot(Number(crate.x)-position.x,Number(crate.y)-position.y)}))
      .filter(item=>item.distance<=105)
      .sort((a,b)=>a.distance-b.distance)[0];
    if (!nearest) {
      setStatus('Move within 105 units of a marked loot crate and press E.');
      return;
    }
    const armorTotal=Number(player.armorPlates||0)+Math.ceil(Number(player.armorHp||0)/50);
    const drops=[
      {kind:'tactical',item:'smoke',field:'smokeCharges',amount:2,label:'2 smoke charges'},
      {kind:'tactical',item:'stim',field:'stimCharges',amount:2,label:'2 stim charges'},
      {kind:'lethal',item:'grenade',field:'grenadeCharges',amount:2,label:'2 frag grenades'},
      {kind:'lethal',item:'claymore',field:'claymoreCharges',amount:1,label:'1 claymore'},
      ...(armorTotal<3?[{kind:'plate',field:'armorPlates',amount:1,label:'1 armor plate'}]:[]),
      {kind:'resources',amount:40+Math.floor(Math.random()*41),label:'team resources'}
    ];
    const drop=drops[Math.floor(Math.random()*drops.length)];
    let claimed=false;
    try {
      await updateWar('lootBoxes/'+nearest.id,crate=>{
        claimed=!!crate&&crate.available;
        if (!claimed) return crate;
        return {...crate,available:false,claimedBy:playerKey,claimedAt:Date.now(),
          respawnAt:crate.type==='fixed'?Date.now()+90_000:0,expiresAt:crate.type==='random'?Date.now()+180_000:0};
      });
      if (!claimed) {
        setStatus('Someone else reached that loot crate first.');
        return;
      }
      if (drop.kind==='resources') {
        await updateWar('economy/'+playerTeam,economy=>({...economy,
          resources:Number(economy&&economy.resources||0)+drop.amount}));
      } else {
        let rewardLabel=drop.label;
        await mutatePlayer(current=>{
          if (!current) return current;
          if (drop.kind==='plate'&&Number(current.armorPlates||0)+Math.ceil(Number(current.armorHp||0)/50)>=3) {
            rewardLabel='1 smoke charge (armor capacity full)';
            return {...current,smokeCharges:Number(current.smokeCharges||0)+1};
          }
          return {...current,[drop.field]:Number(current[drop.field]||0)+drop.amount};
        });
        setStatus('Loot crate: '+rewardLabel+' added to your loadout.');
      }
      if (drop.kind==='resources') setStatus('Loot crate: +'+drop.amount+' resources for '+teamLabel(playerTeam)+'.');
      refreshEquipmentUi();
      draw();
    } catch(error) {
      setStatus(error.message||'Could not open the loot crate.',true);
    }
  }

  function teamLabel(team) { return team==='vortex'?'Vortex':'Krypton'; }

  async function generateTeamResources() {
    if (!warState || destroyed) return;
    if (warState.week !== weekKey()) {
      if (firebaseMode) {
        const reset = await warRef.transaction(current => !current || current.week !== weekKey() ? freshWar() : current);
        warState = normalizeWar(reset.snapshot.val());
      } else {
        warState = freshWar();
        if (lanMode) await lanPut(warState);
        else localStorage.setItem(localGameKey,JSON.stringify(warState));
      }
      await mutatePlayer(() => playerDefaults());
      setStatus('The weekly wipe is complete. Fresh war gear and resources issued.');
      draw();
      return;
    }
    const now=Date.now();
    if (firebaseMode) {
      const clockRef=warRef.child('economyClock');
      const claim=await clockRef.transaction(last=>Number(last||0)<=now-60000?now:last);
      if (!claim.committed || Number(claim.snapshot.val())!==now) return;
    } else {
      if (now-Number(warState.economyClock||0)<60000) return;
      warState.economyClock=now;
      if (lanMode) await lanPut(warState); else localStorage.setItem(localGameKey,JSON.stringify(warState));
    }
    const nodes=warState.nodes||{};
    for (const team of ['vortex','krypton']) {
      const controlled=Object.values(nodes).filter(node=>node && node.team===team).length;
      if (!controlled) continue;
      await updateWar('economy/' + team,current=>({...current,resources:Number(current && current.resources||0)+controlled*3}));
    }
  }

  async function payoutSektorium() {
    if (!warState||destroyed) return;
    const now=Date.now();
    let claimed=false;
    if (firebaseMode) {
      const claim=await warRef.child('sekoriumPayoutAt').transaction(last=>{
        claimed=false;
        if (now-Number(last||0)<60_000) return last;
        claimed=true;
        return now;
      });
      if (!claim.committed||!claimed) return;
    } else {
      if (now-Number(warState.sekoriumPayoutAt||0)<60_000) return;
      await updateWar('sekoriumPayoutAt',()=>now);
    }
    if (firebaseMode) warState=normalizeWar((await warRef.get()).val());
    else if (lanMode) warState=normalizeWar(await lanGet());
    const shares={};
    const xpShares={};
    for (const node of Object.values(warState.nodes||{})) {
      if (node&&node.team&&node.owner) {
        const owner=String(node.owner);
        shares[owner]=(shares[owner]||0)+25;
        xpShares[owner]=(xpShares[owner]||0)+50;
      }
    }
    for (const [owner,amount] of Object.entries(shares)) {
      await updateAccountByName(owner,user=>{
        user.balance=Number(user.balance||0)+amount;
        const progress=normalizeProgress(user.dropzone);
        progress.xp=Math.min(54*xpPerLevel,progress.xp+(xpShares[owner]||0));
        progress.level=Math.min(55,Math.floor(progress.xp/xpPerLevel)+1);
        user.dropzone=progress;
      });
    }
    if (Object.keys(shares).length) {
      await refreshAccount();
      refreshProgressUi();
      setStatus('Captured relays paid their owners Sektorium and 50 XP per relay.');
    }
  }

  async function equipLoadout(event) {
    event.preventDefault();
    const weaponId=ui.weapon.value;
    const chosen=[ui.attachment1.value,ui.attachment2.value].filter(Boolean);
    if (!weapons[weaponId] || chosen.some(id=>!attachments[id] ||
        !accountData.dropzone.ownedAttachments.includes(id)) || new Set(chosen).size!==chosen.length) {
      setStatus('Choose an unlocked weapon and attachments you own.',true);return;
    }
    if (weapons[weaponId].level>accountData.dropzone.level) {
      setStatus('Reach level '+weapons[weaponId].level+' to unlock '+weapons[weaponId].name+'.',true);return;
    }
    try {
      const previous=warState.players[playerKey];
      const {tactical,lethal}=equipmentChoices(previous);
      const tacticalId=ui.tactical.value,lethalId=ui.lethal.value;
      if (!tactical.some(([id])=>id===tacticalId)||!lethal.some(([id])=>id===lethalId)) {
        throw new Error('Choose field equipment you have available.');
      }
      const changing=previous && (previous.weapon!==weaponId ||
        JSON.stringify(previous.attachments||[])!==JSON.stringify(chosen)||
        previous.tactical!==tacticalId||previous.lethal!==lethalId);
      if (changing && previous && previous.loadoutSet) {
        let charged=false;
        await updateWar('economy/' + playerTeam,current=>{
          charged=Number(current && current.resources||0)>=20;
          return charged?{...(current||{}),resources:Number(current.resources)-20}:current;
        });
        if (!charged) throw new Error('Your team needs 20 resources to change a field loadout.');
      }
      await mutatePlayer(player=>({...player,weapon:weaponId,attachments:chosen,loadoutSet:true,
        tactical:tacticalId,lethal:lethalId,
        ammo:effectiveWeapon({...player,weapon:weaponId,attachments:chosen}).mag}));
      refreshProgressUi();
      refreshEquipmentUi();
      setStatus('Loadout equipped.');
    } catch(error) { setStatus(error.message,true); }
  }

  function refreshProgressUi() {
    if (!ui || !accountData) return;
    const progress=normalizeProgress(accountData.dropzone);
    accountData.dropzone=progress;
    const inLevel=progress.level===55?xpPerLevel:progress.xp%xpPerLevel;
    const remaining=progress.level===55?0:xpPerLevel-inLevel;
    ui.progress.innerHTML='<div class="nexus-war-progress-heading"><strong>Level '+progress.level+' / 55</strong><span>'+progress.xp.toLocaleString()+' XP'+
      (progress.level===55?' · MAX':' · '+remaining.toLocaleString()+' to next level')+'</span></div><div class="nexus-war-progress-bar"><span style="width:'+
      (progress.level===55?100:inLevel/xpPerLevel*100)+'%"></span></div><small>Eliminations and captured relays earn XP. Progress and purchased attachments stay with your Nexus account after weekly wipes.</small>';
    const balance=Number(accountData.balance||0);
    ui.wallet.textContent='Sektorium: '+balance.toLocaleString();
    const current=ui.weapon.value;
    ui.weapon.innerHTML=Object.entries(weapons).map(([id,weapon])=>
      '<option value="'+id+'" '+(weapon.level>progress.level?'disabled':'')+'>'+
      weapon.type+' · '+weapon.name+(weapon.level>1?' · Level '+weapon.level:'')+
      (weapon.level>progress.level?' (locked)':'')+'</option>').join('');
    ui.weapon.value=weapons[current] && weapons[current].level<=progress.level?current:'ar_pulse';
    const attachmentOptions='<option value="">No attachment</option>'+progress.ownedAttachments.map(id=>
      '<option value="'+id+'">'+attachments[id].name+'</option>').join('');
    const attachment1=ui.attachment1.value,attachment2=ui.attachment2.value;
    ui.attachment1.innerHTML=attachmentOptions;
    ui.attachment2.innerHTML=attachmentOptions;
    ui.attachment1.value=progress.ownedAttachments.includes(attachment1)?attachment1:'';
    ui.attachment2.value=progress.ownedAttachments.includes(attachment2)?attachment2:'';
    ui.attachmentShop.innerHTML=Object.entries(attachments).map(([id,item])=>{
      const owned=progress.ownedAttachments.includes(id);
      const canAfford=balance>=item.cost;
      return '<article class="nexus-war-attachment"><div><strong>'+item.name+'</strong><small>'+item.effect+' · '+item.cost.toLocaleString()+' Sektorium</small></div>'+
        '<button type="button" data-war-buy-attachment="'+id+'" '+(owned||!canAfford?'disabled':'')+'>'+
        (owned?'Owned':canAfford?'Buy':'Need '+item.cost.toLocaleString())+'</button></article>';
    }).join('');
  }

  async function buyAttachment(id) {
    const attachment=attachments[id];
    if (!attachment) return;
    try {
      let purchaseError='';
      await updateAccount(user=>{
        purchaseError='';
        const progress=normalizeProgress(user.dropzone);
        if (progress.ownedAttachments.includes(id)) { purchaseError='You already own this attachment.';return; }
        const balance=Number(user.balance||0);
        if (balance<attachment.cost) { purchaseError='You need '+attachment.cost.toLocaleString()+' Sektorium for this attachment.';return; }
        user.balance=balance-attachment.cost;
        progress.ownedAttachments.push(id);
        user.dropzone=progress;
      });
      if (purchaseError) throw new Error(purchaseError);
      refreshProgressUi();
      setStatus(attachment.name+' purchased with Sektorium.');
    } catch(error) { setStatus(error.message||'Could not purchase the attachment.',true); }
  }

  function onActionClick(event) {
    const button=event.target.closest('[data-war-action]');
    if (!button || !container || !container.contains(button)) {
      const purchase=event.target.closest('[data-war-buy-attachment]');
      if (purchase && container && container.contains(purchase)) buyAttachment(purchase.dataset.warBuyAttachment);
      return;
    }
    if (button.dataset.warAction==='fullscreen') toggleFullscreen();
    if (button.dataset.warAction==='capture') captureOrRaid();
    if (button.dataset.warAction==='vehicle') deployVehicle();
    if (button.dataset.warAction==='reload') reloadWeapon();
    if (button.dataset.warAction==='revive') reviveNearby();
    if (button.dataset.warAction==='self-revive') useSelfRevive();
    if (button.dataset.warAction==='armor') purchaseFieldUpgrade('armor');
    if (button.dataset.warAction==='turret') purchaseFieldUpgrade('turret');
    if (button.dataset.warAction==='self-revive-buy') purchaseFieldUpgrade('selfRevive');
    if (button.dataset.warAction==='drone-buy') purchaseFieldUpgrade('drone');
    if (button.dataset.warAction==='drone-launch') useLethal();
    if (button.dataset.warAction==='use-tactical') useTactical();
    if (button.dataset.warAction==='use-lethal') useLethal();
    if (button.dataset.warAction==='drone-toggle') {
      if (!warState.drones[playerKey]) { setStatus('Launch a drone before taking control.',true);return; }
      droneControlled=!droneControlled;
      updateWar('drones/'+playerKey,current=>current?{...current,manual:droneControlled}:current)
        .catch(error=>setStatus(error.message||'Could not change drone control.',true));
      setStatus(droneControlled?'Manual drone control active. WASD steers; the operator stays in place.':'Drone released to continue on its current heading.');
    }
    if (button.dataset.warAction==='give-up'&&warState.players[playerKey]?.downed) {
      setStatus('Hold the give-up button for 1.5 seconds to respawn.');
    }
  }

  async function markOffline() {
    if (!warState || !playerKey) return;
    try { await mutatePlayer(player=>player?{...player,online:false,lastSeen:Date.now()}:player); }
    catch (error) { console.error('Could not mark the Nexus war player offline:',error); }
  }

  function updateHeader() {
    const player=warState.players[playerKey];
    ui.weapon.value=player.weapon;
    ui.attachment1.value=(player.attachments||[])[0]||'';
    ui.attachment2.value=(player.attachments||[])[1]||'';
    ui.tactical.value=player.tactical||'smoke';
    ui.lethal.value=player.lethal||'grenade';
    setStatus('Connected · '+teamLabel(playerTeam)+' · WASD move, mouse aim/fire, Z plate up, X tactical, C lethal, E capture, R reload.');
    refreshProgressUi();
    refreshEquipmentUi();
    draw();
  }

  function nexusUrl() {
    const url=new URL('./nexus.html',location.href);
    if (lanMode) url.searchParams.set('lan','1');
    return url.href;
  }

  function buildUi() {
    container.innerHTML='<div class="nexus-war-heading"><div><span>'+(firebaseMode||lanMode?'LIVE MULTIPLAYER':'LOCAL PRACTICE')+'</span><h2>nexus:dropzone</h2></div><div class="nexus-war-heading-actions"><div class="nexus-war-reset" data-war-reset>Weekly wipe pending</div><button class="nexus-button secondary" type="button" data-war-action="fullscreen" aria-pressed="false">Fullscreen</button></div></div>' +
      '<p class="nexus-war-description">Explore a frontline six times wider and taller than before. Move faster on foot, and use high-speed vehicles from your team base. Click Deploy / board / dismount or press V once. Tanks and anti-air have separate ammo; aim with the mouse, fire on the map, and press R to reload. Equip a stim in your tactical slot and use X for a strong temporary speed boost and healing. Marked loot crates can contain tactical or lethal charges, armor plates, or team resources; open one with E when nearby. Fixed crates respawn, and random airdrops arrive during the match. Each base is protected by a team-only safe zone. Spawn each vehicle at its marked pad inside your base; occupied pads are unavailable. Capture empty relays in 10 seconds or enemy relays in 20. Each captured relay earns its owner 25 Sektorium and 50 XP per minute, and adds team resources once per minute. Only anti-air can bring down a transport helicopter; it lifts as it flies and seats up to ten. Press Z to apply a purchased armor plate. Enter marked houses with Q, revive allies with F, or hold G while downed to give up.</p>' +
      '<a class="nexus-button nexus-war-home" href="'+nexusUrl()+'">Back to Nexus</a>' +
      '<div class="nexus-war-status" data-war-status role="status" aria-live="polite">Connecting to the frontline…</div>' +
      '<div class="nexus-war-progression" data-war-progression></div><div class="nexus-war-wallet" data-war-wallet></div>' +
      '<div class="nexus-war-stats" data-war-stats></div>' +
      '<div class="nexus-war-map-wrap"><canvas class="nexus-war-canvas" width="3000" height="1500" aria-label="Top-down multiplayer war arena, six times its previous width and height, following your player"></canvas><canvas class="nexus-war-minimap" data-war-minimap width="360" height="180" aria-label="Full battlefield minimap showing bases, relays, buildings, players, and your viewport"></canvas></div>' +
      '<div class="nexus-war-capture" data-war-capture-progress hidden><strong>Capturing relay</strong><div><span></span></div></div>' +
      '<div class="nexus-war-controls"><span><kbd>W A S D</kbd> Move / steer drone</span><span><kbd>Mouse</kbd> Aim + fire</span><span><kbd>Z</kbd> Plate up</span><span><kbd>E</kbd> Loot / capture / raid</span><span><kbd>Q</kbd> Enter / exit house</span><span><kbd>F</kbd> Revive nearby ally</span><span><kbd>V</kbd> Deploy / board / exit (press once)</span><span><kbd>R</kbd> Reload</span><label>Vehicle<select data-war-vehicle><option value="scout_bike">Scout bike · fast</option><option value="assault_rover">Assault rover · very fast</option><option value="tank">Battle tank · cannon</option><option value="anti_air">Anti-air · cannon</option><option value="transport_helicopter">Transport helicopter · 10 seats</option></select></label><button class="nexus-button secondary" type="button" data-war-action="capture">Loot / capture nearby</button><button class="nexus-button secondary" type="button" data-war-action="vehicle">Deploy / board / dismount (V)</button><button class="nexus-button secondary" type="button" data-war-action="reload">Reload</button><span data-war-reload-timer aria-live="polite"></span></div>' +
      '<div class="nexus-war-controls"><strong>Base upgrades</strong><button class="nexus-button secondary" type="button" data-war-action="armor">Buy armor plate · 150</button><span>Press <kbd>Z</kbd> to plate up</span><button class="nexus-button secondary" type="button" data-war-action="self-revive-buy">Self-revive · 400</button><button class="nexus-button secondary" type="button" data-war-action="turret">Buy sentry turret · 350</button><button class="nexus-button secondary" type="button" data-war-action="drone-buy">Buy kamikaze drone · 250</button><button class="nexus-button secondary" type="button" data-war-action="drone-toggle">Toggle drone control</button><button class="nexus-button secondary" type="button" data-war-action="revive">Revive ally</button><button class="nexus-button secondary" type="button" data-war-action="self-revive">Use self-revive</button><button class="nexus-button secondary" type="button" data-war-action="give-up" hidden>Hold to give up</button></div>' +
      '<div class="nexus-war-touch"><div class="nexus-war-pad"><button type="button" data-war-move="up" aria-label="Move up">▲</button><button type="button" data-war-move="left" aria-label="Move left">◀</button><button type="button" data-war-move="down" aria-label="Move down">▼</button><button type="button" data-war-move="right" aria-label="Move right">▶</button></div><button type="button" class="nexus-war-fire" data-war-fire>Fire</button></div>' +
      '<form class="nexus-war-loadout"><label>Weapon<select data-war-weapon></select></label><label>Attachment 1<select data-war-attachment="1"></select></label><label>Attachment 2<select data-war-attachment="2"></select></label><label>Tactical<select data-war-tactical></select></label><label>Lethal<select data-war-lethal></select></label><button class="nexus-button" type="submit">Equip loadout</button><button class="nexus-button secondary" type="button" data-war-action="use-tactical">Use tactical (X)</button><button class="nexus-button secondary" type="button" data-war-action="use-lethal">Use lethal (C)</button><small class="nexus-war-equipment-help">Choose one tactical and one lethal. Stims restore up to 45 health and boost movement speed for 8 seconds. Smoke, stims, grenades, and claymores restock when you respawn. Purchased turret and drone charges appear in their respective slots.</small></form>' +
      '<section class="nexus-war-attachment-shop"><h3>Attachment shop</h3><p>Buy permanent upgrades with your Nexus Sektorium.</p><div data-war-attachment-shop></div></section>' +
      '<div class="nexus-war-arsenal"><strong>Arsenal</strong><span>Two assault rifles · two SMGs · two snipers · RPG-4 · Xenophage</span><small>Weapons unlock at levels 1–55. Eliminations earn 100 XP; new relay captures earn 75 XP. Each captured relay pays its owner 25 Sektorium and 50 XP per minute. Armor absorbs damage before health and is capped at three plates. Changing an established loadout costs 20 team resources.</small></div>';
    ui={
      canvas:container.querySelector('.nexus-war-canvas'),
      minimap:container.querySelector('[data-war-minimap]'),
      status:container.querySelector('[data-war-status]'),
      stats:container.querySelector('[data-war-stats]'),
      reset:container.querySelector('[data-war-reset]'),
      progress:container.querySelector('[data-war-progression]'),
      wallet:container.querySelector('[data-war-wallet]'),
      captureProgress:container.querySelector('[data-war-capture-progress]'),
      attachmentShop:container.querySelector('[data-war-attachment-shop]'),
      form:container.querySelector('.nexus-war-loadout'),
      weapon:container.querySelector('[data-war-weapon]'),
      attachment1:container.querySelector('[data-war-attachment="1"]'),
      attachment2:container.querySelector('[data-war-attachment="2"]'),
      tactical:container.querySelector('[data-war-tactical]'),
      lethal:container.querySelector('[data-war-lethal]'),
      vehicle:container.querySelector('[data-war-vehicle]'),
      reload:container.querySelector('[data-war-action="reload"]')
    };
    ui.fullscreen=container.querySelector('[data-war-action="fullscreen"]');
    ui.giveUp=container.querySelector('[data-war-action="give-up"]');
    ui.reloadTimer=container.querySelector('[data-war-reload-timer]');
    ui.weapon.innerHTML=Object.entries(weapons).map(([id,weapon])=>'<option value="'+id+'">'+weapon.type+' · '+weapon.name+'</option>').join('');
    ui.attachment1.innerHTML='<option value="">No attachment</option>';
    ui.attachment2.innerHTML='<option value="">No attachment</option>';
  }

  async function mount(target) {
    if (container===target && !destroyed) return;
    cleanup();
    container=target;
    destroyed=false;
    buildUi();
    try {
      const session=JSON.parse(localStorage.getItem(sessionKey)||'null');
      if (!session || !session.username) throw new Error('Sign in to Nexus before entering the frontline.');
      playerName=String(session.username);
      playerKey=safeUserKey(playerName);
      if (firebaseMode && !firebaseApi.auth().currentUser) await firebaseApi.auth().signInAnonymously();
      teamLookup=await getPlayerTeam(playerName);
      if (!target.isConnected) return;
      if (teamLookup!=='vortex' && teamLookup!=='krypton') {
        throw new Error('Choose Vortex or Krypton in the Nexus Shop before joining the war.');
      }
      playerTeam=teamLookup;
      await initializeGame();
    } catch(error) {
      setStatus(error.message||'Could not join the frontline.',true);
      container.classList.add('nexus-war-unavailable');
    }
  }

  function cleanup() {
    destroyed=true;
    if (animation) cancelAnimationFrame(animation);
    if (incomeTimer) clearInterval(incomeTimer);
    if (turretTimer) clearInterval(turretTimer);
    if (lootTimer) clearInterval(lootTimer);
    if (captureTimer) clearInterval(captureTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (refreshTimer) clearInterval(refreshTimer);
    if (firebaseMode && warRef && typeof warRef.off==='function') warRef.off('value');
    if (lanMode && warRef && typeof warRef.close==='function') warRef.close();
    window.removeEventListener('storage',onLocalWarStorage);
    window.removeEventListener('keydown',onKeyDown);
    window.removeEventListener('keyup',onKeyUp);
    window.removeEventListener('blur',onBlur);
    window.removeEventListener('pagehide',markOffline);
    document.removeEventListener('click',onActionClick);
    document.removeEventListener('fullscreenchange',updateFullscreenButton);
    if (container) {
      container.removeEventListener('pointerdown',onControlPointerDown);
      container.removeEventListener('pointerup',onControlPointerUp);
      container.removeEventListener('pointercancel',onControlPointerUp);
      container.removeEventListener('pointerleave',onControlPointerUp);
    }
    animation=0;
    incomeTimer=0;
    turretTimer=0;
    lootTimer=0;
    reloadTimer=0;
    reloadEndsAt=0;
    giveUpInterval=0;
    captureTimer=0;
    heartbeatTimer=0;
    refreshTimer=0;
    warRef=null;container=null;ui=null;warState=null;
    keys.clear();
    renderPositions.clear();
    localPosition=null;
    cameraPosition={x:0,y:0};
    localTransportId='';
    localDronePosition=null;
    lastDroneWriteAt=0;
    activeDrone=false;
    droneControlled=true;
    movementVelocity={x:0,y:0};
  }

  function updateSpectatorState(value,generation) {
    if (generation!==spectatorGeneration||!spectatorContainer||!spectatorContainer.isConnected) return;
    spectatorWarState=normalizeWar(value);
    updateSpectatorOptions();
    drawSpectator();
  }

  function updateSpectatorOptions() {
    if (!spectatorUi||!spectatorWarState) return;
    const select=spectatorUi.select;
    const previous=select.value||spectatorSelectedKey;
    const active=Object.entries(spectatorWarState.players||{})
      .filter(([,player])=>player&&player.online&&Date.now()-Number(player.lastSeen||0)<20000)
      .sort((a,b)=>Number(b[1].lastSeen||0)-Number(a[1].lastSeen||0));
    select.replaceChildren(new Option('Follow live action',''));
    const teams={vortex:'Vortex',krypton:'Krypton'};
    for (const team of ['vortex','krypton']) {
      const options=active.filter(([,player])=>player.team===team);
      if (!options.length) continue;
      const group=document.createElement('optgroup');
      group.label=teams[team];
      for (const [key,player] of options) {
        const option=new Option(player.name||'Player',key);
        group.append(option);
      }
      select.append(group);
    }
    spectatorSelectedKey=active.some(([key])=>key===previous)?previous:'';
    select.value=spectatorSelectedKey;
    spectatorUi.status.textContent=active.length
      ?spectatorSelectedKey
        ?'Watching '+(spectatorWarState.players[spectatorSelectedKey].name||'player')+' · '+teamLabel(spectatorWarState.players[spectatorSelectedKey].team)+'. Live read-only view.'
        :'Following live action · '+active.length+' player'+(active.length===1?'':'s')+' online.'
      :'No players are currently live. The spectator view will follow the next player who joins.';
  }

  function drawSpectator() {
    if (!spectatorUi||!spectatorWarState||!spectatorContainer?.isConnected) return;
    const canvas=spectatorUi.canvas;
    const context=canvas.getContext('2d');
    const width=canvas.width,height=canvas.height;
    const active=Object.entries(spectatorWarState.players||{})
      .filter(([,player])=>player&&player.online&&Date.now()-Number(player.lastSeen||0)<20000);
    const selected=active.find(([key])=>key===spectatorSelectedKey)||active[0];
    let focus=selected?selected[1]:{x:worldWidth/2,y:worldHeight/2};
    const transport=selected&&selected[1].transportId&&spectatorWarState.vehicles[selected[1].transportId];
    if (transport) focus=transport;
    const cameraX=Number(focus.x)||worldWidth/2,cameraY=Number(focus.y)||worldHeight/2;
    context.clearRect(0,0,width,height);
    context.fillStyle='#101915';
    context.fillRect(0,0,width,height);
    context.save();
    context.translate(width/2-cameraX,height/2-cameraY);
    context.fillStyle='#17231d';
    context.fillRect(0,0,worldWidth,worldHeight);
    const left=cameraX-width/2,top=cameraY-height/2;
    context.strokeStyle='rgba(147,190,163,.055)';
    context.lineWidth=1;
    for (let x=Math.floor(left/720)*720;x<left+width+720;x+=720) {
      context.beginPath();context.moveTo(x,top);context.lineTo(x,top+height);context.stroke();
    }
    for (let y=Math.floor(top/720)*720;y<top+height+720;y+=720) {
      context.beginPath();context.moveTo(left,y);context.lineTo(left+width,y);context.stroke();
    }
    drawSafeZone(context,'vortex');
    drawSafeZone(context,'krypton');
    drawBase(context,'vortex',basePositions.vortex.x,basePositions.vortex.y,spectatorWarState.bases.vortex);
    drawBase(context,'krypton',basePositions.krypton.x,basePositions.krypton.y,spectatorWarState.bases.krypton);
    obstacles.forEach(item=>{
      if (item.x+item.w>left-100&&item.x<left+width+100&&item.y+item.h>top-100&&item.y<top+height+100)
        drawObstacle(context,item);
    });
    Object.entries(nodePositions).forEach(([id,node])=>drawNode(context,id,node,spectatorWarState.nodes[id]));
    for (const [key,player] of active) {
      if (player.transportId) continue;
      const position=spectatorPositions.get(key)||{x:Number(player.x),y:Number(player.y)};
      position.x+=(Number(player.x)-position.x)*.32;
      position.y+=(Number(player.y)-position.y)*.32;
      spectatorPositions.set(key,position);
      drawPlayer(context,{...player,...position},key===spectatorSelectedKey);
    }
    Object.values(spectatorWarState.turrets||{}).forEach(turret=>drawTurret(context,turret));
    Object.values(spectatorWarState.drones||{}).forEach(drone=>drawDrone(context,drone));
    Object.values(spectatorWarState.vehicles||{}).forEach(vehicle=>drawTransport(context,vehicle));
    Object.values(spectatorWarState.smokes||{}).forEach(smoke=>drawSmoke(context,smoke));
    Object.values(spectatorWarState.claymores||{}).forEach(claymore=>drawClaymore(context,claymore));
    Object.values(spectatorWarState.grenades||{}).forEach(grenade=>drawThrownGrenade(context,grenade));
    Object.values(spectatorWarState.lootBoxes||{}).forEach(crate=>drawLootBox(context,crate));
    context.restore();
    if (selected) {
      const teamColor=selected[1].team==='vortex'?'#80b7ff':'#ff8792';
      context.fillStyle='rgba(6,12,9,.82)';
      context.fillRect(12,12,260,42);
      context.fillStyle=teamColor;
      context.font='bold 14px system-ui';
      context.textAlign='left';
      context.fillText((selected[1].team||'').toUpperCase()+' · '+String(selected[1].name||'Player').slice(0,24),24,38);
    }
  }

  function spectatorFrame() {
    if (!spectatorContainer||!spectatorContainer.isConnected) {
      stopSpectator();
      return;
    }
    drawSpectator();
    spectatorAnimation=requestAnimationFrame(spectatorFrame);
  }

  async function mountSpectator(target) {
    if (spectatorContainer===target) return;
    stopSpectator();
    spectatorContainer=target;
    spectatorUi={
      select:target.querySelector('[data-war-spectator-select]'),
      status:target.querySelector('[data-war-spectator-status]'),
      canvas:target.querySelector('.nexus-spectator-canvas')
    };
    const generation=spectatorGeneration;
    const onChange=()=>{spectatorSelectedKey=spectatorUi.select.value;updateSpectatorOptions();drawSpectator();};
    spectatorUi.select.addEventListener('change',onChange);
    spectatorUi.onChange=onChange;
    spectatorAnimation=requestAnimationFrame(spectatorFrame);
    try {
      if (firebaseMode) {
        if (!firebaseApi.auth().currentUser) await firebaseApi.auth().signInAnonymously();
        if (generation!==spectatorGeneration||!target.isConnected) return;
        spectatorRef=firebaseApi.database().ref(gamePath);
        spectatorRef.on('value',snapshot=>{
          if (!snapshot.exists()) {
            updateSpectatorState(null,generation);
            return;
          }
          updateSpectatorState(snapshot.val(),generation);
        },error=>{
          if (generation===spectatorGeneration&&spectatorUi)
            spectatorUi.status.textContent='Live spectator updates disconnected: '+error.message;
        });
      } else if (lanMode) {
        updateSpectatorState(await lanGet(),generation);
        spectatorEvents=new EventSource('/api/events?path='+encodeURIComponent(gamePath));
        spectatorEvents.onmessage=event=>{
          try { updateSpectatorState(JSON.parse(event.data),generation); }
          catch(error) {
            if (generation===spectatorGeneration&&spectatorUi)
              spectatorUi.status.textContent='A live spectator update could not be read: '+error.message;
          }
        };
        spectatorEvents.onerror=()=>{
          if (generation===spectatorGeneration&&spectatorUi)
            spectatorUi.status.textContent='Live spectator updates disconnected. Reconnecting…';
        };
        spectatorTimer=window.setInterval(async()=>{
          try {
            updateSpectatorState(await lanGet(),generation);
          } catch(error) {
            if (generation===spectatorGeneration&&spectatorUi)
              spectatorUi.status.textContent=error.message||'Could not refresh the live frontline.';
          }
        },1000);
      } else {
        const refreshLocal=()=>{
          try {
            updateSpectatorState(JSON.parse(localStorage.getItem(localGameKey)||'null'),generation);
          } catch(error) {
            if (generation===spectatorGeneration&&spectatorUi)
              spectatorUi.status.textContent='Could not read the local frontline: '+error.message;
          }
        };
        refreshLocal();
        spectatorTimer=window.setInterval(refreshLocal,1000);
      }
    } catch(error) {
      if (generation===spectatorGeneration&&spectatorUi)
        spectatorUi.status.textContent=error.message||'Could not connect to the live spectator view.';
    }
  }

  function stopSpectator() {
    spectatorGeneration++;
    if (spectatorAnimation) cancelAnimationFrame(spectatorAnimation);
    if (spectatorTimer) clearInterval(spectatorTimer);
    if (spectatorRef&&typeof spectatorRef.off==='function') spectatorRef.off('value');
    if (spectatorEvents) spectatorEvents.close();
    if (spectatorUi&&spectatorUi.select&&spectatorUi.onChange)
      spectatorUi.select.removeEventListener('change',spectatorUi.onChange);
    spectatorContainer=null;
    spectatorUi=null;
    spectatorWarState=null;
    spectatorRef=null;
    spectatorEvents=null;
    spectatorAnimation=0;
    spectatorTimer=0;
    spectatorSelectedKey='';
    spectatorPositions.clear();
  }

  const content=document.getElementById('content');
  const observer=new MutationObserver(()=>{
    const target=content.querySelector('[data-nexus-war]');
    if (target) mount(target);
    else if (container) cleanup();
    const spectator=content.querySelector('[data-nexus-war-spectator]');
    if (spectator) mountSpectator(spectator);
    else if (spectatorContainer) stopSpectator();
  });
  observer.observe(content,{childList:true,subtree:true});
  const existing=content.querySelector('[data-nexus-war]');
  if (existing) mount(existing);
  const existingSpectator=content.querySelector('[data-nexus-war-spectator]');
  if (existingSpectator) mountSpectator(existingSpectator);
})();
