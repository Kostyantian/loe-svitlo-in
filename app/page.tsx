'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface MenuItem {
  '@id': string;
  '@type': string;
  id: number;
  name: string;
  slug?: string;
  orders: number;
  children: MenuItem[];
  menu?: string;
  imageUrl?: string;
  description?: string;
  rawHtml?: string;
  rawMobileHtml?: string;
  parent?: string;
}

interface MenuResponse {
  '@context': string;
  '@id': string;
  '@type': string;
  'hydra:member': Array<{
    '@id': string;
    '@type': string;
    id: number;
    name: string;
    type: string;
    menuItems: MenuItem[];
  }>;
}

interface MenuData {
  desktopImageUrl: string;
  mobileImageUrl: string;
  desktopHtml: string;
  mobileHtml: string;
  archiveLength: number;
}

export default function Home() {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousArchiveLengthRef = useRef<number | null>(null);

  useEffect(() => {
    // Створення звукового елементу
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiH0fPTgjMGHm7A7+OZURE');

    // Запит на дозвіл для сповіщень
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }

    // Реєстрація Service Worker для PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }

    // Перевірка чи це мобільний пристрій
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.error('Error playing sound:', err));
    }
  };

  const showNotification = useCallback((title: string, body: string) => {
    if (notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'schedule-update',
      });
    }
  }, [notificationPermission]);

  const fetchLatestImage = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/menus');

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data: MenuResponse = await response.json();

      if (data['hydra:member'] && data['hydra:member'].length > 0) {
        const menu = data['hydra:member'][0];

        if (menu.menuItems && menu.menuItems.length > 0) {
          // Знайти елемент "Arhiv" для перевірки змін
          const archiveItem = menu.menuItems.find(item => item.name === 'Arhiv');
          const archiveLength = archiveItem ? archiveItem.children.length : 0;

          // Взяти перший елемент (Today)
          const todayItem = menu.menuItems[0];

          if (todayItem.imageUrl && todayItem.slug) {
            const newMenuData: MenuData = {
              desktopImageUrl: todayItem.imageUrl,
              mobileImageUrl: todayItem.slug,
              desktopHtml: todayItem.rawHtml || '',
              mobileHtml: todayItem.rawMobileHtml || '',
              archiveLength,
            };

            // Перевірка чи змінилася довжина архіву
            if (previousArchiveLengthRef.current !== null &&
                previousArchiveLengthRef.current !== archiveLength) {
              // Графік змінився!
              playNotificationSound();
              showNotification(
                'Графік відключень оновлено!',
                'З\'явився новий графік погодинних відключень електроенергії.'
              );
            }

            // Оновлення попереднього значення
            previousArchiveLengthRef.current = archiveLength;
            setMenuData(newMenuData);
          }
        }
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    // Перший запит при завантаженні
    fetchLatestImage();

    // Запит кожні 10 хвилин (600000 мс)
    const interval = setInterval(() => {
      fetchLatestImage();
    }, 600000);

    // Очищення інтервалу при розмонтуванні компонента
    return () => clearInterval(interval);
  }, []);

  const currentImageUrl = isMobile ? menuData?.mobileImageUrl : menuData?.desktopImageUrl;
  const currentHtml = isMobile ? menuData?.mobileHtml : menuData?.desktopHtml;

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-8 py-8 px-4 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50 text-center">
          Графік відключень електроенергії
        </h1>

        {notificationPermission === 'default' && (
          <div className="w-full bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 text-center mb-2">
              Дозвольте сповіщення, щоб отримувати повідомлення про оновлення графіку
            </p>
            <button
              onClick={requestNotificationPermission}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
            >
              Дозволити сповіщення
            </button>
          </div>
        )}

        {loading && (
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Завантаження...
          </p>
        )}

        {error && (
          <p className="text-lg text-red-600 dark:text-red-400">
            Помилка: {error}
          </p>
        )}

        {!loading && !error && menuData && currentImageUrl && (
          <div className="w-full flex flex-col items-center gap-6">
            <img
              src={`https://api.loe.lviv.ua${currentImageUrl}`}
              alt="Графік відключень"
              className="w-full h-auto rounded-lg shadow-lg"
            />

            {currentHtml && (
              <div
                className="w-full text-zinc-800 dark:text-zinc-200 text-sm md:text-base text-center"
                dangerouslySetInnerHTML={{ __html: currentHtml }}
              />
            )}

            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Оновлюється автоматично кожні 10 хвилин
            </p>

            {menuData.archiveLength > 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Графіків в архіві: {menuData.archiveLength}
              </p>
            )}
          </div>
        )}

        {!loading && !error && !menuData && (
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Дані не знайдено
          </p>
        )}
      </main>
    </div>
  );
}
