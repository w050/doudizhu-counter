/**
 * 斗地主手动记牌器 - Service Worker
 *
 * 策略：
 * 1. 安装时预缓存应用外壳（HTML、manifest、SVG 图标）。
 * 2. 页面导航使用“网络优先”，断网时回退到缓存的 index.html。
 * 3. 同源静态资源使用“缓存优先 + 后台更新”，加快二次打开速度。
 * 4. 激活时清理旧版本缓存。
 *
 * 修改 index.html / manifest.json / sw.js 后，请递增 CACHE_VERSION，
 * 让浏览器安装新的 Service Worker 并清理旧缓存。
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `doudizhu-counter-${CACHE_VERSION}`;

// 离线打开所需的核心文件。
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg'
];

// 生成 PNG 后会被一并缓存；尚未生成时 404 不会导致安装失败。
const OPTIONAL_ASSETS = [
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/**
 * 安装：预缓存核心文件，并尝试缓存 PNG 图标。
 * allSettled 保证即使图标还未生成，Service Worker 也能安装成功。
 */
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);
      await Promise.allSettled(OPTIONAL_ASSETS.map(url => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

/**
 * 激活：删除旧版本缓存，并立即接管当前页面。
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

/**
 * 请求拦截。
 */
self.addEventListener('fetch', event => {
  const { request } = event;

  // 只处理同源 GET 请求，避免干扰第三方请求或写操作。
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：优先请求网络，断网时回退到本地缓存。
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // 静态资源：优先使用缓存，同时后台更新。
  event.respondWith(handleAsset(request));
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);

    // 成功响应才更新离线入口，避免缓存错误页。
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('./index.html', response.clone());
    }

    return response;
  } catch (error) {
    const cachedPage =
      (await caches.match('./index.html')) ||
      (await caches.match('./'));

    if (cachedPage) return cachedPage;

    return new Response(
      '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>离线</title><body style="font-family:sans-serif;padding:24px"><h1>当前处于离线状态</h1><p>页面尚未缓存，请联网后再试。</p></body></html>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

async function handleAsset(request) {
  const cachedResponse = await caches.match(request);

  // 命中缓存时立即返回，并在后台拉取最新版本。
  if (cachedResponse) {
    fetch(request)
      .then(async response => {
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response);
        }
      })
      .catch(() => {
        // 离线时忽略后台更新失败。
      });

    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    return new Response('离线状态下该资源不可用。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
