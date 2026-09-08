/* ═══════════════════════════════════════════════════════
   App Module — Main entry point, initialization, events,
   and Telegram Mini App Safe Area integration
   ═══════════════════════════════════════════════════════ */

const App = {
  async init() {
    try {
      // ── Initialize Telegram WebApp SDK ──────────────────
      this.initTelegram();

      // Initialize database defaults
      await DB.initDefaultCategories();

      // Initialize currency manager
      await CurrencyManager.init();
      UI.selectedCurrency = CurrencyManager.getMainCurrency();

      // Bind all event listeners
      this.bindEvents();

      // Render initial dashboard
      await UI.renderDashboard();

      // Hide splash, show app
      setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
          splash.classList.add('fade-out');
          document.getElementById('screens').style.display = 'block';
          document.getElementById('bottom-nav').style.display = 'flex';
          setTimeout(() => splash.remove(), 450);
        }
      }, 600);

    } catch (err) {
      console.error('App init error:', err);
      UI.showToast('Ошибка загрузки: ' + err.message, 'error');
    }
  },

  initTelegram() {
    if (!window.Telegram?.WebApp) return;
    const tg = window.Telegram.WebApp;

    tg.ready();
    tg.expand();

    if (tg.enableClosingConfirmation) {
      tg.enableClosingConfirmation();
    }

    if (tg.setHeaderColor) tg.setHeaderColor('#0d1117');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#0d1117');

    // ── Safe Area Inset Synchronization ─────────────────
    const syncSafeArea = () => {
      // Content safe area takes precedence over viewport safe area
      const top = tg.contentSafeAreaInset?.top ?? tg.safeAreaInset?.top ?? 0;
      const bottom = tg.contentSafeAreaInset?.bottom ?? tg.safeAreaInset?.bottom ?? 0;
      const left = tg.contentSafeAreaInset?.left ?? tg.safeAreaInset?.left ?? 0;
      const right = tg.contentSafeAreaInset?.right ?? tg.safeAreaInset?.right ?? 0;

      const root = document.documentElement;
      if (top > 0) root.style.setProperty('--tg-safe-top-js', `${top}px`);
      if (bottom > 0) root.style.setProperty('--tg-safe-bottom-js', `${bottom}px`);
      if (left > 0) root.style.setProperty('--tg-safe-left-js', `${left}px`);
      if (right > 0) root.style.setProperty('--tg-safe-right-js', `${right}px`);
    };

    syncSafeArea();
    tg.onEvent?.('viewportChanged', syncSafeArea);
    tg.onEvent?.('safeAreaChanged', syncSafeArea);
    tg.onEvent?.('contentSafeAreaChanged', syncSafeArea);

    // ── Telegram Native BackButton ───────────────────────
    if (tg.BackButton) {
      tg.BackButton.onClick(() => {
        if (UI.currentScreen !== 'dashboard') {
          UI.navigateTo('dashboard');
        } else {
          tg.close();
        }
      });
    }
  },

  updateTelegramBackButton(screen) {
    if (!window.Telegram?.WebApp?.BackButton) return;
    const bb = window.Telegram.WebApp.BackButton;
    if (screen !== 'dashboard') {
      bb.show();
    } else {
      bb.hide();
    }
  },

  bindEvents() {
    // ── Bottom Navigation ────────────────────────────────
    document.querySelectorAll('.nav-btn[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.navigateTo(btn.dataset.nav);
        this.updateTelegramBackButton(btn.dataset.nav);
      });
    });

    // ── Back Buttons ─────────────────────────────────────
    document.querySelectorAll('[data-back]').forEach(btn => {
      btn.addEventListener('click', () => {
        UI.navigateTo('dashboard');
        this.updateTelegramBackButton('dashboard');
      });
    });

    // ── Settings Button (Dashboard) ──────────────────────
    document.getElementById('btn-settings').addEventListener('click', () => {
      UI.navigateTo('settings');
      this.updateTelegramBackButton('settings');
    });

    // ── View All Transactions ────────────────────────────
    document.getElementById('btn-view-all').addEventListener('click', async () => {
      UI.navigateTo('analytics');
      this.updateTelegramBackButton('analytics');
    });

    // ── Transaction Type Toggle ──────────────────────────
    const typeToggle = document.querySelector('.type-toggle');
    document.getElementById('type-expense').addEventListener('click', async () => {
      UI.selectedType = 'expense';
      document.getElementById('type-expense').classList.add('active');
      document.getElementById('type-income').classList.remove('active');
      typeToggle.setAttribute('data-type', 'expense');
      await UI.renderCategoryGrid();
    });

    document.getElementById('type-income').addEventListener('click', async () => {
      UI.selectedType = 'income';
      document.getElementById('type-income').classList.add('active');
      document.getElementById('type-expense').classList.remove('active');
      typeToggle.setAttribute('data-type', 'income');
      await UI.renderCategoryGrid();
    });

    // Initialize toggle state
    typeToggle.setAttribute('data-type', 'expense');

    // ── Save Transaction ─────────────────────────────────
    document.getElementById('btn-save-tx').addEventListener('click', () => {
      UI.saveTransaction();
    });

    // ── Analytics Period Buttons ──────────────────────────
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        UI.analyticsPeriod = btn.dataset.period;
        UI.renderAnalytics();
      });
    });

    // ── Budget: Add ──────────────────────────────────────
    document.getElementById('btn-add-budget').addEventListener('click', () => {
      UI.showAddBudgetModal();
    });

    // ── Settings: Export/Import ──────────────────────────
    document.getElementById('btn-export-json').addEventListener('click', () => {
      ExportManager.exportJSON();
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
      ExportManager.exportCSV();
    });

    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });

    document.getElementById('import-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      UI.showModal('Импорт данных', 
        '⚠️ Текущие данные будут полностью заменены данными из файла. Продолжить?', [
        { text: 'Отмена', class: 'secondary', action: () => { UI.hideModal(); e.target.value = ''; }},
        { text: 'Импорт', class: 'primary', action: async () => {
          await ExportManager.importJSON(file);
          UI.hideModal();
          e.target.value = '';
          // Re-init
          await CurrencyManager.init();
          UI.selectedCurrency = CurrencyManager.getMainCurrency();
          UI.navigateTo('dashboard');
          App.updateTelegramBackButton('dashboard');
        }},
      ]);
    });

    // ── Settings: Add Category ───────────────────────────
    document.getElementById('btn-add-category').addEventListener('click', () => {
      UI.showAddCategoryModal();
    });

    // ── Settings: Clear Data ─────────────────────────────
    document.getElementById('btn-clear-data').addEventListener('click', () => {
      UI.showModal('Очистить все данные?', 
        '🗑️ Все транзакции, категории, бюджеты и настройки будут удалены. Это действие нельзя отменить!', [
        { text: 'Отмена', class: 'secondary', action: () => UI.hideModal() },
        { text: 'Очистить', class: 'danger', action: async () => {
          await DB.clearAll();
          await DB.initDefaultCategories();
          await CurrencyManager.init();
          UI.hideModal();
          UI.showToast('Данные очищены', 'success');
          UI.navigateTo('dashboard');
          App.updateTelegramBackButton('dashboard');
        }},
      ]);
    });

    // ── Modal: Close on backdrop click ───────────────────
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        UI.hideModal();
      }
    });
  }
};

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
