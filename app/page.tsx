'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

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
  // Дані для Tomorrow (графік на завтра)
  tomorrowDesktopImageUrl?: string;
  tomorrowMobileImageUrl?: string;
  tomorrowDesktopHtml?: string;
  tomorrowMobileHtml?: string;
  hasTomorrow?: boolean;
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
    console.log('� Ініціалізація додатку...');

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
          console.log('✅ Всі старі SW видалено, реєструю новий');

          // Реєстрація нового Service Worker
          navigator.serviceWorker
            .register('/sw.js', { updateViaCache: 'none' })
            .then((registration) => {
              console.log('✅ Service Worker зареєстровано:', registration);

              // Перевірка оновлень кожні 30 секунд
              setInterval(() => {
                console.log('🔄 Перевірка оновлень SW...');
                registration.update();
              }, 30000);

              // Автоматичне оновлення при виявленні нової версії
              registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Знайдено нову версію Service Worker');

                if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                      console.log('🔄 Нова версія встановлена!');

                      if (navigator.serviceWorker.controller) {
                        // Є старий SW - оновлюємо автоматично
                        console.log('🔄 Оновлюю з старої версії...');
                        if (!swUpdateCheckRef.current) {
                          swUpdateCheckRef.current = true;
                          
                          // Показати сповіщення про оновлення
                          if (notificationPermission === 'granted') {
                            showNotification(
                              '🔄 Оновлення додатку',
                              'Встановлено нову версію. Перезавантаження через 3 секунди...'
                            );
                          }
                          
                          // Автоматичне перезавантаження через 3 секунди
                          setTimeout(() => {
                            console.log('🔄 Автоматичне перезавантаження...');
                            window.location.reload();
                          }, 3000);
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
      console.log('📱 Перевірка розміру екрану:', {
        width,
        isMobile: isMobileDevice,
        userAgent: navigator.userAgent
      });
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
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

  const showNotification = useCallback(async (title: string, body: string) => {
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
            tag: `schedule-update-${Date.now()}`, // Унікальний tag для кожного сповіщення
            requireInteraction: true, // Показувати до закриття користувачем
            silent: false, // НЕ тихе сповіщення - з звуком
            dir: 'ltr', // Напрямок тексту
            lang: 'uk', // Мова
          } as NotificationOptions);
          console.log('✅ Notification показано через Service Worker');
        } else {
          // Fallback на звичайний Notification API (для iOS/Desktop)
          console.log('💻 Використовую звичайний Notification API');
          const notification = new Notification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: `schedule-update-${Date.now()}`, // Унікальний tag для кожного сповіщення
            requireInteraction: true,
            silent: false,
            dir: 'ltr',
            lang: 'uk',
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
            tag: `schedule-update-${Date.now()}`, // Унікальний tag для кожного сповіщення
            requireInteraction: true,
            silent: false,
          });
          console.log('✅ Notification створено через fallback:', notification);
        } catch (fallbackErr) {
          console.error('❌ Fallback також не спрацював:', fallbackErr);
        }
      }
    } else {
      console.warn('⚠️ Notification не показано - дозвіл:', notificationPermission);
    }
  }, [notificationPermission]);

  const fetchLatestImage = async () => {
    try {
      setError(null);
      console.log('🔄 Починаю fetch даних...');
      console.log('📱 User Agent:', navigator.userAgent);

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

      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const data: MenuResponse = await response.json();
      console.log('✅ Дані отримано, розмір:', JSON.stringify(data).length);
      console.log('📋 hydra:member існує?', !!data['hydra:member']);
      console.log('📋 hydra:member length:', data['hydra:member']?.length);

      if (data['hydra:member'] && data['hydra:member'].length > 0) {
        const menu = data['hydra:member'][0];

        if (menu.menuItems && menu.menuItems.length > 0) {
          // Знайти елемент "Arhiv" для перевірки змін
          const archiveItem = menu.menuItems.find(item => item.name === 'Arhiv');
          const archiveLength = archiveItem ? archiveItem.children.length : 0;
          const archiveChildren = archiveItem ? archiveItem.children : [];

          console.log('📊 ========== ПЕРЕВІРКА АРХІВУ ==========');
          console.log('📊 Поточна довжина архіву:', archiveLength);
          console.log('📊 Попередня довжина архіву:', previousArchiveLengthRef.current);
          console.log('📊 Це перше завантаження?', previousArchiveLengthRef.current === null);

          // Створюємо хеш архіву для детальнішого відстеження
          const currentArchiveHash = createArchiveHash(archiveChildren);
          console.log('🔑 Поточний хеш архіву:', currentArchiveHash);
          console.log('🔑 Попередній хеш архіву:', previousArchiveHashRef.current);
          console.log('🔑 Хеші різні?', previousArchiveHashRef.current !== currentArchiveHash);
          console.log('🔑 Попередній хеш не null?', previousArchiveHashRef.current !== null);

          // Перевірка чи змінився архів (довжина АБО вміст)
          const archiveChanged = previousArchiveHashRef.current !== null &&
                                  previousArchiveHashRef.current !== currentArchiveHash;

          console.log('🔍 archiveChanged =', archiveChanged);

          if (archiveChanged) {
            const lengthChanged = previousArchiveLengthRef.current !== archiveLength;
            console.log('🔔 ==========================================');
            console.log('🔔 🔔 🔔 АРХІВ ЗМІНИВСЯ! 🔔 🔔 🔔');
            console.log('🔔 ==========================================');
            console.log('🔔 Довжина змінилася:', lengthChanged);
            console.log('🔔 Попередня довжина:', previousArchiveLengthRef.current);
            console.log('🔔 Нова довжина:', archiveLength);
            console.log('🔔 Різниця:', archiveLength - (previousArchiveLengthRef.current || 0));
            console.log('🔔 Попередній хеш:', previousArchiveHashRef.current);
            console.log('🔔 Новий хеш:', currentArchiveHash);
            console.log('🔔 Дозвіл Notification.permission:', Notification.permission);
            console.log('🔔 Дозвіл notificationPermission state:', notificationPermission);

            if (lengthChanged) {
              console.log('🔔 Викликаю showNotification для зміни довжини...');
              await showNotification(
                'Архів графіків оновлено!',
                `Кількість графіків в архіві змінилася: було ${previousArchiveLengthRef.current}, стало ${archiveLength}`
              );
            } else {
              console.log('🔔 Викликаю showNotification для зміни вмісту...');
              await showNotification(
                'Архів графіків оновлено!',
                'Зміни в архіві графіків відключень. Перевірте оновлення.'
              );
            }
            console.log('✅ ✅ ✅ Сповіщення про архів ВІДПРАВЛЕНО!');
          } else {
            console.log('ℹ️ Архів НЕ змінився, сповіщення не потрібне');
            if (previousArchiveHashRef.current === null) {
              console.log('ℹ️ Причина: перше завантаження (previousArchiveHashRef = null)');
            } else if (previousArchiveHashRef.current === currentArchiveHash) {
              console.log('ℹ️ Причина: хеші однакові');
            }
          }

          // ВАЖЛИВО: Оновлюємо попереднє значення хешу архіву ТІЛЬКИ ПІСЛЯ перевірки
          previousArchiveHashRef.current = currentArchiveHash;

          // Знайти Today та Tomorrow елементи
          const todayItem = menu.menuItems.find(item => item.name === 'Today');
          const tomorrowItem = menu.menuItems.find(item => item.name === 'Tomorrow');

          console.log('📋 Today item:', {
            name: todayItem?.name,
            hasImageUrl: !!todayItem?.imageUrl,
            hasSlug: !!todayItem?.slug,
            hasDescription: !!todayItem?.description,
            imageUrl: todayItem?.imageUrl,
            slug: todayItem?.slug,
            description: todayItem?.description?.substring(0, 100),
            rawHtml: todayItem?.rawHtml?.substring(0, 50),
            rawMobileHtml: todayItem?.rawMobileHtml?.substring(0, 50),
          });

          console.log('📋 Tomorrow item:', {
            name: tomorrowItem?.name,
            hasImageUrl: !!tomorrowItem?.imageUrl,
            hasSlug: !!tomorrowItem?.slug,
            hasDescription: !!tomorrowItem?.description,
            imageUrl: tomorrowItem?.imageUrl,
            slug: tomorrowItem?.slug,
            rawHtml: tomorrowItem?.rawHtml?.substring(0, 50),
            rawMobileHtml: tomorrowItem?.rawMobileHtml?.substring(0, 50),
          });

          // Перевірка чи є графік в Today
          const todayHasSchedule = todayItem && todayItem.imageUrl && todayItem.slug;
          const todayHasDescription = todayItem && todayItem.description && todayItem.description.trim().length > 0;

          // Перевірка чи є графік в Tomorrow
          const tomorrowHasSchedule = tomorrowItem && tomorrowItem.imageUrl && tomorrowItem.slug;

          console.log('✅ Перевірки:', {
            todayHasSchedule,
            todayHasDescription,
            tomorrowHasSchedule
          });

          // Вибираємо який елемент показувати
          let itemToShow = null;
          let isShowingTomorrow = false;

          if (todayHasSchedule || todayHasDescription) {
            // Якщо є Today - показуємо його
            itemToShow = todayItem;
            isShowingTomorrow = false;
            console.log('✅ Показую Today');
          } else if (tomorrowHasSchedule) {
            // Якщо немає Today, але є Tomorrow - показуємо Tomorrow
            itemToShow = tomorrowItem;
            isShowingTomorrow = true;
            console.log('✅ Today немає, показую Tomorrow');
          }

          // Створюємо хеш поточного стану графіків
          const currentScheduleHash = createScheduleHash(todayItem, tomorrowItem);
          console.log('🔑 Поточний хеш графіка:', currentScheduleHash);
          console.log('🔑 Попередній хеш графіка:', previousScheduleHashRef.current);

          if (itemToShow) {
            const newMenuData: MenuData = {
              desktopImageUrl: itemToShow.imageUrl || '',
              mobileImageUrl: itemToShow.slug || '',
              desktopHtml: itemToShow.rawHtml || itemToShow.description || '',
              mobileHtml: itemToShow.rawMobileHtml || itemToShow.description || '',
              archiveLength,
              isShowingTomorrow,
              // Додаємо Tomorrow дані окремо (незалежно від того, що показується зараз)
              tomorrowDesktopImageUrl: tomorrowItem?.imageUrl || '',
              tomorrowMobileImageUrl: tomorrowItem?.slug || '',
              tomorrowDesktopHtml: tomorrowItem?.rawHtml || tomorrowItem?.description || '',
              tomorrowMobileHtml: tomorrowItem?.rawMobileHtml || tomorrowItem?.description || '',
              hasTomorrow: !!tomorrowHasSchedule,
            };

            console.log(`💾 Встановлюю menuData з графіком (${isShowingTomorrow ? 'Tomorrow' : 'Today'}):`, newMenuData);
            console.log('📅 Tomorrow дані:', {
              hasTomorrow: tomorrowHasSchedule,
              tomorrowDesktopImageUrl: tomorrowItem?.imageUrl,
              tomorrowMobileImageUrl: tomorrowItem?.slug,
            });

            // Перевірка чи змінився графік (порівнюємо хеші)
            if (previousScheduleHashRef.current !== null &&
                previousScheduleHashRef.current !== currentScheduleHash) {
              // Графік змінився!
              console.log('🔔 ========================================');
              console.log('🔔 ГРАФІК ЗМІНИВСЯ! Показую сповіщення');
              console.log('🔔 ========================================');
              console.log('🔔 Попередній хеш:', previousScheduleHashRef.current);
              console.log('🔔 Новий хеш:', currentScheduleHash);
              console.log('🔔 Дозвіл:', Notification.permission);
              
              await showNotification(
                'Графік відключень оновлено!',
                'З\'явився новий графік погодинних відключень електроенергії.'
              );
              console.log('✅ Сповіщення про графік відправлено');
            } else if (previousScheduleHashRef.current === null) {
              console.log('ℹ️ Перше завантаження - сповіщення не показується');
            } else {
              console.log('✅ Графік не змінився - сповіщення не потрібне');
            }

            // Оновлення попереднього значення хешу
            previousScheduleHashRef.current = currentScheduleHash;
            setMenuData(newMenuData);
          } else {
            // Немає ні Today ні Tomorrow - показуємо повідомлення
            const emptyMenuData: MenuData = {
              desktopImageUrl: '',
              mobileImageUrl: '',
              desktopHtml: '<p><b>Сьогодні графіки відключень не застосовуються</b></p>',
              mobileHtml: '<p><b>Сьогодні графіки відключень не застосовуються</b></p>',
              archiveLength,
              // Додаємо Tomorrow дані навіть якщо немає Today
              tomorrowDesktopImageUrl: tomorrowItem?.imageUrl || '',
              tomorrowMobileImageUrl: tomorrowItem?.slug || '',
              tomorrowDesktopHtml: tomorrowItem?.rawHtml || tomorrowItem?.description || '',
              tomorrowMobileHtml: tomorrowItem?.rawMobileHtml || tomorrowItem?.description || '',
              hasTomorrow: !!tomorrowHasSchedule,
            };
            console.log('💾 Встановлюю menuData БЕЗ графіка:', emptyMenuData);

            // Перевірка чи змінився стан (з'явився/зник графік)
            if (previousScheduleHashRef.current !== null &&
                previousScheduleHashRef.current !== currentScheduleHash) {
              console.log('🔔 ========================================');
              console.log('🔔 СТАН ГРАФІКІВ ЗМІНИВСЯ! Показую сповіщення');
              console.log('🔔 ========================================');
              console.log('🔔 Попередній хеш:', previousScheduleHashRef.current);
              console.log('🔔 Новий хеш:', currentScheduleHash);
              console.log('🔔 Дозвіл:', Notification.permission);
              
              await showNotification(
                'Графіки відключень оновлено!',
                'Графіки відключень змінилися. Перевірте актуальну інформацію.'
              );
              console.log('✅ Сповіщення про стан відправлено');
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

    // Запит кожні 5 хвилин (300000 мс)
    const interval = setInterval(() => {
      fetchLatestImage();
    }, 300000);

    // Очищення інтервалу при розмонтуванні компонента
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Вибір URL з fallback: спочатку пробуємо mobile/desktop, якщо порожній - беремо інший
  let currentImageUrl = isMobile ? menuData?.mobileImageUrl : menuData?.desktopImageUrl;
  let currentHtml = isMobile ? menuData?.mobileHtml : menuData?.desktopHtml;

  // Fallback: якщо поточний URL порожній, спробувати інший
  if (!currentImageUrl || currentImageUrl.trim() === '') {
    currentImageUrl = isMobile ? menuData?.desktopImageUrl : menuData?.mobileImageUrl;
    console.log('⚠️ Fallback: використовую альтернативний imageUrl:', currentImageUrl);
  }

  if (!currentHtml || currentHtml.trim() === '') {
    currentHtml = isMobile ? menuData?.desktopHtml : menuData?.mobileHtml;
    console.log('⚠️ Fallback: використовую альтернативний HTML:', currentHtml?.substring(0, 50));
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
            {menuData.isShowingTomorrow && (
              <div className="w-full bg-blue-100 dark:bg-blue-900 p-4 rounded-lg">
                <p className="text-xl text-center text-blue-800 dark:text-blue-200 font-semibold">
                  📅 Показано графік на завтра
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

            {/* Блок Tomorrow графіка */}
            {!menuData.isShowingTomorrow && (
              <div className="w-full flex flex-col items-center gap-4 mt-8 pt-8 border-t-2 border-zinc-200 dark:border-zinc-700">
                <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
                  📅 Графік на завтра
                </h2>
                
                {menuData.hasTomorrow ? (
                  <>
                    {(isMobile ? menuData.tomorrowMobileImageUrl : menuData.tomorrowDesktopImageUrl) || 
                     (isMobile ? menuData.tomorrowDesktopImageUrl : menuData.tomorrowMobileImageUrl) ? (
                      <img
                        src={`https://api.loe.lviv.ua${
                          (isMobile ? menuData.tomorrowMobileImageUrl : menuData.tomorrowDesktopImageUrl) ||
                          (isMobile ? menuData.tomorrowDesktopImageUrl : menuData.tomorrowMobileImageUrl)
                        }`}
                        alt="Графік відключень на завтра"
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    ) : null}
                    
                    {((isMobile ? menuData.tomorrowMobileHtml : menuData.tomorrowDesktopHtml) ||
                      (isMobile ? menuData.tomorrowDesktopHtml : menuData.tomorrowMobileHtml)) && (
                      <div
                        className="w-full text-zinc-800 dark:text-zinc-200 text-sm md:text-base text-center"
                        dangerouslySetInnerHTML={{ 
                          __html: (isMobile ? menuData.tomorrowMobileHtml : menuData.tomorrowDesktopHtml) ||
                                  (isMobile ? menuData.tomorrowDesktopHtml : menuData.tomorrowMobileHtml) || ''
                        }}
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 p-6 rounded-lg">
                    <p className="text-lg text-center text-zinc-600 dark:text-zinc-400">
                      📭 Ще немає графіка на завтра
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Оновлюється автоматично кожні 5 хвилин
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
                    showNotification('Тест!', 'Це тестове сповіщення зі звуком пристрою');
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
            {menuData || loading || error }
          </p>
        )}
      </main>
    </div>
  );
}
