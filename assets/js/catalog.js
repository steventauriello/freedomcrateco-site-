/* assets/js/catalog.js
   Renders product cards from FC.loadProducts() and wires Add/Buy.
   Requires FC.loadProducts(), FC.formatPrice(), FC.storage.get/set().
*/
(function () {
  const listEl = document.getElementById('products');
  if (!listEl) return;

  Promise.all([
    FC.loadProducts(),
    Promise.resolve(FC.storage.get('favs', []))
  ]).then(([items, favs]) => {
    try { window.PRODUCTS = Object.fromEntries(items.map(p => [p.sku, p])); } catch(_) {}
    render(items, new Set(favs));
    wireFilters(items);
  });

  function wireFilters(items) {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-filter');
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const favSet = new Set(FC.storage.get('favs', []));
        render(mode === 'favorites' ? items.filter(p => favSet.has(p.sku)) : items, favSet);
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
      card.className = 'card no-title-overlay';              // <-- disable legacy title overlay via CSS

      const priceNum = Number(p.price) || 0;
      const title    = p.title || 'Item';
      const qty      = Number(p.qty) || 0;
      const lowLeft  = qty > 0 && qty <= 2;                  // tweak threshold if you like

      // image + stock badge
      const imgHtml = `
        <img src="${escapeHtml(p.image_url)}"
             alt="${escapeHtml(title)}"
             class="ph product-hero"
             onerror="this.onerror=null; this.src='assets/img/placeholder.png'">
        ${ qty <= 0
            ? `<span class="badge danger stock-badge">Coming back soon</span>`
            : (lowLeft ? `<span class="badge warn stock-badge">Only ${qty} left</span>` : '')
        }
      `;

      const favActive = favSet.has(p.sku) ? 'active' : '';

      card.innerHTML = `
        <a class="img" href="product.html?sku=${encodeURIComponent(p.sku)}">
          ${imgHtml}
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
            ${ qty > 0
                ? `<div class="actions">
                     <button class="btn" data-add="${escapeHtml(p.sku)}">Add to Cart</button>
                     <button class="btn" data-buy="${escapeHtml(p.sku)}">Buy Now</button>
                   </div>`
                : `<span class="muted">Unavailable</span>`
            }
          </div>
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
        window.addToCart(p.sku, title, priceNum, 1, { image: p.image_url });
      });
      if (buyBtn) buyBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        window.buyNow(p.sku, title, priceNum, 1, { image: p.image_url });
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