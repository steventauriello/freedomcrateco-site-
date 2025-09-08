// assets/js/data.js
// Loads products.json (preferred) or products.csv (fallback)
// Exposes: window.PRODUCTS (map) and window.FC with:
//   - FC.loadProducts() -> Promise<Array<Product>>
//   - FC.formatPrice(number) -> string
//   - FC.storage.get/set(key, value)

window.PRODUCTS = {};
window.FC = window.FC || {};

(function () {
  // ---- public helpers expected by catalog.js ----
  FC.formatPrice = function (n) {
    return '$' + (Number(n || 0)).toFixed(2);
  };

  FC.storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : (fallback ?? null);
      } catch {
        return fallback ?? null;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
  };

  // ---- loading pipeline ----
  async function loadProducts() {
    // Try JSON first
    try {
      const r = await fetch('assets/data/products.json', { cache: 'no-store' });
      if (r.ok) {
        const obj = await r.json();
        normalizeProducts(obj);
        window.PRODUCTS = obj;
        // return as array for convenience
        return Object.values(obj);
      }
    } catch (e) {
      console.warn('products.json not found or invalid, trying CSV…', e);
    }

    // Fallback to CSV
    try {
      const r = await fetch('assets/data/products.csv', { cache: 'no-store' });
      if (!r.ok) throw new Error('CSV not found');
      const text = await r.text();
      const map = csvToProducts(text);
      normalizeProducts(map);
      window.PRODUCTS = map;
      return Object.values(map);
    } catch (e) {
      console.error('Failed to load products.csv', e);
      window.PRODUCTS = {};
      return [];
    }
  }

  // expose the loader under FC as catalog.js expects
  FC.loadProducts = loadProducts;

  // ---- normalization + CSV helpers ----
  function normalizeProducts(map) {
    for (const [sku, p] of Object.entries(map || {})) {
      p.sku   = sku;
      p.title = p.title ?? sku;
      p.price = Number(p.price || 0);
      p.qty   = parseInt(p.qty ?? 0, 10) || 0;
      // prefer your real images; fallback to blank.jpg (so cards never show empty)
      p.image_url = p.image_url || p.image || p.img || 'assets/img/blank.jpg';
      p.status = p.status || 'active';
      if (typeof p.tags === 'string') {
        p.tags = p.tags.split(/[|,]/).map(s => s.trim()).filter(Boolean);
      }
    }
  }

  // Lightweight CSV → map keyed by sku (expects: status,title,sku,price,qty,image_url,images,tags,description)
  function csvToProducts(csv) {
    const lines = (csv || '').trim().split(/\r?\n/);
    if (!lines.length) return {};
    const headers = splitCsvLine(lines[0]);
    const out = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const cols = splitCsvLine(line);
      const row = {};
      cols.forEach((val, idx) => row[headers[idx]] = val);
      if (!row.sku) continue;
      out[row.sku] = {
        status: row.status,
        title: row.title,
        price: Number(row.price || 0),
        qty: parseInt(row.qty ?? 0, 10) || 0,
        image_url: row.image_url || row.images || '',
        tags: row.tags,
        description: row.description
      };
    }
    return out;
  }

  // CSV line splitter that respects quotes
  function splitCsvLine(line) {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        out.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(s => s.trim().replace(/^\uFEFF/, ''));
  }
})();