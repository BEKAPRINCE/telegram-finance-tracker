/* ═══════════════════════════════════════════════════════
   Export Module — JSON/CSV export and import
   ═══════════════════════════════════════════════════════ */

const ExportManager = {
  // Download a file via Blob
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Export all data as JSON (full backup)
  async exportJSON() {
    try {
      const data = await DB.exportAll();
      const json = JSON.stringify(data, null, 2);
      const date = new Date().toISOString().split('T')[0];
      this.downloadFile(json, `finance-backup-${date}.json`, 'application/json');
      UI.showToast('Бэкап сохранён!', 'success');
    } catch (err) {
      console.error('Export JSON error:', err);
      UI.showToast('Ошибка экспорта', 'error');
    }
  },

  // Export transactions as CSV (for Excel)
  async exportCSV() {
    try {
      const txs = await DB.getAllTransactions();
      if (txs.length === 0) {
        UI.showToast('Нет данных для экспорта', 'info');
        return;
      }

      const categories = await DB.getCategories();
      const catMap = {};
      categories.forEach(c => catMap[c.name] = c);

      // CSV header
      const rows = [['Дата', 'Тип', 'Категория', 'Сумма', 'Валюта', 'Комментарий']];
      
      txs.forEach(tx => {
        rows.push([
          tx.date,
          tx.type === 'income' ? 'Доход' : 'Расход',
          tx.category,
          tx.amount.toString(),
          tx.currency,
          (tx.comment || '').replace(/"/g, '""'),
        ]);
      });

      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      // Add BOM for correct UTF-8 in Excel
      const bom = '\uFEFF';
      const date = new Date().toISOString().split('T')[0];
      this.downloadFile(bom + csv, `finance-${date}.csv`, 'text/csv;charset=utf-8');
      UI.showToast('CSV экспортирован!', 'success');
    } catch (err) {
      console.error('Export CSV error:', err);
      UI.showToast('Ошибка экспорта', 'error');
    }
  },

  // Import data from JSON backup
  async importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (!data.version || !data.data) {
            UI.showToast('Неверный формат файла', 'error');
            reject(new Error('Invalid format'));
            return;
          }

          await DB.importAll(data);
          UI.showToast('Данные импортированы!', 'success');
          resolve();
        } catch (err) {
          console.error('Import error:', err);
          UI.showToast('Ошибка импорта: ' + err.message, 'error');
          reject(err);
        }
      };
      reader.onerror = () => {
        UI.showToast('Ошибка чтения файла', 'error');
        reject(new Error('File read error'));
      };
      reader.readAsText(file);
    });
  }
};
