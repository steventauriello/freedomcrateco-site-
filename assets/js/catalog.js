(async function(){
  const listEl = document.getElementById('products');
  if (!listEl) return;

  const [items, favs] = await Promise.all([FC.loadProducts(), Promise.resolve(FC.storage.get('favs', []))]);
  render(items, new Set(favs));

  // Filter buttons
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-filter');
      document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const set = new Set(FC.storage.get('favs', []));
      if (mode === 'favorites'){
        render(items.filter(p => set.has(p.sku)), set);
      } else {
        render(items, set);
      }
    });
  });

  function render(list, favSet){
    listEl.innerHTML = '';
    if (!list.length){
      listEl.innerHTML = '<p class="muted">No products to show.</p>';
      return;
    }
    list.forEach(p => {
      const card = document.createElement('article');
      card.className = 'card';
      const img = p.image_url ? `<img src="${p.image_url}" alt="${escapeHtml(p.title)}" class="ph">` : `<div class="ph"></div>`;
      const sold = (p.qty <= 0) ? `<div class="soldout">Sold Out</div>` : '';
      const favActive = favSet.has(p.sku) ? 'active' : '';
      card.innerHTML = `
        <a class="img" href="product.html?sku=${encodeURIComponent(p.sku)}">
          ${img}
          ${sold}
          <div class="fav ${favActive}" data-sku="${escapeHtml(p.sku)}" title="Favorite">
            <svg viewBox="0 0 24 24"><path d="M12 21s-6.716-3.948-9.428-6.66C.86 12.628.5 10.5 1.757 9.243c1.257-1.257 3.385-.897 5.097.815L12 13.204l5.146-5.146c1.712-1.712 3.84-2.072 5.097-.815 1.257 1.257.897 3.385-.815 5.097C18.716 17.052 12 21 12 21z"/></svg>
          </div>
        </a>
        <div class="meta">
          <div class="sku">SKU: ${escapeHtml(p.sku)}</div>
          <h3><a href="product.html?sku=${encodeURIComponent(p.sku)}">${escapeHtml(p.title)}</a></h3>
          <p>${escapeHtml(p.description || '')}</p>
          <div class="price-row">
            <span class="price">${FC.formatPrice(p.price)}</span>
            ${p.qty > 0 ? '<a href="product.html?sku='+encodeURIComponent(p.sku)+'" class="btn sm">Buy</a>' : '<span class="muted">Unavailable</span>'}
          </div>
        </div>`;
      // Heart toggle
      const favBtn = card.querySelector('.fav');
      favBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sku = favBtn.getAttribute('data-sku');
        const cur = new Set(FC.storage.get('favs', []));
        if (cur.has(sku)) { cur.delete(sku); favBtn.classList.remove('active'); }
        else { cur.add(sku); favBtn.classList.add('active'); }
        FC.storage.set('favs', Array.from(cur));
      });
      listEl.appendChild(card);
    });
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
})();