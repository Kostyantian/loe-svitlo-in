'use client';

import { useEffect, useState, useRef } from 'react';

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
  isShowingTomorrow?: boolean;
  hasTomorrowSchedule?: boolean;
  tomorrowDesktopImageUrl?: string;
  tomorrowMobileImageUrl?: string;
}

export default function Home() {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [appVersion, setAppVersion] = useState<string>('');
  const previousArchiveLengthRef = useRef<number | null>(null);
  const previousScheduleHashRef = useRef<string | null>(null);
  const previousArchiveHashRef = useRef<string | null>(null);
  const swUpdateCheckRef = useRef<boolean>(false);

  useEffect(() => {
    // Запит на дозвіл для сповіщень
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      console.log('🔔 Поточний дозвіл на notifications:', currentPermission);
      setNotificationPermission(currentPermission);
    }

    // Реєстрація Service Worker для PWA з автоматичним оновленням
    if ('serviceWorker' in navigator) {
      // Обробка повідомлень від Service Worker
      const handleSWMessage = (event: MessageEvent) => {
        console.log('📨 Повідомлення від SW:', event.data);

        if (event.data.type === 'NEW_VERSION') {
          console.log('🆕 Нова версія доступна:', event.data.version);
          setAppVersion(event.data.version);
        }

        if (event.data.type === 'FORCE_RELOAD') {
          console.log('🔄 SW вимагає перезавантаження!');
          // Примусове перезавантаження без підтвердження
          setTimeout(() => {
            console.log('🔄 Виконую примусове перезавантаження...');
            window.location.reload();
          }, 1000);
        }

        // Обробка сповіщень про зміни від SW
        if (event.data.type === 'SCHEDULE_CHANGED') {
          console.log('🔔 SW повідомив про зміну графіка!');
          // Оновлюємо дані
          fetchLatestImage();
        }

        if (event.data.type === 'ARCHIVE_CHANGED') {
          console.log('🔔 SW повідомив про зміну архіву!');
          // Оновлюємо дані
          fetchLatestImage();
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSWMessage);

      // Скасування старого SW та реєстрація нового
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        console.log('🔍 Знайдено SW реєстрацій:', registrations.length);

        // Видалити всі старі реєстрації
        Promise.all(
          registrations.map((registration) => {
            console.log('🗑️ Видалення старої реєстрації SW');
            return registration.unregister();
          })
        ).then(() => {

          // Реєстрація нового Service Worker
          navigator.serviceWorker
            .register('/sw.js', { updateViaCache: 'none' })
            .then((registration) => {

              // Перевірка оновлень кожні 30 секунд
              setInterval(() => {
                console.log('🔄 Перевірка оновлень SW...');
                registration.update();
              }, 30000);

              // Автоматичне оновлення при виявленні нової версії
              registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;


                if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {


                      if (navigator.serviceWorker.controller) {
                        // Є старий SW - оновлюємо

                        if (!swUpdateCheckRef.current) {
                          swUpdateCheckRef.current = true;
                          setTimeout(() => {
                            console.log('🔄 Автоматичне перезавантаження...');
                            window.location.reload();
                          }, 2000);
                        }
                      } else {
                        // Перше встановлення
                        console.log('✅ Перше встановлення SW');
                      }
                    }
                  });
                }
              });

              // Отримати версію від SW
              return navigator.serviceWorker.ready;
            })
            .then((registration) => {
              console.log('✅ Service Worker готовий та активний');

              // Запит поточної версії
              if (registration.active) {
                const messageChannel = new MessageChannel();
                messageChannel.port1.onmessage = (event) => {
                  console.log('📦 Отримано версію від SW:', event.data);
                  if (event.data.version) {
                    setAppVersion(event.data.version);
                  }
                };
                registration.active.postMessage(
                  { type: 'GET_VERSION' },
                  [messageChannel.port2]
                );
              }
            })
            .catch((err) => console.error('❌ Помилка реєстрації SW:', err));
        });
      }).catch((err) => console.error('❌ Помилка отримання SW реєстрацій:', err));
    }

    // Перевірка чи це мобільний пристрій
    const checkMobile = () => {
      const width = window.innerWidth;
      const isMobileDevice = width < 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createScheduleHash = (todayItem: MenuItem | undefined, tomorrowItem: MenuItem | undefined) => {
    // Створюємо унікальний хеш на основі ключових полів графіків
    const todayHash = todayItem
      ? `T:${todayItem.imageUrl || ''}|${todayItem.slug || ''}|${todayItem.description || ''}`
      : 'T:empty';
    const tomorrowHash = tomorrowItem
      ? `TM:${tomorrowItem.imageUrl || ''}|${tomorrowItem.slug || ''}|${tomorrowItem.description || ''}`
      : 'TM:empty';
    return `${todayHash}::${tomorrowHash}`;
  };

  const createArchiveHash = (archiveChildren: MenuItem[]) => {
    // Створюємо хеш на основі всіх елементів архіву
    if (!archiveChildren || archiveChildren.length === 0) {
      return 'ARCHIVE:empty';
    }
    return archiveChildren
      .map(item => `${item.id}:${item.imageUrl || ''}:${item.slug || ''}`)
      .join('|');
  };

  const showNotification = async (title: string, body: string) => {
    console.log('🔔 Спроба показати notification...');
    console.log('🔔 Дозвіл на notifications:', notificationPermission);

    if (notificationPermission === 'granted') {
      try {
        // Спробувати використати Service Worker (краще для Android)
        if ('serviceWorker' in navigator) {
          // Чекаємо поки Service Worker стане готовим
          const registration = await navigator.serviceWorker.ready;
          console.log('📱 Використовую Service Worker для notification (Android-friendly)');

          await registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'schedule-update',
            requireInteraction: false,
          } as NotificationOptions);
          console.log('✅ Notification показано через Service Worker');
        } else {
          // Fallback на звичайний Notification API (для iOS/Desktop)
          console.log('💻 Використовую звичайний Notification API');
          const notification = new Notification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'schedule-update',
          });
          console.log('✅ Notification створено:', notification);
        }
      } catch (err) {
        console.error('❌ Помилка створення notification:', err);
        // Fallback якщо Service Worker не спрацював
        try {
          const notification = new Notification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'schedule-update',
          });
          console.log('✅ Notification створено через fallback:', notification);
        } catch (fallbackErr) {
          console.error('❌ Fallback також не спрацював:', fallbackErr);
        }
      }
    } else {
      console.warn('⚠️ Notification не показано - дозвіл:', notificationPermission);
    }
  };

  const fetchLatestImage = async () => {
    try {
      setError(null);


      // Перевірка дозволу на notifications
      if ('Notification' in window) {
        const currentPermission = Notification.permission;
        if (currentPermission !== notificationPermission) {
          console.log('🔔 Оновлення статусу дозволу:', currentPermission);
          setNotificationPermission(currentPermission);
        }
      }

      console.log('🌐 Виконую fetch до /api/menus...');
      const response = await fetch('/api/menus', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });



      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const data: MenuResponse = await response.json();


      if (data['hydra:member'] && data['hydra:member'].length > 0) {
        const menu = data['hydra:member'][0];

        if (menu.menuItems && menu.menuItems.length > 0) {
          // Знайти елемент "Arhiv" для перевірки змін
          const archiveItem = menu.menuItems.find(item => item.name === 'Arhiv');
          const archiveLength = archiveItem ? archiveItem.children.length : 0;
          const archiveChildren = archiveItem ? archiveItem.children : [];



          // Створюємо хеш архіву для детальнішого відстеження
          const currentArchiveHash = createArchiveHash(archiveChildren);


          // Перевірка чи змінився архів (довжина АБО вміст)
          const archiveChanged = previousArchiveHashRef.current !== null &&
            previousArchiveHashRef.current !== currentArchiveHash;

          if (archiveChanged) {
            const lengthChanged = previousArchiveLengthRef.current !== archiveLength;


            if (lengthChanged) {
              showNotification(
                'Архів графіків оновлено!',
                `Кількість графіків в архіві змінилася: було ${previousArchiveLengthRef.current}, стало ${archiveLength}`
              );
            } else {
              showNotification(
                'Архів графіків оновлено!',
                'Зміни в архіві графіків відключень. Перевірте оновлення.'
              );
            }
          }

          // Оновлюємо попереднє значення хешу архіву
          previousArchiveHashRef.current = currentArchiveHash;

          // Знайти Today та Tomorrow елементи
          const todayItem = menu.menuItems.find(item => item.name === 'Today');
          const tomorrowItem = menu.menuItems.find(item => item.name === 'Tomorrow');



          // Перевірка чи є графік в Today (BOOLEAN!)
          const todayHasSchedule = !!(todayItem && (todayItem.imageUrl || todayItem.slug || todayItem.rawHtml));
          const todayHasDescription = !!(todayItem && todayItem.description && todayItem.description.trim().length > 0);

          // Перевірка чи є графік в Tomorrow (BOOLEAN!)
          const tomorrowHasSchedule = !!(tomorrowItem && (tomorrowItem.imageUrl || tomorrowItem.slug || tomorrowItem.rawHtml));

          console.log('✅ Перевірки (Boolean values):', {
            todayHasSchedule: todayHasSchedule,
            todayHasScheduleType: typeof todayHasSchedule,
            todayHasDescription: todayHasDescription,
            todayHasDescriptionType: typeof todayHasDescription,
            tomorrowHasSchedule: tomorrowHasSchedule,
            tomorrowHasScheduleType: typeof tomorrowHasSchedule,
          });

          console.log('✅ Перевірки (Raw values):', {
            todayImageUrl: todayItem?.imageUrl,
            todaySlug: todayItem?.slug,
            todayRawHtml: !!todayItem?.rawHtml,
            tomorrowImageUrl: tomorrowItem?.imageUrl,
            tomorrowSlug: tomorrowItem?.slug,
            tomorrowRawHtml: !!tomorrowItem?.rawHtml
          });

          // Вибираємо який елемент показувати
          let itemToShow = null;
          let isShowingTomorrow = false;

          if (todayHasSchedule || todayHasDescription) {
            // Якщо є Today - показуємо його
            itemToShow = todayItem;
            isShowingTomorrow = false;
            console.log('✅ Показую Today (сьогодні)');
            console.log('📅 isShowingTomorrow:', isShowingTomorrow, 'TYPE:', typeof isShowingTomorrow);
          } else if (tomorrowHasSchedule) {
            // Якщо немає Today, але є Tomorrow - показуємо Tomorrow
            itemToShow = tomorrowItem;
            isShowingTomorrow = true;
            console.log('✅ Today немає, показую Tomorrow (завтра)');
            console.log('📅 isShowingTomorrow:', isShowingTomorrow, 'TYPE:', typeof isShowingTomorrow);
          } else {
            console.log('❌ Немає ні Today, ні Tomorrow');
            console.log('📅 isShowingTomorrow:', isShowingTomorrow, 'TYPE:', typeof isShowingTomorrow);
          }

          // Створюємо хеш поточного стану графіків
          const currentScheduleHash = createScheduleHash(todayItem, tomorrowItem);


          if (itemToShow) {
            const newMenuData: MenuData = {
              desktopImageUrl: itemToShow.imageUrl || '',
              mobileImageUrl: itemToShow.slug || '',
              desktopHtml: itemToShow.rawHtml || itemToShow.description || '',
              mobileHtml: itemToShow.rawMobileHtml || itemToShow.description || '',
              archiveLength,
              isShowingTomorrow,
              hasTomorrowSchedule: tomorrowHasSchedule,
              tomorrowDesktopImageUrl: tomorrowItem?.imageUrl || '',
              tomorrowMobileImageUrl: tomorrowItem?.slug || '',
            };

            console.log(`💾 Встановлюю menuData з графіком (${isShowingTomorrow ? 'Tomorrow' : 'Today'})`);
            console.log('🎯 newMenuData:', JSON.stringify(newMenuData, null, 2));
            console.log('🎯 newMenuData.isShowingTomorrow:', newMenuData.isShowingTomorrow);
            console.log('🎯 newMenuData.hasTomorrowSchedule:', newMenuData.hasTomorrowSchedule);
            console.log('🎯 Тип newMenuData.isShowingTomorrow:', typeof newMenuData.isShowingTomorrow);
            if (previousScheduleHashRef.current !== null &&
              previousScheduleHashRef.current !== currentScheduleHash) {
              showNotification(
                'Графік відключень оновлено!',
                'З\'явився новий графік погодинних відключень електроенергії.'
              );
            }

            // Оновлення попереднього значення хешу
            previousScheduleHashRef.current = currentScheduleHash;
            console.log('🔥 ПЕРЕД setMenuData:', {
              isShowingTomorrow: newMenuData.isShowingTomorrow,
              type: typeof newMenuData.isShowingTomorrow,
              willShow: !!newMenuData.isShowingTomorrow
            });
            setMenuData(newMenuData);
            console.log('✅ ПІСЛЯ setMenuData виконано');
          } else {
            // Немає ні Today ні Tomorrow - показуємо повідомлення
            const emptyMenuData: MenuData = {
              desktopImageUrl: '',
              mobileImageUrl: '',
              desktopHtml: '<p><b>Сьогодні графіки відключень не застосовуються</b></p>',
              mobileHtml: '<p><b>Сьогодні графіки відключень не застосовуються</b></p>',
              archiveLength,
              isShowingTomorrow: false,
              hasTomorrowSchedule: tomorrowHasSchedule,
              tomorrowDesktopImageUrl: tomorrowItem?.imageUrl || '',
              tomorrowMobileImageUrl: tomorrowItem?.slug || '',
            };
            console.log('💾 Встановлюю menuData БЕЗ графіка:', emptyMenuData);

            // Перевірка чи змінився стан (з'явився/зник графік)
            if (previousScheduleHashRef.current !== null &&
              previousScheduleHashRef.current !== currentScheduleHash) {
              showNotification(
                'Графіки відключень оновлено!',
                'Графіки відключень змінилися. Перевірте актуальну інформацію.'
              );
            }

            setMenuData(emptyMenuData);
            previousScheduleHashRef.current = currentScheduleHash;
          }

          // Оновлення попереднього значення довжини архіву (в кінці, після всіх перевірок)
          previousArchiveLengthRef.current = archiveLength;
        } else {
          console.warn('⚠️ menu.menuItems порожній або не існує');
          setError('Дані меню порожні');
        }
      } else {
        console.warn('⚠️ hydra:member порожній або не існує');
        setError('Відповідь API не містить даних');
      }

      setLoading(false);
    } catch (err) {
      console.error('❌ Помилка при fetch:', err);
      console.error('❌ Тип помилки:', typeof err);
      console.error('❌ Error stack:', err instanceof Error ? err.stack : 'N/A');
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error message:', errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Перший запит при завантаженні
    fetchLatestImage();

    // Запит кожну хвилину (60000 мс)
    const interval = setInterval(() => {
      console.log('⏰ Автоматична перевірка оновлень (1 хв)');
      fetchLatestImage();
    }, 60000);

    // Додаємо слухача для перевірки при поверненні на вкладку
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Вкладка стала активною - перевіряю оновлення');
        fetchLatestImage();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Додаємо слухача для фокусу вікна
    const handleFocus = () => {
      console.log('🎯 Вікно отримало фокус - перевіряю оновлення');
      fetchLatestImage();
    };

    window.addEventListener('focus', handleFocus);

    // Очищення при розмонтуванні компонента
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Вибір URL з fallback: спочатку пробуємо mobile/desktop, якщо порожній - беремо інший
  let currentImageUrl = isMobile ? menuData?.mobileImageUrl : menuData?.desktopImageUrl;
  let currentHtml = isMobile ? menuData?.mobileHtml : menuData?.desktopHtml;

  // Fallback: якщо поточний URL порожній, спробувати інший
  if (!currentImageUrl || currentImageUrl.trim() === '') {
    currentImageUrl = isMobile ? menuData?.desktopImageUrl : menuData?.mobileImageUrl;

  }

  if (!currentHtml || currentHtml.trim() === '') {
    currentHtml = isMobile ? menuData?.desktopHtml : menuData?.mobileHtml;

  }

  console.log('🎨 Render state:', {
    loading,
    error,
    hasMenuData: !!menuData,
    menuData,
    isMobile,
    currentImageUrl,
    currentHtmlLength: currentHtml?.length,
    desktopImageUrl: menuData?.desktopImageUrl,
    mobileImageUrl: menuData?.mobileImageUrl,
  });

  const requestNotificationPermission = async () => {
    console.log('🔔 Запит дозволу на notifications...');
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('🔔 Отримано дозвіл:', permission);
      setNotificationPermission(permission);

      // Тестове сповіщення після надання дозволу
      if (permission === 'granted') {
        console.log('✅ Дозвіл надано! Показую тестове сповіщення');
        setTimeout(() => {
          showNotification('Дозвіл надано!', 'Тепер ви будете отримувати сповіщення про оновлення графіку');
        }, 500);
      }
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
          <div className="w-full max-w-2xl">
            <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
              <p className="text-lg text-red-800 dark:text-red-200 font-semibold mb-2">
                Помилка завантаження даних
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                {error}
              </p>
              <button
                onClick={() => {
                  console.log('🔄 Ручне оновлення...');
                  setError(null);
                  setLoading(true);
                  fetchLatestImage();
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
              >
                Спробувати ще раз
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
              Перевірте консоль браузера (DevTools) для детальної інформації
            </p>
          </div>
        )}

        {!loading && !error && menuData && (
          <div className="w-full flex flex-col items-center gap-6">
            {(() => {
              console.log('🎨 RENDER: menuData =', menuData);
              console.log('🎨 RENDER: menuData.isShowingTomorrow =', menuData.isShowingTomorrow);
              console.log('🎨 RENDER: menuData.hasTomorrowSchedule =', menuData.hasTomorrowSchedule);
              console.log('🎨 RENDER: Тип isShowingTomorrow =', typeof menuData.isShowingTomorrow);
              console.log('🎨 RENDER: Буде показано блок Tomorrow?', !!menuData.isShowingTomorrow);
              console.log('🎨 RENDER: Буде показано інфо про Tomorrow?', !menuData.isShowingTomorrow && !!menuData.hasTomorrowSchedule);
              console.log('🎨 RENDER: Умова menuData.isShowingTomorrow ===', menuData.isShowingTomorrow === true);
              return null;
            })()}

            {menuData.isShowingTomorrow && (
              <div className="w-full bg-blue-500 dark:bg-blue-600 p-6 rounded-lg shadow-lg border-2 border-blue-600 dark:border-blue-400">
                <p className="text-2xl text-center text-white font-bold flex items-center justify-center gap-3">
                  <span className="text-3xl">📅</span>
                  <span>Показано графік на ЗАВТРА</span>
                  <span className="text-3xl">📅</span>
                </p>
                <p className="text-sm text-center text-blue-100 mt-2">
                  Графіка на сьогодні немає
                </p>
              </div>
            )}
            
            {!menuData.isShowingTomorrow && menuData.desktopImageUrl && (
              <div className="w-full bg-green-500 dark:bg-green-600 p-4 rounded-lg shadow-lg border-2 border-green-600 dark:border-green-400">
                <p className="text-lg text-center text-white font-semibold flex items-center justify-center gap-2">
                  <span className="text-2xl">📅</span>
                  <span>Показано графік на СЬОГОДНІ</span>
                  <span className="text-2xl">📅</span>
                </p>
              </div>
            )}
            {currentImageUrl ? (
              <img
                src={`https://api.loe.lviv.ua${currentImageUrl}`}
                alt="Графік відключень"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-full bg-green-100 dark:bg-green-900 p-8 rounded-lg">
                <p className="text-2xl text-center text-green-800 dark:text-green-200 font-semibold">
                  ✅ Сьогодні графіки відключень не застосовуються
                </p>
              </div>
            )}

            {currentHtml && !currentHtml.includes('не застосовуються') && (
              <div
                className="w-full text-zinc-800 dark:text-zinc-200 text-sm md:text-base text-center"
                dangerouslySetInnerHTML={{ __html: currentHtml }}
              />
            )}

            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Оновлюється автоматично кожну хвилину
            </p>

            {menuData.archiveLength > 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Графіків в архіві: {menuData.archiveLength}
              </p>
            )}

            {appVersion && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Версія: {appVersion}
              </p>
            )}

            {/* Інформація про графік на завтра */}
            {!menuData.isShowingTomorrow && menuData.hasTomorrowSchedule && (
              <div className="w-full bg-blue-100 dark:bg-blue-900 p-6 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                <p className="text-xl text-center text-blue-800 dark:text-blue-200 font-bold flex items-center justify-center gap-2 mb-4">
                  <span className="text-2xl">📅</span>
                  <span>Графік на завтра вже доступний!</span>
                  <span className="text-2xl">📅</span>
                </p>
                <p className="text-sm text-center text-blue-700 dark:text-blue-300 mb-4">
                  Графік відключень на завтра вже опублікований
                </p>
                {/* Зображення завтрашнього графіка */}
                {(() => {
                  const tomorrowImageUrl = isMobile 
                    ? (menuData.tomorrowMobileImageUrl || menuData.tomorrowDesktopImageUrl)
                    : (menuData.tomorrowDesktopImageUrl || menuData.tomorrowMobileImageUrl);
                  
                  console.log('🖼️ Tomorrow Image URL:', tomorrowImageUrl);
                  
                  return tomorrowImageUrl ? (
                    <img
                      src={`https://api.loe.lviv.ua${tomorrowImageUrl}`}
                      alt="Графік відключень на завтра"
                      className="w-full h-auto rounded-lg shadow-lg mt-2"
                    />
                  ) : null;
                })()}
              </div>
            )}

            {/* Блок керування */}
            <div className="w-full max-w-md flex flex-col gap-3 mt-4">
              {/* Кнопка примусового оновлення */}
              <button
                onClick={() => {
                  console.log('🔄 Примусове оновлення...');
                  setLoading(true);
                  fetchLatestImage();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              >
                🔄 Оновити зараз
              </button>

              {/* Кнопка тесту сповіщення */}
              {notificationPermission === 'granted' && (
                <button
                  onClick={() => {
                    showNotification('Тест!', 'Це тестове сповіщення з системним звуком');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded"
                >
                  � Тестувати сповіщення
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && !error && !menuData && (
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Дані не знайдено
            {menuData || loading || error}
          </p>
        )}
      </main>
    </div>
  );
}
