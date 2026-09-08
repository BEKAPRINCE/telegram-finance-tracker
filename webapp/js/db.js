/* ═══════════════════════════════════════════════════════
   Database Module — Dexie.js IndexedDB wrapper
   All financial data stored locally on device
   ═══════════════════════════════════════════════════════ */

const db = new Dexie('FinanceTracker');

// Schema v1
db.version(1).stores({
  transactions: '++id, type, category, currency, date, createdAt',
  categories: '++id, name, type',
  budgets: '++id, category, period',
  settings: 'key'
});

// ── Transaction CRUD ────────────────────────────────────

const DB = {
  // Add a new transaction
  async addTransaction(tx) {
    tx.createdAt = new Date().toISOString();
    if (!tx.date) tx.date = new Date().toISOString().split('T')[0];
    const id = await db.transactions.add(tx);
    return id;
  },

  // Get all transactions, newest first
  async getAllTransactions() {
    return db.transactions.orderBy('date').reverse().toArray();
  },

  // Get recent N transactions
  async getRecentTransactions(limit = 5) {
    return db.transactions.orderBy('date').reverse().limit(limit).toArray();
  },

  // Get transactions for a date range
  async getTransactionsByDateRange(startDate, endDate) {
    return db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  },

  // Get transactions for current month
  async getCurrentMonthTransactions() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().split('T')[0];
    return this.getTransactionsByDateRange(start, end);
  },

  // Delete a transaction
  async deleteTransaction(id) {
    await db.transactions.delete(id);
  },

  // ── Categories CRUD ────────────────────────────────────

  async getCategories() {
    return db.categories.toArray();
  },

  async addCategory(category) {
    return db.categories.add(category);
  },

  async deleteCategory(id) {
    await db.categories.delete(id);
  },

  // Initialize default categories if none exist
  async initDefaultCategories() {
    const count = await db.categories.count();
    if (count === 0) {
      await db.categories.bulkAdd(Categories.defaults);
    }
  },

  // ── Budgets CRUD ───────────────────────────────────────

  async getBudgets() {
    return db.budgets.toArray();
  },

  async addBudget(budget) {
    return db.budgets.add(budget);
  },

  async updateBudget(id, changes) {
    return db.budgets.update(id, changes);
  },

  async deleteBudget(id) {
    await db.budgets.delete(id);
  },

  // ── Settings ───────────────────────────────────────────

  async getSetting(key, defaultValue = null) {
    const item = await db.settings.get(key);
    return item ? item.value : defaultValue;
  },

  async setSetting(key, value) {
    await db.settings.put({ key, value });
  },

  // ── Export / Import ────────────────────────────────────

  async exportAll() {
    const transactions = await db.transactions.toArray();
    const categories = await db.categories.toArray();
    const budgets = await db.budgets.toArray();
    const settings = await db.settings.toArray();
    return {
      version: 1,
      exportDate: new Date().toISOString(),
      data: { transactions, categories, budgets, settings }
    };
  },

  async importAll(data) {
    if (!data || !data.data) throw new Error('Invalid data format');
    await db.transaction('rw', db.transactions, db.categories, db.budgets, db.settings, async () => {
      await db.transactions.clear();
      await db.categories.clear();
      await db.budgets.clear();
      await db.settings.clear();
      if (data.data.transactions) await db.transactions.bulkAdd(data.data.transactions);
      if (data.data.categories) await db.categories.bulkAdd(data.data.categories);
      if (data.data.budgets) await db.budgets.bulkAdd(data.data.budgets);
      if (data.data.settings) await db.settings.bulkAdd(data.data.settings);
    });
  },

  async clearAll() {
    await db.transaction('rw', db.transactions, db.categories, db.budgets, db.settings, async () => {
      await db.transactions.clear();
      await db.categories.clear();
      await db.budgets.clear();
      await db.settings.clear();
    });
  },

  // ── Aggregation helpers ────────────────────────────────

  async getMonthSummary(year, month) {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const txs = await this.getTransactionsByDateRange(start, end);
    
    let income = 0, expense = 0;
    const byCategory = {};
    
    txs.forEach(tx => {
      const amount = CurrencyManager.convert(tx.amount, tx.currency);
      if (tx.type === 'income') {
        income += amount;
      } else {
        expense += amount;
        byCategory[tx.category] = (byCategory[tx.category] || 0) + amount;
      }
    });
    
    return { income, expense, balance: income - expense, byCategory, transactions: txs };
  },

  async getWeekSummary() {
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    
    const txs = await this.getTransactionsByDateRange(startStr, endStr);
    
    let income = 0, expense = 0;
    const byCategory = {};
    const byDay = {};
    
    txs.forEach(tx => {
      const amount = CurrencyManager.convert(tx.amount, tx.currency);
      if (tx.type === 'income') {
        income += amount;
      } else {
        expense += amount;
        byCategory[tx.category] = (byCategory[tx.category] || 0) + amount;
      }
      byDay[tx.date] = byDay[tx.date] || { income: 0, expense: 0 };
      byDay[tx.date][tx.type] += amount;
    });
    
    return { income, expense, balance: income - expense, byCategory, byDay, transactions: txs, startDate: startStr, endDate: endStr };
  },

  async getYearSummary(year) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    
    const txs = await this.getTransactionsByDateRange(start, end);
    
    let income = 0, expense = 0;
    const byCategory = {};
    const byMonth = {};
    
    txs.forEach(tx => {
      const amount = CurrencyManager.convert(tx.amount, tx.currency);
      const month = tx.date.substring(0, 7); // YYYY-MM
      if (tx.type === 'income') {
        income += amount;
      } else {
        expense += amount;
        byCategory[tx.category] = (byCategory[tx.category] || 0) + amount;
      }
      byMonth[month] = byMonth[month] || { income: 0, expense: 0 };
      byMonth[month][tx.type] += amount;
    });
    
    return { income, expense, balance: income - expense, byCategory, byMonth, transactions: txs };
  }
};
