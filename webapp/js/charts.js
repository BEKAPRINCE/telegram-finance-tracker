/* ═══════════════════════════════════════════════════════
   Charts Module — Chart.js visualizations
   ═══════════════════════════════════════════════════════ */

const Charts = {
  instances: {},

  // Common chart defaults for dark theme
  defaults: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(22, 27, 34, 0.95)',
        titleColor: '#e6edf3',
        bodyColor: '#8b949e',
        borderColor: 'rgba(240, 246, 252, 0.1)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 10,
        titleFont: { family: 'Inter', weight: '600' },
        bodyFont: { family: 'Inter' },
      },
    },
  },

  // Destroy existing chart instance
  destroy(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  // ── Doughnut Chart (Dashboard & Analytics) ────────────

  createDoughnutChart(canvasId, data, emptyId) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    const emptyEl = document.getElementById(emptyId);
    if (!canvas) return;

    if (!data || Object.keys(data).length === 0) {
      if (emptyEl) emptyEl.style.display = 'flex';
      canvas.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    canvas.style.display = 'block';

    const labels = Object.keys(data);
    const values = Object.values(data);
    const colors = labels.map((_, i) => Categories.getColor(i));

    this.instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: 'rgba(13, 17, 23, 0.8)',
          borderWidth: 2,
          borderRadius: 4,
          hoverOffset: 6,
        }]
      },
      options: {
        ...this.defaults,
        cutout: '65%',
        plugins: {
          ...this.defaults.plugins,
          tooltip: {
            ...this.defaults.plugins.tooltip,
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.raw / total) * 100).toFixed(1);
                return `${ctx.label}: ${CurrencyManager.format(ctx.raw)} (${pct}%)`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          duration: 800,
          easing: 'easeOutQuart',
        }
      }
    });
  },

  // ── Line Chart (Trend) ────────────────────────────────

  createLineChart(canvasId, labels, incomeData, expenseData) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Расходы',
            data: expenseData,
            borderColor: '#f85149',
            backgroundColor: 'rgba(248, 81, 73, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#f85149',
            pointBorderColor: '#0d1117',
            pointBorderWidth: 2,
            pointHoverRadius: 5,
          },
          {
            label: 'Доходы',
            data: incomeData,
            borderColor: '#3fb950',
            backgroundColor: 'rgba(63, 185, 80, 0.08)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#3fb950',
            pointBorderColor: '#0d1117',
            pointBorderWidth: 2,
            pointHoverRadius: 5,
          }
        ]
      },
      options: {
        ...this.defaults,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            grid: { color: 'rgba(240, 246, 252, 0.04)' },
            ticks: {
              color: '#6e7681',
              font: { family: 'Inter', size: 11 },
              maxRotation: 0,
            },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(240, 246, 252, 0.04)' },
            ticks: {
              color: '#6e7681',
              font: { family: 'Inter', size: 11 },
              callback: (val) => CurrencyManager.formatNumber(val),
            },
            border: { display: false },
            beginAtZero: true,
          }
        },
        plugins: {
          ...this.defaults.plugins,
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: '#8b949e',
              font: { family: 'Inter', size: 11 },
              boxWidth: 12,
              boxHeight: 12,
              borderRadius: 3,
              useBorderRadius: true,
              padding: 12,
            }
          },
          tooltip: {
            ...this.defaults.plugins.tooltip,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${CurrencyManager.format(ctx.raw)}`
            }
          }
        },
        animation: {
          duration: 800,
          easing: 'easeOutQuart',
        }
      }
    });
  },

  // ── Bar Chart (Income vs Expense) ─────────────────────

  createBarChart(canvasId, labels, incomeData, expenseData) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Доходы',
            data: incomeData,
            backgroundColor: 'rgba(63, 185, 80, 0.7)',
            borderColor: '#3fb950',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Расходы',
            data: expenseData,
            backgroundColor: 'rgba(248, 81, 73, 0.7)',
            borderColor: '#f85149',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
          }
        ]
      },
      options: {
        ...this.defaults,
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#6e7681',
              font: { family: 'Inter', size: 11 },
              maxRotation: 0,
            },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(240, 246, 252, 0.04)' },
            ticks: {
              color: '#6e7681',
              font: { family: 'Inter', size: 11 },
              callback: (val) => CurrencyManager.formatNumber(val),
            },
            border: { display: false },
            beginAtZero: true,
          }
        },
        plugins: {
          ...this.defaults.plugins,
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: '#8b949e',
              font: { family: 'Inter', size: 11 },
              boxWidth: 12,
              boxHeight: 12,
              borderRadius: 3,
              useBorderRadius: true,
              padding: 12,
            }
          },
          tooltip: {
            ...this.defaults.plugins.tooltip,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${CurrencyManager.format(ctx.raw)}`
            }
          }
        },
        animation: {
          duration: 800,
          easing: 'easeOutQuart',
        }
      }
    });
  }
};
