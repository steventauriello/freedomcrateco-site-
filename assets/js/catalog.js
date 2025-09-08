/* assets/js/catalog.js
   Renders product cards with Add to Cart + Buy Now buttons.
   Supports: favorites, sold-out (qty=0), coming-soon (status="coming-soon").
   Depends on:
   - FC.loadProducts()  (from data.js)
   - FC.formatPrice(n)  (from data.js)
   - FC.storage.get/set (from data.js)
   - window.addToCart / window.buyNow (from cart.js)
*/
(function () {
  const listEl = document.getElementById('products');
  if (!listEl) return;

  Promise.all([
    FC.loadProducts(),
    Promise.resolve(FC.storage.get('favs', []))
  ]).then(([items, favs]) => {
    // simple map for other scripts that expect PRODUCTS
    try { window.PRODUCTS = Object.fromEntries(items.map(p => [p.sku, p])); } catch (_) {}
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
      const classes = ['card'];
      if (p.status === 'coming-soon') classes.push('coming-soon'); // CSS adds diagonal banner
      card.className = classes.join(' ');

      const imgHtml = p.image_url
        ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.title)}" class="ph">`
        : `<div class="ph"></div>`;

      const soldHtml = (Number(p.qty) <= 0 && p.status !== 'coming-soon')
        ? `<div class="soldout">Sold Out</div>` : '';

      const favActive = favSet.has(p.sku) ? 'active' : '';
      const priceNum = Number(p.price) || 0;
      const title    = p.title || 'Item';

      card.innerHTML = `
        <a class="img" href="product.html?sku=${encodeURIComponent(p.sku)}">
          ${imgHtml}
          ${soldHtml}
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
              p.status === 'coming-soon'
                ? `<span class="muted">Coming Soon</span>`
                : (Number(p.qty) > 0
                    ? `<div class="actions">
                         <button class="btn" data-add="${escapeHtml(p.sku)}">Add to Cart</button>
                         <button class="btn" data-buy="${escapeHtml(p.sku)}">Buy Now</button>
                       </div>`
                    : `<span class="muted">Unavailable</span>`)
            }
          </div>
        </div>
      `;

      // favorite toggle
      const favBtn = card.querySelector('.fav');
      favBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const sku = favBtn.getAttribute('data-sku');
        const cur = new Set(FC.storage.get('favs', []));
        cur.has(sku) ? cur.delete(sku) : cur.add(sku);
        favBtn.classList.toggle('active');
        FC.storage.set('favs', Array.from(cur));
      });

      // add/buy buttons
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