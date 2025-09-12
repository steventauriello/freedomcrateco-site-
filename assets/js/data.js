// assets/js/data.js
window.FC = window.FC || {};

(async function () {
  async function loadProducts() {
    // 1) Try JSON first
    try {
 const r = await fetch('assets/data/products.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('JSON not found');
      const json = await r.json();
const arr = Array.isArray(json)
  ? json
  : Object.entries(json || {}).map(([sku, p]) => ({ ...p, sku }));
normalizeProducts(arr);
window.PRODUCTS = arr; // always an ARRAY
return arr;
    } catch (e) {
      console.warn('products.json not found or invalid, trying CSV…', e);
    }

    // 2) Fallback to CSV
    try {
      const r = await fetch('assets/data/products.csv', { cache: 'no-store' });
      if (!r.ok) throw new Error('CSV not found');
      const text = await r.text();
      const map = csvToProducts(text);         // returns an object keyed by sku
      const arr = Object.values(map);
      normalizeProducts(arr);
      window.PRODUCTS = arr;                    // always an ARRAY
      return arr;
    } catch (e) {
      console.error('Failed to load products.csv', e);
      window.PRODUCTS = [];
      return [];
    }
  }

  // Expose loader for catalog.js
  FC.loadProducts = loadProducts;

  // ---------- helpers ----------
  const PLACEHOLDER = 'assets/img/blank.jpg';

  function ensureImagePath(src) {
    const s = (src || '').trim();
    if (!s) return PLACEHOLDER;
    if (/^https?:\/\//i.test(s)) return s;        // absolute URL
    if (s.startsWith('assets/')) return s;        // already under assets/
    return 'assets/img/' + s.replace(/^\/+/, ''); // bare filename -> assets/img/filename
  }

  // Accepts an ARRAY of product objects
  function normalizeProducts(arr) {
    for (const p of arr) {
      p.sku   = p.sku || p.id || '';
      p.title = p.title || p.name || p.sku || 'Untitled';
      p.price = Number(p.price || 0);
      p.qty   = parseInt(p.qty ?? 0, 10) || 0;
      p.image_url = ensureImagePath(p.image_url || p.image || p.img || '');
      p.status = p.status || 'active';
      if (typeof p.tags === 'string') {
        p.tags = p.tags.split(/[|,]/).map(s => s.trim()).filter(Boolean);
      }
    }
  }

  // Lightweight CSV -> object keyed by sku
  // expects header: status,title,sku,price,qty,image_url,images,tags,description
  function csvToProducts(csv) {
    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return {};
    const headers = lines[0].split(',').map(h => h.trim());
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const out = {};
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCSVLine(lines[i], headers.length);
      if (!cols.length) continue;
      const sku = (cols[idx.sku] || '').trim();
      if (!sku) continue;
      out[sku] = {
        status: cols[idx.status] || 'active',
        title: cols[idx.title] || sku,
        sku,
        price: cols[idx.price],
        qty: cols[idx.qty],
        image_url: cols[idx.image_url],
        images: cols[idx.images],
        tags: cols[idx.tags],
        description: cols[idx.description]
      };
    }
    return out;
  }

  // Basic CSV splitter that respects quotes
  function splitCSVLine(line, expect) {
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' ) {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        out.push(cur); cur = '';
      } else cur += ch;
    }
    out.push(cur);
    while (expect && out.length < expect) out.push('');
    return out.map(s => s.trim());
  }
})();