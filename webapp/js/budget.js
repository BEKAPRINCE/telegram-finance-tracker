/* ═══════════════════════════════════════════════════════
   Budget Module — Budget limits and tracking
   ═══════════════════════════════════════════════════════ */

const BudgetManager = {
  async getBudgetsWithSpending() {
    const budgets = await DB.getBudgets();
    const now = new Date();
    const results = [];

    for (const budget of budgets) {
      let startDate, endDate;

      if (budget.period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else {
        // weekly
        const day = now.getDay() || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - day + 1);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        startDate = monday.toISOString().split('T')[0];
        endDate = sunday.toISOString().split('T')[0];
      }

      const txs = await DB.getTransactionsByDateRange(startDate, endDate);
      const spent = txs
        .filter(tx => tx.type === 'expense' && tx.category === budget.category)
        .reduce((sum, tx) => sum + CurrencyManager.convert(tx.amount, tx.currency, budget.currency), 0);

      const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      let status = 'safe';
      if (percentage >= 100) status = 'danger';
      else if (percentage >= 75) status = 'warning';

      results.push({
        ...budget,
        spent,
        percentage: Math.min(percentage, 100),
        remaining: Math.max(budget.limit - spent, 0),
        status
      });
    }

    return results;
  },

  // Check if any budget is exceeded — for notifications
  async checkAlerts() {
    const budgets = await this.getBudgetsWithSpending();
    return budgets.filter(b => b.status === 'danger' || b.status === 'warning');
  }
};
