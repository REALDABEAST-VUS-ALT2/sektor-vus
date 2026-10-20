const frame = document.getElementById('gameFrame');
const playerTwoFrame = document.getElementById('playerTwoFrame');
const simShell = document.querySelector('.sim-shell');
const worldLabel = document.getElementById('worldLabel');
const roomInput = document.getElementById('roomCode');
const connectButton = document.getElementById('connectButton');
const trackSelect = document.getElementById('trackSelect');
const modeTrackSelect = document.getElementById('modeTrackSelect');
const carSelect = document.getElementById('carSelect');
const modeCarSelect = document.getElementById('modeCarSelect');
const modeScreen = document.getElementById('modeScreen');
const menuBackdrop = document.getElementById('menuBackdrop');
const playTypeStep = document.getElementById('playTypeStep');
const multiplayerStep = document.getElementById('multiplayerStep');
const setupStep = document.getElementById('setupStep');
const returnToMainMenuButton = document.getElementById('returnToMainMenu');
const offlineChaseHud = document.getElementById('offlineChaseHud');
const offlineChaseStatus = document.getElementById('offlineChaseStatus');
const disconnectRoomButton = document.getElementById('disconnectRoomButton');
const modeHint = document.getElementById('modeHint');
const modeStatus = document.getElementById('modeStatus');
const playersPanel = document.getElementById('onlinePanel');
const musicPanel = document.getElementById('musicPanel');
const togglePlayersButton = document.getElementById('togglePlayers');
const toggleMusicButton = document.getElementById('toggleMusic');
const connectionStatus = document.getElementById('connectionStatus');
const onlineStatus = document.getElementById('onlineStatus');
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
  a: 'Cobra',
  b: 'Tofu',
  c: 'Mustang',
  d: 'Hornet',
  e: 'Lynx',
  f: 'Rocket',
  g: 'Buster',
  h: 'Hot Rod',
  i: 'Max',
};
const trackVariants = {
  forest: { label: 'Forest Run', map: 'forest', theme: 'sektor' },
  desert: { label: 'Desert Drift', map: 'desert', theme: 'sektor' },
  tokyo: { label: 'Tokyo Circuit', map: 'tokyo', theme: 'sektor' },
  'cobra-circuit': { label: 'Cobra Circuit', map: 'cobra-circuit', theme: 'sektor' },
};

let socket = null;
let firebaseTransport = false;
let firebasePlayerRef = null;
let firebasePlayersRef = null;
let firebasePlayersHandler = null;
let signedInUser = readSession();
let localSlot = 0;
let activeRoom = 'drift-sim-6';
let roomHostId = null;
let roomOrder = [];
let activeTrackId = 'forest';
let activeCarLetter = 'a';
let selectedPlayType = null;
let gameMode = 'race';
let modeRunId = '';
let observedModeRunId = '';
let modeStartPending = false;
let modeStartSent = false;
let chaseHoldStartedAt = 0;
let stageTarget = null;
let colliderTarget = null;
let vm = null;
let playerTwoVm = null;
let playerTwoStage = null;
let playerTwoCollider = null;
let playerTwoLoading = false;
let playerTwoReady = false;
let playerTwoFailed = false;
let playerTwoSpawnAdjusted = false;
let primaryOfflineOpponentClones = [];
let playerTwoOfflineOpponentClones = [];
let originalKeyboardGetKeyIsDown = null;
let cobraTrackRegistered = false;
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

function guestSession() {
  let id = '';
  try {
    id = sessionStorage.getItem('driftSimGuestId') || '';
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 14);
      sessionStorage.setItem('driftSimGuestId', id);
    }
  } catch (error) {
    id = Math.random().toString(36).slice(2, 14);
  }
  return { key: `guest-${id}`, username: `Guest ${id.slice(0, 5)}` };
}

function setStatus(message, online = false) {
  connectionStatus.textContent = message;
  onlineStatus.textContent = message;
  connectionDot.classList.toggle('online', online);
}

function togglePanel(panel, button) {
  const open = panel.hidden;
  panel.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
  button.title = `${open ? 'Hide' : 'Show'} ${button.id === 'togglePlayers' ? 'multiplayer panel' : 'music player'}`;
}

function showPlayTypeStep() {
  playTypeStep.hidden = false;
  multiplayerStep.hidden = true;
  setupStep.hidden = true;
}

function showMultiplayerStep() {
  playTypeStep.hidden = true;
  multiplayerStep.hidden = false;
  setupStep.hidden = true;
  connectButton.textContent = isMultiplayerConnected() ? 'Disconnect' : 'Connect';
}

function showSetupStep() {
  playTypeStep.hidden = true;
  multiplayerStep.hidden = true;
  setupStep.hidden = false;
  disconnectRoomButton.hidden = !isMultiplayerConnected();
}

function chooseOffline() {
  selectedPlayType = 'offline';
  if (isMultiplayerConnected()) disconnect();
  setStatus('Offline practice · no room connected.');
  showSetupStep();
}

function chooseMultiplayer() {
  selectedPlayType = 'multiplayer';
  if (isMultiplayerConnected()) showSetupStep();
  else showMultiplayerStep();
}

function returnToNativeMenu() {
  if (!waitForGameRuntime()) return;
  selectedPlayType = null;
  modeStartPending = false;
  modeStartSent = false;
  clearOfflineChasePlayer2();
  vm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'menu' });
}

function startNativeGame() {
  if (selectedPlayType === 'offline' && gameMode === 'chase' && !playerTwoReady) {
    if (!playerTwoFailed) startOfflineChasePlayer2();
    return false;
  }
  if (!waitForGameRuntime()) return false;
  prepareSelectedCar();
  vm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'enter game' });
  return true;
}

function prepareSelectedCar() {
  const selectedLetter = String(modeCarSelect.value || activeCarLetter || 'a').toLowerCase();
  activeCarLetter = carNamesByLetter[selectedLetter] ? selectedLetter : 'a';
  const carNumber = 'abcdefghi'.indexOf(activeCarLetter) + 1;
  carSelect.value = activeCarLetter;
  modeCarSelect.value = activeCarLetter;
  setStageVariable('car number', carNumber);
  setStageVariable('CAR LETTER', activeCarLetter);
}

function resumeScratchAudio() {
  try {
    const context = frame.contentWindow.vm?.runtime?.audioEngine?.audioContext;
    if (context?.state === 'suspended') context.resume().catch(() => {});
  } catch {}
}

function focusPrimaryGame() {
  try {
    frame.focus();
    frame.contentWindow.focus();
  } catch {}
}

function startMode(mode, broadcast = true) {
  if (isMultiplayerConnected() && roomHostId && roomHostId !== signedInUser?.key) {
    modeHint.textContent = 'The room host chooses the game mode.';
    return;
  }
  gameMode = mode === 'chase' ? 'chase' : 'race';
  clearOfflineChasePlayer2();
  playerTwoSpawnAdjusted = false;
  const splitScreen = selectedPlayType === 'offline' && gameMode === 'chase';
  simShell.classList.toggle('offline-split', splitScreen);
  modeRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  chaseHoldStartedAt = 0;
  observedModeRunId = modeRunId;
  modeStartPending = true;
  modeStartSent = startNativeGame();
  focusPrimaryGame();
  modeHint.textContent = modeStartSent
    ? 'Starting race…'
    : splitScreen ? 'Loading Player 2 before the chase starts…' : 'Loading the game…';
  modeStatus.textContent = gameMode === 'race' ? 'RACE · 2 LAPS' : 'CHASE · TAG THE RUNNER';
  if (broadcast && isMultiplayerConnected()) sendState(performance.now(), true);
}

function updateModeScreen() {
  const menuValue = variable(stageTarget, 'IN MENU');
  if (menuValue === null) return;
  const inMenu = menuValue === true || String(menuValue).toLowerCase() === 'true';
  if (modeStartPending && !inMenu) {
    if (modeStartSent && selectedPlayType === 'offline' && gameMode === 'chase') {
      removeFloorItOverlayClones(vm);
    }
    if (modeStartSent) modeHint.textContent = gameMode === 'race' ? 'Race started' : 'Chase started';
    modeStartPending = false;
    modeStartSent = false;
  }
  if (modeStartPending && inMenu && !modeStartSent) modeStartSent = startNativeGame();
  if (!modeStartPending) {
    modeScreen.hidden = !inMenu;
    menuBackdrop.hidden = !inMenu;
    returnToMainMenuButton.hidden = inMenu;
    offlineChaseHud.hidden = inMenu || selectedPlayType !== 'offline' || gameMode !== 'chase';
    if (inMenu) clearOfflineChasePlayer2();
    if (inMenu) {
      if (!selectedPlayType) showPlayTypeStep();
      else if (selectedPlayType === 'multiplayer' && !isMultiplayerConnected()) showMultiplayerStep();
      else showSetupStep();
    }
  }
  updateWorldThemeAccess();
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

  if (selectedPlayType === 'offline') {
    const secondX = Number(variable(playerTwoCollider, 'x'));
    const secondY = Number(variable(playerTwoCollider, 'y'));
    if (!playerTwoReady || !Number.isFinite(secondX) || !Number.isFinite(secondY)) {
      modeStatus.textContent = 'CHASE · Player 2 is joining';
      offlineChaseStatus.textContent = 'Joining the chase…';
      return;
    }
    const gap = Math.hypot(local.x - secondX, local.y - secondY);
    offlineChaseStatus.textContent = `P2 · WASD · ${Math.round(gap)}m`;
    if (gap < 64) {
      if (!chaseHoldStartedAt) chaseHoldStartedAt = timestamp;
      modeStatus.textContent = timestamp - chaseHoldStartedAt >= 1500
        ? `CHASE · TAG COMPLETE · ${Math.round(gap)}m`
        : `CHASE · P2 CLOSING · ${Math.round(gap)}m`;
    } else {
      chaseHoldStartedAt = 0;
      modeStatus.textContent = `CHASE · P1 RUNNER · P2 WASD · GAP ${Math.round(gap)}m`;
    }
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

function startOfflineChasePlayer2() {
  if (playerTwoLoading || playerTwoReady) return true;
  playerTwoLoading = true;
  playerTwoFrame.hidden = true;
  const source = new URL('./Drifting Sim 6 - surlo.html?monitors=clean-1&splitPlayer=2', window.location.href);
  playerTwoFrame.addEventListener('load', initializePlayerTwoGame, { once: true });
  playerTwoFrame.src = source.href;
  return true;
}

function updateOfflineChasePlayer2() {
  const chaseActive = selectedPlayType === 'offline' && gameMode === 'chase';
  if (!chaseActive) {
    clearOfflineChasePlayer2();
    return;
  }

  setPrimaryKeyboardWASD(false);
  if (!playerTwoLoading && !playerTwoReady && !playerTwoFailed) startOfflineChasePlayer2();
  if (playerTwoReady) separateOfflineChaseStart();
}

function separateOfflineChaseStart() {
  if (playerTwoSpawnAdjusted) return;
  const inGameValue = variable(stageTarget, 'IN GAME');
  if (inGameValue !== true && String(inGameValue).toLowerCase() !== 'true') return;

  const primaryState = stateForTarget(colliderTarget, stageTarget);
  const playerTwoState = stateForTarget(playerTwoCollider, playerTwoStage);
  if (!primaryState || !playerTwoState) return;
  if (Math.hypot(primaryState.x - playerTwoState.x, primaryState.y - playerTwoState.y) > 48) {
    playerTwoSpawnAdjusted = true;
    return;
  }

  const startGap = 80;
  const angle = primaryState.angle;
  const positioned = setTargetVariable(playerTwoCollider, 'x', primaryState.x - Math.cos(angle) * startGap) &&
    setTargetVariable(playerTwoCollider, 'y', primaryState.y - Math.sin(angle) * startGap);
  if (!positioned) return;
  setTargetVariable(playerTwoCollider, 'x vel', 0);
  setTargetVariable(playerTwoCollider, 'y vel', 0);
  setTargetVariable(playerTwoCollider, 'speed', 0);
  setTargetVariable(playerTwoCollider, 'turn', angle);
  playerTwoSpawnAdjusted = true;
}

function forwardOfflineChaseKey(event, type) {
  const key = String(event.key || '').toLowerCase();
  if (!playerTwoReady || !['w', 'a', 's', 'd'].includes(key)) return;
  const document = playerTwoFrame.contentWindow?.document;
  if (!document) return;
  document.dispatchEvent(new KeyboardEvent(type, {
    key: event.key,
    code: event.code,
    keyCode: event.keyCode,
    which: event.which,
    bubbles: true,
    cancelable: true,
  }));
  event.preventDefault();
}

function handleOfflineChaseKeyDown(event) {
  forwardOfflineChaseKey(event, 'keydown');
}

function handleOfflineChaseKeyUp(event) {
  forwardOfflineChaseKey(event, 'keyup');
}

async function initializePlayerTwoGame(attempt = 0) {
  if (!playerTwoLoading) return;
  try {
    playerTwoVm = playerTwoFrame.contentWindow.vm;
    playerTwoStage = playerTwoVm?.runtime?.getTargetForStage?.() || playerTwoVm?.runtime?.targets?.find((target) => target.isStage) || null;
    playerTwoCollider = playerTwoVm?.runtime?.targets?.find((target) => target.sprite?.name === 'player collider' && target.isOriginal) || null;
    const missing = [
      !playerTwoVm && 'Scratch runtime',
      !playerTwoStage && 'stage target',
      !playerTwoCollider && 'player collider',
    ].filter(Boolean);
    if (missing.length) {
      if (attempt >= 600) throw new Error(`Timed out waiting for ${missing.join(', ')}.`);
      modeHint.textContent = 'Loading Player 2 game runtime…';
      requestAnimationFrame(() => initializePlayerTwoGame(attempt + 1));
      return;
    }
    setScratchAudioMuted(true, playerTwoFrame);
    await registerCobraTrackFor(playerTwoVm, playerTwoStage, playerTwoCollider);
    syncPlayerTwoSelection();
    playerTwoVm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'enter game' });
    waitForPlayerTwoGame(0);
  } catch (error) {
    playerTwoLoading = false;
    playerTwoFailed = true;
    modeHint.textContent = `Could not start Player 2: ${error.message}`;
  }
}

function syncPlayerTwoSelection() {
  if (!playerTwoVm || !playerTwoStage) return;
  setTargetVariable(playerTwoStage, 'MAP', trackVariants[activeTrackId].map);
  setTargetVariable(playerTwoStage, 'CAR LETTER', activeCarLetter);
  setTargetVariable(playerTwoStage, 'car number', 'abcdefghi'.indexOf(activeCarLetter) + 1);
  playerTwoVm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'map select' });
  playerTwoVm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'car select' });
}

function waitForPlayerTwoGame(attempt) {
  const inGameValue = variable(playerTwoStage, 'IN GAME');
  const inMenuValue = variable(playerTwoStage, 'IN MENU');
  const inGame = inGameValue === true || String(inGameValue).toLowerCase() === 'true';
  const outOfMenu = inMenuValue === false || String(inMenuValue).toLowerCase() === 'false';
  if (inGame && outOfMenu) {
    removeFloorItOverlayClones(playerTwoVm);
    removePlayerTwoMenuClones();
    playerTwoReady = true;
    playerTwoLoading = false;
    playerTwoFrame.hidden = false;
    offlineChaseStatus.textContent = 'P2 WASD · second view ready';
    if (modeStartPending && !modeStartSent) {
      modeStartSent = startNativeGame();
      modeHint.textContent = modeStartSent ? 'Starting chase…' : 'Loading the game…';
    }
    return;
  }
  if (attempt >= 600) {
    playerTwoLoading = false;
    playerTwoFailed = true;
    modeHint.textContent = 'Player 2 did not enter the track.';
    return;
  }
  requestAnimationFrame(() => waitForPlayerTwoGame(attempt + 1));
}

function clearOfflineChasePlayer2() {
  if (!playerTwoLoading && !playerTwoReady && !playerTwoFailed) return;
  playerTwoFrame.hidden = true;
  playerTwoFrame.src = 'about:blank';
  removeOfflineChaseOpponentCars();
  playerTwoVm = null;
  playerTwoStage = null;
  playerTwoCollider = null;
  playerTwoLoading = false;
  playerTwoReady = false;
  playerTwoFailed = false;
  simShell.classList.remove('offline-split');
  setPrimaryKeyboardWASD(true);
}

function setPrimaryKeyboardWASD(enabled) {
  const keyboard = vm?.runtime?.ioDevices?.keyboard;
  if (!keyboard) return;
  if (enabled) {
    if (originalKeyboardGetKeyIsDown) keyboard.getKeyIsDown = originalKeyboardGetKeyIsDown;
    originalKeyboardGetKeyIsDown = null;
    return;
  }
  if (!originalKeyboardGetKeyIsDown) originalKeyboardGetKeyIsDown = keyboard.getKeyIsDown;
  keyboard.getKeyIsDown = function (key) {
    if (['w', 'a', 's', 'd'].includes(String(key).toLowerCase())) return false;
    return originalKeyboardGetKeyIsDown.call(this, key);
  };
}

function setStageVariable(name, value) {
  return setTargetVariable(stageTarget, name, value);
}

function setTargetVariable(target, name, value) {
  if (!target) return false;
  const entry = Object.values(target.variables || {}).find((item) => item.name === name);
  if (!entry) return false;
  entry.value = value;
  return true;
}

function applyTrack(trackId, switchNativeMap = false) {
  if (trackId === 'cobra-circuit' && !cobraTrackRegistered) {
    modeHint.textContent = 'Cobra Circuit is still loading.';
    return;
  }
  const track = trackVariants[trackId] || trackVariants.forest;
  activeTrackId = trackId in trackVariants ? trackId : 'forest';
  trackSelect.value = activeTrackId;
  modeTrackSelect.value = activeTrackId;
  const selectedTheme = track.theme;
  document.documentElement.dataset.worldTheme = selectedTheme;
  document.documentElement.dataset.trackVariant = activeTrackId;
  if (switchNativeMap && setStageVariable('MAP', track.map)) {
    vm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'map select' });
  }
  if (playerTwoReady) syncPlayerTwoSelection();
  updateWorldLabel();
}

function applyCar(letter, switchNativeCar = false) {
  const carLetter = String(letter || 'a').toLowerCase();
  activeCarLetter = carNamesByLetter[carLetter] ? carLetter : 'a';
  carSelect.value = activeCarLetter;
  modeCarSelect.value = activeCarLetter;
  if (switchNativeCar) {
    const carNumber = 'abcdefghi'.indexOf(activeCarLetter) + 1;
    setStageVariable('car number', carNumber);
    if (setStageVariable('CAR LETTER', activeCarLetter)) {
      vm.runtime.startHats('event_whenbroadcastreceived', { BROADCAST_OPTION: 'car select' });
    }
  }
  if (playerTwoReady) syncPlayerTwoSelection();
  renderPlayers();
}

async function registerCobraTrack(attempt = 0) {
  if (cobraTrackRegistered || !window.driftingTrackCobra) return cobraTrackRegistered;
  if (!waitForGameRuntime()) {
    if (attempt < 600) {
      requestAnimationFrame(() => registerCobraTrack(attempt + 1));
    } else {
      modeHint.textContent = 'Could not load Cobra Circuit: game runtime did not finish loading.';
    }
    return false;
  }

  try {
    await registerCobraTrackFor(vm, stageTarget, colliderTarget);
    for (const select of [trackSelect, modeTrackSelect]) {
      const option = select.querySelector('option[value="cobra-circuit"]');
      if (option) {
        option.disabled = false;
        option.textContent = 'Cobra Circuit';
      }
    }
    cobraTrackRegistered = true;
    return true;
  } catch (error) {
    modeHint.textContent = `Could not load Cobra Circuit: ${error.message}`;
    return false;
  }
}

async function registerCobraTrackFor(gameVm, gameStage, gameCollider) {
  if (!window.driftingTrackCobra) throw new Error('Cobra Circuit data is missing.');
  const track = window.driftingTrackCobra;
  const renderer = gameVm.renderer || gameVm.runtime.renderer;
  const storage = gameVm.runtime.storage;
  const findInGame = (name) => gameVm.runtime.targets.find((target) => target.sprite?.name === name && target.isOriginal) || null;
  const shiftTrackArt = (svg) => svg
    .replaceAll('<path ', '<path transform="translate(-22 83)" ')
    .replace('<g opacity=".9">', '<g opacity=".9" transform="translate(-22 83)">');
  const roadSource = track.guardrailPath
    ? track.road.replace('</svg>', `<path d="${track.guardrailPath}" fill="none" stroke="#263033" stroke-width="116" stroke-linecap="round" stroke-linejoin="round"/><path d="${track.guardrailPath}" fill="none" stroke="#c4c8b9" stroke-width="112" stroke-linecap="round" stroke-linejoin="round"/><path d="${track.guardrailPath}" fill="none" stroke="#697365" stroke-width="104" stroke-linecap="round" stroke-linejoin="round"/><path d="${track.guardrailPath}" fill="none" stroke="#f4e7a6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`)
    : track.road;
  const road = shiftTrackArt(roadSource);
  const targets = [
    [gameStage, track.stage, 480, 360],
    [findInGame('map bottom'), road, 480, 360],
    [findInGame('map top'), shiftTrackArt(track.scenery), 480, 360],
    [findInGame('map collider'), shiftTrackArt(track.collision), 480, 360],
    [findInGame('mini map'), shiftTrackArt(track.minimap), 391, 270],
  ];

  for (const [target, svg, rotationCenterX, rotationCenterY] of targets) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (!target) throw new Error('A required original map sprite is missing.');
    if (target.getCostumes().some((costume) => costume.name === track.id)) continue;
    const asset = storage.createAsset(
      storage.AssetType.ImageVector,
      storage.DataFormat.SVG,
      new TextEncoder().encode(svg),
      null,
      true,
    );
    const costume = {
      ...target.getCostumes()[0],
      name: track.id,
      asset,
      assetId: asset.assetId,
      md5: `${asset.assetId}.svg`,
      dataFormat: storage.DataFormat.SVG,
      bitmapResolution: 2,
      rotationCenterX,
      rotationCenterY,
      skinId: renderer.createSVGSkin(svg, [rotationCenterX, rotationCenterY]),
    };
    target.addCostume(costume);
  }

  const mapNames = gameStage.lookupVariableByNameAndType('MAP NAMES', 'list')?.value;
  const mapStarts = gameStage.lookupVariableByNameAndType('MAP CHECKPOINT START VALUE', 'list')?.value;
  const highScores = gameStage.lookupVariableByNameAndType('MAP HIGH SCORES', 'list')?.value;
  const recordCars = gameStage.lookupVariableByNameAndType('RECORD HOLDER CARS', 'list')?.value;
  const checkpointsX = gameCollider.lookupVariableByNameAndType('Checkpoints x', 'list')?.value;
  const checkpointsY = gameCollider.lookupVariableByNameAndType('Checkpoints y', 'list')?.value;
  if (![mapNames, mapStarts, highScores, recordCars, checkpointsX, checkpointsY].every(Array.isArray)) {
    throw new Error('The original map/checkpoint tables could not be found.');
  }

  if (!mapNames.includes(track.id)) {
    mapNames.push(track.id);
    mapStarts.push(String(checkpointsX.length + 1));
    highScores.push('00.00');
    recordCars.push('0');
    track.checkpoints.forEach(({ x, y }) => {
      checkpointsX.push(x);
      checkpointsY.push(y);
    });
  }

}

function syncCarFromNativeGame() {
  applyCar(String(variable(stageTarget, 'CAR LETTER') || 'a').toLowerCase());
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
  const connected = isMultiplayerConnected();
  const hostRestricted = !!(connected && roomHostId !== signedInUser?.key);
  const menuValue = variable(stageTarget, 'IN MENU');
  const inMenu = menuValue === null || menuValue === true || String(menuValue).toLowerCase() === 'true';
  trackSelect.disabled = hostRestricted || !inMenu;
  modeTrackSelect.disabled = hostRestricted || !inMenu;
  carSelect.disabled = !inMenu;
  modeCarSelect.disabled = !inMenu;
}

function isMultiplayerConnected() {
  return (socket && socket.readyState === WebSocket.OPEN) ||
    (firebaseTransport && !!firebasePlayerRef);
}

function shouldUseFirebaseTransport() {
  return new URLSearchParams(window.location.search).get('lan') !== '1';
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

function placeCarCloneAboveRoad(gameVm, clone) {
  const runtime = gameVm?.runtime;
  const road = runtime?.targets?.find((target) => target.sprite?.name === 'map bottom' && target.isOriginal);
  const cloneLayer = clone?.getLayerOrder?.();
  const roadLayer = road?.getLayerOrder?.();
  if (!Number.isFinite(cloneLayer) || !Number.isFinite(roadLayer) || cloneLayer > roadLayer) return;
  clone.goForwardLayers(roadLayer - cloneLayer + 1);
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
    placeCarCloneAboveRoad(vm, clone);
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
  player.nameTag?.remove();
  player.nameTag = null;
  player.positionOutline?.remove();
  player.positionOutline = null;
}

function removeAllRemoteCarClones() {
  for (const player of remotePlayers.values()) removeRemoteCarClones(player);
}

function removeFloorItOverlayClones(gameVm) {
  const runtime = gameVm?.runtime;
  if (!runtime) return;
  for (const target of [...runtime.targets]) {
    if (target.isOriginal || target.sprite?.name !== 'Overlay') continue;
    const costumeName = target.getCostumes?.()[target.currentCostume]?.name;
    if (costumeName === 'floor it' || costumeName === 'floor it2') runtime.disposeTarget(target);
  }
}

function removePlayerTwoMenuClones() {
  const runtime = playerTwoVm?.runtime;
  if (!runtime) return;
  for (const target of [...runtime.targets]) {
    if (target.sprite?.name !== 'menu') continue;
    if (target.isOriginal) {
      target.visible = false;
      target.updateAllDrawableProperties();
    } else {
      runtime.disposeTarget(target);
    }
  }
}

function createOfflineOpponentClones(gameVm, carLetter) {
  const template = gameVm?.runtime?.targets?.find((target) => target.sprite?.name === 'player render car' && target.isOriginal);
  if (!template) return [];
  const clones = [];
  for (let layer = 0; layer < 6; layer += 1) {
    const clone = template.makeClone();
    if (!clone) break;
    gameVm.runtime.addTarget(clone);
    placeCarCloneAboveRoad(gameVm, clone);
    clone.visible = true;
    clone.setCostume(carCostumeIndex(carLetter, layer));
    clone.updateAllDrawableProperties();
    clones.push(clone);
  }
  if (clones.length === 6) return clones;
  for (const clone of clones) gameVm.runtime.disposeTarget(clone);
  return [];
}

function updateOfflineOpponentCar(gameVm, gameStage, clones, state) {
  if (!state || !Number.isFinite(Number(state.x)) || !Number.isFinite(Number(state.y))) return clones;
  if (clones.length !== 6) clones = createOfflineOpponentClones(gameVm, state.carLetter);
  if (clones.length !== 6) return clones;

  const cameraX = Number(variable(gameStage, 'CAM X')) || 0;
  const cameraY = Number(variable(gameStage, 'CAM Y')) || 0;
  const x = Number(state.x) - cameraX;
  const y = Number(state.y) - cameraY;
  const direction = Number.isFinite(Number(state.direction))
    ? Number(state.direction)
    : 90 - (Number(state.angle) || 0) * 180 / Math.PI;
  clones.forEach((clone, layer) => {
    const costume = carCostumeIndex(state.carLetter, layer);
    if (clone.currentCostume !== costume) clone.setCostume(costume);
    clone.x = x;
    clone.y = y;
    clone.direction = direction;
    clone.visible = true;
    clone.updateAllDrawableProperties();
  });
  return clones;
}

function stateForTarget(collider, gameStage) {
  const x = Number(variable(collider, 'x'));
  const y = Number(variable(collider, 'y'));
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const vx = Number(variable(collider, 'x vel')) || 0;
  const vy = Number(variable(collider, 'y vel')) || 0;
  return {
    x,
    y,
    angle: Number(variable(collider, 'turn')) || Math.atan2(vy, vx),
    direction: Number(collider.direction),
    carLetter: String(variable(gameStage, 'CAR LETTER') || 'a').toLowerCase(),
  };
}

function updateOfflineChaseOpponentCars() {
  if (selectedPlayType !== 'offline' || gameMode !== 'chase' || !playerTwoReady) return;
  removePlayerTwoMenuClones();
  const primaryState = stateForTarget(colliderTarget, stageTarget);
  const playerTwoState = stateForTarget(playerTwoCollider, playerTwoStage);
  primaryOfflineOpponentClones = updateOfflineOpponentCar(vm, stageTarget, primaryOfflineOpponentClones, playerTwoState);
  playerTwoOfflineOpponentClones = updateOfflineOpponentCar(playerTwoVm, playerTwoStage, playerTwoOfflineOpponentClones, primaryState);
}

function removeOfflineChaseOpponentCars() {
  for (const clone of primaryOfflineOpponentClones) vm?.runtime?.disposeTarget(clone);
  for (const clone of playerTwoOfflineOpponentClones) playerTwoVm?.runtime?.disposeTarget(clone);
  primaryOfflineOpponentClones = [];
  playerTwoOfflineOpponentClones = [];
}

function updateRemoteCarClones() {
  if (!waitForGameRuntime()) return;
  updateOfflineChaseOpponentCars();
  const canvas = frame.contentWindow.document.querySelector('canvas');
  if (!canvas) return;
  const canvasRect = canvas.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  const cameraX = Number(variable(stageTarget, 'CAM X')) || 0;
  const cameraY = Number(variable(stageTarget, 'CAM Y')) || 0;
  for (const player of remotePlayers.values()) {
    const state = player.state;
    if (!state || !Number.isFinite(Number(state.x)) || !Number.isFinite(Number(state.y))) {
      if (player.nameTag) player.nameTag.hidden = true;
      if (player.positionOutline) player.positionOutline.hidden = true;
      continue;
    }
    if (!player.carClones?.length) createRemoteCarClones(player);
    const x = Number(state.x) - cameraX;
    const y = Number(state.y) - cameraY;
    if (!player.positionOutline) {
      player.positionOutline = document.createElement('div');
      player.positionOutline.className = 'remote-car-outline';
      player.positionOutline.setAttribute('aria-hidden', 'true');
      player.positionOutline.style.setProperty('--outline-color', player.color || colorForPlayer(player.id));
      simShell.append(player.positionOutline);
    }
    if (!player.nameTag) {
      player.nameTag = document.createElement('div');
      player.nameTag.className = 'remote-name-tag';
      simShell.append(player.nameTag);
    }
    player.nameTag.textContent = player.name || 'Driver';
    player.nameTag.hidden = x < -240 || x > 240 || y < -180 || y > 180;
    const screenX = frameRect.left + canvasRect.left + (x + 240) / 480 * canvasRect.width;
    const screenY = frameRect.top + canvasRect.top + (180 - y) / 360 * canvasRect.height;
    player.nameTag.style.left = `${screenX}px`;
    player.nameTag.style.top = `${screenY}px`;
    player.positionOutline.hidden = player.nameTag.hidden;
    player.positionOutline.style.left = `${screenX}px`;
    player.positionOutline.style.top = `${screenY}px`;
    player.positionOutline.style.transform = `translate(-50%, -50%) rotate(${(Number(state.direction) || 90) - 90}deg)`;
    const direction = Number.isFinite(Number(state.direction))
      ? Number(state.direction)
      : 90 - (Number(state.angle) || 0) * 180 / Math.PI;
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
    direction: Number(colliderTarget.direction),
    speed: Number(variable(colliderTarget, 'speed')) || Math.hypot(vx, vy),
    map: String(variable(stageTarget, 'MAP') ?? ''),
    carLetter: String(variable(stageTarget, 'CAR LETTER') || 'a').toLowerCase(),
    carName: getSelectedCarName(),
    lap: Number(variable(colliderTarget, 'Lap number')) || 1,
    timer: Number(variable(stageTarget, 'TIMER')) || 0,
  };
}

function connect() {
  signedInUser = readSession() || guestSession();
  accountName.textContent = signedInUser.key.startsWith('guest-')
    ? `Online as @${signedInUser.username}`
    : `Signed in as @${signedInUser.username}`;

  const room = roomInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  if (!room) {
    setStatus('Enter a room name first.');
    return;
  }
  activeRoom = room;
  if (socket || firebaseTransport) disconnect();
  removeAllRemoteCarClones();
  remotePlayers.clear();
  renderPlayers();

  if (shouldUseFirebaseTransport()) {
    connectFirebase(room).catch((error) => {
      setStatus(`Firebase multiplayer failed: ${error.message || 'check Firebase setup'}`);
      connectButton.textContent = 'Connect';
      if (selectedPlayType === 'multiplayer') showMultiplayerStep();
    });
    return;
  }

  let currentSocket;
  try {
    currentSocket = new WebSocket(getMultiplayerUrl());
  } catch (error) {
    setStatus(`Could not open multiplayer connection: ${error.message}`);
    return;
  }
  socket = currentSocket;
  setStatus('Connecting to multiplayer…');
  currentSocket.addEventListener('open', () => {
    if (socket !== currentSocket) return;
    currentSocket.send(JSON.stringify({
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

  currentSocket.addEventListener('message', (event) => {
    if (socket !== currentSocket) return;
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
      if (host && trackVariants[host.trackId] && host.trackId !== activeTrackId) applyTrack(host.trackId, true);
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
      if (selectedPlayType === 'multiplayer') showSetupStep();
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
        modeRunId = message.state.modeRunId;
        gameMode = message.state.gameMode === 'chase' ? 'chase' : 'race';
        modeStartPending = true;
        modeStartSent = false;
        modeScreen.hidden = true;
        modeStartSent = startNativeGame();
      }
      if (message.id === roomHostId && trackVariants[message.state?.trackId] && message.state.trackId !== activeTrackId) {
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

  currentSocket.addEventListener('close', () => {
    if (socket !== currentSocket) return;
    socket = null;
    removeAllRemoteCarClones();
    remotePlayers.clear();
    roomOrder = [];
    roomHostId = null;
    updateWorldThemeAccess();
    renderPlayers();
    setStatus('Disconnected · offline practice remains available.');
    connectButton.textContent = 'Connect';
    if (selectedPlayType === 'multiplayer') showMultiplayerStep();
  });

  currentSocket.addEventListener('error', () => {
    if (socket === currentSocket) {
      setStatus('Could not connect. Check the multiplayer server or hosting configuration.');
      if (selectedPlayType === 'multiplayer') showMultiplayerStep();
    }
  });
}

async function connectFirebase(room) {
  const api = globalThis.firebase;
  if (!api?.apps?.length || typeof api.database !== 'function') {
    throw new Error('Firebase SDK or database config is missing.');
  }
  const safeRoom = room.replace(/[.#$\[\]/]/g, '_');
  const safePlayerId = signedInUser.key.replace(/[.#$\[\]/]/g, '_');
  const playersRef = api.database().ref(`driftRooms/${safeRoom}/players`);
  const playerRef = playersRef.child(safePlayerId);
  const state = localState();
  try {
    await playerRef.onDisconnect().remove();
    await playerRef.set({
      id: signedInUser.key,
      name: signedInUser.username,
      color: colorForPlayer(signedInUser.key),
      carName: getSelectedCarName(),
      trackId: activeTrackId,
      joinedAt: Date.now(),
      state: state ? { ...state, name: signedInUser.username, trackId: activeTrackId } : null,
    });

    firebasePlayersRef = playersRef;
    firebasePlayerRef = playerRef;
    firebasePlayersHandler = (snapshot) => syncFirebaseRoom(snapshot.val() || {});
    firebaseTransport = true;
    playersRef.on('value', firebasePlayersHandler, (error) => {
      disconnect();
      setStatus(`Firebase room disconnected: ${error.message}`, false);
    });
    setStatus(`Joining Firebase room ${room}…`);
    connectButton.textContent = 'Disconnect';
  } catch (error) {
    await playerRef.onDisconnect().cancel().catch(() => {});
    await playerRef.remove().catch(() => {});
    throw error;
  }
}

function syncFirebaseRoom(values) {
  const players = Object.entries(values)
    .map(([id, player]) => ({ ...player, id: player.id || id }))
    .sort((a, b) => Number(a.joinedAt || 0) - Number(b.joinedAt || 0));
  roomOrder = players.map((player) => player.id);
  roomHostId = roomOrder[0] || signedInUser.key;
  localSlot = Math.max(0, roomOrder.indexOf(signedInUser.key));
  updateWorldThemeAccess();

  const host = players.find((player) => player.id === roomHostId);
  if (host?.trackId && trackVariants[host.trackId] && host.trackId !== activeTrackId) applyTrack(host.trackId, true);

  const activeIds = new Set();
  for (const player of players) {
    if (player.id === signedInUser.key) continue;
    activeIds.add(player.id);
    let remote = remotePlayers.get(player.id);
    if (!remote) {
      remote = { id: player.id, name: player.name, color: player.color || colorForPlayer(player.id), carName: player.carName || 'Selecting car', state: null };
      remotePlayers.set(player.id, remote);
    }
    remote.name = player.name || remote.name;
    remote.color = player.color || remote.color;
    remote.carName = player.carName || remote.carName;
    remote.state = player.state || remote.state;
    if (player.id === roomHostId && remote.state?.modeRunId && remote.state.modeRunId !== observedModeRunId) {
      observedModeRunId = remote.state.modeRunId;
      modeRunId = remote.state.modeRunId;
      gameMode = remote.state.gameMode === 'chase' ? 'chase' : 'race';
      modeStartPending = true;
      modeStartSent = false;
      modeScreen.hidden = true;
      modeStartSent = startNativeGame();
    }
  }
  for (const [id, player] of remotePlayers) {
    if (activeIds.has(id)) continue;
    removeRemoteCarClones(player);
    remotePlayers.delete(id);
  }
  setStatus(`Firebase · @${signedInUser.username} · ${players.length} driver${players.length === 1 ? '' : 's'}`, true);
  renderPlayers();
  if (selectedPlayType === 'multiplayer') showSetupStep();
}

function disconnect() {
  const oldSocket = socket;
  socket = null;
  if (oldSocket && oldSocket.readyState < WebSocket.CLOSING) oldSocket.close();
  if (firebasePlayersRef && firebasePlayersHandler) firebasePlayersRef.off('value', firebasePlayersHandler);
  if (firebasePlayerRef) {
    firebasePlayerRef.onDisconnect().cancel();
    firebasePlayerRef.remove();
  }
  firebasePlayerRef = null;
  firebasePlayersRef = null;
  firebasePlayersHandler = null;
  firebaseTransport = false;
  removeAllRemoteCarClones();
  remotePlayers.clear();
  roomOrder = [];
  roomHostId = null;
  localSlot = 0;
  updateWorldThemeAccess();
  renderPlayers();
  setStatus('Disconnected · offline practice remains available.');
  connectButton.textContent = 'Connect';
  disconnectRoomButton.hidden = true;
  if (selectedPlayType === 'multiplayer') showMultiplayerStep();
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
  if (!isMultiplayerConnected() || (!force && timestamp < nextRoomSync)) return;
  const state = localState();
  if (!state) return;
  nextRoomSync = timestamp + 70;
  const payload = {
    ...state,
    name: signedInUser.username,
    slot: localSlot,
    carColor: colorForPlayer(signedInUser.key),
    carName: state.carName,
    trackId: activeTrackId,
    gameMode,
    modeRunId,
  };
  if (firebaseTransport && firebasePlayerRef) {
    firebasePlayerRef.update({ state: payload, carName: state.carName, trackId: activeTrackId });
  } else if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'state', room: activeRoom, state: payload }));
  }
}

function syncMultiplayer(timestamp) {
  updateWorldLabel();
  updateModeScreen();
  updateOfflineChasePlayer2(timestamp);
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
  audio.muted = true;
  audio.play().then(() => {
    audio.muted = false;
    setScratchAudioMuted(true);
  }).catch(() => {
    audio.muted = false;
    currentSong.textContent = `${songs[currentSongIndex].name} · press play if autoplay is blocked`;
  });
  currentSong.textContent = songs[currentSongIndex].name;
  renderPlaylist();
}

function setScratchAudioMuted(muted, gameFrame = frame) {
  try {
    const engine = gameFrame.contentWindow.vm?.runtime?.audioEngine;
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
document.getElementById('playOffline').addEventListener('click', chooseOffline);
document.getElementById('playMultiplayer').addEventListener('click', chooseMultiplayer);
document.getElementById('backToPlayType').addEventListener('click', () => {
  selectedPlayType = null;
  showPlayTypeStep();
});
document.getElementById('backToPlayTypeFromSetup').addEventListener('click', () => {
  selectedPlayType = null;
  showPlayTypeStep();
});
disconnectRoomButton.addEventListener('click', disconnect);
returnToMainMenuButton.addEventListener('click', returnToNativeMenu);
modeScreen.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    resumeScratchAudio();
    startMode(button.dataset.mode);
  });
});
connectButton.addEventListener('click', () => {
  if (isMultiplayerConnected() || (socket && socket.readyState < WebSocket.CLOSING)) disconnect();
  else connect();
});
trackSelect.addEventListener('change', () => {
  if (isMultiplayerConnected() && roomHostId !== signedInUser?.key) return;
  applyTrack(trackSelect.value, true);
});
modeTrackSelect.addEventListener('change', () => {
  if (isMultiplayerConnected() && roomHostId !== signedInUser?.key) return;
  applyTrack(modeTrackSelect.value, true);
});
carSelect.addEventListener('change', () => {
  resumeScratchAudio();
  applyCar(carSelect.value, true);
});
modeCarSelect.addEventListener('change', () => {
  resumeScratchAudio();
  applyCar(modeCarSelect.value, true);
});
songFilesInput.addEventListener('change', (event) => addSongs(Array.from(event.target.files || [])));
document.getElementById('previousSong').addEventListener('click', () => playSong(currentSongIndex - 1));
document.getElementById('nextSong').addEventListener('click', () => playSong(currentSongIndex + 1));
document.getElementById('playSong').addEventListener('click', toggleSong);
audio.addEventListener('ended', () => playSong(currentSongIndex + 1));
frame.addEventListener('load', () => {
  frame.contentWindow.document.addEventListener('pointerdown', resumeScratchAudio, { once: true });
  frame.contentWindow.document.addEventListener('keydown', resumeScratchAudio, { once: true });
  frame.contentWindow.addEventListener('keydown', handleOfflineChaseKeyDown, true);
  frame.contentWindow.addEventListener('keyup', handleOfflineChaseKeyUp, true);
  accountName.textContent = signedInUser
    ? `Signed in as @${signedInUser.username}`
    : 'Offline practice · online as guest';
  setScratchAudioMuted(true);
  syncTrackFromNativeGame();
  syncCarFromNativeGame();
  setTimeout(() => {
    setScratchAudioMuted(true);
    try {
      registerCobraTrack();
    } catch (error) {
      modeHint.textContent = `Could not load Cobra Circuit: ${error.message}`;
    }
    syncTrackFromNativeGame();
    syncCarFromNativeGame();
  }, 600);
});
window.addEventListener('keydown', handleOfflineChaseKeyDown, true);
window.addEventListener('keyup', handleOfflineChaseKeyUp, true);
window.addEventListener('beforeunload', () => songs.forEach((song) => URL.revokeObjectURL(song.url)));
accountName.textContent = signedInUser
  ? `Signed in as @${signedInUser.username}`
  : 'Offline practice · online as guest';
loadBuiltInSongs();
setScratchAudioMuted(true);
syncTrackFromNativeGame();
renderPlayers();
requestAnimationFrame(syncMultiplayer);
