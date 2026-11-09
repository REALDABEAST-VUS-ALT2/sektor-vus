const CACHE_NAME='gardenfall-offline-v20261109-upgrade-visual-fix-1';
const APP_FILES=[
  './garden-siege.html?v=20261109-upgrade-visual-fix-1',
  './garden-siege.css?v=20261109-upgrade-visual-fix-1',
  './garden-siege.js?v=20261109-upgrade-visual-fix-1',
  './garden-auth.js?v=20261109-upgrade-visual-fix-1',
  './vendor/three.core.js',
  './vendor/three.module.js',
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(APP_FILES))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith('gardenfall-offline-')&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data&&event.data.type==='CLEAR_GARDEN_CACHE'){
    event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('gardenfall-offline-')).map(key=>caches.delete(key)))));
  }
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  const pathname=new URL(request.url).pathname;
  const assetMatch=/\/(garden-siege(?:\.html|\.css|\.js|-sw\.js)|garden-auth\.js|vendor\/three\.(?:core|module)\.js)(?:\?.*)?$/.test(pathname);
  if(!assetMatch)return;
  const isLocalDev=self.location.hostname==='localhost'||self.location.hostname==='127.0.0.1'||self.location.hostname.endsWith('.app.github.dev');
  if(isLocalDev){
    event.respondWith(fetch(request,{cache:'no-store'}));
    return;
  }
  event.respondWith((async()=>{
    if(request.mode==='navigate'){
      try{
        const network=await fetch(request,{cache:'no-store'});
        return network;
      }catch(error){
        return caches.match('./garden-siege.html?v=20261109-upgrade-visual-fix-1') || caches.match('./garden-siege.html') || Response.error();
      }
    }
    const cached=await caches.match(request,{ignoreSearch:false});
    if(cached)return cached;
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone());}
      return response;
    }catch(error){return cached||Response.error();}
  })());
});
