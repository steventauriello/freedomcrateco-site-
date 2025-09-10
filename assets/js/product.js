// assets/js/product.js
// Product detail page logic with unified cart API (no live quantity).
// Availability is controlled via item.status: 'coming-soon' | 'unavailable' | undefined

(async function () {
  'use strict';

  const host = document.getElementById('productHost');
  if (!host) return;
  host.setAttribute('aria-live', 'polite');

  // ---------- Helpers ----------
  const escapeHtml = (s) =>
    String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const toNum = (v, d=0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const fmt = (n) => (window.FC?.formatPrice ? FC.formatPrice(toNum(n, 0)) : `$${toNum(n,0).toFixed(2)}`);

  function addToCartSafe(sku, name, price, qty, meta){
    if (typeof window.addToCart === 'function') return window.addToCart(sku, name, price, qty, meta);
    console.warn('Cart not ready: addToCart() missing');
  }
  function buyNowSafe(sku, name, price, qty, meta){
    if (typeof window.buyNow === 'function') return window.buyNow(sku, name, price, qty, meta);
    console.warn('Cart not ready: buyNow() missing');
  }

  // ---------- Load product ----------
  const params = new URLSearchParams(location.search);
  const skuParam = params.get('sku');

  host.innerHTML = `<p class="muted">Loading product…</p>`;

  let all = [];
  try {
    all = await (window.FC?.loadProducts?.() || Promise.resolve([]));
  } catch {
    all = [];
  }

  // Prefer the requested SKU; fall back to first product if none provided
  const item = (Array.isArray(all) ? all.find(p => p.sku === skuParam) : null) || (all[0] || null);
  if (!item) {
    host.innerHTML = `<p class="muted">Product not found.</p>`;
    return;
  }

  // ---------- Prepare data ----------
  const title     = item.title || item.sku || 'Product';
  const price     = toNum(item.price, 0);
  const imgUrl    = (item.images && item.images[0]) || item.image_url || 'assets/img/blank.jpg';
  const status    = item.status; // 'coming-soon' | 'unavailable' | undefined
  const isComing  = status === 'coming-soon';
  const isGone    = status === 'unavailable';
  const contactQS = encodeURIComponent(title);

  try { document.title = `${title} • Freedom Crate Co.`; } catch {}

  // ---------- Render ----------
  host.innerHTML = `
    <section class="product-detail" aria-labelledby="p-title">
      <img class="product-hero"
           src="${escapeHtml(imgUrl)}"
           alt="${escapeHtml(title)}"
           width="1200" height="800" decoding="async" loading="eager" />

      <h1 id="p-title">${escapeHtml(title)}</h1>
      <div class="sku muted">SKU: ${escapeHtml(item.sku || '')}</div>

      <p class="price"><strong><span id="price" aria-live="polite">${fmt(price)}</span></strong></p>

      <p>${escapeHtml(item.description || '')}</p>

      <div class="actions">
        ${
          (isComing || isGone)
            ? `<span class="btn danger" aria-disabled="true">${isComing ? 'Coming Soon' : 'Unavailable'}</span>`
            : `
               <button id="addBtn" class="btn" type="button">Add to Cart</button>
               <button id="buyBtn" class="btn" type="button">Buy Now</button>
              `
        }
        <a class="btn ghost" href="contact.html?box=${contactQS}">Customize</a>
        <a class="btn ghost" href="index.html">Back to Shop</a>
      </div>
    </section>
  `;

  // ---------- Wire actions (only if purchasable) ----------
  if (!isComing && !isGone) {
    const addBtn = document.getElementById('addBtn');
    const buyBtn = document.getElementById('buyBtn');
    const meta   = { image: imgUrl };
    const name   = title;
    const sku    = item.sku;

    addBtn?.addEventListener('click', () => {
      addToCartSafe(sku, name, price, 1, meta);
    });
    buyBtn?.addEventListener('click', () => {
      buyNowSafe(sku, name, price, 1, meta);
    });
  }
})();