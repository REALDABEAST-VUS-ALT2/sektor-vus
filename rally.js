const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resetBtn = document.getElementById('resetRaceBtn');
const connectBtn = document.getElementById('connectBtn');
const mapSelect = document.getElementById('mapSelect');
const statusBar = document.getElementById('statusBar');

const p1LapEl = document.getElementById('p1Lap');
const p1SpeedEl = document.getElementById('p1Speed');
const p1DriftEl = document.getElementById('p1Drift');
const p2LapEl = document.getElementById('p2Lap');
const p2SpeedEl = document.getElementById('p2Speed');
const p2DriftEl = document.getElementById('p2Drift');
const p1NameEl = document.getElementById('p1Name');
const p2NameEl = document.getElementById('p2Name');

const MAPS = [
  {
    name: 'Canyon Run',
    cx: 640, cy: 360, rx: 430, ry: 240,
    checkpoints: [
      { x: 640, y: 120 }, { x: 1010, y: 155 }, { x: 1110, y: 360 },
      { x: 980, y: 620 }, { x: 640, y: 610 }, { x: 290, y: 500 },
      { x: 275, y: 240 }, { x: 420, y: 140 }
    ],
    colors: ['#19342b', '#0c1715'],
  },
  {
    name: 'Neon Circuit',
    cx: 640, cy: 360, rx: 470, ry: 255,
    checkpoints: [
      { x: 640, y: 110 }, { x: 1060, y: 180 }, { x: 1150, y: 360 },
      { x: 980, y: 650 }, { x: 640, y: 640 }, { x: 290, y: 560 },
      { x: 250, y: 250 }, { x: 420, y: 120 }
    ],
    colors: ['#141e2e', '#0b0f1a'],
  },
  {
    name: 'Mountain Pass',
    cx: 640, cy: 360, rx: 440, ry: 260,
    checkpoints: [
      { x: 640, y: 135 }, { x: 1005, y: 135 }, { x: 1110, y: 340 },
      { x: 1030, y: 625 }, { x: 640, y: 625 }, { x: 275, y: 520 },
      { x: 240, y: 225 }, { x: 440, y: 145 }
    ],
    colors: ['#1f2d2d', '#0d1714'],
  }
];

const pressed = new Set();
const KEY_MAP = {
  p1: { forward: 'w', backward: 's', left: 'a', right: 'd', boost: 'shift', handbrake: 'x' },
  p2: { forward: 'arrowup', backward: 'arrowdown', left: 'arrowleft', right: 'arrowright', boost: ' ', handbrake: 'm' },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isPressed(player, key) {
  const actual = player.controls[key];
  if (actual === ' ') return pressed.has(' ') || pressed.has('spacebar');
  return pressed.has(actual);
}

function makeCar(id, x, y, color, controls, startAngle) {
  return {
    id,
    x,
    y,
    angle: startAngle,
    speed: 0,
    velocityX: 0,
    velocityY: 0,
    driftVelocity: 0,
    lap: 0,
    checkpoint: 0,
    driftScore: 0,
    finished: false,
    color,
    controls,
    boostMeter: 100,
    name: id === 'p1' ? 'Player 1' : 'Player 2',
    remote: false,
  };
}

function readSektorSession() {
  try {
    const session = JSON.parse(localStorage.getItem('vusServersSession') || 'null');
    return session && typeof session.key === 'string' && typeof session.username === 'string'
      ? session
      : null;
  } catch (error) {
    return null;
  }
}

const cars = [
  makeCar('p1', 640, 600, '#ff7a7a', KEY_MAP.p1, 0),
  makeCar('p2', 640, 500, '#68b9ff', KEY_MAP.p2, 0.18),
];

const runtime = {
  socket: null,
  connected: false,
  room: 'rally-room',
  playerId: null,
  account: readSektorSession(),
  remoteCar: null,
  mapIndex: 0,
  localSlot: 0,
};

function setStatus(message) {
  statusBar.textContent = message;
}

function chooseMap(index) {
  runtime.mapIndex = Number(index) || 0;
  const map = MAPS[runtime.mapIndex];
  setStatus(`${map.name} selected`);
}

function placeCarAtStart(car, slot, map = MAPS[runtime.mapIndex]) {
  const line = map.checkpoints[0];
  car.x = line.x;
  car.y = line.y + (slot === 0 ? 12 : -12);
  car.angle = 0;
}

function resetRace() {
  const start = MAPS[runtime.mapIndex];
  placeCarAtStart(cars[0], runtime.localSlot, start);
  cars[0].speed = 0;
  cars[0].velocityX = 0;
  cars[0].velocityY = 0;
  cars[0].driftVelocity = 0;
  cars[0].lap = 0;
  cars[0].checkpoint = 0;
  cars[0].driftScore = 0;
  cars[0].boostMeter = 100;
  cars[0].finished = false;

  placeCarAtStart(cars[1], 1, start);
  cars[1].speed = 0;
  cars[1].velocityX = 0;
  cars[1].velocityY = 0;
  cars[1].driftVelocity = 0;
  cars[1].lap = 0;
  cars[1].checkpoint = 0;
  cars[1].driftScore = 0;
  cars[1].boostMeter = 100;
  cars[1].finished = false;
}

function onTrack(car, map = MAPS[runtime.mapIndex]) {
  const dx = car.x - map.cx;
  const dy = car.y - map.cy;
  const r = Math.hypot(dx / map.rx, dy / map.ry);
  return r >= 0.84 && r <= 1.18;
}

function updateCar(car, dt, map = MAPS[runtime.mapIndex]) {
  if (car.finished) return;

  const forwardInput = isPressed(car, 'forward');
  const backwardInput = isPressed(car, 'backward');
  const leftInput = isPressed(car, 'left');
  const rightInput = isPressed(car, 'right');
  const boostHeld = isPressed(car, 'boost');
  const handbrakeHeld = isPressed(car, 'handbrake');

  const throttle = (forwardInput ? 1 : 0) - (backwardInput ? 1 : 0);
  const steerInput = (rightInput ? 1 : 0) - (leftInput ? 1 : 0);
  const onRoad = onTrack(car, map);

  const boostFactor = boostHeld && car.boostMeter > 0 && Math.abs(car.speed) > 30 ? 1.75 : 1;
  car.boostMeter = boostHeld && Math.abs(car.speed) > 30
    ? clamp(car.boostMeter - 26 * dt, 0, 100)
    : clamp(car.boostMeter + 15 * dt, 0, 100);

  const oldForwardX = Math.cos(car.angle);
  const oldForwardY = Math.sin(car.angle);
  car.speed = car.velocityX * oldForwardX + car.velocityY * oldForwardY;

  const accel = throttle * 440 * boostFactor;
  const handbrakeTurn = handbrakeHeld && Math.abs(car.speed) > 45 ? 1.45 : 1;
  const steerStrength = clamp(Math.abs(car.speed) / 260, 0.12, 1.1);
  car.angle += steerInput * Math.sign(car.speed || 1) * steerStrength * dt * (0.85 + Math.abs(car.speed) / 360) * handbrakeTurn;

  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const rightVec = { x: -Math.sin(car.angle), y: Math.cos(car.angle) };
  let longitudinal = car.velocityX * forward.x + car.velocityY * forward.y;
  let lateral = car.velocityX * rightVec.x + car.velocityY * rightVec.y;

  longitudinal += accel * dt;
  if (throttle === 0) longitudinal *= Math.exp(-dt * (onRoad ? 0.75 : 1.7));
  if (!onRoad) longitudinal *= Math.exp(-dt * 1.2);

  const lateralGrip = handbrakeHeld ? 0.85 : (onRoad ? 8.5 : 5.5);
  lateral *= Math.exp(-lateralGrip * dt);

  const maxSpeed = boostHeld && car.boostMeter > 0 ? 860 : 620;
  longitudinal = clamp(longitudinal, -180, maxSpeed);
  lateral = clamp(lateral, -Math.max(70, Math.abs(longitudinal) * 1.2), Math.max(70, Math.abs(longitudinal) * 1.2));
  car.speed = longitudinal;
  car.driftVelocity = lateral;
  car.velocityX = forward.x * longitudinal + rightVec.x * lateral;
  car.velocityY = forward.y * longitudinal + rightVec.y * lateral;

  car.x += car.velocityX * dt;
  car.y += car.velocityY * dt;

  const slipAngle = Math.atan2(Math.abs(car.driftVelocity), Math.max(Math.abs(car.speed), 1));
  if (onRoad && slipAngle > 0.12 && slipAngle < 0.9 && Math.abs(car.speed) > 100) {
    car.driftScore += Math.abs(car.speed) * slipAngle * dt * 0.8;
  }

  const dx = car.x - map.cx;
  const dy = car.y - map.cy;
  const roadRadius = Math.hypot(dx / map.rx, dy / map.ry);
  if (roadRadius > 1.18 || roadRadius < 0.73) {
    car.x -= car.velocityX * dt * 1.2;
    car.y -= car.velocityY * dt * 1.2;
    car.velocityX *= 0.35;
    car.velocityY *= 0.35;
    car.speed *= 0.35;
    car.driftVelocity *= 0.35;
  }

  car.x = clamp(car.x, 84, canvas.width - 84);
  car.y = clamp(car.y, 84, canvas.height - 84);

  const target = map.checkpoints[car.checkpoint];
  if (target && Math.hypot(car.x - target.x, car.y - target.y) < 52) {
    const next = (car.checkpoint + 1) % map.checkpoints.length;
    if (next === 0) {
      car.lap += 1;
      car.driftScore += 180;
      if (car.lap >= 2) car.finished = true;
    }
    car.checkpoint = next;
  }
}

function drawMap(map = MAPS[runtime.mapIndex]) {
  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, map.colors[0]);
  bg.addColorStop(1, map.colors[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let x = 0; x < canvas.width; x += 42) ctx.fillRect(x, 0, 1, canvas.height);
  for (let y = 0; y < canvas.height; y += 42) ctx.fillRect(0, y, canvas.width, 1);

  ctx.save();
  ctx.translate(map.cx, map.cy);
  ctx.fillStyle = '#334d42';
  ctx.beginPath();
  ctx.ellipse(0, 0, map.rx + 90, map.ry + 80, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#233b33';
  ctx.beginPath();
  ctx.ellipse(0, 0, map.rx + 22, map.ry + 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 88;
  ctx.strokeStyle = '#405b4f';
  ctx.beginPath();
  ctx.ellipse(0, 0, map.rx, map.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 22;
  ctx.strokeStyle = '#dff5d9';
  ctx.setLineDash([18, 15]);
  ctx.beginPath();
  ctx.ellipse(0, 0, map.rx, map.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.lineWidth = 6;
  ctx.strokeStyle = '#f7d986';
  ctx.beginPath();
  ctx.moveTo(-map.rx + 34, 0);
  ctx.lineTo(map.rx - 36, 0);
  ctx.stroke();
  ctx.restore();

  map.checkpoints.forEach((point, index) => {
    const active = index === cars[0].checkpoint || index === cars[1].checkpoint;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.fillStyle = active ? '#ffd76b' : '#edf6ef';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawBoostMeter(car) {
  const x = car.id === 'p1' ? 32 : canvas.width - 162;
  const y = 24;
  const width = 130;
  const height = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = car.id === 'p1' ? '#ff8e6a' : '#7bb8ff';
  ctx.fillRect(x, y, width * (car.boostMeter / 100), height);
}

function drawCar(car) {
  const driftGlow = clamp(Math.abs(car.driftVelocity) / 70, 0, 1);
  const angle = car.angle;

  if (Math.abs(car.driftVelocity) > 28 && Math.abs(car.speed) > 110) {
    ctx.save();
    ctx.translate(car.x - Math.cos(angle) * 24, car.y - Math.sin(angle) * 24);
    ctx.rotate(Math.PI / 2 + angle);
    ctx.fillStyle = `rgba(255,255,255,${0.17 + driftGlow * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11 + driftGlow * 16, 6 + driftGlow * 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(angle);

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 20, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111';
  ctx.fillRect(-18, -10, 36, 20);
  ctx.fillStyle = car.color;
  ctx.fillRect(-16, -7, 32, 14);

  ctx.fillStyle = '#434d53';
  ctx.fillRect(-8, -12, 16, 6);
  ctx.fillStyle = '#dfe9ff';
  ctx.fillRect(13, -4.5, 9, 3);
  ctx.fillRect(13, 6.5, 9, 3);
  ctx.fillStyle = '#f8dd86';
  ctx.fillRect(-16.5, -5.5, 4.5, 4);
  ctx.fillRect(-16.5, 5.5, 4.5, 4);
  ctx.fillStyle = '#242a2d';
  ctx.fillRect(-11, -4.5, 7.5, 9);
  ctx.fillRect(6, -4.5, 7.5, 9);
  ctx.restore();
}

function updateHud() {
  const opponent = runtime.remoteCar || cars[1];
  p1LapEl.textContent = cars[0].finished ? 'FINISH' : `Lap ${Math.min(cars[0].lap + 1, 2)}/2`;
  p1SpeedEl.textContent = `${Math.round(Math.abs(cars[0].speed))} km/h`;
  p1DriftEl.textContent = `${Math.round(cars[0].driftScore)}`;

  p2NameEl.textContent = opponent.name || 'Player 2';
  p2LapEl.textContent = opponent.finished ? 'FINISH' : `Lap ${Math.min((opponent.lap || 0) + 1, 2)}/2`;
  p2SpeedEl.textContent = `${Math.round(Math.abs(opponent.speed || 0))} km/h`;
  p2DriftEl.textContent = `${Math.round(opponent.driftScore || 0)}`;
}

function getMultiplayerUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname || 'localhost';
  const codespacesHost = host.match(/^(.*)-\d+\.app\.github\.dev$/);
  if (codespacesHost) return `${protocol}//${codespacesHost[1]}-3000.app.github.dev`;
  return `${protocol}//${host}:3000`;
}

function connectToMultiplayer() {
  runtime.account = readSektorSession();
  if (!runtime.account) {
    setStatus('Sign in to your Sektor account to play online.');
    window.location.href = './VUS-Servers.html?returnTo=rally';
    return;
  }

  runtime.playerId = runtime.account.key;
  const url = getMultiplayerUrl();

  if (runtime.socket) {
    runtime.socket.close();
    runtime.socket = null;
  }

  runtime.socket = new WebSocket(url);
  runtime.socket.addEventListener('open', () => {
    runtime.connected = true;
    setStatus(`Online as @${runtime.account.username} · connecting to multiplayer`);
    runtime.socket.send(JSON.stringify({
      type: 'join',
      room: runtime.room,
      id: runtime.account.key,
      name: runtime.account.username,
      color: '#ff7a7a',
    }));
  });

  runtime.socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'room-sync') {
        setStatus(`Online as @${runtime.account.username}`);
        const ownIndex = message.players.findIndex((player) => player.id === runtime.playerId);
        runtime.localSlot = Math.max(0, ownIndex);
        cars[0].color = runtime.localSlot === 0 ? '#ff7a7a' : '#68b9ff';
        cars[0].name = `Driver ${runtime.localSlot + 1}`;
        placeCarAtStart(cars[0], runtime.localSlot);
        const remoteIndex = message.players.findIndex((player) => player.id !== runtime.playerId);
        const remote = message.players[remoteIndex];
        if (remote) {
          const remoteSlot = remoteIndex === 0 ? 0 : 1;
          runtime.remoteCar = {
            ...cars[1], id: remote.id, name: remote.name,
            color: remoteSlot === 0 ? '#ff7a7a' : '#68b9ff', remote: true,
          };
          placeCarAtStart(runtime.remoteCar, remoteSlot);
          p2NameEl.textContent = remote.name;
        }
      }

      if (message.type === 'player-update' && message.id !== runtime.playerId) {
        if (!runtime.remoteCar) {
          runtime.remoteCar = { ...cars[1], id: message.id, color: '#68b9ff', remote: true };
        }
        const { x, y, angle, ...state } = message.state;
        runtime.remoteCar.targetState = { x, y, angle };
        Object.assign(runtime.remoteCar, state);
      }

      if (message.type === 'player-left') {
        runtime.remoteCar = null;
        p2NameEl.textContent = 'Player 2';
      }
    } catch (error) {
      // noop
    }
  });

  runtime.socket.addEventListener('close', () => {
    runtime.connected = false;
    setStatus('Cross-PC disconnected — running local race mode');
  });

  runtime.socket.addEventListener('error', () => {
    setStatus('Could not connect to the multiplayer server.');
  });
}

function sendState() {
  if (!runtime.socket || runtime.socket.readyState !== WebSocket.OPEN) return;
  runtime.socket.send(JSON.stringify({
    type: 'state',
    room: runtime.room,
    id: runtime.playerId,
    state: {
      x: cars[0].x,
      y: cars[0].y,
      angle: cars[0].angle,
      speed: cars[0].speed,
      driftVelocity: cars[0].driftVelocity,
      lap: cars[0].lap,
      checkpoint: cars[0].checkpoint,
      driftScore: cars[0].driftScore,
      finished: cars[0].finished,
      color: cars[0].color,
      name: cars[0].name,
      boostMeter: cars[0].boostMeter,
    },
  }));
}

function smoothRemoteCar(dt) {
  const car = runtime.remoteCar;
  if (!car || !car.targetState) return;

  const blend = 1 - Math.exp(-dt * 14);
  car.x += (car.targetState.x - car.x) * blend;
  car.y += (car.targetState.y - car.y) * blend;
  const angleDelta = Math.atan2(
    Math.sin(car.targetState.angle - car.angle),
    Math.cos(car.targetState.angle - car.angle)
  );
  car.angle += angleDelta * blend;
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (!event.repeat && key === 'r') resetRace();
  if (!event.repeat && key === 'enter') window.location.href = './VUS-Servers.html';
  pressed.add(key);
  if (event.code === 'Space') pressed.add(' ');
  if (key === ' ') event.preventDefault();
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  pressed.delete(key);
  if (event.code === 'Space') pressed.delete(' ');
});

mapSelect.addEventListener('change', (event) => chooseMap(Number(event.target.value)));
resetBtn.addEventListener('click', resetRace);
connectBtn.addEventListener('click', connectToMultiplayer);

let lastTime = 0;
let lastSyncAt = 0;
function frame(timestamp) {
  const dt = Math.min(0.032, (timestamp - lastTime) / 1000 || 0.016);
  lastTime = timestamp;

  updateCar(cars[0], dt, MAPS[runtime.mapIndex]);
  updateCar(cars[1], dt, MAPS[runtime.mapIndex]);

  if (runtime.connected && timestamp - lastSyncAt > 80) {
    sendState();
    lastSyncAt = timestamp;
  }
  smoothRemoteCar(dt);

  drawMap(MAPS[runtime.mapIndex]);
  drawBoostMeter(cars[0]);
  drawBoostMeter(cars[1]);
  drawCar(cars[0]);
  drawCar(runtime.remoteCar || cars[1]);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = '600 18px sans-serif';
  ctx.fillText('W A S D: drive · X: handbrake drift · R: restart · Enter: menu', 26, canvas.height - 18);

  if (cars[0].finished) {
    ctx.fillStyle = 'rgba(0,0,0,0.66)';
    ctx.fillRect(0, canvas.height / 2 - 48, canvas.width, 96);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '700 36px sans-serif';
    ctx.fillText('FINISH  ·  PRESS R TO RACE AGAIN', canvas.width / 2, canvas.height / 2 + 12);
    ctx.textAlign = 'start';
  }

  updateHud();
  requestAnimationFrame(frame);
}

chooseMap(0);
resetRace();
p1NameEl.textContent = 'Player 1';
p2NameEl.textContent = 'Player 2';
requestAnimationFrame(frame);
