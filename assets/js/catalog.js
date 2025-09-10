// assets/js/catalog.js (no quantity UI)
(function () {
  const listEl = document.getElementById('products');
  if (!listEl) return;
  listEl.setAttribute('aria-live', 'polite');

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const toNum = (v, d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
  const storageGet = (k, fallback=[]) => { try { return (window.FC?.storage?.get(k, fallback)) ?? fallback; } catch { return fallback; } };
  const storageSet = (k, v) => { try { window.FC?.storage?.set(k, v); } catch {} };

  Promise.resolve()
    .then(() => window.FC?.loadProducts?.())
    .then((items) => {
      if (!Array.isArray(items)) items = [];
      try { window.PRODUCTS = Object.fromEntries(items.map(p => [p.sku, p])); } catch {}
      render(items, new Set(storageGet('favs', [])));
      wireFilters(items);
    })
    .catch(() => { listEl.innerHTML = '<p class="muted">Sorry, products failed to load.</p>'; });

  // If inventory updates still happen, we just re-render (no quantities shown)
  window.addEventListener('inventory:updated', () => {
    const items = Object.values(window.PRODUCTS || {});
    render(items, new Set(storageGet('favs', [])));
  });

  function wireFilters(items) {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-filter');
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const favSet = new Set(storageGet('favs', []));
        const list = (mode === 'favorites') ? items.filter(p => favSet.has(p.sku)) : items;
        render(list, favSet);
      });
    });

    // One delegated listener for fav / add / buy
    listEl.addEventListener('click', (e) => {
      const favBtn = e.target.closest('.fav');
      if (favBtn) {
        e.preventDefault(); e.stopPropagation();
        const sku = favBtn.getAttribute('data-sku');
        const cur = new Set(storageGet('favs', []));
        cur.has(sku) ? cur.delete(sku) : cur.add(sku);
        favBtn.classList.toggle('active');
        storageSet('favs', Array.from(cur));
        return;
      }

      const addBtn = e.target.closest('[data-add]');
      const buyBtn = e.target.closest('[data-buy]');
      const btn = addBtn || buyBtn;
      if (!btn) return;

      e.preventDefault(); e.stopPropagation();
      const sku = btn.getAttribute(addBtn ? 'data-add' : 'data-buy');
      const p = (window.PRODUCTS || {})[sku];
      if (!p) return;

      // Only block purchase if you manually flag it as unavailable/coming-soon
      const isComing = p.status === 'coming-soon';
      const isUnavailable = p.status === 'unavailable';
      if (isComing || isUnavailable) return;

      const title  = p.title || 'Item';
      const price  = toNum(p.price, 0);
      const imgUrl = p.image_url || 'assets/img/blank.jpg';

      if (addBtn) {
        if (typeof window.addToCart === 'function') window.addToCart(p.sku, title, price, 1, { image: imgUrl });
      } else {
        if (typeof window.buyNow === 'function') window.buyNow(p.sku, title, price, 1, { image: imgUrl });
      }
    });
  }

  function render(list, favSet) {
    listEl.innerHTML = '';
    if (!list || !list.length) {
      listEl.innerHTML = '<p class="muted">No products to show.</p>';
      return;
    }
    try { window.PRODUCTS = Object.fromEntries(list.map(p => [p.sku, p])); } catch {}

    for (const p of list) {
      const title    = p.title || 'Item';
      const imgUrl   = p.image_url || 'assets/img/blank.jpg';
      const priceNum = toNum(p.price, 0);
      const favActive = favSet.has(p.sku) ? 'active' : '';
      const isComing = p.status === 'coming-soon';
      const isUnavailable = p.status === 'unavailable';

      const card = document.createElement('article');
      card.className = ['card', 'no-title-overlay', isComing ? 'coming-soon' : ''].filter(Boolean).join(' ');

      card.innerHTML = `
        <a class="img" href="product.html?sku=${encodeURIComponent(p.sku)}">
          ${isUnavailable ? `<div class="soldout">Unavailable</div>` : ''}
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" loading="lazy">
        </a>

        <div class="meta">
          <div class="sku">SKU: ${escapeHtml(p.sku)}</div>
          <h3><a href="product.html?sku=${encodeURIComponent(p.sku)}">${escapeHtml(title)}</a></h3>
          <p>${escapeHtml(p.description || '')}</p>

          <div class="price-row">
            <span class="price">${window.FC?.formatPrice ? FC.formatPrice(priceNum) : `$${priceNum.toFixed(2)}`}</span>
            ${
              isComing
                ? `<span class="muted">Coming Soon</span>`
                : (isUnavailable
                    ? `<span class="muted">Unavailable</span>`
                    : `<div class="actions">
                         <button class="btn" data-add="${escapeHtml(p.sku)}" type="button">Add to Cart</button>
                         <button class="btn" data-buy="${escapeHtml(p.sku)}" type="button">Buy Now</button>
                       </div>`)
            }
          </div>
        </div>

        <button class="fav ${favActive}" data-sku="${escapeHtml(p.sku)}" title="Favorite" type="button" aria-pressed="${favActive ? 'true' : 'false'}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-6.716-3.948-9.428-6.66C.86 12.628.5 10.5 1.757 9.243c1.257-1.257 3.385-.897 5.097.815L12 13.204l5.146-5.146c1.712-1.712 3.84-2.072 5.097-.815 1.257 1.257.897 3.385-.815 5.097C18.716 17.052 12 21 12 21z"/>
          </svg>
        </button>
      `;

      listEl.appendChild(card);
    }
  }
})();