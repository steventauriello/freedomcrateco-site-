/* assets/js/catalog.js
   Loads products + live inventory, renders cards, wires Add/Buy.
   - Expects FC.loadProducts(), FC.formatPrice(), FC.storage.get/set()
   - Reads quantities from assets/data/inventory.json (keyed by SKU)
*/
(function () {
  const listEl = document.getElementById('products');
  if (!listEl) return;

  // ---- helpers ----
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, m => (
      { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]
    ));

  function loadInventory() {
    return fetch('assets/data/inventory.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}));
  }

  function withInventory(items, inv) {
    return items.map(p => {
      const qty = (inv && Object.prototype.hasOwnProperty.call(inv, p.sku))
        ? Number(inv[p.sku] || 0)
        : Number(p.qty || 0);
      return { ...p, qty };
    });
  }

  // Robust image resolver
  function resolveImage(p) {
    // common field names first
    const src = p.image_url || p.image || p.img;
    if (src) return String(src);

    // derive for standard box SKUs like "std-army-stainless-..."
    const m = /^std-(army|marines|navy|airforce|coastguard)/i.exec(p.sku || '');
    if (m) {
      const branch = m[1].toLowerCase();
      return `assets/img/${branch}.jpg`;
    }

    // final fallback
    return 'assets/img/blank.jpg';
  }

  // ---- boot ----
  Promise.all([
    FC.loadProducts(),
    loadInventory(),
    Promise.resolve(FC.storage.get('favs', []))
  ]).then(([items, inventory, favs]) => {
    try { window.PRODUCTS = Object.fromEntries(items.map(p => [p.sku, p])); } catch(_) {}
    const merged = withInventory(items, inventory);
    render(merged, new Set(favs));
    wireFilters(merged);
  });

  function wireFilters(items) {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-filter');
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const favSet = new Set(FC.storage.get('favs', []));
        const view = (mode === 'favorites') ? items.filter(p => favSet.has(p.sku)) : items;
        render(view, favSet);
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
      const priceNum = Number(p.price) || 0;
      const title    = p.title || 'Item';
      const qty      = Number(p.qty) || 0;
      const lowStock = qty > 0 && qty <= 3;
      const oos      = qty <= 0;

      const imgSrc   = resolveImage(p);

      const card = document.createElement('article');
      card.className = 'card';

      const imgHtml = `
        <img src="${escapeHtml(imgSrc)}"
             alt="${escapeHtml(title)}"
             class="ph"
             ${oos ? 'style="filter:grayscale(1);opacity:.6;"' : ''}>
      `;

      const statusHtml = oos
        ? `<div class="soldout">Coming back soon</div>`
        : (lowStock ? `<div class="soldout" style="background:rgba(255,200,0,.18);border-color:rgba(255,200,0,.35);color:#ffc800">Only ${qty} left</div>` : '');

      const favActive = favSet.has(p.sku) ? 'active' : '';

      card.innerHTML = `
        <a class="img" href="product.html?sku=${encodeURIComponent(p.sku)}">
          ${imgHtml}
          ${statusHtml}
          <div class="fav ${favActive}" data-sku="${escapeHtml(p.sku)}" title="Favorite">
            <svg viewBox="0 0 24 24"><path d="M12 21s-6.716-3.948-9.428-6.66C.86 12.628.5 10.5 1.757 9.243c1.257-1.257 3.385-.897 5.097.815L12 13.204l5.146-5.146c1.712-1.712 3.84-2.072 5.097-.815 1.257 1.257.897 3.385-.815 5.097C18.716 17.052 12 21 12 21z"/></svg>
          </div>
        </a>

        <div class="meta">
          <div class="sku">SKU: ${escapeHtml(p.sku)}</div>
          <h3><a href="product.html?sku=${encodeURIComponent(p.sku)}">${escapeHtml(title)}</a></h3>
          <p>${escapeHtml(p.description || '')}</p>

          <div class="price-row">
            <span class="price">${FC.formatPrice(priceNum)}</span>
            ${
              oos
                ? `<span class="muted" style="margin-left:auto">Unavailable</span>`
                : `<div class="actions">
                     <button class="btn" data-add="${escapeHtml(p.sku)}">Add to Cart</button>
                     <button class="btn" data-buy="${escapeHtml(p.sku)}">Buy Now</button>
                   </div>`
            }
          </div>
        </div>
      `;

      // Favorite toggle
      const favBtn = card.querySelector('.fav');
      favBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const sku = favBtn.getAttribute('data-sku');
        const cur = new Set(FC.storage.get('favs', []));
        cur.has(sku) ? cur.delete(sku) : cur.add(sku);
        favBtn.classList.toggle('active');
        FC.storage.set('favs', Array.from(cur));
      });

      // Add/Buy (only if in-stock)
      if (!oos) {
        const addBtn = card.querySelector('[data-add]');
        const buyBtn = card.querySelector('[data-buy]');
        if (addBtn) addBtn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          window.addToCart(p.sku, title, priceNum, 1, { image: imgSrc });
        });
        if (buyBtn) buyBtn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          window.buyNow(p.sku, title, priceNum, 1, { image: imgSrc });
        });
      }

      listEl.appendChild(card);
    });
  }
})();