// assets/js/catalog.js
// Renders product cards with Add to Cart + Buy Now buttons.
// Supports: favorites, sold-out (qty=0), coming-soon (status="coming-soon"),
// and live re-render on inventory:updated.

(function () {
  const listEl = document.getElementById('products');
  if (!listEl) return;

  // Initial load
  Promise.all([
    FC.loadProducts(),
    Promise.resolve(FC.storage.get('favs', []))
  ]).then(([items, favs]) => {
    try { window.PRODUCTS = Object.fromEntries(items.map(p => [p.sku, p])); } catch (_) {}
    render(items, new Set(favs));
    wireFilters(items);
  });

  // Re-render when inventory.js updates quantities
  window.addEventListener('inventory:updated', () => {
    const items = Object.values(window.PRODUCTS || {});
    const favSet = new Set(FC.storage.get('favs', []));
    render(items, favSet);
  });

  function wireFilters(items) {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-filter');
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const favSet = new Set(FC.storage.get('favs', []));
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
      const classes = ['card', 'no-title-overlay'];
      if (p.status === 'coming-soon') classes.push('coming-soon');
      card.className = classes.join(' ');

      const qty      = Number(p.qty) || 0;
      const isComing = p.status === 'coming-soon';
      const soldOut  = qty <= 0 && !isComing;
      const priceNum = Number(p.price) || 0;
      const title    = p.title || 'Item';
      const imgUrl   = p.image_url || 'assets/img/blank.jpg';

      // IMAGE (no badge inside here anymore)
      const imgBlock = `
        <a class="img" href="product.html?sku=${encodeURIComponent(p.sku)}">
          ${soldOut ? `<div class="soldout">Sold Out</div>` : ''}
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(title)}" loading="lazy">
        </a>
      `;

      const favActive = favSet.has(p.sku) ? 'active' : '';

      // STOCK ROW lives under the photo, above the rest of meta
      const stockRow = isComing
        ? '' // no quantity for coming soon
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
            <span class="price">${FC.formatPrice(priceNum)}</span>
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
      `;

      // Fav toggle
      const favBtn = card.querySelector('.fav');
      favBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const sku = favBtn.getAttribute('data-sku');
        const cur = new Set(FC.storage.get('favs', []));
        cur.has(sku) ? cur.delete(sku) : cur.add(sku);
        favBtn.classList.toggle('active');
        FC.storage.set('favs', Array.from(cur));
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
// === RESCUE PATCH - catalog.js (append to the very end of the file) ===

// Small ready helper (works even if this file is deferred)
(function onReady(fn){
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
})(function initShopCard() {
  // ---- DOM refs
  const img   = document.getElementById('sb-image');
  const sel   = document.getElementById('sb-branch');
  const add   = document.getElementById('sb-add');
  const buy   = document.getElementById('sb-buy');
  const price = 95; // base price shown on card

  // Bail if the card isn't on this page
  if (!img || !sel || !add || !buy) {
    console.warn('[FCC] Shop card elements not found — skipping bind');
    return;
  }

  // ---- Map <option value="..."> to image path
  // Adjust paths/names below to exactly match your /assets/img/... files.
  // The keys must match the <option value="..."> in your select.
  const STENCIL_IMG = {
    blank:           'assets/img/blank.jpg',
    'U.S. Army':     'assets/img/stencils/army.jpg',
    'U.S. Navy':     'assets/img/stencils/navy.jpg',
    'U.S. Air Force':'assets/img/stencils/air-force.jpg',
    'U.S. Marines':  'assets/img/stencils/marines.jpg',
    'U.S. Space Force':'assets/img/stencils/space-force.jpg',
    'U.S. Coast Guard':'assets/img/stencils/coast-guard.jpg'
  };

  // If your <option value> are short keys (e.g., "army", "navy"), switch to:
  // const STENCIL_IMG = { blank:'assets/img/blank.jpg', army:'assets/img/stencils/army.jpg', ... };

  function updatePreview() {
    const key = sel.value;
    const src = STENCIL_IMG[key] || STENCIL_IMG.blank;
    if (src && img.src.indexOf(src) === -1) {
      img.src = src;
    }
  }

  // Initial render
  updatePreview();

  // Live update
  sel.addEventListener('change', updatePreview);

  // ---- Cart helpers (use existing if present; else safe polyfill)
  const CART_KEY = 'fcc_cart_v1';

  function _readCartPoly() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function _setCartPoly(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items || [])); } catch {}
    if (typeof window.updateCartBadge === 'function') {
      window.updateCartBadge();
    } else {
      // fallback badge update
      const badge = document.getElementById('cartCount');
      if (badge) badge.textContent = String((items || []).reduce((n,i)=>n+(Number(i.qty)||1),0));
    }
  }

  const read = (typeof window.readCart === 'function') ? window.readCart : _readCartPoly;
  const write = (typeof window.setCart === 'function') ? window.setCart : _setCartPoly;

  // Build a canonical cart item for this product
  function currentItem() {
    const branch = sel.value;
    const sku = `fcc-classic:${branch || 'blank'}`;
    return {
      id: 'freedom-crate-classic',
      sku,
      name: 'Freedom Crate Classic',
      options: { branch },
      price,              // number
      qty: 1,
      image: img.getAttribute('src') || ''
    };
  }

  function addToCart(goCheckout) {
    const cart = read() || [];
    const item = currentItem();

    // merge by sku
    const i = cart.findIndex(x => (x.sku || x.id) === item.sku);
    if (i >= 0) {
      cart[i].qty = (Number(cart[i].qty)||1) + 1;
      cart[i].price = Number(item.price); // keep price fresh
    } else {
      cart.push(item);
    }
    write(cart);

    if (goCheckout) {
      // simple redirect; tweak if your checkout path differs
      window.location.href = 'checkout.html';
    }
  }

  // Wire up buttons
  add.addEventListener('click',  () => addToCart(false));
  buy.addEventListener('click',  () => addToCart(true));

  console.log('[FCC] Shop card bound OK');
});
// === END RESCUE PATCH ===
