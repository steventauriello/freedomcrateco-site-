// assets/js/catalog.js
// Renders product cards with Add to Cart + Buy Now buttons.
// Supports: sold-out (qty=0), coming-soon (status="coming-soon"),
// and live re-render on inventory:updated. (Favorites removed)

(function () {
  const listEl = document.getElementById('products');
  if (!listEl) return;

  const formatPrice = (n) =>
    (window.FC && typeof FC.formatPrice === 'function')
      ? FC.formatPrice(n)
      : ('$' + (Number(n) || 0).toFixed(2));

  // Initial load
  FC.loadProducts().then((items) => {
    try {
      // Keep an object map for quick refresh after inventory updates
      window.PRODUCTS = Object.fromEntries(items.map(p => [p.sku, p]));
    } catch (_) {}
    render(items);
    wireFilters(items);
  });

  // Re-render when inventory.js updates quantities
  window.addEventListener('inventory:updated', () => {
    const items = Object.values(window.PRODUCTS || {});
    render(items);
  });

  function wireFilters(items) {
    // If you don’t have filter buttons, this does nothing—safe to keep.
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-filter');
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // No favorites mode anymore; everything renders.
        const list = items;
        render(list);
      });
    });
  }

  function render(list) {
    listEl.innerHTML = '';
    if (!list || !list.length) {
      listEl.innerHTML = '<p class="muted">No products to show.</p>';
      return;
    }

    list.forEach(p => {
      const card = document.createElement('article');
      const classes = ['card', 'product-card', 'no-title-overlay'];
      if (p.status === 'coming-soon') classes.push('coming-soon');
      card.className = classes.join(' ');

      const qty      = Number(p.qty) || 0;
      const isComing = p.status === 'coming-soon';
      const soldOut  = qty <= 0 && !isComing;
      const priceNum = Number(p.price) || 0;
      const title    = p.title || 'Item';
      const imgUrl   = p.image_url || 'assets/img/blank.jpg';

      // NEW: allow custom deep-links (e.g., index.html#rm400-card)
      const link = p.link || `product.html?sku=${encodeURIComponent(p.sku)}`;

      const imgBlock = `
        <a class="img" href="${escapeHtml(link)}">
          ${soldOut ? `<div class="soldout">Sold Out</div>` : ''}
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" loading="lazy">
        </a>
      `;

      const stockRow = isComing
        ? ''
        : (qty > 0
            ? `<div class="stock-badge stock-label">${qty} left</div>`
            : `<div class="stock-badge muted">Out of stock</div>`);

      card.innerHTML = `
        ${imgBlock}
        <div class="meta">
          ${stockRow}
          <div class="sku">SKU: ${escapeHtml(p.sku)}</div>
          <h3><a href="${escapeHtml(link)}">${escapeHtml(title)}</a></h3>
          <p>${escapeHtml(p.description || '')}</p>

          <div class="price-row">
            <span class="price">${formatPrice(priceNum)}</span>
            ${
              isComing
                ? `<span class="muted">Coming Soon</span>`
                : (qty > 0
                    ? `<div class="actions">
                         <button class="btn" data-add="${escapeHtml(p.sku)}">Add to Cart</button>
                         <button class="btn" data-buy="${escapeHtml(p.sku)}">Buy Now</button>
                       </div>`
                    : `<span class="muted">Unavailable</span>`)
            }
          </div>
        </div>

        <!-- Full-card overlay link -->
        <a class="overlay-link" href="${escapeHtml(link)}" aria-label="${escapeHtml(title)}"></a>
      `;

      // Buttons – pass full info + image to cart
      const addBtn = card.querySelector('[data-add]');
      const buyBtn = card.querySelector('[data-buy]');
      if (addBtn) addBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        safeCall(window.addToCart)(p.sku, title, priceNum, 1, { image: imgUrl });
      });
      if (buyBtn) buyBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        safeCall(window.buyNow)(p.sku, title, priceNum, 1, { image: imgUrl });
      });

      listEl.appendChild(card);
    });
  }

  function safeCall(fn) {
    return (typeof fn === 'function') ? fn : () => console.warn('Cart function missing');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
  }
})();