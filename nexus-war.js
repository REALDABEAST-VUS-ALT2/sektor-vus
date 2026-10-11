(() => {
  const sharedPath = 'nexus/sharedWorld';
  const gamePath = sharedPath + '/war';
  const sessionKey = 'blobtownSession';
  const localWorldKey = 'blobtownEconomy';
  const localGameKey = 'nexusWarGame';
  const arenaVersion=4;
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
  const weaponProfiles={
    'Assault rifle':{damage:24,rate:175,mag:30,range:700,spread:.032,recoil:.018,reload:1450,model:'rifle'},
    'Submachine gun':{damage:14,rate:90,mag:36,range:460,spread:.07,recoil:.026,reload:1350,model:'smg'},
    'Light machine gun':{damage:19,rate:115,mag:65,range:750,spread:.06,recoil:.034,reload:2600,model:'lmg'},
    'Sniper rifle':{damage:86,rate:950,mag:5,range:1150,spread:.004,recoil:.032,reload:2400,model:'sniper'},
    'Shotgun':{damage:78,rate:780,mag:8,range:340,spread:.19,recoil:.045,reload:2300,model:'shotgun'},
    'Marksman rifle':{damage:48,rate:380,mag:14,range:900,spread:.012,recoil:.024,reload:1800,model:'marksman'},
    'Special':{damage:40,rate:400,mag:24,range:700,spread:.035,recoil:.022,reload:1900,model:'special'},
    'Explosive':{damage:105,rate:1250,mag:2,range:850,spread:.012,recoil:.04,reload:3000,radius:135,model:'launcher'},
    'Pistol':{damage:30,rate:260,mag:15,range:520,spread:.025,recoil:.02,reload:1250,model:'pistol'}
  };
  const primaryUnlocks=[
    {id:'shot_breach',name:'Breach-8',type:'Shotgun',level:2},
    {id:'smg_mako',name:'Mako-9',type:'Submachine gun',level:3},
    {id:'lmg_atlas',name:'Atlas 60',type:'Light machine gun',level:4},
    {id:'dmr_cinder',name:'Cinder DMR',type:'Marksman rifle',level:6},
    {id:'ar_vanguard',name:'Vanguard-5',type:'Assault rifle',level:7},
    {id:'shot_rampart',name:'Rampart 12',type:'Shotgun',level:8},
    {id:'lmg_bastion',name:'Bastion LMG',type:'Light machine gun',level:9},
    {id:'sniper_sable',name:'Sable .50',type:'Sniper rifle',level:11},
    {id:'ar_horizon',name:'Horizon 5.56',type:'Assault rifle',level:12},
    {id:'smg_wisp',name:'Wisp-45',type:'Submachine gun',level:13},
    {id:'dmr_kepler',name:'Kepler 7',type:'Marksman rifle',level:14},
    {id:'shot_ironclad',name:'Ironclad Auto',type:'Shotgun',level:15},
    {id:'lmg_longhaul',name:'Longhaul 80',type:'Light machine gun',level:16},
    {id:'ar_sundown',name:'Sundown AR',type:'Assault rifle',level:17},
    {id:'special_arc',name:'Arc Projector',type:'Special',level:19},
    {id:'dmr_meridian',name:'Meridian Mk2',type:'Marksman rifle',level:20},
    {id:'shot_thunder',name:'Thunder Tube',type:'Shotgun',level:21},
    {id:'lmg_redwood',name:'Redwood 75',type:'Light machine gun',level:22},
    {id:'smg_needle',name:'Needle-9',type:'Submachine gun',level:23},
    {id:'ar_cyclone',name:'Cyclone 6',type:'Assault rifle',level:24},
    {id:'dmr_cobalt',name:'Cobalt DMR',type:'Marksman rifle',level:26},
    {id:'shot_quarry',name:'Quarry 12G',type:'Shotgun',level:27},
    {id:'ar_drifter',name:'Drifter 5.45',type:'Assault rifle',level:28},
    {id:'lmg_mammoth',name:'Mammoth 90',type:'Light machine gun',level:29},
    {id:'special_surge',name:'Surge Repeater',type:'Special',level:30},
    {id:'smg_ghostline',name:'Ghostline-7',type:'Submachine gun',level:31},
    {id:'shot_breaker',name:'Breaker 10',type:'Shotgun',level:33},
    {id:'dmr_sentinel',name:'Sentinel DMR',type:'Marksman rifle',level:34},
    {id:'ar_onslaught',name:'Onslaught 7.62',type:'Assault rifle',level:35},
    {id:'lmg_colossus',name:'Colossus 100',type:'Light machine gun',level:36},
    {id:'special_flux',name:'Flux Carbine',type:'Special',level:37},
    {id:'sniper_nightfall',name:'Nightfall 338',type:'Sniper rifle',level:38},
    {id:'shot_grit',name:'Grit Levergun',type:'Shotgun',level:39},
    {id:'ar_raptor',name:'Raptor 6.8',type:'Assault rifle',level:41},
    {id:'dmr_wayfinder',name:'Wayfinder 6',type:'Marksman rifle',level:42},
    {id:'lmg_hammerfall',name:'Hammerfall 80',type:'Light machine gun',level:43},
    {id:'smg_afterburn',name:'Afterburn-9',type:'Submachine gun',level:44},
    {id:'shot_hellion',name:'Hellion 12',type:'Shotgun',level:45},
    {id:'sniper_whiteout',name:'Whiteout .338',type:'Sniper rifle',level:46},
    {id:'ar_blackbird',name:'Blackbird 6.5',type:'Assault rifle',level:47},
    {id:'special_prism',name:'Prism Driver',type:'Special',level:48},
    {id:'lmg_granite',name:'Granite 100',type:'Light machine gun',level:49},
    {id:'dmr_vigil',name:'Vigil 7.62',type:'Marksman rifle',level:50},
    {id:'shot_doomsday',name:'Doomsday 12',type:'Shotgun',level:51},
    {id:'ar_kingfisher',name:'Kingfisher 6',type:'Assault rifle',level:52},
    {id:'sniper_eventide',name:'Eventide Rail',type:'Sniper rifle',level:53},
    {id:'smg_undertow',name:'Undertow-45',type:'Submachine gun',level:54},
    {id:'ar_sovereign',name:'Sovereign .300',type:'Assault rifle',level:56},
    {id:'smg_razorline',name:'Razorline 9',type:'Submachine gun',level:60},
    {id:'shot_breacher',name:'Breacher 16',type:'Shotgun',level:64},
    {id:'dmr_vantage',name:'Vantage DMR',type:'Marksman rifle',level:68},
    {id:'lmg_titan',name:'Titan 120',type:'Light machine gun',level:72},
    {id:'sniper_ghostwake',name:'Ghostwake .50',type:'Sniper rifle',level:76},
    {id:'special_ion',name:'Ion Lance',type:'Special',level:80},
    {id:'ar_halcyon',name:'Halcyon 8.6',type:'Assault rifle',level:84},
    {id:'smg_needlepoint',name:'Needlepoint 12',type:'Submachine gun',level:88},
    {id:'shot_vulcan',name:'Vulcan 12',type:'Shotgun',level:92},
    {id:'dmr_longview',name:'Longview 10',type:'Marksman rifle',level:96},
    {id:'shot_leviathan',name:'Leviathan 12G',type:'Shotgun',level:98},
    {id:'smg_wraith',name:'Wraith 11',type:'Submachine gun',level:99},
    {id:'special_singularity',name:'Singularity',type:'Special',level:100}
  ];
  const rateVariants=[.94,1,1.06],spreadVariants=[.94,1,1.06];
  let shotgunIndex=0;
  for (const [index,entry] of primaryUnlocks.entries()) {
    const profile=weaponProfiles[entry.type],variant=index%3;
    weapons[entry.id]={...profile,name:entry.name,type:entry.type,level:entry.level,slot:'primary',
      damage:Math.round(profile.damage+variant*2+Math.floor(entry.level/15)),
      rate:Math.round(profile.rate*rateVariants[variant]),
      mag:profile.mag+variant*(entry.type==='Light machine gun'?5:2),
      range:profile.range+variant*15,spread:profile.spread*spreadVariants[variant],
      ...(entry.type==='Shotgun'?{pellets:[2,4,8][shotgunIndex++%3]}:{})};
  }
  const secondaryWeapons={
    pistol_sidekick:{name:'Sidekick 9',type:'Pistol',level:1,damage:30,rate:260,mag:15,range:520,spread:.025,reload:1250,model:'pistol'},
    pistol_trail:{name:'Trailblazer .45',type:'Pistol',level:4,damage:36,rate:330,mag:12,range:540,spread:.022,reload:1350,model:'pistol'},
    pistol_rivet:{name:'Rivet Auto',type:'Pistol',level:9,damage:20,rate:105,mag:24,range:420,spread:.055,reload:1450,model:'pistol'},
    pistol_warden:{name:'Warden .50',type:'Pistol',level:14,damage:48,rate:430,mag:8,range:600,spread:.035,reload:1600,model:'pistol'},
    pistol_dart:{name:'Dart 9',type:'Pistol',level:19,damage:26,rate:185,mag:20,range:510,spread:.03,reload:1300,model:'pistol'},
    pistol_marshal:{name:'Marshal 44',type:'Pistol',level:25,damage:58,rate:560,mag:6,range:620,spread:.028,reload:1800,model:'pistol'},
    pistol_quickdraw:{name:'Quickdraw 9',type:'Pistol',level:31,damage:33,rate:215,mag:18,range:540,spread:.025,reload:1350,model:'pistol'},
    pistol_shock:{name:'Shockline',type:'Pistol',level:37,damage:25,rate:145,mag:22,range:500,spread:.04,reload:1550,model:'pistol'},
    pistol_longarm:{name:'Longarm .357',type:'Pistol',level:44,damage:64,rate:620,mag:6,range:680,spread:.018,reload:1750,model:'pistol'},
    pistol_viper:{name:'Viper Burst',type:'Pistol',level:50,damage:24,rate:95,mag:27,range:460,spread:.065,reload:1600,model:'pistol'},
    explosive_mite:{name:'Mite Micro-Rocket',type:'Explosive',level:12,damage:75,rate:900,mag:3,range:600,spread:.018,reload:2200,radius:105,model:'launcher'},
    explosive_breach:{name:'Breach Charge Launcher',type:'Explosive',level:22,damage:95,rate:1100,mag:2,range:660,spread:.012,reload:2500,radius:125,model:'launcher'},
    explosive_spark:{name:'Spark Grenadier',type:'Explosive',level:33,damage:65,rate:520,mag:4,range:560,spread:.035,reload:2100,radius:95,model:'launcher'},
    explosive_talon:{name:'Talon AT',type:'Explosive',level:41,damage:120,rate:1350,mag:1,range:800,spread:.009,reload:3000,radius:150,model:'launcher'},
    explosive_quake:{name:'Quake Tube',type:'Explosive',level:48,damage:100,rate:1000,mag:2,range:720,spread:.015,reload:2600,radius:140,model:'launcher'},
    explosive_storm:{name:'Stormcell Launcher',type:'Explosive',level:54,damage:85,rate:650,mag:3,range:640,spread:.028,reload:2400,radius:120,model:'launcher'},
    pistol_nova:{name:'Nova 10mm',type:'Pistol',level:58,damage:38,rate:240,mag:18,range:550,spread:.022,reload:1300,model:'pistol'},
    explosive_comet:{name:'Comet Micro-Launcher',type:'Explosive',level:66,damage:88,rate:780,mag:3,range:680,spread:.02,reload:2250,radius:115,model:'launcher'},
    pistol_revenant:{name:'Revenant .50',type:'Pistol',level:74,damage:68,rate:590,mag:7,range:650,spread:.026,reload:1700,model:'pistol'},
    explosive_wildfire:{name:'Wildfire Grenadier',type:'Explosive',level:82,damage:78,rate:580,mag:4,range:610,spread:.03,reload:2150,radius:110,model:'launcher'},
    pistol_undertaker:{name:'Undertaker 12',type:'Pistol',level:90,damage:44,rate:300,mag:16,range:575,spread:.024,reload:1400,model:'pistol'},
    explosive_cataclysm:{name:'Cataclysm Launcher',type:'Explosive',level:100,damage:130,rate:1450,mag:1,range:900,spread:.01,reload:3200,radius:165,model:'launcher'}
  };
  for (const weapon of Object.values(secondaryWeapons)) weapon.slot='secondary';
  Object.assign(weapons,secondaryWeapons);
  for (const [id,weapon] of Object.entries(weapons)) {
    weapon.weaponId=id;
    weapon.recoil=weapon.recoil??weaponProfiles[weapon.type]?.recoil??.02;
  }
  const attachments = {
    control_grip:{name:'Angled control grip',effect:'Lower recoil and spread',spread:.9,recoil:.72,cost:250},
    control_comp:{name:'Compensator',effect:'Strong recoil reduction',spread:.84,recoil:.58,cost:350},
    laser_red:{name:'Red laser',effect:'Tighter hip-fire aim',spread:.72,cost:300},
    laser_tac:{name:'Tactical laser',effect:'Tighter hip-fire aim',spread:.82,cost:400},
    mag_extended:{name:'Extended magazine',effect:'Larger magazine',mag:1.5,cost:500},
    mag_fast:{name:'Fast magazine',effect:'Faster reload',reload:.68,cost:450},
    smg_duals:{name:'Dual SMG kit',effect:'Dual-wield SMGs · faster fire, wider spread',
      types:['Submachine gun'],dualWield:true,rate:.86,spread:1.18,recoil:1.12,cost:750},
    trigger_light:{name:'Lightened trigger',effect:'Faster firing · increased recoil',rate:.82,recoil:1.12,cost:650},
    stock_heavy:{name:'Weighted stock',effect:'Reduces recoil on sustained fire',recoil:.68,spread:.94,cost:700},
    optic_holo:{name:'Holographic sight',effect:'Improves aiming precision',spread:.78,cost:600},
    bolt_fast:{name:'Polished bolt',effect:'Faster cycling and reload',rate:.9,reload:.88,cost:850},
    barrel_ported:{name:'Ported barrel',effect:'Reduces recoil, increases spread',recoil:.78,spread:1.08,cost:750},
    burst_triple:{name:'Three-round burst kit',effect:'Fires three rounds per trigger',
      types:['Assault rifle','Marksman rifle'],burstRounds:3,cost:900},
    underbarrel_frag:{name:'Mini grenade launcher',effect:'Tab launches a timed explosive',
      types:['Assault rifle','Submachine gun','Light machine gun','Marksman rifle'],
      utility:'underbarrelFrag',utilityCooldown:6500,cost:950},
    underbarrel_smoke:{name:'Underbarrel smoke launcher',effect:'Tab deploys line-blocking smoke',
      types:['Assault rifle','Submachine gun','Light machine gun','Marksman rifle'],
      utility:'underbarrelSmoke',utilityCooldown:9000,cost:800}
  };
  const weaponColorParts=['receiver','barrel','grip'];
  const weaponColorDefaults={receiver:'#647166',barrel:'#18211c',grip:'#29362d'};
  const vehicles = {
    scout_bike:{name:'Scout bike',speed:1.9,color:'#d8c76f'},
    assault_rover:{name:'Assault rover',speed:2.3,color:'#b8836e'},
    tank:{name:'Battle tank',speed:1.55,color:'#71836e'},
    anti_air:{name:'Anti-air',speed:1.75,color:'#8da1a4'},
    transport_helicopter:{name:'Transport helicopter',speed:1.35,color:'#8da1a4'}
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
    {id:'west-depot',x:1090,y:485,w:390,h:260,enterable:true,doorX:1090,doorY:615},
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
    {id:'south-depot',x:1040,y:1050,w:380,h:270,enterable:true,doorX:1420,doorY:1185},
    {id:'south-office-a',x:730,y:1190,w:235,h:220},
    {id:'south-office-b',x:480,y:980,w:300,h:190},
    {id:'central-yard-a',x:780,y:690,w:250,h:190},
    {id:'central-yard-b',x:1080,y:780,w:295,h:190},
    {id:'central-office-a',x:1300,y:600,w:400,h:300,enterable:true,doorX:1300,doorY:750,label:'RELAY HALL'},
    {id:'central-office-b',x:1930,y:710,w:310,h:200},
    {id:'central-warehouse',x:2250,y:690,w:270,h:190}
  ].map(building=>({...building,type:'building'}));
  let obstacles=[
    {id:'north-home-a',x:650,y:220,w:130,h:110,type:'house',enterable:true,doorX:650,doorY:275},
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
  const maxLevel=100;
  const defaultNodePositions = {
    north:{x:900*mapScale,y:420*mapScale,label:'NORTH RELAY'},
    mid:{x:1500*mapScale,y:750*mapScale,label:'SCRAP YARD'},
    south:{x:2100*mapScale,y:1080*mapScale,label:'SOUTH RELAY'}
  };
  const mapCatalog=[
    {id:'frontier',name:'Vortex Frontier Reworked',variant:'Standard',points:['north','mid','south'],special:'',preview:'#64745d'},
    {id:'steel-district',name:'Steel District',variant:'Urban',points:['a','b','c','d','e'],special:'',preview:'#566a70'},
    {id:'red-canyon',name:'Red Canyon',variant:'Standard',points:['west','mid','east'],special:'',preview:'#a56a4e'},
    {id:'salt-flats',name:'Salt Flats',variant:'Standard',points:['a','c','e'],special:'',preview:'#b6a778'},
    {id:'floodplain',name:'Floodplain',variant:'Standard',points:['north','b','c','d','south'],special:'',preview:'#547b78'},
    {id:'frostline',name:'Frostline Basin',variant:'Low Visibility',points:['north','mid','south'],special:'lowVisibility',preview:'#91b8bd'},
    {id:'foundry',name:'Ironworks',variant:'Close Quarters',points:['a','b','c','d'],special:'shotgunsOnly',preview:'#84634c'},
    {id:'blackout-district',name:'Blackout District',variant:'Night Ops',points:['a','b','c','d','e'],special:'nightOps',preview:'#3c4650'}
  ];
  let activeMapId='frontier';
  let nodePositions=defaultNodePositions;
  let mapObstacles=obstacles;

  function arenaNodes(mapId) {
    const points=mapCatalog.find(map=>map.id===mapId)?.points||mapCatalog[0].points;
    const presets={
      north:{x:900,y:420,label:'NORTH RELAY'},mid:{x:1500,y:750,label:'SCRAP YARD'},south:{x:2100,y:1080,label:'SOUTH RELAY'},
      a:{x:720,y:430,label:'POINT A'},b:{x:1110,y:1070,label:'POINT B'},c:{x:1500,y:750,label:'POINT C'},
      d:{x:1890,y:430,label:'POINT D'},e:{x:2280,y:1070,label:'POINT E'},
      west:{x:720,y:750,label:'WEST RELAY'},east:{x:2280,y:750,label:'EAST RELAY'}
    };
    return Object.fromEntries(points.map(id=>[id,{...presets[id],x:presets[id].x*mapScale,y:presets[id].y*mapScale}]));
  }

  function applyArenaMap(mapId) {
    const selected=mapCatalog.find(map=>map.id===mapId)||mapCatalog[0];
    activeMapId=selected.id;
    nodePositions=arenaNodes(activeMapId);
    const urbanBuildings=[];
    if (['steel-district','foundry','blackout-district','floodplain'].includes(activeMapId)) {
      const size=activeMapId==='steel-district'?430:activeMapId==='floodplain'?250:520;
      const blocks=[
        [500,230],[1050,230],[1600,230],[2150,230],
        [500,760],[1050,760],[1600,760],[2150,760]
      ];
      blocks.slice(0,activeMapId==='floodplain'?4:blocks.length).forEach(([x,y],index)=>urbanBuildings.push({id:'map-'+activeMapId+'-block-'+index,
        x:x*mapScale,y:y*mapScale,w:size*mapScale,h:(activeMapId==='steel-district'?310:380)*mapScale,
        type:'building',label:'MULTI-LEVEL BLOCK',floorCount:4,enterable:true,
        doorX:(x+size/2)*mapScale,doorY:(y-20)*mapScale,
        stairs:{x:(x+size/2)*mapScale,y:(y+((activeMapId==='steel-district'?310:380)/2))*mapScale}}));
    }
    if (activeMapId==='red-canyon') {
      urbanBuildings.push(...[
        {id:'canyon-ridge-west',x:960*mapScale,y:180*mapScale,w:1700*mapScale,h:250*mapScale,type:'building',label:'CANYON RIDGE'},
        {id:'canyon-ridge-east',x:960*mapScale,y:1070*mapScale,w:1700*mapScale,h:250*mapScale,type:'building',label:'CANYON RIDGE'}
      ]);
    }
    const sideBlocks=activeMapId==='steel-district'||activeMapId==='blackout-district'||
      activeMapId==='foundry'||activeMapId==='red-canyon'||activeMapId==='floodplain'?urbanBuildings:[];
    const originalBuildings=obstacles.filter(item=>!String(item.id).startsWith('map-'));
    mapObstacles=[...originalBuildings,...sideBlocks];
    return selected;
  }
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
  let matchTimer=0;
  let matchLifecycleBusy=false;
  let lastVoteUiUpdate=0;
  let selectedVoteTeam='';
  let refreshTimer = 0;
  let lastPositionWrite = 0;
  let lastShot = 0;
  let recoilKick=0;
  let lastRecoilAt=0;
  let attachmentCooldownUntil=0;
  let reloading = false;
  let captureBusy = false;
  let captureTimer = 0;
  let captureTarget = '';
  let captureStartedAt = 0;
  let captureDuration = 0;
  let lastAnnouncementId='';
  let vehicleActionBusy=false;
  let localPosition = null;
  let positionWriteBusy = false;
  let grapplePull=null;
  let supportTargeting='';
  let movementVelocity={x:0,y:0};
  const renderPositions=new Map();
  let stockTimer = 0;
  let marketHistory = [];
  let reloadTimer=0;
  let reloadEndsAt=0;
  let reloadStartedAt=0;
  let turretTimer=0;
  let activeDrone=false;
  let droneControlled=true;
  let heldGiveUpTimer=0;
  let giveUpInterval=0;
  let reviveChannelTimer=0;
  let reviveChannel=null;
  let houseInside='';
  let houseFloor=0;
  let localDronePosition=null;
  let localTransportId='';
  let cameraPosition={x:0,y:0};
  let lastDroneWriteAt=0;
  let giveUpBusy=false;
  let keys = new Set();
  let aim = {x:500,y:280};
  let aimOffset={x:0,y:0};
  let aimActive=false;
  let traces = [];
  let muzzleFlashes=[];
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
  let paused=false;
  let audioContext=null;
  let soundEnabled=true;
  let soundVolume=.18;
  let lastStatsMarkup = '';
  let lastHudMarkup='';
  let lastResetLabel = '';
  let secretSequence='';

  function weekKey(date = new Date()) {
    const target = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
    const weekday = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - weekday);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(),0,1));
    const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
    return target.getUTCFullYear() + '-W' + String(week).padStart(2,'0');
  }

  async function toggleFullscreen() {
    if (!ui?.mapWrap||!ui.fullscreen) return;
    try {
      if (document.fullscreenElement===ui.mapWrap) await document.exitFullscreen();
      else if (ui.mapWrap.requestFullscreen) await ui.mapWrap.requestFullscreen();
      else setStatus('Fullscreen is not supported by this browser.',true);
    } catch(error) {
      setStatus(error.message||'Could not change fullscreen mode.',true);
    }
  }

  function updateFullscreenButton() {
    if (!ui?.fullscreen) return;
    const isFullscreen=document.fullscreenElement===ui.mapWrap;
    ui.fullscreen.textContent=isFullscreen?'Exit fullscreen':'Fullscreen';
    ui.fullscreen.setAttribute('aria-pressed',String(isFullscreen));
  }

  function togglePause(force) {
    if (!ui?.pauseMenu) return;
    const next=typeof force==='boolean'?force:!paused;
    if (next===paused) return;
    paused=next;
    keys.clear();
    pointerDown=false;
    if (paused) {
      for (const entry of ui.pauseItems) {
        if (entry.element.parentNode&&!entry.placeholder.isConnected)
          entry.element.parentNode.insertBefore(entry.placeholder,entry.element);
        ui.pauseContent.appendChild(entry.element);
      }
      ui.pauseMenu.hidden=false;
      ui.pauseButton.textContent='Resume (Esc)';
      setStatus('Paused locally. The multiplayer match continues.');
      playSound('pause');
    } else {
      for (const entry of ui.pauseItems) {
        if (entry.placeholder.parentNode) {
          entry.placeholder.parentNode.insertBefore(entry.element,entry.placeholder.nextSibling);
          entry.placeholder.remove();
        }
      }
      ui.pauseMenu.hidden=true;
      ui.pauseButton.textContent='Pause (Esc)';
      setStatus('Resumed.');
      playSound('pause');
    }
    ui.pauseButton.setAttribute('aria-pressed',String(paused));
  }

  function toggleSound() {
    soundEnabled=!soundEnabled;
    if (soundEnabled&&soundVolume<=0) {
      soundVolume=.18;
      if (ui?.soundVolume) ui.soundVolume.value='18';
    }
    if (ui?.soundToggle) ui.soundToggle.textContent=soundEnabled?'Sound: on':'Sound: off';
    if (soundEnabled) playSound('pause');
  }

  function playSound(kind) {
    if (!soundEnabled||soundVolume<=0) return;
    try {
      const AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContext) audioContext=new AudioContextClass();
      if (audioContext.state==='suspended') Promise.resolve(audioContext.resume()).catch(()=>{});
      const sounds={
        shot:{start:155,end:65,duration:.065,type:'square',gain:.42},
        switch:{start:310,end:520,duration:.11,type:'triangle',gain:.32},
        throw:{start:480,end:240,duration:.18,type:'triangle',gain:.3},
        reload:{start:560,end:190,duration:.25,type:'sawtooth',gain:.25},
        explosion:{start:105,end:38,duration:.22,type:'triangle',gain:.55},
        drone:{start:260,end:520,duration:.13,type:'triangle',gain:.32},
        pause:{start:360,end:240,duration:.1,type:'sine',gain:.24}
      };
      const sound=sounds[kind];
      if (!sound) return;
      const now=audioContext.currentTime;
      const oscillator=audioContext.createOscillator();
      const volume=audioContext.createGain();
      oscillator.type=sound.type;
      oscillator.frequency.setValueAtTime(sound.start,now);
      oscillator.frequency.exponentialRampToValueAtTime(sound.end,now+sound.duration);
      volume.gain.setValueAtTime(.0001,now);
      volume.gain.linearRampToValueAtTime(soundVolume*sound.gain,now+.008);
      volume.gain.exponentialRampToValueAtTime(.0001,now+sound.duration);
      oscillator.connect(volume);volume.connect(audioContext.destination);
      oscillator.start(now);oscillator.stop(now+sound.duration+.015);
    } catch(error) { console.debug('[Dropzone] Audio is unavailable.',error); }
  }

  function setSoundVolume(value) {
    soundVolume=Math.max(0,Math.min(1,Number(value)||0));
    soundEnabled=soundVolume>0;
    if (ui?.soundToggle) ui.soundToggle.textContent=soundEnabled?'Sound: on':'Sound: off';
    if (ui?.soundVolume) ui.soundVolume.value=String(Math.round(soundVolume*100));
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
    const startedAt=Date.now();
    return {
      arenaVersion,
      week:weekKey(),
      mapId:activeMapId,
      matchPhase:'playing',
      matchStartedAt:startedAt,
      matchEndsAt:startedAt+30*60_000,
      voteEndsAt:0,
      mapVotes:{},
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
      announcements:{},
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

  async function updateMatchLifecycle() {
    if (!warState||destroyed||matchLifecycleBusy) return;
    const now=Date.now();
    if (warState.matchPhase==='playing'&&now>=Number(warState.matchEndsAt||Infinity)) {
      matchLifecycleBusy=true;
      try {
        const next={...warState,matchPhase:'voting',voteEndsAt:now+15_000,mapVotes:{}};
        if (firebaseMode) {
          const result=await warRef.transaction(current=>current&&current.matchPhase==='playing'&&
            now>=Number(current.matchEndsAt||Infinity)?{...current,matchPhase:'voting',voteEndsAt:now+15_000,mapVotes:{}}:current);
          if (result.committed) acceptWarState(result.snapshot.val());
        } else if (lanMode) {
          const latest=normalizeWar(await lanGet());
          if (latest.matchPhase==='playing'&&now>=Number(latest.matchEndsAt||Infinity)) {
            latest.matchPhase='voting';latest.voteEndsAt=now+15_000;latest.mapVotes={};
            await lanPut(latest);acceptWarState(latest);
          }
        } else {
          next.matchPhase='voting';
          warState=next;localStorage.setItem(localGameKey,JSON.stringify(next));draw();
        }
      } catch(error) { setStatus(error.message||'Could not begin map voting.',true); }
      finally { matchLifecycleBusy=false; }
    } else if (warState.matchPhase==='voting') {
      if (ui?.mapVoteOverlay) {
        ui.mapVoteOverlay.hidden=false;
        const timer=ui.mapVoteOverlay.querySelector('[data-map-vote-timer]');
        if (timer) timer.textContent=Math.max(0,Math.ceil((Number(warState.voteEndsAt||now)-now)/1000))+'s';
        if (now-lastVoteUiUpdate>500) { renderMapVotes();lastVoteUiUpdate=now; }
      }
      if (now>=Number(warState.voteEndsAt||Infinity)) await finalizeMapVote();
    }
  }

  function voteCounts(votes) {
    return Object.values(votes||{}).reduce((counts,vote)=>{
      if (vote&&mapCatalog.some(map=>map.id===vote.mapId)) counts[vote.mapId]=(counts[vote.mapId]||0)+1;
      return counts;
    },{});
  }

  function drawMapPreview(canvas,map) {
    if (!canvas) return;
    const context=canvas.getContext('2d');
    const width=canvas.width,height=canvas.height;
    context.clearRect(0,0,width,height);
    context.fillStyle=map.preview;context.fillRect(0,0,width,height);
    context.fillStyle='rgba(18,26,22,.34)';
    context.fillRect(0,height*.44,width,height*.12);
    context.fillRect(width*.44,0,width*.12,height);
    const buildings=map.id==='frontier'?8:map.id==='red-canyon'?5:map.id==='salt-flats'?2:map.id==='floodplain'?10:18;
    for (let index=0;index<buildings;index++) {
      const column=index%6,row=Math.floor(index/6);
      const x=18+column*(width-42)/6+((row%2)*9);
      const y=15+row*(height-35)/Math.max(1,Math.ceil(buildings/6));
      const block=map.id==='steel-district'||map.id==='foundry'||map.id==='blackout-district';
      context.fillStyle=block?'#b9c7be':'rgba(207,218,189,.72)';
      context.fillRect(x,y,block?24:14,block?21:12);
      context.strokeStyle='rgba(23,33,27,.75)';context.lineWidth=2;context.strokeRect(x,y,block?24:14,block?21:12);
    }
    const points=map.points.length;
    for (let index=0;index<points;index++) {
      const angle=index/points*Math.PI*2-Math.PI/2;
      const x=width/2+Math.cos(angle)*width*.3,y=height/2+Math.sin(angle)*height*.3;
      context.fillStyle='#f3d36b';context.strokeStyle='#20251b';context.lineWidth=2;
      context.beginPath();context.arc(x,y,7,0,Math.PI*2);context.fill();context.stroke();
      context.fillStyle='#152018';context.font='bold 8px system-ui';context.textAlign='center';
      context.fillText(String.fromCharCode(65+index),x,y+3);
    }
  }

  function renderMapVotes() {
    if (!ui?.mapVoteOverlay||!warState) return;
    const active=warState.matchPhase==='voting';
    ui.mapVoteOverlay.hidden=!active;
    if (!active) return;
    const counts=voteCounts(warState.mapVotes);
    const ownVote=warState.mapVotes&&warState.mapVotes[playerKey];
    if (!selectedVoteTeam) selectedVoteTeam=ownVote?.team||playerTeam;
    ui.mapVoteOverlay.querySelectorAll('[data-vote-count]').forEach(label=>{
      label.textContent=String(counts[label.dataset.voteCount]||0);
    });
    ui.mapVoteOverlay.querySelectorAll('[data-vote-team]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.voteTeam===selectedVoteTeam));
    });
    ui.mapVoteOverlay.querySelectorAll('[data-map-preview]').forEach(canvas=>{
      const map=mapCatalog.find(entry=>entry.id===canvas.dataset.mapPreview);
      if (map&&canvas.dataset.drawn!=='true') {drawMapPreview(canvas,map);canvas.dataset.drawn='true';}
    });
  }

  async function submitMapVote(mapId) {
    if (!warState||warState.matchPhase!=='voting'||!mapCatalog.some(map=>map.id===mapId)) return;
    const team=selectedVoteTeam||playerTeam;
    if (!['vortex','krypton'].includes(team)) { setStatus('Choose a team before voting.',true);return; }
    const vote={mapId,team};
    if (team!==playerTeam) {
      await updateAccount(user=>{user.team=team;user.teamWeek=weekKey();});
      playerTeam=team;
      await mutatePlayer(player=>player?{...player,team}:player);
    }
    await updateWar('mapVotes/'+playerKey,()=>vote);
    renderMapVotes();
    setStatus('Vote recorded for '+mapCatalog.find(map=>map.id===mapId).name+'.');
  }

  async function finalizeMapVote() {
    if (matchLifecycleBusy||!warState||warState.matchPhase!=='voting') return;
    matchLifecycleBusy=true;
    try {
      const finalize=current=>{
        if (!current||current.matchPhase!=='voting'||Date.now()<Number(current.voteEndsAt||Infinity)) return current;
        const counts=voteCounts(current.mapVotes);
        const winner=mapCatalog.slice().sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0))[0]||mapCatalog[0];
        const next=freshWar();
        next.mapId=winner.id;
        next.matchStartedAt=Date.now();
        next.matchEndsAt=next.matchStartedAt+30*60_000;
        next.matchPhase='playing';
        next.voteEndsAt=0;
        next.mapVotes={};
        next.matchResetAt=Date.now();
        next.nodes=Object.fromEntries(Object.entries(arenaNodes(winner.id)).map(([id])=>
          [id,{team:'',owner:'',capturedAt:0}]));
        next.players=Object.fromEntries(Object.entries(current.players||{}).map(([key,player])=>{
          const reset=resetPlayerRecord(player||{});
          const vote=current.mapVotes&&current.mapVotes[key];
          if (vote&&['vortex','krypton'].includes(vote.team)) reset.team=vote.team;
          return [key,reset];
        }));
        return next;
      };
      let next;
      if (firebaseMode) {
        const result=await warRef.transaction(finalize);
        next=result.snapshot.val();
      } else if (lanMode) {
        const latest=normalizeWar(await lanGet());
        next=finalize(latest);
        if (next!==latest) await lanPut(next);
      } else {
        const latest=normalizeWar(JSON.parse(localStorage.getItem(localGameKey)||'null'));
        next=finalize(latest);
        localStorage.setItem(localGameKey,JSON.stringify(next));
      }
      if (next) acceptWarState(next);
      setStatus('Map vote ended. Resources reset for '+(mapCatalog.find(map=>map.id===next?.mapId)?.name||'the next map')+'.');
    } catch(error) { setStatus(error.message||'Could not start the next map.',true); }
    finally { matchLifecycleBusy=false; }
  }

  function safeUserKey(name) {
    return String(name || '').toLowerCase().replace(/[.#$\[\]/]/g,'_').slice(0,32);
  }

  function cachedDropzoneTeam(name,currentWeek) {
    try {
      const saved=JSON.parse(localStorage.getItem('nexusDropzoneTeam_'+safeUserKey(name))||'null');
      return saved&&saved.week===currentWeek&&['vortex','krypton'].includes(saved.team)?saved.team:'';
    } catch(error) { return ''; }
  }

  function cacheDropzoneTeam(name,team,currentWeek=weekKey()) {
    try {
      localStorage.setItem('nexusDropzoneTeam_'+safeUserKey(name),JSON.stringify({team,week:currentWeek}));
    } catch(error) {}
  }

  function requestUrl(path) {
    return '/api/data?path=' + encodeURIComponent(path);
  }

  function normalizeProgress(value) {
    const owned=Array.isArray(value && value.ownedAttachments)
      ? [...new Set(value.ownedAttachments.filter(id=>Object.prototype.hasOwnProperty.call(attachments,id)))]
      : [];
    const xp=Math.max(0,Math.min((maxLevel-1)*xpPerLevel,Math.floor(Number(value && value.xp)||0)));
    const weaponColor=/^#[0-9a-f]{6}$/i.test(value&&value.weaponColor||'')?value.weaponColor:'';
    const savedColors=value&&value.weaponColors&&typeof value.weaponColors==='object'?value.weaponColors:{};
    const weaponColors=Object.fromEntries(weaponColorParts.map(part=>[part,
      /^#[0-9a-f]{6}$/i.test(savedColors[part]||'')?savedColors[part]:weaponColor]));
    return {xp,level:Math.min(maxLevel,Math.floor(xp/xpPerLevel)+1),ownedAttachments:owned,weaponColor,weaponColors};
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
      const cachedUser=entry[1];
      const result=await firebaseApi.database().ref(sharedPath+'/users/'+entry[0]).transaction(current=>{
        const source=current&&typeof current==='object'?current:cachedUser;
        if (!source||typeof source!=='object') return;
        const next=JSON.parse(JSON.stringify(source));
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
      progress.xp=Math.min((maxLevel-1)*xpPerLevel,progress.xp+awarded);
      progress.level=Math.min(maxLevel,Math.floor(progress.xp/xpPerLevel)+1);
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

  async function grantSecretReward() {
    const beforeXp=normalizeProgress(accountData&&accountData.dropzone).xp;
    await updateAccount(user=>{
      const currentBalance=Number(user.balance);
      user.balance=(Number.isFinite(currentBalance)?currentBalance:0)+10_000;
      const progress=normalizeProgress(user.dropzone);
      progress.xp=Math.min((maxLevel-1)*xpPerLevel,progress.xp+10_000);
      progress.level=Math.min(maxLevel,Math.floor(progress.xp/xpPerLevel)+1);
      user.dropzone=progress;
    });
    accountData.dropzone=normalizeProgress(accountData.dropzone);
    const xpAwarded=accountData.dropzone.xp-beforeXp;
    refreshProgressUi();
    draw();
    setStatus('Secret reward: +10,000 Sektorium and +'+xpAwarded.toLocaleString()+' XP.');
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
    if (value&&mapCatalog.some(map=>map.id===value.mapId)) applyArenaMap(value.mapId);
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
      mapId:mapCatalog.some(map=>map.id===value.mapId)?value.mapId:base.mapId,
      matchPhase:value.matchPhase==='voting'?'voting':'playing',
      matchStartedAt:Number(value.matchStartedAt)||base.matchStartedAt,
      matchEndsAt:Number(value.matchEndsAt)||base.matchEndsAt,
      voteEndsAt:Number(value.voteEndsAt)||0,
      mapVotes:value.mapVotes&&typeof value.mapVotes==='object'?value.mapVotes:{},
      players:Object.fromEntries(Object.entries(players).map(([key,player])=>[key,player?{
        armorPlates:0,armorHp:0,selfRevives:0,droneCharges:0,turretCharges:0,
        smokeCharges:2,stimCharges:2,grenadeCharges:2,claymoreCharges:1,
        grappleCharges:0,airstrikeCharges:0,bunkerBusterCharges:0,rcCarCharges:0,
          tactical:'smoke',lethal:'grenade',secondary:'pistol_sidekick',secondaryAmmo:15,
          activeWeaponSlot:'primary',downed:false,downedAt:0,vehiclePad:'',vehicleAmmo:0,
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
      announcements:value.announcements&&typeof value.announcements==='object'&&!Array.isArray(value.announcements)
        ?value.announcements:{},
      lootBoxes:{...base.lootBoxes,...(value.lootBoxes||{})},
      nextRandomLootAt:Number(value.nextRandomLootAt)||base.nextRandomLootAt,
      vehicles:Object.fromEntries(Object.entries(scaleCollection(value.vehicles))
        .map(([id,vehicle])=>[id,vehicle&&vehicle.type===transportType
          ?{...vehicle,passengers:Array.isArray(vehicle.passengers)?vehicle.passengers:[]}:vehicle])),
      turrets:scaleCollection(value.turrets),
      drones:Object.fromEntries(Object.entries(scaleCollection(value.drones)).map(([id,drone])=>
        [id,drone?{...drone,angle:Number.isFinite(Number(drone.angle))?Number(drone.angle):0}:drone])),
      smokes:scaleCollection(value.smokes),
      claymores:scaleCollection(value.claymores),
      grenades:scaleCollection(value.grenades)
    };
  }

  async function getPlayerTeam(name) {
    const currentWeek=weekKey();
    const user=accountFor(await readAccountWorld(),name);
    if (user.teamWeek===currentWeek&&['vortex','krypton'].includes(user.team)) {
      cacheDropzoneTeam(name,user.team,currentWeek);
      return user.team;
    }
    const cachedTeam=cachedDropzoneTeam(name,currentWeek);
    if (cachedTeam) {
      let restoredTeam='';
      await updateAccountByName(name,current=>{
        if (current.teamWeek!==currentWeek||!['vortex','krypton'].includes(current.team)) {
          current.team=cachedTeam;
          current.teamWeek=currentWeek;
        }
        restoredTeam=current.team;
      });
      if (['vortex','krypton'].includes(restoredTeam)) return restoredTeam;
    }
    if (user.teamWeek!==currentWeek) {
      await updateAccountByName(name,current=>{
        if (current.teamWeek!==currentWeek) {
          current.team='';
          current.teamWeek=currentWeek;
        }
      });
      return '';
    }
    return user.team;
  }

  function setStatus(message, error = false) {
    if (!ui || !ui.status) return;
    ui.status.textContent = message;
    ui.status.classList.toggle('error',error);
  }

  function newestAnnouncement(announcements) {
    return Object.entries(announcements||{}).sort((a,b)=>
      Number(a[1]?.createdAt||0)-Number(b[1]?.createdAt||0)).at(-1)||null;
  }

  async function announceWar(message) {
    const id='announcement_'+Date.now()+'_'+Math.random().toString(16).slice(2);
    const announcement={text:message,createdAt:Date.now()};
    const updated=await updateWar('announcements',current=>{
      const next={...(current||{}),[id]:announcement};
      return Object.fromEntries(Object.entries(next)
        .sort((a,b)=>Number(a[1]?.createdAt||0)-Number(b[1]?.createdAt||0)).slice(-12));
    });
    if (warState) warState.announcements=updated||{[id]:announcement};
    lastAnnouncementId=id;
    setStatus(message);
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
    const initial={weapon:'ar_pulse',secondary:'pistol_sidekick',activeWeaponSlot:'primary',
      attachments:[],tactical:'smoke',lethal:'grenade'};
    const spawn=basePositions[playerTeam];
    return {
      name:playerName,team:playerTeam,x:playerTeam==='vortex'?spawn.x+150:spawn.x-150,y:spawn.y,
      hp:100,ammo:effectiveWeapon(initial,'primary').mag,
      secondaryAmmo:effectiveWeapon(initial,'secondary').mag,kills:0,deaths:0,...initial,loadoutSet:false,
      vehiclePad:'',vehicleAmmo:0,
      armorPlates:0,armorHp:0,selfRevives:0,droneCharges:0,turretCharges:0,
      smokeCharges:2,stimCharges:2,grenadeCharges:2,claymoreCharges:1,
      grappleCharges:0,airstrikeCharges:0,bunkerBusterCharges:0,rcCarCharges:0,
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
    const initialAnnouncement=newestAnnouncement(warState&&warState.announcements);
    lastAnnouncementId=initialAnnouncement?initialAnnouncement[0]:'';
    await refreshAccount();
    const activePlayer=await mutatePlayer(player => {
      const initial = playerDefaults();
      const level=accountData.dropzone.level;
      const selectedWeapon=player&&weapons[player.weapon]&&weapons[player.weapon].slot!=='secondary'&&
        weapons[player.weapon].level<=level?player.weapon:initial.weapon;
      const selectedSecondary=player&&weapons[player.secondary]?.slot==='secondary'&&
        weapons[player.secondary].level<=level?player.secondary:
        player&&weapons[player.weapon]?.slot==='secondary'&&weapons[player.weapon].level<=level
          ?player.weapon:initial.secondary;
      const selectedAttachments=(player && Array.isArray(player.attachments)?player.attachments:[])
        .filter(id=>accountData.dropzone.ownedAttachments.includes(id));
      const selectedMag=effectiveWeapon({weapon:selectedWeapon,attachments:selectedAttachments},'primary').mag;
      const selectedSecondaryMag=effectiveWeapon({secondary:selectedSecondary,attachments:selectedAttachments},'secondary').mag;
      return {...initial,...(player || {}),name:playerName,team:playerTeam,
        weaponColors:accountData.dropzone.weaponColors,weaponColor:'',
        weapon:selectedWeapon,secondary:selectedSecondary,attachments:selectedAttachments,
        ammo:player && selectedWeapon===player.weapon?Math.min(Number(player.ammo)||0,selectedMag):selectedMag,
        secondaryAmmo:player&&selectedSecondary===player.secondary
          ?Math.min(Number(player.secondaryAmmo)||0,selectedSecondaryMag):selectedSecondaryMag,
        activeWeaponSlot:player&&player.activeWeaponSlot==='secondary'?'secondary':'primary',
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
    renderMapVotes();
    const latestAnnouncement=newestAnnouncement(warState.announcements);
    if (latestAnnouncement&&latestAnnouncement[0]!==lastAnnouncementId) {
      const wasInitialized=!!lastAnnouncementId;
      lastAnnouncementId=latestAnnouncement[0];
      if (wasInitialized&&Date.now()-Number(latestAnnouncement[1]?.createdAt||0)<15_000)
        setStatus(latestAnnouncement[1].text||'Frontline update.');
    }
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

  function effectiveWeapon(player,slot=player&&player.activeWeaponSlot||'primary') {
    const weaponId=slot==='secondary'?player&&player.secondary:player&&player.weapon;
    const weapon = weapons[weaponId] || weapons.ar_pulse;
    const mods = (player && Array.isArray(player.attachments) ? player.attachments : [])
      .map(id => attachments[id]).filter(mod=>mod&&(!mod.types||mod.types.includes(weapon.type)));
    return {
      ...weapon,
      weaponId,
      rate:Math.max(40,Math.round(weapon.rate*mods.reduce((value,mod)=>value*(mod.rate||1),1))),
      spread:weapon.spread * mods.reduce((value,mod) => value * (mod.spread || 1),1),
      recoil:(weapon.recoil||.02)*mods.reduce((value,mod)=>value*(mod.recoil||1),1),
      dualWield:mods.some(mod=>mod.dualWield),
      burstRounds:mods.reduce((count,mod)=>Math.max(count,Number(mod.burstRounds)||1),1),
      utilityAttachment:mods.find(mod=>mod.utility)||null,
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
    if (matchTimer) clearInterval(matchTimer);
    animation = requestAnimationFrame(gameFrame);
    incomeTimer = window.setInterval(()=>
      Promise.all([generateTeamResources(),payoutSektorium()])
        .catch(error=>setStatus(error.message||'Resource updates failed.',true)),5000);
    turretTimer=window.setInterval(()=>updateTurrets()
      .then(updateClaymores)
      .then(updateGrenades)
      .then(updateGasHazards)
      .then(updateParkedVehicles)
      .catch(error=>setStatus(error.message||'Field equipment update failed.',true)),500);
    lootTimer=window.setInterval(()=>updateLootBoxes()
      .catch(error=>setStatus(error.message||'Loot crates could not be refreshed.',true)),5000);
    heartbeatTimer = window.setInterval(()=>
      mutatePlayer(player=>player?{...player,online:true,lastSeen:Date.now()}:player)
        .catch(error=>setStatus(error.message,true)),5000);
    matchTimer=window.setInterval(()=>updateMatchLifecycle()
      .catch(error=>setStatus(error.message||'Match rotation failed.',true)),500);
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
        ...respawn,vehicle:'',ammo:effectiveWeapon(current,'primary').mag,
        secondaryAmmo:effectiveWeapon(current,'secondary').mag,
        smokeCharges:2,stimCharges:2,grenadeCharges:2,claymoreCharges:1,
        respawnAt:0,online:true,lastSeen:Date.now()}:current)
        .then(()=>{localPosition=respawn;})
        .catch(error=>setStatus(error.message,true))
        .finally(()=>{respawnBusy=false;});
    }
    if (player&&player.downed&&Date.now()-Number(player.downedAt||0)>=10_000) {
      cancelReviveChannel();
      giveUp();
    }
    if (player && !localPosition) {
      localPosition={x:Number(player.x),y:Number(player.y)};
      houseInside=String(player.houseInside||'');
      houseFloor=Math.max(0,Number(player.houseFloor)||0);
    }
    if (!paused&&warState?.matchPhase==='playing'&&player&&player.online&&player.hp>0&&!player.downed&&!activeDrone&&
      player.respawnAt<=Date.now()&&!reloading&&!captureBusy) {
      const elapsed=Math.min(.05,Math.max(0,(timestamp-(gameFrame.lastFrame||timestamp))/1000));
      const transport=player.transportId&&warState.vehicles&&warState.vehicles[player.transportId];
      const pilot=transport&&transport.pilot===playerKey;
      const vehicle=vehicles[player.vehicle];
      const topSpeed=(vehicle?1700*vehicle.speed:3240)*(Number(player.speedBoostUntil||0)>Date.now()?1.8:1);
      const canDrive=!player.transportId||pilot;
      const dx=canDrive?((keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)):0;
      const dy=canDrive?((keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)):0;
      if (pilot&&!dx&&!dy) localPosition={x:Number(transport.x),y:Number(transport.y)};
      let moveX=dx;
      let moveY=dy;
      if (aimActive&&Math.hypot(aimOffset.x,aimOffset.y)>1) {
        const angle=Math.atan2(aimOffset.y,aimOffset.x);
        moveX=-Math.sin(angle)*dx-Math.cos(angle)*dy;
        moveY=Math.cos(angle)*dx-Math.sin(angle)*dy;
      }
      const length=Math.hypot(moveX,moveY)||1;
      const ease=1-Math.exp(-12*elapsed);
      movementVelocity.x+=(moveX/length*topSpeed-movementVelocity.x)*ease;
      movementVelocity.y+=(moveY/length*topSpeed-movementVelocity.y)*ease;
      let next={x:Math.max(70,Math.min(worldWidth-70,localPosition.x+movementVelocity.x*elapsed)),
        y:Math.max(110,Math.min(worldHeight-110,localPosition.y+movementVelocity.y*elapsed))};
      const grappling=!!grapplePull;
      if (grapplePull) {
        const dx=grapplePull.x-localPosition.x,dy=grapplePull.y-localPosition.y;
        const distance=Math.hypot(dx,dy);
        const step=Math.min(distance,4200*elapsed);
        if (distance<=48||step>=distance) {
          next={x:grapplePull.x,y:grapplePull.y};
          grapplePull=null;
          movementVelocity={x:0,y:0};
          setStatus('Grapple reached the surface.');
        } else {
          next={x:localPosition.x+dx/distance*step,y:localPosition.y+dy/distance*step};
          movementVelocity={x:dx/distance*4200,y:dy/distance*4200};
        }
      }
      const house=houseInside&&mapObstacles.find(item=>item.id===houseInside);
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
          const blocked=point=>mapObstacles.some(item=>{
            const inDoorway=item.enterable&&Math.abs(point.x-Number(item.doorX))<34&&
              Math.abs(point.y-Number(item.doorY))<44;
            return !inDoorway&&circleIntersectsRect(point.x,point.y,28,item);
          })||
            lootBoxIntersects(point.x,point.y,28);
          if (blocked(candidate)) {
            const slideX={x:candidate.x,y:localPosition.y};
            const slideY={x:localPosition.x,y:candidate.y};
            if (!blocked(slideX)) localPosition.x=slideX.x;
            else movementVelocity.x=0;
            if (!blocked(slideY)) localPosition.y=slideY.y;
            else movementVelocity.y=0;
            break;
          }
          localPosition=candidate;
        }
      } else localPosition=next;
      if ((dx||dy||grappling) && timestamp-lastPositionWrite>(lanMode?180:100) && !positionWriteBusy) {
        lastPositionWrite=timestamp;
        positionWriteBusy=true;
        const next={...localPosition};
        const facingAngle=aimActive?Math.atan2(aimOffset.y,aimOffset.x):Number(player.facingAngle)||0;
        mutatePlayer(current=>current?{...current,...next,facingAngle,lastSeen:Date.now()}:current)
          .catch(error=>setStatus(error.message,true))
          .finally(()=>{positionWriteBusy=false;});
      }
      if (pilot) updateTransportPosition(transport,localPosition,
        (keys.has('e')?1:0)-(keys.has('q')?1:0))
        .catch(error=>setStatus(error.message||'Could not update helicopter lift.',true));
    }
    const viewPosition=player&&player.transportId&&warState.vehicles[player.transportId]
      ?warState.vehicles[player.transportId]:localPosition;
    if (viewPosition) cameraPosition={x:Number(viewPosition.x),y:Number(viewPosition.y)};
    if (aimActive) aim={x:cameraPosition.x+aimOffset.x,y:cameraPosition.y+aimOffset.y};
    if (activeDrone&&!paused) updateDrone(timestamp);
    if (reloadEndsAt) {
      const remaining=Math.max(0,reloadEndsAt-Date.now());
      ui.reloadHud.hidden=!remaining;
      ui.reloadTimer.textContent=remaining?'RELOADING · '+(remaining/1000).toFixed(1)+'s':'';
      ui.reloadTimer.hidden=!remaining;
      if (ui.reloadProgress) {
        const total=Math.max(1,reloadEndsAt-reloadStartedAt);
        ui.reloadProgress.style.width=Math.min(100,(total-remaining)/total*100)+'%';
      }
    } else if (ui.reloadProgress) {
      ui.reloadHud.hidden=true;
      ui.reloadTimer.hidden=true;
      ui.reloadProgress.style.width='0%';
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
    drawTerrain(context,left,top,width,height);
    context.strokeStyle = '#54705d';
    context.strokeRect(0,0,worldWidth,worldHeight);
    drawSafeZone(context,'vortex');
    drawSafeZone(context,'krypton');
    drawVehiclePads(context,'vortex');
    drawVehiclePads(context,'krypton');
    drawBase(context,'vortex',basePositions.vortex.x,basePositions.vortex.y,warState.bases.vortex);
    drawBase(context,'krypton',basePositions.krypton.x,basePositions.krypton.y,warState.bases.krypton);
    mapObstacles.forEach(obstacle=>drawObstacle(context,obstacle));
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
    Object.values(warState.vehicles||{}).forEach(vehicle=>{
      drawTransport(context,vehicle);
      drawParkedVehicle(context,vehicle);
    });
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
      if (trace.impact) {
        context.fillStyle='#ffe6a1';
        context.beginPath();context.arc(trace.x2,trace.y2,5,0,Math.PI*2);context.fill();
      }
      context.globalAlpha = 1;
    });
    muzzleFlashes=muzzleFlashes.filter(flash=>Date.now()-flash.time<85);
    muzzleFlashes.forEach(flash=>drawMuzzleFlash(context,flash));
    if (supportTargeting&&localPosition) {
      context.save();
      context.strokeStyle=supportTargeting==='bunker_buster'?'#d4d86a':'#ffb64d';
      context.fillStyle=context.strokeStyle;
      context.globalAlpha=.9;
      context.setLineDash([18,12]);
      context.lineWidth=3;
      context.beginPath();context.moveTo(localPosition.x,localPosition.y);context.lineTo(aim.x,aim.y);context.stroke();
      context.setLineDash([]);
      context.beginPath();context.arc(aim.x,aim.y,26+Math.sin(Date.now()/100)*4,0,Math.PI*2);context.stroke();
      context.beginPath();context.moveTo(aim.x-38,aim.y);context.lineTo(aim.x+38,aim.y);
      context.moveTo(aim.x,aim.y-38);context.lineTo(aim.x,aim.y+38);context.stroke();
      context.font='bold 18px system-ui';context.textAlign='center';
      context.fillText(supportTargeting==='bunker_buster'?'BUNKER BUSTER · CLICK TARGET':'AIRSTRIKE · CLICK TARGET',aim.x,aim.y-48);
      context.restore();
    }
    context.restore();
    drawMinimap();
    updateStats(visiblePlayers);
    updateCaptureProgress();
  }

  function drawTerrain(context,left,top,width,height) {
    const spacing=2880,roadWidth=156;
    context.fillStyle='#3a463e';
    for (let x=Math.floor(left/spacing)*spacing;x<left+width+spacing;x+=spacing) {
      context.fillRect(x-roadWidth/2,Math.max(0,top),roadWidth,Math.min(worldHeight,top+height)-Math.max(0,top));
    }
    for (let y=Math.floor(top/spacing)*spacing;y<top+height+spacing;y+=spacing) {
      context.fillRect(Math.max(0,left),y-roadWidth/2,Math.min(worldWidth,left+width)-Math.max(0,left),roadWidth);
    }
    context.strokeStyle='rgba(210,205,160,.28)';
    context.lineWidth=3;
    context.setLineDash([26,34]);
    for (let x=Math.floor(left/spacing)*spacing;x<left+width+spacing;x+=spacing) {
      context.beginPath();context.moveTo(x,Math.max(0,top));context.lineTo(x,Math.min(worldHeight,top+height));context.stroke();
    }
    for (let y=Math.floor(top/spacing)*spacing;y<top+height+spacing;y+=spacing) {
      context.beginPath();context.moveTo(Math.max(0,left),y);context.lineTo(Math.min(worldWidth,left+width),y);context.stroke();
    }
    context.setLineDash([]);
    const cellSize=210;
    for (let cellX=Math.floor(left/cellSize);cellX<=(left+width)/cellSize;cellX++) {
      for (let cellY=Math.floor(top/cellSize);cellY<=(top+height)/cellSize;cellY++) {
        const roll=Math.abs(Math.sin(cellX*12.9898+cellY*78.233)*43758.5453)%1;
        if (roll<.68) continue;
        const x=cellX*cellSize+roll*150,y=cellY*cellSize+(1-roll)*150;
        if (Math.abs(x-Math.round(x/spacing)*spacing)<roadWidth/2||
            Math.abs(y-Math.round(y/spacing)*spacing)<roadWidth/2) continue;
        context.fillStyle=roll>.86?'rgba(113,139,91,.34)':'rgba(47,72,53,.38)';
        context.beginPath();context.ellipse(x,y,10+roll*8,6+roll*5,roll*2,0,Math.PI*2);context.fill();
      }
    }
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
    for (const obstacle of mapObstacles) {
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
      context.font=item.enterable?'bold 30px system-ui':'bold 11px system-ui';
      context.textAlign='center';
      context.fillText(item.label||(item.enterable?'ENTERABLE DEPOT':'BLOCKED BUILDING'),item.x+item.w/2,item.y+item.h/2+4);
      if (item.enterable) {
        context.fillStyle='#8ee6ac';
        context.fillRect(item.doorX-16,item.doorY-10,32,20);
        context.fillStyle='#101713';
        context.font='bold 36px system-ui';
        context.fillText('Q',item.doorX,item.doorY+5);
      }
      if (item.stairs) {
        context.strokeStyle='#e8c96c';context.lineWidth=4;
        context.beginPath();context.moveTo(item.stairs.x-30,item.stairs.y-40);
        context.lineTo(item.stairs.x+30,item.stairs.y+40);context.stroke();
        for (let step=0;step<5;step++) {
          const offset=step*16-32;
          context.beginPath();context.moveTo(item.stairs.x-14,item.stairs.y+offset);
          context.lineTo(item.stairs.x+14,item.stairs.y+offset+18);context.stroke();
        }
        context.fillStyle='#f2df9c';context.font='bold 16px system-ui';context.textAlign='center';
        context.fillText('STAIRS · Q',item.stairs.x,item.stairs.y+64);
      }
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
    if (!vehicle||vehicle.type!==transportType||!Array.isArray(vehicle.passengers)||vehicle.explodedAt) return;
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
    const gunners=transportGunnerKeys(vehicle);
    for (let seat=0;seat<4;seat++) {
      const side=seat<2?-1:1;
      const seatX=seat%2===0?-18:18;
      const seatY=side*19;
      context.strokeStyle='#26312c';
      context.lineWidth=3/scale;
      context.beginPath();context.moveTo(seatX,side*8);context.lineTo(seatX,side*29);context.stroke();
      context.fillStyle=gunners[seat]?(vehicle.team==='vortex'?'#83b3ff':'#ff8792'):'#303a34';
      context.beginPath();context.arc(seatX,seatY,5,0,Math.PI*2);context.fill();
      context.strokeStyle='#d1ddd4';
      context.lineWidth=2/scale;
      context.beginPath();context.moveTo(seatX,side*22);context.lineTo(seatX,side*34);context.stroke();
    }
    context.restore();
    context.fillStyle='#edf5ef';context.font='bold 13px system-ui';context.textAlign='center';
    const label=Number(vehicle.expiresAt)>Date.now()
      ?'PARKED · '+Math.ceil((Number(vehicle.expiresAt)-Date.now())/1000)+'s'
      :transportName+' · '+vehicle.passengers.length+'/10 · '+Math.round(altitude)+'m';
    context.fillText(label,x,y-34*scale);
  }

  function drawVehicleSprite(context,type,x,y,bodyColor,teamColor,angle=0) {
    context.save();
    context.translate(x,y);
    context.rotate(Number(angle)||0);
    context.lineJoin='round';
    if (type==='scout_bike') {
      context.fillStyle='#101713';
      for (const wheelX of [-24,24]) {
        context.beginPath();context.arc(wheelX,0,8,0,Math.PI*2);context.fill();
        context.strokeStyle='#9ca99e';context.lineWidth=2;
        context.beginPath();context.arc(wheelX,0,4,0,Math.PI*2);context.stroke();
      }
      context.strokeStyle='#c1ccbf';context.lineWidth=5;
      context.beginPath();context.moveTo(-20,0);context.lineTo(-7,-8);context.lineTo(10,0);
      context.lineTo(20,0);context.lineTo(9,8);context.lineTo(-7,8);context.closePath();context.stroke();
      context.fillStyle=bodyColor;
      context.beginPath();context.ellipse(0,0,12,8,0,0,Math.PI*2);context.fill();
      context.fillStyle='#252d28';context.fillRect(14,-9,12,3);context.fillRect(14,6,12,3);
    } else if (type==='assault_rover') {
      context.fillStyle='#151c18';
      for (const wheelX of [-19,18]) for (const wheelY of [-20,20]) {
        context.fillRect(wheelX-7,wheelY-5,14,10);
        context.strokeStyle='#717c73';context.lineWidth=2;context.strokeRect(wheelX-7,wheelY-5,14,10);
      }
      context.fillStyle=bodyColor;context.strokeStyle=teamColor;context.lineWidth=3;
      context.fillRect(-25,-15,51,30);context.strokeRect(-25,-15,51,30);
      context.fillStyle='#273a34';
      context.fillRect(-10,-11,19,22);
      context.fillStyle='#a8c4bd';
      context.fillRect(11,-10,10,20);
      context.strokeStyle='#d1ddd4';context.lineWidth=2;
      context.beginPath();context.moveTo(-8,0);context.lineTo(18,0);context.stroke();
      context.fillStyle='#f0cc71';context.fillRect(23,-11,4,7);context.fillRect(23,4,4,7);
    } else if (type==='tank') {
      context.fillStyle='#29332d';
      context.fillRect(-27,-22,55,9);context.fillRect(-27,13,55,9);
      context.strokeStyle='#89968a';context.lineWidth=2;
      context.strokeRect(-27,-22,55,9);context.strokeRect(-27,13,55,9);
      context.fillStyle=bodyColor;context.strokeStyle=teamColor;context.lineWidth=3;
      context.fillRect(-25,-13,48,26);context.strokeRect(-25,-13,48,26);
      context.fillStyle='#596b59';
      context.beginPath();context.ellipse(-2,0,13,11,0,0,Math.PI*2);context.fill();
      context.strokeStyle='#28352b';context.lineWidth=7;
      context.beginPath();context.moveTo(-2,0);context.lineTo(30,0);context.stroke();
      context.strokeStyle='#bdc6bd';context.lineWidth=2;
      context.beginPath();context.moveTo(22,0);context.lineTo(30,0);context.stroke();
    } else if (type==='anti_air') {
      context.fillStyle='#171f1c';
      for (const wheelX of [-20,16]) for (const wheelY of [-19,19]) {
        context.beginPath();context.arc(wheelX,wheelY,6,0,Math.PI*2);context.fill();
      }
      context.fillStyle=bodyColor;context.strokeStyle=teamColor;context.lineWidth=3;
      context.fillRect(-26,-14,52,28);context.strokeRect(-26,-14,52,28);
      context.fillStyle='#314743';context.fillRect(-9,-10,14,20);
      context.strokeStyle='#d7e0d8';context.lineWidth=4;
      context.beginPath();context.moveTo(1,-6);context.lineTo(31,-17);context.moveTo(1,6);context.lineTo(31,17);context.stroke();
      context.strokeStyle='#59655d';context.lineWidth=8;
      context.beginPath();context.moveTo(21,-13);context.lineTo(31,-17);context.moveTo(21,13);context.lineTo(31,17);context.stroke();
    }
    context.restore();
  }

  function drawHeldWeapon(context,weapon) {
    const model=weapon.model||({
      'Assault rifle':'rifle','Submachine gun':'smg','Sniper rifle':'sniper',Special:'special'
    }[weapon.type]||'rifle');
    const weaponKey=String(weapon.weaponId||weapon.name||model);
    const weaponSeed=Array.from(weaponKey).reduce((seed,char)=>seed+char.charCodeAt(0),0);
    const finishes=['#70a9bf','#c87a5f','#d3b263','#8796ca','#bd78a1','#84ad70','#d0d5cc','#d58d48'];
    const finish=finishes[weaponSeed%finishes.length];
    const legacyColor=/^#[0-9a-f]{6}$/i.test(weapon.customColor||'')?weapon.customColor:'';
    const customColors=weapon.customColors&&typeof weapon.customColors==='object'?weapon.customColors:{};
    const receiverColor=/^#[0-9a-f]{6}$/i.test(customColors.receiver||'')?customColors.receiver:legacyColor||finish;
    const barrelColor=/^#[0-9a-f]{6}$/i.test(customColors.barrel||'')?customColors.barrel:legacyColor||'#18211c';
    const gripColor=/^#[0-9a-f]{6}$/i.test(customColors.grip||'')?customColors.grip:legacyColor||'#29362d';
    if (weapon.dualWield) {
      context.save();context.translate(0,-4);
      drawHeldWeapon(context,{...weapon,dualWield:false});context.restore();
      context.save();context.translate(0,4);context.scale(.82,.82);
      drawHeldWeapon(context,{...weapon,dualWield:false});context.restore();
      return;
    }
    context.lineCap='square';
    context.fillStyle='#18211c';
    context.strokeStyle='#c0c9be';
    context.lineWidth=1.5;
    if (model==='pistol') {
      context.fillStyle=barrelColor;context.fillRect(13,-3,18,6);
      context.fillStyle=receiverColor;context.fillRect(17,-4,13,2);
      context.fillStyle=gripColor;context.fillRect(17,2,7,7);
      context.fillStyle='#111a15';context.fillRect(29,-2,5,4);
    } else if (model==='smg') {
      context.fillStyle=receiverColor;context.fillRect(12,-4,27,8);
      context.fillStyle=barrelColor;context.fillRect(36,-2,11,4);
      context.fillStyle=receiverColor;context.fillRect(16,-5.5,15,3.5);
      context.fillStyle=gripColor;context.fillRect(21,3,7,10);
      context.fillStyle='#111a15';context.fillRect(43,-2,4,4);
    } else if (model==='shotgun') {
      context.fillStyle=barrelColor;context.fillRect(10,-5,33,10);
      context.fillStyle=receiverColor;context.fillRect(15,-6,17,12);
      context.fillStyle=gripColor;context.fillRect(25,5,5,10);
      context.fillRect(39,-3,8,6);
    } else if (model==='sniper') {
      context.fillStyle=barrelColor;context.fillRect(8,-3,47,6);
      context.fillStyle=receiverColor;context.fillRect(16,-5,20,3);
      context.fillStyle=gripColor;context.fillRect(19,2,8,4);
      context.fillStyle='#131a16';context.fillRect(51,-1.5,11,3);
    } else if (model==='lmg') {
      context.fillStyle=receiverColor;context.fillRect(10,-5,38,10);
      context.fillStyle=receiverColor;context.fillRect(14,-7,25,4);
      context.fillStyle=gripColor;context.fillRect(22,4,9,11);
      context.fillStyle=barrelColor;context.fillRect(44,-2,11,4);
      context.fillStyle='#111a15';context.fillRect(53,-2,3,4);
    } else if (model==='launcher') {
      context.fillStyle=barrelColor;context.fillRect(10,-7,39,14);
      context.strokeRect(10,-7,39,14);
      context.fillStyle=receiverColor;context.fillRect(15,-4,20,8);
      context.fillStyle=gripColor;context.fillRect(45,-5,11,10);
      context.fillStyle='#f0c76b';context.fillRect(54,-2,4,4);
    } else if (model==='marksman') {
      context.fillStyle=barrelColor;context.fillRect(9,-3.5,43,7);
      context.fillStyle=receiverColor;context.fillRect(17,-6,18,3);
      context.fillStyle=gripColor;context.fillRect(24,3,6,8);
      context.fillStyle='#111a15';context.fillRect(48,-1.5,10,3);
    } else if (model==='special') {
      context.fillStyle=receiverColor;context.fillRect(10,-5,36,10);
      context.fillStyle=barrelColor;context.fillRect(43,-2,9,4);
      context.fillStyle=receiverColor;context.fillRect(18,-3,16,2);
      context.fillStyle=gripColor;context.fillRect(21,4,7,9);
      context.fillStyle='#111a15';context.fillRect(49,-2,3,4);
    } else {
      context.fillStyle=barrelColor;context.fillRect(10,-4,37,8);
      context.fillStyle=receiverColor;context.fillRect(17,-6,18,3);
      context.fillStyle=gripColor;context.fillRect(23,4,7,10);
      context.fillStyle='#111a15';context.fillRect(43,-2,10,4);
    }
    context.fillStyle=receiverColor;
    context.fillRect(13+(weaponSeed%5)*4,-1.5,3,3);
  }

  function drawParkedVehicle(context,vehicle) {
    if (!vehicle||!vehicle.parked) return;
    if (vehicle.explodedAt) {
      drawThrownGrenade(context,{x:vehicle.x,y:vehicle.y,detonatedAt:vehicle.explodedAt,
        expiresAt:vehicle.cleanupAt,radius:170});
      return;
    }
    if (vehicle.type===transportType) return;
    const x=Number(vehicle.x),y=Number(vehicle.y);
    const remaining=Math.max(0,Math.ceil((Number(vehicle.expiresAt)-Date.now())/1000));
    drawVehicleSprite(context,vehicle.type,x,y,vehicles[vehicle.type]?.color||'#8da1a4',
      vehicle.team==='vortex'?'#9fc4ff':'#ffabb1',vehicle.facingAngle);
    context.fillStyle='#edf5ef';context.font='bold 11px system-ui';context.textAlign='center';
    context.fillText((vehicles[vehicle.type]?.name||'Vehicle')+' · '+remaining+'s',x,y+38);
  }

  function transportGunnerKeys(vehicle) {
    return Array.isArray(vehicle&&vehicle.passengers)
      ?vehicle.passengers.filter(key=>key!==vehicle.pilot).slice(0,4):[];
  }

  function transportGunnerPosition(vehicle,key) {
    const seat=transportGunnerKeys(vehicle).indexOf(key);
    if (seat<0) return null;
    const scale=1+Math.max(0,Math.min(100,Number(vehicle.altitude)||0))/100;
    return {x:Number(vehicle.x)+(seat%2===0?-18:18)*scale,
      y:Number(vehicle.y)+(seat<2?-24:24)*scale};
  }

  async function updateTransportPosition(vehicle,position,altitudeInput=0) {
    if (!vehicle||Date.now()-Number(updateTransportPosition.lastWriteAt||0)<140) return;
    const now=Date.now();
    updateTransportPosition.lastWriteAt=now;
    let updated;
    await updateWar('vehicles/'+vehicle.id,current=>{
      if (!current||current.pilot!==playerKey) return current;
      const elapsed=Math.max(0,now-Number(current.lastMovedAt||now))/1000;
      const moving=Math.hypot(position.x-Number(current.x),position.y-Number(current.y))>2;
      const liftRate=altitudeInput?altitudeInput*30:moving?12:0;
      const lift=Math.max(0,Math.min(100,Number(current.altitude||0)+elapsed*liftRate));
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
    if (drone.type==='rc_car') {
      context.fillStyle='#141b17';
      context.fillRect(-15,-13,12,5);context.fillRect(8,-13,12,5);
      context.fillRect(-15,8,12,5);context.fillRect(8,8,12,5);
      context.fillStyle='#dc6653';context.strokeStyle='#f6d07d';context.lineWidth=2;
      context.fillRect(-13,-9,28,18);context.strokeRect(-13,-9,28,18);
      context.fillStyle='#f0c76b';context.fillRect(4,-5,8,10);
      context.fillStyle='#fff0b1';context.beginPath();context.arc(16,0,3,0,Math.PI*2);context.fill();
    } else {
      context.fillStyle='#f0d365';
      context.beginPath();
      context.moveTo(20,0);context.lineTo(-12,-10);context.lineTo(-8,0);context.lineTo(-12,10);
      context.closePath();context.fill();
    }
    context.restore();
  }

  function drawSmoke(context,smoke) {
    if (!smoke||Number(smoke.expiresAt)<=Date.now()) return;
    const now=Date.now();
    const age=Math.max(0,(now-Number(smoke.createdAt||now))/1000);
    const baseRadius=Number(smoke.radius)||260;
    const radius=baseRadius*(.62+.38*Math.min(1,age/.72));
    const fade=Math.min(1,(Number(smoke.expiresAt)-now)/2500);
    const gas=!!smoke.gas;
    const gradient=context.createRadialGradient(smoke.x,smoke.y,radius*.06,smoke.x,smoke.y,radius);
    gradient.addColorStop(0,gas?'rgba(125,137,38,.96)':'rgba(29,35,31,.98)');
    gradient.addColorStop(.52,gas?'rgba(113,125,39,.9)':'rgba(39,46,41,.96)');
    gradient.addColorStop(.84,gas?'rgba(91,103,43,.72)':'rgba(49,57,51,.82)');
    gradient.addColorStop(1,gas?'rgba(89,99,39,.1)':'rgba(57,66,59,.12)');
    context.save();
    context.globalAlpha=.94*fade;
    context.fillStyle=gradient;
    context.beginPath();context.arc(smoke.x,smoke.y,radius,0,Math.PI*2);context.fill();
    context.globalAlpha=.35*fade;
    context.fillStyle=gas?'#747c35':'#343c36';
    for (let puff=0;puff<5;puff++) {
      const phase=age*1.1+puff*1.9+Number(smoke.seed||0);
      const angle=puff*Math.PI*2/5+Number(smoke.seed||0)+Math.sin(phase)*.12;
      const offset=radius*(.34+Math.sin(phase*.8)*.055);
      const drift=((age*9+puff*13)%(radius*.16));
      context.beginPath();
      context.ellipse(smoke.x+Math.cos(angle)*offset,smoke.y+Math.sin(angle)*offset-drift,
        radius*(.4+Math.sin(phase)*.025),radius*(.32+Math.cos(phase)*.02),angle,0,Math.PI*2);
      context.fill();
    }
    if (gas) {
      context.globalAlpha=.9*fade;
      context.fillStyle='#e7eb9a';
      context.font='bold 16px system-ui';
      context.textAlign='center';
      context.fillText('MUSTARD GAS',smoke.x,smoke.y-radius*.72);
    }
    context.restore();
  }

  function drawClaymore(context,claymore) {
    if (!claymore||claymore.triggeredAt) return;
    context.save();
    context.translate(Number(claymore.x),Number(claymore.y));
    context.rotate(Number(claymore.angle)||0);
    context.fillStyle='rgba(231,186,83,.11)';
    context.beginPath();context.moveTo(16,0);context.arc(0,0,230,-Math.PI/3,Math.PI/3);context.closePath();context.fill();
    context.strokeStyle='rgba(238,194,94,.45)';context.lineWidth=2;context.setLineDash([9,8]);
    context.beginPath();context.moveTo(30,0);context.lineTo(212,0);context.stroke();context.setLineDash([]);
    context.fillStyle='rgba(4,7,5,.55)';
    context.beginPath();context.ellipse(-2,4,29,22,0,0,Math.PI*2);context.fill();
    context.fillStyle='#29352d';context.strokeStyle='#b8c3b5';context.lineWidth=2;
    context.fillRect(-25,-17,43,34);context.strokeRect(-25,-17,43,34);
    context.fillStyle='#475747';context.fillRect(-19,-12,31,24);
    context.strokeStyle='#18211b';context.lineWidth=2;
    for (const offset of [-7,0,7]) {
      context.beginPath();context.moveTo(-16,offset);context.lineTo(9,offset);context.stroke();
    }
    context.fillStyle='#d6bd79';
    context.beginPath();context.moveTo(18,-13);context.lineTo(29,-9);context.lineTo(29,9);context.lineTo(18,13);context.closePath();context.fill();
    context.strokeStyle='#303a31';context.lineWidth=2;context.stroke();
    context.fillStyle='#f07858';
    context.beginPath();context.arc(24,0,3.5,0,Math.PI*2);context.fill();
    context.fillStyle='#d9e0c7';
    for (const sensorY of [-8,0,8]) {
      context.beginPath();context.arc(18,sensorY,2,0,Math.PI*2);context.fill();
    }
    context.fillStyle='#141a16';
    context.fillRect(-14,-21,18,4);context.fillRect(-14,17,18,4);
    context.restore();
  }

  function drawMuzzleFlash(context,flash) {
    const age=Date.now()-flash.time;
    if (age<0||age>=85) return;
    const fade=1-age/85;
    context.save();
    context.translate(flash.x,flash.y);
    context.rotate(flash.angle);
    context.globalAlpha=fade;
    context.globalCompositeOperation='lighter';
    context.shadowColor='#ff9a42';
    context.shadowBlur=18*fade;
    context.fillStyle='#ffb347';
    context.beginPath();
    context.moveTo(-3,-5);context.lineTo(17,-2);context.lineTo(24,0);
    context.lineTo(17,2);context.lineTo(-3,5);context.closePath();context.fill();
    context.fillStyle='#fff3bd';
    context.beginPath();context.ellipse(2,0,6,3.5,0,0,Math.PI*2);context.fill();
    context.restore();
  }

  function drawThrownGrenade(context,grenade) {
    if (!grenade||Number(grenade.expiresAt)<=Date.now()) return;
    const now=Date.now();
    if (grenade.detonatedAt) {
      const progress=Math.min(1,(now-Number(grenade.detonatedAt))/650);
      const radius=Number(grenade.radius)||155;
      context.save();
      context.globalAlpha=1-progress;
      context.fillStyle='rgba(242,174,73,.28)';
      context.beginPath();context.arc(Number(grenade.x),Number(grenade.y),radius*progress,0,Math.PI*2);context.fill();
      context.strokeStyle='#ffd36c';context.lineWidth=8*(1-progress)+2;
      context.beginPath();context.arc(Number(grenade.x),Number(grenade.y),radius*progress,0,Math.PI*2);context.stroke();
      context.restore();
      return;
    }
    const startX=Number(grenade.startX??grenade.x),startY=Number(grenade.startY??grenade.y);
    const endX=Number(grenade.targetX??grenade.x),endY=Number(grenade.targetY??grenade.y);
    const duration=Math.max(1,Number(grenade.detonateAt)-Number(grenade.createdAt));
    const progress=Math.max(0,Math.min(1,(now-Number(grenade.createdAt))/duration));
    const x=startX+(endX-startX)*progress;
    const groundY=startY+(endY-startY)*progress;
    const height=Math.sin(progress*Math.PI)*Math.min(90,Math.hypot(endX-startX,endY-startY)*.16);
    const y=groundY-height;
    context.fillStyle='rgba(5,8,6,.42)';
    context.beginPath();context.ellipse(x,groundY,9,5,0,0,Math.PI*2);context.fill();
    context.fillStyle='#e5bd55';
    context.strokeStyle='#fff1ad';
    context.lineWidth=2;
    context.beginPath();context.arc(x,y,7+Math.sin(now/45)*1.5,0,Math.PI*2);context.fill();context.stroke();
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
    const x=Number(player.x),y=Number(player.y);
    context.beginPath();
    if (vehicles[player.vehicle]) {
      drawVehicleSprite(context,player.vehicle,x,y,vehicles[player.vehicle].color,
        isSelf?'#fff':player.team==='vortex'?'#9fc4ff':'#ffabb1',player.facingAngle);
      context.fillStyle='#101713';
      context.font='bold 10px system-ui';
      context.textAlign='center';
      const labels={scout_bike:'BIKE',assault_rover:'ROVER',tank:'TANK',anti_air:'ANTI-AIR'};
      context.fillText(labels[player.vehicle]||'VEHICLE',x,y+4);
    } else {
      const angle=isSelf&&aimActive?Math.atan2(aim.y-y,aim.x-x):Number(player.facingAngle)||0;
      const selectedSlot=player.activeWeaponSlot==='secondary'&&weapons[player.secondary]?.slot==='secondary'
        ?'secondary':'primary';
      const weapon=effectiveWeapon(player,selectedSlot);
      const distance=isSelf&&aimActive?Math.min(weapon.range,Math.hypot(aim.x-x,aim.y-y)):weapon.range;
      const targetX=x+Math.cos(angle)*distance,targetY=y+Math.sin(angle)*distance;
      const laser=Array.isArray(player.attachments)?player.attachments.find(id=>id==='laser_red'||id==='laser_tac'):'';
      if (laser&&distance>38) {
        const muzzleX=x+Math.cos(angle)*39,muzzleY=y+Math.sin(angle)*39;
        const obstruction=firstSolidObstruction(muzzleX,muzzleY,targetX,targetY);
        const laserEnd=obstruction||{x:targetX,y:targetY};
        context.save();
        context.globalAlpha=.72;
        context.strokeStyle=laser==='laser_red'?'#ff5b62':'#9affbf';
        context.shadowColor=context.strokeStyle;
        context.shadowBlur=8;
        context.lineWidth=2;
        context.beginPath();context.moveTo(muzzleX,muzzleY);context.lineTo(laserEnd.x,laserEnd.y);context.stroke();
        context.shadowBlur=0;
        context.fillStyle=context.strokeStyle;
        context.beginPath();context.arc(laserEnd.x,laserEnd.y,4,0,Math.PI*2);context.fill();
        context.restore();
      }
      if (isSelf&&aimActive) {
        context.save();
        context.strokeStyle='#f4f7dc';
        context.globalAlpha=.82;
        context.lineWidth=2;
        context.beginPath();context.arc(targetX,targetY,10,0,Math.PI*2);
        context.moveTo(targetX-16,targetY);context.lineTo(targetX-6,targetY);
        context.moveTo(targetX+6,targetY);context.lineTo(targetX+16,targetY);
        context.moveTo(targetX,targetY-16);context.lineTo(targetX,targetY-6);
        context.moveTo(targetX,targetY+6);context.lineTo(targetX,targetY+16);
        context.stroke();
        context.restore();
      }
      context.save();
      context.translate(x,y);
      context.rotate(angle);
      if (isSelf) {
        context.strokeStyle='#ffffff';context.lineWidth=2;
        context.beginPath();context.arc(0,0,34,0,Math.PI*2);context.stroke();
      }
      context.lineCap='round';
      context.strokeStyle='#17211b';context.lineWidth=7;
      context.beginPath();context.moveTo(-5,-6);context.lineTo(-16,-13);context.moveTo(-5,6);context.lineTo(-16,13);context.stroke();
      context.fillStyle='#25342b';
      context.fillRect(-19,-9,11,18);
      context.fillStyle=player.downed?'#776843':player.team==='vortex'?'#4774a8':'#9d4c57';
      context.beginPath();context.ellipse(-1,0,14,11,0,0,Math.PI*2);context.fill();
      context.strokeStyle='#b9c4b9';context.lineWidth=2;context.stroke();
      context.fillStyle=player.team==='vortex'?'#92c5ff':'#ffabb1';
      context.beginPath();context.arc(7,-8,4,0,Math.PI*2);context.arc(7,8,4,0,Math.PI*2);context.fill();
      context.fillStyle='#798b7e';
      context.beginPath();context.arc(10,0,8,0,Math.PI*2);context.fill();
      context.strokeStyle='#d4dfd6';context.lineWidth=2;context.stroke();
      drawHeldWeapon(context,{...weapon,customColor:player.weaponColor||'',customColors:player.weaponColors||{}});
      context.restore();
    }
    context.fillStyle = '#101713';
    context.font = 'bold 20px system-ui';
    context.textAlign = 'center';
    context.fillText(String(player.name || '?').slice(0,8)+(player.houseInside?' · F'+(Number(player.houseFloor||0)+1):''),x,y+3);
    context.fillStyle = '#070b09';
    context.fillRect(x-44,y-54,88,10);
    context.fillStyle = player.downed?'#e9c967':Number(player.hp) > 50 ? '#65e6ad' : '#ff7782';
    context.fillRect(x-44,y-54,88*Math.max(0,Number(player.hp))/100,10);
  }

  function updateStats(players) {
    const player = warState.players[playerKey];
    if (!player) return;
    const weaponSlot=player.activeWeaponSlot==='secondary'&&weapons[player.secondary]?.slot==='secondary'
      ?'secondary':'primary';
    const weapon=vehicleWeapons[player.vehicle]||effectiveWeapon(player,weaponSlot);
    const ammo=vehicleWeapons[player.vehicle]?Number(player.vehicleAmmo||0):
      Number(player[weaponSlot==='secondary'?'secondaryAmmo':'ammo']||0);
    const progress=accountData && accountData.dropzone?normalizeProgress(accountData.dropzone):normalizeProgress(null);
    const markup = '<span class="nexus-war-vortex">Vortex resources: ' +
      Number(warState.economy.vortex.resources || 0) + '</span><span class="nexus-war-krypton">Krypton resources: ' +
      Number(warState.economy.krypton.resources || 0) + '</span><span>Players online: ' + players.length +
      '</span><span>K / D: ' + Number(player.kills || 0) + ' / ' + Number(player.deaths || 0) +
      '</span><span>'+(vehicleWeapons[player.vehicle]?weapon.name+' ammo':
        weaponSlot==='secondary'?'Secondary ammo':'Primary ammo')+': ' +
      ammo + ' / ' + weapon.mag + '</span><span>Level ' + progress.level +
      ' · XP ' + progress.xp + ' / ' + (progress.level===maxLevel?progress.xp:(progress.level*xpPerLevel)) + '</span>';
    if (markup!==lastStatsMarkup) { ui.stats.innerHTML=markup;lastStatsMarkup=markup; }
    updateCombatHud(player,weapon,ammo,weaponSlot);
    updateWeaponSwitchUi(player);
    if (ui.giveUp) ui.giveUp.hidden=!player.downed;
    const next = new Date();
    next.setUTCHours(0,0,0,0);
    next.setUTCDate(next.getUTCDate() + ((8 - next.getUTCDay()) % 7 || 7));
    const label='Weekly wipe: Monday ' + next.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' UTC';
    if (label!==lastResetLabel) { ui.reset.textContent=label;lastResetLabel=label; }
  }

  function updateCombatHud(player,weapon,ammo,weaponSlot) {
    if (!ui||!ui.hud) return;
    const health=Math.max(0,Math.min(100,Number(player.hp)||0));
    const armor=Math.max(0,Math.min(150,Number(player.armorHp)||0));
    const worn=Math.min(3,Math.ceil(armor/50));
    const carried=Math.min(3-worn,Math.max(0,Math.floor(Number(player.armorPlates)||0)));
    const slots=Array.from({length:3},(_,index)=>{
      const state=index<worn?'worn':index<worn+carried?'ready':'empty';
      const fill=state==='worn'?Math.round(Math.min(50,Math.max(0,armor-index*50))/50*100):0;
      const label=state==='worn'?'Armor active':state==='ready'?'Armor plate ready':'Empty plate slot';
      return '<span class="nexus-war-plate-slot '+state+'" aria-label="'+label+'"><i style="height:'+fill+'%"></i></span>';
    }).join('');
    const ammoLabel=vehicleWeapons[player.vehicle]?'VEHICLE AMMO':
      weaponSlot==='secondary'?'SECONDARY AMMO':'PRIMARY AMMO';
    const ammoCapacity=Math.max(1,Number(weapon.mag)||1);
    const ammoPercent=Math.max(0,Math.min(100,(Number(ammo)||0)/ammoCapacity*100));
    const markup='<div class="nexus-war-hud-vitals"><div class="nexus-war-hud-heading">'+
      '<span>VITALS</span><strong class="'+(health<=30?'critical':'')+'">'+Math.ceil(health)+'<small> / 100</small></strong></div>'+
      '<div class="nexus-war-health-track"><i class="'+(health<=30?'critical':'')+'" style="width:'+health+'%"></i></div>'+
      (player.downed?'<span class="nexus-war-downed">DOWNED</span>':'')+'</div>'+
      '<div class="nexus-war-hud-armor"><div class="nexus-war-hud-heading"><span>ARMOR</span><strong>'+Math.ceil(armor)+'<small> / 150</small></strong></div>'+
      '<div class="nexus-war-plate-slots">'+slots+'</div><small class="nexus-war-ready-plates">'+carried+' READY</small></div>'+
      '<div class="nexus-war-hud-ammo"><div class="nexus-war-hud-heading"><span>'+ammoLabel+'</span><strong>'+Math.max(0,Number(ammo)||0)+
      '<small> / '+Number(weapon.mag||0)+'</small></strong></div><div class="nexus-war-ammo-track"><i style="width:'+ammoPercent+'%"></i></div>'+
      '<small class="nexus-war-ammo-name">'+weapon.name+'</small></div>';
    if (markup!==lastHudMarkup) { ui.hud.innerHTML=markup;lastHudMarkup=markup; }
  }

  function onPointerMove(event) {
    const rect = ui.canvas.getBoundingClientRect();
    aimOffset={
      x:(event.clientX-rect.left)*ui.canvas.width/rect.width-ui.canvas.width/2,
      y:(event.clientY-rect.top)*ui.canvas.height/rect.height-ui.canvas.height/2
    };
    aimActive=true;
    aim={x:cameraPosition.x+aimOffset.x,y:cameraPosition.y+aimOffset.y};
  }

  function onPointerDown(event) {
    if (event.button !== 0||paused||warState?.matchPhase!=='playing') return;
    onPointerMove(event);
    if (supportTargeting) {
      event.preventDefault();
      const target={x:aim.x,y:aim.y};
      launchSupportStrike(target).catch(error=>setStatus(error.message||'Support strike failed.',true));
      return;
    }
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
      if (!giveUpInterval) giveUpInterval=window.setTimeout(()=>{giveUp();giveUpInterval=0;},2000);
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

  async function switchWeaponSlot(slot) {
    const player=warState&&warState.players[playerKey];
    if (!player||!['primary','secondary'].includes(slot)) return;
    if (slot==='secondary'&&weapons[player.secondary]?.slot!=='secondary') {
      setStatus('Equip a pistol or explosive weapon in the secondary slot first.',true);
      return;
    }
    if (slot===player.activeWeaponSlot) return;
    try {
      playSound('switch');
      await mutatePlayer(current=>current?{...current,activeWeaponSlot:slot,lastSeen:Date.now()}:current);
      updateWeaponSwitchUi();
      draw();
    } catch(error) { setStatus(error.message||'Could not switch weapons.',true); }
  }

  function updateWeaponSwitchUi(player=warState&&warState.players[playerKey]) {
    if (!ui?.weaponSwitch||!player) return;
    const vehicleWeapon=vehicleWeapons[player.vehicle];
    ui.weaponSwitch.disabled=!!vehicleWeapon;
    ui.weaponSwitch.textContent=vehicleWeapon?vehicleWeapon.name+' active':
      player.activeWeaponSlot==='secondary'?'Secondary (2) · switch to Primary (1)':'Primary (1) · switch to Secondary (2)';
    if (ui.attachmentAction) {
      const slot=player.activeWeaponSlot==='secondary'&&weapons[player.secondary]?.slot==='secondary'
        ?'secondary':'primary';
      const ability=vehicleWeapon?null:effectiveWeapon(player,slot).utilityAttachment;
      ui.attachmentAction.hidden=!ability;
      ui.attachmentAction.textContent=ability?ability.name+' (Tab)':'Underbarrel (Tab)';
    }
  }

  async function toggleDroneControl() {
    if (!warState?.drones?.[playerKey]) { setStatus('Launch a drone before taking control.',true);return; }
    droneControlled=!droneControlled;
    playSound('drone');
    updateWar('drones/'+playerKey,current=>current?{...current,manual:droneControlled}:current)
      .catch(error=>setStatus(error.message||'Could not change drone control.',true));
    setStatus(droneControlled?'Manual drone control active. WASD steers; the operator stays in place.':'Drone released to continue on its current heading.');
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    const target=event.target instanceof Element?event.target:null;
    if (key==='escape') {
      event.preventDefault();
      if (ui?.spawnMenu&&!ui.spawnMenu.hidden) closeVehicleSpawnMenu();
      else if (supportTargeting) { supportTargeting='';setStatus('Strike targeting cancelled.');draw(); }
      else togglePause();
      return;
    }
    if (key==='tab'&&!paused&&!(target&&target.closest('input,textarea,[contenteditable="true"]'))) {
      event.preventDefault();
      useWeaponAttachment();
      return;
    }
    if ((key==='`'||event.code==='Backquote')&&!paused) {
      event.preventDefault();
      if (!event.repeat) useTactical();
      return;
    }
    if (target&&target.closest('input,textarea,[contenteditable="true"]')) return;
    if (target instanceof HTMLSelectElement&&key!=='v') return;
    if (key==='p') {
      event.preventDefault();
      togglePause();
      return;
    }
    if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','r','e','v','q','f','g','x','c','z','1','2','shift'].includes(key)) event.preventDefault();
    if (event.repeat&&!['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright'].includes(key)) return;
    if (/^[a-z]$/.test(key)) {
      secretSequence=(secretSequence+key).slice(-'theyseeyou'.length);
      if (secretSequence==='theyseeyou'&&ui?.secretXp) {
        ui.secretXp.hidden=false;
        setStatus('Secret menu option unlocked.');
        secretSequence='';
      }
    } else secretSequence='';
    if (paused) return;
    if (key==='shift') { toggleDroneControl();return; }
    if (key==='g'&&warState&&warState.players[playerKey]?.downed&&!giveUpInterval) {
      giveUpInterval=window.setTimeout(()=>{giveUp();giveUpInterval=0;},2000);
    }
    keys.add(key);
    if (key==='1'||key==='2') {
      switchWeaponSlot(key==='1'?'primary':'secondary');
      return;
    }
    const currentTransport=warState&&warState.players[playerKey]?.transportId&&
      warState.vehicles[warState.players[playerKey].transportId];
    const isTransportPilot=currentTransport&&currentTransport.pilot===playerKey;
    if (key === 'r') reloadWeapon();
    if (key === 'e') {
      if (!currentTransport) captureOrRaid();
      else if (!isTransportPilot) keys.delete(key);
    }
    if (key === 'v') deployVehicle();
    if (key === 'q') {
      if (!currentTransport) enterOrExitHouse();
      else if (!isTransportPilot) keys.delete(key);
    }
    if (key === 'f') {
      const player=warState&&warState.players[playerKey];
      if (player?.downed) {
        if (Number(player.selfRevives||0)>0) useSelfRevive();
        else setStatus('No self-revive charge. Hold G for 2 seconds to give up, or wait for auto give-up.',true);
      } else reviveNearby();
    }
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
    if (destroyed||paused||warState?.matchPhase!=='playing'||now-lastShot<30||reloading) return;
    const shooter = warState && warState.players[playerKey];
    if (!shooter || shooter.respawnAt > now || shooter.hp <= 0 || shooter.downed) return;
    const transport=shooter.transportId&&warState.vehicles[shooter.transportId];
    const gunnerPosition=transport&&transportGunnerPosition(transport,playerKey);
    if (transport&&transport.pilot!==playerKey&&!gunnerPosition) {
      setStatus('The four helicopter side-gunner seats are occupied.');
      return;
    }
    const shooterPosition=transport?gunnerPosition||transport:localPosition||shooter;
    if (isInOwnSafeZone(shooter.team,Number(shooterPosition.x),Number(shooterPosition.y))) {
      setStatus('Weapons are disabled inside your team safe zone.');
      return;
    }
    const vehicleWeapon=vehicleWeapons[shooter.vehicle];
    const weaponSlot=vehicleWeapon?null:
      shooter.activeWeaponSlot==='secondary'&&weapons[shooter.secondary]?.slot==='secondary'?'secondary':'primary';
    const weapon=vehicleWeapon||effectiveWeapon(shooter,weaponSlot);
    const ammoField=vehicleWeapon?'vehicleAmmo':weaponSlot==='secondary'?'secondaryAmmo':'ammo';
    const weaponField=weaponSlot==='secondary'?'secondary':'weapon';
    const burstCount=Math.max(1,Math.floor(Number(weapon.burstRounds)||1));
    const ammoCost=(weapon.dualWield?2:1)*burstCount;
    if (now - lastShot < weapon.rate) return;
    if (Number(shooter[ammoField]||0) < ammoCost) { setStatus('Magazine empty. Press R to reload.'); return; }
    lastShot = now;
    playSound('shot');
    let fired;
    try {
      fired = await mutatePlayer(current => {
        if (!current||current.vehicle!==shooter.vehicle||
          (weaponSlot&&(current[weaponField]!==shooter[weaponField]||
            current.activeWeaponSlot!==shooter.activeWeaponSlot))||
          Number(current[ammoField]||0)<ammoCost||
            Date.now()-Number(current.lastShotAt||0)<weapon.rate-20) return current;
        return {...current,[ammoField]:Number(current[ammoField])-ammoCost,
          facingAngle:Math.atan2(aim.y-shooterPosition.y,aim.x-shooterPosition.x),
          lastShotAt:Date.now(),lastSeen:Date.now()};
      });
    } catch (error) { setStatus(error.message,true); return; }
    if (!fired||fired[ammoField]!==Number(shooter[ammoField])-ammoCost) return;
    const recoilRecovery=Math.max(0,now-lastRecoilAt)/1000*.24;
    recoilKick=Math.min(.22,Math.max(0,recoilKick-recoilRecovery)+(weapon.recoil||.02));
    lastRecoilAt=now;
    const origin = {...shooter,x:Number(shooterPosition.x),y:Number(shooterPosition.y)};
    const flashAngle=Math.atan2(aim.y-origin.y,aim.x-origin.x)-recoilKick;
    for (let flash=0;flash<burstCount;flash++) {
      muzzleFlashes.push({x:origin.x+Math.cos(flashAngle)*48,y:origin.y+Math.sin(flashAngle)*48,
        angle:flashAngle,time:Date.now()+flash*18});
      if (muzzleFlashes.length>24) muzzleFlashes.shift();
    }
    const pelletCount=Math.max(1,Math.floor(Number(weapon.pellets)||1));
    const projectileCount=pelletCount*burstCount;
    const projectileDamage=burstCount>1?weapon.damage:Math.max(1,Math.round(weapon.damage/pelletCount));
    try {
      for (let pellet=0;pellet<projectileCount;pellet++) {
        if (pellet>0&&burstCount>1) playSound('shot');
        const burstStep=pellet%burstCount;
        const burstSpread=burstCount>1?(burstStep-(burstCount-1)/2)*weapon.spread*.22:0;
        const angle=Math.atan2(aim.y-origin.y,aim.x-origin.x)+(Math.random()-.5)*weapon.spread-recoilKick+burstSpread;
        const end={
          x:Math.max(0,Math.min(worldWidth,origin.x+Math.cos(angle)*weapon.range)),
          y:Math.max(0,Math.min(worldHeight,origin.y+Math.sin(angle)*weapon.range))
        };
        const penetratesWalls=weapon.type==='Sniper rifle';
        const wallHit=firstSolidObstruction(origin.x,origin.y,end.x,end.y,penetratesWalls);
        const shotEnd=wallHit||end;
        const target=closestTarget(origin,shotEnd,penetratesWalls);
        const aircraftHit=closestTransport(origin,shotEnd,shooter.vehicle==='anti_air');
        const baseHit=closestBase(origin,shotEnd,penetratesWalls);
        let impact=target;
        if (aircraftHit&&(!impact||aircraftHit.distance<impact.distance)) impact=aircraftHit;
        if (baseHit&&(!impact||baseHit.distance<impact.distance)) impact=baseHit;
        traces.push({x1:origin.x,y1:origin.y,x2:impact?impact.x:shotEnd.x,y2:impact?impact.y:shotEnd.y,
          time:Date.now(),color:shooter.team==='vortex'?'#80b7ff':'#ff8792',impact:!!wallHit&&!impact});
        if (weapon.radius) {
          const center=impact?{x:impact.x,y:impact.y}:shotEnd;
          const explosionId='impact_'+playerKey+'_'+Date.now()+'_'+pellet;
          await updateWar('grenades/'+explosionId,()=>({x:center.x,y:center.y,
            detonatedAt:Date.now(),expiresAt:Date.now()+650,radius:weapon.radius}));
          if (baseHit&&impact===baseHit) await raidBase(baseHit.team,Math.round(weapon.damage*.7),shooter.team);
          if (impact&&impact.turret) await hitTurret(impact.turretId,weapon.damage);
          if (impact&&impact.transport) await hitTransport(impact.transportId,weapon.aircraftDamage||weapon.damage);
          for (const enemy of Object.values(warState.players||{})) {
            if (!enemy||enemy.team===shooter.team||enemy.transportId||!enemy.online) continue;
            const distance=Math.hypot(Number(enemy.x)-center.x,Number(enemy.y)-center.y);
            if (distance<weapon.radius&&
              !lineBlocked(center.x,center.y,Number(enemy.x),Number(enemy.y),penetratesWalls)) {
              const damage=distance<45?weapon.damage:
                Math.max(1,Math.round(weapon.damage*.8*(1-distance/weapon.radius)));
              await hitPlayer(enemy,damage,shooter);
            }
          }
        } else if (impact&&impact.target) {
          await hitPlayer(impact.target,projectileDamage,shooter);
        } else if (impact&&impact.turret) {
          await hitTurret(impact.turretId,projectileDamage);
        } else if (impact&&impact.transport) {
          await hitTransport(impact.transportId,weapon.aircraftDamage||125);
        } else if (baseHit) {
          await raidBase(baseHit.team,projectileDamage,shooter.team);
        }
      }
    } catch(error) {
      setStatus(error.message||'The attack could not be completed.',true);
    }
    draw();
    if (pointerDown) window.setTimeout(fireWeapon,weapon.rate);
  }

  function closestTarget(origin,end,penetratesWalls=false) {
    let closest = null;
    for (const player of Object.values(warState.players || {})) {
      if (!player || player.team === origin.team || !player.online || (player.hp<=0&&!player.downed) ||
          (player.respawnAt>Date.now()&&!player.downed) || player.transportId ||
          Date.now()-Number(player.lastSeen||0)>20000) continue;
      const hit = pointToSegment(player.x,player.y,origin.x,origin.y,end.x,end.y);
      if (hit.distance <= 38 && !lineBlocked(origin.x,origin.y,player.x,player.y,penetratesWalls) &&
          (!closest || hit.along < closest.distance)) closest = {target:player,distance:hit.along,x:hit.x,y:hit.y};
    }
    for (const [id,turret] of Object.entries(warState.turrets||{})) {
      if (!turret||turret.team===origin.team||Number(turret.hp)<=0) continue;
      const hit=pointToSegment(turret.x,turret.y,origin.x,origin.y,end.x,end.y);
      if (hit.distance<=30&&!lineBlocked(origin.x,origin.y,turret.x,turret.y,penetratesWalls)&&
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

  function closestBase(origin,end,penetratesWalls=false) {
    let closest = null;
    for (const team of ['vortex','krypton']) {
      if (team === origin.team) continue;
      const {x,y}=basePositions[team];
      if (lineBlocked(origin.x,origin.y,x,y,penetratesWalls)) continue;
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
      setStatus('You are downed. F uses a self-revive if charged; hold G for 2 seconds to give up. Auto give-up in 10 seconds.');
    }
  }

  function segmentRectIntersection(x1,y1,x2,y2,rect,padding=0) {
    const left=Number(rect.x)-padding,right=Number(rect.x)+Number(rect.w)+padding;
    const top=Number(rect.y)-padding,bottom=Number(rect.y)+Number(rect.h)+padding;
    const dx=x2-x1,dy=y2-y1;
    let near=0,far=1;
    for (const [p,q] of [[-dx,x1-left],[dx,right-x1],[-dy,y1-top],[dy,bottom-y1]]) {
      if (Math.abs(p)<1e-9) { if (q<0) return null;continue; }
      const ratio=q/p;
      if (p<0) near=Math.max(near,ratio);
      else far=Math.min(far,ratio);
      if (near>far) return null;
    }
    const startsInside=x1>=left&&x1<=right&&y1>=top&&y1<=bottom;
    const endsInside=x2>=left&&x2<=right&&y2>=top&&y2<=bottom;
    if (startsInside&&endsInside) return null;
    const fraction=startsInside?far:near;
    return fraction>=0&&fraction<=1?fraction:null;
  }

  function firstSolidObstruction(x1,y1,x2,y2,penetratesWalls=false) {
    let closestFraction=Infinity,blocked=false;
    const checkRect=rect=>{
      const fraction=segmentRectIntersection(x1,y1,x2,y2,rect,4);
      if (fraction!==null&&fraction<closestFraction) { closestFraction=fraction;blocked=true; }
    };
    for (const item of mapObstacles) {
      if (penetratesWalls&&(item.type==='building'||item.type==='house')) continue;
      checkRect(item);
    }
    for (const crate of Object.values(warState&&warState.lootBoxes||{})) {
      if (crate&&crate.available) checkRect({x:Number(crate.x)-15,y:Number(crate.y)-15,w:30,h:30});
    }
    return blocked?{x:x1+(x2-x1)*closestFraction,y:y1+(y2-y1)*closestFraction}:null;
  }

  function lineBlocked(x1,y1,x2,y2,penetratesWalls=false) {
    if (firstSolidObstruction(x1,y1,x2,y2,penetratesWalls)) return true;
    if (warState&&Object.values(warState.smokes||{}).some(smoke=>
      Number(smoke.expiresAt)>Date.now()&&pointToSegment(smoke.x,smoke.y,x1,y1,x2,y2).distance<Number(smoke.radius||190))) return true;
    return false;
  }

  function equipmentChoices(player) {
    const tactical=[['smoke','Smoke grenade · '+Number(player.smokeCharges||0)] ,
      ['stim','Stim · '+Number(player.stimCharges||0)]];
    if (Number(player.grappleCharges||0)>0) tactical.push(['grapple','Grapple hook · '+player.grappleCharges]);
    if (Number(player.airstrikeCharges||0)>0) tactical.push(['airstrike','Precision airstrike · '+player.airstrikeCharges]);
    if (Number(player.bunkerBusterCharges||0)>0) tactical.push(['bunker_buster','Bunker buster · '+player.bunkerBusterCharges]);
    const lethal=[['grenade','Frag grenade · '+Number(player.grenadeCharges||0)],
      ['claymore','Claymore · '+Number(player.claymoreCharges||0)]];
    if (Number(player.droneCharges||0)>0) lethal.push(['drone','Kamikaze drone · '+player.droneCharges]);
    if (Number(player.rcCarCharges||0)>0) lethal.push(['rc_car','RC kamikaze car · '+player.rcCarCharges]);
    if (Number(player.turretCharges||0)>0) lethal.push(['turret','Sentry turret · '+player.turretCharges]);
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
      claymore:'claymoreCharges',turret:'turretCharges',drone:'droneCharges',
      grapple:'grappleCharges',airstrike:'airstrikeCharges',bunker_buster:'bunkerBusterCharges',
      rc_car:'rcCarCharges'}[item];
    if (!chargeField) throw new Error('Unknown equipment.');
    let used=false;
    await mutatePlayer(current=>{
      used=!!current&&current[slot]===item&&Number(current[chargeField]||0)>0;
      if (!used) return current;
      const remaining=Number(current[chargeField])-1;
      const fallback=slot==='tactical'?'smoke':'grenade';
      const shouldFallback=remaining===0&&(slot==='tactical'
        ?['turret','drone','grapple','airstrike','bunker_buster'].includes(item)
        :['turret','drone','rc_car'].includes(item));
      return {...current,[chargeField]:remaining,
        ...(shouldFallback?{[slot]:fallback}:{})};
    });
    if (!used) throw new Error('Equip this item and make sure you have a charge available.');
  }

  async function useWeaponAttachment() {
    const player=warState&&warState.players[playerKey];
    if (!player||player.downed||player.hp<=0||player.transportId||vehicles[player.vehicle]) {
      setStatus('Underbarrel launchers can only be used on foot.',true);return;
    }
    const weaponSlot=player.activeWeaponSlot==='secondary'&&weapons[player.secondary]?.slot==='secondary'
      ?'secondary':'primary';
    const weapon=effectiveWeapon(player,weaponSlot);
    const attachment=weapon.utilityAttachment;
    if (!attachment) { setStatus('Equip a mini grenade or smoke launcher attachment first.',true);return; }
    const now=Date.now();
    if (now<attachmentCooldownUntil) {
      setStatus('Underbarrel launcher ready in '+((attachmentCooldownUntil-now)/1000).toFixed(1)+'s.');return;
    }
    const position=localPosition||player;
    if (isInOwnSafeZone(playerTeam,Number(position.x),Number(position.y))) {
      setStatus('Underbarrel launchers are disabled inside your team safe zone.',true);return;
    }
    const maxDistance=attachment.utility==='underbarrelFrag'?620:500;
    const angle=aimActive?Math.atan2(aim.y-position.y,aim.x-position.x):Number(player.facingAngle)||0;
    const distance=aimActive?Math.min(maxDistance,Math.hypot(aim.x-position.x,aim.y-position.y)):maxDistance;
    const destination={
      x:Math.max(0,Math.min(worldWidth,position.x+Math.cos(angle)*distance)),
      y:Math.max(0,Math.min(worldHeight,position.y+Math.sin(angle)*distance))
    };
    const impact=firstSolidObstruction(position.x,position.y,destination.x,destination.y)||destination;
    try {
      if (attachment.utility==='underbarrelFrag') {
        playSound('throw');
        const id='underbarrel_frag_'+playerKey+'_'+now;
        const detonateAt=now+750;
        await updateWar('grenades/'+id,()=>({team:playerTeam,owner:playerName,
          x:impact.x,y:impact.y,startX:position.x,startY:position.y,
          targetX:impact.x,targetY:impact.y,createdAt:now,detonateAt,expiresAt:detonateAt+1000,
          radius:125,damage:68,splashDamage:42,directRadius:42}));
        setStatus('Mini grenade launched. It detonates in 0.75 seconds.');
      } else if (attachment.utility==='underbarrelSmoke') {
        const id='underbarrel_smoke_'+playerKey+'_'+now;
        await updateWar('smokes',current=>({...Object.fromEntries(Object.entries(current||{})
          .filter(([,entry])=>entry&&Number(entry.expiresAt)>now)),[id]:{
            team:playerTeam,x:impact.x,y:impact.y,radius:220,seed:Math.random()*Math.PI*2,
            createdAt:now,expiresAt:now+10000
          }}));
        setStatus('Underbarrel smoke deployed. It blocks sight for 10 seconds.');
      }
      attachmentCooldownUntil=Date.now()+Number(attachment.utilityCooldown||7000);
    } catch(error) { setStatus(error.message||'Could not use the underbarrel launcher.',true); }
  }

  function beginSupportTargeting(item) {
    const player=warState&&warState.players[playerKey];
    const chargeField=item==='airstrike'?'airstrikeCharges':'bunkerBusterCharges';
    if (!player||!Number(player[chargeField]||0)) {
      setStatus('Purchase this support strike at your base first.',true);return;
    }
    supportTargeting=item;
    setStatus('Laser pointer active. Aim around the map and click to mark the '+
      (item==='airstrike'?'precision airstrike.':'bunker-buster impact.'));
    draw();
  }

  async function launchSupportStrike(target) {
    const item=supportTargeting;
    supportTargeting='';
    if (!['airstrike','bunker_buster'].includes(item)) return;
    try {
      await consumeEquipment('tactical',item);
      const now=Date.now();
      if (item==='airstrike') {
        const pattern=[[-72,-34],[-36,28],[0,0],[36,-28],[72,34]];
        for (let index=0;index<pattern.length;index++) {
          const x=Math.max(80,Math.min(worldWidth-80,target.x+pattern[index][0]));
          const y=Math.max(100,Math.min(worldHeight-100,target.y+pattern[index][1]));
          const id='airstrike_'+playerKey+'_'+now+'_'+index;
          const detonateAt=now+950+index*170;
          await updateWar('grenades/'+id,()=>({team:playerTeam,owner:playerName,effect:'airstrike',
            x,y,startX:x-420,startY:y-620,targetX:x,targetY:y,createdAt:now,detonateAt,
            expiresAt:detonateAt+900,radius:140,damage:100,splashDamage:58,directRadius:55}));
        }
        setStatus('Precision airstrike inbound. Impact in about one second.');
      } else {
        const id='bunker_buster_'+playerKey+'_'+now;
        const detonateAt=now+1250;
        await updateWar('grenades/'+id,()=>({team:playerTeam,owner:playerName,effect:'bunker_gas',
          x:target.x,y:target.y,startX:target.x-320,startY:target.y-700,
          targetX:target.x,targetY:target.y,createdAt:now,detonateAt,expiresAt:detonateAt+1000,
          radius:205,damage:120,splashDamage:65,directRadius:75}));
        setStatus('Bunker buster inbound. Impact will leave a dangerous gas cloud.');
      }
      refreshEquipmentUi();
    } catch(error) { setStatus(error.message||'Could not launch the support strike.',true); }
    draw();
  }

  async function useTactical() {
    const player=warState&&warState.players[playerKey];
    if (!player||player.downed||player.transportId) return;
    const item=player.tactical;
    if (item==='airstrike'||item==='bunker_buster') { beginSupportTargeting(item);return; }
    try {
      const position=localPosition||player;
      if (item==='grapple') {
        const angle=aimActive?Math.atan2(aim.y-position.y,aim.x-position.x):Number(player.facingAngle)||0;
        const range=950;
        const end={x:position.x+Math.cos(angle)*range,y:position.y+Math.sin(angle)*range};
        const anchor=firstSolidObstruction(position.x,position.y,end.x,end.y);
        if (!anchor) throw new Error('Aim at a wall, building, or solid obstacle to grapple.');
        await consumeEquipment('tactical',item);
        grapplePull={x:anchor.x-Math.cos(angle)*44,y:anchor.y-Math.sin(angle)*44};
        movementVelocity={x:0,y:0};
        setStatus('Grapple launched. Pulling you to the surface.');
        refreshEquipmentUi();
        return;
      }
      await consumeEquipment('tactical',item);
      if (item==='smoke') {
        const id='smoke_'+playerKey+'_'+Date.now();
        const distance=Math.min(500,Math.hypot(aim.x-position.x,aim.y-position.y));
        const angle=Math.atan2(aim.y-position.y,aim.x-position.x);
        const createdAt=Date.now();
        const smoke={team:playerTeam,x:position.x+Math.cos(angle)*distance,
          y:position.y+Math.sin(angle)*distance,radius:260,seed:Math.random()*Math.PI*2,
          createdAt,expiresAt:createdAt+12000};
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
      if (item==='rc_car') {
        if (warState.drones[playerKey]) { setStatus('Your remote vehicle is already active.',true);return; }
        await consumeEquipment('lethal',item);
        const position=localPosition||player;
        const angle=aimActive?Math.atan2(aim.y-position.y,aim.x-position.x):Number(player.facingAngle)||0;
        const car={type:'rc_car',owner:playerName,team:playerTeam,x:position.x,y:position.y,
          angle,hp:1,manual:true,lastWriteAt:0};
        await updateWar('drones/'+playerKey,()=>car);
        localDronePosition={x:car.x,y:car.y,angle:car.angle};
        lastDroneWriteAt=Date.now();activeDrone=true;droneControlled=true;
        setStatus('RC kamikaze car launched. WASD steers; Shift releases control.');
      } else if (item==='drone') {
        if (warState.drones[playerKey]) { setStatus('Your drone is already active.',true);return; }
        await launchDrone();
      } else if (item==='turret') {
        await consumeEquipment('lethal',item);
        const position=localPosition||player;
        const id=playerKey+'_'+Date.now();
        await updateWar('turrets/'+id,()=>({owner:playerName,team:playerTeam,
          x:Math.max(100,Math.min(worldWidth-100,position.x+(playerTeam==='vortex'?75:-75))),
          y:position.y,hp:30,lastShotAt:0}));
        setStatus('Sentry turret deployed.');
      } else if (item==='claymore') {
        await consumeEquipment('lethal',item);
        const position=localPosition||player;
        const id='claymore_'+playerKey+'_'+Date.now();
        await updateWar('claymores/'+id,()=>({id,owner:playerName,team:playerTeam,
          x:position.x,y:position.y,angle:Math.atan2(aim.y-position.y,aim.x-position.x),
          damage:90,radius:135,triggeredAt:0,createdAt:Date.now()}));
        setStatus('Claymore planted and facing your aim direction.');
      } else if (item==='grenade') {
        playSound('throw');
        await consumeEquipment('lethal',item);
        const position=localPosition||player;
        const distance=Math.min(520,Math.hypot(aim.x-position.x,aim.y-position.y));
        const angle=Math.atan2(aim.y-position.y,aim.x-position.x);
        const impact={x:position.x+Math.cos(angle)*distance,y:position.y+Math.sin(angle)*distance};
        const id='grenade_'+playerKey+'_'+Date.now();
        const createdAt=Date.now(),detonateAt=createdAt+900;
        await updateWar('grenades/'+id,()=>({team:playerTeam,owner:playerName,
          x:impact.x,y:impact.y,startX:position.x,startY:position.y,
          targetX:impact.x,targetY:impact.y,createdAt,detonateAt,expiresAt:detonateAt+1000}));
        refreshEquipmentUi();
        setStatus('Frag grenade thrown. Detonates in 0.9 seconds.');
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


  async function updateGrenades() {
    if (!warState||destroyed) return;
    const now=Date.now();
    for (const [id,grenade] of Object.entries(warState.grenades||{})) {
      if (!grenade) continue;
      if (grenade.detonatedAt) {
        if (Number(grenade.expiresAt)>now) continue;
        const removed=await updateWar('grenades/'+id,current=>current&&current.detonatedAt&&
          Number(current.expiresAt)<=now?null:current);
        if (!removed&&warState.grenades) delete warState.grenades[id];
        continue;
      }
      if (!Number(grenade.detonateAt)||Number(grenade.detonateAt)>now) continue;
      let detonated=null;
      const updated=await updateWar('grenades/'+id,current=>{
        detonated=null;
        if (!current||current.detonatedAt||Number(current.detonateAt)>now) return current;
        detonated={...current,detonatedAt:now,expiresAt:now+650,radius:Number(current.radius)||155};
        return detonated;
      });
      if (updated&&warState) warState.grenades[id]=updated;
      if (!detonated) continue;
      playSound('explosion');
      const x=Number(detonated.targetX??detonated.x),y=Number(detonated.targetY??detonated.y);
      const radius=Number(detonated.radius)||155;
      if (detonated.effect==='bunker_gas') {
        const gasId='gas_'+id;
        await updateWar('smokes/'+gasId,current=>current||{
          team:detonated.team,owner:detonated.owner,gas:true,x,y,radius:285,
          seed:Math.random()*Math.PI*2,createdAt:now,expiresAt:now+18_000,nextDamageAt:now+1000
        });
      }
      const directRadius=Number(detonated.directRadius)||55;
      const directDamage=Number(detonated.damage)||90;
      const splashDamage=Number(detonated.splashDamage)||50;
      for (const enemy of Object.values(warState.players||{})) {
        if (!enemy||enemy.team===detonated.team||enemy.transportId||!enemy.online) continue;
        const distance=Math.hypot(Number(enemy.x)-x,Number(enemy.y)-y);
        if (distance<radius&&!lineBlocked(x,y,Number(enemy.x),Number(enemy.y)))
          await hitPlayer(enemy,distance<directRadius?directDamage:splashDamage,
            {name:detonated.owner||'Grenade',team:detonated.team});
      }
      if (detonated.owner===playerName) setStatus(detonated.effect==='bunker_gas'
        ?'Bunker buster detonated. Mustard gas is spreading.'
        :detonated.effect==='airstrike'?'Precision airstrike impact.':'Frag grenade detonated.');
    }
  }

  async function updateGasHazards() {
    if (!warState||destroyed) return;
    const now=Date.now();
    for (const [id,cloud] of Object.entries(warState.smokes||{})) {
      if (!cloud||!cloud.gas) continue;
      if (Number(cloud.expiresAt)<=now) {
        await updateWar('smokes/'+id,current=>current&&current.gas&&Number(current.expiresAt)<=now?null:current);
        continue;
      }
      let damageTick=false;
      await updateWar('smokes/'+id,current=>{
        damageTick=!!current&&current.gas&&Number(current.expiresAt)>now&&Number(current.nextDamageAt||0)<=now;
        return damageTick?{...current,nextDamageAt:now+1000}:current;
      });
      if (!damageTick) continue;
      for (const player of Object.values(warState.players||{})) {
        if (!player||!player.online||player.team===cloud.team||player.transportId||player.hp<=0) continue;
        const x=Number(player.x),y=Number(player.y);
        if (Math.hypot(x-Number(cloud.x),y-Number(cloud.y))<=Number(cloud.radius||285)&&
            !firstSolidObstruction(Number(cloud.x),Number(cloud.y),x,y))
          await hitPlayer(player,14,{name:cloud.owner||'Bunker buster',team:cloud.team});
      }
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

  function cancelReviveChannel(message='') {
    if (reviveChannelTimer) clearInterval(reviveChannelTimer);
    reviveChannelTimer=0;
    const channel=reviveChannel;
    reviveChannel=null;
    if (channel&&message) setStatus(message,true);
  }

  function beginReviveChannel(targetKey,selfRevive) {
    if (reviveChannel) { setStatus('A revive is already in progress.',true);return; }
    const player=warState&&warState.players[playerKey];
    const target=warState&&warState.players[targetKey];
    if (!player||player.transportId||
      (selfRevive?!player.downed:player.downed||player.hp<=0)) {
      setStatus('You cannot revive while downed or in a vehicle.',true);return;
    }
    if (selfRevive&&(!player.downed||Number(player.selfRevives||0)<1)) {
      setStatus('You need to be downed and have a self-revive charge.',true);return;
    }
    if (selfRevive&&Date.now()-Number(player.downedAt||0)>=10_000) {
      setStatus('It is too late to start a self-revive.',true);return;
    }
    if (!selfRevive&&(!target||target.team!==playerTeam||!target.downed||
        Date.now()-Number(target.downedAt||0)>=10_000)) {
      setStatus('That teammate cannot be revived.',true);return;
    }
    const position=localPosition||player;
    if (!selfRevive&&Math.hypot(Number(target.x)-Number(position.x),Number(target.y)-Number(position.y))>=145) {
      setStatus('Move close to a downed teammate to revive them.',true);return;
    }
    const channel={targetKey,selfRevive,startedAt:Date.now(),startX:Number(position.x),startY:Number(position.y),
      startHp:Number(player.hp),lastCountdown:5,finishing:false};
    reviveChannel=channel;
    setStatus((selfRevive?'Self-revive':'Reviving teammate')+' · 5 seconds. Stay still.');
    reviveChannelTimer=window.setInterval(async()=>{
      if (reviveChannel!==channel||channel.finishing) return;
      const now=Date.now();
      const rescuer=warState&&warState.players[playerKey];
      const rescuerPosition=localPosition||rescuer;
      const currentTarget=warState&&warState.players[channel.targetKey];
      const moved=!rescuerPosition||Math.hypot(Number(rescuerPosition.x)-channel.startX,
        Number(rescuerPosition.y)-channel.startY)>60;
      const invalidRescuer=!rescuer||rescuer.transportId||moved||
        (channel.selfRevive?!rescuer.downed:rescuer.hp<=0||rescuer.downed||Number(rescuer.hp)<channel.startHp);
      const invalidTarget=channel.selfRevive
        ?!rescuer?.downed||Number(rescuer?.selfRevives||0)<1||now-Number(rescuer?.downedAt||0)>=10_000
        :!currentTarget||!currentTarget.downed||currentTarget.team!==playerTeam||
          now-Number(currentTarget.downedAt||0)>=10_000||
          !rescuerPosition||Math.hypot(Number(currentTarget.x)-Number(rescuerPosition.x),
            Number(currentTarget.y)-Number(rescuerPosition.y))>=145;
      if (invalidRescuer||invalidTarget) {
        cancelReviveChannel('Revive interrupted.');
        return;
      }
      const remaining=5000-(now-channel.startedAt);
      if (remaining>0) {
        const seconds=Math.ceil(remaining/1000);
        if (seconds!==channel.lastCountdown) {
          channel.lastCountdown=seconds;
          setStatus((channel.selfRevive?'Self-revive':'Reviving teammate')+' · '+seconds+'s. Stay still.');
        }
        return;
      }
      channel.finishing=true;
      clearInterval(reviveChannelTimer);
      reviveChannelTimer=0;
      reviveChannel=null;
      try {
        if (channel.selfRevive) {
          let revived=false;
          await mutatePlayer(current=>{
            revived=!!current&&current.downed&&Number(current.selfRevives||0)>0&&
              Date.now()-Number(current.downedAt||0)<10_000;
            return revived?{...current,hp:50,downed:false,downedAt:0,respawnAt:0,
              selfRevives:Number(current.selfRevives)-1,lastSeen:Date.now()}:current;
          });
          setStatus(revived?'Self-revive complete.':'Self-revive failed.',!revived);
        } else {
          let revived=false;
          await updateWar('players/'+channel.targetKey,current=>{
            revived=false;
            const currentRescuer=warState&&warState.players[playerKey];
            const currentPosition=localPosition||currentRescuer;
            if (!current||!current.downed||current.team!==playerTeam||
                Date.now()-Number(current.downedAt||0)>=10_000||!currentRescuer||
                currentRescuer.downed||currentRescuer.hp<=0||!currentPosition||
                Math.hypot(Number(current.x)-Number(currentPosition.x),
                  Number(current.y)-Number(currentPosition.y))>=145) return current;
            revived=true;
            return {...current,hp:60,downed:false,downedAt:0,respawnAt:0,lastSeen:Date.now()};
          });
          setStatus(revived?'Teammate revived.':'Revive failed; your teammate is no longer downed.',!revived);
        }
      } catch(error) { setStatus(error.message||'The revive could not be completed.',true); }
    },100);
  }

  async function reviveNearby() {
    const player=warState&&warState.players[playerKey];
    if (!player||player.downed||player.hp<=0) return;
    const position=localPosition||player;
    const ally=Object.entries(warState.players||{}).find(([,candidate])=>candidate&&candidate.team===playerTeam&&
      candidate.downed&&Date.now()-Number(candidate.downedAt||0)<10_000&&
      Math.hypot(Number(candidate.x)-Number(position.x),Number(candidate.y)-Number(position.y))<145);
    if (!ally) { setStatus('Move close to a downed teammate to revive them.',true);return; }
    beginReviveChannel(ally[0],false);
  }

  async function giveUp() {
    const player=warState&&warState.players[playerKey];
    if (!player||!player.downed||giveUpBusy) return;
    cancelReviveChannel();
    giveUpBusy=true;
    try {
      await mutatePlayer(current=>current&&current.downed?{...current,hp:0,downed:false,
        downedAt:0,deaths:Number(current.deaths||0)+1,respawnAt:Date.now()+5000}:current);
      setStatus('You gave up. Respawning in five seconds.');
    } finally { giveUpBusy=false; }
  }

  async function useSelfRevive() {
    const player=warState&&warState.players[playerKey];
    if (!player||!player.downed||Number(player.selfRevives||0)<1) {
      setStatus('You need to be downed and have a self-revive available.',true);return;
    }
    beginReviveChannel(playerKey,true);
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
      const house=mapObstacles.find(item=>item.id===houseInside);
      if (house) {
        if (house.stairs&&Math.hypot(position.x-house.stairs.x,position.y-house.stairs.y)<115) {
          const maxFloor=Math.max(2,Number(house.floorCount)||2);
          houseFloor=(houseFloor+1)%maxFloor;
          await mutatePlayer(current=>({...current,houseFloor,lastSeen:Date.now()}));
          setStatus('Stairwell: floor '+(houseFloor+1)+' of '+maxFloor+'. You can fire across the open stairwell.');
          draw();
          return;
        }
        localPosition={x:house.doorX+(house.doorX<=house.x?-32:32),y:house.doorY};
        houseInside='';
        houseFloor=0;
        await mutatePlayer(current=>({...current,...localPosition,houseInside:'',houseFloor:0}));
        setStatus('Exited the building.');
      }
      return;
    }
    const house=mapObstacles.find(item=>item.enterable&&Math.hypot(position.x-item.doorX,position.y-item.doorY)<110);
    if (!house) { setStatus('Move to a marked house entrance to enter.',true);return; }
    houseInside=house.id;
    houseFloor=0;
    localPosition={x:house.x+house.w/2,y:house.y+house.h/2};
    movementVelocity={x:0,y:0};
    await mutatePlayer(current=>({...current,...localPosition,houseInside,houseFloor:0}));
    setStatus('Inside '+house.id+'. Press Q to leave.');
  }

  async function purchaseFieldUpgrade(type) {
    const config={armor:{cost:150,label:'armor plate'},selfRevive:{cost:400,label:'self-revive'},
      turret:{cost:350,label:'sentry turret'},drone:{cost:250,label:'kamikaze drone'},
      grapple:{cost:450,label:'grapple hook'},airstrike:{cost:1800,label:'precision airstrike'},
      bunkerBuster:{cost:2600,label:'bunker buster'},rcCar:{cost:1200,label:'RC kamikaze car'}};
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
      } else if (type==='grapple') {
        await mutatePlayer(current=>({...current,grappleCharges:Number(current.grappleCharges||0)+1}));
      } else if (type==='airstrike') {
        await mutatePlayer(current=>({...current,airstrikeCharges:Number(current.airstrikeCharges||0)+1}));
      } else if (type==='bunkerBuster') {
        await mutatePlayer(current=>({...current,bunkerBusterCharges:Number(current.bunkerBusterCharges||0)+1}));
      } else if (type==='rcCar') {
        await mutatePlayer(current=>({...current,rcCarCharges:Number(current.rcCarCharges||0)+1}));
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
    const aimX=Number(aim&&aim.x),aimY=Number(aim&&aim.y);
    const originX=Number(position.x),originY=Number(position.y);
    const angle=Number.isFinite(aimX)&&Number.isFinite(aimY)&&Number.isFinite(originX)&&Number.isFinite(originY)
      ?Math.atan2(aimY-originY,aimX-originX):Number(player.facingAngle)||0;
    const drone={owner:playerName,team:playerTeam,x:position.x,y:position.y,
      angle,hp:1,manual:true,lastWriteAt:0};
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

  async function updateParkedVehicles() {
    if (!warState||destroyed) return;
    const now=Date.now();
    for (const [id,vehicle] of Object.entries(warState.vehicles||{})) {
      if (!vehicle||!vehicle.parked||!Number(vehicle.expiresAt)) continue;
      if (vehicle.explodedAt) {
        if (Number(vehicle.cleanupAt)>now) continue;
        const removed=await updateWar('vehicles/'+id,current=>current&&current.explodedAt&&
          Number(current.cleanupAt)<=now?null:current);
        if (!removed&&warState.vehicles) delete warState.vehicles[id];
        continue;
      }
      if (Number(vehicle.expiresAt)>now) continue;
      let exploded=false;
      const updated=await updateWar('vehicles/'+id,current=>{
        exploded=false;
        if (!current||!current.parked||current.explodedAt||Number(current.expiresAt)>now) return current;
        exploded=true;
        return {...current,explodedAt:now,cleanupAt:now+750};
      });
      if (updated&&warState) warState.vehicles[id]=updated;
      if (!exploded) continue;
      playSound('explosion');
      const center={x:Number(vehicle.x),y:Number(vehicle.y)};
      for (const player of Object.values(warState.players||{})) {
        if (!player||!player.online||player.transportId||player.hp<=0) continue;
        const distance=Math.hypot(Number(player.x)-center.x,Number(player.y)-center.y);
        if (distance<175) await hitPlayer(player,distance<55?100:65,
          {name:vehicle.owner||'Abandoned vehicle',team:vehicle.team});
      }
      if (playerTeam!==vehicle.team&&localPosition&&
          Math.hypot(localPosition.x-center.x,localPosition.y-center.y)<175)
        setStatus('An abandoned vehicle exploded nearby.',true);
    }
  }

  function updateDrone(timestamp) {
    const current=warState&&warState.drones&&warState.drones[playerKey];
    if (!current||current.hp<=0) { activeDrone=false;localDronePosition=null;return; }
    if (!localDronePosition) localDronePosition={x:Number(current.x),y:Number(current.y),
      angle:Number.isFinite(Number(current.angle))?Number(current.angle):0};
    if (!Number.isFinite(localDronePosition.angle)) localDronePosition.angle=0;
    const elapsed=Math.min(.05,Math.max(0,(timestamp-(updateDrone.lastFrame||timestamp))/1000));
    updateDrone.lastFrame=timestamp;
    let dx=droneControlled?(keys.has('d')?1:0)-(keys.has('a')?1:0):0;
    let dy=droneControlled?(keys.has('s')?1:0)-(keys.has('w')?1:0):0;
    if (dx||dy) localDronePosition.angle=Math.atan2(dy,dx);
    const isRcCar=current.type==='rc_car';
    const distance=(isRcCar?650:430)*elapsed;
    const next={x:localDronePosition.x+Math.cos(localDronePosition.angle)*distance,
      y:localDronePosition.y+Math.sin(localDronePosition.angle)*distance};
    const collisionRadius=isRcCar?16:10;
    const obstacle=mapObstacles.some(item=>circleIntersectsRect(next.x,next.y,collisionRadius,item))||
      lootBoxIntersects(next.x,next.y,collisionRadius);
    const hit=Object.values(warState.players||{}).find(enemy=>enemy&&enemy.team!==playerTeam&&enemy.online&&
      enemy.hp>0&&!enemy.downed&&Math.hypot(Number(enemy.x)-next.x,Number(enemy.y)-next.y)<(isRcCar?44:35));
    const outOfBounds=next.x<70||next.x>worldWidth-70||next.y<110||next.y>worldHeight-110;
    if (obstacle||hit||outOfBounds||isInEnemySafeZone(playerTeam,next.x,next.y)) {
      const center=hit?{x:Number(hit.x),y:Number(hit.y)}:localDronePosition;
      const blastRadius=isRcCar?220:180;
      const victims=Object.values(warState.players||{}).filter(enemy=>enemy&&enemy.team!==playerTeam&&
        enemy.online&&enemy.hp>0&&Math.hypot(Number(enemy.x)-center.x,Number(enemy.y)-center.y)<=blastRadius);
      for (const enemy of victims) {
        const direct=enemy===hit&&Math.hypot(Number(enemy.x)-center.x,Number(enemy.y)-center.y)<(isRcCar?65:45);
        hitPlayer(enemy,direct?(isRcCar?120:60):(isRcCar?58:30),{name:playerName,team:playerTeam})
          .catch(error=>setStatus(error.message||'Drone damage failed.',true));
      }
      updateWar('drones',drones=>{const nextDrones={...(drones||{})};delete nextDrones[playerKey];return nextDrones;})
        .catch(error=>setStatus(error.message||'Could not remove the spent drone.',true));
      activeDrone=false;localDronePosition=null;
      setStatus(isRcCar?(hit?'RC car detonated on target.':'RC car detonated on impact.'):
        hit?'Drone detonated on target.':'Drone detonated on impact.');return;
    }
    const safeAngle=Number.isFinite(localDronePosition.angle)?localDronePosition.angle:0;
    localDronePosition={...next,angle:safeAngle};
    const local={...current,...localDronePosition};
    warState.drones[playerKey]=local;
    if (Date.now()-lastDroneWriteAt>120&&!updateDrone.writeBusy) {
      updateDrone.writeBusy=true;
      lastDroneWriteAt=Date.now();
      updateWar('drones/'+playerKey,drone=>drone?{...drone,...next,
        angle:Number.isFinite(local.angle)?local.angle:0,lastWriteAt:Date.now()}:drone)
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
    const initial={name:player.name,team,x:team==='vortex'?spawn.x+150:spawn.x-150,y:spawn.y,hp:100,
      ammo:weapons.ar_pulse.mag,secondary:'pistol_sidekick',secondaryAmmo:secondaryWeapons.pistol_sidekick.mag,
      activeWeaponSlot:'primary',kills:0,deaths:0,weapon:'ar_pulse',attachments:[],loadoutSet:false,vehicle:'',vehiclePad:'',
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
    const weaponSlot=vehicleWeapon?null:
      player.activeWeaponSlot==='secondary'&&weapons[player.secondary]?.slot==='secondary'?'secondary':'primary';
    const weapon=vehicleWeapon||effectiveWeapon(player,weaponSlot);
    const ammoField=vehicleWeapon?'vehicleAmmo':weaponSlot==='secondary'?'secondaryAmmo':'ammo';
    if (Number(player[ammoField]||0)>=weapon.mag) return;
    reloading = true;
    ui.reload.disabled = true;
    ui.reload.textContent = 'Reloading '+(vehicleWeapon?weapon.name:'')+'…';
    playSound('reload');
    reloadStartedAt=Date.now();
    reloadEndsAt=reloadStartedAt+weapon.reload;
    reloadTimer=window.setTimeout(async () => {
      try {
        await mutatePlayer(current=>current?{
          ...current,[ammoField]:vehicleWeapons[current.vehicle]&&ammoField==='vehicleAmmo'
            ?vehicleWeapons[current.vehicle].mag:weaponSlot?effectiveWeapon(current,weaponSlot).mag:effectiveWeapon(current,'primary').mag,
          lastSeen:Date.now()
        }:current);
      } catch (error) { setStatus(error.message,true); }
      reloading=false;reloadEndsAt=0;reloadStartedAt=0;reloadTimer=0;
      if (ui.reloadTimer) ui.reloadTimer.hidden=true;
      if (ui.reloadProgress) ui.reloadProgress.style.width='0%';
      if (!destroyed) { ui.reload.disabled=false;ui.reload.textContent='Reload (R)';ui.reloadTimer.textContent=''; }
    },weapon.reload);
  }

  async function captureOrRaid() {
    if (captureBusy || !warState) return;
    const player=warState.players[playerKey];
    if (!player) return;
    if (player.transportId) { setStatus('Disembark before capturing or raiding.');return; }
    const position=player.name===playerName&&localPosition?localPosition:player;
    if (!player.vehicle) {
      const deployment=vehicleDeploymentArea(position);
      if (deployment.insideBuilding) {
        setStatus('Exit the building before opening the vehicle spawn menu.');
        return;
      }
      if (deployment.atOwnBase||deployment.friendlyRelay) {
        openVehicleSpawnMenu();
        return;
      }
    }
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

  function vehicleDeploymentArea(position) {
    const atOwnBase=isInOwnSafeZone(playerTeam,Number(position.x),Number(position.y));
    const insideBuilding=!!houseInside||mapObstacles.some(item=>(item.type==='building'||item.type==='house')&&
      circleIntersectsRect(Number(position.x),Number(position.y),12,item));
    const friendlyRelay=Object.entries(nodePositions).map(([id,node])=>({id,node,
      distance:Math.hypot(node.x-position.x,node.y-position.y)}))
      .filter(entry=>warState.nodes[entry.id]?.team===playerTeam&&entry.distance<=1280)
      .sort((a,b)=>a.distance-b.distance)[0];
    return {atOwnBase,insideBuilding,friendlyRelay};
  }

  function openVehicleSpawnMenu() {
    if (!ui?.spawnMenu) return;
    if (!ui.spawnMenu.hidden) { closeVehicleSpawnMenu();return; }
    const player=warState&&warState.players[playerKey];
    const position=localPosition||player;
    if (!player||player.vehicle||player.transportId||!position) return;
    const deployment=vehicleDeploymentArea(position);
    if (deployment.insideBuilding) {
      setStatus('Exit the building before opening the vehicle spawn menu.');
      return;
    }
    if (!deployment.atOwnBase&&!deployment.friendlyRelay) {
      setStatus('Vehicle spawning is available at your base or a friendly captured point.');
      return;
    }
    ui.spawnVehicle.value=ui.vehicle.value;
    ui.spawnHint.textContent=deployment.atOwnBase?'Base deployment pad':
      'Friendly point: '+deployment.friendlyRelay.node.label;
    ui.spawnMenu.hidden=false;
    ui.spawnVehicle.focus();
    playSound('pause');
  }

  function closeVehicleSpawnMenu() {
    if (ui?.spawnMenu) ui.spawnMenu.hidden=true;
  }

  async function parkGroundVehicle(player,position) {
    const id='parked_'+safeUserKey(playerName)+'_'+Date.now();
    const now=Date.now();
    const parked={id,type:player.vehicle,team:playerTeam,owner:playerName,
      x:Number(position.x),y:Number(position.y),padId:player.vehiclePad||'',
      facingAngle:Number(player.facingAngle)||0,parked:true,parkedAt:now,expiresAt:now+180_000};
    await updateWar('vehicles/'+id,()=>parked);
    if (warState) warState.vehicles[id]=parked;
    try {
      await mutatePlayer(current=>current?{...current,vehicle:'',vehiclePad:'',lastSeen:Date.now()}:current);
    } catch(error) {
      await updateWar('vehicles/'+id,()=>null).catch(()=>{});
      if (warState&&warState.vehicles) delete warState.vehicles[id];
      throw error;
    }
    localPosition={x:Number(position.x),y:Number(position.y)};
    movementVelocity={x:0,y:0};
    setStatus('Dismounted. This vehicle will remain for 3 minutes, then explode.');
  }

  async function deployVehicle(selectedType='') {
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
        await parkGroundVehicle(player,position);
      } catch(error) { setStatus(error.message,true); }
      return;
    }
    const type=selectedType||ui.vehicle.value;
    ui.vehicle.value=type;
    const {atOwnBase,insideBuilding,friendlyRelay}=vehicleDeploymentArea(position);
    if (insideBuilding) {
      setStatus('Exit the building before deploying a vehicle.');
      return;
    }
    const nearbyTransport=Object.values(warState.vehicles||{}).some(transport=>transport&&
      transport.type===transportType&&transport.team===playerTeam&&transport.hp>0&&
      (!Number(transport.expiresAt)||Number(transport.expiresAt)>Date.now())&&
      Math.hypot(position.x-transport.x,position.y-transport.y)<115);
    if (type!==transportType&&!atOwnBase&&!friendlyRelay&&!nearbyTransport) {
      setStatus('Deploy ground vehicles at your base or inside a friendly captured relay zone.');
      return;
    }
    try {
      const padId=atOwnBase?playerTeam+'_'+type:'relay_'+friendlyRelay?.id+'_'+type;
      const pad=atOwnBase?vehiclePadPosition(playerTeam,type):null;
      const spawnPosition=pad||friendlyRelay&&{x:Number(position.x),y:Number(position.y)};
      if (!spawnPosition&&type!==transportType) throw new Error('That vehicle has no designated deployment position.');
      if (type===transportType||nearbyTransport) {
        const nearby=Object.entries(warState.vehicles||{}).find(([,transport])=>transport&&
          transport.type===transportType&&transport.team===playerTeam&&transport.hp>0&&
          (!Number(transport.expiresAt)||Number(transport.expiresAt)>Date.now())&&
          transport.passengers.length<10&&Math.hypot(position.x-transport.x,position.y-transport.y)<115);
        if (nearby) {
          let boarded=false;
          let boardedRole='passenger';
          const [id]=nearby;
          await updateWar('vehicles/'+id,current=>{
            boarded=!!current&&current.team===playerTeam&&current.type===transportType&&
              current.passengers.length<10&&!current.passengers.includes(playerKey);
            if (boarded) boardedRole=!current.pilot?'pilot':
              transportGunnerKeys(current).length<4?'side gunner':'passenger';
            return boarded?{...current,pilot:current.pilot||playerKey,
              passengers:[...current.passengers,playerKey],parked:false,parkedAt:0,
              expiresAt:0,explodedAt:0,cleanupAt:0}:current;
          });
          if (!boarded) throw new Error('The helicopter is full or unavailable.');
          await mutatePlayer(current=>({...current,vehicle:transportType,transportId:id,
            vehiclePad:nearby[1].padId||'',x:nearby[1].x,y:nearby[1].y,lastSeen:Date.now()}));
          localPosition={x:nearby[1].x,y:nearby[1].y};
          localTransportId=id;
          movementVelocity={x:0,y:0};
          closeVehicleSpawnMenu();
          setStatus('Boarded transport as '+boardedRole+' ('+(nearby[1].passengers.length+1)+'/10). '+
            (boardedRole==='pilot'?'WASD fly; hold Q to descend or E to climb. ':'')+'Press V to leave.');
          return;
        }
        if (!atOwnBase) {
          setStatus('Press V within 115 units of a friendly helicopter to board; select Transport helicopter to deploy one at base.');
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
        movementVelocity={x:0,y:0};
        closeVehicleSpawnMenu();
        setStatus('Transport helicopter deployed. WASD fly; hold Q to descend or E to climb. Up to 10 occupants; press V to leave.');
        return;
      }
      const occupied=Object.entries(warState.players||{}).some(([key,other])=>key!==playerKey&&other&&
        other.team===playerTeam&&other.vehicle===type&&other.vehiclePad===padId&&other.online&&
        Date.now()-Number(other.lastSeen||0)<20000);
      if (occupied) throw new Error('The '+vehicles[type].name+' pad is occupied by a teammate.');
      await mutatePlayer(current=>current?{...current,x:spawnPosition.x,y:spawnPosition.y,vehicle:type,vehiclePad:padId,
        vehicleAmmo:vehicleWeapons[type]?.mag||0,lastSeen:Date.now()}:current);
      closeVehicleSpawnMenu();
      localPosition={x:spawnPosition.x,y:spawnPosition.y};
      movementVelocity={x:0,y:0};
      closeVehicleSpawnMenu();
      setStatus('Spawned '+vehicles[type].name+' '+(atOwnBase?'at its base pad. ':'at the friendly relay. ')+'Press V to dismount.');
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
      const abandoned=passengers.length===0;
      const parkedAt=abandoned?Date.now():0;
      remaining={...current,passengers,
        pilot:current.pilot===playerKey?passengers[0]||'':current.pilot,
        parked:abandoned,parkedAt,expiresAt:abandoned?parkedAt+180_000:0};
      return remaining;
    });
    if (remaining&&warState) warState.vehicles[id]=remaining;
    if (remaining&&playerKey===transport?.pilot&&remaining.pilot) {
      const nextPilot=remaining.pilot;
      await updateWar('players/'+nextPilot,current=>current?{...current,x:position.x,y:position.y}:current);
    }
    await mutatePlayer(current=>current?{...current,vehicle:'',vehiclePad:'',transportId:'',
      x:position.x,y:position.y,lastSeen:Date.now()}:current);
    localPosition=position;
    movementVelocity={x:0,y:0};
    localTransportId='';
    setStatus(remaining&&remaining.parked
      ?'Helicopter parked. It will remain for 3 minutes, then explode.'
      :'Disembarked from transport.');
  }

  function beginCapture(nodeId,duration) {
    captureBusy=true;
    captureTarget=nodeId;
    captureStartedAt=Date.now();
    captureDuration=duration;
    const relayTeam=warState.nodes[nodeId]?.team;
    const relayLabel=nodePositions[nodeId]?.label||nodeId;
    announceWar(teamLabel(playerTeam)+' is '+(relayTeam
      ?'taking over '+relayLabel+' from '+teamLabel(relayTeam)
      :'capturing '+relayLabel)+'.')
      .catch(error=>setStatus(error.message||'Could not announce the relay capture.',true));
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
        let capturedFrom='';
        const updated=await updateWar('nodes/'+id,nodeState=>{
          captured=false;
          capturedFrom='';
          if (nodeState&&nodeState.team===playerTeam) return nodeState;
          captured=true;
          capturedFrom=nodeState&&nodeState.team||'';
          return {team:playerTeam,owner:playerName,capturedAt:Date.now()};
        });
        if (captured&&updated.team===playerTeam) {
          await updateWar('economy/'+playerTeam,economy=>({...economy,resources:Number(economy&&economy.resources||0)+40}));
          const relayLabel=nodePositions[id].label;
          const message=teamLabel(playerTeam)+' captured '+relayLabel+
            (capturedFrom?' from '+teamLabel(capturedFrom):'')+'.';
          try { await announceWar(message); }
          catch(error) { setStatus(error.message||'Relay captured, but the announcement failed.',true); }
          setStatus(message+' +40 team resources.');
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
        progress.xp=Math.min((maxLevel-1)*xpPerLevel,progress.xp+(xpShares[owner]||0));
        progress.level=Math.min(maxLevel,Math.floor(progress.xp/xpPerLevel)+1);
        user.dropzone=progress;
      });
    }
    if (Object.keys(shares).length) {
      await refreshAccount();
      refreshProgressUi();
      setStatus('Captured relays paid their owners Sektorium and 50 XP per relay.');
    }
  }

  function setLoadoutStatus(message,error=false) {
    if (ui?.loadoutStatus) {
      ui.loadoutStatus.textContent=message;
      ui.loadoutStatus.classList.toggle('error',error);
    }
    setStatus(message,error);
  }

  async function equipLoadout(event) {
    event.preventDefault();
    if (!warState||!accountData||!playerKey) {
      setLoadoutStatus('Wait until Dropzone is connected before equipping a loadout.',true);
      return;
    }
    const weaponId=ui.weapon.value;
    const secondaryId=ui.secondaryWeapon.value;
    const chosen=[ui.attachment1.value,ui.attachment2.value].filter(Boolean);
    const chosenWeapons=[weapons[weaponId],weapons[secondaryId]];
    if (!weapons[weaponId]||weapons[weaponId].slot==='secondary'||
        !weapons[secondaryId]||weapons[secondaryId].slot!=='secondary'||
        chosen.some(id=>!attachments[id] ||
      !accountData.dropzone.ownedAttachments.includes(id) ||
      (attachments[id].types&&!chosenWeapons.some(weapon=>weapon&&attachments[id].types.includes(weapon.type)))) ||
      new Set(chosen).size!==chosen.length) {
      setLoadoutStatus('Choose a primary, a pistol or explosive secondary, and attachments you own.',true);return;
    }
    const lockedWeapon=[weaponId,secondaryId].map(id=>weapons[id])
      .find(weapon=>weapon.level>accountData.dropzone.level);
    if (lockedWeapon) {
      setLoadoutStatus('Reach level '+lockedWeapon.level+' to unlock '+lockedWeapon.name+'.',true);return;
    }
    try {
      const previous=warState.players[playerKey];
      const {tactical,lethal}=equipmentChoices(previous);
      const tacticalId=ui.tactical.value,lethalId=ui.lethal.value;
      if (!tactical.some(([id])=>id===tacticalId)||!lethal.some(([id])=>id===lethalId)) {
        throw new Error('Choose field equipment you have available.');
      }
      const changing=previous && (previous.weapon!==weaponId||previous.secondary!==secondaryId||
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
      await mutatePlayer(player=>({...player,weapon:weaponId,secondary:secondaryId,attachments:chosen,loadoutSet:true,
        tactical:tacticalId,lethal:lethalId,
        ammo:effectiveWeapon({...player,weapon:weaponId,attachments:chosen},'primary').mag,
        secondaryAmmo:effectiveWeapon({...player,secondary:secondaryId,attachments:chosen},'secondary').mag}));
      refreshProgressUi();
      refreshEquipmentUi();
      setLoadoutStatus('Loadout equipped.');
    } catch(error) { setLoadoutStatus(error.message||'Could not equip this loadout.',true); }
  }

  function refreshProgressUi() {
    if (!ui || !accountData) return;
    const progress=normalizeProgress(accountData.dropzone);
    accountData.dropzone=progress;
    const inLevel=progress.level===maxLevel?xpPerLevel:progress.xp%xpPerLevel;
    const remaining=progress.level===maxLevel?0:xpPerLevel-inLevel;
    ui.progress.innerHTML='<div class="nexus-war-progress-heading"><strong>Level '+progress.level+' / '+maxLevel+'</strong><span>'+progress.xp.toLocaleString()+' XP'+
      (progress.level===maxLevel?' · MAX':' · '+remaining.toLocaleString()+' to next level')+'</span></div><div class="nexus-war-progress-bar"><span style="width:'+
      (progress.level===maxLevel?100:inLevel/xpPerLevel*100)+'%"></span></div><small>Eliminations and captured relays earn XP. Progress and purchased attachments stay with your Nexus account after weekly wipes.</small>';
    const balance=Number(accountData.balance||0);
    ui.wallet.textContent='Sektorium: '+balance.toLocaleString();
    for (const part of weaponColorParts) {
      if (ui.weaponColors&&ui.weaponColors[part])
        ui.weaponColors[part].value=progress.weaponColors[part]||weaponColorDefaults[part];
    }
    const current=ui.weapon.value;
    const currentSecondary=ui.secondaryWeapon.value||warState.players[playerKey]?.secondary||'pistol_sidekick';
    const byUnlockLevel=(left,right)=>left[1].level-right[1].level||left[1].name.localeCompare(right[1].name);
    const primaryEntries=Object.entries(weapons).filter(([,weapon])=>weapon.slot!=='secondary').sort(byUnlockLevel);
    const secondaryEntries=Object.entries(weapons).filter(([,weapon])=>weapon.slot==='secondary').sort(byUnlockLevel);
    const arsenalSummary=container.querySelector('.nexus-war-arsenal > span');
    if (arsenalSummary) arsenalSummary.textContent=primaryEntries.length+' primary weapons across '+
      new Set(primaryEntries.map(([,weapon])=>weapon.type)).size+' classes · '+
      secondaryEntries.length+' pistol / explosive secondaries';
    ui.weapon.innerHTML=primaryEntries.map(([id,weapon])=>
      '<option value="'+id+'" '+(weapon.level>progress.level?'disabled':'')+'>'+
      weapon.type+' · '+weapon.name+(weapon.level>1?' · Level '+weapon.level:'')+
      (weapon.level>progress.level?' (locked)':'')+'</option>').join('');
    ui.weapon.value=weapons[current]&&weapons[current].slot!=='secondary'&&
      weapons[current].level<=progress.level?current:'ar_pulse';
    ui.secondaryWeapon.innerHTML=secondaryEntries.map(([id,weapon])=>
      '<option value="'+id+'" '+(weapon.level>progress.level?'disabled':'')+'>'+weapon.type+' · '+weapon.name+
      (weapon.level>1?' · Level '+weapon.level:'')+(weapon.level>progress.level?' (locked)':'')+'</option>').join('');
    ui.secondaryWeapon.value=weapons[currentSecondary]?.slot==='secondary'&&
      weapons[currentSecondary].level<=progress.level?currentSecondary:'pistol_sidekick';
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

  async function colorWeapons() {
    const colors=Object.fromEntries(weaponColorParts.map(part=>[
      part,String(ui.weaponColors[part].value||'').toLowerCase()
    ]));
    if (Object.values(colors).some(color=>!/^#[0-9a-f]{6}$/.test(color))) {
      setStatus('Choose a valid color for each weapon part.',true);return;
    }
    const sameColors=current=>weaponColorParts.every(part=>current&&current[part]===colors[part]);
    if (sameColors(accountData.dropzone.weaponColors)) { setStatus('Those weapon part colors are already applied.');return; }
    try {
      let purchaseError='';
      await updateAccount(user=>{
        const progress=normalizeProgress(user.dropzone);
        const balance=Number(user.balance||0);
        if (sameColors(progress.weaponColors)) { purchaseError='Those weapon part colors are already applied.';return; }
        if (balance<100) { purchaseError='You need 100 Sektorium to apply weapon part colors.';return; }
        user.balance=balance-100;
        progress.weaponColor='';
        progress.weaponColors=colors;
        user.dropzone=progress;
      });
      if (purchaseError) throw new Error(purchaseError);
      await mutatePlayer(player=>({...player,weaponColors:colors,weaponColor:''}));
      refreshProgressUi();
      draw();
      setStatus('Weapon part colors applied for 100 Sektorium.');
    } catch(error) { setStatus(error.message||'Could not apply that weapon color.',true); }
  }

  function onActionClick(event) {
    const button=event.target.closest('[data-war-action]');
    if (!button || !container || !container.contains(button)) {
      const purchase=event.target.closest('[data-war-buy-attachment]');
      if (purchase && container && container.contains(purchase)) buyAttachment(purchase.dataset.warBuyAttachment);
      return;
    }
    if (button.dataset.warAction==='join-dropzone-team') chooseDropzoneTeam(button.dataset.team);
    if (button.dataset.warAction==='vote-map')
      submitMapVote(button.dataset.mapId).catch(error=>setStatus(error.message||'Could not record your map vote.',true));
    if (button.hasAttribute('data-vote-team')) {
      selectedVoteTeam=button.dataset.voteTeam;
      renderMapVotes();
    }
    if (button.dataset.warAction==='pause-game') togglePause(true);
    if (button.dataset.warAction==='resume-game') togglePause(false);
    if (button.dataset.warAction==='audio-toggle') toggleSound();
    if (button.dataset.warAction==='secret-xp')
      grantSecretReward().catch(error=>setStatus(error.message||'Secret reward could not be saved.',true));
    if (button.dataset.warAction==='use-attachment') useWeaponAttachment();
    if (button.dataset.warAction==='color-weapons') colorWeapons();
    if (button.dataset.warAction==='close-spawn-menu') closeVehicleSpawnMenu();
    if (button.dataset.warAction==='spawn-selected-vehicle') deployVehicle(ui.spawnVehicle.value);
    if (button.dataset.warAction==='switch-weapon') switchWeaponSlot(
      warState.players[playerKey]?.activeWeaponSlot==='secondary'?'primary':'secondary');
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
    if (button.dataset.warAction==='grapple-buy') purchaseFieldUpgrade('grapple');
    if (button.dataset.warAction==='airstrike-buy') purchaseFieldUpgrade('airstrike');
    if (button.dataset.warAction==='bunker-buster-buy') purchaseFieldUpgrade('bunkerBuster');
    if (button.dataset.warAction==='rc-car-buy') purchaseFieldUpgrade('rcCar');
    if (button.dataset.warAction==='drone-launch') useLethal();
    if (button.dataset.warAction==='use-tactical') useTactical();
    if (button.dataset.warAction==='use-lethal') useLethal();
    if (button.dataset.warAction==='drone-toggle') toggleDroneControl();
    if (button.dataset.warAction==='give-up'&&warState.players[playerKey]?.downed) {
      setStatus('Hold the give-up button for 2 seconds to give up.');
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
    ui.secondaryWeapon.value=player.secondary||'pistol_sidekick';
    ui.attachment1.value=(player.attachments||[])[0]||'';
    ui.attachment2.value=(player.attachments||[])[1]||'';
    ui.tactical.value=player.tactical||'smoke';
    ui.lethal.value=player.lethal||'grenade';
    for (const part of weaponColorParts) {
      if (ui.weaponColors&&ui.weaponColors[part])
        ui.weaponColors[part].value=accountData.dropzone.weaponColors[part]||weaponColorDefaults[part];
    }
    updateWeaponSwitchUi(player);
    setStatus('Connected · '+teamLabel(playerTeam)+' · WASD move, mouse aim/fire, 1 primary, 2 secondary, R reload.');
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
      '<p class="nexus-war-description">Explore a frontline six times wider and taller than before. Move on foot relative to the cursor, and use high-speed vehicles from your team base. Click Deploy / board / dismount or press V once. Tanks and anti-air have separate ammo; aim with the mouse, fire on the map, and press R to reload. Equip a stim in your tactical slot and use X for a strong temporary speed boost and healing. Marked loot crates can contain tactical or lethal charges, armor plates, or team resources; open one with E when nearby. Fixed crates respawn, and random airdrops arrive during the match. Each base is protected by a team-only safe zone. Spawn each vehicle at its marked pad inside your base; occupied pads are unavailable. Capture empty relays in 10 seconds or enemy relays in 20. Each captured relay earns its owner 25 Sektorium and 50 XP per minute, and adds team resources once per minute. Only anti-air can bring down a transport helicopter; it lifts as it flies and seats up to ten. Press Z to apply a purchased armor plate. Enter marked houses with Q, revive allies with F, or hold G while downed to give up.</p>' +
      '<a class="nexus-button nexus-war-home" href="'+nexusUrl()+'">Back to Nexus</a>' +
      '<div class="nexus-war-status" data-war-status role="status" aria-live="polite">Connecting to the frontline…</div>' +
      '<div class="nexus-war-progression" data-war-progression></div><div class="nexus-war-wallet" data-war-wallet></div>' +
      '<div class="nexus-war-stats" data-war-stats></div>' +
      '<div class="nexus-war-map-wrap"><canvas class="nexus-war-canvas" width="3000" height="1500" aria-label="Top-down multiplayer war arena, six times its previous width and height, following your player"></canvas><canvas class="nexus-war-minimap" data-war-minimap width="360" height="180" aria-label="Full battlefield minimap showing bases, relays, buildings, players, and your viewport"></canvas></div>' +
      '<div class="nexus-war-capture" data-war-capture-progress hidden><strong>Capturing relay</strong><div><span></span></div></div>' +
      '<div class="nexus-war-controls"><span><kbd>W A S D</kbd> Move relative to cursor / steer drone</span><span><kbd>Mouse</kbd> Aim + fire</span><span><kbd>Z</kbd> Plate up</span><span><kbd>E</kbd> Loot / capture / raid</span><span><kbd>Q</kbd> Enter / exit house</span><span><kbd>F</kbd> Revive nearby ally</span><span><kbd>V</kbd> Deploy / board / exit (press once)</span><span><kbd>R</kbd> Reload</span><label>Vehicle<select data-war-vehicle><option value="scout_bike">Scout bike · fast</option><option value="assault_rover">Assault rover · very fast</option><option value="tank">Battle tank · cannon</option><option value="anti_air">Anti-air · cannon</option><option value="transport_helicopter">Transport helicopter · 10 seats</option></select></label><button class="nexus-button secondary" type="button" data-war-action="capture">Loot / capture nearby</button><button class="nexus-button secondary" type="button" data-war-action="vehicle">Deploy / board / dismount (V)</button><button class="nexus-button secondary" type="button" data-war-action="reload">Reload</button><span data-war-reload-timer aria-live="polite"></span></div>' +
      '<div class="nexus-war-controls"><strong>Base upgrades</strong><button class="nexus-button secondary" type="button" data-war-action="armor">Buy armor plate · 150</button><span>Press <kbd>Z</kbd> to plate up</span><button class="nexus-button secondary" type="button" data-war-action="self-revive-buy">Self-revive · 400</button><button class="nexus-button secondary" type="button" data-war-action="turret">Buy sentry turret · 350</button><button class="nexus-button secondary" type="button" data-war-action="drone-buy">Buy kamikaze drone · 250</button><button class="nexus-button secondary" type="button" data-war-action="drone-toggle">Toggle drone control</button><button class="nexus-button secondary" type="button" data-war-action="revive">Revive ally</button><button class="nexus-button secondary" type="button" data-war-action="self-revive">Use self-revive</button><button class="nexus-button secondary" type="button" data-war-action="give-up" hidden>Hold to give up</button></div>' +
      '<div class="nexus-war-touch"><div class="nexus-war-pad"><button type="button" data-war-move="up" aria-label="Move up">▲</button><button type="button" data-war-move="left" aria-label="Move left">◀</button><button type="button" data-war-move="down" aria-label="Move down">▼</button><button type="button" data-war-move="right" aria-label="Move right">▶</button></div><button type="button" class="nexus-war-fire" data-war-fire>Fire</button></div>' +
      '<form class="nexus-war-loadout"><label>Weapon<select data-war-weapon></select></label><label>Attachment 1<select data-war-attachment="1"></select></label><label>Attachment 2<select data-war-attachment="2"></select></label><label>Tactical<select data-war-tactical></select></label><label>Lethal<select data-war-lethal></select></label><button class="nexus-button" type="submit">Equip loadout</button><button class="nexus-button secondary" type="button" data-war-action="use-tactical">Use tactical (X)</button><button class="nexus-button secondary" type="button" data-war-action="use-lethal">Use lethal (C)</button><small class="nexus-war-equipment-help">Choose one tactical and one lethal. Stims restore up to 45 health and boost movement speed for 8 seconds. Smoke, stims, grenades, and claymores restock when you respawn. Purchased turret and drone charges appear in their respective slots.</small></form>' +
      '<section class="nexus-war-attachment-shop"><h3>Attachment shop</h3><p>Buy permanent upgrades with your Nexus Sektorium.</p><div data-war-attachment-shop></div></section>' +
      '<div class="nexus-war-arsenal"><strong>Arsenal</strong><span>Primary and secondary weapons across nine classes · unlocks through level 100</span><small>Weapons unlock at levels 1–100. Eliminations earn 100 XP; new relay captures earn 75 XP. Each captured relay pays its owner 25 Sektorium and 50 XP per minute. Armor absorbs damage before health and is capped at three plates. Changing an established loadout costs 20 team resources.</small></div>';
    const hud=document.createElement('div');
    hud.className='nexus-war-hud';
    hud.dataset.warHud='';
    hud.setAttribute('aria-label','Health and armor status');
    container.querySelector('.nexus-war-map-wrap').appendChild(hud);
    const teamChoice=document.createElement('section');
    teamChoice.className='nexus-war-team-choice nexus-stock-team-picker';
    teamChoice.dataset.warTeamChoice='';
    teamChoice.hidden=true;
    teamChoice.innerHTML='<strong>Choose your team for this week</strong><p>Your choice resets at the weekly frontline reset.</p>'+
      '<button class="nexus-button nexus-team-vortex" type="button" data-war-action="join-dropzone-team" data-team="vortex">Join Vortex</button>'+
      '<button class="nexus-button nexus-team-krypton" type="button" data-war-action="join-dropzone-team" data-team="krypton">Join Krypton</button>';
    container.querySelector('[data-war-status]').after(teamChoice);
    const interactionHint=[...container.querySelectorAll('.nexus-war-controls kbd')]
      .find(key=>key.textContent==='E')?.parentElement;
    if (interactionHint) interactionHint.innerHTML='<kbd>E</kbd> Spawn vehicle / loot / capture';
    ui={
      canvas:container.querySelector('.nexus-war-canvas'),
      minimap:container.querySelector('[data-war-minimap]'),
      status:container.querySelector('[data-war-status]'),
      hud:container.querySelector('[data-war-hud]'),
      teamChoice:container.querySelector('[data-war-team-choice]'),
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
    ui.form.addEventListener('submit',equipLoadout);
    ui.mapWrap=container.querySelector('.nexus-war-map-wrap');
    ui.mapVoteOverlay=document.createElement('section');
    ui.mapVoteOverlay.className='nexus-war-map-vote';
    ui.mapVoteOverlay.hidden=true;
    ui.mapVoteOverlay.setAttribute('role','dialog');
    ui.mapVoteOverlay.setAttribute('aria-modal','true');
    ui.mapVoteOverlay.innerHTML='<header><div><span>ROUND COMPLETE</span><h2>Choose the next map</h2><p>Pick your team, then vote. The map with the most votes wins in <strong data-map-vote-timer>15s</strong>.</p></div></header><div class="nexus-war-vote-teams"><span>Next round team</span><button type="button" data-vote-team="vortex">Vortex</button><button type="button" data-vote-team="krypton">Krypton</button></div><div class="nexus-war-map-vote-grid">'+
      mapCatalog.map(map=>'<article class="nexus-war-map-option"><canvas width="300" height="150" data-map-preview="'+map.id+'" aria-label="Preview of '+map.name+'"></canvas><div><strong>'+map.name+'</strong><small>'+map.variant+' · '+map.points.length+' control points'+(map.special?' · Special rules':'')+'</small></div><button type="button" data-war-action="vote-map" data-map-id="'+map.id+'">Vote · <span data-vote-count="'+map.id+'">0</span></button></article>').join('')+'</div>';
    ui.mapWrap.appendChild(ui.mapVoteOverlay);
    ui.fullscreen=container.querySelector('[data-war-action="fullscreen"]');
    ui.mapWrap.appendChild(ui.fullscreen);
    ui.pauseButton=document.createElement('button');
    ui.pauseButton.type='button';
    ui.pauseButton.className='nexus-button secondary';
    ui.pauseButton.dataset.warAction='pause-game';
    ui.pauseButton.textContent='Pause';
    ui.pauseButton.setAttribute('aria-pressed','false');
    container.querySelector('.nexus-war-heading-actions').appendChild(ui.pauseButton);
    ui.giveUp=container.querySelector('[data-war-action="give-up"]');
    ui.reloadTimer=container.querySelector('[data-war-reload-timer]');
    ui.reloadHud=document.createElement('div');
    ui.reloadHud.className='nexus-war-reload-hud';
    ui.reloadHud.setAttribute('aria-live','polite');
    ui.reloadHud.innerHTML='<span data-war-reload-progress></span>';
    ui.reloadHud.appendChild(ui.reloadTimer);
    ui.reloadTimer.hidden=true;
    ui.reloadHud.hidden=true;
    ui.reloadProgress=ui.reloadHud.querySelector('[data-war-reload-progress]');
    ui.mapWrap.appendChild(ui.reloadHud);
    ui.pauseMenu=document.createElement('div');
    ui.pauseMenu.className='nexus-war-pause';
    ui.pauseMenu.hidden=true;
    ui.pauseMenu.innerHTML='<section class="nexus-war-pause-panel"><header><div><span>DROPZONE</span><h2>Paused</h2><p>The multiplayer frontline continues while you manage your loadout.</p></div><button class="nexus-button" type="button" data-war-action="resume-game">Resume</button></header><div class="nexus-war-pause-audio"><button class="nexus-button secondary" type="button" data-war-action="audio-toggle">Sound: on</button><label>Volume<input type="range" min="0" max="100" value="18" data-war-volume></label></div><button class="nexus-button" type="button" data-war-action="secret-xp" hidden>theyseeyou · +10,000 XP</button><div class="nexus-war-pause-content" data-war-pause-content></div></section>';
    ui.secretXp=ui.pauseMenu.querySelector('[data-war-action="secret-xp"]');
    ui.soundToggle=ui.pauseMenu.querySelector('[data-war-action="audio-toggle"]');
    ui.soundVolume=ui.pauseMenu.querySelector('[data-war-volume]');
    ui.soundVolume.value=String(Math.round(soundVolume*100));
    ui.soundToggle.textContent=soundEnabled?'Sound: on':'Sound: off';
    ui.soundVolume.addEventListener('input',()=>{
      soundVolume=Number(ui.soundVolume.value)/100;
      soundEnabled=soundVolume>0;
      ui.soundToggle.textContent=soundEnabled?'Sound: on':'Sound: off';
    });
    ui.pauseContent=ui.pauseMenu.querySelector('[data-war-pause-content]');
    ui.mapWrap.appendChild(ui.pauseMenu);
    const pauseSelectors=['.nexus-war-description','.nexus-war-progression','.nexus-war-wallet',
      '.nexus-war-stats','.nexus-war-controls','.nexus-war-touch','.nexus-war-loadout',
      '.nexus-war-attachment-shop','.nexus-war-arsenal'];
    ui.pauseItems=pauseSelectors.map(selector=>container.querySelector(selector)).filter(Boolean)
      .map(element=>({element,placeholder:document.createComment('pause-panel-placeholder')}));
    ui.spawnMenu=document.createElement('div');
    ui.spawnMenu.className='nexus-war-spawn-menu';
    ui.spawnMenu.hidden=true;
    ui.spawnMenu.innerHTML='<section><header><div><span>DEPLOYMENT</span><h3>Spawn vehicle</h3></div><button class="nexus-button secondary" type="button" data-war-action="close-spawn-menu" aria-label="Close vehicle menu">×</button></header><p data-war-spawn-hint></p><label>Vehicle<select data-war-spawn-vehicle><option value="scout_bike">Scout bike</option><option value="assault_rover">Assault rover</option><option value="tank">Battle tank</option><option value="anti_air">Anti-air</option><option value="transport_helicopter">Transport helicopter</option></select></label><div class="nexus-war-spawn-actions"><button class="nexus-button" type="button" data-war-action="spawn-selected-vehicle">Deploy selected</button></div></section>';
    ui.spawnVehicle=ui.spawnMenu.querySelector('[data-war-spawn-vehicle]');
    ui.spawnHint=ui.spawnMenu.querySelector('[data-war-spawn-hint]');
    ui.spawnVehicle.value=ui.vehicle.value;
    ui.spawnVehicle.addEventListener('change',()=>{ui.vehicle.value=ui.spawnVehicle.value;});
    ui.mapWrap.appendChild(ui.spawnMenu);
    ui.weapon.innerHTML=Object.entries(weapons).filter(([,weapon])=>weapon.slot!=='secondary')
      .sort((left,right)=>left[1].level-right[1].level||left[1].name.localeCompare(right[1].name))
      .map(([id,weapon])=>'<option value="'+id+'">'+weapon.type+' · '+weapon.name+'</option>').join('');
    ui.attachment1.innerHTML='<option value="">No attachment</option>';
    ui.attachment2.innerHTML='<option value="">No attachment</option>';
    ui.secondaryWeapon=document.createElement('select');
    ui.secondaryWeapon.dataset.warSecondaryWeapon='';
    ui.secondaryWeapon.setAttribute('aria-label','Secondary weapon');
    const secondaryLabel=document.createElement('label');
    secondaryLabel.append('Secondary',ui.secondaryWeapon);
    ui.form.insertBefore(secondaryLabel,ui.attachment1.parentElement);
    ui.weaponColors={};
    const colorButton=document.createElement('button');
    colorButton.type='button';
    colorButton.className='nexus-button secondary';
    colorButton.dataset.warAction='color-weapons';
    colorButton.textContent='Apply part colors · 100 Sektorium';
    const colorControls=document.createElement('div');
    colorControls.className='nexus-war-color-controls';
    for (const [part,label] of [['receiver','Receiver'],['barrel','Barrel'],['grip','Grip / stock']]) {
      const input=document.createElement('input');
      input.type='color';
      input.value=weaponColorDefaults[part];
      input.setAttribute('aria-label',label+' color');
      ui.weaponColors[part]=input;
      const colorLabel=document.createElement('label');
      colorLabel.className='nexus-war-color-label';
      colorLabel.append(label,input);
      colorControls.appendChild(colorLabel);
    }
    colorControls.appendChild(colorButton);
    ui.form.insertBefore(colorControls,ui.form.querySelector('.nexus-war-equipment-help'));
    ui.loadoutStatus=document.createElement('small');
    ui.loadoutStatus.className='nexus-war-loadout-status';
    ui.loadoutStatus.setAttribute('role','status');
    ui.form.insertBefore(ui.loadoutStatus,ui.form.querySelector('.nexus-war-equipment-help'));
    ui.weaponSwitch=document.createElement('button');
    ui.weaponSwitch.type='button';
    ui.weaponSwitch.className='nexus-button secondary nexus-war-weapon-switch';
    ui.weaponSwitch.dataset.warAction='switch-weapon';
    ui.weaponSwitch.textContent='Primary (1)';
    container.querySelector('.nexus-war-controls').appendChild(ui.weaponSwitch);
    ui.attachmentAction=document.createElement('button');
    ui.attachmentAction.type='button';
    ui.attachmentAction.className='nexus-button secondary';
    ui.attachmentAction.dataset.warAction='use-attachment';
    ui.attachmentAction.textContent='Underbarrel (Tab)';
    ui.attachmentAction.hidden=true;
    container.querySelector('.nexus-war-controls').appendChild(ui.attachmentAction);
    const giveUpHint=document.createElement('span');
    giveUpHint.innerHTML='<kbd>G</kbd> Hold 2s to give up · auto at 10s';
    container.querySelector('.nexus-war-controls').appendChild(giveUpHint);
    const reviveHint=[...container.querySelectorAll('.nexus-war-controls kbd')]
      .find(key=>key.textContent==='F')?.parentElement;
    if (reviveHint) reviveHint.innerHTML='<kbd>F</kbd> Self-revive / revive ally · 5s';
    const supportHint=document.createElement('span');
    supportHint.innerHTML='<kbd>`</kbd> Target airstrike / bunker buster';
    container.querySelector('.nexus-war-controls').appendChild(supportHint);
    container.querySelector('[data-war-action="revive"]').textContent='Revive ally · 5s';
    container.querySelector('[data-war-action="self-revive"]').textContent='Self-revive · 5s';
    container.querySelector('[data-war-action="give-up"]').textContent='Hold 2s to give up';
    const droneHint=document.createElement('span');
    droneHint.innerHTML='<kbd>Shift</kbd> Toggle drone control';
    container.querySelector('.nexus-war-controls').prepend(droneHint);
    const droneToggle=container.querySelector('[data-war-action="drone-toggle"]');
    if (droneToggle) droneToggle.textContent='Toggle drone control (Shift)';
    const baseControls=container.querySelectorAll('.nexus-war-controls')[1];
    for (const [action,label] of [
      ['grapple-buy','Grapple hook · 450'],['airstrike-buy','Precision airstrike · 1800'],
      ['bunker-buster-buy','Bunker buster · 2600'],['rc-car-buy','RC kamikaze car · 1200']
    ]) {
      const button=document.createElement('button');
      button.type='button';button.className='nexus-button secondary';
      button.dataset.warAction=action;button.textContent=label;
      baseControls.appendChild(button);
    }
    updateWeaponSwitchUi();
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
        container.classList.add('nexus-war-unavailable');
        ui.teamChoice.hidden=false;
        setStatus('Choose a team for this week to join Dropzone.');
        return;
      }
      playerTeam=teamLookup;
      await initializeGame();
    } catch(error) {
      setStatus(error.message||'Could not join the frontline.',true);
      container.classList.add('nexus-war-unavailable');
    }
  }

  async function chooseDropzoneTeam(team) {
    if (!ui||!ui.teamChoice||!['vortex','krypton'].includes(team)) return;
    const buttons=[...ui.teamChoice.querySelectorAll('button')];
    buttons.forEach(button=>{button.disabled=true;});
    let selected=false,selectionError='';
    const currentWeek=weekKey();
    try {
      await updateAccount(user=>{
        selectionError='';
        if (user.teamWeek!==currentWeek) {
          user.team='';
          user.teamWeek=currentWeek;
        }
        if (user.team===team) { selected=true;return; }
        if (user.team==='vortex'||user.team==='krypton') {
          selectionError='Your team is already set for this week.';
          return;
        }
        user.team=team;
        user.teamWeek=currentWeek;
        selected=true;
      });
      if (selectionError) throw new Error(selectionError);
      if (!selected) throw new Error('Could not save your team choice. Try again.');
      cacheDropzoneTeam(playerName,team,currentWeek);
      playerTeam=team;
      teamLookup=team;
      ui.teamChoice.hidden=true;
      container.classList.remove('nexus-war-unavailable');
      setStatus('Joining '+teamLabel(team)+' this week…');
      await initializeGame();
    } catch(error) {
      container.classList.add('nexus-war-unavailable');
      setStatus(error.message||'Could not choose a Dropzone team.',true);
      buttons.forEach(button=>{button.disabled=false;});
    }
  }

  function cleanup() {
    destroyed=true;
    paused=false;
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
    reloadStartedAt=0;
    giveUpInterval=0;
    cancelReviveChannel();
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
    if (audioContext) {
      audioContext.close().catch(()=>{});
      audioContext=null;
    }
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
