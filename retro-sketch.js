(() => {
  const $ = id => document.getElementById(id);
  const elements = {
    status:$('status'), entry:$('entryPanel'), lobby:$('lobbyPanel'), game:$('gamePanel'),
    playerName:$('playerName'), roomCode:$('roomCodeInput'), create:$('createRoom'), join:$('joinRoom'), joinForm:$('joinForm'),
    roomTitle:$('roomTitle'), roomHint:$('roomHint'), playerCount:$('playerCount'), playerList:$('playerList'),
    start:$('startGame'), hostHint:$('hostHint'), copyInvite:$('copyInvite'), leave:$('leaveRoom'),
    roundCount:$('roundCount'), hintCount:$('hintCount'), customWords:$('customWords'), saveSettings:$('saveSettings'),
    gameLeave:$('gameLeave'), gameRoomCode:$('gameRoomCode'), roundLabel:$('roundLabel'),
    wordPrompt:$('wordPrompt'), timer:$('timer'), nextRound:$('nextRound'), drawHint:$('drawHint'),
    canvas:$('drawingCanvas'), palette:$('palette'), brushSize:$('brushSize'),
    scoreList:$('scoreList'), chatLog:$('chatLog'), guessForm:$('guessForm'), guessInput:$('guessInput'),
    sketchTab:$('sketchTab'), sektorTab:$('sektorTab'), sketchScreen:$('sketchScreen'), sektorScreen:$('sektorScreen')
  };
  const words = [
    'spaceship','pineapple','skateboard','volcano','treasure','telescope','octopus','rainbow','popcorn','lighthouse','dragon','submarine','cactus','snowman','guitar','robot','waterfall','crown','pancake','satellite','dinosaur','hourglass','fireworks','backpack',
    'airplane','alligator','anchor','angel','apple','avocado','balloon','banana','beach','bee','bicycle','birdhouse','birthday','blanket','blender','blueberry','boat','book','bottle','bowtie','bridge','broccoli','butterfly','cabin','camera','campfire','candle','candy','carrot','castle','catapult','cereal','cheese','cherry','chicken','chimney','chocolate','circus','cloud','coconut','compass','cookie','corn','crab','crayon','cucumber','cupcake','desert','diamond','dolphin','doorbell','dream','drum','eagle','ear','earth','elephant','envelope','feather','fence','fern','fishbowl','flag','flamingo','flashlight','flower','football','forest','fountain','fox','frisbee','frog','galaxy','garden','ghost','glacier','glasses','globe','glove','goat','goggles','grapefruit','grapes','grasshopper','gumball','hamster','hamburger','hammer','harp','hat','hedgehog','helicopter','helmet','honey','horse','igloo','island','jacket','jellyfish','jigsaw','jungle','kangaroo','kettle','key','kite','kiwi','koala','ladder','ladybug','lake','lemon','leopard','library','llama','magnet','mailbox','marble','mask','medal','mermaid','microscope','milkshake','mitten','moose','mop','motorcycle','mountain','mushroom','necklace','notebook','nurse','oasis','oilcan','onion','orchestra','ostrich','paintbrush','parachute','parrot','peacock','peanut','pear','penguin','pepper','phoenix','piano','pickle','pigeon','pillow','pirate','pizza','planet','platypus','pliers','plum','pocket','poodle','popsicle','pumpkin','puzzle','quilt','rabbit','raccoon','radio','raindrop','rattlesnake','refrigerator','rhinoceros','river','rocket','rollercoaster','rose','rubberduck','sailboat','sandcastle','saxophone','scarecrow','scissors','scorpion','seashell','seahorse','seesaw','shark','sheep','sheriff','shipwreck','slipper','snail','snake','sneaker','spider','spinach','squirrel','staircase','starfish','statue','strawberry','suitcase','sunflower','sunglasses','swan','swing','sword','teapot','teddy','telephone','tiger','toaster','toothbrush','tornado','tortoise','tractor','train','trampoline','trumpet','tulip','turtle','unicorn','vacuum','vampire','van','violin','volleyball','walrus','wallet','wasp','whale','wheelbarrow','windmill','window','witch','wizard','wrench','yacht','yogurt','zebra'
  ];
  const colors = ['#18231c','#e74444','#f3983e','#f3d54e','#45a86d','#4b9de0','#8559c7','#e65ca8','#ffffff'];
  const maxPlayers = 8;
  const playerId = (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()).replace(/[^a-zA-Z0-9_-]/g,'_');
  const context = {db:null, authReady:null, roomRef:null, room:null, playerName:'', activeRoundId:null, strokes:{}, color:colors[0], drawing:false, activeStroke:null, strokeRef:null, lastStrokeWrite:0, timerInterval:0, boardWidth:0, boardHeight:0, pointerId:null};
  const canvasContext = elements.canvas.getContext('2d');

  function setStatus(message, error = false) {
    elements.status.textContent = message || '';
    elements.status.dataset.error = error ? 'true' : 'false';
  }
  function cleanName(value) { return String(value || '').trim().replace(/\s+/g,' ').slice(0,18); }
  function roomCode() { return Array.from({length:6}, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join(''); }
  function makePlayer(name) { return {name,score:0,joinedAt:Date.now()}; }
  function parseCustomWords(value) {
    return [...new Set(String(value||'').split(/[,\n]/).map(word=>word.trim().toLowerCase()).filter(word=>/^[a-z][a-z '-]{1,23}$/i.test(word)))].slice(0,80);
  }
  function visibleHint(word,count,positions) {
    const revealed=new Set(Array.isArray(positions)?positions:[]);
    let remaining=Math.max(0,Number(count)||0);
    for(let i=0;i<word.length&&remaining;i++) {
      if(!revealed.has(i)&&/[a-z]/i.test(word[i])){revealed.add(i);remaining--;}
    }
    return Array.from(word, (letter,index)=>/[a-z]/i.test(letter)?revealed.has(index)?letter.toLowerCase():'_':letter).join('');
  }
  function setScreen(which) {
    const showSektor = which === 'sektor';
    elements.sketchScreen.hidden = showSektor;
    elements.sektorScreen.hidden = !showSektor;
    elements.sketchTab.classList.toggle('active',!showSektor);
    elements.sektorTab.classList.toggle('active',showSektor);
    elements.sketchTab.setAttribute('aria-selected',String(!showSektor));
    elements.sektorTab.setAttribute('aria-selected',String(showSektor));
    if (!showSektor) requestAnimationFrame(resizeCanvas);
  }
  function renderLines(messages) {
    elements.chatLog.replaceChildren();
    Object.values(messages || {}).slice(-40).forEach(message => {
      const line = document.createElement('div');
      line.className = 'chat-line' + (message.correct ? ' correct' : '') + (message.system ? ' system' : '');
      const name = document.createElement('strong');
      name.textContent = message.name || 'Player';
      line.append(name,document.createTextNode(': ' + String(message.text || '')));
      elements.chatLog.appendChild(line);
    });
    elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
  }
  function renderPlayers(players) {
    const entries = Object.entries(players || {}).sort(([,a],[,b]) => Number(b.score || 0)-Number(a.score || 0));
    elements.playerCount.textContent = String(entries.length);
    elements.playerList.replaceChildren();
    elements.scoreList.replaceChildren();
    entries.forEach(([id,player]) => {
      const row = document.createElement('div');
      row.className = 'player-row';
      const name = document.createElement('span');
      name.textContent = player.name || 'Player';
      const tag = document.createElement('small');
      tag.textContent = id === context.room?.hostId ? 'HOST' : id === context.room?.round?.artistId ? 'DRAWING' : '';
      row.append(name,tag);
      elements.playerList.appendChild(row);
      const score = document.createElement('div');
      score.className = 'score-row';
      const scoreName = document.createElement('span');
      scoreName.textContent = player.name || 'Player';
      const scoreValue = document.createElement('span');
      scoreValue.textContent = String(Number(player.score || 0));
      score.append(scoreName,scoreValue);
      elements.scoreList.appendChild(score);
    });
  }
  function resizeCanvas() {
    const rect = elements.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1,2);
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    if (elements.canvas.width === width && elements.canvas.height === height) return;
    elements.canvas.width = width;
    elements.canvas.height = height;
    canvasContext.setTransform(ratio,0,0,ratio,0,0);
    context.boardWidth = rect.width;
    context.boardHeight = rect.height;
    redraw();
  }
  function drawStroke(stroke) {
    if (!stroke || !Array.isArray(stroke.points) || !stroke.points.length) return;
    const pts = stroke.points;
    canvasContext.strokeStyle = stroke.color || '#18231c';
    canvasContext.lineWidth = Math.max(2,Number(stroke.width || 8));
    canvasContext.lineCap = 'round';
    canvasContext.lineJoin = 'round';
    canvasContext.beginPath();
    canvasContext.moveTo(pts[0].x * context.boardWidth,pts[0].y * context.boardHeight);
    pts.slice(1).forEach(point => canvasContext.lineTo(point.x * context.boardWidth,point.y * context.boardHeight));
    if (pts.length === 1) {
      canvasContext.lineTo(pts[0].x * context.boardWidth + 0.1,pts[0].y * context.boardHeight + 0.1);
    }
    canvasContext.stroke();
  }
  function redraw() {
    if (!context.boardWidth || !context.boardHeight) return;
    canvasContext.clearRect(0,0,context.boardWidth,context.boardHeight);
    Object.values(context.strokes).forEach(drawStroke);
  }
  function listenToStrokes(roundId) {
    if (context.activeRoundId === roundId) return;
    if (context.roomRef && context.activeRoundId) context.roomRef.child('rounds/' + context.activeRoundId + '/strokes').off();
    context.activeRoundId = roundId || null;
    context.strokes = {};
    redraw();
    if (!roundId || !context.roomRef) return;
    context.roomRef.child('rounds/' + roundId + '/strokes').on('value',snapshot => {
      context.strokes = snapshot.val() || {};
      redraw();
    });
  }
  function updateTimer() {
    const round = context.room?.round;
    if (!round || context.room?.phase !== 'playing') {
      elements.timer.textContent = '--:--';
      return;
    }
    const remaining = round.endedAt ? 0 : Math.max(0,Number(round.startedAt || Date.now()) + Number(round.duration || 75)*1000 - Date.now());
    const seconds = Math.ceil(remaining/1000);
    elements.timer.textContent = Math.floor(seconds/60).toString().padStart(2,'0') + ':' + (seconds%60).toString().padStart(2,'0');
    const expired = remaining <= 0;
    elements.guessInput.disabled = isArtist() || expired || !!round.guesses?.[playerId];
    if (expired) {
      elements.wordPrompt.textContent = isArtist() ? (round.endedAt?'Everyone guessed correctly · your word was ':'Time is up · your word was ') + round.word : round.endedAt?'Everyone guessed correctly':'Time is up';
      elements.drawHint.textContent = round.endedAt?'Round ended · waiting for the next round':'Round over · waiting for the next round';
    }
  }
  function isArtist() { return context.room?.round?.artistId === playerId; }
  function renderRoom(snapshot) {
    context.room = snapshot.val();
    if (!context.room) {
      leaveRoomLocal();
      setStatus('This room is no longer available. Create a new room or join another.',true);
      return;
    }
    const players = context.room.players || {};
    const playerIds = Object.keys(players);
    if (context.room.hostId && !players[context.room.hostId] && playerIds.length) {
      context.roomRef.child('hostId').set(playerIds[0]).catch(error => setStatus('Could not update the room host: ' + error.message,true));
      context.room.hostId = playerIds[0];
    }
    elements.entry.hidden = true;
    elements.lobby.hidden = context.room.phase === 'playing' || context.room.phase === 'finished';
    elements.game.hidden = context.room.phase !== 'playing' && context.room.phase !== 'finished';
    elements.roomTitle.textContent = context.room.code || '';
    elements.gameRoomCode.textContent = context.room.code || '';
    elements.roomHint.textContent = playerIds.length >= maxPlayers ? 'Room full · ready to draw!' : 'Share the room code so friends can join.';
    renderPlayers(players);
    renderLines(context.room.messages);
    const isHost = context.room.hostId === playerId;
    if(document.activeElement!==elements.roundCount)elements.roundCount.value=String(context.room.settings?.rounds||1);
    if(document.activeElement!==elements.hintCount)elements.hintCount.value=String(context.room.settings?.hints||1);
    if(document.activeElement!==elements.customWords)elements.customWords.value=(context.room.settings?.customWords||[]).join(', ');
    elements.roundCount.disabled=!isHost||context.room.phase!=='lobby';
    elements.hintCount.disabled=!isHost||context.room.phase!=='lobby';
    elements.customWords.disabled=!isHost||context.room.phase!=='lobby';
    elements.saveSettings.hidden=!isHost||context.room.phase!=='lobby';
    elements.start.hidden = !isHost || context.room.phase === 'playing';
    elements.hostHint.hidden = isHost || context.room.phase === 'playing';
    elements.nextRound.hidden = !isHost || (context.room.phase !== 'playing' && context.room.phase !== 'finished');
    elements.nextRound.textContent=context.room.phase==='finished'?'Play again':context.room.round?.endedAt?'Start next round':'Next drawing turn';
    if (context.room.phase === 'finished') {
      elements.roundLabel.textContent='Game complete · '+Number(context.room.settings?.rounds||1)+' round(s) finished';
      elements.wordPrompt.textContent='Final scores are ready';
      elements.drawHint.textContent='The host can start another game';
      elements.guessInput.disabled=true;
      listenToStrokes(context.room.round?.id);
      resizeCanvas();
    } else if (context.room.phase === 'playing' && context.room.round) {
      const round = context.room.round;
      const roundNumber=Math.floor(Number(round.turn||0)/Math.max(1,(round.turnOrder||[]).length))+1;
      elements.roundLabel.textContent = 'ROUND ' + roundNumber + ' OF ' + Number(round.roundsTotal||1) + ' · ' + (players[round.artistId]?.name || 'Player') + ' is drawing';
      elements.wordPrompt.textContent = isArtist() ? 'Your word: ' + round.word : visibleHint(String(round.word||''),round.hintCount,round.hintPositions);
      const mayDraw = isArtist() && Number(round.startedAt || 0) + Number(round.duration || 75)*1000 > Date.now();
      elements.drawHint.textContent = round.endedAt?'Everyone guessed correctly · round ended':mayDraw ? 'Your turn · draw the word!' : isArtist() ? 'Round over · start the next one' : 'Only the artist can draw';
      elements.guessInput.disabled = isArtist() || !!round.endedAt || Number(round.startedAt || 0) + Number(round.duration || 75)*1000 <= Date.now() || !!(round.guesses && round.guesses[playerId]);
      listenToStrokes(round.id);
      updateTimer();
      resizeCanvas();
    } else {
      elements.roundLabel.textContent = 'Waiting for the next round';
      elements.wordPrompt.textContent = 'Waiting…';
      elements.guessInput.disabled = true;
      listenToStrokes(null);
    }
    if (context.room.phase === 'playing' || context.room.phase === 'finished') {
      elements.lobby.hidden = true;
      elements.game.hidden = false;
    } else {
      elements.lobby.hidden = false;
      elements.game.hidden = true;
    }
  }
  function watchRoom(ref) {
    context.roomRef = ref;
    ref.on('value',renderRoom,error => setStatus('Could not load this room: ' + error.message,true));
    ref.child('players/' + playerId).onDisconnect().remove().catch(error => setStatus('Connection cleanup could not be set: ' + error.message,true));
    if (!context.timerInterval) context.timerInterval = window.setInterval(updateTimer,500);
  }
  function leaveRoomLocal() {
    if (context.roomRef) {
      context.roomRef.off();
      if (context.activeRoundId) context.roomRef.child('rounds/' + context.activeRoundId + '/strokes').off();
    }
    context.roomRef = null;
    context.room = null;
    context.activeRoundId = null;
    context.strokes = {};
    elements.entry.hidden = false;
    elements.lobby.hidden = true;
    elements.game.hidden = true;
    if (context.timerInterval) {
      clearInterval(context.timerInterval);
      context.timerInterval = 0;
    }
    resizeCanvas();
  }
  async function createRoom() {
    const name = cleanName(elements.playerName.value);
    if (!name) return setStatus('Choose a name before creating a room.',true);
    if (!context.db) return setStatus('Multiplayer is unavailable because Firebase did not connect.',true);
    context.playerName = name;
    localStorage.setItem('retroSketchPlayerName',name);
    elements.create.disabled = true;
    try {
      await context.authReady;
      let ref,created = false;
      for (let attempt=0;attempt<5 && !created;attempt++) {
        const code = roomCode();
        ref = context.db.ref('retroSketchRooms/' + code);
        const result = await ref.transaction(current => current === null ? {
          code,hostId:playerId,phase:'lobby',createdAt:Date.now(),
          players:{[playerId]:makePlayer(name)},messages:{},settings:{rounds:1,hints:1,customWords:[]}
        } : undefined);
        created = result.committed;
      }
      if (!created) throw new Error('Could not reserve a room code. Please try again.');
      watchRoom(ref);
      setStatus('Room created. Share the code with your friends.');
    } catch (error) {
      setStatus('Could not create a room: ' + error.message,true);
    } finally { elements.create.disabled = false; }
  }
  async function joinRoom() {
    const name = cleanName(elements.playerName.value);
    const code = elements.roomCode.value.trim().toUpperCase();
    if (!name) return setStatus('Choose a name before joining.',true);
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return setStatus('Enter a valid 6-character room code.',true);
    if (!context.db) return setStatus('Multiplayer is unavailable because Firebase did not connect.',true);
    context.playerName = name;
    localStorage.setItem('retroSketchPlayerName',name);
    elements.join.disabled = true;
    try {
      await context.authReady;
      const ref = context.db.ref('retroSketchRooms/' + code);
      const roomSnapshot=await ref.get();
      if(!roomSnapshot.exists())throw new Error('No room exists with that code. Check the code and try again.');
      const playersRef=ref.child('players');
      const result = await playersRef.transaction(current => {
        const players=current&&typeof current==='object'?current:{};
        if (!players[playerId]&&Object.keys(players).length>=maxPlayers) return;
        players[playerId]=players[playerId]||makePlayer(name);
        return players;
      });
      if (!result.committed) {
        const current=(await playersRef.get()).val()||{};
        if(!(await ref.get()).exists())throw new Error('No room exists with that code. Check the code and try again.');
        if(Object.keys(current).length>=maxPlayers&&!current[playerId])throw new Error('That room is full (maximum 8 players).');
        throw new Error('The room could not be joined. Check your connection and try again.');
      }
      await ref.child('hostId').transaction(current=>current||playerId);
      watchRoom(ref);
      setStatus('Joined room ' + code + '.');
    } catch (error) {
      setStatus('Could not join this room: ' + error.message + (error.code?' ('+error.code+')':''),true);
    } finally { elements.join.disabled = false; }
  }
  async function leaveRoom() {
    const ref = context.roomRef;
    if (ref) {
      try {
        await ref.child('players/' + playerId).remove();
        const [hostSnapshot,playersSnapshot]=await Promise.all([ref.child('hostId').get(),ref.child('players').get()]);
        if(hostSnapshot.val()===playerId) {
          const nextHost=Object.keys(playersSnapshot.val()||{})[0]||null;
          if(nextHost)await ref.child('hostId').transaction(current=>current===playerId?nextHost:current);
          else await ref.child('hostId').remove();
        }
      } catch (error) {
        setStatus('Could not leave this room: ' + error.message,true);
        return;
      }
      ref.child('players/' + playerId).onDisconnect().cancel().catch(error => {
        console.warn('[Sketch Party] Could not cancel the disconnect cleanup after leaving.',error);
      });
    }
    leaveRoomLocal();
  }
  async function startRound() {
    const ref = context.roomRef;
    if (!ref) return;
    try {
      const result = await ref.transaction(room => {
        if (!room || room.hostId !== playerId) return;
        const ids = room.phase==='playing'&&room.round?.turnOrder?.length
          ? room.round.turnOrder
          : Object.keys(room.players || {}).sort();
        if (!ids.length) return;
        const roundsTotal=Math.max(1,Math.min(10,Number(room.settings?.rounds)||1));
        let turn=room.phase==='playing'?Number(room.round?.turn||0)+1:0;
        const totalTurns=roundsTotal*ids.length;
        while(turn<totalTurns&&!room.players?.[ids[turn%ids.length]])turn++;
        if(room.phase==='playing'&&turn>=totalTurns) {
          room.phase='finished';
          return room;
        }
        const turnOrder=ids;
        const artistId=turnOrder[turn%turnOrder.length];
        const customWords=Array.isArray(room.settings?.customWords)?room.settings.customWords:[];
        const wordPool=[...words,...customWords,...customWords];
        const history=Array.isArray(room.wordHistory)?room.wordHistory:[];
        const recent=history.slice(-Math.min(history.length,Math.max(1,Math.floor(wordPool.length/2))));
        const candidates=wordPool.filter(word=>!recent.includes(word));
        const word=(candidates.length?candidates:wordPool)[Math.floor(Math.random()*(candidates.length?candidates:wordPool).length)];
        const hintCount=Math.max(1,Math.min(3,Number(room.settings?.hints)||1));
        const letterPositions=Array.from(word,(letter,index)=>/[a-z]/i.test(letter)?index:-1).filter(index=>index>=0);
        for(let i=letterPositions.length-1;i>0;i--) {
          const j=Math.floor(Math.random()*(i+1));
          [letterPositions[i],letterPositions[j]]=[letterPositions[j],letterPositions[i]];
        }
        const hintPositions=letterPositions.slice(0,Math.min(hintCount,letterPositions.length)).sort((a,b)=>a-b);
        room.phase = 'playing';
        room.wordHistory=[...history,word].slice(-30);
        room.round = {id:Date.now().toString(36) + Math.random().toString(36).slice(2,7),turn,turnOrder,roundsTotal,artistId,word,hintCount,hintPositions,startedAt:Date.now(),duration:75,guesses:{}};
        return room;
      });
      if (!result.committed) setStatus('Only the host can start or advance the game.',true);
    } catch (error) { setStatus('Could not start the round: ' + error.message,true); }
  }
  async function sendGuess(event) {
    event.preventDefault();
    const text = elements.guessInput.value.trim().slice(0,80);
    if (!text || !context.roomRef || !context.room) return;
    elements.guessInput.value = '';
    const round = context.room.round;
    const ref = context.roomRef;
    const answerRef = ref.child('round');
    try {
      const result = await answerRef.transaction(current => {
        if (!current || current.id !== round?.id || current.endedAt || current.artistId === playerId || current.guesses?.[playerId] ||
            Number(current.startedAt || 0) + Number(current.duration || 75)*1000 <= Date.now()) return;
        const matches = text.toLowerCase().replace(/[^a-z0-9]/g,'') === String(current.word || '').toLowerCase().replace(/[^a-z0-9]/g,'');
        current.guesses = current.guesses || {};
        if (matches) {
          current.guesses[playerId] = true;
        }
        return current;
      });
      const correct = !!(result.committed && result.snapshot.val()?.guesses?.[playerId]);
      if (correct) {
        await ref.child('players/' + playerId + '/score').transaction(score => Number(score || 0) + Math.max(10,100 + Math.floor((Number(round.startedAt)+Number(round.duration)*1000-Date.now())/1000)*2));
      }
      const messageRef = ref.child('messages').push();
      await messageRef.set({name:context.playerName,text:correct ? 'guessed the word!' : text,correct,createdAt:Date.now()});
      if(correct)await endRoundIfAllGuessed(ref,round.id);
    } catch (error) { setStatus('Could not send your guess: ' + error.message,true); }
  }
  async function endRoundIfAllGuessed(ref,roundId) {
    await ref.transaction(room=>{
      const round=room?.round;
      if(!room||room.phase!=='playing'||round?.id!==roundId||round.endedAt)return;
      const guessers=Object.keys(room.players||{}).filter(id=>id!==round.artistId);
      if(!guessers.length||!guessers.every(id=>round.guesses?.[id]))return;
      round.endedAt=Date.now();
      return room;
    });
  }
  function pointerPoint(event) {
    const rect = elements.canvas.getBoundingClientRect();
    return {x:Math.min(1,Math.max(0,(event.clientX-rect.left)/rect.width)),y:Math.min(1,Math.max(0,(event.clientY-rect.top)/rect.height))};
  }
  function canDraw() {
    const round = context.room?.round;
    return !!(round && !round.endedAt && isArtist() && Number(round.startedAt || 0)+Number(round.duration || 75)*1000>Date.now());
  }
  function startStroke(event) {
    if (!canDraw()) return;
    event.preventDefault();
    context.drawing = true;
    context.pointerId = event.pointerId;
    elements.canvas.setPointerCapture(event.pointerId);
    context.strokeRef = context.roomRef.child('rounds/' + context.room.round.id + '/strokes').push();
    context.activeStroke = {color:context.color,width:Number(elements.brushSize.value),points:[pointerPoint(event)]};
    context.strokes[context.strokeRef.key] = context.activeStroke;
    redraw();
  }
  function moveStroke(event) {
    if (!context.drawing || event.pointerId !== context.pointerId) return;
    event.preventDefault();
    const point = pointerPoint(event);
    const points = context.activeStroke.points;
    if (points.length < 1200) points.push(point);
    drawStroke(context.activeStroke);
    const now = Date.now();
    if (now-context.lastStrokeWrite > 75) {
      context.lastStrokeWrite = now;
      context.strokeRef.set(context.activeStroke).catch(error => setStatus('Drawing could not sync: ' + error.message,true));
    }
  }
  function endStroke(event) {
    if (!context.drawing || (event && event.pointerId !== context.pointerId)) return;
    context.drawing = false;
    context.pointerId = null;
    if (context.strokeRef && context.activeStroke) {
      context.strokeRef.set(context.activeStroke).catch(error => setStatus('Drawing could not sync: ' + error.message,true));
    }
    context.strokeRef = null;
    context.activeStroke = null;
  }
  function init() {
    const savedName = localStorage.getItem('retroSketchPlayerName') || '';
    elements.playerName.value = savedName;
    if (typeof firebase !== 'undefined' && firebase.apps?.length) {
      context.db = firebase.database();
      context.authReady=(async()=>{
        if(firebase.auth&&!firebase.auth().currentUser)await firebase.auth().signInAnonymously();
      })();
      context.authReady.then(()=>setStatus('Enter a name to create a room or join a friend.')).catch(error=>{
        context.db=null;
        console.error('[Sketch Party] Firebase authentication failed.',error);
        setStatus('Could not connect to multiplayer: '+(error.message||'Enable anonymous sign-in in Firebase Authentication.'),true);
      });
    } else {
      setStatus('Multiplayer did not connect. Refresh the page or check your connection.',true);
    }
    const requestedRoom = new URLSearchParams(location.search).get('room');
    if (requestedRoom) elements.roomCode.value = requestedRoom.slice(0,6).toUpperCase();
    colors.forEach((color,index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'color-button' + (index === 0 ? ' selected' : '');
      button.style.background = color;
      button.setAttribute('aria-label','Use ' + color + ' drawing color');
      button.onclick = () => {
        context.color = color;
        elements.palette.querySelectorAll('.color-button').forEach(item => item.classList.toggle('selected',item === button));
      };
      elements.palette.appendChild(button);
    });
    elements.create.onclick = createRoom;
    elements.joinForm.addEventListener('submit',event=>{event.preventDefault();joinRoom();});
    elements.start.onclick = startRound;
    elements.nextRound.onclick = startRound;
    elements.saveSettings.onclick=async()=>{
      if(!context.roomRef||context.room?.hostId!==playerId||context.room?.phase!=='lobby')return setStatus('Only the host can change settings before the game starts.',true);
      const customWords=parseCustomWords(elements.customWords.value);
      if(elements.customWords.value.trim()&&!customWords.length)return setStatus('Add valid custom words (letters, spaces, apostrophes, or hyphens; 2–24 characters each).',true);
      try {
        await context.roomRef.child('settings').set({
          rounds:Math.max(1,Math.min(10,Number(elements.roundCount.value)||1)),
          hints:Math.max(1,Math.min(3,Number(elements.hintCount.value)||1)),
          customWords
        });
        setStatus('Game settings saved'+(customWords.length?' · '+customWords.length+' custom words':'')+'.');
      } catch(error) {setStatus('Could not save game settings: '+error.message,true);}
    };
    elements.leave.onclick = leaveRoom;
    elements.gameLeave.onclick = leaveRoom;
    elements.copyInvite.onclick = async () => {
      const url = new URL(location.href);
      url.searchParams.set('room',context.room?.code || '');
      try {
        await navigator.clipboard.writeText(url.href);
        setStatus('Invite link copied. You can also share room code ' + (context.room?.code || '') + '.');
      } catch (error) {
        setStatus('Copy failed. Share room code ' + (context.room?.code || '') + ' instead.',true);
      }
    };
    elements.guessForm.addEventListener('submit',sendGuess);
    elements.canvas.addEventListener('pointerdown',startStroke);
    elements.canvas.addEventListener('pointermove',moveStroke);
    elements.canvas.addEventListener('pointerup',endStroke);
    elements.canvas.addEventListener('pointercancel',endStroke);
    window.addEventListener('resize',resizeCanvas);
    elements.sketchTab.onclick = () => setScreen('sketch');
    elements.sektorTab.onclick = () => setScreen('sektor');
    const requestedScreen = new URLSearchParams(location.search).get('app');
    if (requestedScreen === 'sektor') setScreen('sektor');
    resizeCanvas();
  }
  init();
})();
