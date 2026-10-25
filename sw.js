/* MOSAICO · Service worker: deixa o app instalável e abre as páginas mesmo com a internet oscilando.
   Sempre tenta a rede primeiro (a versão publicada vale); só usa a cópia guardada quando a rede falha.
   Firebase e outros endereços externos passam direto, sem cópia. */
const CACHE = 'mosaico-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', ev => ev.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  ev.respondWith((async () => {
    try {
      const resp = await fetch(req);
      if (resp.ok && resp.type === 'basic') { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {}); }
      return resp;
    } catch (erro) {
      const guardada = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (guardada) return guardada;
      throw erro;
    }
  })());
});
