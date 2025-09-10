// assets/js/product.js (unified with cart.js API)
(async function () {
  'use strict';

  const host = document.getElementById('productHost');
  if (!host) return;
  host.setAttribute('aria-live', 'polite');

  // Helpers
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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

  // Parse ?sku=...
  const params = new URLSearchParams(location.search);
  const skuParam = params.get('sku');

  // Loading state
  host.innerHTML = `<p class="muted">Loading product…</p>`;

  // Load products
  let all = [];
  try {
    all = await (window.FC?.loadProducts?.() || Promise.resolve([]));
  } catch {
    all = [];
  }

  // Find item (fallback to first if no SKU given)
  const item = (Array.isArray(all) ? all.find(p => p.sku === skuParam) : null) || (all[0] || null);
  if (!item) {
    host.innerHTML = `<p class="muted">Product not found.</p>`;
    return;
  }

  // Update page title
  try { document.title = `${item.title || 'Product'} • Freedom Crate Co.`; } catch (_) {}

  // Build image data
  const imgUrl = (item.images && item.images[0]) || item.image_url || 'assets/img/blank.jpg';
  const isSold = toNum(item.qty, 0) <= 0;
  const priceNum = toNum(item.price, 0);
  const safeTitle = escapeHtml(item.title || 'Item');
  const safeSku = escapeHtml(item.sku || '');

  // Render
  host.innerHTML = `
    <section class="product-detail" aria-labelledby="p-title">
      <img class="product-hero"
           src="${escapeHtml(imgUrl)}"
           alt="${safeTitle}"
           width="1200" height="800" decoding="async" loading="eager" />

      <h1 id="p-title">${safeTitle}</h1>
      <div class="sku muted">SKU: ${safeSku}</div>
      <p class="price"><strong><span id="price" aria-live="polite">${fmt(priceNum)}</span></strong></p>

      <p>${escapeHtml(item.description || '')}</p>

      <div class="actions">
        ${
          isSold
            ? `<span class="btn danger" aria-disabled="true">Sold Out</span>`
            : `
               <button id="addBtn" class="btn" type="button">Add to Cart</button>
               <button id="buyBtn" class="btn" type="button">Buy Now</button>
              `
        }
        <a class="btn ghost" href="index.html">Back to Shop</a>
      </div>
    </section>
  `;

  if (!isSold) {
    const addBtn = document.getElementById('addBtn');
    const buyBtn = document.getElementById('buyBtn');

    const meta = { image: imgUrl };
    const name = item.title || item.sku || 'Item';
    const sku  = item.sku;

    addBtn?.addEventListener('click', () => {
      addToCartSafe(sku, name, priceNum, 1, meta);
    });

    buyBtn?.addEventListener('click', () => {
      buyNowSafe(sku, name, priceNum, 1, meta);
    });
  }
})();