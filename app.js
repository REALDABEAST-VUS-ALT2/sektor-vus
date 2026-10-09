function friendConversationId(friendKey) { return [state.user.key, friendKey].sort().join('_'); }
function friendAvatarMarkup(friend) { return friend.avatar ? '<span class="friend-nav-avatar"><img src="' + esc(friend.avatar) + '" alt=""></span>' : '<span class="friend-nav-avatar">' + esc((friend.username || '?').slice(0,2).toUpperCase()) + '</span>'; }
function startOnlinePresence() {
  if (!state.user || state.onlinePresenceRef) return;
  state.onlinePresenceRef = db.ref('onlineUsers/' + state.user.key);
  state.onlinePresenceListRef = db.ref('onlineUsers');
  state.onlinePresenceRef.onDisconnect().remove();
  state.onlinePresenceRef.set({key:state.user.key,name:state.user.username,avatar:state.user.avatar || '',joinedAt:firebase.database.ServerValue.TIMESTAMP});
  state.onlinePresenceHandler = snap => {
    state.onlineUsers = snap.val() || {};
    if (els.friendsBtn.classList.contains('active')) renderFriendsArea();
  };
  state.onlinePresenceListRef.on('value', state.onlinePresenceHandler);
}
async function loadFriends() {
  if (!state.user) return;
  try {
    const friendsSnap = await db.ref('users/' + state.user.key + '/friends').get();
    const friendKeys = Object.keys(friendsSnap.val() || {});
    const friendUsers = await Promise.all(friendKeys.map(async key => { const snap = await db.ref('users/' + key).get(); return snap.exists() ? {key, ...snap.val()} : null; }));
    state.friends = friendUsers.filter(friend => friend && friend.key !== state.user.key);
    const requestsSnap = await db.ref('users/' + state.user.key + '/friendRequestsIncoming').get();
    state.friendRequests = Object.entries(requestsSnap.val() || {}).map(([key, request]) => ({key, ...request})).filter(request => (request.fromKey || request.key) !== state.user.key);
  } catch (error) {
    state.friends = [];
    state.friendRequests = [];
    showError('Could not load friends and direct messages. Check your connection and try again.');
  }
  renderFriendsArea();
  renderFriendRequests();
  renderFriendsDirectory();
}
function renderFriendsArea() {
  if (!els.friendsList) return;
  els.friendsList.innerHTML = '';
  if (!state.friends.length) return;
  state.friends.forEach(friend => {
    const row = document.createElement('button'); row.type = 'button'; row.className = 'friend-nav-row' + (state.dmFriend && state.dmFriend.key === friend.key ? ' active' : '');
    row.innerHTML = friendAvatarMarkup(friend) + '<span class="friend-nav-name">' + esc(friend.username) + '</span>';
    row.onclick = () => openPrivateDm(friend);
    els.friendsList.appendChild(row);
  });
}
function renderFriendRequests() {
  if (!els.friendRequestsList) return;
  els.friendRequestsList.innerHTML = '';
  if (!state.friendRequests.length) { els.friendRequestsList.innerHTML = '<div class="friends-empty">No pending requests.</div>'; return; }
  state.friendRequests.forEach(request => {
    const row = document.createElement('div'); row.className = 'friend-request-row';
    row.innerHTML = '<span>' + esc(request.fromUsername || 'Friend request') + '</span><button type="button">Accept</button>';
    row.querySelector('button').onclick = () => acceptFriendRequest(request);
    els.friendRequestsList.appendChild(row);
  });
}
function renderFriendsDirectory() {
  if (!els.friendsDirectory) return;
  els.friendsDirectory.innerHTML = '<div class="friend-directory-title">Your friends</div>';
  if (!state.friends.length) return;
  state.friends.forEach(friend => {
    const row = document.createElement('button'); row.type = 'button'; row.className = 'friend-directory-row';
    row.innerHTML = friendAvatarMarkup(friend) + '<span>' + esc(friend.username) + '</span><small>Open DM</small>';
    row.onclick = () => openPrivateDm(friend); els.friendsDirectory.appendChild(row);
  });
}
async function acceptFriendRequest(request) {
  const friendKey = request.fromKey || request.key;
  if (!friendKey || friendKey === state.user.key) return;
  try {
    const updates = {};
    updates['users/' + state.user.key + '/friends/' + friendKey] = {since:firebase.database.ServerValue.TIMESTAMP};
    updates['users/' + friendKey + '/friends/' + state.user.key] = {since:firebase.database.ServerValue.TIMESTAMP};
    updates['users/' + state.user.key + '/friendRequestsIncoming/' + friendKey] = null;
    updates['users/' + friendKey + '/friendRequestsOutgoing/' + state.user.key] = null;
    await db.ref().update(updates);
    await loadFriends();
  } catch (error) { showError('Could not accept that friend request.'); }
}
function openFriendsArea() { state.activeView = 'friends'; closePrivateDm(); els.friendsBtn.classList.add('active'); els.friendsList.hidden = false; els.friendRequestsPanel.hidden = false; els.friendsDirectory.hidden = false; els.textChannelsLabel.hidden = true; els.textChannels.hidden = true; els.voiceChannelsLabel.hidden = true; els.voiceChannels.hidden = true; els.voiceMembers.hidden = true; els.voiceControls.hidden = true; els.ownerTools.hidden = true; els.gamesPanel.hidden = true; els.friendHome.hidden = false; els.announcement.hidden = true; els.ownerComposer.hidden = true; els.messages.hidden = false; els.messageForm.hidden = false; els.serverName.textContent = 'Friends & DMs'; els.serverCode.textContent = 'Everyone has this server'; els.channelHash.textContent = '◎'; els.channelName.textContent = 'Friends'; els.channelTopic.textContent = 'Private conversations'; els.channelPermission.textContent = ''; els.messages.innerHTML = '<div class="empty-state">Choose a friend from the rail to start a private conversation.</div>'; els.messageInput.placeholder = 'Choose a friend to message'; loadFriends(); }
function openPrivateDm(friend) {
  state.activeView = 'friends';
  state.navigationVersion = (state.navigationVersion || 0) + 1;
  state.dmFriend = friend; state.channel = ''; if (state.unsubMessages) state.unsubMessages(); if (state.dmRef && state.dmHandler) state.dmRef.off('child_added', state.dmHandler); state.dmRef = null; state.dmHandler = null;
  els.channelHash.textContent = '@'; els.channelName.textContent = friend.username; els.channelTopic.textContent = 'Private messages'; els.channelPermission.textContent = 'DM'; els.announcement.hidden = true; els.ownerComposer.hidden = true; els.messageInput.placeholder = 'Message @' + friend.username; renderFriendsArea(); selectPrivateMessages();
}
function selectPrivateMessages() {
  els.messages.innerHTML = ''; if (!state.dmFriend) return;
  const ref = db.ref('dms/' + friendConversationId(state.dmFriend.key) + '/messages').limitToLast(100);
  state.dmRef = ref; state.dmHandler = snap => renderMessage({id:snap.key, ...snap.val(), name:snap.val().name || snap.val().fromUsername || 'Friend'}); ref.on('child_added', state.dmHandler);
}
async function sendPrivateMessage(text) {
  if (!state.dmFriend || !text) return;
  const payload = {fromAccountKey:state.user.key, name:state.user.username, avatar:state.user.avatar || '', key:state.user.key, text, ts:firebase.database.ServerValue.TIMESTAMP};
  try { await db.ref('dms/' + friendConversationId(state.dmFriend.key) + '/messages').push(payload); els.messageInput.value = ''; } catch (error) { showError('Could not send that message.'); }
}
function makeLocalStorageDatabase() {
  const STORE_KEY = 'sektorLocalDatabase';
  const listeners = new Map();

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function writeStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function normalizedPath(path) {
    return String(path || '').split('/').filter(Boolean).join('/');
  }

  function getValueAt(path) {
    const cleanPath = normalizedPath(path);
    if (!cleanPath) return readStore();
    const store = readStore();
    return cleanPath.split('/').reduce((value, segment) => value && typeof value === 'object' ? value[segment] : undefined, store);
  }

  function setValueAt(path, value) {
    const store = readStore();
    const segments = normalizedPath(path).split('/').filter(Boolean);
    let current = store;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      if (!current[segment] || typeof current[segment] !== 'object') current[segment] = {};
      current = current[segment];
    }
    if (segments.length) current[segments[segments.length - 1]] = value;
    else Object.assign(store, value || {});
    writeStore(store);
  }

  function updateValueAt(path, patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      setValueAt(path, patch);
      return;
    }
    Object.entries(patch).forEach(([childPath, value]) => {
      setValueAt([path, childPath].filter(Boolean).join('/'), value);
    });
  }

  function deleteValueAt(path) {
    const store = readStore();
    const segments = normalizedPath(path).split('/').filter(Boolean);
    if (!segments.length) {
      writeStore({});
      return;
    }
    let current = store;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const segment = segments[index];
      if (!current[segment] || typeof current[segment] !== 'object') return;
      current = current[segment];
    }
    delete current[segments[segments.length - 1]];
    writeStore(store);
  }

  function makeSnapshot(path, value) {
    const cleanPath = normalizedPath(path);
    return {
      key: cleanPath.split('/').filter(Boolean).pop() || null,
      val: () => value == null ? null : value,
      exists: () => value != null
    };
  }

  function captureListenerValues(path) {
    const changedPath = normalizedPath(path);
    const previousValues = new Map();
    listeners.forEach((callbacks, key) => {
      const separator = key.lastIndexOf(':');
      const listenerPath = key.slice(0, separator);
      const eventName = key.slice(separator + 1);
      if ((eventName === 'value' && (!listenerPath || changedPath === listenerPath || changedPath.startsWith(listenerPath + '/'))) ||
          (eventName === 'child_added' && (changedPath === listenerPath || changedPath.startsWith(listenerPath + '/')))) {
        previousValues.set(key, getValueAt(listenerPath));
      }
    });
    return previousValues;
  }

  function notifyChanges(path, previousValues) {
    const changedPath = normalizedPath(path);
    listeners.forEach((callbacks, key) => {
      const separator = key.lastIndexOf(':');
      const listenerPath = key.slice(0, separator);
      const eventName = key.slice(separator + 1);
      if (!previousValues.has(key)) return;
      const currentValue = getValueAt(listenerPath);
      if (eventName === 'value') {
        callbacks.forEach(callback => callback(makeSnapshot(listenerPath, currentValue)));
        return;
      }
      const oldValue = previousValues.get(key);
      if (changedPath === listenerPath) {
        Object.entries(currentValue || {}).forEach(([childKey, childValue]) => {
          if (!oldValue || !Object.prototype.hasOwnProperty.call(oldValue, childKey)) {
            const childSnapshot = makeSnapshot([listenerPath, childKey].filter(Boolean).join('/'), childValue);
            childSnapshot.key = childKey;
            callbacks.forEach(callback => callback(childSnapshot));
          }
        });
        return;
      }
      const childKey = changedPath.slice(listenerPath ? listenerPath.length + 1 : 0).split('/')[0];
      if (childKey && (!oldValue || !Object.prototype.hasOwnProperty.call(oldValue, childKey)) &&
          currentValue && Object.prototype.hasOwnProperty.call(currentValue, childKey)) {
        const childSnapshot = makeSnapshot([listenerPath, childKey].filter(Boolean).join('/'), currentValue[childKey]);
        childSnapshot.key = childKey;
        callbacks.forEach(callback => callback(childSnapshot));
      }
    });
  }

  function createReference(path = '') {
    const cleanPath = normalizedPath(path);
    return {
      path: cleanPath,
      key: cleanPath.split('/').filter(Boolean).pop() || null,
      child(nextPath) {
        return createReference([cleanPath, normalizedPath(nextPath)].filter(Boolean).join('/'));
      },
      limitToLast() { return this; },
      async get() {
        return makeSnapshot(cleanPath, getValueAt(cleanPath));
      },
      async set(value) {
        const previousValues = captureListenerValues(cleanPath);
        setValueAt(cleanPath, value);
        notifyChanges(cleanPath, previousValues);
        return value;
      },
      async update(values) {
        const previousValues = captureListenerValues(cleanPath);
        updateValueAt(cleanPath, values);
        notifyChanges(cleanPath, previousValues);
        return values;
      },
      async remove() {
        const previousValues = captureListenerValues(cleanPath);
        deleteValueAt(cleanPath);
        notifyChanges(cleanPath, previousValues);
        return null;
      },
      push(value) {
        const key = (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : 'local-' + Date.now() + '-' + Math.random().toString(16).slice(2));
        const childRef = this.child(key);
        if (value !== undefined) {
          childRef.set(value);
        }
        return childRef;
      },
      on(eventName, callback) {
        const eventKey = cleanPath + ':' + eventName;
        const handlers = listeners.get(eventKey) || [];
        handlers.push(callback);
        listeners.set(eventKey, handlers);
        const value = getValueAt(cleanPath);
        if (eventName === 'child_added') {
          Object.entries(value || {}).forEach(([childKey, childValue]) => {
            const childSnapshot = makeSnapshot([cleanPath, childKey].filter(Boolean).join('/'), childValue);
            childSnapshot.key = childKey;
            callback(childSnapshot);
          });
        } else {
          callback(makeSnapshot(cleanPath, value));
        }
        return callback;
      },
      off(eventName, callback) {
        const eventKey = cleanPath + ':' + eventName;
        if (!callback) {
          listeners.delete(eventKey);
          return;
        }
        const handlers = listeners.get(eventKey) || [];
        const nextHandlers = handlers.filter(handler => handler !== callback);
        if (nextHandlers.length) listeners.set(eventKey, nextHandlers); else listeners.delete(eventKey);
      },
      onDisconnect() {
        return { remove: async () => {}, cancel: async () => {} };
      }
    };
  }

  return { ref: createReference };
}

function makeLocalAuth() {
  return {
    currentUser: null,
    async signInAnonymously() {
      this.currentUser = { uid: 'local-user' };
      return { user: this.currentUser };
    }
  };
}

const useLanBackend = new URLSearchParams(location.search).get('lan') === '1';
const firebase = globalThis.firebase || {
  initializeApp: () => ({
    database: () => makeLocalStorageDatabase(),
    auth: () => makeLocalAuth()
  }),
  database: { ServerValue: { TIMESTAMP: { '.sv': 'timestamp' } } },
  auth: () => makeLocalAuth()
};

const firebaseApp = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp();
const db = firebaseApp.database();
const firebaseAuth = firebase.auth ? firebase.auth() : makeLocalAuth();
const state = { user:null, servers:[], server:null, channel:"general", activeView:'server', editMode:false, gameRef:null, gameHandler:null, dmFriend:null, dmRef:null, dmHandler:null, metaRef:null, metaHandler:null, presenceListRef:null, presenceHandler:null, unsubMessages:null, presenceRef:null, voiceRef:null, voiceSignalUnsub:null, voiceMembersUnsub:null, voiceChannel:null, localStream:null, mediaMode:'audio', peers:{}, serverMembers:{}, friends:[], friendRequests:[], nexusData:null, nexusLoaded:false, nexusLoading:false, nexusInitialized:false, nexusRef:null, nexusHandler:null, nexusError:'' };
const unreadChannelWatchers = new Map();
let channelReadAt = {};
let unreadChannels = {};
const voiceSessionId = (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
const $ = id => document.getElementById(id);
const els = { authView:$('authView'), appView:$('appView'), loginTab:$('loginTab'), signupTab:$('signupTab'), username:$('usernameInput'), password:$('passwordInput'), authError:$('authError'), authStatus:$('authStatus'), authSubmit:$('authSubmit'), serverList:$('serverList'), serverName:$('serverName'), serverCode:$('serverCode'), friendsBtn:$('friendsBtn'), friendsList:$('friendsList'), friendRequestsPanel:$('friendRequestsPanel'), friendRequestsList:$('friendRequestsList'), friendsDirectory:$('friendsDirectory'), textChannelsLabel:$('textChannelsLabel'), textChannels:$('textChannels'), voiceChannelsLabel:$('voiceChannelsLabel'), voiceChannels:$('voiceChannels'), voiceMembers:$('voiceMembers'), voiceControls:$('voiceControls'), muteVoice:$('muteVoiceBtn'), leaveVoice:$('leaveVoiceBtn'), videoStage:$('videoStage'), gamesPanel:$('gamesPanel'), mediaControlPopup:$('mediaControlPopup'), popupMuteBtn:$('popupMuteBtn'), popupCameraBtn:$('popupCameraBtn'), popupScreenBtn:$('popupScreenBtn'), popupLeaveBtn:$('popupLeaveBtn'), remoteAudio:$('remoteAudio'), ownerTools:$('ownerTools'), editModeBtn:$('editModeBtn'), channelName:$('channelName'), channelTopic:$('channelTopic'), channelPermission:$('channelPermission'), announcement:$('announcement'), announcementText:$('announcementText'), ownerComposer:$('ownerComposer'), announcementInput:$('announcementInput'), messages:$('messages'), messageForm:$('messageForm'), messageInput:$('messageInput'), mentionSuggestions:$('mentionSuggestions'), imageInput:$('imageInput'), imageButton:$('imageButton'), memberCount:$('memberCount'), membersList:$('membersList'), addFriend:$('addFriendBtn'), logout:$('logoutBtn'), newServer:$('newServerBtn'), joinServer:$('joinServerBtn'), serverSettings:$('serverSettingsBtn'), addChannel:$('addChannelBtn'), rank:$('rankBtn'), publish:$('publishAnnouncement'), modal:$('modal'), modalTitle:$('modalTitle'), modalBody:$('modalBody'), modalClose:$('modalClose'), youtubeOpenBtn:$('youtubeOpenBtn'), youtubePopup:$('youtubePopup'), youtubePopupClose:$('youtubePopupClose') };
els.audioInput = $('audioInput');
els.friendHome = $('friendHome');
els.audioButton = $('audioButton');
const sektorMusicInput = $('sektorMusicInput');
const sektorMusicAudio = $('sektorMusicAudio');
const sektorMusicName = $('sektorMusicName');
let signupMode = false;
const safe = value => String(value || '').replace(/[.#$\[\]/]/g, '_');
const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const keyFor = name => safe(name.trim().toLowerCase());
function isServerOwner() { return !!(state.server && state.user && String(state.server.ownerKey || '').trim() === String(state.user.key || '').trim()); }
function isOwnerEditing() { return isServerOwner() && state.editMode; }
function updateEditModeUi() {
  const owner = isServerOwner();
  const enabled = owner && state.editMode;
  if (els.editModeBtn) {
    els.editModeBtn.hidden = !owner;
    els.editModeBtn.setAttribute('aria-pressed', String(enabled));
    els.editModeBtn.textContent = enabled ? '✓' : '✎';
    els.editModeBtn.title = enabled ? 'Turn off channel edit mode' : 'Turn on channel edit mode';
    els.editModeBtn.setAttribute('aria-label', els.editModeBtn.title);
    els.editModeBtn.classList.toggle('active', enabled);
  }
  if (els.ownerTools) els.ownerTools.hidden = !owner;
  if (els.serverSettings) els.serverSettings.disabled = !owner;
  if (els.addChannel) els.addChannel.disabled = !owner;
  if (els.rank) els.rank.disabled = !owner;
  if (els.announcementInput) els.announcementInput.disabled = !owner;
  if (els.publish) els.publish.disabled = !owner;
}
let pendingImage = '';
let pendingAudio = '';
let pendingAudioName = '';
let replyTo = null;
const REACTION_EMOJIS = ['👍','❤️','😂','😮','😢','🎉','🔥','👏','✅','💯'];
const messageCache = {};
function closeYoutubePopup() { els.youtubePopup.hidden = true; }

async function accountKey(identifier) {
  const clean = identifier.trim();
  const path = /^[0-9]{6}$/.test(clean) ? 'idIndex/' + clean : 'usernameIndex/' + clean.toLowerCase();
  const snap = await db.ref(path).get();
  return snap.exists() ? snap.val() : null;
}
async function auth() {
  const identifier = els.username.value.trim();
  const password = els.password.value;
  els.authError.textContent = '';
  els.authStatus.textContent = 'Connecting...';
  if (!identifier || password.length < 4) { els.authError.textContent = 'Enter a username/ID and a 4+ character password.'; return; }
  try {
    await ensureFirebaseAccess();
    if (signupMode) {
      const usernameKey = keyFor(identifier);
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(identifier)) throw new Error('Username must use 3-24 letters, numbers, or underscores.');
      if ((await db.ref('usernameIndex/' + usernameKey).get()).exists()) throw new Error('That username is already taken.');
      const id = String(Math.floor(100000 + Math.random() * 899999));
      const userRef = db.ref('users').push();
      await db.ref().update({ ['users/' + userRef.key]: { username:identifier, id, password, friends:{}, createdAt:firebase.database.ServerValue.TIMESTAMP }, ['usernameIndex/' + usernameKey]:userRef.key, ['idIndex/' + id]:userRef.key });
      state.user = { key:userRef.key, username:identifier, id };
    } else {
      const key = await accountKey(identifier);
      if (!key) throw new Error('No account found.');
      const snap = await db.ref('users/' + key).get();
      const user = snap.val();
      if (!user || user.password !== password) throw new Error('Incorrect password.');
      state.user = { key, username:user.username, id:user.id, avatar:user.avatar || '' };
    }
    localStorage.setItem('vusServersSession', JSON.stringify(state.user));
    showApp();
  } catch (error) { els.authError.textContent = error.message || 'Could not sign in.'; } finally { els.authStatus.textContent = ''; }
}
async function ensureFirebaseAccess() {
  if (firebaseAuth.currentUser) return;
  try {
    await firebaseAuth.signInAnonymously();
  } catch (error) {
    console.error('[Sektor] Could not authenticate with the database.', error);
    throw new Error('Could not connect to the account service. Anonymous sign-in may need to be enabled in Firebase Authentication.');
  }
}
async function showApp() { els.authView.hidden = true; els.appView.hidden = false; els.logout.textContent = state.user.username.slice(0,2).toUpperCase(); await ensureFirebaseAccess(); startOnlinePresence(); loadFriends(); loadServers(); }
function showAuth() { els.authView.hidden = false; els.appView.hidden = true; }
function avatarMarkup(user, className) { const image = user && user.avatar; return image ? '<div class="' + className + ' has-image"><img src="' + esc(image) + '" alt=""></div>' : '<div class="' + className + '">' + esc((user && user.name || state.user.username).slice(0,2).toUpperCase()) + '</div>'; }
function showError(message) { if (els.authError) els.authError.textContent = message; console.error('[Sektor]', message); }
window.addEventListener('error', event => { console.error('[Sektor] runtime error', event.error || event.message, event.filename, event.lineno, event.colno); showError('App error: ' + (event.error && event.error.message || event.message || 'unknown error')); });
window.addEventListener('unhandledrejection', event => { console.error('[Sektor] unhandled rejection', event.reason); showError('App error: ' + (event.reason && event.reason.message || event.reason || 'unknown error')); });
function renderServerRail() { els.serverList.innerHTML = ''; state.servers.forEach(server => { const button = document.createElement('button'); button.className = 'server-button' + (state.server && state.server.code === server.code ? ' active' : ''); button.style.setProperty('--server-accent', server.accent || '#5865f2'); button.innerHTML = server.icon ? '<img src="' + esc(server.icon) + '" alt="">' : esc((server.name || 'VS').slice(0,2).toUpperCase()); button.title = server.name + (server.description ? '\n' + server.description : ''); button.onclick = () => selectServer(server.code); els.serverList.appendChild(button); }); els.logout.innerHTML = state.user.avatar ? '<img src="' + esc(state.user.avatar) + '" alt="Profile">' : esc(state.user.username.slice(0,2).toUpperCase()); }
function localServers() { try { return JSON.parse(localStorage.getItem('vusServersLocal') || '[]'); } catch (error) { return []; } }
function saveLocalServers(servers) { localStorage.setItem('vusServersLocal', JSON.stringify(servers)); }
async function loadServers() {
  const joined = JSON.parse(localStorage.getItem('vusServersJoined') || '[]');
  const visible = server => server.ownerKey === state.user.key || joined.includes(server.code);
  const savedLocally = localServers().filter(visible).filter(server => !/^TEST-/.test(server.code || ''));
  let useLocalTestServer = false;
  try {
    const snap = await db.ref('serverMeta').get();
    const remote = Object.entries(snap.val() || {}).map(([code, server]) => ({code, ...server})).filter(visible).filter(server => !/^TEST-/.test(server.code || ''));
    const byCode = new Map(savedLocally.map(server => [server.code, server]));
    remote.forEach(server => byCode.set(server.code, server));
    state.servers = [...byCode.values()];
  } catch (error) {
    state.servers = savedLocally;
    useLocalTestServer = true;
    showError('Online storage is unavailable. Local servers are enabled on this device.');
  }
  saveLocalServers(localServers().filter(server => !/^TEST-/.test(server.code || '')));
  const joinedWithoutTest = JSON.parse(localStorage.getItem('vusServersJoined') || '[]').filter(code => !/^TEST-/.test(code));
  if (joinedWithoutTest.length !== JSON.parse(localStorage.getItem('vusServersJoined') || '[]').length) {
    localStorage.setItem('vusServersJoined', JSON.stringify(joinedWithoutTest));
  }
  renderServerRail();
  if (state.activeView !== 'server') return;
  if (state.servers[0]) selectServer(state.servers[0].code); else clearServer();
}
function openCreateServerModal() { els.modalTitle.textContent = 'Create a server'; els.modalBody.innerHTML = '<label class="modal-label" for="newServerName">Server name</label><input id="newServerName" class="modal-input" maxlength="32" placeholder="My community"><label class="modal-label" for="newServerColor">Accent color</label><input id="newServerColor" class="modal-color" type="color" value="#5865d9"><div id="modalError" class="error"></div><button id="confirmServer" class="primary-btn">Create server</button>'; els.modal.hidden = false; document.getElementById('newServerName').focus(); document.getElementById('confirmServer').onclick = confirmCreateServer; }
async function confirmCreateServer() {
  const nameInput = document.getElementById('newServerName');
  const error = document.getElementById('modalError');
  const name = nameInput.value.trim();
  if (!name) { error.textContent = 'Enter a server name.'; return; }
  const button = document.getElementById('confirmServer');
  button.disabled = true;
  const ref = db.ref('serverMeta').push();
  const code = ref.key.slice(-8).toUpperCase();
  const meta = { name:name.slice(0,32), ownerKey:state.user.key, ownerName:state.user.username, accent:document.getElementById('newServerColor').value, createdAt:firebase.database.ServerValue.TIMESTAMP, channels:{ general:{name:'general',type:'text',topic:'A place to talk.'}, announcements:{name:'announcements',type:'announcement',topic:'Owner updates only.'}, lounge:{name:'Lounge',type:'voice',topic:'Hang out together.'} }, ranks:{} };
  let localOnly = false;
  try {
    await ensureFirebaseAccess();
    await db.ref('serverMeta/' + code).set(meta);
  } catch (firebaseError) {
    localOnly = true;
  }
  const savedServer = {...meta, createdAt:Date.now(), code, localOnly};
  saveLocalServers([...localServers().filter(server => server.code !== code), savedServer]);
  els.modal.hidden = true;
  state.servers.push(savedServer);
  renderServerRail();
  selectServer(code);
}
function clearSubscriptions() { leaveVoice(); if (state.metaRef && state.metaHandler) state.metaRef.off('value', state.metaHandler); if (state.presenceListRef && state.presenceHandler) state.presenceListRef.off('value', state.presenceHandler); if (state.unsubMessages) state.unsubMessages(); unreadChannelWatchers.forEach(watcher => watcher.ref.off('child_added', watcher.handler)); unreadChannelWatchers.clear(); unreadChannels = {}; if (state.presenceRef) { state.presenceRef.onDisconnect().cancel(); state.presenceRef.remove(); } state.metaRef = state.metaHandler = state.presenceListRef = state.presenceHandler = state.unsubMessages = state.presenceRef = null; }
async function selectServer(code) {
  const navigationVersion = state.navigationVersion = (state.navigationVersion || 0) + 1;
  state.activeView = 'server';
  try {
    clearSubscriptions();
    closePrivateDm();
    state.server = state.servers.find(server => server.code === code);
    channelReadAt = loadChannelReadState(state.server);
    unreadChannels = {};
    updateEditModeUi();
    state.channel = 'general';
    if (!state.server) return;
    els.friendsBtn.classList.remove('active');
    els.friendHome.hidden = true;
    els.friendRequestsPanel.hidden = true;
    els.friendsDirectory.hidden = true;
    els.textChannelsLabel.hidden = false;
    els.textChannels.hidden = false;
    els.voiceChannelsLabel.hidden = false;
    els.voiceChannels.hidden = false;
    els.voiceMembers.hidden = false;
    els.voiceControls.hidden = true;
    localStorage.setItem('vusServersJoined', JSON.stringify([...new Set([...(JSON.parse(localStorage.getItem('vusServersJoined') || '[]')), code])]));
    renderServerRail();
    if (state.server.localOnly) {
      state.serverMembers = {[state.user.key]:{key:state.user.key,name:state.user.username,avatar:state.user.avatar || ''}};
      renderMembers(state.serverMembers);
      renderServer();
      return;
    }
    const presenceRef = db.ref('serverPresence/' + code + '/' + state.user.key);
    state.presenceRef = presenceRef;
    state.metaRef = db.ref('serverMeta/' + code);
    state.metaHandler = snap => {
      if (navigationVersion !== state.navigationVersion || state.activeView !== 'server') return;
      state.server = snap.exists() ? {code,...snap.val()} : null;
      updateEditModeUi();
      renderServer();
    };
    state.metaRef.on('value', state.metaHandler);
    state.presenceListRef = db.ref('serverPresence/' + code);
    state.presenceHandler = snap => {
      if (navigationVersion === state.navigationVersion && state.activeView === 'server') renderMembers(snap.val() || {});
    };
    state.presenceListRef.on('value', state.presenceHandler);
    renderServer();
    presenceRef.onDisconnect().remove()
      .then(() => {
        if (navigationVersion !== state.navigationVersion || state.activeView !== 'server') return;
        return presenceRef.set({key:state.user.key,name:state.user.username,avatar:state.user.avatar || ''});
      })
      .catch(error => {
        if (navigationVersion === state.navigationVersion && state.activeView === 'server') {
          console.error('[Sektor] Could not update server presence.', error);
          showError('Could not update online server presence.');
        }
      });
  } catch (error) {
    if (navigationVersion === state.navigationVersion) showError(error.message || 'Could not open that server.');
  }
}
async function openJoinServerModal() { els.modalTitle.textContent = 'Join a server'; els.modalBody.innerHTML = '<label class="modal-label" for="joinCode">Invite code</label><input id="joinCode" class="modal-input" maxlength="20" placeholder="Paste an invite code"><div id="modalError" class="error"></div><button id="confirmJoin" class="primary-btn">Join server</button>'; els.modal.hidden = false; document.getElementById('joinCode').focus(); document.getElementById('confirmJoin').onclick = async () => { const code = document.getElementById('joinCode').value.trim().toUpperCase(); const error = document.getElementById('modalError'); if (!code) { error.textContent = 'Enter an invite code.'; return; } try { const snap = await db.ref('serverMeta/' + safe(code)).get(); if (!snap.exists()) throw new Error('Server not found.'); state.servers.push({code,...snap.val()}); els.modal.hidden = true; await selectServer(code); } catch (joinError) { error.textContent = joinError.message || 'Could not join server.'; } }; }
function openProfileModal() { if (!state.user) return; state.user.avatar = state.user.avatar || ''; els.modalTitle.textContent = 'Your profile'; els.modalBody.innerHTML = '<img id="profilePreview" class="profile-preview" src="' + esc(state.user.avatar) + '" alt=""><label class="modal-label" for="profileFile">Profile picture</label><input id="profileFile" class="profile-file" type="file" accept="image/*"><div id="modalError" class="error"></div><button id="saveProfile" class="primary-btn" type="button">Save profile</button>'; const preview = document.getElementById('profilePreview'); if (!state.user.avatar) preview.style.display = 'none'; document.getElementById('profileFile').onchange = event => { const file = event.target.files[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { document.getElementById('modalError').textContent = 'Choose an image under 2 MB.'; return; } const reader = new FileReader(); reader.onload = () => { preview.src = reader.result; preview.style.display = 'block'; preview.dataset.value = reader.result; }; reader.readAsDataURL(file); }; document.getElementById('saveProfile').onclick = () => { state.user.avatar = preview.dataset.value || state.user.avatar || ''; localStorage.setItem('vusServersSession', JSON.stringify(state.user)); renderServerRail(); els.modal.hidden = true; if (state.server) selectServer(state.server.code); }; els.modal.hidden = false; }
function openFriendModal() { els.modalTitle.textContent = 'Add a friend'; els.modalBody.innerHTML = '<label class="modal-label" for="friendSearch">Search by username</label><div class="friend-search-row"><input id="friendSearch" class="modal-input" maxlength="24" placeholder="username"><button id="friendSearchBtn" class="modal-secondary">Search</button></div><div id="friendResults" class="friend-results"></div><div id="modalError" class="error"></div>'; els.modal.hidden = false; const input = document.getElementById('friendSearch'); const search = async () => { const query = input.value.trim().toLowerCase(); const results = document.getElementById('friendResults'); const error = document.getElementById('modalError'); results.innerHTML = ''; error.textContent = ''; if (!query) { error.textContent = 'Enter a username.'; return; } const localMatches = Object.values(state.serverMembers || {}).filter(member => member.name.toLowerCase().includes(query) && member.key !== state.user.key); if (localMatches.length) renderFriendResults(localMatches.map(member => ({key:member.key,username:member.name})), results, error); else { try { const snap = await db.ref('usernameIndex/' + query).get(); if (!snap.exists()) throw new Error('No user found with that username.'); const key = snap.val(); const userSnap = await db.ref('users/' + key).get(); const user = userSnap.val(); if (!user) throw new Error('No user found with that username.'); renderFriendResults([{key,username:user.username}], results, error); } catch (searchError) { error.textContent = searchError.message || 'Could not search right now.'; } } }; document.getElementById('friendSearchBtn').onclick = search; input.onkeydown = event => { if (event.key === 'Enter') search(); }; input.focus(); }
function renderFriendResults(users, container, error) { users.forEach(user => { const row = document.createElement('div'); row.className = 'friend-result'; row.innerHTML = '<span>@' + esc(user.username) + '</span><button class="modal-secondary">Add</button>'; row.querySelector('button').onclick = async () => { try { await db.ref('users/' + user.key + '/friendRequestsIncoming/' + state.user.key).set({fromUsername:state.user.username,sentAt:firebase.database.ServerValue.TIMESTAMP}); row.querySelector('button').textContent = 'Sent'; row.querySelector('button').disabled = true; } catch (requestError) { error.textContent = 'Could not send the friend request.'; } }; container.appendChild(row); }); }
function openFriendModal() {
  els.modalTitle.textContent = 'Add a friend';
  els.modalBody.innerHTML = '<label class="modal-label" for="friendSearch">Search by username</label><div class="friend-search-row"><input id="friendSearch" class="modal-input" maxlength="24" placeholder="username"><button id="friendSearchBtn" class="modal-secondary">Search</button></div><div id="friendResults" class="friend-results"></div><div id="modalError" class="error"></div>';
  els.modal.hidden = false;
  const input = document.getElementById('friendSearch'); const results = document.getElementById('friendResults'); const error = document.getElementById('modalError');
  const search = async () => {
    const query = input.value.trim().toLowerCase(); results.innerHTML = ''; error.textContent = ''; if (!query) { error.textContent = 'Enter a username.'; return; }
    try {
      const keySnap = await db.ref('usernameIndex/' + query).get(); if (!keySnap.exists()) throw new Error('No user found with that username.');
      const key = keySnap.val(); if (key === state.user.key) throw new Error('That is your own account.');
      const userSnap = await db.ref('users/' + key).get(); const user = userSnap.val(); if (!user) throw new Error('No user found with that username.');
      const row = document.createElement('div'); row.className = 'friend-result'; row.innerHTML = '<span>@' + esc(user.username) + '</span><button class="modal-secondary">Send request</button>'; const button = row.querySelector('button');
      button.onclick = async () => { button.disabled = true; try { const updates = {}; updates['users/' + key + '/friendRequestsIncoming/' + state.user.key] = {fromKey:state.user.key,fromUsername:state.user.username,fromAvatar:state.user.avatar || '',sentAt:firebase.database.ServerValue.TIMESTAMP}; updates['users/' + state.user.key + '/friendRequestsOutgoing/' + key] = {toUsername:user.username,sentAt:firebase.database.ServerValue.TIMESTAMP}; await db.ref().update(updates); button.textContent = 'Sent'; } catch (sendError) { button.disabled = false; error.textContent = 'Could not send the friend request.'; } };
      results.appendChild(row);
    } catch (searchError) { error.textContent = searchError.message || 'Could not search right now.'; }
  };
  document.getElementById('friendSearchBtn').onclick = search; input.onkeydown = event => { if (event.key === 'Enter') search(); }; input.focus();
}
function channels() { return Object.entries((state.server && state.server.channels) || {}).filter(([, channel]) => channel && typeof channel === 'object').map(([id, channel]) => ({id,...channel, type:channel.type === 'games' || channel.game === true ? 'text' : channel.type, topic:String(channel.topic || '').replace(/^\[games\]\s*/, '')})); }
function channelReadStorageKey(server = state.server) { return server && state.user ? 'vusChannelRead_' + safe(state.user.key) + '_' + safe(server.code) : ''; }
function loadChannelReadState(server) {
  const key = channelReadStorageKey(server);
  try {
    const saved = key ? JSON.parse(localStorage.getItem(key) || '{}') : {};
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch (error) {
    console.error('[Sektor] Could not load channel read state.', error);
    return {};
  }
}
function saveChannelReadState() {
  const key = channelReadStorageKey();
  if (key) localStorage.setItem(key, JSON.stringify(channelReadAt));
}
function markChannelRead(channelId, readAt = Date.now()) {
  channelReadAt[channelId] = Math.max(Number(channelReadAt[channelId]) || 0, Date.now(), Number(readAt) || 0);
  unreadChannels[channelId] = false;
  saveChannelReadState();
  updateChannelUnreadDot(channelId);
}
function updateChannelUnreadDot(channelId) {
  const unread = !!unreadChannels[channelId];
  [...els.textChannels.querySelectorAll('.channel-button'), ...els.voiceChannels.querySelectorAll('.channel-button')]
    .filter(button => button.dataset.channelId === channelId)
    .forEach(button => {
      const dot = button.querySelector('.channel-unread');
      if (dot) dot.hidden = !unread;
      button.classList.toggle('has-unread', unread);
    });
}
function setChannelUnread(channelId, unread) {
  unreadChannels[channelId] = unread;
  updateChannelUnreadDot(channelId);
}
function refreshLocalChannelUnread(channel) {
  if (!state.server || !state.server.localOnly) return;
  const key = 'vusMessages_' + state.server.code + '_' + safe(channel.id);
  const messages = JSON.parse(localStorage.getItem(key) || '[]');
  const lastRead = Number(channelReadAt[channel.id]) || 0;
  const unread = messages.some(message => message && message.key !== state.user.key && Number(message.ts) > lastRead);
  setChannelUnread(channel.id, unread);
}
function syncUnreadChannelWatchers(textChannels) {
  if (!state.server || state.server.localOnly) {
    textChannels.forEach(refreshLocalChannelUnread);
    return;
  }
  const serverCode = state.server.code;
  const channelIds = new Set(textChannels.map(channel => channel.id));
  unreadChannelWatchers.forEach((watcher, channelId) => {
    if (watcher.serverCode !== serverCode || !channelIds.has(channelId)) {
      watcher.ref.off('child_added', watcher.handler);
      unreadChannelWatchers.delete(channelId);
    }
  });
  textChannels.forEach(channel => {
    if (unreadChannelWatchers.has(channel.id)) return;
    const ref = db.ref('serverMessages/' + serverCode + '/' + safe(channel.id)).limitToLast(100);
    const handler = snap => {
      if (!snap.exists() || !snap.val() || state.activeView !== 'server' || !state.server || state.server.code !== serverCode) return;
      const message = snap.val();
      if (state.channel === channel.id || message.key === state.user.key) return;
      if (Number(message.ts) > (Number(channelReadAt[channel.id]) || 0)) setChannelUnread(channel.id, true);
    };
    unreadChannelWatchers.set(channel.id, {serverCode,ref,handler});
    ref.on('child_added', handler);
  });
}
function isGamesChannel() { return false; }
function rankForMember(memberKey, memberName) { if (!state.server) return null; if (state.server.ownerKey === memberKey) return {name:'Owner', color:'#e8b768', permissions:{manage:true}}; const rank = state.server.ranks && state.server.ranks[memberKey]; if (!rank) return null; return typeof rank === 'string' ? {name:rank, color:'#9aa5b4', permissions:{}} : rank; }
function renderServer() {
  if (state.dmFriend) closePrivateDm();
  if (!state.server) return clearServer();
  els.serverName.textContent = state.server.name;
  els.serverCode.textContent = 'Invite code: ' + state.server.code;
  const allChannels = channels();
  const text = allChannels.filter(channel => !['voice','video','games'].includes(channel.type));
  const voice = allChannels.filter(channel => channel.type === 'voice' || channel.type === 'video');
  const games = allChannels.filter(channel => channel.type === 'games');
  const current = allChannels.find(channel => channel.id === state.channel) || text[0];
  if (current) state.channel = current.id;
  const owner = state.server.ownerKey === state.user.key;
  els.textChannels.innerHTML = '';
  text.forEach(channel => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'channel-button' + (current && state.channel === channel.id ? ' active' : '');
    button.dataset.channelId = channel.id;
    button.innerHTML = '<span>#</span><span>' + esc(channel.name) + '</span><span class="channel-unread" aria-label="Unread messages" hidden></span>';
    button.setAttribute('aria-pressed', String(current && state.channel === channel.id));
    if (owner && !channel.default) addChannelDeleteButton(button, channel);
    els.textChannels.appendChild(button);
    updateChannelUnreadDot(channel.id);
  });
  els.voiceChannels.innerHTML = '';
  voice.forEach(channel => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'channel-button';
    button.dataset.channelId = channel.id;
    button.innerHTML = '<span>' + (channel.type === 'video' ? '▣' : '🔊') + '</span><span>' + esc(channel.name) + '</span><span class="channel-meta">Join</span><span class="channel-unread" aria-label="Unread activity" hidden></span>';
    button.onclick = () => joinVoice(channel.id, channel.type === 'video');
    if (owner && !channel.default) addChannelDeleteButton(button, channel);
    els.voiceChannels.appendChild(button);
    updateChannelUnreadDot(channel.id);
  });
  games.forEach(channel => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'channel-button' + (current && state.channel === channel.id ? ' active' : '');
    button.dataset.channelId = channel.id;
    button.innerHTML = '<span>🎲</span><span>' + esc(channel.name) + '</span><span class="channel-unread" aria-label="Unread activity" hidden></span>';
    button.setAttribute('aria-pressed', String(current && state.channel === channel.id));
    if (owner && !channel.default) addChannelDeleteButton(button, channel);
    els.textChannels.appendChild(button);
    updateChannelUnreadDot(channel.id);
  });
  els.ownerTools.hidden = !owner;
  syncUnreadChannelWatchers(text);
  if (!current) return;
  const announcementChannel = current.type === 'announcement';
  const announcement = state.server.announcement;
  els.channelName.textContent = current.name;
  els.channelTopic.textContent = current.topic || '';
  els.channelPermission.textContent = announcementChannel ? 'OWNER ONLY' : '';
  els.announcement.hidden = !(announcementChannel && announcement);
  els.announcementText.textContent = announcement ? announcement.text : '';
  els.ownerComposer.hidden = !(announcementChannel && owner);
  els.messageInput.placeholder = announcementChannel ? 'Only the server owner can post here' : 'Message #' + current.name;
  markChannelRead(current.id, announcementChannel && announcement ? announcement.ts : Date.now());
  if (!announcement && current.id === 'announcements') setChannelUnread('announcements', false);
  else if (announcement && !announcementChannel && Number(announcement.ts) > (Number(channelReadAt.announcements) || 0)) setChannelUnread('announcements', true);
  selectMessages(current.id);
  els.messageForm.hidden = announcementChannel;
}
function addChannelDeleteButton(channelButton, channel) { if (!isOwnerEditing()) return; const renameButton = document.createElement('button'); renameButton.className = 'channel-action channel-rename'; renameButton.type = 'button'; renameButton.title = 'Rename ' + channel.name; renameButton.textContent = '✎'; renameButton.onclick = event => { event.stopPropagation(); openRenameChannelModal(channel); }; channelButton.appendChild(renameButton); if (['general','announcements','lounge'].includes(channel.id)) return; const removeButton = document.createElement('button'); removeButton.className = 'channel-action channel-delete'; removeButton.type = 'button'; removeButton.title = 'Delete ' + channel.name; removeButton.textContent = '×'; removeButton.onclick = event => { event.stopPropagation(); openDeleteChannelModal(channel); }; channelButton.appendChild(removeButton); }
function openRenameChannelModal(channel) { if (!state.server || state.server.ownerKey !== state.user.key) return; els.modalTitle.textContent = 'Rename channel'; els.modalBody.innerHTML = '<label class="modal-label" for="renameChannelName">Channel name</label><input id="renameChannelName" class="modal-input" maxlength="24" value="' + esc(channel.name) + '"><div id="modalError" class="error"></div><button id="saveChannelName" class="primary-btn">Save name</button>'; els.modal.hidden = false; const input = document.getElementById('renameChannelName'); const error = document.getElementById('modalError'); input.focus(); input.select(); document.getElementById('saveChannelName').onclick = async () => { const name = input.value.trim(); if (!name) { error.textContent = 'Enter a channel name.'; return; } try { if (state.server.localOnly) { state.server.channels[channel.id].name = name.slice(0,24); saveLocalServers(localServers().map(server => server.code === state.server.code ? state.server : server)); } else await db.ref('serverMeta/' + state.server.code + '/channels/' + channel.id + '/name').set(name.slice(0,24)); els.modal.hidden = true; renderServer(); } catch (renameError) { error.textContent = 'Could not rename this channel.'; } }; }
function openDeleteChannelModal(channel) { els.modalTitle.textContent = 'Delete channel'; els.modalBody.innerHTML = '<p class="modal-copy">Delete <strong>#' + esc(channel.name) + '</strong>? Messages in this channel will no longer be available.</p><div id="modalError" class="error"></div><div class="modal-actions"><button id="cancelDelete" class="modal-secondary">Cancel</button><button id="confirmDelete" class="modal-danger">Delete channel</button></div>'; els.modal.hidden = false; document.getElementById('cancelDelete').onclick = () => { els.modal.hidden = true; }; document.getElementById('confirmDelete').onclick = async () => { try { if (state.server.localOnly) { delete state.server.channels[channel.id]; saveLocalServers(localServers().map(server => server.code === state.server.code ? state.server : server)); } else await db.ref('serverMeta/' + state.server.code + '/channels/' + channel.id).remove(); if (state.channel === channel.id) state.channel = 'general'; els.modal.hidden = true; renderServer(); } catch (error) { document.getElementById('modalError').textContent = 'Could not delete this channel.'; } }; }
function closePrivateDm() { state.dmFriend = null; if (state.dmRef && state.dmHandler) state.dmRef.off('child_added', state.dmHandler); state.dmRef = null; state.dmHandler = null; }
function selectChannel(id) {
  if (!state.server || !channels().some(channel => channel.id === id)) return;
  closePrivateDm();
  leaveVoice();
  els.friendRequestsPanel.hidden = true;
  els.friendsDirectory.hidden = true;
  els.textChannelsLabel.hidden = false;
  els.textChannels.hidden = false;
  els.voiceChannelsLabel.hidden = false;
  els.voiceChannels.hidden = false;
  els.voiceMembers.hidden = false;
  els.voiceControls.hidden = false;
  els.friendsBtn.classList.remove('active');
  els.friendHome.hidden = true;
  state.channel = id;
  markChannelRead(id);
  renderServer();
}
els.textChannels.addEventListener('click', event => {
  const channelButton = event.target.closest('button[data-channel-id]');
  if (!channelButton || !els.textChannels.contains(channelButton) || event.target.closest('.channel-action')) return;
  selectChannel(channelButton.dataset.channelId);
});
function defaultNexusData() {
  return {
    users: [],
    listings: [{id:'sample-1', name:'Neon alley poster', type:'art', price:120, owner:'Market'}],
    auctions: [{id:'auction-1', item:'Golden avatar frame', bid:250, bidder:'Open bid'}],
    chat: [{user:'System', text:'Welcome to Nexus. Trade, chat, and spin the daily wheel.'}],
    wheelClaims: {}
  };
}
function normalizeNexusData(saved) {
  const defaults = defaultNexusData();
  return {
    users: Array.isArray(saved && saved.users) ? saved.users : defaults.users,
    listings: Array.isArray(saved && saved.listings) ? saved.listings : defaults.listings,
    auctions: Array.isArray(saved && saved.auctions) ? saved.auctions : defaults.auctions,
    chat: Array.isArray(saved && saved.chat) ? saved.chat : defaults.chat,
    wheelClaims: saved && saved.wheelClaims && typeof saved.wheelClaims === 'object' ? saved.wheelClaims : defaults.wheelClaims
  };
}
function getBlobtownData() {
  if (state.nexusData) return state.nexusData;
  try {
    return normalizeNexusData(JSON.parse(localStorage.getItem('blobtownEconomy') || '{}'));
  } catch (error) {
    return defaultNexusData();
  }
}
function saveBlobtownData(data) {
  state.nexusData = normalizeNexusData(data);
  localStorage.setItem('blobtownEconomy', JSON.stringify(state.nexusData));
  if (!state.nexusRef) return Promise.resolve();
  return state.nexusRef.set(state.nexusData).catch(error => {
    const root = els.gamesPanel.querySelector('[data-blobtown-root]');
    if (root) setBlobtownStatus(root, 'Could not sync with the Nexus world. Check your connection.', true);
    console.error('[Sektor] Could not sync Nexus data.', error);
  });
}
async function loadNexusWorld() {
  if (state.nexusLoaded) {
    return;
  }
  if (state.nexusLoading) return;
  state.nexusLoading = true;
  try {
    if (!state.nexusRef) {
      state.nexusRef = db.ref('nexus/sharedWorld');
      state.nexusHandler = snapshot => {
        state.nexusData = normalizeNexusData(snapshot.val() || {});
        if (state.nexusInitialized) {
          state.nexusLoaded = true;
          state.nexusError = '';
        }
      };
      state.nexusRef.on('value', state.nexusHandler);
    }
    const snapshot = await state.nexusRef.get();
    if (snapshot.exists()) {
      state.nexusData = normalizeNexusData(snapshot.val());
      state.nexusInitialized = true;
      state.nexusLoaded = true;
      state.nexusError = '';
    } else {
      let initial = defaultNexusData();
      try {
        const saved = JSON.parse(localStorage.getItem('blobtownEconomy') || 'null');
        if (saved && typeof saved === 'object') initial = normalizeNexusData(saved);
      } catch (error) {}
      await saveBlobtownData(initial);
      state.nexusInitialized = true;
      state.nexusLoaded = true;
      state.nexusError = '';
    }
  } catch (error) {
    state.nexusLoaded = false;
    state.nexusError = 'Could not connect to the Nexus world. Check the server and try again.';
    showError(state.nexusError);
  } finally {
    state.nexusLoading = false;
  }
}
function getBlobtownSession() {
  try {
    const raw = localStorage.getItem('blobtownSession');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}
function setBlobtownSession(user) { localStorage.setItem('blobtownSession', JSON.stringify(user)); }
function clearBlobtownSession() { localStorage.removeItem('blobtownSession'); }
function blobtownCurrencyName() { return 'Sektorium'; }
function cloneBlobtownUsers() {
  const data = getBlobtownData();
  if (!data.users.length) return [];
  return data.users.map(user => ({...user}));
}
function blobtownCurrentUser() {
  const session = getBlobtownSession();
  if (!session) return null;
  const data = getBlobtownData();
  return data.users.find(user => user.username === session.username) || null;
}
function setBlobtownStatus(root, message, isError) {
  const status = root && root.querySelector('[data-blobtown-status]');
  if (!status) return;
  status.textContent = message || '';
  status.classList.toggle('blobtown-status-error', !!isError);
}
function blobtownUpdateBalances(data, username, delta) {
  const user = data.users.find(item => item.username === username);
  if (!user) return;
  user.balance = Math.max(0, Number(user.balance || 0) + Number(delta || 0));
}
function renderGamesPanel(active, standalone = false) {
  const games = [
    {id:'would-you-rather',icon:'🤔',name:'Would You Rather',desc:'Pick a side and see what the party chooses.'},
    {id:'trivia-blitz',icon:'🧠',name:'Trivia Blitz',desc:'Challenge the room with quick-fire questions.'},
    {id:'rock-paper-scissors',icon:'✊',name:'Rock Paper Scissors',desc:'Start a quick best-of-three match.'},
  ];
  const activeGame = games.find(game => game.id === (active && active.gameId));
  const blobtownMarkup = activeGame && activeGame.id === 'blobtown-2d' ? `
    <div class="blobtown-panel" data-blobtown-root>
      <div class="blobtown-copy">
        <div class="blobtown-kicker">Nexus · social economy</div>
        <p>Join a shared world to trade items, bid in auctions, chat with other players, and spin the daily wheel. The world is shared by everyone connected to the same multiplayer server.</p>
        <div class="blobtown-tags"><span>Auctions</span><span>Marketplace</span><span>Live chat</span><span>Daily wheel</span></div>
        <div class="blobtown-stats"><span>500 <strong>${blobtownCurrencyName()}</strong> starter wallet</span><span>${useLanBackend ? 'Shared server world' : 'This browser only'}</span></div>
      </div>
      <div class="blobtown-coin-wrap"><div class="blobtown-coin" aria-label="${blobtownCurrencyName()} currency"><span>S</span></div></div>
      <div class="blobtown-eco">
        <div class="blobtown-status" data-blobtown-status>${state.nexusError ? esc(state.nexusError) : state.nexusLoaded ? '' : 'Connecting to the Nexus world…'}</div>
        ${!state.nexusLoaded ? '' : (() => {
          const session = getBlobtownSession();
          const data = getBlobtownData();
          const user = session ? data.users.find(entry => entry.username === session.username) : null;
          if (!user) {
            return `
              <div class="blobtown-auth-box">
                <div class="blobtown-auth-row">
                  <input data-blobtown-username placeholder="Username" maxlength="20">
                  <input data-blobtown-password type="password" placeholder="Password" maxlength="32">
                </div>
                <div class="blobtown-auth-actions">
                  <button type="button" data-blobtown-action="signup">Create account</button>
                  <button type="button" data-blobtown-action="login">Log in</button>
                </div>
              </div>
            `;
          }
          const today = new Date().toISOString().slice(0,10);
          const alreadySpun = user.lastWheelDate === today;
          return `
            <div class="blobtown-wallet-row">
              <div>
                <strong>${esc(user.username)}</strong>
                <small>${user.balance} ${esc(blobtownCurrencyName())}</small>
              </div>
            <div class="blobtown-wallet-actions">
              <button type="button" data-blobtown-spin ${alreadySpun ? 'disabled' : ''}>${alreadySpun ? 'Wheel done' : 'Spin daily wheel'}</button>
            </div>
          </div>
          <div class="blobtown-form-box">
              <div class="blobtown-form-row">
                <input data-blobtown-listing-name placeholder="Item name" maxlength="32">
                <input data-blobtown-listing-price placeholder="Price" type="number" min="1" max="99999">
              </div>
              <div class="blobtown-form-row">
                <select data-blobtown-listing-type>
                  <option value="art">Art</option>
                  <option value="sound">Sound</option>
                  <option value="video">Video</option>
                  <option value="item">Item</option>
                </select>
                <label class="blobtown-upload-label">
                  Add media
                  <input data-blobtown-media type="file" accept="audio/*,video/*,image/*">
                </label>
              </div>
              <button type="button" data-blobtown-list-item>Sell item</button>
            </div>
          `;
        })()}
        <div class="blobtown-section">
            <div class="blobtown-section-title">Nexus marketplace</div>
          <div class="blobtown-list">
            ${(() => {
              const data = getBlobtownData();
              const items = data.listings.length ? data.listings.slice(-25) : [{id:'sample-1', name:'Neon alley poster', type:'art', price:120, owner:'Market'}];
              return items.map(item => `
                <div class="blobtown-item">
                  <div>
                    <strong>${esc(item.name)}</strong>
                    <small>${esc(item.type)} · ${Number(item.price || 0)} ${esc(blobtownCurrencyName())}</small>
                  </div>
                  <button type="button" data-blobtown-buy="${esc(item.id)}">Buy</button>
                </div>
              `).join('');
            })()}
          </div>
        </div>
        <div class="blobtown-section">
          <div class="blobtown-section-title">Nexus auction room</div>
          <div class="blobtown-list">
            ${(() => {
              const data = getBlobtownData();
              const auctions = data.auctions.length ? data.auctions.slice(-25) : [{id:'auction-1', item:'Golden avatar frame', bid:250, bidder:'Open bid'}];
              return auctions.map(item => `
                <div class="blobtown-item">
                  <div>
                    <strong>${esc(item.item)}</strong>
                    <small>High bid ${Number(item.bid || 0)} ${esc(blobtownCurrencyName())} · ${esc(item.bidder || 'Open bid')}</small>
                  </div>
                  <button type="button" data-blobtown-bid="${esc(item.id)}">Bid +25</button>
                </div>
              `).join('');
            })()}
          </div>
        </div>
        <div class="blobtown-section">
          <div class="blobtown-section-title">Nexus live chat</div>
          <div class="blobtown-chat-box">
            ${(() => {
              const data = getBlobtownData();
              return (data.chat || []).slice(-6).map(message => `<div class="blobtown-chat-line"><strong>${esc(message.user || 'Unknown')}:</strong> <span>${esc(message.text || '')}</span></div>`).join('');
            })()}
          </div>
          <div class="blobtown-chat-input-row">
            <input data-blobtown-chat-input maxlength="180" placeholder="Say something in Nexus...">
            <button type="button" data-blobtown-chat-send>Send</button>
          </div>
        </div>
      </div>
    </div>
  ` : '';

  els.gamesPanel.innerHTML = standalone
    ? '<div class="games-heading"><strong>Nexus</strong><span>' + (useLanBackend ? 'Shared multiplayer world' : 'Local world · not multiplayer') + '</span></div>' + blobtownMarkup
    : '<div class="games-heading"><strong>Party games</strong><span>Play together with this server</span></div>' + games.map(game => '<article class="game-card"><div class="game-icon">' + game.icon + '</div><div class="game-card-copy"><strong>' + game.name + '</strong><small>' + game.desc + '</small></div><button type="button" data-game="' + game.id + '">' + (active && active.gameId === game.id ? 'Join game' : 'Start game') + '</button></article>').join('') + (active ? '<div class="game-lobby"><strong>' + esc(games.find(game => game.id === active.gameId)?.name || 'Game') + '</strong><span>' + Object.keys(active.players || {}).length + ' player(s) in the lobby</span></div>' : '') + blobtownMarkup;

  els.gamesPanel.querySelectorAll('[data-game]').forEach(button => {
    button.onclick = () => startPartyGame(button.dataset.game);
  });

  const blobtownRoot = els.gamesPanel.querySelector('[data-blobtown-root]');
  if (!blobtownRoot) return;
  if (state.nexusLoaded) setBlobtownStatus(blobtownRoot, '');

  const authAction = event => {
    const current = event.currentTarget;
    const root = current.closest('[data-blobtown-root]');
    const username = (root.querySelector('[data-blobtown-username]') || {}).value || '';
    const password = (root.querySelector('[data-blobtown-password]') || {}).value || '';
    const action = current.dataset.blobtownAction;
    try {
      const data = getBlobtownData();
      const cleanName = username.trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
      if (cleanName.length < 3 || password.length < 4) throw new Error('Use a 3+ character username and 4+ character password.');
      if (action === 'signup') {
        if (data.users.some(user => user.username.toLowerCase() === cleanName.toLowerCase())) throw new Error('That username is already taken.');
        const user = {username: cleanName, password, balance: 500, lastWheelDate: null};
        data.users.push(user);
        saveBlobtownData(data);
        setBlobtownSession(user);
        setBlobtownStatus(root, 'Welcome to Nexus. Your starter wallet is 500 Sektorium.', false);
      } else {
        const user = data.users.find(item => item.username.toLowerCase() === cleanName.toLowerCase() && item.password === password);
        if (!user) throw new Error('No matching account was found.');
        setBlobtownSession({username: user.username});
        setBlobtownStatus(root, 'Logged in to Nexus.', false);
      }
      renderGamesPanel(active, standalone);
    } catch (error) {
      setBlobtownStatus(root, error.message || 'Could not update Nexus.', true);
    }
  };

  const signupButton = blobtownRoot.querySelector('[data-blobtown-action="signup"]');
  const loginButton = blobtownRoot.querySelector('[data-blobtown-action="login"]');
  if (signupButton) signupButton.onclick = authAction;
  if (loginButton) loginButton.onclick = authAction;

  const spinButton = blobtownRoot.querySelector('[data-blobtown-spin]');
  if (spinButton) {
    spinButton.onclick = () => {
      const user = blobtownCurrentUser();
      if (!user) {
        setBlobtownStatus(blobtownRoot, 'Create a Nexus account first.', true);
        return;
      }
      const data = getBlobtownData();
      const today = new Date().toISOString().slice(0,10);
      if (user.lastWheelDate === today) {
        setBlobtownStatus(blobtownRoot, 'You already spun the wheel today.', true);
        return;
      }
      const rewards = [25, 40, 60, 75, 100, 125, 150, 200, 250, 300];
      const reward = rewards[Math.floor(Math.random() * rewards.length)];
      const userEntry = data.users.find(entry => entry.username === user.username);
      if (!userEntry) return;
      userEntry.lastWheelDate = today;
      userEntry.balance = Number(userEntry.balance || 0) + reward;
      data.wheelClaims = data.wheelClaims || {};
      data.wheelClaims[user.username] = today;
      data.chat = Array.isArray(data.chat) ? data.chat : [];
      data.chat.push({user:'Wheel', text:'You landed a ' + reward + ' ' + blobtownCurrencyName() + ' prize.'});
      saveBlobtownData(data);
      setBlobtownStatus(blobtownRoot, 'Daily wheel spin: +' + reward + ' ' + blobtownCurrencyName() + '!', false);
      renderGamesPanel(active, standalone);
    };
  }

  const sellButton = blobtownRoot.querySelector('[data-blobtown-list-item]');
  if (sellButton) {
    sellButton.onclick = () => {
      try {
        const user = blobtownCurrentUser();
        if (!user) throw new Error('Sign in to sell an item.');
        const data = getBlobtownData();
        const nameInput = blobtownRoot.querySelector('[data-blobtown-listing-name]');
        const priceInput = blobtownRoot.querySelector('[data-blobtown-listing-price]');
        const typeInput = blobtownRoot.querySelector('[data-blobtown-listing-type]');
        const mediaInput = blobtownRoot.querySelector('[data-blobtown-media]');
        const name = (nameInput && nameInput.value || '').trim();
        const price = Number(priceInput && priceInput.value || 0);
        const type = (typeInput && typeInput.value) || 'item';
        if (!name || !Number.isFinite(price) || price <= 0) throw new Error('Add an item name and a valid price.');
        const listing = {id: 'listing-' + Date.now() + '-' + Math.random().toString(16).slice(2), name, type, price, owner: user.username};
        if (mediaInput && mediaInput.files && mediaInput.files[0]) {
          const file = mediaInput.files[0];
          const reader = new FileReader();
          reader.onload = () => {
            listing.mediaData = String(reader.result || '');
            listing.mediaType = file.type || type;
            data.listings.push(listing);
            saveBlobtownData(data);
            setBlobtownStatus(blobtownRoot, 'Listing posted to the Nexus shop.', false);
            renderGamesPanel(active, standalone);
          };
          reader.readAsDataURL(file);
          return;
        }
        data.listings.push(listing);
        saveBlobtownData(data);
        setBlobtownStatus(blobtownRoot, 'Listing posted to the Nexus shop.', false);
        renderGamesPanel(active, standalone);
      } catch (error) {
        setBlobtownStatus(blobtownRoot, error.message || 'Could not list that item.', true);
      }
    };
  }

  const buyButtonList = blobtownRoot.querySelectorAll('[data-blobtown-buy]');
  buyButtonList.forEach(button => {
    button.onclick = () => {
      try {
        const user = blobtownCurrentUser();
        if (!user) throw new Error('Create a Nexus account to buy items.');
        const data = getBlobtownData();
        const listing = data.listings.find(item => item.id === button.dataset.blobtownBuy);
        if (!listing) throw new Error('That listing is no longer available.');
        const buyer = data.users.find(entry => entry.username === user.username);
        if (!buyer) throw new Error('Your account could not be found.');
        if (Number(buyer.balance || 0) < Number(listing.price || 0)) throw new Error('You do not have enough ' + blobtownCurrencyName() + '.');
        buyer.balance = Number(buyer.balance || 0) - Number(listing.price || 0);
        if (listing.owner && listing.owner !== 'Market') {
          const owner = data.users.find(entry => entry.username === listing.owner);
          if (owner) owner.balance = Number(owner.balance || 0) + Number(listing.price || 0);
        }
        data.listings = data.listings.filter(item => item.id !== listing.id);
        data.chat.push({user:'Market', text: buyer.username + ' bought ' + listing.name + ' for ' + listing.price + ' ' + blobtownCurrencyName() + '.'});
        saveBlobtownData(data);
        setBlobtownStatus(blobtownRoot, 'Purchase complete. ' + listing.name + ' is in your collection.', false);
        renderGamesPanel(active, standalone);
      } catch (error) {
        setBlobtownStatus(blobtownRoot, error.message || 'Could not complete that purchase.', true);
      }
    };
  });

  const bidButtons = blobtownRoot.querySelectorAll('[data-blobtown-bid]');
  bidButtons.forEach(button => {
    button.onclick = () => {
      try {
        const user = blobtownCurrentUser();
        if (!user) throw new Error('Create a Nexus account to place a bid.');
        const data = getBlobtownData();
        const auction = data.auctions.find(item => item.id === button.dataset.blobtownBid);
        if (!auction) throw new Error('That auction is no longer active.');
        const buyer = data.users.find(entry => entry.username === user.username);
        if (!buyer) throw new Error('Your account could not be found.');
        const newBid = Number(auction.bid || 0) + 25;
        if (Number(buyer.balance || 0) < newBid) throw new Error('You need more ' + blobtownCurrencyName() + ' to outbid that entry.');
        auction.bid = newBid;
        auction.bidder = user.username;
        data.chat.push({user:'Auction', text: user.username + ' bid ' + newBid + ' ' + blobtownCurrencyName() + ' on ' + auction.item + '.'});
        saveBlobtownData(data);
        setBlobtownStatus(blobtownRoot, 'Your bid is now the leading offer.', false);
        renderGamesPanel(active, standalone);
      } catch (error) {
        setBlobtownStatus(blobtownRoot, error.message || 'Could not place that bid.', true);
      }
    };
  });

  const chatSend = blobtownRoot.querySelector('[data-blobtown-chat-send]');
  if (chatSend) {
    chatSend.onclick = () => {
      const user = blobtownCurrentUser();
      const input = blobtownRoot.querySelector('[data-blobtown-chat-input]');
      const text = (input && input.value || '').trim();
      if (!text) return;
      if (!user) {
        setBlobtownStatus(blobtownRoot, 'Sign in to chat in Nexus.', true);
        return;
      }
      const data = getBlobtownData();
      data.chat = Array.isArray(data.chat) ? data.chat : [];
      data.chat.push({user:user.username, text});
      saveBlobtownData(data);
      if (input) input.value = '';
      renderGamesPanel(active, standalone);
    };
  }

};
function watchGamesChannel(channelId) { if (state.gameRef && state.gameHandler) state.gameRef.off('value', state.gameHandler); state.gameRef = db.ref('serverGames/' + state.server.code + '/' + safe(channelId) + '/active'); state.gameHandler = snap => renderGamesPanel(snap.val()); state.gameRef.on('value', state.gameHandler); }
async function startPartyGame(gameId) { if (!state.server || !state.channel) return; const ref = db.ref('serverGames/' + state.server.code + '/' + safe(state.channel) + '/active'); const current = (await ref.get()).val(); const updates = current && current.gameId === gameId ? {['players/' + state.user.key]: {name:state.user.username,joinedAt:firebase.database.ServerValue.TIMESTAMP}} : {gameId,startedBy:state.user.key,startedAt:firebase.database.ServerValue.TIMESTAMP,players:{[state.user.key]:{name:state.user.username,joinedAt:firebase.database.ServerValue.TIMESTAMP}}}; await ref.update(updates); }
function selectMessages(channelId) { if (!channelId || !state.server) { els.messages.hidden = false; els.messageForm.hidden = true; els.gamesPanel.hidden = true; els.messages.innerHTML = '<div class="empty-state">Create or select a server to start talking.</div>'; return; } if (state.unsubMessages) state.unsubMessages(); if (state.gameRef && state.gameHandler) state.gameRef.off('value', state.gameHandler); state.gameRef = state.gameHandler = null; const channel = channels().find(item => item && item.id === channelId); if (channel && channel.type === 'games') { els.messages.hidden = true; els.messageForm.hidden = true; els.gamesPanel.hidden = false; watchGamesChannel(channelId); return; } els.gamesPanel.hidden = true; els.messages.hidden = false; els.messageForm.hidden = false; els.messages.innerHTML = '<div class="empty-state">No messages yet. Say hello.</div>'; if (state.server.localOnly) { const key = 'vusMessages_' + state.server.code + '_' + safe(channelId); const messages = JSON.parse(localStorage.getItem(key) || '[]').filter(message => message && typeof message === 'object'); if (messages.length) { els.messages.innerHTML = ''; messages.forEach(renderMessage); } return; } const ref = db.ref('serverMessages/' + state.server.code + '/' + safe(channelId)).limitToLast(100); const handler = snap => { const value = snap.val(); if (value && typeof value === 'object') renderMessage({id:snap.key,...value}); }; ref.on('child_added', handler); state.unsubMessages = () => ref.off('child_added', handler); }
window.addEventListener('storage', event => {
  if (!event.key || !state.server) return;
  if (event.key === channelReadStorageKey()) {
    const previousReadAt = channelReadAt;
    channelReadAt = loadChannelReadState(state.server);
    channels().forEach(channel => {
      if (Number(channelReadAt[channel.id]) > Number(previousReadAt[channel.id] || 0)) setChannelUnread(channel.id, false);
      refreshLocalChannelUnread(channel);
    });
    return;
  }
  if (!state.server.localOnly) return;
  const changedChannel = channels().find(channel => event.key === 'vusMessages_' + state.server.code + '_' + safe(channel.id));
  if (!changedChannel) return;
  if (state.channel === changedChannel.id) selectMessages(state.channel);
  else refreshLocalChannelUnread(changedChannel);
});
function renderMessage(message) { const empty = els.messages.querySelector('.empty-state'); if (empty) empty.remove(); const item = document.createElement('article'); item.className = 'message'; item.dataset.messageId = message.id || ''; messageCache[message.id] = message; const image = message.image ? '<img class="message-image" src="' + esc(message.image) + '" alt="Image shared by ' + esc(message.name) + '">' : ''; const reply = message.replyTo ? '<div class="reply-preview">Replying to ' + esc(message.replyTo.name) + ': ' + esc(message.replyTo.text) + '</div>' : ''; const reactions = Object.entries(message.reactions || {}).map(([emoji, users]) => '<button class="reaction' + (users && users[state.user.key] ? ' active' : '') + '" data-emoji="' + esc(emoji) + '">' + esc(emoji) + ' ' + Object.keys(users || {}).length + '</button>').join(''); const rank = rankForMember(message.key, message.name); const rankBadge = rank ? '<span class="rank-badge" style="--rank-color:' + esc(rank.color || '#9aa5b4') + '">' + esc(rank.name) + '</span>' : ''; item.innerHTML = avatarMarkup({name:message.name,avatar:message.avatar}, 'message-avatar') + '<div class="message-content"><div class="message-head"><span class="message-name">' + esc(message.name) + '</span>' + rankBadge + '<span class="message-time">' + new Date(message.ts || Date.now()).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) + (message.edited ? ' · edited' : '') + '</span></div>' + reply + '<div class="message-text">' + esc(message.text) + '</div>' + image + '<div class="reaction-list">' + reactions + '</div><div class="message-actions"><button data-action="react">☺ React</button><button data-action="reply">↩ Reply</button>' + (message.key === state.user.key ? '<button data-action="edit">Edit</button>' : '') + '</div></div>'; item.querySelectorAll('.reaction').forEach(button => button.onclick = () => toggleReaction(message, button.dataset.emoji)); item.querySelector('[data-action="react"]').onclick = event => openReactionPicker(event, item, message); item.querySelector('[data-action="reply"]').onclick = () => startReply(message); const editButton = item.querySelector('[data-action="edit"]'); if (editButton) editButton.onclick = () => startEdit(item, message); els.messages.appendChild(item); els.messages.scrollTop = els.messages.scrollHeight; }
function openReactionPicker(event, item, message) { event.stopPropagation(); document.querySelectorAll('.reaction-picker').forEach(picker => picker.remove()); const picker = document.createElement('div'); picker.className = 'reaction-picker'; REACTION_EMOJIS.forEach(emoji => { const button = document.createElement('button'); button.type = 'button'; button.textContent = emoji; button.title = 'React ' + emoji; button.onclick = async pickerEvent => { pickerEvent.stopPropagation(); picker.remove(); await toggleReaction(message, emoji); }; picker.appendChild(button); }); item.style.position = 'relative'; item.appendChild(picker); picker.style.left = '48px'; picker.style.bottom = '32px'; }
function startReply(message) { replyTo = {id:message.id || '', name:message.name, text:message.text}; els.messageInput.placeholder = 'Reply to ' + message.name + '…'; els.messageInput.focus(); }
function messageRef(message) { return db.ref('serverMessages/' + state.server.code + '/' + safe(state.channel) + '/' + message.id); }
async function saveMessage(message, updates) { Object.assign(message, updates); if (state.server.localOnly) { const key = 'vusMessages_' + state.server.code + '_' + safe(state.channel); const messages = JSON.parse(localStorage.getItem(key) || '[]').map(item => item.id === message.id ? {...item,...updates} : item); localStorage.setItem(key, JSON.stringify(messages)); } else if (message.id) await messageRef(message).update(updates); selectMessages(state.channel); }
async function toggleReaction(message, emoji) { if (!message.id) { showError('This message is still loading. Try again.'); return; } const reactions = {...(message.reactions || {})}; const users = {...(reactions[emoji] || {})}; if (users[state.user.key]) delete users[state.user.key]; else users[state.user.key] = true; if (Object.keys(users).length) reactions[emoji] = users; else delete reactions[emoji]; try { await saveMessage(message, {reactions}); } catch (error) { showError('Could not update reaction.'); } }
function startEdit(item, message) { const text = item.querySelector('.message-text'); const original = message.text; const input = document.createElement('textarea'); input.className = 'edit-input'; input.value = original; input.rows = 2; text.replaceWith(input); input.focus(); input.onkeydown = async event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); const value = input.value.trim(); if (value) await saveMessage(message, {text:value, edited:true}); } if (event.key === 'Escape') selectMessages(state.channel); }; }
function mentionMatches() { const match = els.messageInput.value.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/); if (!match) { els.mentionSuggestions.hidden = true; return; } const query = match[1].toLowerCase(); const members = Object.values(state.serverMembers || {}).filter(member => member.name.toLowerCase().startsWith(query)).slice(0,6); els.mentionSuggestions.innerHTML = ''; members.forEach(member => { const option = document.createElement('button'); option.type = 'button'; option.className = 'mention-option'; option.textContent = '@' + member.name; option.onclick = () => { els.messageInput.value = els.messageInput.value.slice(0, els.messageInput.value.length - match[1].length) + member.name + ' '; els.mentionSuggestions.hidden = true; els.messageInput.focus(); }; els.mentionSuggestions.appendChild(option); }); els.mentionSuggestions.hidden = !members.length; }
function resizeImage(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => { const image = new Image(); image.onload = () => { const scale = Math.min(1, 1000 / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', .76)); }; image.onerror = reject; image.src = reader.result; }; reader.readAsDataURL(file); }); }
function renderMembers(data) { const members = Object.values(data || {}).filter(member => member && typeof member === 'object'); state.serverMembers = Object.fromEntries(members.map(member => [member.key || member.name, member])); els.memberCount.textContent = members.length; els.membersList.innerHTML = ''; members.forEach(member => { const row = document.createElement('div'); row.className = 'member'; const rank = rankForMember(member.key, member.name); const rankText = rank ? '<span class="rank-badge" style="--rank-color:' + esc(rank.color || '#9aa5b4') + '">' + esc(rank.name) + '</span>' : '<span class="member-rank">Member</span>'; row.innerHTML = avatarMarkup(member, 'member-avatar') + '<div><div class="member-name">' + esc(member.name || 'Member') + '</div><div class="member-rank">' + rankText + '</div></div>'; els.membersList.appendChild(row); }); }
const RTC_CONFIG = { iceServers:[{urls:'stun:stun.l.google.com:19302'}] };
function showVoicePermissionPrompt(channelId, videoMode) {
  const message = document.createElement('div');
  message.textContent = 'Allow access in the browser prompt. If permission was blocked, change it in your browser site settings and try again.';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'voice-permission-button';
  button.textContent = videoMode ? 'Allow microphone and camera' : 'Allow microphone';
  button.onclick = () => joinVoice(channelId, videoMode);
  els.voiceMembers.replaceChildren(message, button);
}
async function joinVoice(channelId, videoMode = false) {
  if (!state.server || !channelId || !state.user || !state.user.key) return;
  try {
    await leaveVoice();
    state.mediaMode = videoMode ? 'camera' : 'audio';
    state.localStream = state.mediaMode === 'screen'
      ? await navigator.mediaDevices.getDisplayMedia({video:{width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30}},audio:true})
      : await navigator.mediaDevices.getUserMedia({audio:true,video:videoMode ? {width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30}} : false});
  }
  catch (error) {
    if (error && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name)) {
      showVoicePermissionPrompt(channelId, videoMode);
    } else {
      els.voiceMembers.textContent = videoMode
        ? 'Could not access your microphone and camera. Check that the devices are connected and available.'
        : 'Could not access your microphone. Check that it is connected and available.';
    }
    return;
  }
  state.voiceChannel = channelId;
  els.voiceControls.hidden = false;
  els.muteVoice.textContent = 'Mute';
  els.voiceMembers.textContent = '🎙 Microphone on · Connecting to voice...';
    els.voiceMembers.textContent = videoMode ? '▣ Video sharing on · Connecting...' : '🎙 Microphone on · Connecting to voice...';
    els.videoStage.hidden = !videoMode;
    if (els.mediaControlPopup) els.mediaControlPopup.hidden = !videoMode;
    if (videoMode) addLocalVideoTile();
  if (state.server.localOnly) {
    els.voiceMembers.textContent = '🎙 Microphone on · Online voice is unavailable for local servers.';
    els.messageInput.focus();
    return;
  }
  const voicePeerId = safe(state.user.key + '_' + voiceSessionId);
  state.voicePeerId = voicePeerId;
  state.voiceRef = db.ref('serverVoice/' + state.server.code + '/' + safe(channelId) + '/' + voicePeerId);
  try {
    state.voiceRef.onDisconnect().remove();
    await state.voiceRef.set({key:state.user.key,peerId:voicePeerId,name:state.user.username});
  } catch (error) {
    els.voiceMembers.textContent = '🎙 Microphone on · Could not connect to online voice.';
    return;
  }
  const membersRef = db.ref('serverVoice/' + state.server.code + '/' + safe(channelId));
  const onMembers = snap => {
    const members = snap.val() || {};
    const names = Object.values(members).filter(member => member && typeof member === 'object').map(member => member.name).filter(Boolean);
    els.voiceMembers.textContent = names.length ? '🔊 ' + names.join(' · ') : '';
    Object.keys(members).filter(key => key !== state.voicePeerId).forEach(key => {
      if (state.voicePeerId < key) connectVoicePeer(key, true);
    });
  };
  membersRef.on('value', onMembers);
  state.voiceMembersUnsub = () => membersRef.off('value', onMembers);
  const signalsRef = db.ref('voiceSignals/' + state.server.code + '/' + safe(channelId) + '/' + voicePeerId);
  const onSignal = snap => handleVoiceSignal(snap.key, snap.val());
  signalsRef.on('child_added', onSignal);
  state.voiceSignalUnsub = () => signalsRef.off('child_added', onSignal);
  els.messageInput.focus();
}
function connectVoicePeer(remoteKey, initiator) {
  if (!remoteKey || !state.localStream) return null;
  if (state.peers[remoteKey]) return state.peers[remoteKey];
  const peer = new RTCPeerConnection(RTC_CONFIG);
  state.peers[remoteKey] = peer;
  state.localStream.getTracks().forEach(track => peer.addTrack(track, state.localStream));
  peer.ontrack = event => { const stream = event.streams[0]; if (event.track.kind === 'video') addVideoTile(remoteKey, stream, 'Remote video'); else { const audio = document.createElement('audio'); audio.autoplay = true; audio.srcObject = stream; audio.dataset.peer = remoteKey; els.remoteAudio.appendChild(audio); } };
  peer.onicecandidate = event => { if (event.candidate) sendVoiceSignal(remoteKey, {type:'candidate',candidate:event.candidate.toJSON()}); };
  peer.onconnectionstatechange = () => { if (['failed','closed','disconnected'].includes(peer.connectionState)) closeVoicePeer(remoteKey); };
  if (initiator) peer.createOffer().then(offer => peer.setLocalDescription(offer).then(() => sendVoiceSignal(remoteKey, {type:'offer',sdp:offer.sdp}))).catch(() => {});
  return peer;
}
function sendVoiceSignal(remoteKey, payload) { if (!state.server || !state.voiceChannel || !state.voicePeerId) return; db.ref('voiceSignals/' + state.server.code + '/' + safe(state.voiceChannel) + '/' + remoteKey).push({from:state.voicePeerId,accountKey:state.user.key,...payload}); }
async function handleVoiceSignal(signalKey, signal) {
  if (!signal || !signal.from || signal.from === state.user.key || !state.localStream) return;
  const peer = connectVoicePeer(signal.from, false);
  if (!peer) return;
  if (signal.type === 'offer') { await peer.setRemoteDescription({type:'offer',sdp:signal.sdp}); const answer = await peer.createAnswer(); await peer.setLocalDescription(answer); sendVoiceSignal(signal.from, {type:'answer',sdp:answer.sdp}); }
  else if (signal.type === 'answer') await peer.setRemoteDescription({type:'answer',sdp:signal.sdp});
  else if (signal.type === 'candidate') { try { await peer.addIceCandidate(signal.candidate); } catch (error) {} }
  db.ref('voiceSignals/' + state.server.code + '/' + safe(state.voiceChannel) + '/' + state.voicePeerId + '/' + signalKey).remove();
}
function closeVoicePeer(remoteKey) { const peer = state.peers[remoteKey]; if (peer) peer.close(); delete state.peers[remoteKey]; document.querySelectorAll('audio[data-peer="' + remoteKey + '"], [data-video-peer="' + remoteKey + '"]').forEach(element => element.remove()); }
function addVideoTile(key, stream, label) { if (!els.videoStage) return; let tile = document.querySelector('[data-video-peer="' + key + '"]'); if (!tile) { tile = document.createElement('div'); tile.className = 'video-tile'; tile.dataset.videoPeer = key; tile.innerHTML = '<video autoplay playsinline></video><span>' + esc(label) + '</span>'; els.videoStage.appendChild(tile); } tile.querySelector('video').srcObject = stream; }
function addLocalVideoTile() { addVideoTile('local', state.localStream, state.mediaMode === 'screen' ? 'Your screen' : 'Your camera'); }
async function switchVideoSource(mode) {
  if (!state.localStream || !state.voiceChannel) return;
  try {
    const newVideoStream = mode === 'screen'
      ? await navigator.mediaDevices.getDisplayMedia({video:{width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30}},audio:false})
      : await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30}}});
    const newVideoTrack = newVideoStream.getVideoTracks()[0];
    const oldVideoTracks = state.localStream.getVideoTracks();
    state.localStream.removeTrack(oldVideoTracks[0]);
    oldVideoTracks.forEach(track => track.stop());
    state.localStream.addTrack(newVideoTrack);
    Object.values(state.peers).forEach(peer => {
      const sender = peer.getSenders().find(item => item.track && item.track.kind === 'video');
      if (sender) sender.replaceTrack(newVideoTrack);
    });
    state.mediaMode = mode;
    addLocalVideoTile();
    els.popupCameraBtn.textContent = mode === 'screen' ? 'Camera' : 'Turn camera off';
    newVideoTrack.onended = () => { if (state.mediaMode === 'screen') switchVideoSource('camera'); };
  } catch (error) {
    showError(mode === 'screen' ? 'Screen sharing was cancelled.' : 'Camera permission is required.');
  }
}
async function toggleCamera() {
  if (!state.localStream || !state.voiceChannel) return;
  if (state.mediaMode === 'screen') {
    await switchVideoSource('camera');
    return;
  }
  const track = state.localStream.getVideoTracks()[0];
  if (!track) {
    await switchVideoSource('camera');
    return;
  }
  track.enabled = !track.enabled;
  els.popupCameraBtn.textContent = track.enabled ? 'Turn camera off' : 'Turn camera on';
  const localTile = document.querySelector('[data-video-peer="local"]');
  if (localTile) localTile.classList.toggle('video-disabled', !track.enabled);
}
async function leaveVoice() { if (state.voiceMembersUnsub) state.voiceMembersUnsub(); if (state.voiceSignalUnsub) state.voiceSignalUnsub(); Object.keys(state.peers).forEach(closeVoicePeer); if (state.voiceRef) { state.voiceRef.onDisconnect().cancel(); await state.voiceRef.remove(); } if (state.localStream) state.localStream.getTracks().forEach(track => track.stop()); state.voiceMembersUnsub = state.voiceSignalUnsub = state.voiceRef = state.localStream = null; state.voiceChannel = null; state.voicePeerId = null; state.mediaMode = 'audio'; state.peers = {}; if (els.voiceControls) els.voiceControls.hidden = true; if (els.voiceMembers) els.voiceMembers.textContent = ''; if (els.videoStage) { els.videoStage.innerHTML = ''; els.videoStage.hidden = true; } if (els.mediaControlPopup) els.mediaControlPopup.hidden = true; }
async function publishAnnouncement() { if (!state.server || state.server.ownerKey !== state.user.key) return; const text = els.announcementInput.value.trim(); if (!text) return; const announcement = {text:text.slice(0,240),by:state.user.username,ts:Date.now()}; try { if (state.server.localOnly) { state.server.announcement = announcement; saveLocalServers(localServers().map(server => server.code === state.server.code ? state.server : server)); } else { await db.ref('serverMeta/' + state.server.code + '/announcement').set({...announcement,ts:firebase.database.ServerValue.TIMESTAMP}); } els.announcementInput.value = ''; renderServer(); } catch (error) { showError('Could not publish the announcement.'); } }
function openAddChannelModal() { if (!state.server || state.server.ownerKey !== state.user.key) return; els.modalTitle.textContent = 'Add channel'; els.modalBody.innerHTML = '<label class="modal-label" for="newChannelName">Channel name</label><input id="newChannelName" class="modal-input" maxlength="24" value="new-channel" placeholder="chat-room"><label class="modal-label" for="newChannelType">Channel type</label><select id="newChannelType" class="modal-input"><option value="text">Chat · messages and images</option><option value="voice">Voice · live audio</option><option value="games">Games · party games</option><option value="announcement">Announcements · owner only</option></select><label class="modal-label" for="newChannelTopic">Topic</label><input id="newChannelTopic" class="modal-input" maxlength="80" placeholder="What is this channel for?"><div id="modalError" class="error"></div><button id="saveChannel" class="primary-btn">Create channel</button>'; els.modal.hidden = false; const nameInput = document.getElementById('newChannelName'); nameInput.focus(); nameInput.select(); document.getElementById('saveChannel').onclick = async () => { const name = nameInput.value.trim(); const type = document.getElementById('newChannelType').value; const topic = document.getElementById('newChannelTopic').value.trim(); const error = document.getElementById('modalError'); if (!name) { error.textContent = 'Enter a channel name.'; return; } const id = safe(name.toLowerCase().replace(/\s+/g,'-')); const channel = {name:name.slice(0,24),type:type === 'games' ? 'text' : type,topic:(type === 'games' ? '[games] ' : '') + (topic.slice(0,80) || (type === 'voice' ? 'Join the conversation.' : type === 'games' ? 'Party games for the server.' : type === 'announcement' ? 'Owner updates only.' : 'A new place to talk.'))}; try { if (state.server.localOnly) { state.server.channels[id] = channel; saveLocalServers(localServers().map(server => server.code === state.server.code ? state.server : server)); renderServer(); } else { await db.ref('serverMeta/' + state.server.code + '/channels/' + id).set(channel); } els.modal.hidden = true; } catch (saveError) { error.textContent = 'Could not create this channel.'; } }; }
function openRankModal() { if (!state.server || state.server.ownerKey !== state.user.key) return; const members = Object.values(state.serverMembers || {}).filter(member => member.key !== state.user.key); const presetRanks = [
    {name:'Moderator', color:'#5bc0eb', permissions:{manage:true, announce:true}},
    {name:'VIP', color:'#f4c542', permissions:{manage:false, announce:true}},
    {name:'Support', color:'#7ae582', permissions:{manage:false, announce:false}},
    {name:'Staff', color:'#ff9f1c', permissions:{manage:true, announce:true}},
    {name:'Guest', color:'#a8b2c0', permissions:{manage:false, announce:false}}
  ];
  els.modalTitle.textContent = 'Manage custom ranks';
  els.modalBody.innerHTML = '<label class="modal-label" for="rankMember">Member</label><select id="rankMember" class="modal-input">' + (members.length ? members.map(member => '<option value="' + esc(member.key) + '">' + esc(member.name) + '</option>').join('') : '<option value="">No other members online</option>') + '</select>' +
    '<div class="rank-presets" style="display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 8px;">' + presetRanks.map(preset => '<button type="button" class="modal-secondary" data-rank-preset="' + esc(preset.name) + '" style="width:auto; margin:0; padding:7px 10px; border-radius:999px;">' + esc(preset.name) + '</button>').join('') + '</div>' +
    '<label class="modal-label" for="rankName">Rank name</label><input id="rankName" class="modal-input" maxlength="20" placeholder="Moderator, VIP, Member"><label class="modal-label" for="rankColor">Rank color</label><input id="rankColor" class="modal-color" type="color" value="#9aa5b4"><label class="rank-check"><input id="rankManage" type="checkbox"> Can manage channels and members</label><label class="rank-check"><input id="rankAnnounce" type="checkbox"> Can publish announcements</label><button id="clearRank" class="modal-secondary"' + (members.length ? '' : ' disabled') + '>Remove rank</button><div id="modalError" class="error"></div><button id="saveRank" class="primary-btn"' + (members.length ? '' : ' disabled') + '>Save custom rank</button>';
  els.modal.hidden = false; const memberSelect = document.getElementById('rankMember'); const rankNameInput = document.getElementById('rankName'); const rankColorInput = document.getElementById('rankColor'); const rankManageInput = document.getElementById('rankManage'); const rankAnnounceInput = document.getElementById('rankAnnounce'); const fillRank = () => { const existing = state.server.ranks && state.server.ranks[memberSelect.value]; const rank = typeof existing === 'object' ? existing : null; rankNameInput.value = rank ? rank.name : (typeof existing === 'string' ? existing : ''); rankColorInput.value = rank && rank.color || '#9aa5b4'; rankManageInput.checked = !!(rank && rank.permissions && rank.permissions.manage); rankAnnounceInput.checked = !!(rank && rank.permissions && rank.permissions.announce); }; const applyPreset = (preset) => { rankNameInput.value = preset.name; rankColorInput.value = preset.color; rankManageInput.checked = !!preset.permissions.manage; rankAnnounceInput.checked = !!preset.permissions.announce; }; Array.from(document.querySelectorAll('[data-rank-preset]')).forEach(button => { const presetName = button.getAttribute('data-rank-preset'); const preset = presetRanks.find(item => item.name === presetName); if (preset) button.onclick = () => applyPreset(preset); }); memberSelect.onchange = fillRank; fillRank(); document.getElementById('saveRank').onclick = async () => { const memberKey = memberSelect.value; const rankName = rankNameInput.value.trim(); const rank = {name:rankName.slice(0,20),color:rankColorInput.value,permissions:{manage:rankManageInput.checked,announce:rankAnnounceInput.checked}}; if (!memberKey || !rankName) { document.getElementById('modalError').textContent = 'Choose a member and enter a rank name.'; return; } try { state.server.ranks = state.server.ranks || {}; state.server.ranks[memberKey] = rank; if (state.server.localOnly) { saveLocalServers(localServers().map(server => server.code === state.server.code ? state.server : server)); } else { await db.ref('serverMeta/' + state.server.code + '/ranks/' + memberKey).set(rank); } renderMembers(state.serverMembers); els.modal.hidden = true; } catch (error) { document.getElementById('modalError').textContent = 'Could not save this rank.'; } }; document.getElementById('clearRank').onclick = async () => { const memberKey = memberSelect.value; if (!memberKey) { document.getElementById('modalError').textContent = 'Choose a member to remove.'; return; } try { if (!state.server.ranks) state.server.ranks = {}; delete state.server.ranks[memberKey]; if (state.server.localOnly) { saveLocalServers(localServers().map(server => server.code === state.server.code ? state.server : server)); } else { await db.ref('serverMeta/' + state.server.code + '/ranks/' + memberKey).remove(); } renderMembers(state.serverMembers); els.modal.hidden = true; } catch (error) { document.getElementById('modalError').textContent = 'Could not remove this rank.'; } }; }
function openServerSettings() {
  if (!isServerOwner()) return;
  const server = state.server;
  els.modalTitle.textContent = 'Customize server';
  els.modalBody.innerHTML = '<label class="modal-label" for="settingsServerName">Server name</label><input id="settingsServerName" class="modal-input" maxlength="32"><label class="modal-label" for="settingsDescription">Description</label><input id="settingsDescription" class="modal-input" maxlength="80" placeholder="What is this server about?"><label class="modal-label" for="settingsAccent">Accent color</label><input id="settingsAccent" class="modal-color" type="color"><label class="modal-label" for="settingsIcon">Server icon</label><input id="settingsIcon" class="profile-file" type="file" accept="image/*"><div id="modalError" class="error"></div><button id="saveServerSettings" class="primary-btn">Save changes</button><hr><button id="deleteServer" class="modal-danger" type="button">Delete server</button>';
  const nameInput = document.getElementById('settingsServerName');
  const descriptionInput = document.getElementById('settingsDescription');
  const accentInput = document.getElementById('settingsAccent');
  nameInput.value = server.name || '';
  descriptionInput.value = server.description || '';
  accentInput.value = server.accent || '#5865f2';
  let icon = server.icon || '';
  document.getElementById('settingsIcon').onchange = event => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      document.getElementById('modalError').textContent = 'Choose an icon under 2 MB.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { icon = reader.result; };
    reader.readAsDataURL(file);
  };
  document.getElementById('saveServerSettings').onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) { document.getElementById('modalError').textContent = 'Enter a server name.'; return; }
    const updates = {name:name.slice(0,32),description:descriptionInput.value.trim().slice(0,80),accent:accentInput.value,icon};
    try {
      if (server.localOnly) {
        Object.assign(server, updates);
        saveLocalServers(localServers().map(item => item.code === server.code ? server : item));
        const index = state.servers.findIndex(item => item.code === server.code);
        if (index >= 0) Object.assign(state.servers[index], updates);
      } else await db.ref('serverMeta/' + server.code).update(updates);
      Object.assign(server, updates);
      renderServerRail();
      renderServer();
      els.modal.hidden = true;
    } catch (error) {
      document.getElementById('modalError').textContent = 'Could not save server settings.';
    }
  };
  document.getElementById('deleteServer').onclick = () => openDeleteServerConfirmation(server);
  els.modal.hidden = false;
}
function openDeleteServerConfirmation(server) {
  if (!isServerOwner() || state.server.code !== server.code) return;
  els.modalTitle.textContent = 'Delete server';
  els.modalBody.innerHTML = '<p class="modal-copy">This permanently deletes <strong>' + esc(server.name) + '</strong> and its server data. This cannot be undone.</p><label class="modal-label" for="confirmServerName">Type the server name to confirm</label><input id="confirmServerName" class="modal-input" autocomplete="off"><div id="modalError" class="error"></div><div class="modal-actions"><button id="cancelDeleteServer" class="modal-secondary" type="button">Cancel</button><button id="confirmDeleteServer" class="modal-danger" type="button" disabled>Delete server</button></div>';
  const input = document.getElementById('confirmServerName');
  const confirmButton = document.getElementById('confirmDeleteServer');
  input.oninput = () => { confirmButton.disabled = input.value.trim() !== server.name; };
  document.getElementById('cancelDeleteServer').onclick = openServerSettings;
  confirmButton.onclick = async () => {
    if (!isServerOwner() || state.server.code !== server.code || input.value.trim() !== server.name) return;
    confirmButton.disabled = true;
    try {
      await deleteServer(server);
    } catch (error) {
      document.getElementById('modalError').textContent = 'Could not delete this server. Try again.';
      console.error('[Sektor] Could not delete server.', error);
      confirmButton.disabled = false;
    }
  };
  els.modal.hidden = false;
  input.focus();
}
async function deleteServer(server) {
  if (!server || !isServerOwner() || state.server.code !== server.code) throw new Error('Only the server owner can delete this server.');
  const code = server.code;
  if (server.localOnly) {
    saveLocalServers(localServers().filter(item => item.code !== code));
  } else {
    const updates = {};
    ['serverMeta','serverMessages','serverPresence','serverVoice','voiceSignals','serverGames'].forEach(path => {
      updates[path + '/' + code] = null;
    });
    await db.ref().update(updates);
  }
  const joined = JSON.parse(localStorage.getItem('vusServersJoined') || '[]');
  localStorage.setItem('vusServersJoined', JSON.stringify(joined.filter(joinedCode => joinedCode !== code)));
  const messagePrefix = 'vusMessages_' + code + '_';
  Object.keys(localStorage).filter(key => key.startsWith(messagePrefix)).forEach(key => localStorage.removeItem(key));
  await clearSubscriptions();
  state.servers = state.servers.filter(item => item.code !== code);
  state.server = null;
  state.channel = '';
  state.editMode = false;
  els.modal.hidden = true;
  renderServerRail();
  clearServer();
  renderMembers({});
  els.ownerTools.hidden = true;
  els.announcement.hidden = true;
  els.ownerComposer.hidden = true;
  els.channelTopic.textContent = '';
  els.channelPermission.textContent = '';
}
function clearServer() { els.serverName.textContent = 'Select a server'; els.serverCode.textContent = ''; els.textChannels.innerHTML = ''; els.voiceChannels.innerHTML = ''; els.messages.innerHTML = '<div class="empty-state">Create or select a server to begin.</div>'; }

els.loginTab.onclick = () => { signupMode = false; els.loginTab.classList.add('active'); els.signupTab.classList.remove('active'); els.authSubmit.textContent = 'Log in'; };
els.logout.addEventListener('click', openProfileModal);
els.youtubeOpenBtn.onclick = () => { els.youtubePopup.hidden = false; };
if (sektorMusicInput && sektorMusicAudio && sektorMusicName) sektorMusicInput.onchange = () => { const file = sektorMusicInput.files[0]; if (!file) return; if (!file.type.startsWith('audio/')) { showError('Choose an audio file.'); return; } sektorMusicAudio.src = URL.createObjectURL(file); sektorMusicName.textContent = file.name; sektorMusicAudio.play().catch(() => {}); };
els.youtubePopupClose.onclick = closeYoutubePopup;
document.addEventListener('click', event => { if (!els.youtubePopup.hidden && !els.youtubePopup.contains(event.target) && !els.youtubeOpenBtn.contains(event.target)) closeYoutubePopup(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !els.youtubePopup.hidden) closeYoutubePopup(); });
const youtubePopupCard = els.youtubePopup.querySelector('.youtube-popup-card');
const youtubePopupHeader = els.youtubePopup.querySelector('.youtube-popup-header');
let youtubeDrag = null;
youtubePopupHeader.addEventListener('pointerdown', event => {
  if (event.target.closest('button')) return;
  const rect = youtubePopupCard.getBoundingClientRect();
  youtubeDrag = {offsetX:event.clientX - rect.left, offsetY:event.clientY - rect.top};
  youtubePopupCard.setPointerCapture(event.pointerId);
  youtubePopupCard.classList.add('dragging');
  event.preventDefault();
});
youtubePopupCard.addEventListener('pointermove', event => {
  if (!youtubeDrag) return;
  const rect = youtubePopupCard.getBoundingClientRect();
  const left = Math.max(8, Math.min(window.innerWidth - rect.width - 8, event.clientX - youtubeDrag.offsetX));
  const top = Math.max(8, Math.min(window.innerHeight - rect.height - 8, event.clientY - youtubeDrag.offsetY));
  youtubePopup.style.left = left + 'px';
  youtubePopup.style.top = top + 'px';
  youtubePopup.style.transform = 'none';
});
const stopYoutubeDrag = () => { youtubeDrag = null; youtubePopupCard.classList.remove('dragging'); };
youtubePopupCard.addEventListener('pointerup', stopYoutubeDrag);
youtubePopupCard.addEventListener('pointercancel', stopYoutubeDrag);
els.signupTab.onclick = () => { signupMode = true; els.signupTab.classList.add('active'); els.loginTab.classList.remove('active'); els.authSubmit.textContent = 'Create account'; };
els.authSubmit.onclick = auth; els.password.onkeydown = event => { if (event.key === 'Enter') auth(); }; els.newServer.onclick = openCreateServerModal; els.joinServer.onclick = openJoinServerModal; els.messageForm.onsubmit = async event => { event.preventDefault(); const text = els.messageInput.value.trim(); const channel = channels().find(item => item.id === state.channel); if ((!text && !pendingImage) || !state.server || channel.type === 'announcement') return; try { const payload = {id:'local-' + Date.now(),name:state.user.username,avatar:state.user.avatar || '',key:state.user.key,text,image:pendingImage || '',replyTo,ts:firebase.database.ServerValue.TIMESTAMP}; if (state.server.localOnly) { const key = 'vusMessages_' + state.server.code + '_' + safe(state.channel); const messages = JSON.parse(localStorage.getItem(key) || '[]'); payload.ts = Date.now(); messages.push(payload); localStorage.setItem(key, JSON.stringify(messages)); renderMessage(payload); } else { await db.ref('serverMessages/' + state.server.code + '/' + safe(state.channel)).push(payload); } els.messageInput.value = ''; pendingImage = ''; replyTo = null; els.messageInput.placeholder = 'Message #' + (channel.name || 'channel'); els.imageInput.value = ''; els.imageButton.textContent = '＋'; els.mentionSuggestions.hidden = true; } catch (error) { showError('Could not send that message.'); } }; els.messageInput.oninput = mentionMatches; els.imageButton.onclick = () => els.imageInput.click(); els.imageInput.onchange = async event => { const file = event.target.files[0]; if (!file) return; if (!file.type.startsWith('image/')) { showError('Choose an image file.'); return; } try { pendingImage = await resizeImage(file); els.imageButton.textContent = '✓'; } catch (error) { showError('Could not prepare that image.'); } }; els.publish.onclick = publishAnnouncement; els.addChannel.onclick = openAddChannelModal; els.rank.onclick = openRankModal;
els.muteVoice.onclick = () => { if (!state.localStream) return; const track = state.localStream.getAudioTracks()[0]; if (!track) return; track.enabled = !track.enabled; els.muteVoice.textContent = track.enabled ? 'Mute' : 'Unmute'; els.popupMuteBtn.textContent = track.enabled ? 'Mute' : 'Unmute'; };
els.leaveVoice.onclick = leaveVoice;
els.popupMuteBtn.onclick = () => els.muteVoice.click();
els.popupCameraBtn.onclick = toggleCamera;
els.popupScreenBtn.onclick = () => switchVideoSource('screen');
els.popupLeaveBtn.onclick = leaveVoice;
els.serverSettings.onclick = openServerSettings;
els.modalClose.onclick = () => { els.modal.hidden = true; };
els.addFriend.onclick = openFriendModal;
new MutationObserver(() => {
  const channelType = document.getElementById('newChannelType');
  if (channelType && !document.getElementById('newChannelAudio')) {
    const label = document.createElement('label');
    label.className = 'audio-channel-option';
    label.innerHTML = '<input id="newChannelAudio" type="checkbox" checked> Allow MP3, WAV, and OGG attachments';
    channelType.parentElement.insertBefore(label, channelType.nextElementSibling);
  }
  const saveChannel = document.getElementById('saveChannel');
  if (saveChannel && !saveChannel.dataset.audioWrapped) {
    const originalSave = saveChannel.onclick;
    saveChannel.dataset.audioWrapped = 'true';
    saveChannel.onclick = async () => {
      const name = document.getElementById('newChannelName').value.trim();
      const audioEnabled = document.getElementById('newChannelAudio').checked;
      await originalSave();
      const id = safe(name.toLowerCase().replace(/\s+/g, '-'));
      const selectedType = document.getElementById('newChannelType').value;
      if (selectedType === 'games' && state.server && !state.server.channels[id]) {
        state.server.channels = state.server.channels || {};
        state.server.channels[id] = {name:name.slice(0,24),type:'text',topic:'[games] Party games for the server.',audio:audioEnabled};
        if (state.server.localOnly) saveLocalServers(localServers().map(server => server.code === state.server.code ? state.server : server));
        renderServer();
        els.modal.hidden = true;
      }
      if (state.server && state.server.channels && state.server.channels[id]) {
        state.server.channels[id].audio = audioEnabled;
        if (state.server.localOnly) saveLocalServers(localServers().map(server => server.code === state.server.code ? state.server : server));
        else await db.ref('serverMeta/' + state.server.code + '/channels/' + id + '/audio').set(audioEnabled);
      }
    };
  }
  if (channelType && !channelType.querySelector('option[value="video"]')) {
    const option = document.createElement('option');
    option.value = 'video';
    option.textContent = 'Video Calls and Streaming · HD camera or screen';
    channelType.insertBefore(option, channelType.querySelector('option[value="announcement"]'));
  }
}).observe(els.modalBody, {childList:true});
els.friendsBtn.onclick = openFriendsArea;
els.editModeBtn.onclick = () => {
  if (!isServerOwner()) return;
  state.editMode = !state.editMode;
  updateEditModeUi();
  renderServer();
};
els.serverList.addEventListener('click', () => {
  state.editMode = false;
  updateEditModeUi();
  els.friendHome.hidden = true;
});
els.serverList.addEventListener('click', () => { els.friendRequestsPanel.hidden = true; els.friendsDirectory.hidden = true; els.textChannelsLabel.hidden = false; els.textChannels.hidden = false; els.voiceChannelsLabel.hidden = false; els.voiceChannels.hidden = false; els.voiceMembers.hidden = false; els.voiceControls.hidden = false; els.friendsBtn.classList.remove('active'); });
(function enablePrivateDmSubmit() {
  const existingSubmit = els.messageForm.onsubmit;
  els.messageForm.onsubmit = async event => {
    if (!state.dmFriend) return existingSubmit(event);
    event.preventDefault();
    const text = els.messageInput.value.trim();
    if (text) await sendPrivateMessage(text);
  };
})();
els.audioButton.addEventListener('click', () => els.audioInput.click());
els.audioInput.addEventListener('change', () => {
  const file = els.audioInput.files[0];
  if (!file) return;
  if (!/^(audio\/(mpeg|wav|ogg)|audio\/x-wav)$/i.test(file.type) && !/\.(mp3|wav|ogg)$/i.test(file.name)) { showError('Choose an MP3, WAV, or OGG file.'); return; }
  if (file.size > 8 * 1024 * 1024) { showError('Audio files must be 8 MB or smaller.'); return; }
  const reader = new FileReader(); reader.onload = () => { pendingAudio = reader.result; pendingAudioName = file.name; els.audioButton.textContent = '✓'; }; reader.readAsDataURL(file); els.audioInput.value = '';
});
els.messageForm.addEventListener('submit', async event => {
  if (!pendingAudio) return;
  event.preventDefault();
  const text = els.messageInput.value.trim(); const channel = channels().find(item => item.id === state.channel);
  if (!state.server || !channel || channel.type === 'announcement') return;
  if (channel.audio === false) { showError('Audio attachments are disabled in this channel.'); return; }
  try { await db.ref('serverMessages/' + state.server.code + '/' + safe(state.channel)).push({id:'local-' + Date.now(),name:state.user.username,avatar:state.user.avatar || '',key:state.user.key,text,image:'',audioData:pendingAudio,audioName:pendingAudioName,ts:firebase.database.ServerValue.TIMESTAMP}); pendingAudio = ''; pendingAudioName = ''; els.audioButton.textContent = '♪'; els.messageInput.value = ''; } catch (error) { showError('Could not send that audio file.'); }
}, true);
new MutationObserver(() => {
  document.querySelectorAll('#messages .message').forEach(item => { if (item.dataset.audioReady) return; const message = messageCache[item.dataset.messageId]; if (!message || !message.audioData) return; item.dataset.audioReady = 'true'; const audio = document.createElement('audio'); audio.controls = true; audio.preload = 'metadata'; audio.src = message.audioData; audio.title = message.audioName || 'Audio attachment'; audio.className = 'message-audio'; item.querySelector('.message-content').appendChild(audio); });
}).observe(els.messages, {childList:true, subtree:true});
(function guardMalformedMessages() {
  const unsafeRenderMessage = renderMessage;
  renderMessage = message => {
    if (!message || typeof message !== 'object') return;
    return unsafeRenderMessage(message);
  };
})();
els.addChannel.onclick = openAddChannelModal;
(function addProfileButton() { els.logout.title = 'Profile (double-click) or log out'; })();
(function restoreSession() { try { const session = JSON.parse(localStorage.getItem('vusServersSession')); if (session && session.key) { state.user = session; showApp(); } } catch (error) {} })();

// Keep navigation safe when the legacy voice/game handlers are still present.
(function refineSektorNavigation() {
  const originalLeaveVoice = leaveVoice;
  leaveVoice = async function () {
    state.voiceChannel = null;
    return originalLeaveVoice();
  };

  const removeGamesOption = () => {
    const option = document.querySelector('#newChannelType option[value="games"]');
    if (option) option.remove();
  };
  new MutationObserver(removeGamesOption).observe(els.modalBody, {childList:true, subtree:true});

  const originalRenderFriendsArea = renderFriendsArea;
  renderFriendsArea = function () {
    originalRenderFriendsArea();
    renderFriendsHome('all');
  };

  function renderFriendsHome(view) {
    if (!els.friendHome) return;
    const pending = state.friendRequests || [];
    const friends = state.friends || [];
    const content = view === 'pending'
      ? pending.map(request => '<div class="friend-home-row"><span class="friend-nav-avatar">' + esc((request.fromUsername || '?').slice(0,2).toUpperCase()) + '</span><span class="friend-home-row-copy"><strong class="friend-home-row-name">' + esc(request.fromUsername || 'Friend request') + '</strong><small class="friend-home-row-status">Incoming friend request</small></span><button class="friend-home-add" type="button" data-request-key="' + esc(request.key) + '">Accept</button></div>').join('')
      : friends.map(friend => '<button class="friend-home-row" type="button" data-friend-key="' + esc(friend.key) + '">' + friendAvatarMarkup(friend) + '<span class="friend-home-row-copy"><strong class="friend-home-row-name">' + esc(friend.username) + '</strong><small class="friend-home-row-status">Friend</small></span></button>').join('');
    els.friendHome.innerHTML = '<div class="friend-home-header"><div><div class="friend-home-title">Friends</div><div class="friend-home-subtitle">Your friends, requests, and private conversations.</div></div><button class="friend-home-add" type="button" data-friend-action="add">Add Friend</button></div><nav class="friend-tabs" aria-label="Friends views"><button class="friend-tab ' + (view === 'all' ? 'active' : '') + '" type="button" data-friend-view="all">All</button><button class="friend-tab ' + (view === 'pending' ? 'active' : '') + '" type="button" data-friend-view="pending">Pending' + (pending.length ? ' (' + pending.length + ')' : '') + '</button><button class="friend-tab ' + (view === 'add' ? 'active' : '') + '" type="button" data-friend-view="add">Add Friend</button></nav>' + (view === 'add' ? '<div class="friend-home-section-title">Find someone</div><div class="friend-home-empty">Search for a username or six-digit ID to send a friend request.</div>' : '<div class="friend-home-section-title">' + (view === 'pending' ? 'Pending requests' : 'Your friends') + '</div><div class="friend-home-list">' + (content || '<div class="friend-home-empty">' + (view === 'pending' ? 'No pending requests.' : 'You do not have any friends yet.') + '</div>') + '</div>');
    if (view === 'all') {
      const online = Object.values(state.onlineUsers || {}).filter(person => person && person.key).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      const onlineRows = online.map(person => '<div class="friend-home-row">' + friendAvatarMarkup({username:person.name,avatar:person.avatar}) + '<span class="friend-home-row-copy"><strong class="friend-home-row-name">' + esc(person.name || 'Unknown') + '</strong><small class="friend-home-row-status">Online now</small></span></div>').join('');
      const onlineSection = '<div class="friend-home-section-title">Online now (' + online.length + ')</div><div class="friend-home-list">' + (onlineRows || '<div class="friend-home-empty">Nobody is online right now.</div>') + '</div>';
      els.friendHome.querySelector('.friend-tabs').insertAdjacentHTML('afterend', onlineSection);
    }
    els.friendHome.querySelectorAll('[data-friend-view]').forEach(button => { button.onclick = () => renderFriendsHome(button.dataset.friendView); });
    const addButton = els.friendHome.querySelector('[data-friend-action="add"]');
    if (addButton) addButton.onclick = openFriendModal;
    els.friendHome.querySelectorAll('[data-friend-key]').forEach(button => { button.onclick = () => { const friend = friends.find(item => item.key === button.dataset.friendKey); if (friend) openPrivateDm(friend); }; });
    els.friendHome.querySelectorAll('[data-request-key]').forEach(button => { button.onclick = () => { const request = pending.find(item => item.key === button.dataset.requestKey); if (request) acceptFriendRequest(request); }; });
  }

  const originalOpenFriendsArea = openFriendsArea;
  openFriendsArea = function () {
    originalOpenFriendsArea();
    state.navigationVersion = (state.navigationVersion || 0) + 1;
    leaveVoice();
    if (els.friendHome) els.friendHome.hidden = false;
    if (els.messages) els.messages.hidden = true;
    if (els.messageForm) els.messageForm.hidden = true;
    renderFriendsHome('all');
  };
  els.friendsBtn.onclick = openFriendsArea;

  const originalOpenPrivateDm = openPrivateDm;
  openPrivateDm = function (friend) {
    if (els.friendHome) els.friendHome.hidden = true;
    if (els.messages) els.messages.hidden = false;
    if (els.messageForm) els.messageForm.hidden = false;
    return originalOpenPrivateDm(friend);
  };
  els.serverList.addEventListener('click', () => {
    if (els.friendHome) els.friendHome.hidden = true;
  });
})();
