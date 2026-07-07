const CACHE_NAME = 'lunch-tracker-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// HTML 문서(페이지 자체)는 네트워크 우선: 온라인이면 항상 최신 파일을 받아오고,
// 오프라인일 때만 캐시로 폴백. 이렇게 해야 배포 후 바로 최신 버전이 반영됨.
// 그 외 정적 자산(아이콘, 매니페스트 등)은 기존처럼 캐시 우선으로 빠르게 서빙.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHTML = req.mode === 'navigate' ||
    (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));

  if (isHTML) {
    event.respondWith(
      fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
