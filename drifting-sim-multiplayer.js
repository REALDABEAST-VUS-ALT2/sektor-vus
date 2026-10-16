const frame = document.getElementById('gameFrame');
const worldLabel = document.getElementById('worldLabel');
const roomInput = document.getElementById('roomCode');
const connectButton = document.getElementById('connectButton');
const trackSelect = document.getElementById('trackSelect');
const modeScreen = document.getElementById('modeScreen');
const modeHint = document.getElementById('modeHint');
const modeStatus = document.getElementById('modeStatus');
const playersPanel = document.getElementById('onlinePanel');
const musicPanel = document.getElementById('musicPanel');
const togglePlayersButton = document.getElementById('togglePlayers');
const toggleMusicButton = document.getElementById('toggleMusic');
const connectionStatus = document.getElementById('connectionStatus');
const connectionDot = document.getElementById('connectionDot');
const accountName = document.getElementById('accountName');
const playerList = document.getElementById('playerList');
const songFilesInput = document.getElementById('songFiles');
const songCount = document.getElementById('songCount');
const currentSong = document.getElementById('currentSong');
const playlist = document.getElementById('playlist');
const audio = document.getElementById('musicPlayer');
const songs = [];
const remotePlayers = new Map();
const playerColors = ['#cdf36a', '#73d5d0', '#ff8d70', '#b19cff', '#ffca70', '#f478ad'];
const carNamesByLetter = {
  a: 'Sektor Viper',
  b: 'Nexus Phantom',
  c: 'Tokyo Comet',
  d: 'Sektor Spectre',
  e: 'Nexus Apex',
  f: 'Tokyo Tempest',
  g: 'Sektor Nova',
  h: 'Nexus Rift',
  i: 'Tokyo Mistral',
};
const trackVariants = {
  forest: { label: 'Forest Run', map: 'forest', theme: 'sektor' },
  desert: { label: 'Desert Drift', map: 'desert', theme: 'sektor' },
  tokyo: { label: 'Tokyo Circuit', map: 'tokyo', theme: 'sektor' },
  'nexus-afterdark': { label: 'Nexus Afterdark', map: 'tokyo', theme: 'nexus' },
  'nexus-greenline': { label: 'Nexus Greenline', map: 'forest', theme: 'nexus' },
  'sektor-foundry': { label: 'Sektor Foundry', map: 'desert', theme: 'sektor' },
};

let socket = null;
let signedInUser = readSession();
let localSlot = 0;
let activeRoom = 'drift-sim-6';
let roomHostId = null;
let roomOrder = [];
let activeTrackId = 'forest';
let gameMode = 'race';
let modeRunId = '';
let observedModeRunId = '';
let modeStartPending = false;
let chaseHoldStartedAt = 0;
let stageTarget = null;
let colliderTarget = null;
let vm = null;
let currentSongIndex = -1;
let nextRoomSync = 0;

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem('vusServersSession') || 'null');
    return session && typeof session.key === 'string' && typeof session.username === 'string' ? session : null;
  } catch (error) {
    return null;
  }
}

function setStatus(message, online = false) {
  connectionStatus.textContent = message;
  connectionDot.classList.toggle('online', online);
}

function togglePanel(panel, button) {
  const open = panel.hidden;
  panel.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  button.title = `${open ? 'Hide' : 'Show'} ${button.id === 'togglePlayers' ? 'multiplayer panel' : 'music player'}`;
}

function startNativeGame() {
  if (!waitForGameRuntime()) return false;
  vm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'enter game' });
  return true;
}

function startMode(mode, broadcast = true) {
  if (socket?.readyState === WebSocket.OPEN && roomHostId && roomHostId !== signedInUser?.key) {
    modeHint.textContent = 'The room host chooses the game mode.';
    return;
  }
  gameMode = mode === 'chase' ? 'chase' : 'race';
  modeRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  chaseHoldStartedAt = 0;
  if (!startNativeGame()) {
    modeHint.textContent = 'Loading the game…';
    return;
  }
  observedModeRunId = modeRunId;
  modeStartPending = true;
  modeScreen.hidden = true;
  modeHint.textContent = gameMode === 'race' ? 'Race started' : 'Chase started';
  modeStatus.textContent = gameMode === 'race' ? 'RACE · 2 LAPS' : 'CHASE · TAG THE RUNNER';
  if (broadcast && socket?.readyState === WebSocket.OPEN) sendState(performance.now(), true);
}

function updateModeScreen() {
  const inMenu = variable(stageTarget, 'IN MENU');
  if (modeStartPending && inMenu === false) modeStartPending = false;
  if (!modeStartPending && typeof inMenu === 'boolean') modeScreen.hidden = !inMenu;
}

function formatRaceTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function updateModeStatus(timestamp) {
  const local = localState();
  if (!local) return;
  if (gameMode === 'race') {
    const lap = Math.min(Math.max(1, Number(local.lap) || 1), 2);
    modeStatus.textContent = `RACE · LAP ${lap}/2 · ${formatRaceTime(local.timer)}`;
    return;
  }

  if (roomOrder.length < 2) {
    modeStatus.textContent = 'CHASE · Connect another driver to start a pursuit';
    return;
  }

  const target = roomHostId === signedInUser?.key
    ? [...remotePlayers.values()].map((player) => player.state).find((state) => state && Number.isFinite(Number(state.x)))
    : remotePlayers.get(roomHostId)?.state;
  if (!target) {
    modeStatus.textContent = roomHostId === signedInUser?.key ? 'CHASE · You are the runner' : 'CHASE · Find the runner';
    return;
  }

  const gap = Math.hypot(local.x - Number(target.x), local.y - Number(target.y));
  const closeEnough = gap < 92;
  if (closeEnough) {
    if (!chaseHoldStartedAt) chaseHoldStartedAt = timestamp;
    const caught = timestamp - chaseHoldStartedAt >= 1500;
    modeStatus.textContent = caught
      ? `CHASE · TAG COMPLETE · ${Math.round(gap)}m`
      : `CHASE · ${roomHostId === signedInUser?.key ? 'EVADE' : 'CLOSING'} · ${Math.round(gap)}m`;
  } else {
    chaseHoldStartedAt = 0;
    modeStatus.textContent = `CHASE · ${roomHostId === signedInUser?.key ? 'RUNNER' : 'PURSUIT'} · GAP ${Math.round(gap)}m`;
  }
}

function setStageVariable(name, value) {
  if (!stageTarget) return false;
  const entry = Object.values(stageTarget.variables || {}).find((item) => item.name === name);
  if (!entry) return false;
  entry.value = value;
  return true;
}

function applyTrack(trackId, switchNativeMap = false) {
  const track = trackVariants[trackId] || trackVariants.forest;
  activeTrackId = trackId in trackVariants ? trackId : 'forest';
  trackSelect.value = activeTrackId;
  const selectedTheme = track.theme;
  document.documentElement.dataset.worldTheme = selectedTheme;
  document.documentElement.dataset.trackVariant = activeTrackId;
  try {
    const canvases = frame.contentDocument.querySelectorAll('#app canvas');
    canvases.forEach((canvas) => {
      canvas.style.filter = selectedTheme === 'nexus'
        ? 'hue-rotate(138deg) saturate(1.65) brightness(.82) contrast(1.15)'
        : 'saturate(1.15) brightness(.86) contrast(1.18)';
    });
  } catch (error) {
    // The wrapper theme still updates if the packaged runtime does not expose a master gain.
  }
  if (switchNativeMap && setStageVariable('MAP', track.map)) {
    vm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'map select' });
  }
  updateWorldLabel();
}

function updateWorldLabel() {
  const map = String(variable(stageTarget, 'MAP') || 'forest').toUpperCase();
  const track = trackVariants[activeTrackId];
  const label = track && track.map.toUpperCase() === map ? track.label.toUpperCase() : `${map} STAGE`;
  if (worldLabel.textContent !== label) worldLabel.textContent = label;
}

function syncTrackFromNativeGame() {
  const map = String(variable(stageTarget, 'MAP') || 'forest').toLowerCase();
  const match = Object.entries(trackVariants).find(([, track]) => track.map === map && track.theme === 'sektor');
  applyTrack(match?.[0] || 'forest');
}

function updateWorldThemeAccess() {
  const connected = socket && socket.readyState === WebSocket.OPEN;
  trackSelect.disabled = !!(connected && roomHostId !== signedInUser?.key);
}

function getMultiplayerUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const codespacesHost = host.match(/^(.*)-\d+\.app\.github\.dev$/);
  if (codespacesHost) return `${protocol}//${codespacesHost[1]}-3000.app.github.dev`;
  return `${protocol}//${host || 'localhost'}:3000`;
}

function variable(target, name) {
  if (!target || !target.variables) return null;
  const found = Object.values(target.variables).find((item) => item.name === name);
  return found ? found.value : null;
}

function findTarget(name) {
  return vm?.runtime?.targets?.find((target) => target.sprite?.name === name && target.isOriginal) || null;
}

function waitForGameRuntime() {
  try {
    vm = frame.contentWindow.vm;
    stageTarget = vm?.runtime?.getTargetForStage?.() || vm?.runtime?.targets?.find((target) => target.isStage) || null;
    colliderTarget = findTarget('player collider');
    if (vm && stageTarget && colliderTarget) return true;
  } catch (error) {
    return false;
  }
  return false;
}

function getSelectedCarName() {
  if (!waitForGameRuntime()) return 'In game menu';
  const letter = String(variable(stageTarget, 'CAR LETTER') || 'a').toLowerCase();
  return carNamesByLetter[letter] || 'Drift car';
}

function carCostumeIndex(letter, layer) {
  const letterIndex = 'abcdefghi'.indexOf(String(letter || 'a').toLowerCase());
  return 1 + Math.max(0, letterIndex) * 6 + layer;
}

function createRemoteCarClones(player) {
  if (!waitForGameRuntime()) return false;
  const template = findTarget('player render car');
  if (!template) return false;
  const runtime = vm.runtime;
  player.carClones = [];
  for (let layer = 0; layer < 6; layer += 1) {
    const clone = template.makeClone();
    if (!clone) break;
    runtime.addTarget(clone);
    clone.visible = true;
    clone.setCostume(carCostumeIndex(player.state.carLetter, layer));
    clone.updateAllDrawableProperties();
    player.carClones.push(clone);
  }
  if (player.carClones.length !== 6) {
    removeRemoteCarClones(player);
    return false;
  }
  return true;
}

function removeRemoteCarClones(player) {
  for (const clone of player.carClones || []) vm?.runtime?.disposeTarget(clone);
  player.carClones = [];
}

function removeAllRemoteCarClones() {
  for (const player of remotePlayers.values()) removeRemoteCarClones(player);
}

function updateRemoteCarClones() {
  if (!waitForGameRuntime()) return;
  const cameraX = Number(variable(stageTarget, 'CAM X')) || 0;
  const cameraY = Number(variable(stageTarget, 'CAM Y')) || 0;
  for (const player of remotePlayers.values()) {
    const state = player.state;
    if (!state || !Number.isFinite(Number(state.x)) || !Number.isFinite(Number(state.y))) continue;
    if (!player.carClones?.length && !createRemoteCarClones(player)) continue;
    const x = Number(state.x) - cameraX;
    const y = cameraY - Number(state.y);
    const direction = 90 - (Number(state.angle) || 0) * 180 / Math.PI;
    player.carClones.forEach((clone, layer) => {
      const costume = carCostumeIndex(state.carLetter, layer);
      if (clone.currentCostume !== costume) clone.setCostume(costume);
      clone.x = x;
      clone.y = y;
      clone.direction = direction;
      clone.visible = true;
      clone.updateAllDrawableProperties();
    });
  }
}

function colorForPlayer(playerId) {
  const hash = Array.from(String(playerId)).reduce((value, char) => value + char.charCodeAt(0), 0);
  return playerColors[hash % playerColors.length];
}

function localState() {
  if (!waitForGameRuntime()) return null;
  const x = Number(variable(colliderTarget, 'x'));
  const y = Number(variable(colliderTarget, 'y'));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const vx = Number(variable(colliderTarget, 'x vel')) || 0;
  const vy = Number(variable(colliderTarget, 'y vel')) || 0;
  return {
    x,
    y,
    vx,
    vy,
    angle: Number(variable(colliderTarget, 'turn')) || Math.atan2(vy, vx),
    speed: Number(variable(colliderTarget, 'speed')) || Math.hypot(vx, vy),
    map: String(variable(stageTarget, 'MAP') ?? ''),
    carLetter: String(variable(stageTarget, 'CAR LETTER') || 'a').toLowerCase(),
    carName: getSelectedCarName(),
    lap: Number(variable(colliderTarget, 'Lap number')) || 1,
    timer: Number(variable(stageTarget, 'TIMER')) || 0,
  };
}

function connect() {
  signedInUser = readSession();
  if (!signedInUser) {
    const returnUrl = new URL('./VUS-Servers.html', window.location.href);
    returnUrl.searchParams.set('returnTo', 'drift-sim');
    window.location.href = returnUrl.href;
    return;
  }

  const room = roomInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  if (!room) {
    setStatus('Enter a room name first.');
    return;
  }
  activeRoom = room;
  if (socket) socket.close();
  removeAllRemoteCarClones();
  remotePlayers.clear();
  renderPlayers();

  socket = new WebSocket(getMultiplayerUrl());
  setStatus('Connecting to multiplayer…');
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({
      type: 'join',
      room,
      id: signedInUser.key,
      name: signedInUser.username,
      color: colorForPlayer(signedInUser.key),
      carName: getSelectedCarName(),
      trackId: activeTrackId,
    }));
    setStatus(`Joining ${room}…`);
    connectButton.textContent = 'Disconnect';
  });

  socket.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      return;
    }

    if (message.type === 'room-sync') {
      const players = message.players || [];
      localSlot = Math.max(0, players.findIndex((player) => player.id === signedInUser.key));
      roomOrder = players.map((player) => player.id);
      roomHostId = roomOrder[0] || signedInUser.key;
      updateWorldThemeAccess();
      const host = players.find((player) => player.id === roomHostId);
      if (host?.trackId in trackVariants) applyTrack(host.trackId, true);
      removeAllRemoteCarClones();
      remotePlayers.clear();
      players.forEach((player, index) => {
        if (player.id === signedInUser.key) return;
        remotePlayers.set(player.id, {
          id: player.id,
          name: player.name,
          color: player.color || colorForPlayer(player.id),
          carName: player.carName || 'Selecting car',
        });
      });
      setStatus(`Online as @${signedInUser.username} · ${players.length} driver${players.length === 1 ? '' : 's'}`, true);
      renderPlayers();
    }

    if (message.type === 'player-update' && message.id !== signedInUser.key) {
      let remote = remotePlayers.get(message.id);
      if (!remote) {
        remote = { id: message.id, name: message.state?.name || 'Driver', color: colorForPlayer(message.id), carName: 'Selecting car' };
        remotePlayers.set(message.id, remote);
      }
      remote.name = message.state?.name || remote.name;
      remote.carName = message.state?.carName || remote.carName;
      remote.state = message.state;
      if (message.id === roomHostId && message.state?.modeRunId && message.state.modeRunId !== observedModeRunId) {
        observedModeRunId = message.state.modeRunId;
        gameMode = message.state.gameMode === 'chase' ? 'chase' : 'race';
        modeStartPending = true;
        modeScreen.hidden = true;
        startNativeGame();
      }
      if (message.id === roomHostId && trackVariants[message.state?.trackId]) {
        applyTrack(message.state.trackId, true);
      }
      renderPlayers();
    }

    if (message.type === 'player-left') {
      const leavingPlayer = remotePlayers.get(message.id);
      if (leavingPlayer) removeRemoteCarClones(leavingPlayer);
      remotePlayers.delete(message.id);
      roomOrder = roomOrder.filter((id) => id !== message.id);
      roomHostId = roomOrder[0] || signedInUser.key;
      updateWorldThemeAccess();
      renderPlayers();
    }
  });

  socket.addEventListener('close', () => {
    removeAllRemoteCarClones();
    remotePlayers.clear();
    roomOrder = [];
    roomHostId = null;
    updateWorldThemeAccess();
    renderPlayers();
    setStatus('Disconnected · offline practice remains available.');
    connectButton.textContent = 'Connect';
  });

  socket.addEventListener('error', () => setStatus('Could not connect. Check that the multiplayer server is running.'));
}

function disconnect() {
  if (socket) socket.close();
  socket = null;
  connectButton.textContent = 'Connect';
}

function renderPlayers() {
  playerList.replaceChildren();
  const ownRow = document.createElement('div');
  ownRow.className = 'player-row';
  ownRow.innerHTML = `<span class="player-swatch" style="background:${colorForPlayer(signedInUser?.key)}"></span><span>@${escapeHtml(signedInUser?.username || 'Guest')} (you)</span><small class="player-car-name">${escapeHtml(getSelectedCarName())}</small>`;
  playerList.append(ownRow);

  for (const player of remotePlayers.values()) {
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `<span class="player-swatch" style="background:${player.color}"></span><span>@${escapeHtml(player.name)}</span><small class="player-car-name">${escapeHtml(player.carName || 'Selecting car')}</small>`;
    playerList.append(row);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function sendState(timestamp, force = false) {
  if (!socket || socket.readyState !== WebSocket.OPEN || (!force && timestamp < nextRoomSync)) return;
  const state = localState();
  if (!state) return;
  nextRoomSync = timestamp + 70;
  socket.send(JSON.stringify({
    type: 'state',
    room: activeRoom,
    state: {
      ...state,
      name: signedInUser.username,
      slot: localSlot,
      carColor: colorForPlayer(signedInUser.key),
      carName: state.carName,
      trackId: activeTrackId,
      gameMode,
      modeRunId,
    },
  }));
}

function syncMultiplayer(timestamp) {
  updateWorldLabel();
  updateModeScreen();
  updateModeStatus(timestamp);
  const selectedCarName = getSelectedCarName();
  if (playerList.querySelector('.player-car-name')?.textContent !== selectedCarName) renderPlayers();
  sendState(timestamp);
  updateRemoteCarClones();
  requestAnimationFrame(syncMultiplayer);
}

function addSongs(files) {
  for (const file of files) {
    if (!file.type.startsWith('audio/')) continue;
    songs.push({ name: file.name, url: URL.createObjectURL(file) });
  }
  renderPlaylist();
  if (currentSongIndex < 0 && songs.length) playSong(0);
}

async function loadBuiltInSongs() {
  try {
    const response = await fetch('./rally-songs.json');
    if (!response.ok) throw new Error('Playlist request failed.');
    const tracks = await response.json();
    songs.push(...tracks.map((track) => ({ name: track.name, url: track.url, bundled: true })));
    renderPlaylist();
    currentSong.textContent = songs.length ? 'Choose a song to play' : 'No songs found in rally songs/';
    if (songs.length) playSong(0);
  } catch (error) {
    currentSong.textContent = 'Could not load rally songs. Use Add songs to choose files.';
  }
}

function renderPlaylist() {
  playlist.replaceChildren();
  songs.forEach((song, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = index === currentSongIndex ? 'active' : '';
    button.textContent = song.name;
    button.title = song.name;
    button.addEventListener('click', () => playSong(index));
    playlist.append(button);
  });
  songCount.textContent = songs.length ? `${songs.length} track${songs.length === 1 ? '' : 's'}` : 'No added tracks';
}

function playSong(index) {
  if (!songs.length) return;
  currentSongIndex = (index + songs.length) % songs.length;
  audio.src = songs[currentSongIndex].url;
  audio.play().then(() => setScratchAudioMuted(true)).catch(() => {
    currentSong.textContent = `${songs[currentSongIndex].name} · press play if autoplay is blocked`;
  });
  currentSong.textContent = songs[currentSongIndex].name;
  renderPlaylist();
}

function setScratchAudioMuted(muted) {
  try {
    const engine = frame.contentWindow.vm?.runtime?.audioEngine;
    if (engine?.inputNode?.gain) engine.inputNode.gain.value = muted ? 0 : 1;
  } catch (error) {
    // The game audio remains unchanged if the packaged runtime does not expose a master gain.
  }
}

function toggleSong() {
  if (!songs.length) {
    songFilesInput.click();
    return;
  }
  if (audio.paused) {
    if (!audio.src) playSong(0);
    else audio.play().then(() => setScratchAudioMuted(true)).catch(() => {});
  } else {
    audio.pause();
  }
}

togglePlayersButton.addEventListener('click', () => togglePanel(playersPanel, togglePlayersButton));
toggleMusicButton.addEventListener('click', () => togglePanel(musicPanel, toggleMusicButton));
modeScreen.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => startMode(button.dataset.mode));
});
connectButton.addEventListener('click', () => {
  if (socket && socket.readyState < WebSocket.CLOSING) disconnect();
  else connect();
});
trackSelect.addEventListener('change', () => {
  if (socket?.readyState === WebSocket.OPEN && roomHostId !== signedInUser?.key) return;
  applyTrack(trackSelect.value, true);
});
songFilesInput.addEventListener('change', (event) => addSongs(Array.from(event.target.files || [])));
document.getElementById('previousSong').addEventListener('click', () => playSong(currentSongIndex - 1));
document.getElementById('nextSong').addEventListener('click', () => playSong(currentSongIndex + 1));
document.getElementById('playSong').addEventListener('click', toggleSong);
audio.addEventListener('ended', () => playSong(currentSongIndex + 1));
frame.addEventListener('load', () => {
  accountName.textContent = signedInUser ? `Signed in as @${signedInUser.username}` : 'Sign in for online play';
  setScratchAudioMuted(true);
  syncTrackFromNativeGame();
  setTimeout(() => {
    setScratchAudioMuted(true);
    syncTrackFromNativeGame();
  }, 600);
});
window.addEventListener('beforeunload', () => songs.forEach((song) => URL.revokeObjectURL(song.url)));
accountName.textContent = signedInUser ? `Signed in as @${signedInUser.username}` : 'Sign in for online play';
loadBuiltInSongs();
setScratchAudioMuted(true);
syncTrackFromNativeGame();
renderPlayers();
requestAnimationFrame(syncMultiplayer);
