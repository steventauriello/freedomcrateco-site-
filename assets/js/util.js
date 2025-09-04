window.FC = window.FC || {};
FC.storage = {
  get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(_) { return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};
FC.formatPrice = n => '$' + (isNaN(n)?'0.00':Number(n).toFixed(2));
