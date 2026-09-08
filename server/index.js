import 'dotenv/config';
import express from 'express';
import { Bot, InlineKeyboard } from 'grammy';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config ──────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || `http://localhost:${process.env.PORT || 3000}`;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set in .env');
  process.exit(1);
}

// ── Express Server ──────────────────────────────────────
const app = express();

// Serve Mini App static files
app.use(express.static(path.join(__dirname, '..', 'webapp')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Telegram Bot ────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

// /start command
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp('💰 Открыть Finance Tracker', `${WEBAPP_URL}/index.html`);

  await ctx.reply(
    '👋 Привет! Я — твой личный финансовый помощник.\n\n' +
    '📊 Отслеживай доходы и расходы\n' +
    '📈 Анализируй свои траты\n' +
    '💳 Устанавливай бюджеты\n' +
    '💱 Поддержка нескольких валют\n\n' +
    'Нажми кнопку ниже, чтобы начать! 👇',
    { reply_markup: keyboard }
  );
});

// /stats command — quick statistics
bot.command('stats', async (ctx) => {
  await ctx.reply(
    '📊 *Статистика*\n\n' +
    'Для просмотра полной статистики откройте Mini App.\n' +
    'Все данные хранятся локально на вашем устройстве.',
    { parse_mode: 'Markdown' }
  );
});

// /help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 *Команды бота:*\n\n' +
    '/start — Открыть Finance Tracker\n' +
    '/stats — Быстрая статистика\n' +
    '/help — Справка\n\n' +
    '💡 *Возможности:*\n' +
    '• Добавление доходов и расходов\n' +
    '• Категории с иконками\n' +
    '• Графики и аналитика\n' +
    '• Бюджеты по категориям\n' +
    '• Мультивалютность\n' +
    '• Экспорт/импорт данных\n\n' +
    '🔒 Все данные хранятся только на вашем устройстве.',
    { parse_mode: 'Markdown' }
  );
});

// /remind command
bot.command('remind', async (ctx) => {
  await ctx.reply(
    '⏰ *Напоминания*\n\n' +
    'Напоминание о записи расходов можно настроить в приложении:\n' +
    'Настройки → Напоминания\n\n' +
    '_Данные остаются на вашем устройстве._',
    { parse_mode: 'Markdown' }
  );
});

// Handle any text message
bot.on('message:text', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp('💰 Открыть Finance Tracker', `${WEBAPP_URL}/index.html`);

  await ctx.reply(
    'Используйте Mini App для управления финансами 👇',
    { reply_markup: keyboard }
  );
});

// ── Start Server & Bot ──────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📱 Mini App: http://localhost:${PORT}/index.html`);
});

bot.start({
  onStart: (botInfo) => {
    console.log(`🤖 Bot @${botInfo.username} started successfully!`);
  },
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  bot.stop();
  process.exit(0);
});
