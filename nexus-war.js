(() => {
  const sharedPath = 'nexus/sharedWorld';
  const gamePath = sharedPath + '/war';
  const sessionKey = 'blobtownSession';
  const localWorldKey = 'blobtownEconomy';
  const localGameKey = 'nexusWarGame';
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
  const xpPerLevel=1000;
  const nodePositions = {north:{x:350,y:175,label:'NORTH RELAY'},mid:{x:500,y:360,label:'SCRAP YARD'},south:{x:650,y:175,label:'SOUTH RELAY'}};
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
  let heartbeatTimer = 0;
  let refreshTimer = 0;
  let lastPositionWrite = 0;
  let lastShot = 0;
  let reloading = false;
  let captureBusy = false;
  let keys = new Set();
  let aim = {x:500,y:280};
  let traces = [];
  let pointerDown = false;
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

  function freshWar() {
    return {
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
      }
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

  function accountFor(world) {
    const users=Array.isArray(world && world.users)?world.users:
      world && world.users && typeof world.users==='object'?Object.values(world.users):[];
    const user=users.find(entry=>entry && String(entry.username).toLowerCase()===playerName.toLowerCase());
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

  async function updateAccount(updater) {
    if (firebaseMode) {
      const result=await firebaseApi.database().ref(sharedPath).transaction(current=>{
        if (!current || typeof current!=='object') return;
        const next=JSON.parse(JSON.stringify(current));
        const user=accountFor(next);
        updater(user);
        return next;
      });
      if (!result.committed) throw new Error('The account update could not be saved. Please retry.');
      accountData=accountFor(result.snapshot.val());
      return accountData;
    }
    const next=await readAccountWorld();
    const user=accountFor(next);
    updater(user);
    if (lanMode) {
      const response=await fetch(requestUrl(sharedPath),{
        method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)
      });
      if (!response.ok) throw new Error((await response.text())||'Could not save the shared Nexus account.');
    } else localStorage.setItem(localWorldKey,JSON.stringify(next));
    accountData=user;
    return user;
  }

  async function refreshAccount() {
    accountData=accountFor(await readAccountWorld());
    accountData.dropzone=normalizeProgress(accountData.dropzone);
    return accountData;
  }

  async function grantXp(amount,reason) {
    const awarded=Math.max(0,Math.floor(amount));
    if (!awarded) return;
    const before=accountData.dropzone.level;
    await updateAccount(user=>{
      const progress=normalizeProgress(user.dropzone);
      progress.xp=Math.min(54*xpPerLevel,progress.xp+awarded);
      progress.level=Math.min(55,Math.floor(progress.xp/xpPerLevel)+1);
      user.dropzone=progress;
    });
    accountData.dropzone=normalizeProgress(accountData.dropzone);
    const levelMessage=accountData.dropzone.level>before?' Level up: level '+accountData.dropzone.level+'!':'';
    setStatus('+'+awarded+' XP · '+reason+'.'+levelMessage);
    refreshProgressUi();
    draw();
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
    return {
      ...base,
      ...value,
      players:value.players && typeof value.players === 'object' ? value.players : {},
      nodes:{...base.nodes,...(value.nodes || {})},
      bases:{...base.bases,...(value.bases || {})},
      economy:{...base.economy,...(value.economy || {})}
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

  function playerDefaults() {
    const initial={weapon:'ar_pulse',attachments:[]};
    return {
      name:playerName,team:playerTeam,x:playerTeam === 'vortex' ? 145 : 855,y:280,
      hp:100,ammo:effectiveWeapon(initial).mag,kills:0,deaths:0,...initial,loadoutSet:false,
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
        !current || current.week !== weekKey() ? freshWar() : current
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
        acceptWarState(value);
      }, error => setStatus('Live war updates disconnected: ' + error.message,true));
      await firebasePlayerRef().onDisconnect().update({online:false});
    } else if (lanMode) {
      const saved = await lanGet();
      warState = normalizeWar(saved);
      if (!saved || saved.week !== weekKey()) await lanPut(warState);
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
      if (!saved || saved.week !== weekKey()) localStorage.setItem(localGameKey,JSON.stringify(warState));
      window.addEventListener('storage',onLocalWarStorage);
    }
    await refreshAccount();
    await mutatePlayer(player => {
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
    const stale=!value || value.week!==weekKey();
    warState=normalizeWar(value);
    if (stale) {
      if (lanMode) lanPut(warState).catch(error=>setStatus(error.message,true));
      else if (!firebaseMode) localStorage.setItem(localGameKey,JSON.stringify(warState));
    }
    if (previousWeek && previousWeek!==warState.week && playerKey && playerTeam) {
      mutatePlayer(()=>playerDefaults()).catch(error=>setStatus(error.message,true));
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
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    animation = requestAnimationFrame(gameFrame);
    incomeTimer = window.setInterval(()=>
      generateTeamResources().catch(error=>setStatus(error.message||'Resource updates failed.',true)),5000);
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
    window.addEventListener('pagehide',markOffline,{once:true});
  }

  function gameFrame(timestamp) {
    if (destroyed || !ui || !ui.canvas.isConnected) return;
    const player = warState && warState.players[playerKey];
    if (player && player.hp<=0 && player.respawnAt<=Date.now() && !respawnBusy) {
      respawnBusy=true;
      mutatePlayer(current=>current?{...current,hp:100,
        x:playerTeam==='vortex'?145:855,y:280,ammo:effectiveWeapon(current).mag,
        respawnAt:0,online:true,lastSeen:Date.now()}:current)
        .catch(error=>setStatus(error.message,true))
        .finally(()=>{respawnBusy=false;});
    }
    if (player && player.online && player.hp>0 && player.respawnAt<=Date.now() && !reloading && timestamp - lastPositionWrite > (lanMode?350:100)) {
      const speed = 220 * Math.min(.15,(timestamp - lastPositionWrite) / 1000);
      let dx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      let dy = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
      if (dx || dy) {
        const length = Math.hypot(dx,dy) || 1;
        const x = Math.max(40,Math.min(960,player.x + dx / length * speed));
        const y = Math.max(55,Math.min(505,player.y + dy / length * speed));
        lastPositionWrite = timestamp;
        mutatePlayer(current => current ? {...current,x,y,lastSeen:Date.now()} : current).catch(error => setStatus(error.message,true));
      }
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
    context.strokeStyle = 'rgba(147,190,163,.055)';
    context.lineWidth = 1;
    for (let x=20;x<width;x+=40) { context.beginPath();context.moveTo(x,0);context.lineTo(x,height);context.stroke(); }
    for (let y=20;y<height;y+=40) { context.beginPath();context.moveTo(0,y);context.lineTo(width,y);context.stroke(); }
    context.fillStyle = '#17231d';
    context.fillRect(20,45,960,470);
    context.strokeStyle = '#54705d';
    context.strokeRect(20,45,960,470);
    drawBase(context,'vortex',80,warState.bases.vortex);
    drawBase(context,'krypton',920,warState.bases.krypton);
    Object.entries(nodePositions).forEach(([id,node]) => drawNode(context,id,node,warState.nodes[id]));
    const visiblePlayers = Object.values(warState.players || {}).filter(player => player && player.online && Date.now() - Number(player.lastSeen || 0) < 20000);
    visiblePlayers.forEach(player => drawPlayer(context,player,player.name === playerName));
    traces = traces.filter(trace => Date.now() - trace.time < 110);
    traces.forEach(trace => {
      context.globalAlpha = Math.max(0,1 - (Date.now() - trace.time) / 110);
      context.strokeStyle = trace.color;
      context.lineWidth = 3;
      context.beginPath();context.moveTo(trace.x1,trace.y1);context.lineTo(trace.x2,trace.y2);context.stroke();
      context.globalAlpha = 1;
    });
    updateStats(visiblePlayers);
  }

  function drawBase(context,team,x,base) {
    const color = team === 'vortex' ? '#5688df' : '#e05b69';
    const destroyed = Number(base && base.destroyedUntil || 0) > Date.now();
    context.fillStyle = destroyed ? '#313c37' : team === 'vortex' ? '#142c4a' : '#421c25';
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.fillRect(x-32,247,64,66);
    context.strokeRect(x-32,247,64,66);
    context.fillStyle = color;
    context.font = 'bold 11px system-ui';
    context.textAlign = 'center';
    context.fillText(team === 'vortex' ? 'VORTEX' : 'KRYPTON',x,237);
    context.fillStyle = '#0a0d0c';
    context.fillRect(x-27,320,54,5);
    context.fillStyle = color;
    context.fillRect(x-27,320,54 * Math.max(0,Number(base && base.health || 0)) / 1200,5);
    context.fillStyle = '#dce9df';
    context.font = '10px system-ui';
    context.fillText(destroyed ? 'RAIDED' : Math.ceil(Number(base && base.health || 0)) + ' / 1200',x,340);
  }

  function drawNode(context,id,node,state) {
    const colors = {vortex:'#5688df',krypton:'#e05b69'};
    const team = state && state.team;
    context.beginPath();
    context.arc(node.x,node.y,28,0,Math.PI*2);
    context.fillStyle = team ? team === 'vortex' ? '#173255' : '#4b2028' : '#252f2a';
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = colors[team] || '#94a99b';
    context.stroke();
    context.fillStyle = '#edf5ef';
    context.font = 'bold 9px system-ui';
    context.textAlign = 'center';
    context.fillText((node.label || id).split(' ')[0],node.x,node.y+3);
    context.font = '9px system-ui';
    context.fillStyle = '#9cac9f';
    context.fillText((state && state.team ? state.team.toUpperCase() : 'NEUTRAL') + ' RESOURCE',node.x,node.y+43);
  }

  function drawPlayer(context,player,isSelf) {
    const color = player.team === 'vortex' ? '#70a6ff' : '#ff7887';
    context.beginPath();
    context.arc(Number(player.x),Number(player.y),isSelf ? 12 : 10,0,Math.PI*2);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = isSelf ? '#ffffff' : '#111815';
    context.lineWidth = isSelf ? 3 : 2;
    context.stroke();
    context.fillStyle = '#101713';
    context.font = 'bold 8px system-ui';
    context.textAlign = 'center';
    context.fillText(String(player.name || '?').slice(0,8),Number(player.x),Number(player.y)+3);
    context.fillStyle = '#070b09';
    context.fillRect(Number(player.x)-17,Number(player.y)-20,34,4);
    context.fillStyle = Number(player.hp) > 50 ? '#65e6ad' : '#ff7782';
    context.fillRect(Number(player.x)-17,Number(player.y)-20,34*Math.max(0,Number(player.hp))/100,4);
  }

  function updateStats(players) {
    const player = warState.players[playerKey];
    if (!player) return;
    const weapon = effectiveWeapon(player);
    const progress=accountData && accountData.dropzone?normalizeProgress(accountData.dropzone):normalizeProgress(null);
    const markup = '<span class="nexus-war-vortex">Vortex resources: ' +
      Number(warState.economy.vortex.resources || 0) + '</span><span class="nexus-war-krypton">Krypton resources: ' +
      Number(warState.economy.krypton.resources || 0) + '</span><span>Players online: ' + players.length +
      '</span><span>K / D: ' + Number(player.kills || 0) + ' / ' + Number(player.deaths || 0) +
      '</span><span>Health: ' + Math.ceil(Number(player.hp)) + '</span><span>Ammo: ' +
      Number(player.ammo) + ' / ' + weapon.mag + '</span><span>Level ' + progress.level +
      ' · XP ' + progress.xp + ' / ' + (progress.level===55?progress.xp:(progress.level*xpPerLevel)) + '</span>';
    if (markup!==lastStatsMarkup) { ui.stats.innerHTML=markup;lastStatsMarkup=markup; }
    const next = new Date();
    next.setUTCHours(0,0,0,0);
    next.setUTCDate(next.getUTCDate() + ((8 - next.getUTCDay()) % 7 || 7));
    const label='Weekly wipe: Monday ' + next.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' UTC';
    if (label!==lastResetLabel) { ui.reset.textContent=label;lastResetLabel=label; }
  }

  function onPointerMove(event) {
    const rect = ui.canvas.getBoundingClientRect();
    aim = {x:(event.clientX-rect.left)*ui.canvas.width/rect.width,y:(event.clientY-rect.top)*ui.canvas.height/rect.height};
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
    const control=event.target.closest('[data-war-move],[data-war-fire]');
    if (!control) return;
    if (control.hasAttribute('data-war-fire')) pointerDown=false;
    else keys.delete(({up:'w',down:'s',left:'a',right:'d'})[control.dataset.warMove]);
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (['w','a','s','d','arrowup','arrowleft','arrowdown','arrowright','r','e'].includes(key) &&
        !event.target.closest('input,select,textarea,button')) event.preventDefault();
    keys.add(key);
    if (key === 'r') reloadWeapon();
    if (key === 'e') captureOrRaid();
  }

  function onKeyUp(event) { keys.delete(event.key.toLowerCase()); }
  function onBlur() { keys.clear(); pointerDown = false; }

  async function fireWeapon() {
    const now = Date.now();
    if (destroyed || now - lastShot < 70 || reloading) return;
    const shooter = warState && warState.players[playerKey];
    if (!shooter || shooter.respawnAt > now || shooter.hp <= 0) return;
    const weapon = effectiveWeapon(shooter);
    if (now - lastShot < weapon.rate) return;
    if (shooter.ammo <= 0) { setStatus('Magazine empty. Press R to reload.'); return; }
    lastShot = now;
    let fired;
    try {
      fired = await mutatePlayer(current => {
        if (!current || current.ammo <= 0 || Date.now() - Number(current.lastShotAt || 0) < weapon.rate - 20) return current;
        return {...current,ammo:current.ammo-1,lastShotAt:Date.now(),lastSeen:Date.now()};
      });
    } catch (error) { setStatus(error.message,true); return; }
    if (!fired || fired.ammo !== shooter.ammo - 1) return;
    const origin = warState.players[playerKey];
    const angle = Math.atan2(aim.y-origin.y,aim.x-origin.x) + (Math.random()-.5)*weapon.spread;
    const end = {x:origin.x+Math.cos(angle)*weapon.range,y:origin.y+Math.sin(angle)*weapon.range};
    const target = closestTarget(origin,end);
    const baseHit = closestBase(origin,end);
    const impact = target && (!baseHit || target.distance < baseHit.distance) ? target : baseHit;
    traces.push({x1:origin.x,y1:origin.y,x2:impact ? impact.x : end.x,y2:impact ? impact.y : end.y,time:Date.now(),color:shooter.team === 'vortex' ? '#80b7ff' : '#ff8792'});
    try {
      if (weapon.radius && baseHit) {
        await raidBase(baseHit.team,Math.round(weapon.damage*.7),shooter.team);
        for (const enemy of Object.values(warState.players)) {
          if (enemy.team !== shooter.team && Math.hypot(enemy.x-baseHit.x,enemy.y-baseHit.y) < weapon.radius) await hitPlayer(enemy,Math.round(weapon.damage*.65),shooter);
        }
      } else if (impact && impact.target) {
        await hitPlayer(impact.target,weapon.damage,shooter);
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
      if (!player || player.team === origin.team || !player.online || player.hp <= 0 ||
          player.respawnAt > Date.now() || Date.now() - Number(player.lastSeen || 0) > 20000) continue;
      const hit = pointToSegment(player.x,player.y,origin.x,origin.y,end.x,end.y);
      if (hit.distance <= 15 && (!closest || hit.along < closest.distance)) closest = {target:player,distance:hit.along,x:hit.x,y:hit.y};
    }
    return closest;
  }

  function closestBase(origin,end) {
    let closest = null;
    for (const team of ['vortex','krypton']) {
      if (team === origin.team) continue;
      const x = team === 'vortex' ? 80 : 920;
      const hit = pointToSegment(x,280,origin.x,origin.y,end.x,end.y);
      if (hit.distance <= 45 && (!closest || hit.along < closest.distance)) closest = {team,distance:hit.along,x,y:280};
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
    await updateWar('players/' + targetKey,current => {
      killed=false;
      if (!current || current.team === attacker.team || current.hp <= 0 || current.respawnAt > Date.now()) return current;
      const hp = Math.max(0,Number(current.hp)-damage);
      killed = hp === 0;
      return {...current,hp,deaths:Number(current.deaths||0)+(killed?1:0),
        respawnAt:killed?Date.now()+5000:Number(current.respawnAt||0)};
    });
    if (killed) {
      await mutatePlayer(current => current ? {...current,kills:Number(current.kills||0)+1,lastSeen:Date.now()} : current);
      setStatus('Enemy eliminated. Respawning in five seconds.');
      try { await grantXp(100,'enemy eliminated'); }
      catch(error) { setStatus('Elimination counted, but XP could not be saved: '+error.message,true); }
    }
  }

  async function raidBase(team,damage,attackingTeam) {
    let raided = false;
    await updateWar('bases/' + team,base => {
      raided=false;
      if (!base || Number(base.destroyedUntil||0)>Date.now()) return base;
      if (Number(base.health)<=0) base={health:1200,destroyedUntil:0};
      const health=Math.max(0,Number(base.health)-damage);
      if (!health) { raided=true;return {health:0,destroyedUntil:Date.now()+30000}; }
      return {...base,health};
    });
    if (raided) {
      let transferred=0;
      await updateWar('economy/' + team,current => {
        const resources=Math.max(0,Number(current && current.resources||0));
        transferred=Math.min(100,resources);
        return {...(current||{}),resources:resources-transferred};
      });
      await updateWar('economy/' + attackingTeam,current =>
        ({...(current||{}),resources:Number(current && current.resources||0)+transferred})
      );
      setStatus('Enemy base breached! Their resources were raided.');
      try { await grantXp(75,'enemy vault raided'); }
      catch(error) { setStatus('Vault raid succeeded, but XP could not be saved: '+error.message,true); }
    } else setStatus('Enemy base hit.');
  }

  async function reloadWeapon() {
    const player = warState && warState.players[playerKey];
    if (!player || reloading) return;
    const weapon = effectiveWeapon(player);
    if (player.ammo >= weapon.mag) return;
    reloading = true;
    ui.reload.disabled = true;
    ui.reload.textContent = 'Reloading…';
    window.setTimeout(async () => {
      try {
        await mutatePlayer(current => current ? {...current,ammo:effectiveWeapon(current).mag,lastSeen:Date.now()} : current);
      } catch (error) { setStatus(error.message,true); }
      reloading=false;
      if (!destroyed) { ui.reload.disabled=false;ui.reload.textContent='Reload (R)'; }
    },weapon.reload);
  }

  async function captureOrRaid() {
    if (captureBusy || !warState) return;
    const player=warState.players[playerKey];
    if (!player) return;
    const nearest=Object.entries(nodePositions).map(([id,node])=>({id,node,distance:Math.hypot(node.x-player.x,node.y-player.y)}))
      .sort((a,b)=>a.distance-b.distance)[0];
    if (nearest && nearest.distance < 62) {
      const current=warState.nodes[nearest.id];
      if (current.team===playerTeam) { setStatus('Your team already controls this resource site.');return; }
      captureBusy=true;
      try {
        let captured=false;
        const updated=await updateWar('nodes/' + nearest.id,node => {
          captured=false;
          if (node && node.team===playerTeam) return node;
          captured=true;
          return {team:playerTeam,owner:playerName,capturedAt:Date.now()};
        });
        if (captured && updated.team===playerTeam && updated.owner===playerName) {
          await updateWar('economy/' + playerTeam,economy=>({...economy,resources:Number(economy && economy.resources||0)+40}));
          setStatus('Resource site captured for ' + teamLabel(playerTeam) + '. +40 team resources.');
          try { await grantXp(75,'resource relay captured'); }
          catch(error) { setStatus('Relay secured, but XP could not be saved: '+error.message,true); }
        } else setStatus('Your team already secured that site.');
      } catch (error) { setStatus(error.message,true); }
      captureBusy=false;
      return;
    }
    const enemyBaseX=playerTeam==='vortex'?920:80;
    if (Math.abs(player.x-enemyBaseX)<70 && Math.abs(player.y-280)<80) {
      try { await raidBase(playerTeam==='vortex'?'krypton':'vortex',45,playerTeam); }
      catch(error) { setStatus(error.message,true); }
      return;
    }
    setStatus('Move beside a resource site and press E to capture it.');
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
    for (const team of ['vortex','krypton']) {
      const base=warState.bases[team];
      if (base && Number(base.health)<=0 && Number(base.destroyedUntil||0)<=now) {
        await updateWar('bases/'+team,current=>
          Number(current && current.destroyedUntil||0)<=now && Number(current && current.health)<=0
            ? {health:1200,destroyedUntil:0} : current
        );
      }
    }
    if (firebaseMode) {
      const clockRef=warRef.child('economyClock');
      const claim=await clockRef.transaction(last=>Number(last||0)<=now-10000?now:last);
      if (!claim.committed || Number(claim.snapshot.val())!==now) return;
    } else {
      if (now-Number(warState.economyClock||0)<10000) return;
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
      const changing=previous && (previous.weapon!==weaponId ||
        JSON.stringify(previous.attachments||[])!==JSON.stringify(chosen));
      if (changing && previous && previous.loadoutSet) {
        let charged=false;
        await updateWar('economy/' + playerTeam,current=>{
          charged=Number(current && current.resources||0)>=20;
          return charged?{...(current||{}),resources:Number(current.resources)-20}:current;
        });
        if (!charged) throw new Error('Your team needs 20 resources to change a field loadout.');
      }
      await mutatePlayer(player=>({...player,weapon:weaponId,attachments:chosen,loadoutSet:true,
        ammo:effectiveWeapon({...player,weapon:weaponId,attachments:chosen}).mag}));
      refreshProgressUi();
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
    if (button.dataset.warAction==='capture') captureOrRaid();
    if (button.dataset.warAction==='reload') reloadWeapon();
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
    setStatus('Connected · ' + teamLabel(playerTeam) + ' · WASD to move, mouse to aim/fire, E to capture, R to reload.');
    refreshProgressUi();
    draw();
  }

  function nexusUrl() {
    const url=new URL('./nexus.html',location.href);
    if (lanMode) url.searchParams.set('lan','1');
    return url.href;
  }

  function buildUi() {
    container.innerHTML='<div class="nexus-war-heading"><div><span>'+(firebaseMode||lanMode?'LIVE MULTIPLAYER':'LOCAL PRACTICE')+'</span><h2>nexus:dropzone</h2></div><div class="nexus-war-reset" data-war-reset>Weekly wipe pending</div></div>' +
      '<p class="nexus-war-description">Capture resource relays, raid the enemy vault, and defend your team’s supply line. Your level and purchased attachments persist; your war loadout and record reset every Monday at 00:00 UTC.</p>' +
      '<a class="nexus-button nexus-war-home" href="'+nexusUrl()+'">Back to Nexus</a>' +
      '<div class="nexus-war-status" data-war-status role="status" aria-live="polite">Connecting to the frontline…</div>' +
      '<div class="nexus-war-progression" data-war-progression></div><div class="nexus-war-wallet" data-war-wallet></div>' +
      '<div class="nexus-war-stats" data-war-stats></div>' +
      '<canvas class="nexus-war-canvas" width="1000" height="560" aria-label="Top-down 2D multiplayer war arena"></canvas>' +
      '<div class="nexus-war-controls"><span><kbd>W A S D</kbd> Move</span><span><kbd>Mouse</kbd> Aim + fire</span><span><kbd>E</kbd> Capture / raid</span><span><kbd>R</kbd> Reload</span><button class="nexus-button secondary" type="button" data-war-action="capture">Capture nearby</button><button class="nexus-button secondary" type="button" data-war-action="reload">Reload</button></div>' +
      '<div class="nexus-war-touch"><div class="nexus-war-pad"><button type="button" data-war-move="up" aria-label="Move up">▲</button><button type="button" data-war-move="left" aria-label="Move left">◀</button><button type="button" data-war-move="down" aria-label="Move down">▼</button><button type="button" data-war-move="right" aria-label="Move right">▶</button></div><button type="button" class="nexus-war-fire" data-war-fire>Fire</button></div>' +
      '<form class="nexus-war-loadout"><label>Weapon<select data-war-weapon></select></label><label>Attachment 1<select data-war-attachment="1"></select></label><label>Attachment 2<select data-war-attachment="2"></select></label><button class="nexus-button" type="submit">Equip loadout</button></form>' +
      '<section class="nexus-war-attachment-shop"><h3>Attachment shop</h3><p>Buy permanent upgrades with your Nexus Sektorium.</p><div data-war-attachment-shop></div></section>' +
      '<div class="nexus-war-arsenal"><strong>Arsenal</strong><span>Two assault rifles · two SMGs · two snipers · RPG-4 · Xenophage</span><small>Weapons unlock at levels 1–55. Eliminations earn 100 XP; new relay captures earn 75 XP. Changing an established loadout costs 20 team resources.</small></div>';
    ui={
      canvas:container.querySelector('.nexus-war-canvas'),
      status:container.querySelector('[data-war-status]'),
      stats:container.querySelector('[data-war-stats]'),
      reset:container.querySelector('[data-war-reset]'),
      progress:container.querySelector('[data-war-progression]'),
      wallet:container.querySelector('[data-war-wallet]'),
      attachmentShop:container.querySelector('[data-war-attachment-shop]'),
      form:container.querySelector('.nexus-war-loadout'),
      weapon:container.querySelector('[data-war-weapon]'),
      attachment1:container.querySelector('[data-war-attachment="1"]'),
      attachment2:container.querySelector('[data-war-attachment="2"]'),
      reload:container.querySelector('[data-war-action="reload"]')
    };
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
    if (container) {
      container.removeEventListener('pointerdown',onControlPointerDown);
      container.removeEventListener('pointerup',onControlPointerUp);
      container.removeEventListener('pointercancel',onControlPointerUp);
      container.removeEventListener('pointerleave',onControlPointerUp);
    }
    animation=0;
    incomeTimer=0;
    heartbeatTimer=0;
    refreshTimer=0;
    warRef=null;container=null;ui=null;warState=null;
    keys.clear();
  }

  const content=document.getElementById('content');
  const observer=new MutationObserver(()=>{
    const target=content.querySelector('[data-nexus-war]');
    if (target) mount(target);
    else if (container) cleanup();
  });
  observer.observe(content,{childList:true,subtree:true});
  const existing=content.querySelector('[data-nexus-war]');
  if (existing) mount(existing);
})();
