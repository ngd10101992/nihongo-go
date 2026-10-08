/**
 * Service worker: cho phép dùng app offline sau lần mở đầu tiên.
 *
 *  - Phần khung app (HTML, JS, CSS, icon): ưu tiên mạng để luôn có bản mới; mất mạng thì dùng bản đã lưu.
 *  - Dữ liệu (data/…?v=…) và font chữ: lấy từ bộ nhớ nếu đã có (dữ liệu đổi thì ?v= đổi theo).
 *
 * Đổi SHELL_VERSION khi muốn xóa toàn bộ bộ nhớ cũ.
 */
const SHELL_VERSION = 'tango-v2';
const SHELL_CACHE = `${SHELL_VERSION}-shell`;
const DATA_CACHE = `${SHELL_VERSION}-data`;   // app.js cũng ghi vào cache này (OFFLINE_DATA_CACHE)

const SHELL_FILES = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './data/levels.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_FILES.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(SHELL_VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Mạng trước, mất mạng thì dùng bộ nhớ
async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    // no-cache: luôn hỏi lại máy chủ (GitHub Pages cho phép giữ file cũ 10 phút) để nhận bản mới ngay.
    // Tạo Request mới từ URL vì yêu cầu mở trang (mode "navigate") không cho thêm tùy chọn.
    const res = await fetch(new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' }));
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request, { ignoreSearch: request.mode === 'navigate' })) || Response.error();
  }
}

// Bộ nhớ trước, chưa có thì tải và lưu lại
async function cacheFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isData = url.origin === self.location.origin && url.pathname.includes('/data/') && url.searchParams.has('v');
  if (isFont || isData) { event.respondWith(cacheFirst(request)); return; }
  if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
});
