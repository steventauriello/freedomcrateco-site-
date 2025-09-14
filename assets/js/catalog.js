// assets/js/catalog.js
// Renders product cards with Add to Cart + Buy Now buttons.
// Supports: favorites, sold-out (qty=0), coming-soon (status="coming-soon"),
// and live re-render on inventory:updated.

(function () {
  const listEl = document.getElementById('products');
  if (!listEl) return;

  // ---- safe fallbacks so rendering never crashes ----
  const safeGetFavs = () => {
    try {
      return (FC && FC.storage && typeof FC.storage.get === 'function')
        ? FC.storage.get('favs', [])
        : [];
    } catch { return []; }
  };
  const safeSetFavs = (arr) => {
    try {
      if (FC && FC.storage && typeof FC.storage.set === 'function') {
        FC.storage.set('favs', arr);
      }
    } catch {}
  };
  const formatPrice = (n) =>
    (FC && typeof FC.formatPrice === 'function')
      ? FC.formatPrice(n)
      : ('$' + (Number(n) || 0).toFixed(2));

  // Initial load
  Promise.all([
    FC.loadProducts(),
    Promise.resolve(safeGetFavs())
  ]).then(([items, favs]) => {
    try { window.PRODUCTS = Object.fromEntries(items.map(p => [p.sku, p])); } catch (_) {}
    render(items, new Set(favs));
    wireFilters(items);
  });

  // Re-render when inventory.js updates quantities
  window.addEventListener('inventory:updated', () => {
    const items = Object.values(window.PRODUCTS || {});
    const favSet = new Set(safeGetFavs());
    render(items, favSet);
  });

  function wireFilters(items) {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-filter');
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const favSet = new Set(safeGetFavs());
        const list = (mode === 'favorites') ? items.filter(p => favSet.has(p.sku)) : items;
        render(list, favSet);
      });
    });
  }

function render(list, favSet) {
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

    const imgBlock = `
      <a class="img" href="product.html?sku=${encodeURIComponent(p.sku)}">
        ${soldOut ? `<div class="soldout">Sold Out</div>` : ''}
        <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" loading="lazy">
      </a>
    `;

    const favActive = favSet.has(p.sku) ? 'active' : '';

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
        <h3><a href="product.html?sku=${encodeURIComponent(p.sku)}">${escapeHtml(title)}</a></h3>
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

      <div class="fav ${favActive}" data-sku="${escapeHtml(p.sku)}" title="Favorite">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-6.716-3.948-9.428-6.66C.86 12.628.5 10.5 1.757 9.243c1.257-1.257 3.385-.897 5.097.815L12 13.204l5.146-5.146c1.712-1.712 3.84-2.072 5.097-.815 1.257 1.257.897 3.385-.815 5.097C18.716 17.052 12 21 12 21z"/>
        </svg>
      </div>

      <!-- Full-card overlay link -->
      <a class="overlay-link" href="product.html?sku=${encodeURIComponent(p.sku)}" aria-label="${escapeHtml(title)}"></a>
    `;

    // Fav toggle
    const favBtn = card.querySelector('.fav');
    favBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const sku = favBtn.getAttribute('data-sku');
      const cur = new Set(safeGetFavs());
      cur.has(sku) ? cur.delete(sku) : cur.add(sku);
      favBtn.classList.toggle('active');
      safeSetFavs(Array.from(cur));
    });

    // Buttons – pass full info + image to cart
    const addBtn = card.querySelector('[data-add]');
    const buyBtn = card.querySelector('[data-buy]');
    if (addBtn) addBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      window.addToCart(p.sku, title, priceNum, 1, { image: imgUrl });
    });
    if (buyBtn) buyBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      window.buyNow(p.sku, title, priceNum, 1, { image: imgUrl });
    });

    listEl.appendChild(card);
  });
}

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));
  }
})();