const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const host = '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const root = __dirname;
const dataFile = path.join(root, '.sektor-lan-data.json');
const mimeTypes = {
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml'
};
const clients = new Set();
let data = {};
let pendingSave = Promise.resolve();

try {
  data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected a JSON object.');
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.error('Could not read LAN server data:', error.message);
    process.exit(1);
  }
}

function segments(pathname) {
  return pathname.split('/').filter(Boolean);
}

function readAt(pathname) {
  let value = data;
  for (const segment of segments(pathname)) {
    if (value == null || typeof value !== 'object') return null;
    value = value[segment];
  }
  return value === undefined ? null : value;
}

function writeAt(pathname, value) {
  const keys = segments(pathname);
  if (keys.some(key => ['__proto__','constructor','prototype'].includes(key))) {
    throw new Error('Invalid data path.');
  }
  if (!keys.length) {
    if (value != null && (typeof value !== 'object' || Array.isArray(value))) throw new Error('Root data must be an object.');
    data = value == null ? {} : resolveServerValues(value);
    return;
  }
  let parent = data;
  for (const key of keys.slice(0, -1)) {
    if (!parent[key] || typeof parent[key] !== 'object' || Array.isArray(parent[key])) parent[key] = {};
    parent = parent[key];
  }
  if (value == null) delete parent[keys[keys.length - 1]];
  else parent[keys[keys.length - 1]] = resolveServerValues(value);
}

function resolveServerValues(value) {
  if (Array.isArray(value)) return value.map(resolveServerValues);
  if (!value || typeof value !== 'object') return value;
  if (value['.sv'] === 'timestamp') return Date.now();
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolveServerValues(child)]));
}

function persist() {
  const serialized = JSON.stringify(data);
  const save = pendingSave.catch(() => {})
    .then(() => fs.promises.writeFile(dataFile + '.tmp', serialized))
    .then(() => fs.promises.rename(dataFile + '.tmp', dataFile));
  pendingSave = save;
  return save.catch(error => {
    console.error('Could not save LAN server data:', error.message);
    error.statusCode = 500;
    throw error;
  });
}

function sendJson(response, status, value) {
  response.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  response.end(value === undefined ? '' : JSON.stringify(value));
}

function notify(pathname) {
  for (const client of clients) {
    if (client.path === pathname || client.path.startsWith(pathname + '/') || pathname.startsWith(client.path + '/')) {
      client.response.write('data: ' + JSON.stringify(readAt(client.path)) + '\n\n');
    }
  }
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 16 * 1024 * 1024) {
        reject(new Error('Request body exceeds 16 MB.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || 'null')); }
      catch { reject(new Error('Request body must be valid JSON.')); }
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/') {
    const params = new URLSearchParams(url.searchParams);
    params.set('lan', '1');
    response.writeHead(302, {Location:'/VUS-Servers.html?' + params.toString(), 'Cache-Control':'no-store'});
    return response.end();
  }
  if (url.pathname === '/api/data') {
    const dataPath = url.searchParams.get('path') || '';
    try {
      if (request.method === 'GET') return sendJson(response, 200, readAt(dataPath));
      if (request.method === 'PUT') {
        writeAt(dataPath, await collectBody(request));
        await persist();
        notify(dataPath);
        return sendJson(response, 204);
      }
      if (request.method === 'PATCH') {
        const values = await collectBody(request);
        if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Update body must be an object.');
        for (const [key, value] of Object.entries(values)) writeAt([dataPath, key].filter(Boolean).join('/'), value);
        await persist();
        notify(dataPath);
        Object.keys(values).forEach(key => notify([dataPath, key].filter(Boolean).join('/')));
        return sendJson(response, 204);
      }
      if (request.method === 'DELETE') {
        writeAt(dataPath, null);
        await persist();
        notify(dataPath);
        return sendJson(response, 204);
      }
      response.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
      return sendJson(response, 405, {error:'Method not allowed.'});
    } catch (error) {
      return sendJson(response, error.statusCode || 400, {error:error.message});
    }
  }

  if (url.pathname === '/api/nexus/settle-auctions') {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendJson(response, 405, {error:'Method not allowed.'});
    }
    const world = readAt('nexus/sharedWorld');
    if (!world || !Array.isArray(world.auctions) || !Array.isArray(world.users)) {
      return sendJson(response, 200, world || {});
    }
    if (!Array.isArray(world.chat)) world.chat = [];
    const now = Date.now();
    let changed = false;
    for (const auction of world.auctions) {
      if (auction.status === 'sold' || auction.status === 'unsold' || !Number.isFinite(auction.endsAt) || auction.endsAt > now) continue;
      const seller = world.users.find(user => user.username === auction.seller);
      const bidder = world.users.find(user => user.username === auction.bidder);
      const item = auction.itemData && typeof auction.itemData === 'object' ? auction.itemData : {
        name:auction.item, type:'item', description:'Won in a Nexus auction.'
      };
      if (seller && bidder && bidder.username !== seller.username && Number(auction.bid) > 0) {
        seller.balance = Number(seller.balance || 0) + Number(auction.bid);
        if (!Array.isArray(bidder.inventory)) bidder.inventory = [];
        bidder.inventory.push({...item,id:'inventory-' + now + '-' + Math.random().toString(16).slice(2),quantity:1});
        auction.status = 'sold';
        world.chat.push({user:'Auction',text:auction.item + ' sold to ' + bidder.username + ' for ' + auction.bid + ' Sektorium.'});
      } else {
        if (seller) {
          if (!Array.isArray(seller.inventory)) seller.inventory = [];
          seller.inventory.push({...item,id:'inventory-' + now + '-' + Math.random().toString(16).slice(2),quantity:1});
        }
        if (bidder && Number(auction.bid) > 0) bidder.balance = Number(bidder.balance || 0) + Number(auction.bid);
        auction.status = 'unsold';
        world.chat.push({user:'Auction',text:auction.item + ' ended without a winning bid; the item was returned.'});
      }
      auction.settledAt = now;
      changed = true;
    }
    if (changed) {
      world.chat = world.chat.slice(-100);
      try {
        await persist();
      } catch (error) {
        return sendJson(response, error.statusCode || 500, {error:error.message});
      }
      notify('nexus/sharedWorld');
    }
    return sendJson(response, 200, world);
  }

  if (url.pathname === '/api/nexus/buy') {
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return sendJson(response, 405, {error:'Method not allowed.'});
    }
    try {
      const purchase = await collectBody(request);
      const world = readAt('nexus/sharedWorld');
      if (!world || !Array.isArray(world.listings) || !Array.isArray(world.users)) {
        return sendJson(response, 404, {error:'The Nexus world is not available.'});
      }
      const listing = world.listings.find(entry => entry.id === purchase.listingId);
      const buyer = world.users.find(entry => entry.username === purchase.buyer);
      if (!listing) return sendJson(response, 404, {error:'That listing is no longer available.'});
      if (!buyer) return sendJson(response, 401, {error:'Sign in to buy this item.'});
      if (listing.owner === buyer.username) return sendJson(response, 400, {error:'You cannot buy your own listing.'});
      const price = Number(listing.price);
      if (!Number.isInteger(price) || price < 1) return sendJson(response, 400, {error:'This listing has an invalid price.'});
      if (Number(buyer.balance || 0) < price) return sendJson(response, 400, {error:'You do not have enough Sektorium.'});
      const previousWorld = JSON.parse(JSON.stringify(world));
      buyer.balance = Number(buyer.balance || 0) - price;
      const seller = world.users.find(entry => entry.username === listing.owner);
      if (seller) seller.balance = Number(seller.balance || 0) + price;
      if (!Array.isArray(buyer.inventory)) buyer.inventory = [];
      const itemData = listing.itemData && typeof listing.itemData === 'object' ? listing.itemData : {
        name:listing.name, type:listing.type || 'item', description:'Purchased from the Nexus marketplace.', media:''
      };
      buyer.inventory.push({
        id:'inventory-' + Date.now() + '-' + Math.random().toString(16).slice(2),
        name:itemData.name || listing.name,
        quantity:1,
        type:itemData.type || listing.type || 'item',
        description:itemData.description || 'Purchased from the Nexus marketplace.',
        media:itemData.media || ''
      });
      world.listings = world.listings.filter(entry => entry.id !== listing.id);
      if (!Array.isArray(world.chat)) world.chat = [];
      world.chat.push({user:'Market',text:buyer.username + ' bought ' + listing.name + '.'});
      world.chat = world.chat.slice(-100);
      try {
        await persist();
      } catch (error) {
        writeAt('nexus/sharedWorld', previousWorld);
        throw error;
      }
      notify('nexus/sharedWorld');
      return sendJson(response, 200, world);
    } catch (error) {
      return sendJson(response, error.statusCode || 400, {error:error.message});
    }
  }

  if (url.pathname === '/api/events' && request.method === 'GET') {
    const client = {path:url.searchParams.get('path') || '', response};
    response.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
    response.write('data: ' + JSON.stringify(readAt(client.path)) + '\n\n');
    clients.add(client);
    request.on('close', () => clients.delete(client));
    return;
  }

  const requestedPath = decodeURIComponent(url.pathname === '/' ? '/VUS-Servers.html' : url.pathname);
  const filePath = path.resolve(root, '.' + requestedPath);
  if (!filePath.startsWith(root + path.sep) || path.basename(filePath).startsWith('.')) {
    response.writeHead(404);
    return response.end('Not found');
  }
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(404);
      return response.end('Not found');
    }
    response.writeHead(200, {'Content-Type':mimeTypes[path.extname(filePath)] || 'application/octet-stream','Cache-Control':'no-cache'});
    response.end(contents);
  });
});

server.listen(port, host, () => {
  console.log('Sektor LAN server is ready. Open one of these addresses on this network:');
  const interfaces = os.networkInterfaces();
  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) console.log('  http://' + address.address + ':' + port + '/?lan=1');
    }
  }
  console.log('Share the same address with others on your Wi-Fi. Server data is stored in .sektor-lan-data.json.');
  console.log('Stop the server with Ctrl+C.');
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
