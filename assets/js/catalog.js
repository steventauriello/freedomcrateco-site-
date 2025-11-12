// assets/js/catalog.js
// Renders the product grid of small cards.
// - Hides items tagged "hide-from-grid" (use for Classic/RM400 featured up top)
// - Each card links to product.html?sku=... unless a custom p.link is provided
// - Supports coming-soon (status="coming-soon") and sold-out (qty <= 0)
// - Re-renders on inventory:updated events from inventory.js

(function () {
  const listEl = document.getElementById('products');
  if (!listEl) return;

  // --- helpers ---
  const formatPrice = (n) =>
    (window.FC && typeof FC.formatPrice === 'function')
      ? FC.formatPrice(n)
      : ('$' + (Number(n) || 0).toFixed(2));

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));

  const ensureImagePath = (src) => {
    const s = String(src || '').trim();
    if (!s) return 'assets/img/blank.jpg';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('assets/')) return s;
    return 'assets/img/' + s.replace(/^\/+/, '');
  };

  const safeCall = (fn) =>
    (typeof fn === 'function') ? fn : () => console.warn('Cart function missing');

  // --- load + initial render ---
  FC.loadProducts().then((items = []) => {
    try {
      // Keep a quick map for later refreshes
      window.PRODUCTS = Object.fromEntries(items.map(p => [String(p.sku), p]));
    } catch (_) { window.PRODUCTS = {}; }

    render(items);
    wireFilters(items); // harmless if you don't have [data-filter] buttons
  });

  // Re-render when inventory updates (from inventory.js)
  window.addEventListener('inventory:updated', () => {
    const items = Object.values(window.PRODUCTS || {});
    render(items);
  });

  // Optional filter buttons (no-op if none exist)
  function wireFilters(items) {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render(items);
      });
    });
  }

  // --- core render ---
  function render(list) {
    listEl.innerHTML = '';

    if (!list || !list.length) {
      listEl.innerHTML = '<p class="muted">No products to show.</p>';
      return;
    }

    list.forEach(p => {
      // Normalize tags for easy checking
      const tags = Array.isArray(p.tags)
        ? p.tags
        : String(p.tags || '').split(/[|,]/).map(s => s.trim()).filter(Boolean);

      // Skip items that should NOT appear in the grid (your two featured)
      if (tags.includes('hide-from-grid')) return;

      const sku      = String(p.sku || '').trim();
      const title    = p.title || sku || 'Item';
      const qty      = Number(p.qty) || 0;
      const status   = String(p.status || 'active').toLowerCase();
      const isComing = status === 'coming-soon';
      const soldOut  = qty <= 0 && !isComing;
      const priceRaw = Number(p.price) || 0;
      const priceFinal = (window.FC_applyPromo ? window.FC_applyPromo(priceRaw) : priceRaw);
      const imgUrl   = ensureImagePath(p.image_url || p.image || p.img);
      const link     = p.link || `product.html?sku=${encodeURIComponent(sku)}`;

      // Price HTML (shows "was" when promo active and discounted)
      const isOnSale = (window.FC_PROMO?.active && priceFinal < priceRaw);
      const priceHtml = isOnSale
        ? `<span class="price">$${priceFinal.toFixed(2)}</span>
           <span class="price-was" style="margin-left:.5rem;text-decoration:line-through;">
             $${priceRaw.toFixed(2)}
           </span>`
        : `<span class="price">${formatPrice(priceFinal)}</span>`;

      const saleBadge = isOnSale
        ? `<span class="sale-badge" title="${escapeHtml(window.FC_PROMO?.label || 'Sale')}">Sale</span>`
        : '';

      const card = document.createElement('article');
      const classes = ['card', 'product-card', 'no-title-overlay'];
      if (isComing) classes.push('coming-soon');
      card.className = classes.join(' ');
      card.dataset.qty = qty; // useful for CSS hooks

      // Image block (keep only the ribbon for sold out)
      const imgBlock = `
        <a class="img" href="${escapeHtml(link)}" aria-label="${escapeHtml(title)}">
          ${soldOut ? `<div class="soldout">Sold Out</div>` : ''}
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" loading="lazy">
        </a>
      `;

      // Stock row:
      // - Coming soon: nothing
      // - In stock: plain text
      // - Out of stock: nothing (ribbon already shows)
      const stockRow = isComing
        ? ''
        : (qty > 0 ? `<div class="qty-text">${qty} left</div>` : '');

      card.innerHTML = `
  ${imgBlock}
  <div class="meta">
    ${stockRow}
    <div class="sku">SKU: ${escapeHtml(sku)}</div>
    <h3><a href="${escapeHtml(link)}">${escapeHtml(title)}</a></h3>
    <p>${escapeHtml(p.description || '')}</p>

    <div class="price-row">
      ${priceHtml}
      ${saleBadge}
      ${
        isComing
          ? `<span class="muted">Coming Soon</span>`
          : (qty > 0
              ? `<div class="actions">
                   <button class="btn add-to-cart" data-add="${escapeHtml(sku)}">Add to Cart</button>
                   <button class="btn" data-buy="${escapeHtml(sku)}">Buy Now</button>
                 </div>`
              : `<span class="muted">Unavailable</span>`)
      }
    </div>
  </div>

  <!-- Full-card overlay link (so anywhere you click goes to the detail page) -->
  <a class="overlay-link" href="${escapeHtml(link)}" aria-label="${escapeHtml(title)}"></a>
`;

      // Wire cart buttons (don’t navigate when clicking them)
      const addBtn = card.querySelector('[data-add]');
      const buyBtn = card.querySelector('[data-buy]');

      if (addBtn) addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // fly-to-cart animation
        if (window.flashAddToCart) window.flashAddToCart(addBtn, 1);

        // Use discounted price
        safeCall(window.addToCart)(sku, title, priceFinal, 1, { image: imgUrl });
      });

      if (buyBtn) buyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Use discounted price
        safeCall(window.buyNow)(sku, title, priceFinal, 1, { image: imgUrl });
      });

      listEl.appendChild(card);
    });
  }
})();
