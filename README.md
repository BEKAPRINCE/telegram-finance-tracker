# 💰 Telegram Finance Tracker

Telegram Mini App для отслеживания личных финансов. Все данные хранятся локально на устройстве.

![Node.js](https://img.shields.io/badge/Node.js-26-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Возможности

- 📊 **Добавление доходов и расходов** с категориями и иконками
- 📈 **Графики и аналитика** — по дням, неделям, месяцам, годам
- 💳 **Бюджеты** — лимиты по категориям с прогресс-барами
- 💱 **Мультивалютность** — KZT, RUB, USD, EUR, UZS, GBP, TRY
- 📦 **Экспорт/импорт** — JSON бэкап, CSV для Excel
- 🔒 **Приватность** — данные хранятся только на устройстве (IndexedDB)
- 🌙 **Premium UI** — glassmorphism, анимации, адаптация к Telegram теме

## 🛠 Стек технологий

| Компонент | Технология |
|---|---|
| Frontend | Vanilla JS + CSS |
| Хранение | IndexedDB (Dexie.js) |
| Графики | Chart.js |
| Бот | grammy |
| Сервер | Express.js |

## 🚀 Запуск

### 1. Клонирование
```bash
git clone https://github.com/YOUR_USERNAME/telegram-finance-tracker.git
cd telegram-finance-tracker
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка
Создайте файл `.env`:
```env
BOT_TOKEN=your_telegram_bot_token
WEBAPP_URL=https://your-domain.com
PORT=3000
```

### 4. Запуск
```bash
npm run dev
```

Бот запустится и Mini App будет доступен на `http://localhost:3000`

## 📱 Использование

1. Отправьте `/start` боту в Telegram
2. Нажмите "Открыть Finance Tracker"
3. Добавляйте доходы и расходы
4. Смотрите аналитику и управляйте бюджетами

## 📁 Структура проекта

```
├── server/
│   └── index.js          # Express + grammy бот
├── webapp/
│   ├── index.html        # Mini App
│   ├── css/style.css     # Дизайн-система
│   └── js/
│       ├── app.js        # Инициализация
│       ├── db.js         # IndexedDB (Dexie.js)
│       ├── ui.js         # UI рендеринг
│       ├── charts.js     # Chart.js графики
│       ├── categories.js # Категории
│       ├── budget.js     # Бюджеты
│       ├── currency.js   # Мультивалютность
│       └── export.js     # Экспорт/импорт
├── .env                  # Переменные окружения
└── package.json
```

## 📜 Лицензия

MIT
