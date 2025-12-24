// ВАЖЛИВО: Збільшуйте версію при кожному оновленні коду!
const CACHE_VERSION = 'v11';
const APP_VERSION = '1.0.11'; // Версія додатку для відображення користувачу
const CACHE_NAME = `loe-widget-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Зберігаємо попередній стан для порівняння
let previousScheduleHash = null;
let previousArchiveHash = null;

// Функція для створення хешу графіка
function createScheduleHash(todayItem, tomorrowItem) {
  const todayHash = todayItem
    ? `T:${todayItem.imageUrl || ''}|${todayItem.slug || ''}|${todayItem.description || ''}`
    : 'T:empty';
  const tomorrowHash = tomorrowItem
    ? `TM:${tomorrowItem.imageUrl || ''}|${tomorrowItem.slug || ''}|${tomorrowItem.description || ''}`
    : 'TM:empty';
  return `${todayHash}::${tomorrowHash}`;
}

// Функція для створення хешу архіву
function createArchiveHash(archiveChildren) {
  if (!archiveChildren || archiveChildren.length === 0) {
    return 'ARCHIVE:empty';
  }
  return archiveChildren
    .map(item => `${item.id}:${item.imageUrl || ''}:${item.slug || ''}`)
    .join('|');
}

// Перевірка оновлень графіків
async function checkForUpdates() {
  try {
    console.log('[SW] 🔍 Перевірка оновлень графіків...');
    
    // Перевірка дозволу на сповіщення
    const permission = await self.registration.pushManager?.permissionState?.({ userVisibleOnly: true }) || Notification.permission;
    console.log('[SW] 🔔 Дозвіл на сповіщення:', permission);
    
    // Використовуємо локальний API проксі замість прямого запиту (уникаємо CORS)
    const response = await fetch('/api/menus', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.log('[SW] ❌ Помилка отримання даних:', response.status);
      return;
    }

    const data = await response.json();
    
    if (data['hydra:member'] && data['hydra:member'].length > 0) {
      const menu = data['hydra:member'][0];
      
      if (menu.menuItems && menu.menuItems.length > 0) {
        const todayItem = menu.menuItems.find(item => item.name === 'Today');
        const tomorrowItem = menu.menuItems.find(item => item.name === 'Tomorrow');
        const archiveItem = menu.menuItems.find(item => item.name === 'Arhiv');
        
        const currentScheduleHash = createScheduleHash(todayItem, tomorrowItem);
        const currentArchiveHash = createArchiveHash(archiveItem ? archiveItem.children : []);
        
        console.log('[SW] 📊 Стан хешів:', {
          previousSchedule: previousScheduleHash,
          currentSchedule: currentScheduleHash,
          scheduleChanged: previousScheduleHash !== currentScheduleHash,
          previousArchive: previousArchiveHash,
          currentArchive: currentArchiveHash,
          archiveChanged: previousArchiveHash !== currentArchiveHash
        });
        
        // Перевірка змін графіка
        if (previousScheduleHash !== null && previousScheduleHash !== currentScheduleHash) {
          console.log('[SW] 🔔 ГРАФІК ЗМІНИВСЯ! Відправка сповіщення');
          
          // Відправка сповіщення всім клієнтам
          const clients = await self.clients.matchAll({ type: 'window' });
          console.log('[SW] 📱 Знайдено клієнтів:', clients.length);
          clients.forEach(client => {
            client.postMessage({
              type: 'SCHEDULE_CHANGED',
              scheduleHash: currentScheduleHash
            });
          });
          
          // Показати системне сповіщення
          console.log('[SW] 🔔 Показую системне сповіщення про графік');
          await self.registration.showNotification('Графік відключень оновлено!', {
            body: 'З\'явився новий графік погодинних відключень електроенергії.',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'schedule-update',
            requireInteraction: false,
            vibrate: [200, 100, 200],
          });
          console.log('[SW] ✅ Системне сповіщення показано');
        } else if (previousScheduleHash === null) {
          console.log('[SW] ℹ️ Перше завантаження графіка - ініціалізація хешу');
        } else {
          console.log('[SW] ✅ Графік не змінився');
        }
        
        // Перевірка змін архіву
        if (previousArchiveHash !== null && previousArchiveHash !== currentArchiveHash) {
          console.log('[SW] 🔔 АРХІВ ЗМІНИВСЯ! Відправка сповіщення');
          
          // Відправка сповіщення всім клієнтам
          const clients = await self.clients.matchAll({ type: 'window' });
          console.log('[SW] 📱 Знайдено клієнтів:', clients.length);
          clients.forEach(client => {
            client.postMessage({
              type: 'ARCHIVE_CHANGED',
              archiveHash: currentArchiveHash
            });
          });
          
          // Показати системне сповіщення
          console.log('[SW] 🔔 Показую системне сповіщення про архів');
          await self.registration.showNotification('Архів графіків оновлено!', {
            body: 'Зміни в архіві графіків відключень. Перевірте оновлення.',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'archive-update',
            requireInteraction: false,
            vibrate: [200, 100, 200],
          });
          console.log('[SW] ✅ Системне сповіщення показано');
        } else if (previousArchiveHash === null) {
          console.log('[SW] ℹ️ Перше завантаження архіву - ініціалізація хешу');
        } else {
          console.log('[SW] ✅ Архів не змінився');
        }
        
        // Оновлюємо збережені хеші
        previousScheduleHash = currentScheduleHash;
        previousArchiveHash = currentArchiveHash;
        
        console.log('[SW] ✅ Перевірка завершена, хеші оновлено:', {
          schedule: previousScheduleHash?.substring(0, 50),
          archive: previousArchiveHash?.substring(0, 50)
        });
      }
    }
  } catch (error) {
    console.error('[SW] ❌ Помилка перевірки оновлень:', error);
  }
}

// Запускаємо періодичну перевірку кожну хвилину (60000 мс)
setInterval(() => {
  console.log('[SW] ⏰ Автоматична перевірка в SW');
  checkForUpdates();
}, 60000);

// Перша перевірка при запуску SW
checkForUpdates();

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

  // Ігноруємо запити до chunk файлів Next.js та HMR
  if (
    url.pathname.includes('/_next/') ||
    url.pathname.includes('/static/') ||
    url.pathname.includes('.chunk.js') ||
    url.pathname.includes('.hot-update.') ||
    url.pathname.includes('webpack')
  ) {
    // Просто пропускаємо ці запити, не обробляємо їх
    return;
  }

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

  // Для статичних файлів PWA - спочатку мережа, потім кеш
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Кешуємо тільки GET запити з успішною відповіддю
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Якщо мережа недоступна - беремо з кешу (тільки для GET)
        if (event.request.method === 'GET') {
          return caches.match(event.request);
        }
        // Для інших методів повертаємо помилку
        return new Response('Network error', { status: 503 });
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
      requireInteraction: false,
      vibrate: [200, 100, 200],
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
