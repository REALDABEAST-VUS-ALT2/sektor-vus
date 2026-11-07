(() => {
  const $ = id => document.getElementById(id);
  const ui = {
    signedOut:$('signedOut'), noServer:$('noServer'), workspace:$('workspace'), serverSelect:$('serverSelect'),
    avatar:$('avatar'), accountName:$('accountName'), balance:$('pointsBalance'), status:$('status'),
    serverName:$('serverName'), domainName:$('domainName'), domainDescription:$('domainDescription'),
    domainSettings:$('domainSettings'), domainTitleInput:$('domainTitleInput'), domainDescriptionInput:$('domainDescriptionInput'),
    slideCount:$('slideCount'), indexCount:$('indexCount'), domainRole:$('domainRole'), slideList:$('slideList'),
    browseAddSlide:$('browseAddSlide'),
    slideCanvas:$('slideCanvas'), editorSlideList:$('editorSlideList'), slideForm:$('slideForm'), fileMenuButton:$('fileMenuButton')||document.querySelector('[data-editor-menu="File"]'),
    fileMenuPanel:$('fileMenuPanel'), teleportList:$('teleportList'), eggBotStatus:$('eggBotStatus'),
    textBoxLayer:$('textBoxLayer'), textBoxWidth:$('textBoxWidth'), textBoxHeight:$('textBoxHeight'),
    textBoxWidthValue:$('textBoxWidthValue'), textBoxHeightValue:$('textBoxHeightValue'),
    editPresentationButton:$('editPresentationButton'), returnToPresent:$('returnToPresent'), addTextBox:$('addTextBox'),
    editorDomainTitle:$('editorDomainTitle'), editorSaveState:$('editorSaveState'), editorSlideCount:$('editorSlideCount'),
    stageSlideNumber:$('stageSlideNumber'), slideStatus:$('slideStatus'), mediaPreview:$('slideMediaPreview'),
    insertPanel:$('insertPanel'), mediaUrlField:$('mediaUrlField'), mediaFileField:$('mediaFileField'),mediaFile:$('mediaFile'),mediaHelp:$('mediaHelp'),mediaTargetField:$('mediaTargetField'),removeSlideMedia:$('removeSlideMedia'),
    notes:$('slideNotes'), fontSize:$('fontSize'), textAlign:$('textAlign'), boldText:$('boldText'),
    italicText:$('italicText'), editDomainDetails:$('editDomainDetails'), addSlideFromFilmstrip:$('addSlideFromFilmstrip'),
    moveSlideUp:$('moveSlideUp'), moveSlideDown:$('moveSlideDown'), insertMenuButton:$('insertMenuButton'),
    title:$('slideTitle'), body:$('slideBody'), mediaType:$('mediaType'), mediaUrl:$('mediaUrl'),
    mediaTarget:$('mediaTarget'), teleportOptions:$('teleportOptions'), teleportLabel:$('teleportLabel'),
    teleportColor:$('teleportColor'),
    slideBackgroundColor:$('slideBackgroundColor'), voiceChat:$('voiceChat'), inventoryList:$('inventoryList'),
    deleteSlide:$('deleteSlide'), shopItems:$('shopItems'), shopForm:$('shopForm'), openShopForm:$('openShopForm'),
    shopPreset:$('shopPreset'), shopPrice:$('shopPrice'), shopDuration:$('shopDuration'), shopDurationField:$('shopDurationField'), shopName:$('shopName'),
    openPlayerListingForm:$('openPlayerListingForm'),playerListingForm:$('playerListingForm'),playerListingName:$('playerListingName'),playerListingType:$('playerListingType'),
    playerListingFile:$('playerListingFile'),playerListingPrice:$('playerListingPrice'),playerListingStock:$('playerListingStock'),playerListingDescription:$('playerListingDescription'),
    playerListingGrid:$('playerListingGrid'),playerListingPreview:$('playerListingPreview'),playerListingStockCost:$('playerListingStockCost'),
    questGrid:$('questGrid'),secretCodeForm:$('secretCodeForm'),secretCodeInput:$('secretCodeInput'),secretCodeStatus:$('secretCodeStatus'),secretCodeButton:$('secretCodeButton'),questSettings:$('questSettings'), dailyReward:$('dailyReward'),
    eggReward:$('eggReward'), weeklyReward:$('weeklyReward'), leaderboard:$('leaderboardList'),
    ticTacToeBoard:$('ticTacToeBoard'),ticTacToeStatus:$('ticTacToeStatus'),ticTacToeJoin:$('ticTacToeJoin'),ticTacToeReset:$('ticTacToeReset'),
    colorClashStatus:$('colorClashStatus'),colorClashTable:$('colorClashTable'),colorClashHand:$('colorClashHand'),colorClashJoin:$('colorClashJoin'),colorClashDraw:$('colorClashDraw'),colorClashReset:$('colorClashReset'),
    promptPartyStatus:$('promptPartyStatus'),promptPartyPrompt:$('promptPartyPrompt'),promptPartyAnswers:$('promptPartyAnswers'),promptPartyAnswerForm:$('promptPartyAnswerForm'),promptPartyAnswer:$('promptPartyAnswer'),promptPartyJoin:$('promptPartyJoin'),promptPartyStart:$('promptPartyStart'),promptPartyReset:$('promptPartyReset')
  };
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('vusServersSession') || 'null'); }
    catch (error) { console.error('[Sektor Slides] Could not read the Sektor session.',error); return null; }
  })();
  const db = globalThis.firebase?.apps?.length ? firebase.database() : null;
  const joined = (() => {
    try { return JSON.parse(localStorage.getItem('vusServersJoined') || '[]'); }
    catch (error) { console.error('[Sektor Slides] Could not read joined servers.',error); return []; }
  })();
  const localServers = (() => {
    try { return JSON.parse(localStorage.getItem('vusServersLocal') || '[]'); }
    catch (error) { console.error('[Sektor Slides] Could not read local servers.',error); return []; }
  })();
  const state = {servers:[],server:null,domain:null,domainRef:null,domainHandler:null,selectedSlide:'',editingSlide:'',pendingNewSlideId:'',isOwner:false,remote:false,visited:new Set(),foundEggs:new Set(),selectedTab:'browse',editingMode:false,profileCache:new Map(),leaderboardVersion:0,eggBotRunKey:'',presenceRef:null,presenceHandler:null,presenceKey:'',cursorUsers:{},voiceSession:null,shopFormOpen:false,starterGrantRunKey:'',slideRenderVersion:0};
  const defaultMediaLayout={x:28,y:52,width:48,height:40};
  let textBoxesDraft=[];
  let titleBoxDraft={x:8,y:22,width:84,height:16,fontSize:48,textAlign:'left',bold:true,italic:false};
  let bodyBoxDraft={x:8,y:34,width:78,height:47,fontSize:24,textAlign:'left',bold:false,italic:false};
  let mediaLayoutDraft={...defaultMediaLayout};
  let previousMediaType='none';
  let selectedTextBoxId='';
  let autoSaveTimer=0;
  let dailyEggTimer=0;
  let questRefreshTimer=0;
  let savePromise=null;
  let editorRevision=0;
  let cursorWriteAt=0;
  let cursorTimer=0;
  const periods = {hour:3600000,day:86400000,week:604800000,month:2592000000};
  const maxSlideMediaBytes=6*1024*1024;
  let playerListingPreviewUrl='';
  const questDefinitions=[
    {id:'dailyVisit',periodType:'daily',title:'Open a slide',description:'Visit any slide in this presentation.',metric:'slides',goal:1,reward:25,rewardKey:'dailyVisit'},
    {id:'dailyExplore3',periodType:'daily',title:'Slide explorer',description:'Visit 3 different slides today.',metric:'slides',goal:3,reward:40},
    {id:'easterEgg',periodType:'daily',title:'Find the hidden star',description:'Find today’s Easter egg on its hidden slide.',metric:'eggs',goal:1,reward:50,rewardKey:'easterEgg'},
    {id:'dailyPlayGame',periodType:'daily',title:'Game night',description:'Join a multiplayer game today.',metric:'gamesPlayed',goal:1,reward:30},
    {id:'gameWin',periodType:'daily',title:'Take the win',description:'Win a multiplayer game today.',metric:'gamesWon',goal:1,reward:75,rewardKey:'gameWin'},
    {id:'dailyWinColorClash',periodType:'daily',title:'Color Clash champion',description:'Win a Color Clash match today.',metric:'colorClashWins',goal:1,reward:100},
    {id:'weeklyVisit',periodType:'weekly',title:'Weekly explorer',description:'Visit 5 different slides this week.',metric:'slides',goal:5,reward:150,rewardKey:'weeklyVisit'},
    {id:'weeklyExplore10',periodType:'weekly',title:'Presentation trek',description:'Visit 10 different slides this week.',metric:'slides',goal:10,reward:250},
    {id:'weeklyEggDays',periodType:'weekly',title:'Star seeker',description:'Find the hidden star on 3 different days this week.',metric:'eggDays',goal:3,reward:200},
    {id:'weeklyPlayGames',periodType:'weekly',title:'Regular player',description:'Join 3 multiplayer game matches this week.',metric:'gamesPlayed',goal:3,reward:150},
    {id:'weeklyWinGames',periodType:'weekly',title:'Winning streak',description:'Win 3 multiplayer games this week.',metric:'gamesWon',goal:3,reward:250},
    {id:'weeklyGameVariety',periodType:'weekly',title:'Try something new',description:'Play 2 different multiplayer games this week.',metric:'gameVariety',goal:2,reward:175}
  ];
  const presets = {
    'slide-pass':{label:'Slide creation pass',category:'inventory'},
    'voice-chat':{label:'Voice chat connect',category:'inventory'},
    'boost-quests':{label:'2× points on quests',category:'quests'},
    'boost-music':{label:'2× points on quests',category:'quests'},
    'boost-image':{label:'2× points on quests',category:'quests'},
    'boost-video':{label:'2× points on quests',category:'quests'},
    'boost-slides':{label:'2× points on quests',category:'quests'},
    'music-pass':{label:'Music pass',category:'media-music'},
    'image-pass':{label:'Image pass',category:'media-images'},
    'video-pass':{label:'Video pass',category:'media-videos'}
  };
  const safe = value => String(value || '').replace(/[.#$\[\]/]/g,'_');
  const esc = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const todayKey = () => new Date().toISOString().slice(0,10);
  const weekKey = (value=new Date()) => {
    const date=new Date(value);
    date.setUTCHours(0,0,0,0);
    date.setUTCDate(date.getUTCDate()+4-(date.getUTCDay()||7));
    const year=date.getUTCFullYear();
    const yearStart=new Date(Date.UTC(year,0,1));
    const week=Math.ceil((((date-yearStart)/86400000)+1)/7);
    return year+'-W'+String(week).padStart(2,'0');
  };
  function setStatus(message,error=false) {
    ui.status.textContent=message||'';
    ui.status.dataset.error=error?'true':'false';
  }
  clearOwnCursor();
  function pointBalance(data=state.domain) { return Number(data?.points?.[session.key]||0); }
  function setBalance(data=state.domain) { ui.balance.textContent=pointBalance(data).toLocaleString(); }
  function durationLabel(duration) { return ({hour:'1 hour',day:'1 day',week:'1 week',month:'1 month',permanent:'Permanent'})[duration]||'1 day'; }
  function timestampFor(duration) {
    return duration==='permanent'?{permanent:true,expiresAt:0}:{permanent:false,expiresAt:Date.now()+(periods[duration]||periods.day)};
  }
  function activeMultiplier(data) {
    const boosts=data?.boosts?.[session.key]||{};
    return Object.values(boosts).some(item=>item&&(item.permanent||Number(item.expiresAt)>Date.now()))?2:1;
  }
  function activeMediaPass(data,category) {
    const item=data?.mediaPasses?.[session.key]?.[category];
    return !!(item&&(item.permanent||Number(item.expiresAt)>Date.now()));
  }
  function mediaPassCategory(type) {
    return type==='music'?'music':type==='image'?'images':['video','youtube'].includes(type)?'videos':'';
  }
  function normalizeMediaLayout(layout) {
    const rawX=layout?.x==null||layout.x===''?NaN:Number(layout.x);
    const rawY=layout?.y==null||layout.y===''?NaN:Number(layout.y);
    const rawWidth=layout?.width==null||layout.width===''?NaN:Number(layout.width);
    const rawHeight=layout?.height==null||layout.height===''?NaN:Number(layout.height);
    const x=Math.max(0,Math.min(90,Number.isFinite(rawX)?rawX:defaultMediaLayout.x));
    const y=Math.max(0,Math.min(90,Number.isFinite(rawY)?rawY:defaultMediaLayout.y));
    return {
      x,y,
      width:Math.max(10,Math.min(100-x,Number.isFinite(rawWidth)?rawWidth:defaultMediaLayout.width)),
      height:Math.max(8,Math.min(100-y,Number.isFinite(rawHeight)?rawHeight:defaultMediaLayout.height))
    };
  }
  function isMediaPass(preset) {
    return ['music-pass','image-pass','video-pass'].includes(preset);
  }
  function hasShopDuration(preset) {
    return isMediaPass(preset)||canonicalShopPreset(preset)==='boost-quests';
  }
  function canonicalShopPreset(preset) {
    return /^boost-(music|image|video|slides)$/.test(preset)?'boost-quests':preset;
  }
  function mediaPassType(preset) {
    return {'music-pass':'music','image-pass':'images','video-pass':'videos'}[preset]||'';
  }
  function updateShopDurationVisibility() {
    if(ui.shopDurationField)ui.shopDurationField.hidden=!hasShopDuration(ui.shopPreset.value);
  }
  function slideEntries() {
    return Object.entries(state.domain?.slides||{}).map(([id,slide])=>({id,...slide})).sort((a,b)=>Number(a.order||0)-Number(b.order||0));
  }
  function blankDomain(server) {
    const id='welcome';
    return {
      name:(server.name||'Sektor')+' Slides',description:'A shared presentation space for this server.',
      ownerKey:server.ownerKey,createdAt:Date.now(),slides:{[id]:{title:'Welcome to '+(server.name||'Sektor'),body:'This is the first slide in your server domain. The owner can create slides, add media, and build teleport destinations.',speakerNotes:'',order:0,mediaType:'none'}},
      shop:{},playerListings:{},playerInventory:{},inventory:{},boosts:{},points:{},claims:{},activity:{},gameWins:{},games:{},quests:{dailyVisit:25,easterEgg:50,weeklyVisit:150,gameWin:100}
    };
  }
  function serverPath(code) { return 'serverMeta/'+safe(code); }
  function domainRef(server) { return db.ref(serverPath(server.code)+'/slidesDomain'); }
  function renderTabs() {
    document.querySelectorAll('.tab').forEach(button=>button.classList.toggle('active',button.dataset.tab===state.selectedTab));
    const inlinePanel=['browse','games','shop','quests'].includes(state.selectedTab);
    $('browseView').hidden=state.editingMode||!inlinePanel||state.selectedTab!=='browse';
    $('editorView').hidden=!state.editingMode;
    ['games','shop','quests'].forEach(id=>$(id+'View').hidden=state.selectedTab!==id);
    $('teleportView').hidden=state.selectedTab!=='teleport'||state.editingMode;
    renderCursors();
  }
  function appendSystemPages(container,editor) {
    [['games','Games'],['shop','Domain shop'],['quests','Daily quests']].forEach(([id,label])=>{
      const button=document.createElement('button');
      button.type='button';
      button.classList.toggle('active',state.selectedTab===id);
      if(editor) {
        button.classList.add('filmstrip-slide','system-page');
        const number=document.createElement('span');number.className='filmstrip-number';number.textContent='•';
        const preview=document.createElement('span');preview.className='filmstrip-preview';
        const title=document.createElement('strong');title.textContent=label;
        const detail=document.createElement('small');detail.textContent='Built-in · cannot be deleted';
        preview.append(title,detail);
        button.append(number,preview);
      } else {
        button.classList.add('system-page');
        const title=document.createElement('span');title.textContent=label;
        const detail=document.createElement('small');detail.textContent='Built-in';
        button.append(title,detail);
      }
      button.onclick=()=>setTab(id);
      container.appendChild(button);
    });
  }
  function inventoryCount(preset,data=state.domain) {
    return Math.max(0,Number(data?.inventory?.[session.key]?.[preset]||0));
  }
  function canEdit() {
    if(state.pendingNewSlideId&&state.pendingNewSlideId===state.editingSlide) {
      return inventoryCount('slide-pass')>0||slideEntries().some(slide=>slide.id===state.editingSlide&&slide.authorKey===session.key);
    }
    if(state.isOwner)return true;
    return slideEntries().some(slide=>slide.id===state.editingSlide&&slide.authorKey===session.key);
  }
  function canCreateSlide() { return inventoryCount('slide-pass')>0; }
  function renderNavigation() {
    const slides=slideEntries();
    ui.slideCount.textContent=String(slides.length);
    ui.indexCount.textContent=String(slides.length);
    ui.serverName.textContent=(state.server?.name||'SEKTOR SERVER').toUpperCase();
    ui.domainName.textContent=state.domain?.name||'Slides domain';
    ui.domainDescription.textContent=state.domain?.description||'A presentation space belonging to this server.';
    ui.domainRole.textContent=state.isOwner?'Domain owner':'Server member';
    if(!state.isOwner)ui.domainSettings.hidden=true;
    ui.editorDomainTitle.textContent=state.domain?.name||'Presentation';
    if(document.activeElement!==ui.domainTitleInput)ui.domainTitleInput.value=state.domain?.name||'';
    if(document.activeElement!==ui.domainDescriptionInput)ui.domainDescriptionInput.value=state.domain?.description||'';
    ui.editorSlideCount.textContent=String(slides.length);
    ui.stageSlideNumber.textContent='SLIDE '+Math.max(1,slides.findIndex(slide=>slide.id===state.selectedSlide)+1);
    ui.editorSlideList.replaceChildren();
    slides.forEach((slide,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='filmstrip-slide';
      button.classList.toggle('active',slide.id===state.selectedSlide);
      button.dataset.slideId=slide.id;
      const number=document.createElement('span');number.className='filmstrip-number';number.textContent=String(index+1);
      const preview=document.createElement('span');preview.className='filmstrip-preview';
      const previewTitle=document.createElement('strong');previewTitle.textContent=slide.title||'Click to add title';
      const previewBody=document.createElement('small');previewBody.textContent=String(slide.body||'Click to add text').slice(0,72);
      const owner=document.createElement('small');owner.className='slide-owner';owner.textContent='By '+slideOwnerName(slide);
      preview.append(previewTitle,previewBody,owner);
      button.append(number,preview);
      button.onclick=()=>selectEditorSlide(slide.id);
      ui.editorSlideList.appendChild(button);
    });
    ui.slideList.replaceChildren();
    slides.forEach(slide=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.slideId=slide.id;
      button.classList.toggle('active',slide.id===state.selectedSlide);
      const title=document.createElement('span');title.textContent=slide.title||'Untitled slide';
      const owner=document.createElement('small');owner.className='slide-owner';owner.textContent='By '+slideOwnerName(slide);
      button.append(title,owner);
      button.onclick=()=>openSlide(slide.id);
      ui.slideList.appendChild(button);
    });
    appendSystemPages(ui.slideList,false);
    appendSystemPages(ui.editorSlideList,true);
    ui.teleportList?.replaceChildren();
    slides.forEach((slide,index)=>{
      if(!ui.teleportList)return;
      const card=document.createElement('article');
      card.className='teleport-card';
      const number=document.createElement('span');number.className='eyebrow';number.textContent='DESTINATION '+String(index+1).padStart(2,'0');
      const title=document.createElement('strong');title.textContent=slide.title||'Untitled slide';
      const description=document.createElement('p');description.textContent=slide.body||'Jump to this slide in the presentation.';
      const button=document.createElement('button');button.type='button';button.className='secondary-button';button.textContent='Teleport to slide';button.onclick=()=>openSlide(slide.id);
      card.append(number,title,description,button);
      ui.teleportList.appendChild(card);
    });
    if(ui.fileMenuButton)ui.fileMenuButton.hidden=!state.isOwner;
    ui.editPresentationButton.hidden=!state.isOwner&&!canEdit();
    ui.editPresentationButton.textContent=state.isOwner?'Edit slides':'Edit my slide';
    ui.browseAddSlide.hidden=!canCreateSlide();
    ui.browseAddSlide.disabled=slides.length>=30;
    ui.browseAddSlide.title=slides.length>=30?'This domain is full (30 slides maximum).':'';
    ui.shopForm.hidden=!state.isOwner||!state.shopFormOpen;
    ui.openShopForm.hidden=!state.isOwner;
    ui.questSettings.hidden=!state.isOwner;
    ui.dailyReward.value=Number(state.domain?.quests?.dailyVisit??25);
    ui.eggReward.value=Number(state.domain?.quests?.easterEgg??50);
    ui.weeklyReward.value=Number(state.domain?.quests?.weeklyVisit??150);
    if(ui.eggBotStatus)ui.eggBotStatus.textContent=state.domain?.dailyEgg?.date===todayKey()?'The daily egg bot hid one Easter egg on a random slide.':'The daily egg bot hides one Easter egg on a random slide each day.';
    renderSecretReward();
    updateShopDurationVisibility();
    renderMediaTargets();
    renderShop();
    renderGames();
    renderQuests();
    renderPlayerListings();
    renderSlideOwnerLabels(slides);
    setBalance();
  }
  function slideOwnerName(slide) {
    if(!slide.authorKey)return 'Domain owner';
    if(slide.authorKey===session.key)return session.username||'You';
    const profile=state.profileCache.get(slide.authorKey);
    return profile?.username||'Sektor member';
  }
  async function renderSlideOwnerLabels(slides) {
    const version=++state.slideRenderVersion;
    const unknown=[...new Set(slides.map(slide=>slide.authorKey).filter(key=>key&&key!==session.key&&!state.profileCache.has(key)))];
    if(!db||!unknown.length)return;
    try {
      await Promise.all(unknown.map(async key=>{
        const snapshot=await db.ref('users/'+safe(key)).get();
        state.profileCache.set(key,snapshot.val()||{});
      }));
      if(version!==state.slideRenderVersion)return;
      slides.forEach(slide=>{
        document.querySelectorAll('[data-slide-id]').forEach(button=>{
          if(button.dataset.slideId!==slide.id)return;
          const owner=button.querySelector('.slide-owner');
          if(owner)owner.textContent='By '+slideOwnerName(slide);
        });
      });
    } catch(error) {
      setStatus('Could not load slide owner names: '+error.message,true);
    }
  }
  function youtubeEmbed(url) {
    try {
      const parsed=new URL(url);
      let id='';
      if(parsed.hostname==='youtu.be') id=parsed.pathname.slice(1);
      if(parsed.hostname.endsWith('youtube.com')) id=parsed.searchParams.get('v')||parsed.pathname.split('/').filter(Boolean).pop();
      return /^[\w-]{11}$/.test(id)?'https://www.youtube-nocookie.com/embed/'+id:'';
    } catch (error) { return ''; }
  }
  function normalizeTextBoxes(boxes) {
    if(!Array.isArray(boxes))return [];
    return boxes.slice(0,30).filter(box=>box&&typeof box==='object').map(box=>{
      const x=Math.max(0,Math.min(90,Number(box.x)||0));
      const y=Math.max(0,Math.min(90,Number(box.y)||0));
      return {
        id:String(box.id||makeId()),
        text:String(box.text||'').slice(0,4000),
        x,y,
        width:Math.max(10,Math.min(100-x,Number(box.width)||60)),
        height:Math.max(8,Math.min(100-y,Number(box.height)||20)),
        fontSize:Math.max(12,Math.min(72,Number(box.fontSize)||24)),
        textAlign:['left','center','right'].includes(box.textAlign)?box.textAlign:'left',
        bold:!!box.bold,
        italic:!!box.italic,
        visible:box.visible!==false
      };
    });
  }
  function normalizeTextBoxLayout(layout,defaults) {
    const box=layout&&typeof layout==='object'?layout:{};
    const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
    const x=Math.max(0,Math.min(90,number(box.x,defaults.x)));
    const y=Math.max(0,Math.min(90,number(box.y,defaults.y)));
    return {
      x,y,
      width:Math.max(10,Math.min(100-x,number(box.width,defaults.width))),
      height:Math.max(8,Math.min(100-y,number(box.height,defaults.height))),
      fontSize:Math.max(12,Math.min(72,number(box.fontSize,defaults.fontSize))),
      textAlign:['left','center','right'].includes(box.textAlign)?box.textAlign:defaults.textAlign,
      bold:box.bold===undefined?defaults.bold:!!box.bold,
      italic:box.italic===undefined?defaults.italic:!!box.italic,
      visible:box.visible!==false
    };
  }
  function findTextBox(id) {
    if(id==='__title')return titleBoxDraft;
    if(id==='__body')return bodyBoxDraft;
    return textBoxesDraft.find(box=>box.id===id);
  }
  function applyTextBoxStyle(wrapper,box) {
    wrapper.style.left=box.x+'%';wrapper.style.top=box.y+'%';
    wrapper.style.width=box.width+'%';wrapper.style.height=box.height+'%';
    wrapper.style.fontSize=box.fontSize+'px';wrapper.style.textAlign=box.textAlign;
    wrapper.style.fontWeight=box.bold?'700':'400';wrapper.style.fontStyle=box.italic?'italic':'normal';
  }
  function attachTextBoxControls(wrapper,box,id,onDelete) {
    wrapper.className='text-box';
    wrapper.dataset.textBoxId=id;
    applyTextBoxStyle(wrapper,box);
    const controls=document.createElement('div');
    controls.className='text-box-controls';
    const move=document.createElement('button');
    move.type='button';move.className='text-box-move';move.textContent='Move';move.setAttribute('aria-label','Move text box');
    const remove=document.createElement('button');
    remove.type='button';remove.className='text-box-delete';remove.textContent='×';remove.setAttribute('aria-label','Delete text box');
    remove.hidden=!canEdit();
    move.hidden=!canEdit();
    controls.append(move,remove);
    wrapper.appendChild(controls);
    wrapper.addEventListener('pointerdown',()=>selectTextBox(id));
    remove.addEventListener('click',onDelete);
    move.addEventListener('pointerdown',event=>{
      if(!canEdit())return;
      event.preventDefault();
      selectTextBox(id);
      const bounds=ui.textBoxLayer.getBoundingClientRect();
      const startX=event.clientX,startY=event.clientY,startLeft=box.x,startTop=box.y;
      move.setPointerCapture(event.pointerId);
      const onMove=moveEvent=>{
        box.x=Math.max(0,Math.min(100-box.width,startLeft+(moveEvent.clientX-startX)/bounds.width*100));
        box.y=Math.max(0,Math.min(100-box.height,startTop+(moveEvent.clientY-startY)/bounds.height*100));
        wrapper.style.left=box.x+'%';wrapper.style.top=box.y+'%';
      };
      const onUp=()=>{
        move.removeEventListener('pointermove',onMove);
        move.removeEventListener('pointerup',onUp);
        move.removeEventListener('pointercancel',onUp);
        markEditorChanged();
      };
      move.addEventListener('pointermove',onMove);
      move.addEventListener('pointerup',onUp);
      move.addEventListener('pointercancel',onUp);
    });
  }
  function renderTextBoxes(boxes) {
    textBoxesDraft=normalizeTextBoxes(boxes);
    selectedTextBoxId='';
    ui.textBoxLayer.replaceChildren();
    [
      {id:'__title',box:titleBoxDraft,input:ui.title,placeholder:'Click to add title'},
      {id:'__body',box:bodyBoxDraft,input:ui.body,placeholder:'Click to add text'}
    ].filter(({box})=>box.visible).forEach(({id,box,input,placeholder})=>{
      const wrapper=document.createElement('div');
      wrapper.className='text-box text-box-placeholder';
      const textarea=input;
      textarea.className=id==='__title'?'canvas-title text-box-input':'canvas-body text-box-input';
      textarea.placeholder=placeholder;
      textarea.style.fontSize=box.fontSize+'px';
      textarea.style.textAlign=box.textAlign;
      textarea.style.fontWeight=box.bold?'700':'400';
      textarea.style.fontStyle=box.italic?'italic':'normal';
      attachTextBoxControls(wrapper,box,id,()=>{
        box.visible=false;
        textarea.value='';
        wrapper.remove();
        if(selectedTextBoxId===id)selectFirstVisibleTextBox();
        markEditorChanged();
      });
      wrapper.appendChild(textarea);
      ui.textBoxLayer.appendChild(wrapper);
    });
    textBoxesDraft.forEach(box=>{
      const wrapper=document.createElement('div');
      attachTextBoxControls(wrapper,box,box.id,()=>{
        textBoxesDraft=textBoxesDraft.filter(item=>item.id!==box.id);
        if(selectedTextBoxId===box.id)selectFirstVisibleTextBox();
        wrapper.remove();
        markEditorChanged();
      });
      const textarea=document.createElement('textarea');
      textarea.className='text-box-input';
      textarea.maxLength=4000;
      textarea.value=box.text;
      textarea.setAttribute('aria-label','Slide text box');
      textarea.readOnly=!canEdit();
      textarea.addEventListener('input',()=>{
        box.text=textarea.value;
        markEditorChanged();
      });
      wrapper.appendChild(textarea);
      ui.textBoxLayer.appendChild(wrapper);
    });
  }
  function selectTextBox(id) {
    selectedTextBoxId=id;
    const box=findTextBox(id);
    if(!box||box.visible===false)return;
    ui.fontSize.value=Array.from(ui.fontSize.options).reduce((closest,option)=>
      Math.abs(Number(option.value)-box.fontSize)<Math.abs(Number(closest.value)-box.fontSize)?option:closest
    ,ui.fontSize.options[0]).value;
    ui.textBoxWidth.value=String(Math.round(box.width));
    ui.textBoxHeight.value=String(Math.round(box.height));
    ui.textBoxWidthValue.value=ui.textBoxWidth.value+'%';
    ui.textBoxHeightValue.value=ui.textBoxHeight.value+'%';
    ui.textAlign.value=box.textAlign;
    ui.boldText.classList.toggle('selected',box.bold);
    ui.italicText.classList.toggle('selected',box.italic);
    ui.textBoxLayer.querySelectorAll('.text-box').forEach(element=>element.classList.toggle('selected',element.dataset.textBoxId===id));
    updateSizeControlVisibility();
  }
  function updateSizeControlVisibility() {
    const showSize=!!textBoxesDraft.find(box=>box.id===selectedTextBoxId);
    ui.textBoxWidth.closest('.box-size-control')?.classList.toggle('is-visible',showSize);
    ui.textBoxHeight.closest('.box-size-control')?.classList.toggle('is-visible',showSize);
  }
  function selectFirstVisibleTextBox() {
    const entry=[['__body',bodyBoxDraft],['__title',titleBoxDraft],...textBoxesDraft.map(box=>[box.id,box])].find(([,box])=>box.visible!==false);
    if(entry)selectTextBox(entry[0]);
    else {
      selectedTextBoxId='';
      ui.textBoxLayer.querySelectorAll('.text-box').forEach(element=>element.classList.remove('selected'));
      updateSizeControlVisibility();
    }
  }
  function updateSelectedTextBox(property,value) {
    const box=findTextBox(selectedTextBoxId);
    if(!box)return false;
    box[property]=value;
    const wrapper=Array.from(ui.textBoxLayer.children).find(element=>element.dataset.textBoxId===selectedTextBoxId);
    if(wrapper) {
      if(property==='width')box.x=Math.min(box.x,100-value);
      if(property==='height')box.y=Math.min(box.y,100-value);
      applyTextBoxStyle(wrapper,box);
      if(property==='fontSize'||property==='textAlign'||property==='bold'||property==='italic') {
        const input=wrapper.querySelector('.text-box-input');
        input.style.fontSize=box.fontSize+'px';
        input.style.textAlign=box.textAlign;
        input.style.fontWeight=box.bold?'700':'400';
        input.style.fontStyle=box.italic?'italic':'normal';
      }
    }
    return true;
  }
  function styleRenderedTextBox(element,box) {
    element.style.position='absolute';element.style.left=box.x+'%';element.style.top=box.y+'%';
    element.style.width=box.width+'%';element.style.height=box.height+'%';
    element.style.maxWidth='none';element.style.margin='0';
    element.style.fontSize=box.fontSize+'px';element.style.textAlign=box.textAlign;
    element.style.fontWeight=box.bold?'700':'400';element.style.fontStyle=box.italic?'italic':'normal';
    element.style.overflowWrap='anywhere';element.style.overflow='auto';
  }
  function renderCursors() {
    const canvas=state.editingMode?document.querySelector('.editing-canvas'):ui.slideCanvas;
    if(!canvas)return;
    canvas.querySelector('.collaboration-cursors')?.remove();
    const overlay=document.createElement('div');overlay.className='collaboration-cursors';overlay.setAttribute('aria-hidden','true');
    Object.values(state.cursorUsers||{}).filter(cursor=>cursor&&cursor.peer!==state.presenceKey&&cursor.slideId===state.selectedSlide).forEach(cursor=>{
      const marker=document.createElement('div');marker.className='collaboration-cursor';
      marker.style.left=Math.max(0,Math.min(1,Number(cursor.x)||0))*100+'%';
      marker.style.top=Math.max(0,Math.min(1,Number(cursor.y)||0))*100+'%';
      const arrow=document.createElement('span');arrow.className='collaboration-cursor-arrow';arrow.textContent='➤';
      const label=document.createElement('span');label.className='collaboration-cursor-label';label.textContent=String(cursor.name||'Member').slice(0,32);
      marker.append(arrow,label);overlay.appendChild(marker);
    });
    canvas.appendChild(overlay);
  }
  function stopCursorPresence() {
    clearTimeout(cursorTimer);
    if(state.presenceRef&&state.presenceHandler)state.presenceRef.off('value',state.presenceHandler);
    if(state.presenceKey&&state.presenceRef)state.presenceRef.child(state.presenceKey).remove().catch(error=>console.error('[Sektor Slides] Could not clear cursor presence.',error));
    state.presenceRef=null;state.presenceHandler=null;state.presenceKey='';state.cursorUsers={};
  }
  function clearOwnCursor() {
    if(state.presenceRef&&state.presenceKey)state.presenceRef.child(state.presenceKey).remove()
      .catch(error=>setStatus('Could not clear the live cursor: '+error.message,true));
  }
  function startCursorPresence(server) {
    stopCursorPresence();
    if(!db||server.localOnly)return;
    state.presenceRef=db.ref(serverPath(server.code)+'/slidesPresence');
    state.presenceKey=safe(session.key)+'_'+makeId();
    state.presenceHandler=snapshot=>{
      state.cursorUsers=snapshot.val()||{};
      renderCursors();
    };
    state.presenceRef.on('value',state.presenceHandler,error=>setStatus('Could not load live cursors: '+error.message,true));
    state.presenceRef.child(state.presenceKey).onDisconnect().remove().catch(error=>setStatus('Could not register cursor cleanup: '+error.message,true));
  }
  function publishCursor(event) {
    if(!state.presenceRef||!state.presenceKey)return;
    const canvas=event.target instanceof Element?event.target.closest('.slide-canvas'):null;
    clearTimeout(cursorTimer);
    if(!canvas||!state.selectedSlide) {
      cursorTimer=setTimeout(()=>state.presenceRef?.child(state.presenceKey).remove(),150);
      return;
    }
    const now=Date.now();
    if(now-cursorWriteAt<70)return;
    cursorWriteAt=now;
    const bounds=canvas.getBoundingClientRect();
    const cursor={
      peer:state.presenceKey,key:session.key,name:session.username||'Member',
      slideId:state.selectedSlide,
      x:Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)),
      y:Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height))
    };
    state.presenceRef.child(state.presenceKey).set(cursor).catch(error=>setStatus('Could not share your cursor: '+error.message,true));
  }
  async function leaveSlideVoice() {
    const voice=state.voiceSession;
    if(!voice)return;
    state.voiceSession=null;
    if(voice.button) {
      voice.button.disabled=false;
      voice.button.textContent='Connect to voice chat';
      voice.button.title='';
    }
    voice.membersRef.off('value',voice.onMembers);
    voice.signalsRef.off('child_added',voice.onSignal);
    Object.values(voice.peers).forEach(peer=>peer.close());
    voice.stream.getTracks().forEach(track=>track.stop());
    document.querySelectorAll('[data-slide-voice-peer]').forEach(audio=>audio.remove());
    voice.muteButton?.remove();
    try {
      await voice.memberRef.onDisconnect().cancel();
      await voice.memberRef.remove();
      await voice.inboxRef.onDisconnect().cancel();
    }
    catch(error) { console.error('[Sektor Slides] Could not leave slide voice cleanly.',error); }
    voice.inboxRef.remove().catch(error=>console.error('[Sektor Slides] Could not clear voice signals.',error));
  }
  function sendSlideVoiceSignal(voice,remoteId,signal) {
    voice.signalsRoot.child(remoteId).push({from:voice.peerId,accountKey:session.key,...signal})
      .catch(error=>setStatus('Could not send voice signal: '+error.message,true));
  }
  function connectSlideVoicePeer(voice,remoteId,initiator) {
    if(!remoteId||remoteId===voice.peerId||voice.peers[remoteId])return voice.peers[remoteId];
    const peer=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    voice.peers[remoteId]=peer;
    voice.stream.getTracks().forEach(track=>peer.addTrack(track,voice.stream));
    peer.ontrack=event=>{
      let audio=Array.from(document.querySelectorAll('[data-slide-voice-peer]')).find(item=>item.dataset.slideVoicePeer===remoteId);
      if(!audio) {
        audio=document.createElement('audio');audio.className='slide-voice-audio';audio.autoplay=true;audio.playsInline=true;
        audio.dataset.slideVoicePeer=remoteId;document.body.appendChild(audio);
      }
      audio.srcObject=event.streams[0];
      audio.play().catch(error=>setStatus('Voice is connected, but playback needs a click: '+error.message,true));
    };
    peer.onicecandidate=event=>{
      if(event.candidate)sendSlideVoiceSignal(voice,remoteId,{type:'candidate',candidate:event.candidate.toJSON()});
    };
    peer.onconnectionstatechange=()=>{
      if(['failed','closed','disconnected'].includes(peer.connectionState)) {
        peer.close();delete voice.peers[remoteId];
        Array.from(document.querySelectorAll('[data-slide-voice-peer]')).find(item=>item.dataset.slideVoicePeer===remoteId)?.remove();
      }
    };
    if(initiator)peer.createOffer().then(offer=>peer.setLocalDescription(offer).then(()=>sendSlideVoiceSignal(voice,remoteId,{type:'offer',sdp:offer.sdp})))
      .catch(error=>setStatus('Could not start a voice connection: '+error.message,true));
    return peer;
  }
  async function handleSlideVoiceSignal(voice,snapshot) {
    const signal=snapshot.val();
    if(!signal||!signal.from||signal.from===voice.peerId)return;
    try {
      const peer=connectSlideVoicePeer(voice,signal.from,false);
      if(signal.type==='offer') {
        await peer.setRemoteDescription({type:'offer',sdp:signal.sdp});
        for(const candidate of voice.pendingCandidates[signal.from]||[])await peer.addIceCandidate(candidate);
        delete voice.pendingCandidates[signal.from];
        const answer=await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSlideVoiceSignal(voice,signal.from,{type:'answer',sdp:answer.sdp});
      } else if(signal.type==='answer') {
        await peer.setRemoteDescription({type:'answer',sdp:signal.sdp});
        for(const candidate of voice.pendingCandidates[signal.from]||[])await peer.addIceCandidate(candidate);
        delete voice.pendingCandidates[signal.from];
      } else if(signal.type==='candidate') {
        const candidate=new RTCIceCandidate(signal.candidate);
        if(peer.remoteDescription)await peer.addIceCandidate(candidate);
        else (voice.pendingCandidates[signal.from]=voice.pendingCandidates[signal.from]||[]).push(candidate);
      }
    } catch(error) { setStatus('Could not connect to a voice participant: '+error.message,true); }
  }
  async function joinSlideVoice(slideId,button) {
    if(state.voiceSession?.slideId===slideId) {
      await leaveSlideVoice();
      button.textContent='Connect to voice chat';
      button.title='';
      return;
    }
    if(state.voiceSession)await leaveSlideVoice();
    if(!db||!state.remote)return setStatus('Voice chat needs an online Firebase server.',true);
    if(!navigator.mediaDevices?.getUserMedia||!globalThis.RTCPeerConnection)return setStatus('This browser does not support voice chat.',true);
    const targetServer=state.server;
    button.disabled=true;button.textContent='Requesting microphone…';
    let stream;
    try { stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false}); }
    catch(error) {
      button.disabled=false;button.textContent='Connect to voice chat';
      setStatus(error.name==='NotAllowedError'?'Allow microphone access in browser settings to join voice chat.':'Could not access your microphone: '+error.message,true);
      return;
    }
    if(state.server!==targetServer||state.selectedSlide!==slideId||state.selectedTab!=='browse'||state.editingMode) {
      stream.getTracks().forEach(track=>track.stop());
      button.disabled=false;button.textContent='Connect to voice chat';
      setStatus('You left the slide before voice chat finished connecting.');
      return;
    }
    const peerId=safe(session.key)+'_'+makeId();
    const channel=safe('slides_'+slideId);
    const membersRef=db.ref('serverVoice/'+safe(state.server.code)+'/'+channel);
    const memberRef=membersRef.child(peerId);
    const signalsRoot=db.ref('voiceSignals/'+safe(state.server.code)+'/'+channel);
    const inboxRef=signalsRoot.child(peerId);
    const voice={
      slideId,peerId,stream,peers:{},pendingCandidates:{},membersRef,memberRef,
      signalsRoot,inboxRef,signalsRef:inboxRef,onMembers:null,onSignal:null,button
    };
    state.voiceSession=voice;
    try {
      await inboxRef.remove();
      await inboxRef.onDisconnect().remove();
      await memberRef.onDisconnect().remove();
      await memberRef.set({key:session.key,peerId,name:session.username||'Member',avatar:session.avatar||''});
      voice.onMembers=snapshot=>{
        const members=snapshot.val()||{};
        Object.keys(members).filter(id=>id!==peerId).forEach(id=>{
          if(peerId<id)connectSlideVoicePeer(voice,id,true);
        });
        Object.keys(voice.peers).filter(id=>!members[id]).forEach(id=>{
          voice.peers[id].close();delete voice.peers[id];
          Array.from(document.querySelectorAll('[data-slide-voice-peer]')).find(item=>item.dataset.slideVoicePeer===id)?.remove();
        });
      };
      voice.onSignal=snapshot=>handleSlideVoiceSignal(voice,snapshot);
      membersRef.on('value',voice.onMembers,error=>setStatus('Could not load voice participants: '+error.message,true));
      inboxRef.on('child_added',voice.onSignal,error=>setStatus('Could not load voice signals: '+error.message,true));
      voice.muteButton=document.createElement('button');
      voice.muteButton.type='button';voice.muteButton.className='secondary-button slide-voice-mute';voice.muteButton.textContent='Mute microphone';
      voice.muteButton.onclick=()=>{
        const track=stream.getAudioTracks()[0];if(!track)return;
        track.enabled=!track.enabled;voice.muteButton.textContent=track.enabled?'Mute microphone':'Unmute microphone';
      };
      button.after(voice.muteButton);
      button.disabled=false;button.textContent='Leave voice chat';
      button.title='Click to leave the voice chat.';
      setStatus('Connected to this slide’s voice chat. Keep this page open while you talk.');
    } catch(error) {
      await leaveSlideVoice();
      button.disabled=false;button.textContent='Connect to voice chat';
      setStatus('Could not join this slide’s voice chat: '+error.message,true);
    }
  }
  function renderSlide(slide) {
    const canvas=ui.slideCanvas;
    if(state.voiceSession&&(!slide?.voiceChat||state.voiceSession.slideId!==slide.id))leaveSlideVoice();
    canvas.replaceChildren();
    if(!slide) {
      const text=document.createElement('p');text.textContent=canEdit()?'Create a slide to start building this domain.':'This domain has no slides yet.';
      canvas.appendChild(text);return;
    }
    state.visited.add(slide.id);
    recordVisit(slide.id);
    const meta=document.createElement('div');meta.className='slide-meta';meta.textContent=state.domain?.name||'SEKTOR SLIDES';
    const titleBox=normalizeTextBoxLayout(slide.titleBox,{x:8,y:22,width:84,height:16,fontSize:48,textAlign:'left',bold:true,italic:false});
    const bodyBox=normalizeTextBoxLayout(slide.bodyBox,{x:8,y:34,width:78,height:47,fontSize:slide.fontSize||24,textAlign:slide.textAlign||'left',bold:!!slide.bold,italic:!!slide.italic});
    const backgroundColor=/^#[0-9a-f]{6}$/i.test(slide.backgroundColor||'')?slide.backgroundColor:'#19221c';
    const background=`radial-gradient(circle at 88% 14%, ${backgroundColor}88, transparent 30%), linear-gradient(145deg, ${backgroundColor}, #111612)`;
    canvas.style.background=background;
    const textBoxes=normalizeTextBoxes(slide.textBoxes).filter(box=>box.visible);
    const hasText=!!(String(slide.title||'').trim()||String(slide.body||'').trim()||textBoxes.some(box=>String(box.text||'').trim()));
    const hasMedia=!!(slide.mediaUrl||slide.mediaType==='teleport'||slide.voiceChat);
    const isEmpty=!hasText&&!hasMedia;
    if(titleBox.visible||String(slide.title||'').trim()||isEmpty) {
      const title=document.createElement('h2');title.textContent=String(slide.title||'').trim()||'Untitled slide';
      title.style.color='var(--text)';
      title.style.zIndex='1';
      styleRenderedTextBox(title,titleBox);
      canvas.append(meta,title);
    } else canvas.appendChild(meta);
    if(bodyBox.visible||String(slide.body||'').trim()||isEmpty) {
      const body=document.createElement('p');body.textContent=String(slide.body||'').trim()||(isEmpty?'This slide has no text yet.':'');
      body.style.color='#c1cdc2';
      body.style.zIndex='1';
      styleRenderedTextBox(body,bodyBox);
      canvas.appendChild(body);
    }
    textBoxes.forEach(box=>{
      const textBox=document.createElement('div');
      textBox.className='slide-text-box';
      textBox.textContent=box.text;
      textBox.style.left=box.x+'%';textBox.style.top=box.y+'%';textBox.style.width=box.width+'%';textBox.style.height=box.height+'%';
      textBox.style.fontSize=box.fontSize+'px';textBox.style.textAlign=box.textAlign;
      textBox.style.fontWeight=box.bold?'700':'400';textBox.style.fontStyle=box.italic?'italic':'normal';
      textBox.style.overflow='auto';
      canvas.appendChild(textBox);
    });
    const url=String(slide.mediaUrl||'').trim();
    if(['image','music','video'].includes(slide.mediaType)&&url) {
      const media=document.createElement('div');media.className='slide-media-frame';
      renderMediaElement(media,slide.mediaType,url,slide.title||'Slide media');
      applyMediaLayout(media,slide.mediaLayout);
      canvas.appendChild(media);
    } else if(slide.mediaType==='youtube') {
      const src=youtubeEmbed(url);
      if(src) {
        const media=document.createElement('div');media.className='slide-media-frame';
        renderMediaElement(media,'youtube',src,slide.title||'YouTube video');
        applyMediaLayout(media,slide.mediaLayout);
        canvas.appendChild(media);
      }
    } else if(slide.mediaType==='teleport') {
      const button=document.createElement('button');button.type='button';button.className='teleport-button';button.textContent=slide.teleportLabel||'Teleport';button.style.setProperty('--teleport',/^#[0-9a-f]{6}$/i.test(slide.teleportColor||'')?slide.teleportColor:'#85e3ac');
      button.title='Teleport to '+(slideEntries().find(item=>item.id===slide.mediaTarget)?.title||'destination');
      button.onclick=()=>openSlide(slide.mediaTarget||'');
      canvas.appendChild(button);
    }
    if(slide.voiceChat) {
      const voiceButton=document.createElement('button');
      voiceButton.type='button';voiceButton.className='secondary-button slide-voice-connect';
      const activeVoice=state.voiceSession?.slideId===slide.id?state.voiceSession:null;
      voiceButton.textContent=activeVoice?'Leave voice chat':'Connect to voice chat';
      voiceButton.onclick=()=>joinSlideVoice(slide.id,voiceButton);
      canvas.appendChild(voiceButton);
      if(activeVoice) {
        activeVoice.button=voiceButton;
        if(activeVoice.muteButton)canvas.appendChild(activeVoice.muteButton);
      }
    }
    renderDailyEgg(canvas,slide.id);
    renderCursors();
  }
  function renderDailyEgg(canvas,slideId) {
    canvas.querySelector('.easter-egg')?.remove();
    if(!slideId)return;
    const alreadyFound=state.foundEggs.has(slideId)||state.domain?.activity?.[session.key]?.eggs?.[todayKey()]?.slides?.[slideId];
    if(state.domain?.dailyEgg?.date!==todayKey()||state.domain.dailyEgg.slideId!==slideId||alreadyFound)return;
    const egg=document.createElement('button');
    egg.type='button';egg.className='easter-egg';egg.textContent='✦';egg.title='Find the Easter egg';egg.setAttribute('aria-label','Find hidden Easter egg');
    egg.onclick=async()=>{await findEgg(slideId);renderAll(false);};
    canvas.appendChild(egg);
  }
  function renderMediaTargets() {
    const current=ui.mediaTarget.value;
    const savedSlide=slideEntries().find(slide=>slide.id===state.editingSlide);
    Array.from(ui.mediaType.options).forEach(option=>{
      const category=mediaPassCategory(option.value);
      option.disabled=!!category&&!activeMediaPass(state.domain,category)&&option.value!==savedSlide?.mediaType;
    });
    ui.mediaTarget.replaceChildren();
    slideEntries().forEach(slide=>{
      const option=document.createElement('option');option.value=slide.id;option.textContent=slide.title||'Untitled slide';ui.mediaTarget.appendChild(option);
    });
    if(current&&[...ui.mediaTarget.options].some(option=>option.value===current))ui.mediaTarget.value=current;
    const teleport=ui.mediaType.value==='teleport';
    ui.mediaTarget.disabled=!canEdit()||!teleport;
    const type=ui.mediaType.value;
    const uploadType=['image','music','video'].includes(type);
    ui.mediaUrlField.hidden=teleport||type==='none'||uploadType;
    ui.mediaFileField.hidden=!uploadType;
    ui.mediaFile.accept=type==='image'?'image/*':type==='music'?'audio/*':type==='video'?'video/*':'';
    ui.mediaHelp.hidden=type!=='youtube';
    if(type==='youtube')ui.mediaHelp.textContent='YouTube links play as videos, not audio-only. To add audio, choose Audio and upload an audio file.';
    ui.mediaFile.disabled=!canEdit();
    ui.mediaUrlField.querySelector('input').disabled=!canEdit();
    ui.mediaTargetField.hidden=!teleport;
    ui.teleportOptions.hidden=ui.mediaType.value!=='teleport';
    ui.removeSlideMedia.hidden=ui.mediaType.value==='none'||!canEdit();
    renderMediaPreview();
  }
  function renderMediaPreview() {
    ui.mediaPreview.replaceChildren();
    const type=ui.mediaType.value;
    const url=ui.mediaUrl.value.trim();
    ui.mediaPreview.hidden=true;
    ui.removeSlideMedia.hidden=type==='none'||!canEdit();
    if(['image','music','video'].includes(type)&&url) {
      renderMediaElement(ui.mediaPreview,type,url,'Slide media preview');
      makeMediaMovable(ui.mediaPreview,normalizeMediaLayout(mediaLayoutDraft),true);
      ui.mediaPreview.hidden=false;
    } else if(type==='youtube'&&youtubeEmbed(url)) {
      renderMediaElement(ui.mediaPreview,type,youtubeEmbed(url),'YouTube video preview');
      makeMediaMovable(ui.mediaPreview,normalizeMediaLayout(mediaLayoutDraft),true);
      ui.mediaPreview.hidden=false;
    } else if(type==='teleport') {
      const preview=document.createElement('span');preview.className='teleport-preview';preview.textContent=ui.teleportLabel.value||'Visit this slide';preview.style.background=ui.teleportColor.value;ui.mediaPreview.appendChild(preview);ui.mediaPreview.hidden=false;
    }
    if(ui.voiceChat.checked) {
      const preview=document.createElement('span');preview.className='secondary-button';preview.textContent='Connect to voice chat';
      ui.mediaPreview.appendChild(preview);ui.mediaPreview.hidden=false;
    }
  }
  function renderMediaElement(container,type,url,title) {
    let element;
    if(type==='image') {
      element=document.createElement('img');element.src=url;element.alt=title;element.loading='lazy';
    } else if(type==='music') {
      element=document.createElement('audio');element.src=url;element.controls=true;element.preload='metadata';
    } else if(type==='video') {
      element=document.createElement('video');element.src=url;element.controls=true;element.preload='metadata';element.playsInline=true;
    } else if(type==='youtube') {
      element=document.createElement('iframe');element.src=url;element.title=title;element.loading='lazy';element.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';element.referrerPolicy='strict-origin-when-cross-origin';element.allowFullscreen=true;
    }
    if(!element)return;
    element.className='slide-media-content';
    container.appendChild(element);
    if(type==='image')element.onerror=()=>{setStatus('Could not load this image file or URL.',true);};
    if(type==='music'||type==='video')element.onerror=()=>{setStatus('This media file could not be played by your browser.',true);};
  }
  function applyMediaLayout(element,layout) {
    const box=normalizeMediaLayout(layout);
    element.style.position='absolute';
    element.style.left=box.x+'%';element.style.top=box.y+'%';
    element.style.width=box.width+'%';element.style.height=box.height+'%';
    element.style.right='auto';element.style.bottom='auto';element.style.maxHeight='none';
  }
  function makeMediaMovable(element,layout,editable) {
    const box=normalizeMediaLayout(layout);
    element.classList.add('movable-media');
    applyMediaLayout(element,box);
    if(!editable||!canEdit())return;
    const toolbar=document.createElement('div');toolbar.className='media-move-controls';
    const move=document.createElement('button');move.type='button';move.className='media-move-handle';move.textContent='Move media';move.setAttribute('aria-label','Move media on slide');
    const resize=document.createElement('button');resize.type='button';resize.className='media-resize-handle';resize.textContent='↘';resize.setAttribute('aria-label','Resize media');
    toolbar.append(move);
    element.appendChild(toolbar);
    element.appendChild(resize);
    const drag=(handle,resizeMode)=>{
      handle.addEventListener('pointerdown',event=>{
        event.preventDefault();event.stopPropagation();
        const bounds=document.querySelector('.editing-canvas').getBoundingClientRect();
        const startX=event.clientX,startY=event.clientY;
        const initial={...normalizeMediaLayout(mediaLayoutDraft)};
        handle.setPointerCapture(event.pointerId);
        const onMove=moveEvent=>{
          const dx=(moveEvent.clientX-startX)/bounds.width*100;
          const dy=(moveEvent.clientY-startY)/bounds.height*100;
          if(resizeMode) {
            box.width=Math.max(10,Math.min(100-box.x,initial.width+dx));
            box.height=Math.max(8,Math.min(100-box.y,initial.height+dy));
          } else {
            box.x=Math.max(0,Math.min(100-box.width,initial.x+dx));
            box.y=Math.max(0,Math.min(100-box.height,initial.y+dy));
          }
          mediaLayoutDraft={...box};
          applyMediaLayout(element,box);
        };
        const onUp=()=>{
          handle.removeEventListener('pointermove',onMove);
          handle.removeEventListener('pointerup',onUp);
          handle.removeEventListener('pointercancel',onUp);
          markEditorChanged();
        };
        handle.addEventListener('pointermove',onMove);
        handle.addEventListener('pointerup',onUp);
        handle.addEventListener('pointercancel',onUp);
      });
    };
    drag(move,false);drag(resize,true);
  }
  function renderEditor(force=false) {
    if(!force&&(hasUnsavedEditorChanges()||ui.slideForm.contains(document.activeElement)))return;
    const slide=slideEntries().find(item=>item.id===state.editingSlide);
    titleBoxDraft=normalizeTextBoxLayout(slide?.titleBox,{x:8,y:22,width:84,height:16,fontSize:48,textAlign:'left',bold:true,italic:false});
    bodyBoxDraft=normalizeTextBoxLayout(slide?.bodyBox,{x:8,y:34,width:78,height:47,fontSize:slide?.fontSize||24,textAlign:slide?.textAlign||'left',bold:!!slide?.bold,italic:!!slide?.italic});
    ui.deleteSlide.disabled=!slide;
    ui.mediaType.value=slide?.mediaType||'none';
    ui.mediaUrl.value=slide?.mediaUrl||'';
    ui.mediaFile.value='';
    mediaLayoutDraft=normalizeMediaLayout(slide?.mediaLayout);
    ui.mediaTarget.value=slide?.mediaTarget||'';
    ui.teleportLabel.value=slide?.teleportLabel||'Visit this slide';
    ui.teleportColor.value=slide?.teleportColor||'#85e3ac';
    ui.slideBackgroundColor.value=/^#[0-9a-f]{6}$/i.test(slide?.backgroundColor||'')?slide.backgroundColor:'#19221c';
    ui.voiceChat.checked=!!slide?.voiceChat;
    previousMediaType=ui.mediaType.value;
    ui.fontSize.value=String(slide?.fontSize||24);
    ui.textAlign.value=slide?.textAlign||'left';
    ui.body.style.fontSize=bodyBoxDraft.fontSize+'px';
    ui.body.style.textAlign=bodyBoxDraft.textAlign;
    ui.body.style.fontWeight=bodyBoxDraft.bold?'700':'400';
    ui.body.style.fontStyle=bodyBoxDraft.italic?'italic':'normal';
    document.querySelector('.editing-canvas').style.background=`radial-gradient(circle at 88% 14%, ${ui.slideBackgroundColor.value}88, transparent 30%), linear-gradient(145deg, ${ui.slideBackgroundColor.value}, #111612)`;
    ui.boldText.classList.toggle('selected',bodyBoxDraft.bold);
    ui.italicText.classList.toggle('selected',bodyBoxDraft.italic);
    ui.notes.value=slide?.speakerNotes||'';
    if(document.activeElement!==ui.title)ui.title.value=slide?.title||'';
    if(document.activeElement!==ui.body)ui.body.value=slide?.body||'';
    renderTextBoxes(slide?.textBoxes);
    selectFirstVisibleTextBox();
    renderDailyEgg(document.querySelector('.editing-canvas'),slide?.id);
    ui.deleteSlide.hidden=!canEdit();
    ui.editDomainDetails.hidden=!state.isOwner;
    ui.newSlide.hidden=!canCreateSlide();
    ui.addSlideFromFilmstrip.hidden=!canCreateSlide();
    const domainFull=slideEntries().length>=30;
    ui.newSlide.disabled=domainFull;
    ui.addSlideFromFilmstrip.disabled=domainFull;
    if(domainFull){ui.newSlide.title='This domain is full (30 slides maximum).';ui.addSlideFromFilmstrip.title=ui.newSlide.title;}
    else {ui.newSlide.title='';ui.addSlideFromFilmstrip.title='';}
    ui.insertMenuButton.hidden=!canEdit();
    ui.addTextBox.hidden=!canEdit();
    if(ui.fileMenuButton)ui.fileMenuButton.hidden=!state.isOwner;
    ui.slideForm.classList.toggle('read-only',!canEdit());
    ui.slideStatus.textContent=slide?'Slide '+(slideEntries().findIndex(entry=>entry.id===slide.id)+1):'New slide';
    const slideIndex=slideEntries().findIndex(entry=>entry.id===state.editingSlide);
    ui.moveSlideUp.disabled=!state.isOwner||slideIndex<=0;
    ui.moveSlideDown.disabled=!state.isOwner||slideIndex<0||slideIndex>=slideEntries().length-1;
    ui.title.readOnly=!canEdit();
    ui.body.readOnly=!canEdit();
    ui.notes.readOnly=!canEdit();
    ui.mediaType.disabled=!canEdit();
    ui.mediaUrl.disabled=!canEdit();
    ui.mediaTarget.disabled=!canEdit()||ui.mediaType.value!=='teleport';
    ui.teleportLabel.disabled=!canEdit();
    ui.teleportColor.disabled=!canEdit();
    ui.slideBackgroundColor.disabled=!canEdit();
    ui.voiceChat.disabled=!canEdit()||(!state.remote&&!slide?.voiceChat)||(!slide?.voiceChat&&inventoryCount('voice-chat')<1);
    ui.fontSize.disabled=!canEdit();
    ui.textBoxWidth.disabled=!canEdit();
    ui.textBoxHeight.disabled=!canEdit();
    ui.textAlign.disabled=!canEdit();
    ui.boldText.disabled=!canEdit();
    ui.italicText.disabled=!canEdit();
    ui.slideForm.querySelector('button[type="submit"]').hidden=!canEdit();
    renderCursors();
    renderMediaTargets();
    if(force&&typeof history!=='undefined'){history=[editorSnapshot()];historyIndex=0;}
    if(typeof history!=='undefined')syncHistoryButtons();
  }
  function renderShop() {
    ui.shopItems.replaceChildren();
    const listed=[];
    let hasQuestBoost=false;
    Object.entries(state.domain?.shop||{}).forEach(([id,item])=>{
      const preset=canonicalShopPreset(item.preset);
      if(preset==='boost-quests'&&hasQuestBoost)return;
      if(preset==='boost-quests')hasQuestBoost=true;
      listed.push({id,...item,preset});
    });
    const listedPresets=new Set(listed.map(item=>item.preset));
    const defaults=[
      {id:'builtin-slide-pass',preset:'slide-pass',name:'Slide creation pass',price:100,duration:'permanent',builtin:true},
      {id:'builtin-voice-chat',preset:'voice-chat',name:'Voice chat connect',price:250,duration:'permanent',builtin:true},
      {id:'builtin-boost-quests',preset:'boost-quests',name:'2× points on quests',price:250,duration:'day',builtin:true}
    ].filter(item=>!listedPresets.has(item.preset));
    const items=[...defaults,...listed].map(item=>{
      if(/^boost-(music|image|video|slides)$/.test(item.preset))item.preset=canonicalShopPreset(item.preset);
      if(item.name&&/^2× points · (music|images|videos|slides)$/.test(item.name))item.name='2× points on quests';
      return item;
    });
    items.forEach(item=>{
      const card=document.createElement('article');card.className='shop-card';
      const preset=presets[item.preset];
      const title=document.createElement('h3');title.textContent=item.name||preset?.label||'Domain item';
      const descriptions={
        'slide-pass':'Add one slide to your inventory; spend it to create a slide.',
        'voice-chat':'Unlock one voice chat connection for a slide.',
        'boost-quests':'Earn double points from quests.',
        'music-pass':'Unlock music on slides for the selected duration.',
        'image-pass':'Unlock images on slides for the selected duration.',
        'video-pass':'Unlock videos on slides for the selected duration.'
      };
      const description=document.createElement('p');description.textContent=descriptions[item.preset]||preset?.label||'Slide item';
      if(hasShopDuration(item.preset))description.textContent+=' · '+durationLabel(item.duration);
      const price=document.createElement('span');price.className='price';price.textContent=Number(item.price||0).toLocaleString()+' points';
      const button=document.createElement('button');button.type='button';button.className='secondary-button';button.textContent='Buy';
      button.disabled=!state.remote&&item.preset==='voice-chat';
      if(!state.remote&&item.preset==='voice-chat')button.title='Voice chat is only available on online servers.';
      button.onclick=()=>buyShopItem(item);
      card.append(title,description,price,button);
      if(state.isOwner&&!item.builtin){const remove=document.createElement('button');remove.type='button';remove.className='danger-button';remove.textContent='Remove item';remove.onclick=()=>removeShopItem(item.id);card.appendChild(remove);}
      ui.shopItems.appendChild(card);
    });
    renderInventory();
  }
  function renderInventory() {
    ui.inventoryList.replaceChildren();
    const inventory=state.domain?.inventory?.[session.key]||{};
    const items=[
      ['slide-pass','Slide creation passes'],
      ['voice-chat','Voice chat connects']
    ];
    items.forEach(([preset,label])=>{
      const row=document.createElement('p');row.className='inventory-item';
      const name=document.createElement('strong');name.textContent=label;
      const count=document.createElement('span');count.textContent=String(Math.max(0,Number(inventory[preset]||0)));
      row.append(name,count);ui.inventoryList.appendChild(row);
    });
    [['music','Music pass'],['images','Image pass'],['videos','Video pass']].forEach(([category,label])=>{
      const pass=state.domain?.mediaPasses?.[session.key]?.[category];
      const active=pass&&(pass.permanent||Number(pass.expiresAt)>Date.now());
      const row=document.createElement('p');row.className='inventory-item';
      const name=document.createElement('strong');name.textContent=label;
      const status=document.createElement('span');
      status.textContent=active?(pass.permanent?'Permanent':'Until '+new Date(Number(pass.expiresAt)).toLocaleDateString()):'Inactive';
      row.append(name,status);ui.inventoryList.appendChild(row);
    });
    (state.domain?.playerInventory?.[session.key]||[]).forEach(item=>{
      const row=document.createElement('p');row.className='inventory-item';
      const name=document.createElement('strong');name.textContent=item.name||'Player shop item';
      const detail=document.createElement('span');detail.textContent=item.type+' · '+(item.mediaData||item.url?'Media attached':'');
      row.append(name,detail);
      const mediaSource=item.mediaData||item.url;
      if(mediaSource) {
        const link=document.createElement('a');link.href=mediaSource;link.textContent=item.mediaData?'Download':'Open';
        if(item.mediaData)link.download=(item.name||'player-shop-item').replace(/[\/\\]/g,'_');
        else {link.target='_blank';link.rel='noopener noreferrer';}
        row.appendChild(link);
      }
      ui.inventoryList.appendChild(row);
    });
  }
  async function renderPlayerListings() {
    const container=ui.playerListingGrid;
    if(!container)return;
    container.replaceChildren();
    const listings=Object.entries(state.domain?.playerListings||{}).map(([id,item])=>({id,...item}))
      .sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
    if(!listings.length) {
      const empty=document.createElement('p');empty.className='market-empty';empty.textContent='No player listings yet. Be the first to open a shop.';
      container.appendChild(empty);return;
    }
    listings.forEach(item=>{
      const card=document.createElement('article');card.className='shop-card player-listing';
      const title=document.createElement('h3');title.textContent=item.name||'Untitled item';
      const type=document.createElement('p');type.textContent=(item.type||'other')+' · '+String(item.description||'No description provided.');
      const seller=document.createElement('small');seller.className='slide-owner';seller.textContent='Seller: '+(item.sellerKey===session.key?(session.username||'You'):item.sellerName||'Sektor member');
      const stock=document.createElement('small');stock.className='listing-stock';stock.textContent='In stock: '+Math.max(0,Number(item.stock)||0);
      const price=document.createElement('span');price.className='price';price.textContent=Number(item.price||0).toLocaleString()+' points';
      card.append(title,type,seller,stock,price);
      const preview=createPlayerListingPreview(item.type,item.mediaData||item.url);
      if(preview)card.appendChild(preview);
      const button=document.createElement('button');button.type='button';button.className='secondary-button';
      button.textContent=item.sellerKey===session.key?'Your listing':Number(item.stock)>0?'Buy':'Sold out';
      button.disabled=item.sellerKey===session.key||Number(item.stock)<=0;
      button.onclick=()=>buyPlayerListing(item.id);
      card.appendChild(button);
      if(item.sellerKey===session.key) {
        const remove=document.createElement('button');remove.type='button';remove.className='danger-button';remove.textContent='Remove listing';remove.onclick=()=>removePlayerListing(item.id);card.appendChild(remove);
      }
      container.appendChild(card);
    });
  }
  function createPlayerListingPreview(type,source) {
    if(typeof source!=='string'||!source||!['music','image','video'].includes(type))return null;
    if(source.startsWith('data:')) {
      const expected=type==='image'?'image/':type==='music'?'audio/':'video/';
      const match=source.match(/^data:([^;,]+);base64,/i);
      if(!match||!match[1].startsWith(expected))return null;
    } else {
      let parsed;
      try {parsed=new URL(source);}
      catch(error) {return null;}
      if(parsed.protocol!=='https:'||!parsed.hostname)return null;
    }
    const preview=document.createElement('div');preview.className='player-listing-preview';
    const label=document.createElement('small');label.textContent=type==='image'?'Image preview':'10-second preview';
    let media;
    if(type==='image') {
      media=document.createElement('img');media.alt='Listing image preview';media.loading='lazy';
    } else if(type==='music') {
      media=document.createElement('audio');media.controls=true;media.preload='metadata';media.setAttribute('aria-label','10-second audio preview');
    } else {
      media=document.createElement('video');media.controls=true;media.preload='metadata';media.playsInline=true;media.setAttribute('aria-label','10-second video preview');
    }
    media.src=source;
    if(type==='music'||type==='video') {
      media.controlsList='nodownload noplaybackrate';
      let previewTimer=0;
      const stopAtPreviewLimit=()=>{
        if(media.currentTime>=10) {
          media.pause();
          media.currentTime=0;
        }
      };
      media.addEventListener('play',()=>{
        clearInterval(previewTimer);
        stopAtPreviewLimit();
        if(!media.paused)previewTimer=window.setInterval(stopAtPreviewLimit,100);
      });
      media.addEventListener('pause',()=>clearInterval(previewTimer));
      media.addEventListener('ended',()=>clearInterval(previewTimer));
      media.addEventListener('timeupdate',stopAtPreviewLimit);
      media.addEventListener('seeking',stopAtPreviewLimit);
      media.addEventListener('seeked',stopAtPreviewLimit);
    }
    preview.append(label,media);
    return preview;
  }
  function updatePlayerListingPreview() {
    ui.playerListingPreview.replaceChildren();
    const preview=createPlayerListingPreview(ui.playerListingType.value,playerListingPreviewUrl);
    if(preview)ui.playerListingPreview.appendChild(preview);
  }
  function clearPlayerListingPreviewUrl() {
    ui.playerListingPreview.querySelectorAll('audio,video').forEach(media=>media.pause());
    if(playerListingPreviewUrl)URL.revokeObjectURL(playerListingPreviewUrl);
    playerListingPreviewUrl='';
  }
  function playerListingFileMatchesType(file,type) {
    if(!file||!(/^(image\/(png|jpeg|gif|webp|avif|bmp)|audio\/|video\/)/i.test(file.type)))return false;
    return type==='other'||(type==='image'&&file.type.startsWith('image/'))||(type==='music'&&file.type.startsWith('audio/'))||(type==='video'&&file.type.startsWith('video/'));
  }
  function readPlayerListingFile(file) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Could not read the selected media file.'));
      reader.onload=()=>{
        if(typeof reader.result!=='string')reject(new Error('The selected media file could not be read.'));
        else resolve(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }
  function updatePlayerListingStockCost() {
    const stock=Math.max(1,Math.min(9999,Number(ui.playerListingStock.value)||1));
    const cost=(stock-1)*10;
    ui.playerListingStockCost.textContent=cost.toLocaleString()+' points';
  }
  async function publishPlayerListing(event) {
    event.preventDefault();
    const name=ui.playerListingName.value.trim();
    const type=ui.playerListingType.value;
    const file=ui.playerListingFile.files?.[0]||null;
    const price=Number(ui.playerListingPrice.value);
    const stock=Number(ui.playerListingStock.value);
    if(name.length<2||!['music','image','video','other'].includes(type)||!Number.isInteger(price)||price<1||price>1000000||!Number.isInteger(stock)||stock<1||stock>9999)return setStatus('Enter a name, valid price, and stock quantity.',true);
    const stockCost=(stock-1)*10;
    if(type!=='other'&&!file)return setStatus('Choose a media file for music, images, or videos.',true);
    if(file&&file.size>maxSlideMediaBytes)return setStatus('Choose a media file no larger than 6 MB.',true);
    if(file&&!playerListingFileMatchesType(file,type))return setStatus('Choose a file that matches the selected listing type.',true);
    let mediaData='';
    if(file) {
      try {mediaData=await readPlayerListingFile(file);}
      catch(error) {return setStatus('Could not publish your listing: '+error.message,true);}
    }
    const id=makeId();
    try {
      await mutateDomain(domain=>{
        const sellerBalance=Number(domain.points?.[session.key]||0);
        if(!Number.isFinite(sellerBalance)||sellerBalance<stockCost)throw new Error('You need '+stockCost.toLocaleString()+' points to list this stock quantity.');
        domain.points=domain.points||{};
        domain.points[session.key]=sellerBalance-stockCost;
        domain.playerListings=domain.playerListings||{};
        domain.playerListings[id]={id,name:name.slice(0,60),type,mediaData,sellerKey:session.key,sellerName:session.username||'Sektor member',price,stock,description:ui.playerListingDescription.value.trim().slice(0,180),createdAt:Date.now()};
        return domain;
      });
      clearPlayerListingPreviewUrl();
      ui.playerListingForm.reset();ui.playerListingStock.value='1';ui.playerListingPrice.value='50';
      updatePlayerListingStockCost();updatePlayerListingPreview();
      ui.playerListingForm.hidden=true;
      setStatus('Your player shop listing is live. Stock cost: '+stockCost.toLocaleString()+' points.');
      renderPlayerListings();
      renderNavigation();
    } catch(error) {setStatus('Could not publish your listing: '+error.message,true);}
  }
  async function buyPlayerListing(id) {
    try {
      await mutateDomain(domain=>{
        const item=domain.playerListings?.[id];
        if(!item||Number(item.stock)<1)throw new Error('That listing is sold out.');
        if(item.sellerKey===session.key)throw new Error('You cannot buy your own listing.');
        const price=Number(item.price);
        const buyerBalance=Number(domain.points?.[session.key]||0);
        if(!Number.isInteger(price)||price<1)throw new Error('This listing has an invalid price.');
        if(buyerBalance<price)throw new Error('Not enough points to buy this item.');
        domain.points=domain.points||{};
        domain.points[session.key]=buyerBalance-price;
        domain.points[item.sellerKey]=Number(domain.points[item.sellerKey]||0)+price;
        item.stock=Number(item.stock)-1;
        domain.playerInventory=domain.playerInventory||{};
        domain.playerInventory[session.key]=Array.isArray(domain.playerInventory[session.key])?domain.playerInventory[session.key]:[];
        domain.playerInventory[session.key].push({id:makeId(),name:item.name,type:item.type,mediaData:item.mediaData||'',url:item.url||'',description:item.description||'',sellerKey:item.sellerKey,sellerName:item.sellerName,purchasedAt:Date.now()});
        return domain;
      });
      setStatus('Purchase complete. The item was added to your inventory.');
      renderNavigation();
    } catch(error) {setStatus('Could not buy this item: '+error.message,true);}
  }
  async function removePlayerListing(id) {
    try {
      await mutateDomain(domain=>{
        const item=domain.playerListings?.[id];
        if(!item||item.sellerKey!==session.key)throw new Error('You can only remove your own listing.');
        delete domain.playerListings[id];
        return domain;
      });
      setStatus('Player listing removed.');
      renderPlayerListings();
    } catch(error) {setStatus('Could not remove your listing: '+error.message,true);}
  }
  function periodClaimed(claims,id,period) { return claims?.[session.key]?.[id]===period; }
  function renderGames() {
    renderColorClash();
    renderPromptParty();
    const game=state.domain?.games?.ticTacToe||null;
    const board=Array.isArray(game?.board)?game.board:Array(9).fill('');
    const players=game?.players||{};
    const mark=players.X?.key===session.key?'X':players.O?.key===session.key?'O':'';
    const turnName=game?.players?.[game?.turn]?.name||game?.turn||'';
    ui.ticTacToeBoard.replaceChildren();
    board.forEach((value,index)=>{
      const cell=document.createElement('button');cell.type='button';cell.textContent=value||'·';
      cell.setAttribute('aria-label','Cell '+(index+1)+(value?', '+value:''));
      cell.disabled=game?.status!=='playing'||!mark||game.turn!==mark||!!value;
      cell.onclick=()=>playTicTacToe(index);
      ui.ticTacToeBoard.appendChild(cell);
    });
    if(!state.remote)ui.ticTacToeStatus.textContent='Multiplayer Tic-Tac-Toe is available on online servers.';
    else if(!game)ui.ticTacToeStatus.textContent='Join to start a match.';
    else if(game.status==='waiting')ui.ticTacToeStatus.textContent='Waiting for another player. '+(game.players?.X?.name||'Player')+' is X.';
    else if(game.status==='playing')ui.ticTacToeStatus.textContent=game.turn===mark?'Your turn ('+mark+').':(turnName+' ('+game.turn+') is playing.');
    else if(game.status==='won')ui.ticTacToeStatus.textContent=(game.players?.[game.winner]?.name||game.winner)+' ('+game.winner+') wins!';
    else ui.ticTacToeStatus.textContent='It’s a draw.';
    const hasOpenSeat=!game||game.status==='waiting'&&(!players.X||!players.O);
    const isPlayer=!!mark;
    ui.ticTacToeJoin.hidden=!hasOpenSeat||isPlayer;
    ui.ticTacToeJoin.disabled=!state.remote;
    ui.ticTacToeJoin.textContent=game?.players?.X?'Join as O':'Join as X';
    ui.ticTacToeReset.hidden=!game||!['won','draw'].includes(game.status);
    ui.ticTacToeReset.disabled=!state.remote;
  }
  const cardColors={red:'#f06a61',blue:'#66a9ff',green:'#66ca8c',yellow:'#f1cf58'};
  function makeColorClashDeck() {
    const deck=[];
    Object.keys(cardColors).forEach(color=>{for(let value=0;value<=9;value++)deck.push({id:makeId(),color,value});});
    for(let i=deck.length-1;i>0;i--) {
      const j=Math.floor(Math.random()*(i+1));
      [deck[i],deck[j]]=[deck[j],deck[i]];
    }
    return deck;
  }
  function renderColorClash() {
    const game=state.domain?.games?.colorClash||null;
    const players=game?.players||{};
    const player=Object.values(players).find(item=>item?.key===session.key);
    const hand=player?.hand||[];
    const myTurn=!!player&&game?.status==='playing'&&game.turn===session.key;
    const top=game?.discard?.at(-1);
    ui.colorClashStatus.textContent=!state.remote?'Color Clash multiplayer is available on online servers.':!game?'Join to start a match.':game.status==='waiting'?'Waiting for one more player to join.':game.status==='playing'?myTurn?'Your turn. Match the color or number.':(players[safe(game.turn)]?.name||'Your opponent')+' is playing.':(players[safe(game.winner)]?.name||'A player')+' won Color Clash!';
    ui.colorClashTable.replaceChildren();
    if(top) {
      const label=document.createElement('span');label.textContent='Top card';
      const card=document.createElement('span');card.className='color-clash-discard';card.textContent=String(top.value);card.style.backgroundColor=cardColors[top.color]||'#fff';
      const count=document.createElement('span');count.textContent=Object.values(players).map(item=>(item.name||'Player')+': '+(item.hand?.length||0)+' cards').join(' · ');
      ui.colorClashTable.append(label,card,count);
    } else ui.colorClashTable.textContent='The discard pile will appear when the match starts.';
    ui.colorClashHand.replaceChildren();
    hand.forEach(item=>{
      const button=document.createElement('button');button.type='button';button.className='color-clash-card';button.textContent=String(item.value);
      button.style.backgroundColor=cardColors[item.color]||'#fff';
      button.setAttribute('aria-label',item.color+' '+item.value);
      button.disabled=!myTurn||!top||(item.color!==top.color&&item.value!==top.value);
      button.title=item.color+' '+item.value+(button.disabled?' — match the color or number':' — play card');
      button.onclick=()=>playColorClashCard(item.id);
      ui.colorClashHand.appendChild(button);
    });
    const hasSeat=!game||game.status==='waiting'&&Object.keys(players).length<2&&!player;
    ui.colorClashJoin.hidden=!hasSeat||!!player;
    ui.colorClashJoin.disabled=!state.remote;
    ui.colorClashDraw.hidden=!myTurn;
    ui.colorClashDraw.disabled=!myTurn;
    ui.colorClashReset.hidden=!game||game.status!=='won';
    ui.colorClashReset.disabled=!state.remote;
  }
  async function joinColorClash() {
    if(!state.remote)return setStatus('Color Clash is available on online servers.',true);
    try {
      await mutateDomain(domain=>{
        domain.games=domain.games||{};
        let game=domain.games.colorClash;
        if(!game) {
          const deck=makeColorClashDeck();
          const hand=deck.splice(0,7);
          game=domain.games.colorClash={matchId:makeId(),status:'waiting',players:{[safe(session.key)]:{key:session.key,name:String(session.username||'Player').slice(0,32),hand}},playerOrder:[session.key],turn:session.key,deck,discard:[deck.pop()],updatedAt:Date.now()};
          recordGameActivity(domain,'colorClash',game.matchId);
          return domain;
        }
        if(game.status!=='waiting')throw new Error('This match has already started or finished.');
        if(Object.values(game.players||{}).some(item=>item.key===session.key))return domain;
        if(Object.keys(game.players||{}).length>=2)throw new Error('Both seats are taken.');
        game.matchId=game.matchId||makeId();
        const hand=game.deck.splice(0,7);
        game.players[safe(session.key)]={key:session.key,name:String(session.username||'Player').slice(0,32),hand};
        game.playerOrder=[...(game.playerOrder||[]),session.key];
        recordGameActivity(domain,'colorClash',game.matchId);
        game.status='playing';game.turn=game.playerOrder[0];game.updatedAt=Date.now();
        return domain;
      });
      setStatus('Joined the Color Clash match.');
    } catch(error) {setStatus('Could not join Color Clash: '+error.message,true);}
  }
  async function playColorClashCard(cardId) {
    try {
      await mutateDomain(domain=>{
        const game=domain.games?.colorClash;
        const player=game?.players?.[safe(session.key)];
        const top=game?.discard?.at(-1);
        if(!game||game.status!=='playing'||game.turn!==session.key||!player||!top)throw new Error('It is not your turn.');
        const index=player.hand.findIndex(item=>item.id===cardId);
        if(index<0)throw new Error('That card is not in your hand.');
        const [card]=player.hand.splice(index,1);
        if(card.color!==top.color&&card.value!==top.value)throw new Error('Play a card that matches the color or number.');
        game.discard.push(card);
        if(!player.hand.length) {
          game.status='won';game.winner=session.key;
          const date=todayKey();
          domain.gameWins=domain.gameWins||{};
          domain.gameWins[session.key]=domain.gameWins[session.key]||{};
          domain.gameWins[session.key][date]=true;
          recordGameActivity(domain,'colorClash',game.matchId,true);
        } else {
          const next=(game.playerOrder||[]).find(key=>key!==session.key);
          game.turn=next||session.key;
        }
        game.updatedAt=Date.now();
        return domain;
      });
    } catch(error) {setStatus('Could not play that card: '+error.message,true);}
  }
  async function drawColorClashCard() {
    try {
      await mutateDomain(domain=>{
        const game=domain.games?.colorClash;
        if(!game||game.status!=='playing'||game.turn!==session.key)throw new Error('It is not your turn.');
        if(!game.deck?.length) {
          const top=game.discard.pop();
          game.deck=game.discard.splice(0);
          for(let i=game.deck.length-1;i>0;i--) {
            const j=Math.floor(Math.random()*(i+1));
            [game.deck[i],game.deck[j]]=[game.deck[j],game.deck[i]];
          }
          game.discard=[top];
        }
        if(!game.deck.length)throw new Error('No cards remain to draw.');
        game.players[safe(session.key)].hand.push(game.deck.pop());
        game.turn=game.playerOrder.find(key=>key!==session.key)||session.key;
        game.updatedAt=Date.now();
        return domain;
      });
    } catch(error) {setStatus('Could not draw a card: '+error.message,true);}
  }
  async function resetColorClash() {
    try {
      await mutateDomain(domain=>{
        if(domain.games?.colorClash?.status!=='won')throw new Error('Finish the current match first.');
        const deck=makeColorClashDeck();
        const hand=deck.splice(0,7);
        domain.games.colorClash={matchId:makeId(),status:'waiting',players:{[safe(session.key)]:{key:session.key,name:String(session.username||'Player').slice(0,32),hand}},playerOrder:[session.key],turn:session.key,deck,discard:[deck.pop()],updatedAt:Date.now()};
        recordGameActivity(domain,'colorClash',domain.games.colorClash.matchId);
        return domain;
      });
      setStatus('New Color Clash match started. Invite another player to join.');
    } catch(error) {setStatus('Could not start a new Color Clash match: '+error.message,true);}
  }
  const promptPartyPrompts=[
    'The server meeting was going well until someone brought up ___.',
    'The secret ingredient in the ultimate snack is ___.',
    'I knew the adventure was in trouble when the map started showing ___.',
    'The newest server rule: absolutely no ___ after midnight.',
    'The award for most unexpected invention goes to ___.',
    'The dragon agreed to leave town in exchange for ___.',
    'The group chat went quiet after someone posted ___.',
    'A tiny robot arrived with one important message: ___.'
  ];
  function renderPromptParty() {
    const game=state.domain?.games?.promptParty||null;
    const players=game?.players||{};
    const player=players[safe(session.key)];
    const isHost=game?.hostKey===session.key;
    const submissions=game?.submissions||{};
    const submitted=!!submissions[safe(session.key)];
    ui.promptPartyStatus.textContent=!state.remote?'Prompt Party is available on online servers.':!game?'Join a room to play.':game.status==='waiting'?'Players: '+Object.keys(players).length+'/6. '+(isHost?'Start when at least two players have joined.':'Waiting for the host to start.'):game.status==='answering'?'Submitted '+Object.keys(submissions).length+'/'+Object.keys(players).length+' answers.':game.status==='judging'?isHost?'Choose the funniest answer.':'Waiting for the host to choose a winner.':(players[safe(game.winner)]?.name||'A player')+' won this round!';
    ui.promptPartyPrompt.hidden=!game?.prompt;
    ui.promptPartyPrompt.textContent=game?.prompt||'';
    ui.promptPartyAnswers.replaceChildren();
    if(game?.status==='judging') {
      Object.entries(submissions).forEach(([playerKey,entry],index)=>{
        const answer=document.createElement(isHost?'button':'div');
        answer.className='prompt-party-answer';
        answer.textContent='Answer '+(index+1)+': '+entry.text;
        if(isHost) {
          answer.type='button';
          answer.onclick=()=>choosePromptPartyWinner(playerKey);
        }
        ui.promptPartyAnswers.appendChild(answer);
      });
    } else if(game?.status==='won') {
      const winner=document.createElement('p');winner.className='game-result';winner.textContent=(players[safe(game.winner)]?.name||'A player')+' won: “'+(submissions[safe(game.winner)]?.text||'')+'”';
      ui.promptPartyAnswers.appendChild(winner);
    }
    ui.promptPartyJoin.hidden=!!player||!!game&&game.status!=='waiting'||Object.keys(players).length>=6;
    ui.promptPartyJoin.disabled=!state.remote;
    ui.promptPartyStart.hidden=!isHost||game?.status!=='waiting';
    ui.promptPartyStart.disabled=Object.keys(players).length<2||!state.remote;
    ui.promptPartyAnswerForm.hidden=game?.status!=='answering'||!player||submitted;
    ui.promptPartyReset.hidden=!isHost||game?.status!=='won';
    ui.promptPartyReset.disabled=!state.remote;
  }
  async function joinPromptParty() {
    if(!state.remote)return setStatus('Prompt Party is available on online servers.',true);
    try {
      await mutateDomain(domain=>{
        domain.games=domain.games||{};
        let game=domain.games.promptParty;
        if(!game)game=domain.games.promptParty={status:'waiting',hostKey:session.key,matchId:makeId(),players:{},submissions:{},round:0};
        if(game.status!=='waiting')throw new Error('This room is already playing a round.');
        if(game.players?.[safe(session.key)])return domain;
        if(Object.keys(game.players||{}).length>=6)throw new Error('This room already has six players.');
        game.players=game.players||{};
        game.players[safe(session.key)]={key:session.key,name:String(session.username||'Player').slice(0,32)};
        game.updatedAt=Date.now();
        return domain;
      });
      setStatus('Joined Prompt Party.');
    } catch(error) {setStatus('Could not join Prompt Party: '+error.message,true);}
  }
  async function startPromptPartyRound() {
    try {
      await mutateDomain(domain=>{
        const game=domain.games?.promptParty;
        if(!game||game.hostKey!==session.key||game.status!=='waiting')throw new Error('Only the host can start the round.');
        if(Object.keys(game.players||{}).length<2)throw new Error('At least two players are needed.');
        const choices=promptPartyPrompts.filter(prompt=>prompt!==game.prompt);
        game.prompt=choices[Math.floor(Math.random()*choices.length)];
        game.submissions={};game.status='answering';game.round=Number(game.round||0)+1;game.matchId=makeId();game.updatedAt=Date.now();
        Object.values(game.players).forEach(player=>recordGameActivity(domain,'promptParty',game.matchId,false,player.key));
        return domain;
      });
    } catch(error) {setStatus('Could not start Prompt Party: '+error.message,true);}
  }
  async function submitPromptPartyAnswer(event) {
    event.preventDefault();
    const text=ui.promptPartyAnswer.value.trim().slice(0,160);
    if(!text)return;
    try {
      await mutateDomain(domain=>{
        const game=domain.games?.promptParty;
        const player=game?.players?.[safe(session.key)];
        if(!game||game.status!=='answering'||!player)throw new Error('You are not playing this round.');
        game.submissions=game.submissions||{};
        if(game.submissions[safe(session.key)])throw new Error('You already submitted an answer.');
        game.submissions[safe(session.key)]={key:session.key,name:player.name,text};
        recordGameActivity(domain,'promptParty',game.matchId);
        if(Object.keys(game.submissions).length===Object.keys(game.players||{}).length)game.status='judging';
        game.updatedAt=Date.now();
        return domain;
      });
      ui.promptPartyAnswer.value='';
      setStatus('Answer submitted.');
    } catch(error) {setStatus('Could not submit your answer: '+error.message,true);}
  }
  async function choosePromptPartyWinner(playerKey) {
    try {
      await mutateDomain(domain=>{
        const game=domain.games?.promptParty;
        if(!game||game.status!=='judging'||game.hostKey!==session.key)throw new Error('Only the host can choose the winning answer.');
        if(!game.submissions?.[playerKey])throw new Error('That answer is no longer available.');
        game.winner=playerKey;game.status='won';game.updatedAt=Date.now();
        const winnerKey=game.players?.[playerKey]?.key;
        if(winnerKey) {
          const date=todayKey();
          domain.gameWins=domain.gameWins||{};
          domain.gameWins[winnerKey]=domain.gameWins[winnerKey]||{};
          domain.gameWins[winnerKey][date]=true;
          recordGameActivity(domain,'promptParty',game.matchId,true,winnerKey);
        }
        return domain;
      });
      setStatus('Prompt Party winner selected.');
    } catch(error) {setStatus('Could not choose the winner: '+error.message,true);}
  }
  async function resetPromptParty() {
    try {
      await mutateDomain(domain=>{
        const game=domain.games?.promptParty;
        if(!game||game.hostKey!==session.key||game.status!=='won')throw new Error('Only the host can start the next round.');
        game.submissions={};game.prompt='';game.status='waiting';game.winner='';game.matchId=makeId();game.updatedAt=Date.now();
        return domain;
      });
    } catch(error) {setStatus('Could not reset Prompt Party: '+error.message,true);}
  }
  function ticTacToeWinner(board) {
    const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(const [a,b,c] of lines)if(board[a]&&board[a]===board[b]&&board[a]===board[c])return board[a];
    return '';
  }
  async function joinTicTacToe() {
    if(!state.remote)return setStatus('Multiplayer Tic-Tac-Toe is available on online servers.',true);
    try {
      await mutateDomain(domain=>{
        domain.games=domain.games||{};
        let game=domain.games.ticTacToe;
        if(!game)game=domain.games.ticTacToe={matchId:makeId(),board:Array(9).fill(''),players:{},turn:'X',status:'waiting'};
        if(game.status!=='waiting')throw new Error('This match has already started or finished.');
        if(game.players?.X?.key===session.key||game.players?.O?.key===session.key)return domain;
        game.players=game.players||{};
        const mark=game.players.X?'O':'X';
        if(game.players[mark])throw new Error('Both seats are taken.');
        game.players[mark]={key:session.key,name:String(session.username||'Player').slice(0,32)};
        game.matchId=game.matchId||makeId();
        recordGameActivity(domain,'ticTacToe',game.matchId);
        if(game.players.X&&game.players.O)game.status='playing';
        game.updatedAt=Date.now();
        return domain;
      });
      setStatus('Joined the Tic-Tac-Toe match.');
    } catch(error) {setStatus('Could not join the match: '+error.message,true);}
  }
  async function playTicTacToe(index) {
    try {
      await mutateDomain(domain=>{
        const game=domain.games?.ticTacToe;
        if(!game||game.status!=='playing')throw new Error('This match is not accepting moves.');
        const mark=game.players?.X?.key===session.key?'X':game.players?.O?.key===session.key?'O':'';
        if(!mark||game.turn!==mark)throw new Error('It is not your turn.');
        if(!Number.isInteger(index)||index<0||index>8||game.board?.[index])throw new Error('That square is unavailable.');
        game.board[index]=mark;
        const winner=ticTacToeWinner(game.board);
        if(winner) {
          game.status='won';game.winner=winner;
          if(game.players[winner].key===session.key) {
            const date=todayKey();
            domain.gameWins=domain.gameWins||{};
            domain.gameWins[session.key]=domain.gameWins[session.key]||{};
            domain.gameWins[session.key][date]=true;
            recordGameActivity(domain,'ticTacToe',game.matchId,true);
          }
        } else if(game.board.every(Boolean))game.status='draw';
        else game.turn=mark==='X'?'O':'X';
        game.updatedAt=Date.now();
        return domain;
      });
    } catch(error) {setStatus('Could not make that move: '+error.message,true);}
  }
  async function resetTicTacToe() {
    try {
      await mutateDomain(domain=>{
        const game=domain.games?.ticTacToe;
        if(!game||!['won','draw'].includes(game.status))throw new Error('Finish the current match first.');
        domain.games.ticTacToe={matchId:makeId(),board:Array(9).fill(''),players:{X:{key:session.key,name:String(session.username||'Player').slice(0,32)}},turn:'X',status:'waiting',updatedAt:Date.now()};
        recordGameActivity(domain,'ticTacToe',domain.games.ticTacToe.matchId);
        return domain;
      });
      setStatus('New Tic-Tac-Toe match started. Invite someone to join as O.');
    } catch(error) {setStatus('Could not start a new match: '+error.message,true);}
  }
  function renderQuests() {
    ui.questGrid.replaceChildren();
    questDefinitions.forEach(quest=>{
      const period=quest.periodType==='daily'?todayKey():weekKey();
      const progress=Math.min(quest.goal,questProgress(quest,state.domain));
      const reward=questReward(quest,state.domain);
      const claimed=periodClaimed(state.domain?.claims,quest.id,period);
      const card=document.createElement('article');card.className='quest-card';card.dataset.period=quest.periodType;
      const title=document.createElement('h3');title.textContent=(quest.periodType==='daily'?'Daily':'Weekly')+' · '+quest.title;
      const desc=document.createElement('p');desc.textContent=quest.description;
      const rewardLabel=document.createElement('div');rewardLabel.className='reward';rewardLabel.textContent='+'+reward+' pts';
      const progressBar=document.createElement('div');progressBar.className='quest-progress';const fill=document.createElement('span');fill.style.width=(progress/quest.goal*100)+'%';progressBar.appendChild(fill);
      const progressLabel=document.createElement('small');progressLabel.textContent=progress+'/'+quest.goal+' · '+(claimed?'claimed':progress>=quest.goal?'ready':'in progress');
      const button=document.createElement('button');button.type='button';button.className=progress>=quest.goal&&!claimed?'primary-button':'secondary-button';button.disabled=progress<quest.goal||claimed;button.textContent=claimed?'Claimed':'Claim points';
      button.onclick=()=>claimQuest(quest.id);
      card.append(title,desc,rewardLabel,progressBar,progressLabel,button);ui.questGrid.appendChild(card);
    });
    renderLeaderboard();
  }
  function renderSecretReward() {
    if(!ui.secretCodeForm)return;
    const claimed=!!state.domain?.secretCodeClaims?.[session.key]?.theyseeyou;
    ui.secretCodeInput.disabled=claimed;
    ui.secretCodeButton.disabled=claimed;
    ui.secretCodeStatus.textContent=claimed?'Secret reward already claimed on this server.':'Type the secret code to claim 10,000 points once on this server.';
  }
  async function redeemSecretReward(event) {
    event.preventDefault();
    if(ui.secretCodeInput.value.trim().toLowerCase()!=='theyseeyou') {
      ui.secretCodeStatus.textContent='That secret code was not recognized.';
      return;
    }
    ui.secretCodeInput.disabled=true;
    ui.secretCodeButton.disabled=true;
    try {
      await mutateDomain(domain=>{
        domain.secretCodeClaims=domain.secretCodeClaims||{};
        const claims=domain.secretCodeClaims[session.key]||{};
        if(claims.theyseeyou)throw new Error('You already claimed this secret reward on this server.');
        domain.points=domain.points||{};
        domain.points[session.key]=Number(domain.points[session.key]||0)+10000;
        domain.secretCodeClaims[session.key]={...claims,theyseeyou:Date.now()};
        return domain;
      });
      ui.secretCodeInput.value='';
      setStatus('Secret reward claimed: +10,000 points.');
      renderNavigation();
    } catch(error) {
      ui.secretCodeInput.disabled=false;
      ui.secretCodeButton.disabled=false;
      ui.secretCodeStatus.textContent=error.message;
      setStatus('Could not claim the secret reward: '+error.message,true);
    }
  }
  async function renderLeaderboard() {
    const version=++state.leaderboardVersion;
    ui.leaderboard.replaceChildren();
    const ranked=Object.entries(state.domain?.points||{})
      .filter(([key,points])=>key!==state.server?.ownerKey&&Number(points)>0)
      .sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,10);
    if(!ranked.length){const empty=document.createElement('li');empty.textContent='No points earned yet.';ui.leaderboard.appendChild(empty);return;}
    try {
      const entries=await Promise.all(ranked.map(async([key,points])=>{
        if(!state.profileCache.has(key)) {
          if(!db) return {key,points,name:'Sektor member'};
          const snapshot=await db.ref('users/'+safe(key)).get();
          state.profileCache.set(key,snapshot.val()||{});
        }
        const profile=state.profileCache.get(key);
        return {key,points,name:profile.username||'Sektor member'};
      }));
      if(version!==state.leaderboardVersion)return;
      entries.forEach(entry=>{
        const row=document.createElement('li');
        const name=document.createElement('strong');name.textContent=entry.name;
        const score=document.createElement('span');score.textContent=Number(entry.points).toLocaleString()+' pts';
        row.append(name,score);ui.leaderboard.appendChild(row);
      });
    } catch(error) { setStatus('Could not load leaderboard profiles: '+error.message,true); }
  }
  function renderAll(forceEditor=false) {
    renderNavigation();
    renderEditor(forceEditor);
    renderDailyEgg(document.querySelector('.editing-canvas'),slideEntries().find(slide=>slide.id===state.editingSlide)?.id);
    renderSlide(slideEntries().find(slide=>slide.id===state.selectedSlide)||slideEntries()[0]);
  }
  async function ensureStarterPoints(server) {
    const runKey=server.code+':'+session.key;
    if(state.starterGrantRunKey===runKey)return;
    state.starterGrantRunKey=runKey;
    try {
      const applyGrant=domain=>{
        domain=domain||blankDomain(server);
        domain.starterPointsGranted=domain.starterPointsGranted||{};
        if(domain.starterPointsGranted[session.key])return domain;
        domain.points=domain.points||{};
        const grant=Number(domain.points[session.key]||0)<=0?250:0;
        if(grant)domain.points[session.key]=grant;
        domain.starterPointsGranted[session.key]={amount:grant};
        return domain;
      };
      let awarded=0;
      if(state.remote) {
        const result=await state.domainRef.transaction(current=>applyGrant(current));
        if(!result.committed)throw new Error('The starter points could not be saved.');
        if(state.server!==server)return;
        state.domain=result.snapshot.val();
        awarded=Number(state.domain?.starterPointsGranted?.[session.key]?.amount||0);
      } else {
        await mutateDomain(applyGrant);
        awarded=Number(state.domain?.starterPointsGranted?.[session.key]?.amount||0);
      }
      if(state.server===server&&awarded)setStatus(awarded+' starter points added. Claim quests to earn more.');
    } catch(error) {
      if(state.server!==server)return;
      state.starterGrantRunKey='';
      setStatus('Could not add starter points: '+error.message,true);
    }
  }
  function openSlide(id) {
    const slide=slideEntries().find(item=>item.id===id);
    if(!slide){setStatus('That teleport destination no longer exists.',true);return;}
    clearOwnCursor();
    state.selectedSlide=id;
    state.editingSlide=id;
    state.selectedTab='browse';
    state.editingMode=false;
    renderTabs();
    renderAll();
  }
  async function mutateDomain(mutator,errorMessage='Could not save this domain change.') {
    if(state.remote) {
      const result=await state.domainRef.transaction(current=>mutator(current||blankDomain(state.server)));
      if(!result.committed)throw new Error(errorMessage);
      state.domain=result.snapshot.val();
      return state.domain;
    }
    const domains=JSON.parse(localStorage.getItem('sektorSlidesLocal')||'{}');
    const domain=mutator(domains[state.server.code]||blankDomain(state.server));
    domains[state.server.code]=domain;
    localStorage.setItem('sektorSlidesLocal',JSON.stringify(domains));
    state.domain=domain;
    renderAll();
    return domain;
  }
  async function ensureDailyEasterEgg() {
    const server=state.server;
    const domainReference=state.domainRef;
    const remote=state.remote;
    const date=todayKey();
    const runKey=(server?.code||'')+':'+date;
    const slides=slideEntries();
    const eggIsValid=state.domain?.dailyEgg?.date===date&&slides.some(slide=>slide.id===state.domain.dailyEgg.slideId);
    if(!server||(state.eggBotRunKey===runKey&&eggIsValid))return;
    if(!slides.length)return;
    state.eggBotRunKey=runKey;
    try {
      if(remote) {
        const result=await domainReference.transaction(current=>{
          const domain=current||blankDomain(server);
          const slides=Object.keys(domain.slides||{});
          if(!slides.length)return domain;
          if(domain.dailyEgg?.date===date&&slides.includes(domain.dailyEgg.slideId))return domain;
          domain.dailyEgg={date,slideId:slides[Math.floor(Math.random()*slides.length)]};
          return domain;
        });
        if(!result.committed)throw new Error('The daily egg placement was not saved.');
        if(state.server!==server)return;
        state.domain=result.snapshot.val();
        renderAll(false);
      } else {
        await mutateDomain(domain=>{
          const slides=Object.keys(domain.slides||{});
          if(!slides.length)return domain;
          if(domain.dailyEgg?.date===date&&slides.includes(domain.dailyEgg.slideId))return domain;
          domain.dailyEgg={date,slideId:slides[Math.floor(Math.random()*slides.length)]};
          return domain;
        });
      }
    } catch(error) {
      if(state.server!==server)return;
      state.eggBotRunKey='';
      setStatus('Could not place today’s Easter egg: '+error.message,true);
    }
  }
  function scheduleDailyEggRefresh() {
    clearTimeout(dailyEggTimer);
    const now=new Date();
    const nextUtcDay=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1)+1000;
    dailyEggTimer=setTimeout(()=>{
      state.eggBotRunKey='';
      ensureDailyEasterEgg();
      renderAll(false);
      scheduleDailyEggRefresh();
    },Math.max(1000,nextUtcDay-Date.now()));
  }
  function scheduleQuestRefresh() {
    clearTimeout(questRefreshTimer);
    const now=new Date();
    const nextUtcDay=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1)+1000;
    questRefreshTimer=setTimeout(()=>{
      renderQuests();
      scheduleQuestRefresh();
    },Math.max(1000,nextUtcDay-Date.now()));
  }
  async function recordVisit(slideId) {
    const key=todayKey(),week=weekKey();
    const existing=state.domain?.activity?.[session.key]?.daily?.[key]?.slides?.[slideId];
    if(existing)return;
    try {
      await mutateDomain(domain=>{
        domain.activity=domain.activity||{};
        const user=domain.activity[session.key]=domain.activity[session.key]||{};
        const daily=user.daily=dailySafe(user.daily);
        daily[key]=daily[key]||{slides:{}};
        daily[key].slides=daily[key].slides||{};
        daily[key].slides[slideId]=true;
        const weekly=user.weekly=user.weekly||{};
        weekly[week]=weekly[week]||{slides:{}};
        weekly[week].slides=weekly[week].slides||{};
        weekly[week].slides[slideId]=true;
        return domain;
      });
    } catch(error) { setStatus('Could not record this visit: '+error.message,true); }
  }
  function dailySafe(value){return value&&typeof value==='object'?value:{};}
  function recordGameActivity(domain,gameType,matchId,isWin=false,playerKey=session.key) {
    if(!gameType||!matchId)throw new Error('A game match ID is required to record quest progress.');
    domain.activity=domain.activity||{};
    const user=domain.activity[playerKey]=domain.activity[playerKey]||{};
    const gameKey=safe(gameType);
    const matchKey=safe(gameType+'_'+matchId);
    [[user.daily=dailySafe(user.daily),todayKey()],[user.weekly=dailySafe(user.weekly),weekKey()]].forEach(([periodsByKey,periodKey])=>{
      const period=periodsByKey[periodKey]=periodsByKey[periodKey]||{};
      const games=period.games=period.games||{};
      games.plays=games.plays||{};games.playedMatches=games.playedMatches||{};
      if(!games.playedMatches[matchKey]) {
        games.playedMatches[matchKey]=true;
        games.plays[gameKey]=Number(games.plays[gameKey]||0)+1;
      }
      if(isWin) {
        games.wins=games.wins||{};games.wonMatches=games.wonMatches||{};
        if(!games.wonMatches[matchKey]) {
          games.wonMatches[matchKey]=true;
          games.wins[gameKey]=Number(games.wins[gameKey]||0)+1;
        }
      }
    });
  }
  function questProgress(quest,domain) {
    const daily=quest.periodType==='daily';
    const periodKey=daily?todayKey():weekKey();
    const user=domain?.activity?.[session.key]||{};
    const period=(daily?user.daily?.[periodKey]:user.weekly?.[periodKey])||{};
    const slides=Object.keys(period.slides||{}).length;
    const games=period.games||{};
    const playCounts=games.plays||{};
    const winCounts=games.wins||{};
    const totalPlays=Object.values(playCounts).reduce((total,count)=>total+Math.max(0,Number(count)||0),0);
    const totalWins=Object.values(winCounts).reduce((total,count)=>total+Math.max(0,Number(count)||0),0);
    if(quest.metric==='slides')return slides;
    if(quest.metric==='eggs')return Number(user.eggs?.[todayKey()]?.count||0);
    if(quest.metric==='eggDays')return Object.keys(period.eggDays||{}).length;
    if(quest.metric==='gamesPlayed')return totalPlays;
    if(quest.metric==='gamesWon')return Math.max(totalWins,daily&&domain?.gameWins?.[session.key]?.[periodKey]?1:0);
    if(quest.metric==='colorClashWins')return Number(winCounts.colorClash||0);
    if(quest.metric==='gameVariety')return Object.values(playCounts).filter(count=>Number(count)>0).length;
    return 0;
  }
  function questReward(quest,domain) {
    const reward=Number(quest.rewardKey?domain?.quests?.[quest.rewardKey]??quest.reward:quest.reward);
    return Number.isFinite(reward)&&reward>0?reward:quest.reward;
  }
  async function claimQuest(questId) {
    const quest=questDefinitions.find(item=>item.id===questId);
    if(!quest)return setStatus('That quest is unavailable.',true);
    const period=quest.periodType==='daily'?todayKey():weekKey();
    try {
      await mutateDomain(domain=>{
        domain.claims=domain.claims||{};
        domain.claims[session.key]=domain.claims[session.key]||{};
        if(domain.claims[session.key][quest.id]===period)throw new Error('You already claimed this quest for this period.');
        if(questProgress(quest,domain)<quest.goal)throw new Error('This quest is not complete yet.');
        const multiplier=activeMultiplier(domain);
        domain.points=domain.points||{};
        domain.points[session.key]=Number(domain.points[session.key]||0)+questReward(quest,domain)*multiplier;
        domain.claims[session.key][quest.id]=period;
        return domain;
      },'This quest is not ready to claim.');
      setStatus('Quest claimed: +'+(questReward(quest,state.domain)*activeMultiplier(state.domain))+' points.');
      renderNavigation();
    } catch(error) { setStatus('Could not claim this quest: '+error.message,true); }
  }
  async function findEgg(slideId) {
    try {
      await mutateDomain(domain=>{
        domain.activity=domain.activity||{};
        domain.activity[session.key]=domain.activity[session.key]||{};
        const user=domain.activity[session.key];
        user.eggs=user.eggs||{};
        const key=todayKey();user.eggs[key]=user.eggs[key]||{count:0,slides:{}};
        user.eggs[key].slides=user.eggs[key].slides||{};
        if(!user.eggs[key].slides[slideId]) {
          user.eggs[key].slides[slideId]=true;user.eggs[key].count=Object.keys(user.eggs[key].slides).length;
          user.weekly=dailySafe(user.weekly);
          const weekly=user.weekly[weekKey()]=user.weekly[weekKey()]||{};
          weekly.eggDays=weekly.eggDays||{};
          weekly.eggDays[key]=true;
        }
        return domain;
      });
      state.foundEggs.add(slideId);
      setStatus('You found an Easter egg! Claim your quest points.');
    } catch(error) { setStatus('Could not save this Easter egg: '+error.message,true); }
  }
  async function buyShopItem(item) {
    const preset=canonicalShopPreset(item.preset);
    const category=presets[preset]?.category;
    if(!category)return setStatus('That shop item is unavailable.',true);
    try {
      await mutateDomain(domain=>{
        domain.points=domain.points||{};
        const balance=Number(domain.points[session.key]||0);
        if(balance<Number(item.price||0))throw new Error('Not enough points for this item.');
        domain.points[session.key]=balance-Number(item.price||0);
        if(category==='inventory') {
          domain.inventory=domain.inventory||{};
          domain.inventory[session.key]=domain.inventory[session.key]||{};
          domain.inventory[session.key][preset]=Number(domain.inventory[session.key][preset]||0)+1;
          return domain;
        }
        if(category.startsWith('media-')) {
          const mediaCategory=mediaPassType(preset);
          domain.mediaPasses=domain.mediaPasses||{};
          domain.mediaPasses[session.key]=domain.mediaPasses[session.key]||{};
          const existing=domain.mediaPasses[session.key][mediaCategory];
          const duration=item.duration||'permanent';
          if(duration==='permanent'||existing?.permanent)domain.mediaPasses[session.key][mediaCategory]={permanent:true,expiresAt:0};
          else {
            const start=Math.max(Date.now(),Number(existing?.expiresAt)||0);
            domain.mediaPasses[session.key][mediaCategory]={permanent:false,expiresAt:start+(periods[duration]||periods.day)};
          }
          return domain;
        }
        domain.boosts=domain.boosts||{};
        domain.boosts[session.key]=domain.boosts[session.key]||{};
        const duration=item.duration||'day';
        const current=domain.boosts[session.key].quests;
        if(current?.permanent)throw new Error('You already have a permanent 2× quest boost.');
        const startsAt=Math.max(Date.now(),Number(current?.expiresAt)||0);
        domain.boosts[session.key].quests={permanent:false,expiresAt:startsAt+(periods[duration]||periods.day)};
        return domain;
      });
      setStatus(category==='inventory'?(presets[preset].label+' added to your inventory.'):category.startsWith('media-')?(presets[preset].label+' activated for '+durationLabel(item.duration)+'.'):'2× quest points activated for '+durationLabel(item.duration||'day')+'.');
      renderNavigation();
    } catch(error) { setStatus('Could not buy this item: '+error.message,true); }
  }
  async function removeShopItem(id) {
    if(!state.isOwner)return;
    try { await mutateDomain(domain=>{if(domain.shop)delete domain.shop[id];return domain;});setStatus('Shop item removed.'); }
    catch(error) { setStatus('Could not remove this item: '+error.message,true); }
  }
  function makeId() { return (globalThis.crypto?.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now()).replace(/[^a-zA-Z0-9_-]/g,'_'); }
  function scheduleAutoSave(delay=750) {
    clearTimeout(autoSaveTimer);
    if(!canEdit())return;
    autoSaveTimer=setTimeout(()=>ui.slideForm.requestSubmit(),delay);
  }
  async function saveSlide(event) {
    event?.preventDefault();
    if(!canEdit())return setStatus('You can only edit slides you own, unless you are the server owner.',true);
    if(savePromise) {
      await savePromise;
      if(hasUnsavedEditorChanges())return saveSlide();
      return;
    }
    const snapshot=editorSnapshot();
    const title=snapshot.title.trim();
    const type=snapshot.mediaType;
    const mediaUrl=snapshot.mediaUrl.trim();
    if(['image','music','video','youtube'].includes(type)&&!mediaUrl)return setStatus(type==='youtube'?'Enter a YouTube video URL.':'Choose a media file or enter an HTTPS media URL.',true);
    if(['image','music','video'].includes(type)&&mediaUrl.startsWith('data:')) {
      const expected=type==='image'?'image/':type==='music'?'audio/':'video/';
      const match=mediaUrl.match(/^data:([^;,]+);base64,/i);
      if(!match||!match[1].startsWith(expected)||mediaUrl.length>Math.ceil(maxSlideMediaBytes*4/3)+256)return setStatus('Choose a valid '+type+' file no larger than 6 MB.',true);
    } else if(['image','music','video','youtube'].includes(type)) {
      try {
        const parsedMediaUrl=new URL(mediaUrl);
        if(parsedMediaUrl.protocol!=='https:'||!parsedMediaUrl.hostname)return setStatus('Use a valid secure HTTPS media URL.',true);
      } catch(error) { return setStatus('Enter a valid secure HTTPS media URL.',true); }
    }
    if(type==='youtube'&&mediaUrl&&!youtubeEmbed(mediaUrl))return setStatus('Enter a valid YouTube video URL.',true);
    if(type==='teleport'&&!slideEntries().some(slide=>slide.id===snapshot.mediaTarget))return setStatus('Choose an existing slide as the teleport destination.',true);
    const id=state.editingSlide||makeId();
    const editingExistingSlide=slideEntries().some(slide=>slide.id===id);
    const revision=editorRevision;
    const body=snapshot.body.slice(0,4000);
    const speakerNotes=snapshot.notes.slice(0,2000);
    const titleBox={...snapshot.titleBox};
    const bodyBox={...snapshot.bodyBox};
    const mediaLayout=normalizeMediaLayout(snapshot.mediaLayout);
    const textBoxes=normalizeTextBoxes(snapshot.textBoxes);
    const mediaTarget=type==='teleport'?snapshot.mediaTarget:'';
    const teleportLabel=ui.teleportLabel.value.trim().slice(0,28);
    const teleportColor=ui.teleportColor.value;
    const backgroundColor=/^#[0-9a-f]{6}$/i.test(snapshot.backgroundColor)?snapshot.backgroundColor:'#19221c';
    const voiceChat=snapshot.voiceChat;
    clearTimeout(autoSaveTimer);
    ui.editorSaveState.textContent='Saving automatically…';
    let finishSave;
    savePromise=new Promise(resolve=>{finishSave=resolve;});
    let saved=false;
    try {
      await mutateDomain(domain=>{
        domain.slides=domain.slides||{};
        const old=domain.slides[id]||{};
        if(!state.isOwner&&old.authorKey&&old.authorKey!==session.key)throw new Error('You can only edit slides you created.');
        const requiredPass=mediaPassCategory(type);
        if(requiredPass&&(old.mediaType!==type||old.mediaUrl!==mediaUrl)&&!activeMediaPass(domain,requiredPass))throw new Error('Buy an active '+requiredPass+' pass before adding this media.');
        if(!editingExistingSlide) {
          if(state.pendingNewSlideId!==id)throw new Error('A slide creation pass is required.');
          domain.inventory=domain.inventory||{};
          domain.inventory[session.key]=domain.inventory[session.key]||{};
          const passes=Number(domain.inventory[session.key]['slide-pass']||0);
          if(passes<1)throw new Error('Buy a slide creation pass from the shop first.');
          domain.inventory[session.key]['slide-pass']=passes-1;
        } else if(!old.authorKey&&!state.isOwner)throw new Error('A slide creation pass is required.');
        if(voiceChat&&!old.voiceChat) {
          domain.inventory=domain.inventory||{};
          domain.inventory[session.key]=domain.inventory[session.key]||{};
          const connects=Number(domain.inventory[session.key]['voice-chat']||0);
          if(connects<1)throw new Error('Buy a voice chat connect from the shop first.');
          domain.inventory[session.key]['voice-chat']=connects-1;
        }
        domain.slides[id]={...old,id,authorKey:old.authorKey||session.key,title:title.slice(0,60),body,titleBox,bodyBox,textBoxes,mediaLayout,speakerNotes,fontSize:bodyBox.fontSize,textAlign:bodyBox.textAlign,bold:bodyBox.bold,italic:bodyBox.italic,mediaType:type,mediaUrl:type==='teleport'?'':mediaUrl,mediaTarget,teleportLabel,teleportColor,backgroundColor,voiceChat,order:old.order??Object.keys(domain.slides).length};
        domain.name=domain.name||((state.server.name||'Sektor')+' Slides');
        domain.ownerKey=state.server.ownerKey;
        return domain;
      });
      if(state.editingSlide===id)state.selectedSlide=id;
      saved=true;
    } catch(error) {
      ui.editorSaveState.textContent='Save failed';
      setStatus('Could not save the slide automatically: '+error.message,true);
    } finally {
      savePromise=null;
      finishSave();
    }
    if(!saved)return;
    if(state.pendingNewSlideId===id)state.pendingNewSlideId='';
    if(revision!==editorRevision) {
      ui.editorSaveState.textContent='Unsaved changes';
      return saveSlide();
    }
    ui.editorSaveState.textContent='Saved automatically';
    setStatus('Slide saved automatically.');
    renderNavigation();
    renderSlide(slideEntries().find(slide=>slide.id===state.selectedSlide)||slideEntries()[0]);
    ensureDailyEasterEgg();
  }
  async function deleteSlide() {
    const id=state.editingSlide;
    if(!id||!canEdit())return;
    if(hasUnsavedEditorChanges()) {
      clearTimeout(autoSaveTimer);
      await saveSlide();
    }
    try {
      await mutateDomain(domain=>{
        delete domain.slides?.[id];
        Object.values(domain.slides||{}).forEach(slide=>{if(slide.mediaTarget===id)slide.mediaTarget='';});
        return domain;
      });
      state.editingSlide='';
      state.selectedSlide=slideEntries()[0]?.id||'';
      ui.slideForm.reset();
      state.editingSlide=state.selectedSlide;
      renderAll(true);
      ensureDailyEasterEgg();
      setStatus('Slide deleted.');
    } catch(error) { setStatus('Could not delete the slide: '+error.message,true); }
  }
  async function createSlide() {
    if(slideEntries().length>=30)return setStatus('This Slides domain is full. A domain can have up to 30 slides.',true);
    if(!canCreateSlide())return setStatus('Buy a slide creation pass from the shop to add a slide.',true);
    if(hasUnsavedEditorChanges()) {
      clearTimeout(autoSaveTimer);
      await saveSlide();
      if(hasUnsavedEditorChanges())return;
    }
    const id=makeId();state.editingSlide=id;state.pendingNewSlideId=id;
    state.selectedSlide=id;
    ui.slideForm.reset();textBoxesDraft=[];mediaLayoutDraft={...defaultMediaLayout};titleBoxDraft=normalizeTextBoxLayout(null,{x:8,y:22,width:84,height:16,fontSize:48,textAlign:'left',bold:true,italic:false});bodyBoxDraft=normalizeTextBoxLayout(null,{x:8,y:34,width:78,height:47,fontSize:24,textAlign:'left',bold:false,italic:false});ui.mediaType.value='none';ui.mediaFile.value='';ui.fontSize.value='24';ui.textAlign.value='left';ui.slideBackgroundColor.value='#19221c';
    state.editingMode=true;state.selectedTab='browse';
    ui.deleteSlide.disabled=true;ui.insertPanel.hidden=false;renderTabs();renderAll(true);history=[editorSnapshot()];historyIndex=0;syncHistoryButtons();editorRevision++;ui.editorSaveState.textContent='Unsaved changes';scheduleAutoSave();ui.title.focus();
  }
  async function moveSlide(direction) {
    if(hasUnsavedEditorChanges()) {
      clearTimeout(autoSaveTimer);
      await saveSlide();
      if(hasUnsavedEditorChanges())return;
    }
    const slides=slideEntries();
    const index=slides.findIndex(slide=>slide.id===state.editingSlide);
    const target=index+direction;
    if(!state.isOwner||index<0||target<0||target>=slides.length)return;
    [slides[index],slides[target]]=[slides[target],slides[index]];
    try {
      await mutateDomain(domain=>{
        slides.forEach((slide,order)=>{domain.slides[slide.id].order=order;});
        return domain;
      });
      renderAll(true);
      setStatus('Slide order updated.');
    } catch(error) { setStatus('Could not reorder slides: '+error.message,true); }
  }
  function toggleInsertPanel() {
    ui.insertPanel.hidden=!ui.insertPanel.hidden;
    if(!ui.insertPanel.hidden)ui.mediaType.focus();
  }
  function editorSnapshot() {
    return {
      title:ui.title.value,body:ui.body.value,notes:ui.notes.value,mediaType:ui.mediaType.value,
      mediaUrl:ui.mediaUrl.value,mediaTarget:ui.mediaTarget.value,fontSize:ui.fontSize.value,
      textAlign:ui.textAlign.value,bold:ui.boldText.classList.contains('selected'),
      italic:ui.italicText.classList.contains('selected'),
      backgroundColor:ui.slideBackgroundColor.value,voiceChat:ui.voiceChat.checked,
      selectedTextBoxId,titleBox:{...titleBoxDraft},bodyBox:{...bodyBoxDraft},mediaLayout:{...normalizeMediaLayout(mediaLayoutDraft)},textBoxes:normalizeTextBoxes(textBoxesDraft)
    };
  }
  let history=[editorSnapshot()],historyIndex=0;
  function syncHistoryButtons() {
    $('undoEdit').disabled=historyIndex<=0;
    $('redoEdit').disabled=historyIndex>=history.length-1;
  }
  function markEditorChanged() {
    if(!canEdit())return;
    ui.editorSaveState.textContent='Unsaved changes';
    const snapshot=editorSnapshot();
    if(JSON.stringify(snapshot)===JSON.stringify(history[historyIndex]))return;
    editorRevision++;
    history=history.slice(0,historyIndex+1);
    history.push(snapshot);
    if(history.length>100)history.shift();
    historyIndex=history.length-1;
    syncHistoryButtons();
    if(ui.mediaType.value==='teleport')renderMediaPreview();
    scheduleAutoSave();
  }
  function applyHistory(index) {
    if(index<0||index>=history.length)return;
    historyIndex=index;
    const snapshot=history[index];
    ui.title.value=snapshot.title;ui.body.value=snapshot.body;ui.notes.value=snapshot.notes;
    titleBoxDraft=normalizeTextBoxLayout(snapshot.titleBox,{x:8,y:22,width:84,height:16,fontSize:48,textAlign:'left',bold:true,italic:false});
    bodyBoxDraft=normalizeTextBoxLayout(snapshot.bodyBox,{x:8,y:34,width:78,height:47,fontSize:24,textAlign:'left',bold:false,italic:false});
    document.querySelector('.editing-canvas').style.background=`radial-gradient(circle at 88% 14%, ${ui.slideBackgroundColor.value}88, transparent 30%), linear-gradient(145deg, ${ui.slideBackgroundColor.value}, #111612)`;
    ui.mediaType.value=snapshot.mediaType;ui.mediaUrl.value=snapshot.mediaUrl;
    mediaLayoutDraft=normalizeMediaLayout(snapshot.mediaLayout);
    ui.mediaTarget.value=snapshot.mediaTarget;ui.fontSize.value=snapshot.fontSize;
    ui.textAlign.value=snapshot.textAlign;
    renderTextBoxes(snapshot.textBoxes);
    if(snapshot.selectedTextBoxId&&findTextBox(snapshot.selectedTextBoxId)?.visible!==false)selectTextBox(snapshot.selectedTextBoxId);
    else selectFirstVisibleTextBox();
    ui.boldText.classList.toggle('selected',snapshot.bold);
    ui.italicText.classList.toggle('selected',snapshot.italic);
    ui.slideBackgroundColor.value=snapshot.backgroundColor||'#19221c';
    ui.voiceChat.checked=!!snapshot.voiceChat;
    ui.body.style.fontSize=bodyBoxDraft.fontSize+'px';ui.body.style.textAlign=bodyBoxDraft.textAlign;
    ui.body.style.fontWeight=bodyBoxDraft.bold?'700':'400';ui.body.style.fontStyle=bodyBoxDraft.italic?'italic':'normal';
    renderMediaTargets();
    ui.editorSaveState.textContent='Unsaved changes';
    editorRevision++;
    syncHistoryButtons();
    scheduleAutoSave();
  }
  async function addShopItem(event) {
    event.preventDefault();
    const preset=canonicalShopPreset(ui.shopPreset.value),price=Number(ui.shopPrice.value),duration=hasShopDuration(ui.shopPreset.value)?ui.shopDuration.value:'permanent';
    if(!state.isOwner||!presets[preset]||!Number.isFinite(price)||price<1)return setStatus('Enter a valid shop item and price.',true);
    if(hasShopDuration(preset)&&!['hour','day','week','month'].includes(duration))return setStatus('Choose a valid duration.',true);
    const id=makeId();
    try {
      await mutateDomain(domain=>{
        domain.shop=domain.shop||{};
        domain.shop[id]={preset,name:ui.shopName.value.trim().slice(0,40)||presets[preset].label,price,duration,createdAt:Date.now()};
        return domain;
      });
      ui.shopForm.reset();ui.shopPrice.value='250';setStatus('Shop item added.');
      state.shopFormOpen=false;renderNavigation();
    } catch(error) { setStatus('Could not add the shop item: '+error.message,true); }
  }
  async function saveQuestSettings(event) {
    event.preventDefault();
    if(!state.isOwner)return;
    const values={dailyVisit:Number(ui.dailyReward.value),easterEgg:Number(ui.eggReward.value),weeklyVisit:Number(ui.weeklyReward.value)};
    if(Object.values(values).some(value=>!Number.isFinite(value)||value<1))return setStatus('Quest rewards must be at least one point.',true);
    try { await mutateDomain(domain=>{domain.quests={...(domain.quests||{}),...values};return domain;});setStatus('Quest rewards saved.'); }
    catch(error) { setStatus('Could not save quest rewards: '+error.message,true); }
  }
  async function saveDomainSettings(event) {
    event.preventDefault();
    if(!state.isOwner)return;
    const name=ui.domainTitleInput.value.trim();
    if(!name)return setStatus('Enter a domain name.',true);
    try {
      await mutateDomain(domain=>{
        domain.name=name.slice(0,60);
        domain.description=ui.domainDescriptionInput.value.trim().slice(0,180);
        return domain;
      });
      setStatus('Domain details saved.');
    } catch(error) { setStatus('Could not save domain details: '+error.message,true); }
  }
  function hasUnsavedEditorChanges() {return /Unsaved|Saving|failed|attention/i.test(ui.editorSaveState.textContent);}
  function setTab(id) {
    if(id!=='browse')clearOwnCursor();
    if(id!=='browse')leaveSlideVoice();
    const keepEditing=state.editingMode&&(id==='games'||id==='shop'||id==='quests');
    state.selectedTab=id;state.editingMode=keepEditing;
    if(ui.fileMenuPanel)ui.fileMenuPanel.hidden=true;
    ui.fileMenuButton?.setAttribute('aria-expanded','false');
    renderNavigation();
    renderTabs();
    if(!state.editingMode&&id==='browse')renderSlide(slideEntries().find(slide=>slide.id===state.selectedSlide)||slideEntries()[0]);
    if(id==='games'||id==='shop'||id==='quests')$(id+'View').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function listenDomain(server) {
    if(state.domainRef&&state.domainHandler)state.domainRef.off('value',state.domainHandler);
    stopCursorPresence();
    leaveSlideVoice();
    state.server=server;
    state.remote=!!(db&&!server.localOnly);
    state.isOwner=server.ownerKey===session.key;
    const requestedTab=new URLSearchParams(location.search).get('tab');
    state.selectedTab=['games','shop','quests'].includes(requestedTab)?requestedTab:'browse';
    state.editingMode=state.isOwner&&state.selectedTab==='browse';
    state.eggBotRunKey='';
    state.starterGrantRunKey='';
    scheduleQuestRefresh();
    clearTimeout(autoSaveTimer);
    scheduleDailyEggRefresh();
    editorRevision=0;
    ui.editorSaveState.textContent='All changes saved';
    state.selectedSlide='';
    state.editingSlide='';
    state.pendingNewSlideId='';
    if(state.remote)startCursorPresence(server);
    if(state.remote) {
      state.domainRef=domainRef(server);
      state.domainHandler=snapshot=>{
        state.domain=snapshot.val()||blankDomain(server);
        const initializeDomain=!snapshot.exists()&&state.isOwner;
        if(initializeDomain)state.domainRef.set(state.domain).then(()=>{
          if(state.server===server){ensureStarterPoints(server);ensureDailyEasterEgg();}
        }).catch(error=>setStatus('Could not create the Slides domain: '+error.message,true));
        if(!state.selectedSlide)state.selectedSlide=slideEntries()[0]?.id||'';
        if(!state.editingSlide)state.editingSlide=state.selectedSlide;
        renderAll(!hasUnsavedEditorChanges());
        if(!initializeDomain){ensureStarterPoints(server);ensureDailyEasterEgg();}
      };
      state.domainRef.on('value',state.domainHandler,error=>setStatus('Could not load this Slides domain: '+error.message,true));
    } else {
      try {
        const domains=JSON.parse(localStorage.getItem('sektorSlidesLocal')||'{}');
        state.domain=domains[server.code]||blankDomain(server);
        if(!domains[server.code]&&state.isOwner){domains[server.code]=state.domain;localStorage.setItem('sektorSlidesLocal',JSON.stringify(domains));}
        state.selectedSlide=slideEntries()[0]?.id||'';
        state.editingSlide=state.selectedSlide;
        renderAll(true);
        ensureStarterPoints(server);
        ensureDailyEasterEgg();
      } catch(error) {setStatus('Could not load the local Slides domain: '+error.message,true);}
    }
    ui.workspace.hidden=false;ui.noServer.hidden=true;
  }
  async function selectEditorSlide(id) {
    if(id===state.editingSlide)return;
    if(hasUnsavedEditorChanges()) {
      clearTimeout(autoSaveTimer);
      await saveSlide();
      if(hasUnsavedEditorChanges())return;
    }
    state.selectedSlide=id;
    state.editingSlide=id;
    renderAll(true);
  }
  function populateServers(all) {
    const visible=all.filter(server=>server.ownerKey===session.key||joined.includes(server.code));
    const local=localServers.filter(server=>server.ownerKey===session.key||joined.includes(server.code));
    const merged=new Map(local.map(server=>[server.code,server]));
    visible.forEach(server=>merged.set(server.code,server));
    state.servers=[...merged.values()].filter(server=>server.code&&!/^TEST-/.test(server.code));
    ui.serverSelect.replaceChildren();
    state.servers.forEach(server=>{const option=document.createElement('option');option.value=server.code;option.textContent=server.name+' · '+server.code;ui.serverSelect.appendChild(option);});
    if(!state.servers.length){ui.workspace.hidden=true;ui.noServer.hidden=false;return;}
    const query=new URLSearchParams(location.search).get('server');
    const saved=localStorage.getItem('sektorSlidesServer');
    const selected=state.servers.find(server=>server.code===query)||state.servers.find(server=>server.code===saved)||state.servers[0];
    ui.serverSelect.value=selected.code;
    listenDomain(selected);
  }
  async function init() {
    if(!session?.key||!session?.username){ui.signedOut.hidden=false;return;}
    ui.accountName.textContent=session.username;
    ui.avatar.textContent=String(session.username||'?').slice(0,2).toUpperCase();
    if(session.avatar){const image=document.createElement('img');image.src=session.avatar;image.alt='';ui.avatar.replaceChildren(image);}
    if(!db){setStatus('Sektor online storage is unavailable. Local servers will still work.');}
    else {
      try {
        const snapshot=await db.ref('serverMeta').get();
        const all=Object.entries(snapshot.val()||{}).map(([code,server])=>({code,...server})).filter(server=>!server.bans?.[session.key]);
        populateServers(all);
      } catch(error) {
        console.error('[Sektor Slides] Could not load Sektor servers.',error);
        setStatus('Could not load server list: '+error.message,true);
        populateServers([]);
      }
    }
    if(!db)populateServers([]);
    document.querySelectorAll('.tab').forEach(button=>button.onclick=()=>setTab(button.dataset.tab));
    ui.ticTacToeJoin.onclick=joinTicTacToe;
    ui.ticTacToeReset.onclick=resetTicTacToe;
    ui.colorClashJoin.onclick=joinColorClash;
    ui.colorClashDraw.onclick=drawColorClashCard;
    ui.colorClashReset.onclick=resetColorClash;
    ui.promptPartyJoin.onclick=joinPromptParty;
    ui.promptPartyStart.onclick=startPromptPartyRound;
    ui.promptPartyAnswerForm.onsubmit=submitPromptPartyAnswer;
    ui.promptPartyReset.onclick=resetPromptParty;
    ui.serverSelect.onchange=async()=>{
      const selectedCode=ui.serverSelect.value;
      const server=state.servers.find(item=>item.code===selectedCode);
      if(!server)return;
      if(hasUnsavedEditorChanges()) {
        ui.serverSelect.value=state.server?.code||'';
        clearTimeout(autoSaveTimer);
        await saveSlide();
        if(hasUnsavedEditorChanges())return;
        ui.serverSelect.value=selectedCode;
      }
      localStorage.setItem('sektorSlidesServer',server.code);
      listenDomain(server);
    };
    ui.mediaType.onchange=()=>{
      if(previousMediaType!==ui.mediaType.value) {
        ui.mediaFile.value='';
        ui.mediaUrl.value='';
        previousMediaType=ui.mediaType.value;
      }
      renderMediaTargets();
      markEditorChanged();
    };
    ui.removeSlideMedia.onclick=()=>{
      if(!canEdit())return;
      ui.mediaType.value='none';
      ui.mediaUrl.value='';
      ui.mediaFile.value='';
      ui.mediaTarget.value='';
      previousMediaType='none';
      mediaLayoutDraft=normalizeMediaLayout(defaultMediaLayout);
      renderMediaTargets();
      markEditorChanged();
      setStatus('Media removed from this slide.');
    };
    ui.mediaFile.onchange=()=>{
      const file=ui.mediaFile.files?.[0];
      if(!file)return;
      const targetSlide=state.editingSlide;
      const selectedType=ui.mediaType.value;
      if(file.size>maxSlideMediaBytes) {
        ui.mediaFile.value='';
        return setStatus('Choose a media file no larger than 6 MB.',true);
      }
      const expected=selectedType==='image'?'image/':selectedType==='music'?'audio/':selectedType==='video'?'video/':'';
      if(!expected||!file.type.startsWith(expected)) {
        ui.mediaFile.value='';
        return setStatus('Choose a file that matches the selected media type.',true);
      }
      const reader=new FileReader();
      reader.onerror=()=>{
        if(state.editingSlide===targetSlide&&ui.mediaType.value===selectedType&&ui.mediaFile.files?.[0]===file)setStatus('Could not read the selected media file.',true);
      };
      reader.onload=()=>{
        if(state.editingSlide!==targetSlide||ui.mediaType.value!==selectedType||ui.mediaFile.files?.[0]!==file)return;
        if(typeof reader.result!=='string')return setStatus('The selected media file could not be read.',true);
        ui.mediaUrl.value=reader.result;
        mediaLayoutDraft=normalizeMediaLayout(mediaLayoutDraft);
        renderMediaPreview();
        markEditorChanged();
        setStatus(file.name+' added to the slide.');
      };
      reader.readAsDataURL(file);
    };
    $('newSlide').onclick=createSlide;
    ui.addSlideFromFilmstrip.onclick=createSlide;
    ui.slideForm.onsubmit=saveSlide;
    ui.deleteSlide.onclick=deleteSlide;
    ui.moveSlideUp.onclick=()=>moveSlide(-1);
    ui.moveSlideDown.onclick=()=>moveSlide(1);
    ui.insertMenuButton.onclick=toggleInsertPanel;
    ui.editPresentationButton.onclick=()=>{leaveSlideVoice();state.selectedTab='browse';state.editingMode=true;renderTabs();renderEditor(true);};
    ui.returnToPresent.onclick=()=>{state.selectedTab='browse';state.editingMode=false;renderTabs();renderSlide(slideEntries().find(slide=>slide.id===state.selectedSlide)||slideEntries()[0]);};
    ui.browseAddSlide.onclick=()=>{
      if(!canCreateSlide())return setStatus('Buy a slide creation pass in Domain shop to add a slide.',true);
      state.selectedTab='browse';state.editingMode=true;renderTabs();createSlide();
    };
    ui.addTextBox.onclick=()=>{
      if(!canEdit())return;
      const lastBox=textBoxesDraft.reduce((last,box)=>Math.max(last,box.y+box.height),40);
      const box={id:makeId(),text:'Text box',x:10,y:Math.min(80,lastBox+4),width:70,height:20,fontSize:Number(ui.fontSize.value)||24,textAlign:ui.textAlign.value,bold:ui.boldText.classList.contains('selected'),italic:ui.italicText.classList.contains('selected')};
      textBoxesDraft.push(box);
      renderTextBoxes(textBoxesDraft);
      selectTextBox(box.id);
      ui.textBoxLayer.querySelectorAll('.text-box').forEach(element=>{if(element.dataset.textBoxId===box.id)element.querySelector('textarea').focus();});
      markEditorChanged();
    };
    ui.editDomainDetails.onclick=()=>{ui.domainSettings.hidden=!ui.domainSettings.hidden;if(!ui.domainSettings.hidden)ui.domainTitleInput.focus();};
    const toggleFileMenu=()=>{
      if(!state.isOwner)return;
      if(!ui.fileMenuPanel) {
        ui.slideForm.requestSubmit();
        return;
      }
      ui.fileMenuPanel.hidden=!ui.fileMenuPanel.hidden;
      ui.fileMenuButton?.setAttribute('aria-expanded',String(!ui.fileMenuPanel.hidden));
    };
    if(ui.fileMenuButton)ui.fileMenuButton.onclick=toggleFileMenu;
    ui.fileMenuPanel?.querySelectorAll('[data-file-view]').forEach(button=>button.onclick=()=>{
      if(!state.isOwner)return;
      setTab(button.dataset.fileView);
    });
    ui.mediaUrl.oninput=()=>{renderMediaPreview();markEditorChanged();};
    ui.mediaTarget.onchange=()=>{renderMediaPreview();markEditorChanged();};
    ui.teleportLabel.oninput=()=>{renderMediaPreview();markEditorChanged();};
    ui.teleportColor.oninput=()=>{renderMediaPreview();markEditorChanged();};
    ui.slideBackgroundColor.oninput=()=>{
      const color=ui.slideBackgroundColor.value;
      document.querySelector('.editing-canvas').style.background=`radial-gradient(circle at 88% 14%, ${color}88, transparent 30%), linear-gradient(145deg, ${color}, #111612)`;
      markEditorChanged();
    };
    ui.voiceChat.onchange=()=>{renderMediaPreview();markEditorChanged();};
    ui.title.addEventListener('input',markEditorChanged);
    ui.body.addEventListener('input',markEditorChanged);
    ui.notes.addEventListener('input',markEditorChanged);
    ui.fontSize.onchange=()=>{
      if(!updateSelectedTextBox('fontSize',Number(ui.fontSize.value)))ui.body.style.fontSize=ui.fontSize.value+'px';
      markEditorChanged();
    };
    ui.textBoxWidth.oninput=()=>{
      const width=Number(ui.textBoxWidth.value);
      ui.textBoxWidthValue.value=width+'%';
      updateSelectedTextBox('width',width);
      markEditorChanged();
    };
    ui.textBoxHeight.oninput=()=>{
      const height=Number(ui.textBoxHeight.value);
      ui.textBoxHeightValue.value=height+'%';
      updateSelectedTextBox('height',height);
      markEditorChanged();
    };
    ui.textAlign.onchange=()=>{
      if(!updateSelectedTextBox('textAlign',ui.textAlign.value))ui.body.style.textAlign=ui.textAlign.value;
      markEditorChanged();
    };
    ui.boldText.onclick=()=>{
      ui.boldText.classList.toggle('selected');
      const bold=ui.boldText.classList.contains('selected');
      if(!updateSelectedTextBox('bold',bold))ui.body.style.fontWeight=bold?'700':'400';
      markEditorChanged();
    };
    ui.italicText.onclick=()=>{
      ui.italicText.classList.toggle('selected');
      const italic=ui.italicText.classList.contains('selected');
      if(!updateSelectedTextBox('italic',italic))ui.body.style.fontStyle=italic?'italic':'normal';
      markEditorChanged();
    };
    $('undoEdit').onclick=()=>applyHistory(historyIndex-1);
    $('redoEdit').onclick=()=>applyHistory(historyIndex+1);
    ui.slideForm.addEventListener('keydown',event=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
        event.preventDefault();applyHistory(historyIndex+(event.shiftKey?1:-1));
      }
    });
    document.querySelectorAll('[data-editor-menu]').forEach(button=>button.onclick=()=>{
      const menu=button.dataset.editorMenu;
      if(menu==='File')toggleFileMenu();
      else if(menu==='Edit')applyHistory(historyIndex-1);
      else if(menu==='View')setTab('browse');
      else if(menu==='Insert')toggleInsertPanel();
      else if(menu==='Slide')createSlide();
      else if(menu==='Format')ui.fontSize.focus();
      else if(menu==='Tools')ui.notes.focus();
    });
    ui.domainSettings.onsubmit=saveDomainSettings;
    ui.shopForm.onsubmit=addShopItem;
    ui.shopPreset.onchange=updateShopDurationVisibility;
    ui.playerListingForm.onsubmit=publishPlayerListing;
    ui.secretCodeForm.onsubmit=redeemSecretReward;
    ui.playerListingStock.oninput=updatePlayerListingStockCost;
    ui.playerListingType.onchange=()=>{
      const file=ui.playerListingFile.files?.[0];
      if(file&&!playerListingFileMatchesType(file,ui.playerListingType.value)) {
        ui.playerListingFile.value='';
        clearPlayerListingPreviewUrl();
      }
      updatePlayerListingPreview();
    };
    ui.playerListingFile.onchange=()=>{
      clearPlayerListingPreviewUrl();
      const file=ui.playerListingFile.files?.[0];
      if(!file)return updatePlayerListingPreview();
      if(file.size>maxSlideMediaBytes) {
        ui.playerListingFile.value='';
        updatePlayerListingPreview();
        return setStatus('Choose a media file no larger than 6 MB.',true);
      }
      if(!playerListingFileMatchesType(file,ui.playerListingType.value)) {
        ui.playerListingFile.value='';
        updatePlayerListingPreview();
        return setStatus('Choose a file that matches the selected listing type.',true);
      }
      playerListingPreviewUrl=URL.createObjectURL(file);
      updatePlayerListingPreview();
    };
    ui.openPlayerListingForm.onclick=()=>{
      ui.playerListingForm.hidden=false;
      updatePlayerListingStockCost();updatePlayerListingPreview();
      ui.playerListingName.focus();
    };
    $('cancelPlayerListing').onclick=()=>{clearPlayerListingPreviewUrl();ui.playerListingForm.reset();ui.playerListingStock.value='1';ui.playerListingPrice.value='50';updatePlayerListingStockCost();updatePlayerListingPreview();ui.playerListingForm.hidden=true;};
    ui.openShopForm.onclick=()=>{state.shopFormOpen=true;ui.shopForm.hidden=false;ui.shopName.focus();};
    ui.questSettings.onsubmit=saveQuestSettings;
    document.addEventListener('pointerdown',event=>{
      if(!event.target.closest('.file-menu')) {
        if(ui.fileMenuPanel)ui.fileMenuPanel.hidden=true;
        ui.fileMenuButton?.setAttribute('aria-expanded','false');
      }
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden')clearOwnCursor();
      if(document.visibilityState==='hidden'&&hasUnsavedEditorChanges()) {
        clearTimeout(autoSaveTimer);
        ui.slideForm.requestSubmit();
      }
    });
    document.addEventListener('pointermove',publishCursor,{passive:true});
    window.addEventListener('pagehide',()=>{
      stopCursorPresence();
      leaveSlideVoice();
      if(hasUnsavedEditorChanges()) {
        clearTimeout(autoSaveTimer);
        ui.slideForm.requestSubmit();
      }
    });
    renderTabs();
  }
  init();
})();
