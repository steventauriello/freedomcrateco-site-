// assets/js/data.js
// Loads products.json (preferred) or products.csv (fallback)
// Exposes: window.PRODUCTS = { [sku]: {sku,title,price,qty,image_url,tags,description,status} }
// Also renders the shop grid if #products exists.

window.PRODUCTS = {};

async function loadProducts() {
  // Try JSON first
  try {
    const r = await fetch('assets/data/products.json', { cache: 'no-store' });
    if (r.ok) {
      const obj = await r.json();
      normalizeProducts(obj);
      window.PRODUCTS = obj;
      return obj;
    }
  } catch (e) {
    console.warn('products.json not found or invalid, trying CSV…', e);
  }

  // Fallback to CSV
  try {
    const r = await fetch('assets/data/products.csv', { cache: 'no-store' });
    if (!r.ok) throw new Error('CSV not found');
    const text = await r.text();
    const obj = csvToProducts(text);
    normalizeProducts(obj);
    window.PRODUCTS = obj;
    return obj;
  } catch (e) {
    console.error('Failed to load products.csv', e);
    window.PRODUCTS = {};
    return {};
  }
}

function normalizeProducts(map) {
  for (const [sku, p] of Object.entries(map)) {
    p.sku = sku;
    p.title = p.title ?? sku;
    p.price = Number(p.price || 0);
    p.qty = parseInt(p.qty ?? 0, 10) || 0;
    p.image_url = p.image_url || 'assets/img/placeholder.png';
    p.status = p.status || 'active';
    if (typeof p.tags === 'string') p.tags = p.tags.split(/[|,]/).map(s => s.trim()).filter(Boolean);
  }
}

// Lightweight CSV → map keyed by sku (expects header with: status,title,sku,price,qty,image_url,images,tags,description)
function csvToProducts(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length) return {};
  const headers = splitCsvLine(lines[0]);
  const rowToObj = (row) => {
    const o = {};
    splitCsvLine(row).forEach((val, i) => o[headers[i]] = val);
    return o;
  };
  const out = {};
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const o = rowToObj(lines[i]);
    if (!o.sku) continue;
    out[o.sku] = {
      status: o.status,
      title: o.title,
      price: Number(o.price || 0),
      qty: parseInt(o.qty ?? 0, 10) || 0,
      image_url: o.image_url,
      tags: o.tags,
      description: o.description
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
  return out.map(s => s.trim().replace(/^\uFEFF/, '')); // strip BOMs, trim
}

// -------- Shop grid rendering --------
function renderShopGrid(selector = '#products') {
  const grid = document.querySelector(selector);
  if (!grid) return;

  const cards = Object.values(PRODUCTS)
    .filter(p => p.status !== 'archived')
    .map(p => {
      const soldOut = p.qty <= 0;
      return `
<article class="card" data-sku="${p.sku}" data-name="${escapeHtml(p.title)}" data-price="${p.price}">
  <img src="${p.image_url}" alt="${escapeHtml(p.title)}" class="product-hero"/>
  <div class="card-body">
    <small class="sku">SKU: ${p.sku}</small>
    <h3>${escapeHtml(p.title)}</h3>
    <p class="muted">${escapeHtml(p.description || '')}</p>
    <p class="price">$${p.price.toFixed(2)}</p>
    ${soldOut ? `<span class="badge danger">Sold Out</span>` : ''}
    <div class="buy-row">
      <button class="btn ghost" onclick="addToCart('${p.sku}')" ${soldOut ? 'disabled' : ''}>Add to Cart</button>
      <button class="btn" onclick="buyNow('${p.sku}')" ${soldOut ? 'disabled' : ''}>Buy Now</button>
    </div>
  </div>
</article>`;
    }).join('\n');

  grid.innerHTML = cards || `<p class="muted">No products available.</p>`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Auto-run: load products, then render grid if present
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  renderShopGrid('#products');
});
