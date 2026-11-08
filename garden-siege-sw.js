const CACHE_NAME='gardenfall-offline-v8';
const APP_FILES=[
  './garden-siege.html',
  './garden-siege.css',
  './garden-siege.js',
  './garden-auth.js',
  './vendor/three.core.js',
  './vendor/three.module.js',
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('gardenfall-offline-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  const pathname=new URL(request.url).pathname;
  if(!/\/(garden-siege(?:\.html|\.css|\.js|-sw\.js)|garden-auth\.js|vendor\/three\.(?:core|module)\.js)$/.test(pathname))return;
  event.respondWith((async()=>{
    const cached=await caches.match(request,{ignoreSearch:true});
    if(cached&&request.destination!=='document')return cached;
    try{
      const response=await fetch(request);
      if(response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone());}
      return response;
    }catch(error){return cached||Response.error();}
  })());
});
