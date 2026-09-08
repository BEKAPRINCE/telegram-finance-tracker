/* ═══════════════════════════════════════════════════════
   Categories Module — Default categories and management
   ═══════════════════════════════════════════════════════ */

const Categories = {
  // Default categories shipped with the app
  defaults: [
    // Expense categories
    { name: 'Продукты', icon: '🛒', color: '#3fb950', type: 'expense' },
    { name: 'Кафе', icon: '☕', color: '#f0883e', type: 'expense' },
    { name: 'Транспорт', icon: '🚌', color: '#58a6ff', type: 'expense' },
    { name: 'Развлечения', icon: '🎮', color: '#bc8cff', type: 'expense' },
    { name: 'Здоровье', icon: '💊', color: '#f85149', type: 'expense' },
    { name: 'Одежда', icon: '👕', color: '#d2a8ff', type: 'expense' },
    { name: 'Жильё', icon: '🏠', color: '#79c0ff', type: 'expense' },
    { name: 'Связь', icon: '📱', color: '#56d364', type: 'expense' },
    { name: 'Образование', icon: '📚', color: '#e3b341', type: 'expense' },
    { name: 'Подарки', icon: '🎁', color: '#ff7b72', type: 'expense' },
    { name: 'Подписки', icon: '📺', color: '#79c0ff', type: 'expense' },
    { name: 'Другое', icon: '📌', color: '#8b949e', type: 'expense' },
    // Income categories
    { name: 'Зарплата', icon: '💼', color: '#3fb950', type: 'income' },
    { name: 'Фриланс', icon: '💻', color: '#58a6ff', type: 'income' },
    { name: 'Инвестиции', icon: '📈', color: '#bc8cff', type: 'income' },
    { name: 'Подарок', icon: '🎉', color: '#e3b341', type: 'income' },
    { name: 'Возврат', icon: '↩️', color: '#56d364', type: 'income' },
    { name: 'Другой доход', icon: '💰', color: '#8b949e', type: 'income' },
  ],

  // Get categories by type from the database
  async getByType(type) {
    const all = await DB.getCategories();
    return all.filter(c => c.type === type || c.type === 'both');
  },

  // Find category by name
  async findByName(name) {
    const all = await DB.getCategories();
    return all.find(c => c.name === name);
  },

  // Get all categories
  async getAll() {
    return DB.getCategories();
  },

  // Chart colors palette
  chartColors: [
    '#58a6ff', '#3fb950', '#f0883e', '#bc8cff', '#f85149',
    '#e3b341', '#79c0ff', '#d2a8ff', '#56d364', '#ff7b72',
    '#a5d6ff', '#7ee787', '#ffa657', '#d2a8ff', '#ffa198',
  ],

  getColor(index) {
    return this.chartColors[index % this.chartColors.length];
  }
};
