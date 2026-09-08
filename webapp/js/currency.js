/* ═══════════════════════════════════════════════════════
   Currency Module — Multi-currency support with conversion
   ═══════════════════════════════════════════════════════ */

const CurrencyManager = {
  currencies: [
    { code: 'KZT', symbol: '₸', name: 'Тенге', flag: '🇰🇿' },
    { code: 'RUB', symbol: '₽', name: 'Рубль', flag: '🇷🇺' },
    { code: 'USD', symbol: '$', name: 'Доллар', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', name: 'Евро', flag: '🇪🇺' },
    { code: 'UZS', symbol: 'сўм', name: 'Сум', flag: '🇺🇿' },
    { code: 'GBP', symbol: '£', name: 'Фунт', flag: '🇬🇧' },
    { code: 'TRY', symbol: '₺', name: 'Лира', flag: '🇹🇷' },
  ],

  // Default fallback rates relative to USD
  fallbackRates: {
    USD: 1,
    EUR: 0.92,
    RUB: 96.5,
    KZT: 462.0,
    UZS: 12800,
    GBP: 0.79,
    TRY: 34.2,
  },

  _rates: null,
  _mainCurrency: 'KZT',
  _lastUpdate: null,

  async init() {
    this._mainCurrency = await DB.getSetting('mainCurrency', 'KZT');
    await this.loadRates();
  },

  async loadRates() {
    // Try to load cached rates first
    const cached = await DB.getSetting('exchangeRates', null);
    const cacheTime = await DB.getSetting('exchangeRatesTime', null);

    // Use cache if less than 12 hours old
    if (cached && cacheTime) {
      const age = Date.now() - new Date(cacheTime).getTime();
      if (age < 12 * 60 * 60 * 1000) {
        this._rates = cached;
        this._lastUpdate = cacheTime;
        return;
      }
    }

    // Fetch fresh rates
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        if (data.rates) {
          this._rates = data.rates;
          this._lastUpdate = new Date().toISOString();
          await DB.setSetting('exchangeRates', this._rates);
          await DB.setSetting('exchangeRatesTime', this._lastUpdate);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch exchange rates, using fallback:', e.message);
    }

    // Use cached or fallback
    this._rates = cached || this.fallbackRates;
  },

  // Convert amount from sourceCurrency to main currency
  convert(amount, fromCurrency, toCurrency = null) {
    const target = toCurrency || this._mainCurrency;
    if (fromCurrency === target) return amount;

    const rates = this._rates || this.fallbackRates;
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[target] || 1;

    // Convert to USD first, then to target
    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  },

  // Format amount with currency symbol
  format(amount, currencyCode = null) {
    const code = currencyCode || this._mainCurrency;
    const cur = this.currencies.find(c => c.code === code);
    const symbol = cur ? cur.symbol : code;
    
    // Format number with proper separators
    const formatted = this.formatNumber(amount);
    return `${formatted} ${symbol}`;
  },

  // Format number with thousand separators
  formatNumber(num) {
    if (num === 0) return '0';
    const isNeg = num < 0;
    const abs = Math.abs(num);
    
    let formatted;
    if (abs >= 1000000) {
      formatted = (abs / 1000000).toFixed(1) + 'M';
    } else if (abs >= 100000) {
      formatted = Math.round(abs).toLocaleString('ru-RU');
    } else {
      formatted = abs % 1 === 0 
        ? Math.round(abs).toLocaleString('ru-RU')
        : abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    
    return isNeg ? `-${formatted}` : formatted;
  },

  getSymbol(code = null) {
    const c = code || this._mainCurrency;
    const cur = this.currencies.find(x => x.code === c);
    return cur ? cur.symbol : c;
  },

  getMainCurrency() {
    return this._mainCurrency;
  },

  async setMainCurrency(code) {
    this._mainCurrency = code;
    await DB.setSetting('mainCurrency', code);
  }
};
