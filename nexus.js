(() => {
  const lanMode = new URLSearchParams(location.search).get('lan') === '1';
  const firebaseApi = globalThis.firebase;
  const firebaseMode = !lanMode && !!(firebaseApi && firebaseApi.apps && firebaseApi.apps.length);
  const sharedPath = 'nexus/sharedWorld';
  const localDataKey = 'blobtownEconomy';
  const sessionKey = 'blobtownSession';
  const maxChatLength = 180;
  const maxCodeLength = 4000;
  const cloudAuth = firebaseMode ? firebaseApi.auth() : null;
  const cloudWorldRef = firebaseMode ? firebaseApi.database().ref(sharedPath) : null;
  const content = document.getElementById('content');
  const status = document.getElementById('status');
  const connectButton = document.getElementById('connect-button');
  const worldMode = document.getElementById('world-mode');
  const inventoryPage = location.pathname.endsWith('/inventory.html');
  let world = null;
  let lastSavedWorld = null;
  let liveEvents = null;
  let cloudWorldHandler = null;
  let connecting = false;
  let activeTab = 'home';
  let wheelRotation = 0;
  let wheelSpinning = false;
  let artHistory = [];
  let painting = false;
  let lastPaintPoint = null;
  let paintStartPoint = null;
  let paintSnapshot = null;
  let settlingAuctions = false;

  const defaults = () => ({
    users: [],
    listings: [{id:'sample-1',name:'Neon alley poster',type:'art',price:120,owner:'Market'}],
    auctions: [],
    chat: [{user:'System',text:'Welcome to Nexus. Trade, chat, and spin the daily wheel.'}],
    wheelClaims: {}
  });

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[char]));
  const copyWorld = value => JSON.parse(JSON.stringify(value));

  function codeFromMessage(value) {
    const text = String(value ?? '').trim();
    if (!text.startsWith('/code:')) return null;
    let code = text.slice(6);
    if (code.startsWith(' ')) code = code.slice(1);
    if (code.startsWith('\r\n')) code = code.slice(2);
    else if (code.startsWith('\n')) code = code.slice(1);
    return code;
  }
  function serverInviteCode(value) {
    const match = String(value || '').trim().match(/^\/code:\s*([A-Za-z0-9_-]{4,20})\s*$/);
    return match ? match[1].toUpperCase() : null;
  }

  function chatInitials(username) {
    const parts = String(username || '?').trim().split(/[\s_-]+/).filter(Boolean);
    return (parts.length > 1
      ? parts[0].charAt(0) + parts[1].charAt(0)
      : Array.from(parts[0] || '?').slice(0, 2).join('')).toUpperCase();
  }

  function codeCardMarkup(code) {
    return '<section class="nexus-code-card"><header><span>SEKTOR CODE</span><button class="nexus-code-copy" type="button" data-action="copy-code">Copy</button></header><pre><code>' +
      escapeHtml(code) + '</code></pre></section>';
  }

  function renderChatMessage(message) {
    const username = String(message.user || 'Unknown');
    const text = String(message.text || '');
    const code = codeFromMessage(text);
    const inviteCode = serverInviteCode(text);
    const content = code === null
      ? '<div class="nexus-chat-text">' + escapeHtml(text) + '</div>'
      : inviteCode
        ? '<div class="nexus-server-invite-loading" data-server-invite="' + escapeHtml(inviteCode) + '">Loading server invite…</div>'
        : codeCardMarkup(code);
    return '<article class="nexus-chat-line"><span class="nexus-chat-avatar" aria-hidden="true">' +
      escapeHtml(chatInitials(username)) + '</span><div class="nexus-chat-message"><header><strong>' +
      escapeHtml(username) + '</strong></header>' + content + '</div></article>';
  }

  const inviteLookups = new Map();
  function lookupServerInvite(code) {
    if (!inviteLookups.has(code)) {
      const lookup = (async () => {
        if (firebaseMode) {
          try {
            const snapshot = await firebaseApi.database().ref('serverMeta/' + code).get();
            if (snapshot.exists()) return {code,...snapshot.val()};
          } catch (error) {
            console.error('[Nexus] Could not look up server invite ' + code + '.', error);
          }
        }
        try {
          const localServers = JSON.parse(localStorage.getItem('vusServersLocal') || '[]');
          return Array.isArray(localServers) ? localServers.find(server =>
            server && String(server.code || '').toUpperCase() === code
          ) || null : null;
        } catch (error) {
          console.error('[Nexus] Could not read local server invites.', error);
          return null;
        }
      })();
      inviteLookups.set(code, lookup);
    }
    return inviteLookups.get(code);
  }

  function serverInviteIconSource(icon) {
    if (typeof icon !== 'string') return '';
    if (/^https:\/\/[^<>"']+$/i.test(icon) ||
        /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(icon)) return icon;
    return '';
  }

  function renderServerInvite(server, code) {
    const accent = /^#[0-9a-f]{6}$/i.test(server.accent || '') ? server.accent : '#65e6ad';
    const name = String(server.name || 'Sektor server');
    const iconSource = serverInviteIconSource(server.icon);
    const icon = iconSource
      ? '<img src="' + escapeHtml(iconSource) + '" alt="">'
      : escapeHtml(chatInitials(name));
    const joinUrl = new URL('./VUS-Servers.html', location.href);
    joinUrl.searchParams.set('join', code);
    if (lanMode) joinUrl.searchParams.set('lan', '1');
    return '<a class="nexus-server-invite" href="' + escapeHtml(joinUrl.href) + '" style="--server-accent:' + accent + '">' +
      '<span class="nexus-server-invite-banner"></span><span class="nexus-server-invite-icon">' + icon +
      '</span><span class="nexus-server-invite-details"><strong>' + escapeHtml(name) +
      '</strong><span class="nexus-server-invite-join">Open in Sektor →</span></span></a>';
  }

  function hydrateServerInvites() {
    content.querySelectorAll('.nexus-server-invite-loading').forEach(async placeholder => {
      const code = placeholder.dataset.serverInvite;
      if (!code) return;
      const server = await lookupServerInvite(code);
      if (!placeholder.isConnected) return;
      if (server) {
        placeholder.insertAdjacentHTML('beforebegin', renderServerInvite(server, code));
        const invite = placeholder.previousElementSibling;
        const image = invite && invite.querySelector('.nexus-server-invite-icon img');
        if (image) image.addEventListener('error', () => {
          image.parentElement.textContent = chatInitials(server.name || 'Sektor server');
        }, {once:true});
        placeholder.remove();
        return;
      }
      placeholder.outerHTML = codeCardMarkup(code);
    });
  }

  function currency(amount) {
    return '<span class="nexus-money"><span class="nexus-currency" aria-label="Sektorium"></span><span>' +
      Number(amount || 0) + '</span></span>';
  }

  function mediaPreview(media, label) {
    if (typeof media !== 'string') return '';
    const safeLabel = escapeHtml(label);
    if (/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(media)) {
      return '<img class="nexus-art-preview" src="' + media + '" alt="' + safeLabel + '">';
    }
    if (/^data:audio\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+$/.test(media)) {
      return '<audio class="nexus-audio-preview" controls controlslist="nodownload noremoteplayback" disablepictureinpicture preload="none" src="' + media + '" aria-label="' + safeLabel + '"></audio>';
    }
    if (/^data:video\/(mp4|webm|ogg|quicktime|mpeg|3gpp|3gpp2);base64,[a-zA-Z0-9+/=]+$/.test(media)) {
      return '<video class="nexus-video-preview" controls controlslist="nodownload noremoteplayback" disablepictureinpicture preload="metadata" src="' + media + '" aria-label="' + safeLabel + '"></video>';
    }
    return '';
  }

  function mediaExportDetails(media) {
    if (typeof media !== 'string') return null;
    const match = media.match(/^data:(image\/png|audio\/[a-zA-Z0-9.+-]+|video\/(mp4|webm|ogg|quicktime|mpeg|3gpp|3gpp2));base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) return null;
    const mimeType = match[1];
    const extensions = {
      'image/png':'png',
      'audio/mpeg':'mp3','audio/wav':'wav','audio/ogg':'ogg','audio/mp4':'m4a',
      'audio/aac':'aac','audio/flac':'flac','audio/opus':'opus','audio/webm':'webm',
      'video/mp4':'mp4','video/webm':'webm','video/ogg':'ogv',
      'video/quicktime':'mov','video/mpeg':'mpeg','video/3gpp':'3gp','video/3gpp2':'3g2'
    };
    const extension = Object.prototype.hasOwnProperty.call(extensions, mimeType) ? extensions[mimeType] : '';
    return extension ? {mimeType, extension, encoded:match[3]} : null;
  }

  async function downloadBlob(blob, filename) {
    const exportTab = window.open('about:blank', '_blank');
    if (!exportTab) throw new Error('Your browser blocked the export tab. Allow pop-ups for Nexus and try again.');
    exportTab.opener = null;
    const url = URL.createObjectURL(blob);
    const safeFilename = String(filename || 'nexus-export').replace(/[&<>"']/g, character => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[character]));
    const safeUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const mimeType = String(blob.type || 'application/octet-stream');
    let preview = '<p class="note">Preview is not available for this file type. Use the download button to save it.</p>';
    if (mimeType.startsWith('image/')) {
      preview = '<img class="media image" src="' + safeUrl + '" alt="' + safeFilename + '">';
    } else if (mimeType.startsWith('audio/')) {
      preview = '<audio class="media" controls autoplay src="' + safeUrl + '"></audio>';
    } else if (mimeType.startsWith('video/')) {
      preview = '<video class="media" controls autoplay src="' + safeUrl + '"></video>';
    } else if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      preview = '<pre id="text-preview">Preparing preview…</pre>';
    }

    const documentMarkup = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + safeFilename +
      ' · Nexus export</title><style>*{box-sizing:border-box}body{min-height:100vh;margin:0;padding:clamp(18px,5vw,56px);background:radial-gradient(ellipse at 50% 0,#1c3025,#101713 60%);color:#edf5ef;font:14px system-ui,sans-serif}.card{width:min(880px,100%);margin:0 auto;padding:clamp(18px,4vw,34px);border:1px solid #c2e2ca28;border-radius:18px;background:#151e19ed;box-shadow:0 22px 70px #0006}.eyebrow{color:#88d9a5;font-size:10px;font-weight:800;letter-spacing:.16em}.title{margin:10px 0 5px;overflow-wrap:anywhere;font-size:clamp(22px,5vw,34px)}.meta{margin:0 0 22px;color:#9cac9f;font-size:12px}.download{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin:0 0 18px;padding:0 18px;border:1px solid #c5fb89;border-radius:9px;background:linear-gradient(135deg,#a5f06d,#65e6ad);color:#182012;font-weight:800;text-decoration:none}.download:hover{filter:brightness(1.08)}.preview{display:grid;min-height:90px;place-items:center;padding:14px;border:1px solid #d5e2d51b;border-radius:12px;background:#0d1410}.media{display:block;max-width:100%;max-height:70vh}.image{object-fit:contain}.note{color:#a8b8ac;text-align:center}pre{width:100%;max-height:65vh;overflow:auto;margin:0;color:#d8eadc;font:12px/1.55 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}</style></head>' +
      '<body><main class="card"><div class="eyebrow">NEXUS · FILE EXPORT</div><h1 class="title">' + safeFilename +
      '</h1><p class="meta">' + mimeType.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character])) +
      ' · ' + (blob.size / 1024).toFixed(1) + ' KB</p><a class="download" href="' + safeUrl +
      '" download="' + safeFilename + '">Download file</a><section class="preview">' + preview +
      '</section></main><script>const url=' + JSON.stringify(url) +
      ';window.addEventListener("pagehide",()=>URL.revokeObjectURL(url),{once:true});</scr' + 'ipt></body></html>';
    exportTab.document.open();
    exportTab.document.write(documentMarkup);
    exportTab.document.close();
    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      try {
        const text = await blob.text();
        const previewElement = exportTab.document.getElementById('text-preview');
        if (previewElement) previewElement.textContent = text;
      } catch (error) {
        URL.revokeObjectURL(url);
        exportTab.close();
        throw new Error('Could not prepare a preview of this export.');
      }
    }
    return 'tab';
  }

  async function exportInventoryMedia(item) {
    const details = mediaExportDetails(item.media);
    if (!details) throw new Error('This inventory item does not contain a supported exportable file.');
    const filename = String(item.name || 'nexus-file')
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .replace(/[. ]+$/g, '')
      .trim()
      .slice(0, 80) || 'nexus-file';
    const binary = atob(details.encoded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return downloadBlob(new Blob([bytes], {type:details.mimeType}), filename + '.' + details.extension);
  }

  async function exportWorld() {
    if (!world) {
      setStatus('Connect to Nexus before exporting the world.', true);
      return;
    }
    const exportData = normalize(world);
    exportData.users = exportData.users.map(({password, ...user}) => user);
    const payload = JSON.stringify(exportData, null, 2);
    const method = await downloadBlob(new Blob([payload], {type:'application/json'}), 'nexus-world-' + new Date().toISOString().slice(0,10) + '.json');
    setStatus(method === 'tab'
      ? 'Your world export is open in a new tab. Download it there.'
      : 'World export started.');
  }

  function normalize(value) {
    const base = defaults();
    const records = (items, fallback, limit) => (Array.isArray(items) ? items : fallback)
      .filter(item => item && typeof item === 'object' && !Array.isArray(item))
      .slice(-limit);
    return {
      users: records(value && value.users, base.users, 500),
      listings: records(value && value.listings, base.listings, 100),
      auctions: records(value && value.auctions, base.auctions, 100)
        .filter(item => item.status === 'sold' || item.status === 'unsold' || Number.isFinite(item.endsAt)),
      chat: records(value && value.chat, base.chat, 100),
      wheelClaims: value && value.wheelClaims && typeof value.wheelClaims === 'object' ? value.wheelClaims : {}
    };
  }

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  function currentSession() {
    try {
      return JSON.parse(localStorage.getItem(sessionKey) || 'null');
    } catch (error) {
      console.error('[Nexus] Could not read the local session.', error);
      return null;
    }
  }

  function currentUser() {
    const session = currentSession();
    return session && world ? world.users.find(user => user.username === session.username) || null : null;
  }

  function inventoryFor(user) {
    if (!Array.isArray(user.inventory)) user.inventory = [];
    return user.inventory;
  }

  function quantityCost(quantity) {
    return Math.max(0, Number(quantity || 0) - 1) * 10;
  }

  function chargeQuantityCost(user, quantity) {
    const cost = quantityCost(quantity);
    if (cost <= 0) return;
    const balance = Number(user.balance || 0);
    if (balance < cost) throw new Error('You need ' + cost + ' Sektorium to stock ' + quantity + ' of this item.');
    user.balance = balance - cost;
  }

  function floodFill(canvas, context, point, hexColor) {
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(point.x)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(point.y)));
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    const start = (y * canvas.width + x) * 4;
    const target = [pixels[start], pixels[start + 1], pixels[start + 2], pixels[start + 3]];
    const fill = [parseInt(hexColor.slice(1,3),16),parseInt(hexColor.slice(3,5),16),parseInt(hexColor.slice(5,7),16),255];
    if (target.every((value,index) => value === fill[index])) return;
    const queue = new Uint32Array(canvas.width * canvas.height);
    let head = 0;
    let tail = 0;
    const addPixel = index => {
      const offset = index * 4;
      if (pixels[offset] !== target[0] || pixels[offset + 1] !== target[1] ||
          pixels[offset + 2] !== target[2] || pixels[offset + 3] !== target[3]) return;
      pixels[offset] = fill[0];
      pixels[offset + 1] = fill[1];
      pixels[offset + 2] = fill[2];
      pixels[offset + 3] = fill[3];
      queue[tail++] = index;
    };
    addPixel(y * canvas.width + x);
    while (head < tail) {
      const index = queue[head++];
      const pixelX = index % canvas.width;
      const pixelY = Math.floor(index / canvas.width);
      if (pixelX > 0) addPixel(index - 1);
      if (pixelX + 1 < canvas.width) addPixel(index + 1);
      if (pixelY > 0) addPixel(index - canvas.width);
      if (pixelY + 1 < canvas.height) addPixel(index + canvas.width);
    }
    context.putImageData(image, 0, 0);
  }

  function installArtMaker() {
    const canvas = content.querySelector('[data-art-canvas]');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    artHistory = [];
    context.lineCap = 'round';
    context.lineJoin = 'round';

    function pointFromEvent(event) {
      const bounds = canvas.getBoundingClientRect();
      return {
        x:(event.clientX - bounds.left) * canvas.width / bounds.width,
        y:(event.clientY - bounds.top) * canvas.height / bounds.height
      };
    }

    canvas.addEventListener('pointerdown', event => {
      event.preventDefault();
      const point = pointFromEvent(event);
      const tool = content.querySelector('[data-art-control="tool"]').value;
      const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
      if (tool === 'fill') {
        artHistory.push(snapshot);
        if (artHistory.length > 20) artHistory.shift();
        floodFill(canvas, context, point, content.querySelector('[data-art-control="color"]').value);
        return;
      }
      if (tool === 'text') {
        const text = String(content.querySelector('[data-art-control="text"]').value || '').trim();
        if (!text) {
          setStatus('Enter some text before placing it on the canvas.', true);
          return;
        }
        artHistory.push(snapshot);
        if (artHistory.length > 20) artHistory.shift();
        const size = Number(content.querySelector('[data-art-control="size"]').value);
        const font = content.querySelector('[data-art-control="font"]').value;
        context.save();
        context.fillStyle = content.querySelector('[data-art-control="color"]').value;
        context.font = 'bold ' + (size * 2) + 'px ' + font;
        context.textBaseline = 'top';
        const maxWidth = Math.max(1, canvas.width - point.x - 12);
        const lines = [];
        for (const paragraph of text.split('\n')) {
          let line = '';
          for (const word of paragraph.split(/\s+/)) {
            const nextLine = line ? line + ' ' + word : word;
            if (line && context.measureText(nextLine).width > maxWidth) {
              lines.push(line);
              line = word;
            } else {
              line = nextLine;
            }
          }
          lines.push(line);
        }
        lines.forEach((line,index) => context.fillText(line, point.x, point.y + index * size * 2.4, maxWidth));
        context.restore();
        return;
      }
      artHistory.push(snapshot);
      if (artHistory.length > 20) artHistory.shift();
      painting = true;
      lastPaintPoint = point;
      paintStartPoint = lastPaintPoint;
      paintSnapshot = artHistory[artHistory.length - 1];
      canvas.setPointerCapture(event.pointerId);
      context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      context.strokeStyle = content.querySelector('[data-art-control="color"]').value;
      context.lineWidth = Number(content.querySelector('[data-art-control="size"]').value);
      if (tool === 'brush' || tool === 'eraser') {
        context.beginPath();
        context.fillStyle = content.querySelector('[data-art-control="color"]').value;
        context.arc(lastPaintPoint.x, lastPaintPoint.y, Number(content.querySelector('[data-art-control="size"]').value) / 2, 0, Math.PI * 2);
        context.fill();
      }
    });

    canvas.addEventListener('pointermove', event => {
      if (!painting || !lastPaintPoint) return;
      const nextPoint = pointFromEvent(event);
      const tool = content.querySelector('[data-art-control="tool"]').value;
      context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      context.strokeStyle = content.querySelector('[data-art-control="color"]').value;
      context.lineWidth = Number(content.querySelector('[data-art-control="size"]').value);
      if (tool !== 'brush' && tool !== 'eraser') {
        context.putImageData(paintSnapshot, 0, 0);
        context.beginPath();
        if (tool === 'line') {
          context.moveTo(paintStartPoint.x, paintStartPoint.y);
          context.lineTo(nextPoint.x, nextPoint.y);
        } else if (tool === 'rectangle') {
          context.rect(paintStartPoint.x, paintStartPoint.y, nextPoint.x - paintStartPoint.x, nextPoint.y - paintStartPoint.y);
        } else if (tool === 'circle') {
          const radiusX = (nextPoint.x - paintStartPoint.x) / 2;
          const radiusY = (nextPoint.y - paintStartPoint.y) / 2;
          context.ellipse(paintStartPoint.x + radiusX, paintStartPoint.y + radiusY, Math.abs(radiusX), Math.abs(radiusY), 0, 0, Math.PI * 2);
        }
        context.stroke();
        lastPaintPoint = nextPoint;
        return;
      }
      context.beginPath();
      context.moveTo(lastPaintPoint.x, lastPaintPoint.y);
      context.lineTo(nextPoint.x, nextPoint.y);
      context.stroke();
      lastPaintPoint = nextPoint;
    });

    const stopPainting = () => {
      painting = false;
      lastPaintPoint = null;
      paintStartPoint = null;
      paintSnapshot = null;
      context.globalCompositeOperation = 'source-over';
    };
    canvas.addEventListener('pointerup', stopPainting);
    canvas.addEventListener('pointercancel', stopPainting);
    canvas.addEventListener('lostpointercapture', stopPainting);
  }

  async function requestWorld(method, value) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/api/data?path=' + encodeURIComponent(sharedPath), {
        method,
        signal:controller.signal,
        headers:value === undefined ? {} : {'Content-Type':'application/json'},
        body:value === undefined ? undefined : JSON.stringify(value)
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || 'Shared world request failed (' + response.status + ').');
      }
      return response.status === 204 ? null : response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function ensureFirebaseAccess() {
    if (!firebaseMode || cloudAuth.currentUser) return;
    try {
      await cloudAuth.signInAnonymously();
    } catch (error) {
      console.error('[Nexus] Could not authenticate with Firebase.', error);
      throw new Error('Could not connect to the shared world. Anonymous sign-in may need to be enabled in Firebase Authentication.');
    }
  }

  async function connect() {
    if (connecting || world) return;
    connecting = true;
    connectButton.disabled = true;
    connectButton.textContent = 'Connecting…';
    setStatus('Connecting to the ' + (lanMode || firebaseMode ? 'shared' : 'local') + ' world…');
    try {
      if (lanMode) {
        const saved = await requestWorld('GET');
        world = saved == null ? normalize(defaults()) : normalize(saved);
        if (saved == null) await requestWorld('PUT', world);
        worldMode.textContent = 'Shared multiplayer world';
        subscribeToWorld();
      } else if (firebaseMode) {
        await ensureFirebaseAccess();
        const result = await cloudWorldRef.transaction(current =>
          current == null ? normalize(defaults()) : current
        );
        world = normalize(result.snapshot.val());
        worldMode.textContent = 'Shared multiplayer world';
        subscribeToCloudWorld();
      } else {
        let saved = null;
        try {
          saved = JSON.parse(localStorage.getItem(localDataKey) || 'null');
        } catch (error) {
          throw new Error('Saved Nexus data could not be read from this browser.');
        }
        world = saved ? normalize(saved) : normalize(defaults());
        worldMode.textContent = 'This browser only · not multiplayer';
        if (!saved) localStorage.setItem(localDataKey, JSON.stringify(world));
      }
      lastSavedWorld = copyWorld(world);
      setStatus(lanMode || firebaseMode ? 'Connected to the shared Nexus world.' : 'Connected to your local Nexus world.');
      render();
      await settleExpiredAuctions();
    } catch (error) {
      world = null;
      setStatus(error.name === 'AbortError' ? 'The connection timed out. Check the server and try again.' : error.message || 'Could not connect to Nexus.', true);
      console.error('[Nexus] Could not connect to the world.', error);
    } finally {
      connecting = false;
      connectButton.disabled = !!world;
      connectButton.textContent = world ? 'Connected' : 'Connect to Nexus';
    }
  }

  function subscribeToWorld() {
    if (liveEvents) liveEvents.close();
    liveEvents = new EventSource('/api/events?path=' + encodeURIComponent(sharedPath));
    liveEvents.onmessage = event => {
      try {
        const value = JSON.parse(event.data);
        if (value && typeof value === 'object') {
          world = normalize(value);
          lastSavedWorld = copyWorld(world);
          render();
        }
      } catch (error) {
        console.error('[Nexus] Could not apply a live world update.', error);
        setStatus('A live world update could not be read.', true);
      }
    };
    liveEvents.onerror = () => {
      setStatus('Live updates disconnected. The browser will retry automatically.', true);
    };
    liveEvents.onopen = () => setStatus('Connected to the shared Nexus world.');
  }

  function subscribeToCloudWorld() {
    if (cloudWorldHandler) cloudWorldRef.off('value', cloudWorldHandler);
    cloudWorldHandler = snapshot => {
      const value = snapshot.val();
      if (value && typeof value === 'object') {
        world = normalize(value);
        lastSavedWorld = copyWorld(world);
        render();
      }
    };
    cloudWorldRef.on('value', cloudWorldHandler, error => {
      setStatus('Live updates disconnected. Check your Firebase connection and database rules.', true);
      console.error('[Nexus] Could not receive live world updates.', error);
    });
  }

  async function persist(successMessage) {
    const next = normalize(world);
    const previous = lastSavedWorld;
    world = next;
    try {
      if (lanMode) await requestWorld('PUT', world);
      else if (firebaseMode) await cloudWorldRef.set(world);
      else localStorage.setItem(localDataKey, JSON.stringify(world));
      lastSavedWorld = copyWorld(world);
      setStatus(successMessage);
      render();
    } catch (error) {
      if (previous) world = previous;
      setStatus(error.name === 'AbortError' ? 'Saving timed out. Try again.' : error.message || 'Could not save Nexus data.', true);
      console.error('[Nexus] Could not save the world.', error);
      render();
    }
  }

  async function settleExpiredAuctions() {
    if (!world || settlingAuctions || !world.auctions.some(auction =>
      auction.status !== 'sold' && auction.status !== 'unsold' && Number(auction.endsAt) <= Date.now())) return;
    settlingAuctions = true;
    try {
      if (lanMode) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch('/api/nexus/settle-auctions', {method:'POST',signal:controller.signal});
          if (!response.ok) throw new Error((await response.text()) || 'Could not settle expired auctions.');
          const updated = await response.json();
          if (updated && typeof updated === 'object') {
            world = normalize(updated);
            lastSavedWorld = copyWorld(world);
          }
        } finally {
          clearTimeout(timer);
        }
      } else if (firebaseMode) {
        settleExpiredAuctionsInWorld(world, Date.now());
        await cloudWorldRef.set(world);
        lastSavedWorld = copyWorld(world);
      } else {
        settleExpiredAuctionsInWorld(world, Date.now());
        localStorage.setItem(localDataKey, JSON.stringify(world));
        lastSavedWorld = copyWorld(world);
      }
      render();
    } catch (error) {
      if (lastSavedWorld) world = copyWorld(lastSavedWorld);
      setStatus(error.name === 'AbortError' ? 'Auction settlement timed out. It will retry.' : error.message || 'Could not settle expired auctions.', true);
      console.error('[Nexus] Could not settle expired auctions.', error);
    } finally {
      settlingAuctions = false;
    }
  }

  function settleExpiredAuctionsInWorld(target, now) {
    for (const auction of target.auctions) {
      if (auction.status === 'sold' || auction.status === 'unsold' || Number(auction.endsAt) > now) continue;
      const seller = target.users.find(entry => entry.username === auction.seller);
      const bidder = target.users.find(entry => entry.username === auction.bidder);
      const item = auction.itemData && typeof auction.itemData === 'object' ? auction.itemData : {
        name:auction.item, quantity:1, type:'item', description:'Won in a Nexus auction.'
      };
      if (seller && bidder && bidder.username !== seller.username && Number(auction.bid) > 0) {
        seller.balance = Number(seller.balance || 0) + Number(auction.bid);
        inventoryFor(bidder).push({...item,id:'inventory-' + Date.now() + '-' + Math.random().toString(16).slice(2),quantity:1});
        auction.status = 'sold';
        target.chat.push({user:'Auction',text:auction.item + ' sold to ' + bidder.username + ' for ' + auction.bid + ' Sektorium.'});
      } else {
        if (seller) inventoryFor(seller).push({...item,id:'inventory-' + Date.now() + '-' + Math.random().toString(16).slice(2),quantity:1});
        if (bidder && Number(auction.bid) > 0) bidder.balance = Number(bidder.balance || 0) + Number(auction.bid);
        auction.status = 'unsold';
        target.chat.push({user:'Auction',text:auction.item + ' ended without a winning bid; the item was returned.'});
      }
      auction.settledAt = now;
    }
  }

  function isAuctionActive(auction, now = Date.now()) {
    return auction.status !== 'sold' && auction.status !== 'unsold' &&
      Number.isFinite(auction.endsAt) && Number(auction.endsAt) > now;
  }

  function updateAuctionCountdowns() {
    for (const node of content.querySelectorAll('[data-auction-end]')) {
      const remaining = Math.max(0, Number(node.dataset.auctionEnd) - Date.now());
      if (remaining === 0) {
        node.closest('.nexus-item').remove();
        continue;
      }
      const seconds = Math.floor(remaining / 1000);
      node.textContent = 'Ends in ' + Math.floor(seconds / 3600) + 'h ' + Math.floor(seconds % 3600 / 60) + 'm ' + seconds % 60 + 's';
    }
    settleExpiredAuctions();
  }

  function inventoryUrl() {
    return './inventory.html' + (lanMode ? '?lan=1' : '');
  }

  function renderInventory(user) {
    const items = inventoryFor(user);
    const rows = items.map(item => {
      const media = typeof item.media === 'string' ? item.media : '';
      const preview = mediaPreview(media, item.name);
      const exportButton = mediaExportDetails(media)
        ? '<button class="nexus-button secondary" type="button" data-action="export-inventory" data-id="' +
          escapeHtml(item.id) + '" aria-label="Export ' + escapeHtml(item.name) + '">Export</button>'
        : '';
      return '<div class="nexus-item"><div><strong>' + escapeHtml(item.name) +
        '</strong><small>' + escapeHtml(item.type || 'item') + ' · Quantity ' + Number(item.quantity || 1) +
        (item.description ? ' · ' + escapeHtml(item.description) : '') +
        '</small>' + preview + '</div><div class="nexus-item-actions">' + exportButton +
        '<button class="nexus-button secondary" type="button" data-action="edit-inventory" data-id="' +
        escapeHtml(item.id) + '">Edit</button><button class="nexus-button secondary" type="button" data-action="remove-inventory" data-id="' +
        escapeHtml(item.id) + '" aria-label="Remove ' + escapeHtml(item.name) + ' from inventory">Remove</button></div></div>';
    }).join('');
    const auctionOptions = items.filter(item => Number(item.quantity || 0) > 0).map(item =>
      '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + ' · ' + Number(item.quantity) + ' available</option>').join('');
    return '<section class="nexus-card nexus-inventory-panel"><h2>Inventory</h2><button class="nexus-button secondary" type="button" data-action="export-world">Export world</button><div class="nexus-list">' +
      (rows || '<div class="nexus-empty">Your inventory is empty. Add your first item below.</div>') +
      '</div><form class="nexus-form nexus-inventory-form" data-form="inventory-add">' +
      '<input name="name" maxlength="32" placeholder="Item name" required>' +
      '<input name="quantity" type="number" min="1" max="9999" value="1" required>' +
      '<small class="nexus-wheel-help">Each quantity beyond the first costs 10 Sektorium.</small>' +
      '<select name="type"><option>item</option><option>art</option><option>sound</option><option>video</option><option>collectible</option></select>' +
      '<input name="description" maxlength="120" placeholder="Description (optional)">' +
      '<button class="nexus-button">Add to inventory</button></form>' +
      '<section class="nexus-art-maker" data-art-editor><h3>Art maker</h3><p>Brush, eraser, line, rectangle, and ellipse tools with adjustable colors and brush size.</p>' +
      '<div class="nexus-art-toolbar"><label>Color <input type="color" value="#17251c" data-art-control="color"></label>' +
      '<label>Brush / text size <input type="range" min="1" max="40" value="8" data-art-control="size"></label>' +
      '<label>Tool <select data-art-control="tool"><option value="brush">Brush</option><option value="eraser">Eraser</option><option value="line">Line</option><option value="rectangle">Rectangle</option><option value="circle">Ellipse</option><option value="fill">Fill</option><option value="text">Text</option></select></label>' +
      '<label>Font <select data-art-control="font"><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Impact, sans-serif">Impact</option><option value="monospace">Monospace</option></select></label>' +
      '<button class="nexus-button secondary" type="button" data-action="undo-art">Undo</button>' +
      '<button class="nexus-button secondary" type="button" data-action="clear-art">Clear</button>' +
      '<button class="nexus-button secondary" type="button" data-action="fullscreen-art">Fullscreen</button></div>' +
      '<canvas class="nexus-art-canvas" data-art-canvas width="1400" height="900" aria-label="Art drawing canvas"></canvas>' +
      '<input class="nexus-art-text" type="text" maxlength="200" placeholder="Type text, choose the Text tool, then click the canvas" data-art-control="text">' +
      '<div class="nexus-art-save"><input type="text" maxlength="32" placeholder="Artwork name" data-art-name>' +
      '<button class="nexus-button" type="button" data-action="save-art">Save artwork to inventory</button></div></section>' +
      '<div class="nexus-media-import"><div><label for="nexus-audio-file"><strong>Import audio</strong></label><small>MP3, WAV, OGG, M4A, AAC, FLAC, OPUS, or WebM · up to 10 MB</small><input id="nexus-audio-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm" data-media-import="audio"></div>' +
      '<div><label for="nexus-video-file"><strong>Import video</strong></label><small>MP4, WebM, OGG, MOV, or MPEG · up to 10 MB</small><input id="nexus-video-file" type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogv,.mov,.mpeg" data-media-import="video"></div></div></section>' +
      '<section class="nexus-card"><h2>Create an auction</h2><p class="nexus-wheel-help">Choose one item from your inventory, a starting bid, and how long the auction runs.</p>' +
      '<form class="nexus-form" data-form="auction-create"><select name="itemId" required ' + (auctionOptions ? '' : 'disabled') + '>' +
      (auctionOptions || '<option value="">Add an item to your inventory first</option>') + '</select>' +
      '<input name="startingBid" type="number" min="1" max="99999" placeholder="Starting bid in Sektorium" required>' +
      '<div class="nexus-auction-duration"><label>Duration <input name="duration" type="number" min="1" value="1" required></label>' +
      '<select name="durationUnit" aria-label="Duration unit"><option value="minutes">minutes</option><option value="hours" selected>hours</option><option value="days">days</option></select></div>' +
      '<button class="nexus-button" ' + (auctionOptions ? '' : 'disabled') + '>Start auction</button></form></section>';
  }

  function render() {
    if (!world) return;
    const user = currentUser();
    const auth = user
      ? '<section class="nexus-card"><h2>Your wallet</h2><div class="nexus-user"><div><strong>' + escapeHtml(user.username) +
        '</strong><small>' + currency(user.balance) + '</small></div><div class="nexus-form-actions">' +
        (inventoryPage ? '' : '<button class="nexus-button" data-action="spin" ' +
          (user.lastWheelDate === new Date().toISOString().slice(0,10) ? 'disabled' : '') + '>Spin daily wheel</button>') +
        '<button class="nexus-button secondary" data-action="logout">Log out</button></div></div></section>'
      : '<section class="nexus-card"><h2>Nexus account</h2><form class="nexus-form" data-form="auth"><input name="username" maxlength="20" placeholder="Username" autocomplete="username" required><input name="password" type="password" maxlength="32" placeholder="Password" autocomplete="current-password" required><div class="nexus-form-actions"><button class="nexus-button" name="mode" value="signup">Create account</button><button class="nexus-button secondary" name="mode" value="login">Log in</button></div></form></section>';
    if (inventoryPage) {
      content.innerHTML = '<section class="nexus-welcome"><span>SEKTOR · NEXUS INVENTORY</span><h1>Your inventory.</h1><p>Manage your items, create artwork, import audio, and start auctions.</p></section>' +
        auth + (user ? renderInventory(user) : '');
      installArtMaker();
      return;
    }
    const inventoryLink = '<section class="nexus-card"><h2>Inventory</h2><p class="nexus-wheel-help">Create art, import audio, manage items, or start an auction.</p><a class="nexus-button" href="' + inventoryUrl() + '">Open inventory</a></section>';
    const saleOptions = user ? inventoryFor(user).filter(item => Number(item.quantity || 0) > 0).map(item =>
      '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + ' · ' + Number(item.quantity) + ' available</option>').join('') : '';
    const walletListing = user
      ? '<section class="nexus-card"><h2>Sell an inventory item</h2><form class="nexus-form" data-form="listing">' +
        '<select name="itemId" required ' + (saleOptions ? '' : 'disabled') + '>' +
        (saleOptions || '<option value="">Add an item to your inventory first</option>') + '</select>' +
        '<input name="price" type="number" min="1" max="99999" placeholder="Price in Sektorium" required>' +
        '<button class="nexus-button" ' + (saleOptions ? '' : 'disabled') + '>List item</button></form></section>'
      : '';
    const walletContent = user
      ? '<section class="nexus-card"><h2>Your wallet</h2><div class="nexus-user"><div><strong>' + escapeHtml(user.username) +
        '</strong><small>' + currency(user.balance) + '</small></div><div class="nexus-form-actions"><button class="nexus-button" data-action="spin" ' +
        (user.lastWheelDate === new Date().toISOString().slice(0,10) ? 'disabled' : '') + '>Spin daily wheel</button><button class="nexus-button secondary" data-action="logout">Log out</button></div></div></section>'
      : '';
    const walletAuth = user ? walletContent + inventoryLink : auth;
    const wheel = user
      ? '<section class="nexus-card"><h2>Daily reward wheel</h2><p class="nexus-wheel-help">Spin once each day to win Sektorium.</p><div class="nexus-wheel-wrap"><div class="nexus-wheel-pointer" aria-hidden="true"></div><div class="nexus-wheel" data-nexus-wheel><span class="nexus-wheel-label">25</span><span class="nexus-wheel-label">40</span><span class="nexus-wheel-label">60</span><span class="nexus-wheel-label">75</span><span class="nexus-wheel-label">100</span><span class="nexus-wheel-label">125</span><span class="nexus-wheel-label">150</span><span class="nexus-wheel-label">200</span></div></div><button class="nexus-button nexus-spin-button" data-action="spin" ' +
        (user.lastWheelDate === new Date().toISOString().slice(0,10) ? 'disabled' : '') + '>' +
        (user.lastWheelDate === new Date().toISOString().slice(0,10) ? 'Already spun today' : 'Spin the wheel') +
        '</button></section>'
      : '';
    const activeAuctions = world.auctions.filter(item => isAuctionActive(item, Date.now()));
    const auctions = activeAuctions.length
      ? activeAuctions.slice(-25).map(item => {
        const ownAuction = user && item.seller === user.username;
        const nextBid = item.bidder ? Number(item.bid || 0) + 25 : Number(item.startingBid || 1);
        const state = item.bidder ? 'Leading: ' + escapeHtml(item.bidder) + ' · ' + currency(item.bid) : 'No bids · starts at ' + currency(item.startingBid);
        const countdown = '<small data-auction-end="' + Number(item.endsAt) + '"></small>';
        return '<div class="nexus-item"><div><strong>' + escapeHtml(item.item) + '</strong><small>' + state + '</small>' + countdown + '</div>' +
          '<button class="nexus-button" data-action="bid" data-id="' + escapeHtml(item.id) + '" ' +
          (!user || ownAuction || (user && item.bidder === user.username) || Number(user && user.balance || 0) < nextBid ? 'disabled' : '') +
          '>' + (item.bidder ? 'Bid ' + currency(nextBid) : 'Bid starting price') + '</button></div>';
      }).join('')
      : '<div class="nexus-empty">No active auctions right now.</div>';
    const marketplaceListings = world.listings.length
      ? world.listings.slice(-25).map(item => {
        const ownListing = user && item.owner === user.username;
        const price = Number(item.price || 0);
        const canAfford = user && Number(user.balance || 0) >= price;
        const buttonText = ownListing ? 'Your listing' : !user ? 'Sign in to buy' : !canAfford ? 'Not enough Sektorium' : 'Buy';
        return '<div class="nexus-item"><div><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.type || 'item') + ' · ' + currency(price) + ' · ' + escapeHtml(item.owner || 'Market') + '</small>' +
          mediaPreview(item.itemData && item.itemData.media, item.name) + '</div><button class="nexus-button" data-action="buy" data-id="' + escapeHtml(item.id) + '" ' +
          (ownListing || !user || !canAfford ? 'disabled' : '') + '>' + buttonText + '</button></div>';
      }).join('')
      : '<div class="nexus-empty">No items are listed yet.</div>';
    const messages = world.chat.slice(-30).map(renderChatMessage).join('') || '<div class="nexus-empty">No messages yet.</div>';
    const shopTab = activeTab === 'shop';
    content.innerHTML = '<section class="nexus-welcome"><span>SEKTOR · SOCIAL WORLD</span><h1>' +
      (shopTab ? 'The Nexus shop.' : 'Welcome to Nexus.') + '</h1><p>' +
      (shopTab ? 'Browse player listings, bid on auctions, and put your own items up for sale.' : 'Trade, chat, and play in the shared world.') +
      '</p></section><nav class="nexus-tabs" role="tablist" aria-label="Nexus sections">' +
      '<button class="nexus-tab' + (shopTab ? '' : ' active') + '" type="button" role="tab" aria-selected="' + String(!shopTab) + '" data-nexus-tab="home"><span>⌂</span> Home</button>' +
      '<button class="nexus-tab' + (shopTab ? ' active' : '') + '" type="button" role="tab" aria-selected="' + String(shopTab) + '" data-nexus-tab="shop"><span>◇</span> Shop <small>' + (world.listings.length + activeAuctions.length) + '</small></button>' +
      '</nav>' + (shopTab
        ? '<section class="nexus-card"><h2>Marketplace</h2><div class="nexus-list">' + marketplaceListings + '</div></section>' +
          '<section class="nexus-card"><h2>Auction room</h2><div class="nexus-list">' + auctions + '</div></section>' +
          (user ? walletListing : '<section class="nexus-card nexus-shop-signin"><h2>Join the marketplace</h2><p class="nexus-wheel-help">Create an account or log in to buy, bid, and list your items.</p><button class="nexus-button" type="button" data-nexus-tab="home">Go to account</button></section>')
        : walletAuth + wheel + '<section class="nexus-card"><h2>Live chat</h2><div class="nexus-chat">' + messages + '</div><form class="nexus-chat-form" data-form="chat"><textarea name="text" maxlength="' + (maxCodeLength + 7) + '" rows="2" placeholder="Message Nexus… Use /code: for a code or server invite" required></textarea><button class="nexus-button">Send</button></form><small class="nexus-chat-hint">Use <code>/code:YOURSERVERCODE</code> to share a server invite card, or <code>/code:</code> followed by source to post a copyable code block. Press Shift+Enter for a new line.</small></section>');
    const chat = content.querySelector('.nexus-chat');
    if (chat) {
      chat.scrollTop = chat.scrollHeight;
      hydrateServerInvites();
    }
    updateAuctionCountdowns();
  }

  content.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-form]');
    if (!form || !world) return;
    event.preventDefault();
    const formData = new FormData(form);
    try {
      if (form.dataset.form === 'auth') {
        const username = String(formData.get('username') || '').trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0,20);
        const password = String(formData.get('password') || '');
        const mode = event.submitter && event.submitter.value;
        if (username.length < 3 || password.length < 4) throw new Error('Use a 3+ character username and 4+ character password.');
        const user = world.users.find(entry => entry.username.toLowerCase() === username.toLowerCase());
        if (mode === 'signup') {
          if (user) throw new Error('That username is already taken.');
          world.users.push({username,password,balance:500,lastWheelDate:null});
          localStorage.setItem(sessionKey, JSON.stringify({username}));
          await persist('Welcome to Nexus. Your starter wallet is 500 Sektorium.');
        } else {
          if (!user || user.password !== password) throw new Error('No matching account was found.');
          localStorage.setItem(sessionKey, JSON.stringify({username:user.username}));
          render();
          setStatus('Logged in to Nexus.');
        }
      } else if (form.dataset.form === 'listing') {
        const user = currentUser();
        if (!user) throw new Error('Sign in to list an item.');
        const item = inventoryFor(user).find(entry => entry.id === formData.get('itemId'));
        const price = Number(formData.get('price'));
        if (!item || Number(item.quantity || 0) < 1) throw new Error('Choose an item that is still in your inventory.');
        if (!Number.isInteger(price) || price < 1 || price > 99999) throw new Error('Enter a price from 1 to 99999.');
        const itemData = {name:item.name,type:item.type || 'item',description:item.description || '',media:item.media || ''};
        item.quantity = Number(item.quantity) - 1;
        if (item.quantity === 0) user.inventory = inventoryFor(user).filter(entry => entry.id !== item.id);
        world.listings.push({
          id:'listing-' + Date.now() + '-' + Math.random().toString(16).slice(2),
          name:item.name,
          type:item.type || 'item',
          itemData,
          price,
          owner:user.username
        });
        await persist('Your inventory item is listed in the marketplace.');
      } else if (form.dataset.form === 'auction-create') {
        const user = currentUser();
        if (!user) throw new Error('Sign in to create an auction.');
        const item = inventoryFor(user).find(entry => entry.id === formData.get('itemId'));
        const startingBid = Number(formData.get('startingBid'));
        const duration = Number(formData.get('duration'));
        const unit = String(formData.get('durationUnit') || 'hours');
        const multipliers = {minutes:60_000,hours:3_600_000,days:86_400_000};
        const durationMs = duration * multipliers[unit];
        if (!item || Number(item.quantity || 0) < 1) throw new Error('Choose an item that is still in your inventory.');
        if (!Number.isInteger(startingBid) || startingBid < 1 || startingBid > 99999) throw new Error('Enter a starting bid from 1 to 99999.');
        if (!Number.isInteger(duration) || duration < 1 || !Number.isFinite(durationMs) || durationMs > 7 * 86_400_000) throw new Error('Choose a duration from 1 minute up to 7 days.');
        const itemData = {name:item.name,type:item.type || 'item',description:item.description || '',media:item.media || ''};
        item.quantity = Number(item.quantity) - 1;
        if (item.quantity === 0) user.inventory = inventoryFor(user).filter(entry => entry.id !== item.id);
        world.auctions.push({
          id:'auction-' + Date.now() + '-' + Math.random().toString(16).slice(2),
          item:item.name,
          itemData,
          seller:user.username,
          startingBid,
          bid:0,
          bidder:'',
          endsAt:Date.now() + durationMs,
          status:'open'
        });
        await persist('Auction started. Your item is held until the auction ends.');
      } else if (form.dataset.form === 'inventory-add') {
        const user = currentUser();
        if (!user) throw new Error('Sign in to manage your inventory.');
        const name = String(formData.get('name') || '').trim();
        const quantity = Number(formData.get('quantity'));
        if (!name || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) throw new Error('Enter an item name and a quantity from 1 to 9999.');
        chargeQuantityCost(user, quantity);
        inventoryFor(user).push({
          id:'inventory-' + Date.now() + '-' + Math.random().toString(16).slice(2),
          name,
          quantity,
          type:String(formData.get('type') || 'item'),
          description:String(formData.get('description') || '').trim()
        });
        await persist('Item added to your inventory.');
      } else if (form.dataset.form === 'inventory-edit') {
        const user = currentUser();
        if (!user) throw new Error('Sign in to manage your inventory.');
        const item = inventoryFor(user).find(entry => entry.id === form.dataset.id);
        const name = String(formData.get('name') || '').trim();
        const quantity = Number(formData.get('quantity'));
        if (!item) throw new Error('That inventory item no longer exists.');
        if (!name || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) throw new Error('Enter an item name and a quantity from 1 to 9999.');
        const previousQuantity = Number(item.quantity || 1);
        if (quantity > previousQuantity) {
          const extraCost = (quantity - previousQuantity) * 10;
          if (Number(user.balance || 0) < extraCost) throw new Error('You need ' + extraCost + ' Sektorium to raise this stack to ' + quantity + '.');
          user.balance = Number(user.balance || 0) - extraCost;
        }
        item.name = name;
        item.quantity = quantity;
        item.type = String(formData.get('type') || 'item');
        item.description = String(formData.get('description') || '').trim();
        await persist('Inventory item updated.');
      } else if (form.dataset.form === 'chat') {
        const user = currentUser();
        if (!user) throw new Error('Sign in to chat in Nexus.');
        const text = String(formData.get('text') || '').replace(/\r\n/g, '\n');
        const code = codeFromMessage(text);
        if (code === null && text.trim().length > maxChatLength) {
          throw new Error('Chat messages are limited to ' + maxChatLength + ' characters. Use /code: for a code card.');
        }
        if (code !== null && code.length > maxCodeLength) throw new Error('Code cards are limited to ' + maxCodeLength + ' characters.');
        if (!(code === null ? text.trim() : code.trim())) return;
        world.chat.push({user:user.username,text:code === null ? text.trim() : text});
        await persist('Message sent.');
      }
    } catch (error) {
      setStatus(error.message || 'That action could not be completed.', true);
    }
  });

  content.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || !event.target.matches('textarea[name="text"]')) return;
    event.preventDefault();
    event.target.form.requestSubmit();
  });

  content.addEventListener('contextmenu', event => {
    if (event.target.closest('audio, video, .nexus-art-preview')) event.preventDefault();
  });

  content.addEventListener('change', async event => {
    const input = event.target.closest('[data-media-import]');
    if (!input || !world) return;
    const file = input.files && input.files[0];
    if (!file) return;
    const user = currentUser();
    const extension = file.name.split('.').pop().toLowerCase();
    const mediaTypes = input.dataset.mediaImport === 'video' ? {
      mp4:'video/mp4', webm:'video/webm', ogv:'video/ogg', ogg:'video/ogg',
      mov:'video/quicktime', mpeg:'video/mpeg', mpg:'video/mpeg', m4v:'video/mp4'
    } : {
      mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', m4a:'audio/mp4',
      aac:'audio/aac', flac:'audio/flac', opus:'audio/opus', webm:'audio/webm'
    };
    try {
      const mediaKind = input.dataset.mediaImport === 'video' ? 'video' : 'audio';
      if (!user) throw new Error('Sign in to import media into your inventory.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a media file no larger than 10 MB.');
      if (!mediaTypes[extension] || (file.type && file.type !== 'application/octet-stream' && !file.type.startsWith(mediaKind + '/'))) {
        throw new Error('Choose a supported ' + mediaKind + ' file.');
      }
      const mimeType = mediaTypes[extension];
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== 'string') return reject(new Error('The media file could not be read.'));
          const separator = reader.result.indexOf(',');
          if (separator < 0) return reject(new Error('The media file could not be read.'));
          resolve('data:' + mimeType + ';base64,' + reader.result.slice(separator + 1));
        };
        reader.onerror = () => reject(reader.error || new Error('The media file could not be read.'));
        reader.readAsDataURL(file);
      });
      const name = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 32) || ('Imported ' + mediaKind);
      inventoryFor(user).push({
        id:'inventory-' + Date.now() + '-' + Math.random().toString(16).slice(2),
        name,
        quantity:1,
        type:mediaKind === 'video' ? 'video' : 'sound',
        description:'Imported ' + mediaKind + ': ' + file.name.slice(0, 100),
        media:data
      });
      await persist(mediaKind === 'video' ? 'Video imported to your inventory.' : 'Audio imported to your inventory.');
    } catch (error) {
      setStatus(error.message || 'The media file could not be imported.', true);
    } finally {
      input.value = '';
    }
  });

  content.addEventListener('click', async event => {
    const tab = event.target.closest('[data-nexus-tab]');
    if (tab && !inventoryPage) {
      activeTab = tab.dataset.nexusTab === 'shop' ? 'shop' : 'home';
      render();
      return;
    }
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (!world) {
      setStatus('Connect to Nexus before exporting.', true);
      return;
    }
    const user = currentUser();
    try {
      if (action === 'logout') {
        localStorage.removeItem(sessionKey);
        render();
        setStatus('You are logged out.');
      } else if (action === 'export-world') {
        await exportWorld();
      } else if (action === 'export-inventory') {
        if (!user) throw new Error('Sign in to export files from your inventory.');
        const item = inventoryFor(user).find(entry => entry.id === button.dataset.id);
        if (!item) throw new Error('That inventory item no longer exists.');
        const method = await exportInventoryMedia(item);
        setStatus(method === 'tab'
          ? 'Your file is open in a new tab. Download it there.'
          : 'Export started for ' + String(item.name || 'your file') + '.');
      } else if (action === 'copy-code') {
        const code = button.closest('.nexus-code-card')?.querySelector('pre code');
        if (!code) throw new Error('The code block could not be found.');
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard access is unavailable. Select the code and copy it manually.');
        await navigator.clipboard.writeText(code.textContent);
        setStatus('Code copied to clipboard.');
      } else if (action === 'spin') {
        if (!user) throw new Error('Create a Nexus account first.');
        if (wheelSpinning) return;
        const today = new Date().toISOString().slice(0,10);
        if (user.lastWheelDate === today) throw new Error('You already spun the wheel today.');
        const rewards = [25,40,60,75,100,125,150,200];
        const rewardIndex = Math.floor(Math.random() * rewards.length);
        const reward = rewards[rewardIndex];
        const wheel = content.querySelector('[data-nexus-wheel]');
        if (!wheel) throw new Error('The reward wheel could not be found. Reload Nexus and try again.');
        wheelSpinning = true;
        button.disabled = true;
        button.textContent = 'Spinning…';
        wheelRotation += 5 * 360 + (360 - (rewardIndex * 45 + 22.5));
        wheel.style.transform = 'rotate(' + wheelRotation + 'deg)';
        await new Promise(resolve => setTimeout(resolve, 4300));
        user.lastWheelDate = today;
        user.balance = Number(user.balance || 0) + reward;
        world.chat.push({user:'Wheel',text:'You won ' + reward + ' Sektorium.'});
        await persist('Daily wheel reward: +' + reward + ' Sektorium.');
        wheelSpinning = false;
      } else if (action === 'edit-inventory') {
        if (!user) throw new Error('Sign in to manage your inventory.');
        const item = inventoryFor(user).find(entry => entry.id === button.dataset.id);
        if (!item) throw new Error('That inventory item no longer exists.');
        const itemMarkup = '<section class="nexus-card nexus-inventory-editor"><h2>Edit inventory item</h2><form class="nexus-form" data-form="inventory-edit" data-id="' + escapeHtml(item.id) + '">' +
          '<input name="name" maxlength="32" value="' + escapeHtml(item.name) + '" required>' +
          '<input name="quantity" type="number" min="1" max="9999" value="' + Number(item.quantity || 1) + '" required>' +
          '<select name="type"><option' + (item.type === 'item' ? ' selected' : '') + '>item</option><option' + (item.type === 'art' ? ' selected' : '') + '>art</option><option' + (item.type === 'sound' ? ' selected' : '') + '>sound</option><option' + (item.type === 'video' ? ' selected' : '') + '>video</option><option' + (item.type === 'collectible' ? ' selected' : '') + '>collectible</option></select>' +
          '<input name="description" maxlength="120" value="' + escapeHtml(item.description || '') + '" placeholder="Description (optional)"><div class="nexus-form-actions"><button class="nexus-button">Save changes</button><button class="nexus-button secondary" type="button" data-action="cancel-inventory-edit">Cancel</button></div></form></section>';
        button.closest('.nexus-card').insertAdjacentHTML('afterend', itemMarkup);
        button.closest('.nexus-card').nextElementSibling.scrollIntoView({behavior:'smooth',block:'center'});
      } else if (action === 'remove-inventory') {
        if (!user) throw new Error('Sign in to manage your inventory.');
        const items = inventoryFor(user);
        const item = items.find(entry => entry.id === button.dataset.id);
        if (!item) throw new Error('That inventory item no longer exists.');
        user.inventory = items.filter(entry => entry.id !== item.id);
        await persist('Removed ' + String(item.name || 'item') + ' from your inventory.');
      } else if (action === 'cancel-inventory-edit') {
        button.closest('.nexus-inventory-editor').remove();
      } else if (action === 'undo-art') {
        const canvas = content.querySelector('[data-art-canvas]');
        const snapshot = artHistory.pop();
        if (canvas && snapshot) canvas.getContext('2d').putImageData(snapshot, 0, 0);
      } else if (action === 'clear-art') {
        const canvas = content.querySelector('[data-art-canvas]');
        if (!canvas) throw new Error('The art canvas could not be found.');
        const context = canvas.getContext('2d');
        artHistory.push(context.getImageData(0, 0, canvas.width, canvas.height));
        if (artHistory.length > 20) artHistory.shift();
        context.clearRect(0, 0, canvas.width, canvas.height);
      } else if (action === 'fullscreen-art') {
        const editor = content.querySelector('[data-art-editor]');
        if (!editor) throw new Error('The art maker could not be found.');
        const fullscreenButton = button;
        if (document.fullscreenElement === editor) {
          await document.exitFullscreen();
        } else {
          await editor.requestFullscreen();
          fullscreenButton.textContent = 'Exit fullscreen';
        }
      } else if (action === 'save-art') {
        if (!user) throw new Error('Sign in to save artwork to your inventory.');
        const canvas = content.querySelector('[data-art-canvas]');
        if (!canvas) throw new Error('The art canvas could not be found.');
        const image = canvas.toDataURL('image/png');
        if (image.length > 1024 * 1024) throw new Error('This artwork is too large to save. Simplify the drawing and try again.');
        const nameInput = content.querySelector('[data-art-name]');
        const name = String(nameInput.value || '').trim() || 'My artwork';
        inventoryFor(user).push({
          id:'inventory-' + Date.now() + '-' + Math.random().toString(16).slice(2),
          name:name.slice(0, 32),
          quantity:1,
          type:'art',
          description:'Created in the Nexus art maker.',
          media:image
        });
        await persist('Artwork saved to your inventory.');
      } else if (action === 'buy') {
        if (!user) throw new Error('Create a Nexus account to buy items.');
        if (lanMode) {
          button.disabled = true;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          try {
            const response = await fetch('/api/nexus/buy', {
              method:'POST',
              signal:controller.signal,
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({listingId:button.dataset.id,buyer:user.username})
            });
            const body = await response.text();
            let result;
            try {
              result = body ? JSON.parse(body) : null;
            } catch {
              throw new Error('The marketplace server returned an invalid response.');
            }
            if (!response.ok) throw new Error(result && result.error || 'Purchase failed (' + response.status + ').');
            if (!result || !Array.isArray(result.users) || !Array.isArray(result.listings)) {
              throw new Error('The marketplace server did not confirm the purchase.');
            }
            world = normalize(result);
            lastSavedWorld = copyWorld(world);
            setStatus('Purchase complete. The item is in your inventory.');
            render();
          } finally {
            clearTimeout(timer);
            if (button.isConnected) button.disabled = false;
          }
          return;
        }
        const listing = world.listings.find(item => item.id === button.dataset.id);
        if (!listing) throw new Error('That listing is no longer available.');
        if (listing.owner === user.username) throw new Error('You cannot buy your own listing.');
        const buyer = world.users.find(entry => entry.username === user.username);
        if (Number(buyer.balance || 0) < Number(listing.price || 0)) throw new Error('You do not have enough Sektorium.');
        buyer.balance = Number(buyer.balance || 0) - Number(listing.price || 0);
        if (listing.owner && listing.owner !== 'Market') {
          const seller = world.users.find(entry => entry.username === listing.owner);
          if (seller) seller.balance = Number(seller.balance || 0) + Number(listing.price || 0);
        }
        inventoryFor(buyer).push({
          id:'inventory-' + Date.now() + '-' + Math.random().toString(16).slice(2),
          name:listing.itemData && listing.itemData.name || listing.name,
          quantity:1,
          type:listing.itemData && listing.itemData.type || listing.type || 'item',
          description:listing.itemData && listing.itemData.description || 'Purchased from the Nexus marketplace.',
          media:listing.itemData && listing.itemData.media || ''
        });
        world.listings = world.listings.filter(item => item.id !== listing.id);
        world.chat.push({user:'Market',text:user.username + ' bought ' + listing.name + '.'});
        await persist('Purchase complete.');
      } else if (action === 'bid') {
        if (!user) throw new Error('Create a Nexus account to place a bid.');
        const auction = world.auctions.find(item => item.id === button.dataset.id);
        if (!auction || auction.status === 'sold' || auction.status === 'unsold' || Number(auction.endsAt) <= Date.now()) throw new Error('That auction is no longer active.');
        if (auction.seller === user.username) throw new Error('You cannot bid on your own auction.');
        if (auction.bidder === user.username) throw new Error('You already have the highest bid.');
        const amount = auction.bidder ? Number(auction.bid || 0) + 25 : Number(auction.startingBid || 1);
        if (Number(user.balance || 0) < amount) throw new Error('You need more Sektorium to place that bid.');
        const previousBidder = world.users.find(entry => entry.username === auction.bidder);
        user.balance = Number(user.balance || 0) - amount;
        if (previousBidder) previousBidder.balance = Number(previousBidder.balance || 0) + Number(auction.bid || 0);
        auction.bid = amount;
        auction.bidder = user.username;
        world.chat.push({user:'Auction',text:user.username + ' bid ' + amount + ' Sektorium on ' + auction.item + '.'});
        await persist('Your bid is now the leading offer.');
      }
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'The purchase timed out. Check your connection before trying again.'
        : error.message || 'That action could not be completed.';
      setStatus(message, true);
      if (action === 'buy' && button.isConnected) button.disabled = false;
      console.error('[Nexus] Marketplace action failed.', error);
    }
  });

  connectButton.addEventListener('click', connect);
  document.addEventListener('fullscreenchange', () => {
    const editor = content.querySelector('[data-art-editor]');
    const fullscreenButton = content.querySelector('[data-action="fullscreen-art"]');
    if (fullscreenButton && editor) fullscreenButton.textContent = document.fullscreenElement === editor ? 'Exit fullscreen' : 'Fullscreen';
  });
  setInterval(updateAuctionCountdowns, 1000);
  window.addEventListener('pagehide', () => {
    if (liveEvents) liveEvents.close();
    if (cloudWorldHandler) cloudWorldRef.off('value', cloudWorldHandler);
  });
  worldMode.textContent = lanMode || firebaseMode ? 'Shared multiplayer world' : 'This browser only · not multiplayer';
  if (inventoryPage) connect();
})();
