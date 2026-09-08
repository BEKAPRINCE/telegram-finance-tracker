/* ═══════════════════════════════════════════════════════
   UI Module — Screen navigation, rendering, interactions
   ═══════════════════════════════════════════════════════ */

const UI = {
  currentScreen: 'dashboard',
  selectedType: 'expense',
  selectedCategory: null,
  selectedCurrency: 'KZT',
  analyticsPeriod: 'week',

  // ── Toast Notifications ────────────────────────────────

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  },

  // ── Screen Navigation ─────────────────────────────────

  navigateTo(screen) {
    const prev = document.querySelector('.screen.active');
    if (prev) prev.classList.remove('active');
    
    const next = document.getElementById(`screen-${screen}`);
    if (next) {
      next.classList.add('active');
      next.style.animation = 'none';
      next.offsetHeight; // reflow
      next.style.animation = '';
    }

    // Update nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === screen);
    });

    this.currentScreen = screen;
    if (window.App?.updateTelegramBackButton) {
      window.App.updateTelegramBackButton(screen);
    }

    // Refresh screen content
    this.refreshScreen(screen);
  },

  async refreshScreen(screen) {
    switch (screen) {
      case 'dashboard': await this.renderDashboard(); break;
      case 'analytics': await this.renderAnalytics(); break;
      case 'budgets': await this.renderBudgets(); break;
      case 'add': this.renderAddScreen(); break;
      case 'settings': await this.renderSettings(); break;
    }
  },

  // ── Dashboard Rendering ────────────────────────────────

  async renderDashboard() {
    const now = new Date();
    const summary = await DB.getMonthSummary(now.getFullYear(), now.getMonth());
    
    // Balance
    const balanceEl = document.getElementById('balance-amount');
    balanceEl.textContent = CurrencyManager.format(summary.balance);
    balanceEl.className = 'balance-amount ' + (summary.balance > 0 ? 'positive' : summary.balance < 0 ? 'negative' : 'zero');
    
    document.getElementById('income-amount').textContent = CurrencyManager.format(summary.income);
    document.getElementById('expense-amount').textContent = CurrencyManager.format(summary.expense);

    // Doughnut chart
    Charts.createDoughnutChart('dashboard-chart', summary.byCategory, 'dashboard-chart-empty');

    // Recent transactions
    const recent = await DB.getRecentTransactions(5);
    this.renderTransactionsList('recent-transactions', recent);
  },

  // ── Render Transactions List ───────────────────────────

  async renderTransactionsList(containerId, transactions) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!transactions || transactions.length === 0) {
      container.innerHTML = '<p class="empty-state">Нет транзакций. Нажмите + чтобы добавить</p>';
      return;
    }

    const categories = await DB.getCategories();
    const catMap = {};
    categories.forEach(c => { catMap[c.name] = c; });

    container.innerHTML = transactions.map((tx, i) => {
      const cat = catMap[tx.category] || { icon: '📌', color: '#8b949e' };
      const isIncome = tx.type === 'income';
      const sign = isIncome ? '+' : '-';
      const dateStr = this.formatDate(tx.date);
      const comment = tx.comment ? ` · ${tx.comment}` : '';
      
      return `
        <div class="tx-item" style="animation-delay: ${i * 0.05}s" data-tx-id="${tx.id}">
          <div class="tx-icon" style="background: ${cat.color}20; color: ${cat.color}">
            ${cat.icon}
          </div>
          <div class="tx-info">
            <p class="tx-category">${tx.category}</p>
            <p class="tx-meta">${dateStr}${comment}</p>
          </div>
          <span class="tx-amount ${tx.type}">${sign}${CurrencyManager.format(tx.amount, tx.currency)}</span>
        </div>
      `;
    }).join('');

    // Swipe to delete (simple: long press)
    container.querySelectorAll('.tx-item').forEach(item => {
      let timer;
      item.addEventListener('touchstart', () => {
        timer = setTimeout(() => {
          const id = parseInt(item.dataset.txId);
          this.confirmDeleteTransaction(id);
        }, 600);
      });
      item.addEventListener('touchend', () => clearTimeout(timer));
      item.addEventListener('touchmove', () => clearTimeout(timer));
    });
  },

  confirmDeleteTransaction(id) {
    this.showModal('Удалить операцию?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', class: 'secondary', action: () => this.hideModal() },
      { text: 'Удалить', class: 'danger', action: async () => {
        await DB.deleteTransaction(id);
        this.hideModal();
        this.showToast('Операция удалена', 'success');
        this.refreshScreen(this.currentScreen);
      }},
    ]);
  },

  // ── Add Transaction Screen ─────────────────────────────

  async renderAddScreen() {
    // Set today's date
    const dateInput = document.getElementById('tx-date');
    dateInput.value = new Date().toISOString().split('T')[0];

    // Clear previous values
    document.getElementById('amount-input').value = '';
    document.getElementById('tx-comment').value = '';
    this.selectedCategory = null;

    // Render categories
    await this.renderCategoryGrid();

    // Render currency selector
    this.renderCurrencySelector('currency-selector', this.selectedCurrency, (code) => {
      this.selectedCurrency = code;
      document.getElementById('amount-currency').textContent = CurrencyManager.getSymbol(code);
    });

    // Update currency display
    document.getElementById('amount-currency').textContent = CurrencyManager.getSymbol(this.selectedCurrency);

    // Focus amount
    setTimeout(() => document.getElementById('amount-input').focus(), 300);
  },

  async renderCategoryGrid() {
    const grid = document.getElementById('category-grid');
    const cats = await Categories.getByType(this.selectedType);
    
    grid.innerHTML = cats.map(cat => `
      <button class="cat-btn" data-cat="${cat.name}" aria-label="${cat.name}">
        <span class="cat-icon">${cat.icon}</span>
        <span class="cat-name">${cat.name}</span>
      </button>
    `).join('');

    grid.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedCategory = btn.dataset.cat;
      });
    });
  },

  // ── Currency Selector ──────────────────────────────────

  renderCurrencySelector(containerId, selectedCode, onChange) {
    const container = document.getElementById(containerId);
    container.innerHTML = CurrencyManager.currencies.map(cur => `
      <button class="cur-btn ${cur.code === selectedCode ? 'selected' : ''}" data-cur="${cur.code}">
        ${cur.flag} ${cur.code}
      </button>
    `).join('');

    container.querySelectorAll('.cur-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cur-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        onChange(btn.dataset.cur);
      });
    });
  },

  // ── Save Transaction ───────────────────────────────────

  async saveTransaction() {
    const amount = parseFloat(document.getElementById('amount-input').value);
    const date = document.getElementById('tx-date').value;
    const comment = document.getElementById('tx-comment').value.trim();

    if (!amount || amount <= 0) {
      this.showToast('Введите сумму', 'error');
      document.getElementById('amount-input').parentElement.classList.add('animate-shake');
      setTimeout(() => document.getElementById('amount-input').parentElement.classList.remove('animate-shake'), 400);
      return;
    }

    if (!this.selectedCategory) {
      this.showToast('Выберите категорию', 'error');
      return;
    }

    const tx = {
      type: this.selectedType,
      amount,
      currency: this.selectedCurrency,
      category: this.selectedCategory,
      date,
      comment: comment || null,
    };

    await DB.addTransaction(tx);

    // Success animation
    const btn = document.getElementById('btn-save-tx');
    btn.classList.add('success');
    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-check').style.display = 'inline';

    this.showToast(this.selectedType === 'income' ? 'Доход добавлен!' : 'Расход добавлен!', 'success');

    // Haptic feedback (Telegram)
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }

    setTimeout(() => {
      btn.classList.remove('success');
      btn.querySelector('.btn-text').style.display = 'inline';
      btn.querySelector('.btn-check').style.display = 'none';
      this.navigateTo('dashboard');
    }, 800);
  },

  // ── Analytics Rendering ────────────────────────────────

  async renderAnalytics() {
    let summary;
    let trendLabels = [];
    let trendIncome = [];
    let trendExpense = [];
    let barLabels = [];
    let barIncome = [];
    let barExpense = [];

    const now = new Date();

    if (this.analyticsPeriod === 'week') {
      summary = await DB.getWeekSummary();
      // Daily trend for the week
      const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      const startDate = new Date(summary.startDate);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        trendLabels.push(days[i]);
        trendIncome.push(summary.byDay[dateStr]?.income || 0);
        trendExpense.push(summary.byDay[dateStr]?.expense || 0);
      }
      barLabels = [...trendLabels];
      barIncome = [...trendIncome];
      barExpense = [...trendExpense];

    } else if (this.analyticsPeriod === 'month') {
      summary = await DB.getMonthSummary(now.getFullYear(), now.getMonth());
      // Get daily breakdown for the month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const byDay = {};
      summary.transactions.forEach(tx => {
        const amount = CurrencyManager.convert(tx.amount, tx.currency);
        byDay[tx.date] = byDay[tx.date] || { income: 0, expense: 0 };
        byDay[tx.date][tx.type] += amount;
      });
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        trendLabels.push(String(i));
        trendIncome.push(byDay[dateStr]?.income || 0);
        trendExpense.push(byDay[dateStr]?.expense || 0);
      }
      // Bar chart: weekly aggregates
      const weeks = ['Нед 1', 'Нед 2', 'Нед 3', 'Нед 4', 'Нед 5'];
      const weekInc = [0, 0, 0, 0, 0];
      const weekExp = [0, 0, 0, 0, 0];
      summary.transactions.forEach(tx => {
        const day = parseInt(tx.date.split('-')[2]);
        const weekIdx = Math.min(Math.floor((day - 1) / 7), 4);
        const amount = CurrencyManager.convert(tx.amount, tx.currency);
        if (tx.type === 'income') weekInc[weekIdx] += amount;
        else weekExp[weekIdx] += amount;
      });
      barLabels = weeks;
      barIncome = weekInc;
      barExpense = weekExp;

    } else {
      // year
      summary = await DB.getYearSummary(now.getFullYear());
      const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
      for (let i = 0; i < 12; i++) {
        const key = `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
        trendLabels.push(months[i]);
        trendIncome.push(summary.byMonth[key]?.income || 0);
        trendExpense.push(summary.byMonth[key]?.expense || 0);
      }
      barLabels = [...trendLabels];
      barIncome = [...trendIncome];
      barExpense = [...trendExpense];
    }

    // Summary cards
    document.getElementById('analytics-income').textContent = CurrencyManager.format(summary.income);
    document.getElementById('analytics-expense').textContent = CurrencyManager.format(summary.expense);

    // Charts
    Charts.createLineChart('trend-chart', trendLabels, trendIncome, trendExpense);
    Charts.createDoughnutChart('category-chart', summary.byCategory);
    Charts.createBarChart('comparison-chart', barLabels, barIncome, barExpense);

    // Category breakdown list
    this.renderCategoryBreakdown(summary.byCategory, summary.expense);
  },

  renderCategoryBreakdown(byCategory, totalExpense) {
    const container = document.getElementById('category-breakdown');
    if (!container) return;

    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    
    if (entries.length === 0) {
      container.innerHTML = '<p class="empty-state" style="padding:8px 0;">Нет данных</p>';
      return;
    }

    container.innerHTML = entries.map(([cat, amount], i) => {
      const pct = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(0) : 0;
      return `
        <div class="cat-row">
          <span class="cat-dot" style="background: ${Categories.getColor(i)}"></span>
          <span class="cat-row-name">${cat}</span>
          <span class="cat-row-amount">${CurrencyManager.format(amount)}</span>
          <span class="cat-row-pct">${pct}%</span>
        </div>
      `;
    }).join('');
  },

  // ── Budgets Rendering ──────────────────────────────────

  async renderBudgets() {
    const budgets = await BudgetManager.getBudgetsWithSpending();
    const container = document.getElementById('budgets-list');
    const categories = await DB.getCategories();
    const catMap = {};
    categories.forEach(c => { catMap[c.name] = c; });

    if (budgets.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-icon">📋</p>
          <p>Нет бюджетов</p>
          <p class="empty-hint">Нажмите + чтобы установить лимиты</p>
        </div>
      `;
      return;
    }

    container.innerHTML = budgets.map(b => {
      const cat = catMap[b.category] || { icon: '📌', color: '#8b949e' };
      const periodLabel = b.period === 'monthly' ? '/мес' : '/нед';
      return `
        <div class="budget-item glass-card" data-budget-id="${b.id}">
          <div class="budget-header">
            <div class="budget-cat">
              <span class="budget-cat-icon">${cat.icon}</span>
              <span class="budget-cat-name">${b.category}</span>
            </div>
            <div class="budget-amounts">
              <span class="budget-spent" style="color: ${b.status === 'danger' ? 'var(--expense-color)' : b.status === 'warning' ? '#e3b341' : 'var(--text-primary)'}">
                ${CurrencyManager.format(b.spent, b.currency)}
              </span>
              <span class="budget-limit"> / ${CurrencyManager.format(b.limit, b.currency)}${periodLabel}</span>
            </div>
          </div>
          <div class="budget-bar-bg">
            <div class="budget-bar-fill ${b.status}" style="width: ${b.percentage}%"></div>
          </div>
          <button class="budget-delete" data-del-budget="${b.id}">Удалить</button>
        </div>
      `;
    }).join('');

    // Delete handlers
    container.querySelectorAll('[data-del-budget]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.delBudget);
        await DB.deleteBudget(id);
        this.showToast('Бюджет удалён', 'success');
        this.renderBudgets();
      });
    });
  },

  // ── Add Budget Modal ───────────────────────────────────

  async showAddBudgetModal() {
    const categories = await Categories.getByType('expense');
    const catOptions = categories.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('');
    const curOptions = CurrencyManager.currencies.map(c => 
      `<option value="${c.code}" ${c.code === CurrencyManager.getMainCurrency() ? 'selected' : ''}>${c.flag} ${c.code}</option>`
    ).join('');

    const body = `
      <select class="modal-select" id="budget-category">${catOptions}</select>
      <input class="modal-input" id="budget-limit" type="number" inputmode="decimal" placeholder="Лимит" min="0" step="1">
      <select class="modal-select" id="budget-currency">${curOptions}</select>
      <select class="modal-select" id="budget-period">
        <option value="monthly">Ежемесячно</option>
        <option value="weekly">Еженедельно</option>
      </select>
    `;

    this.showModal('Новый бюджет', body, [
      { text: 'Отмена', class: 'secondary', action: () => this.hideModal() },
      { text: 'Создать', class: 'primary', action: async () => {
        const category = document.getElementById('budget-category').value;
        const limit = parseFloat(document.getElementById('budget-limit').value);
        const currency = document.getElementById('budget-currency').value;
        const period = document.getElementById('budget-period').value;

        if (!limit || limit <= 0) {
          this.showToast('Введите лимит', 'error');
          return;
        }

        await DB.addBudget({ category, limit, currency, period });
        this.hideModal();
        this.showToast('Бюджет создан!', 'success');
        this.renderBudgets();
      }},
    ]);
  },

  // ── Settings Rendering ─────────────────────────────────

  async renderSettings() {
    // Main currency
    this.renderCurrencySelector('main-currency-selector', CurrencyManager.getMainCurrency(), async (code) => {
      await CurrencyManager.setMainCurrency(code);
      this.selectedCurrency = code;
      this.showToast(`Основная валюта: ${code}`, 'success');
    });

    // Categories list
    const cats = await DB.getCategories();
    const list = document.getElementById('categories-manage-list');
    
    list.innerHTML = cats.map(c => `
      <div class="cat-manage-item">
        <span class="cat-manage-icon">${c.icon}</span>
        <span class="cat-manage-name">${c.name}</span>
        <span class="cat-manage-type">${c.type === 'income' ? 'Доход' : 'Расход'}</span>
        <button class="cat-manage-del" data-del-cat="${c.id}" title="Удалить">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.delCat);
        await DB.deleteCategory(id);
        this.showToast('Категория удалена', 'success');
        this.renderSettings();
      });
    });
  },

  // ── Add Category Modal ─────────────────────────────────

  showAddCategoryModal() {
    const body = `
      <input class="modal-input" id="new-cat-icon" type="text" placeholder="Иконка (emoji)" maxlength="4">
      <input class="modal-input" id="new-cat-name" type="text" placeholder="Название" maxlength="30">
      <select class="modal-select" id="new-cat-type">
        <option value="expense">Расход</option>
        <option value="income">Доход</option>
      </select>
    `;

    this.showModal('Новая категория', body, [
      { text: 'Отмена', class: 'secondary', action: () => this.hideModal() },
      { text: 'Добавить', class: 'primary', action: async () => {
        const icon = document.getElementById('new-cat-icon').value.trim() || '📌';
        const name = document.getElementById('new-cat-name').value.trim();
        const type = document.getElementById('new-cat-type').value;

        if (!name) {
          this.showToast('Введите название', 'error');
          return;
        }

        await DB.addCategory({ name, icon, color: '#8b949e', type });
        this.hideModal();
        this.showToast('Категория добавлена!', 'success');
        this.renderSettings();
      }},
    ]);
  },

  // ── Modal System ───────────────────────────────────────

  showModal(title, bodyHTML, buttons) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    
    const actions = document.getElementById('modal-actions');
    actions.innerHTML = '';
    buttons.forEach(btn => {
      const el = document.createElement('button');
      el.className = `modal-btn ${btn.class}`;
      el.textContent = btn.text;
      el.addEventListener('click', btn.action);
      actions.appendChild(el);
    });

    document.getElementById('modal-overlay').classList.add('active');
  },

  hideModal() {
    document.getElementById('modal-overlay').classList.remove('active');
  },

  // ── Date Formatting ────────────────────────────────────

  formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.getTime() === today.getTime()) return 'Сегодня';
    if (date.getTime() === yesterday.getTime()) return 'Вчера';

    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  },
};
