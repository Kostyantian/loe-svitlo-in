'use client';

import { useEffect, useState } from 'react';

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
}

export default function Home() {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
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

  const fetchLatestImage = async () => {
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
          // Взяти перший елемент (Today)
          const todayItem = menu.menuItems[0];

          if (todayItem.imageUrl && todayItem.slug) {
            setMenuData({
              desktopImageUrl: todayItem.imageUrl,
              mobileImageUrl: todayItem.slug,
              desktopHtml: todayItem.rawHtml || '',
              mobileHtml: todayItem.rawMobileHtml || '',
            });
          }
        }
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-8 py-8 px-4 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50 text-center">
          Графік відключень електроенергії
        </h1>

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
