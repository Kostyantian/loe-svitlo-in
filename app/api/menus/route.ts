import { NextResponse } from 'next/server';

// Лічильник для імітації реальних змін
let cycle = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test');
    
    console.log('[API] 🔄 Отримано запит до /api/menus', testMode ? '(TEST MODE)' : '');

    // Якщо test=mock - повертаємо реалістичні мокові дані
    if (testMode === 'mock') {
      cycle++;
      const currentCycle = cycle % 8;
      console.log(`[API] 🧪 ІМІТАЦІЯ: запит #${cycle}, цикл ${currentCycle}/7`);
      
      let todayItem, tomorrowItem, archiveLength;

      // Реалістична імітація змін протягом дня
      switch(currentCycle) {
        case 0: // Є графік на сьогодні
          todayItem = {
            '@id': '/api/menu_items/today',
            '@type': 'MenuItem',
            id: 100,
            name: 'Today',
            slug: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-01-01-m.png',
            orders: 1,
            children: [],
            imageUrl: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-01-01.png',
            description: 'Графік відключень на сьогодні',
            rawHtml: '<p><b>Погодинні відключення</b></p><p>Черга 1: 08:00-12:00</p><p>Черга 2: 12:00-16:00</p>',
            rawMobileHtml: '<p><b>Відключення</b></p><p>Ч1: 08-12</p><p>Ч2: 12-16</p>',
          };
          tomorrowItem = null;
          archiveLength = 12;
          break;

        case 1: // З'явився графік на завтра
          todayItem = {
            '@id': '/api/menu_items/today',
            '@type': 'MenuItem',
            id: 100,
            name: 'Today',
            slug: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-01-01-m.png',
            orders: 1,
            children: [],
            imageUrl: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-01-01.png',
            description: 'Графік відключень на сьогодні',
            rawHtml: '<p><b>Погодинні відключення</b></p><p>Черга 1: 08:00-12:00</p><p>Черга 2: 12:00-16:00</p>',
          };
          tomorrowItem = {
            '@id': '/api/menu_items/tomorrow',
            '@type': 'MenuItem',
            id: 101,
            name: 'Tomorrow',
            slug: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-02-01-m.png',
            orders: 2,
            children: [],
            imageUrl: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-02-01.png',
            description: 'Графік відключень на завтра',
            rawHtml: '<p><b>Завтра: відключення</b></p><p>Черга 1: 06:00-10:00</p><p>Черга 3: 18:00-22:00</p>',
          };
          archiveLength = 12;
          console.log('[API] ✅ З\'явився графік на ЗАВТРА!');
          break;

        case 2: // Оновився сьогоднішній графік
          todayItem = {
            '@id': '/api/menu_items/today',
            '@type': 'MenuItem',
            id: 100,
            name: 'Today',
            slug: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-01-01-v2-m.png',
            orders: 1,
            children: [],
            imageUrl: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-01-01-v2.png',
            description: 'Графік відключень (ОНОВЛЕНО!)',
            rawHtml: '<p><b>⚡ ОНОВЛЕНИЙ ГРАФІК</b></p><p>Черга 1: 08:00-11:00</p><p>Черга 2: 14:00-18:00</p><p>Черга 3: 20:00-23:00</p>',
          };
          tomorrowItem = {
            '@id': '/api/menu_items/tomorrow',
            '@type': 'MenuItem',
            id: 101,
            name: 'Tomorrow',
            slug: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-02-01-m.png',
            orders: 2,
            children: [],
            imageUrl: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-02-01.png',
            description: 'Графік відключень на завтра',
            rawHtml: '<p><b>Завтра: відключення</b></p><p>Черга 1: 06:00-10:00</p><p>Черга 3: 18:00-22:00</p>',
          };
          archiveLength = 12;
          console.log('[API] ⚡ Оновився графік на СЬОГОДНІ!');
          break;

        case 3: // Старий графік переміщено в архів
          todayItem = {
            '@id': '/api/menu_items/today',
            '@type': 'MenuItem',
            id: 100,
            name: 'Today',
            slug: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-01-01-v2-m.png',
            orders: 1,
            children: [],
            imageUrl: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-01-01-v2.png',
            description: 'Графік відключень (оновлено)',
            rawHtml: '<p><b>⚡ ОНОВЛЕНИЙ ГРАФІК</b></p><p>Черга 1: 08:00-11:00</p><p>Черга 2: 14:00-18:00</p><p>Черга 3: 20:00-23:00</p>',
          };
          tomorrowItem = {
            '@id': '/api/menu_items/tomorrow',
            '@type': 'MenuItem',
            id: 101,
            name: 'Tomorrow',
            slug: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-02-01-m.png',
            orders: 2,
            children: [],
            imageUrl: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-02-01.png',
            description: 'Графік відключень на завтра',
            rawHtml: '<p><b>Завтра: відключення</b></p><p>Черга 1: 06:00-10:00</p><p>Черга 3: 18:00-22:00</p>',
          };
          archiveLength = 13; // +1 графік в архів
          console.log('[API] 📦 Графік додано в архів (+1)');
          break;

        case 4: // День змінився - завтра стало сьогодні
          todayItem = {
            '@id': '/api/menu_items/today',
            '@type': 'MenuItem',
            id: 102,
            name: 'Today',
            slug: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-02-01-m.png',
            orders: 1,
            children: [],
            imageUrl: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-02-01.png',
            description: 'Графік відключень на сьогодні (новий день)',
            rawHtml: '<p><b>Погодинні відключення</b></p><p>Черга 1: 06:00-10:00</p><p>Черга 3: 18:00-22:00</p>',
          };
          tomorrowItem = null;
          archiveLength = 14; // +1 графік в архів
          console.log('[API] 📅 Новий день! Вчорашній Tomorrow став Today');
          break;

        case 5: // Немає графіків - світло без відключень
          todayItem = {
            '@id': '/api/menu_items/today',
            '@type': 'MenuItem',
            id: 103,
            name: 'Today',
            slug: '',
            orders: 1,
            children: [],
            imageUrl: '',
            description: '',
            rawHtml: '',
          };
          tomorrowItem = null;
          archiveLength = 15;
          console.log('[API] ✅ Немає відключень!');
          break;

        case 6: // З'явився графік на завтра (сьогодні немає)
          todayItem = {
            '@id': '/api/menu_items/today',
            '@type': 'MenuItem',
            id: 103,
            name: 'Today',
            slug: '',
            orders: 1,
            children: [],
            imageUrl: '',
            description: '',
            rawHtml: '',
          };
          tomorrowItem = {
            '@id': '/api/menu_items/tomorrow',
            '@type': 'MenuItem',
            id: 104,
            name: 'Tomorrow',
            slug: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-04-01-m.png',
            orders: 2,
            children: [],
            imageUrl: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-04-01.png',
            description: 'Графік відключень на завтра',
            rawHtml: '<p><b>⚡ Завтра відключення</b></p><p>Черга 2: 10:00-14:00</p><p>Черга 4: 16:00-20:00</p>',
          };
          archiveLength = 15;
          console.log('[API] 📅 Сьогодні немає, але є на ЗАВТРА!');
          break;

        case 7: // Масові зміни в архіві
          todayItem = {
            '@id': '/api/menu_items/today',
            '@type': 'MenuItem',
            id: 103,
            name: 'Today',
            slug: '',
            orders: 1,
            children: [],
            imageUrl: '',
            description: '',
            rawHtml: '',
          };
          tomorrowItem = {
            '@id': '/api/menu_items/tomorrow',
            '@type': 'MenuItem',
            id: 104,
            name: 'Tomorrow',
            slug: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-04-01-m.png',
            orders: 2,
            children: [],
            imageUrl: '/media/cache/resolve/menu_item/uploads/menu_items/grafik-vidkliuchen-04-01.png',
            description: 'Графік відключень на завтра',
            rawHtml: '<p><b>⚡ Завтра відключення</b></p><p>Черга 2: 10:00-14:00</p><p>Черга 4: 16:00-20:00</p>',
          };
          archiveLength = 18; // +3 графіки в архів
          console.log('[API] 📦 Масове оновлення архіву (+3 графіки)');
          break;

        default:
          todayItem = null;
          tomorrowItem = null;
          archiveLength = 12;
      }

      const menuItems = [
        todayItem,
        tomorrowItem,
        {
          '@id': '/api/menu_items/archive',
          '@type': 'MenuItem',
          id: 200,
          name: 'Arhiv',
          slug: '',
          orders: 3,
          children: Array.from({ length: archiveLength }, (_, i) => ({
            '@id': `/api/menu_items/archive_${i}`,
            '@type': 'MenuItem',
            id: 200 + i,
            name: `Archive ${i + 1}`,
            slug: `/media/cache/resolve/menu_item/uploads/archive/grafik-${i + 1}-m.png`,
            orders: i,
            children: [],
            imageUrl: `/media/cache/resolve/menu_item/uploads/archive/grafik-${i + 1}.png`,
          })),
        },
      ].filter(Boolean);

      const mockData = {
        '@context': '/api/contexts/Menu',
        '@id': '/api/menus',
        '@type': 'hydra:Collection',
        'hydra:member': [
          {
            '@id': '/api/menus/1',
            '@type': 'Menu',
            id: 1,
            name: 'Main Menu',
            type: 'photo-grafic',
            menuItems,
          },
        ],
      };
      
      return NextResponse.json(mockData, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Test-Mode': 'mock',
          'X-Cycle': currentCycle.toString(),
        }
      });
    }

    const response = await fetch(
      'https://api.loe.lviv.ua/api/menus?page=1&type=photo-grafic',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LOE-Mobile-App/1.0',
        },
        cache: 'no-store',
      }
    );

    console.log('[API] 📊 Відповідь від зовнішнього API:', response.status);

    if (!response.ok) {
      console.error('[API] ❌ Помилка від зовнішнього API:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Failed to fetch data from API: ${response.status} ${response.statusText}` },
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        }
      );
    }

    const data = await response.json();
    console.log('[API] ✅ Дані успішно отримано, розмір:', JSON.stringify(data).length);

    return NextResponse.json(data, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error('[API] ❌ Внутрішня помилка:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );
  }
}
