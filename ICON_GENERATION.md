# Генерація іконок для PWA

## Автоматична генерація (рекомендовано)

Використайте онлайн сервіс для генерації іконок з SVG:
1. Відкрийте https://realfavicongenerator.net/
2. Завантажте файл `public/icon.svg`
3. Налаштуйте параметри
4. Завантажте згенеровані іконки
5. Розмістіть `icon-192.png` та `icon-512.png` в папці `public/`

## Ручна генерація з допомогою ImageMagick

Якщо у вас встановлено ImageMagick:

```bash
# Встановлення ImageMagick (macOS)
brew install imagemagick

# Генерація іконок
magick public/icon.svg -resize 192x192 public/icon-192.png
magick public/icon.svg -resize 512x512 public/icon-512.png
```

## Альтернатива: Використання Node.js пакету

```bash
npm install -g sharp-cli

npx sharp -i public/icon.svg -o public/icon-192.png resize 192 192
npx sharp -i public/icon.svg -o public/icon-512.png resize 512 512
```

## Тимчасове рішення

Файл `icon.svg` буде використовуватись браузером, поки не будуть створені PNG версії.
