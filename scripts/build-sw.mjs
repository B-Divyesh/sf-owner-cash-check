import { createHash } from 'node:crypto';
import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve('dist');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => entry.isDirectory() ? filesIn(join(directory, entry.name)) : [join(directory, entry.name)]));
  return files.flat();
}

const files = (await filesIn(root))
  .map((file) => `/${relative(root, file).replaceAll('\\\\', '/')}`)
  .filter((file) => file !== '/sw.js' && !file.endsWith('.map'))
  .sort();
const hash = createHash('sha256').update(files.join('|')).digest('hex').slice(0, 10);
const source = `const VERSION='occ-${hash}';
const SHELL=VERSION+'-shell';
const ASSETS=VERSION+'-assets';
const PRECACHE=${JSON.stringify(files)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(PRECACHE)))});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>![SHELL,ASSETS].includes(key)).map(key=>caches.delete(key)))),self.clients.claim()]))});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==location.origin)return;if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(SHELL).then(cache=>cache.put(request,copy));return response}).catch(async()=>{const exact=await caches.match(request,{ignoreVary:true});if(exact)return exact;if(url.pathname.startsWith('/privacy'))return caches.match('/privacy/index.html');if(url.pathname.startsWith('/terms'))return caches.match('/terms/index.html');return(await caches.match('/index.html'))||(await caches.match('/offline.html'))}));return}event.respondWith(caches.match(request,{ignoreVary:true}).then(cached=>cached||fetch(request).then(response=>{if(response.ok)caches.open(ASSETS).then(cache=>cache.put(request,response.clone()));return response})))});`;
await writeFile(join(root, 'sw.js'), source);
console.log(`service worker occ-${hash}: precached ${files.length} files`);
