import { NextResponse } from 'next/server';

export async function GET() {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 секунда

  // Функція для затримки
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Функція для спроби fetch з retry
  const fetchWithRetry = async (attempt: number = 1): Promise<Response> => {
    try {
      console.log(`[API] 🔄 Спроба ${attempt}/${MAX_RETRIES} - Запит до зовнішнього API`);
      
      // Для iOS Safari - без AbortController (може викликати проблеми)
      const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      const fetchOptions: RequestInit = {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'LOE-Mobile-App/1.0',
        },
        cache: 'no-store',
        mode: 'cors',
        credentials: 'omit',
      };

      // Додаємо timeout тільки якщо не iOS
      let timeoutId: NodeJS.Timeout | undefined;
      if (!isIOS) {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 15000);
        fetchOptions.signal = controller.signal;
      }

      const response = await fetch(
        'https://api.loe.lviv.ua/api/menus?page=1&type=photo-grafic',
        fetchOptions
      );

      if (timeoutId) clearTimeout(timeoutId);
      
      console.log(`[API] ✅ Відповідь отримано (спроба ${attempt}):`, response.status);
      return response;
    } catch (error) {
      console.error(`[API] ❌ Помилка на спробі ${attempt}:`, error);
      
      if (attempt < MAX_RETRIES) {
        const delayTime = RETRY_DELAY * attempt; // Експоненційна затримка
        console.log(`[API] ⏳ Очікування ${delayTime}ms перед наступною спробою...`);
        await delay(delayTime);
        return fetchWithRetry(attempt + 1);
      }
      
      throw error;
    }
  };

  try {
    console.log('[API] 🔄 Отримано запит до /api/menus');

    const response = await fetchWithRetry();

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
    console.error('[API] ❌ Всі спроби вичерпано. Фінальна помилка:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch data after multiple retries',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 503, // Service Unavailable
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );
  }
}
