const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const root = __dirname;
const port = process.env.PORT || 3000;
const rooms = new Map();

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

const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch (error) {
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

server.listen(port, () => {
  console.log(`Sektor rally server listening on http://localhost:${port}`);
});
