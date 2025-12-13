// ВАЖЛИВО: Збільшуйте версію при кожному оновленні коду!
const CACHE_VERSION = 'v4';
const APP_VERSION = '1.0.4'; // Версія додатку для відображення користувачу
const CACHE_NAME = `loe-widget-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  console.log('[SW] Встановлення нової версії:', CACHE_VERSION, 'App:', APP_VERSION);
  event.waitUntil(
    (async () => {
      // Видалити всі старі кеші перед встановленням нового
      const cacheNames = await caches.keys();
      console.log('[SW] Видалення всіх старих кешів при встановленні:', cacheNames);
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Видалено старий кеш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      // Створити новий кеш
      const cache = await caches.open(CACHE_NAME);
      console.log('[SW] Кешування файлів для нової версії');
      await cache.addAll(urlsToCache);

      // Повідомити всі клієнти про нову версію
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'NEW_VERSION',
          version: APP_VERSION,
          cacheVersion: CACHE_VERSION
        });
      });
    })()
  );
  // Примусово активувати новий Service Worker негайно
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // НЕ кешувати API запити - завжди брати свіжі дані
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Немає з\'єднання з інтернетом' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Для статичних файлів - спочатку мережа, потім кеш
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Кешуємо успішну відповідь
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Якщо мережа недоступна - беремо з кешу
        return caches.match(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Активація нової версії:', CACHE_VERSION, 'App:', APP_VERSION);
  event.waitUntil(
    (async () => {
      // Видалити всі старі кеші
      const cacheNames = await caches.keys();
      console.log('[SW] Активація - видалення старих кешів:', cacheNames);
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Видалено старий кеш при активації:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );

      // Одразу взяти контроль над всіма сторінками
      await self.clients.claim();

      // Примусово перезавантажити всі відкриті сторінки
      const clients = await self.clients.matchAll({ type: 'window' });
      console.log('[SW] Перезавантаження клієнтів після активації:', clients.length);
      clients.forEach(client => {
        console.log('[SW] Відправка команди перезавантаження клієнту');
        client.postMessage({
          type: 'FORCE_RELOAD',
          version: APP_VERSION,
          cacheVersion: CACHE_VERSION
        });
      });
    })()
  );
});

// Обробка notification через Service Worker (для Android)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Показ notification через Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag } = event.data;
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction: true, // Показувати до закриття користувачем
      silent: false, // НЕ тихий режим - з звуком системним
      vibrate: [200, 100, 200, 100, 200], // Вібрація для мобільних
      timestamp: Date.now(), // Час сповіщення
      dir: 'ltr',
      lang: 'uk',
      // Дані для кліку
      data: {
        url: '/',
        timestamp: Date.now()
      }
    });
  }

  // Повернути поточну версію при запиті
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: APP_VERSION,
      cacheVersion: CACHE_VERSION
    });
  }
});
