import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[API] 🔄 Отримано запит до /api/menus');

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
