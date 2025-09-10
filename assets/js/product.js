(async function(){
  const params = new URLSearchParams(location.search);
  const sku = params.get('sku');
  const host = document.getElementById('productHost');
  if (!host){ return; }

  const all = await FC.loadProducts();
  const item = all.find(p => p.sku === sku) || all[0];
  if (!item){
    host.innerHTML = '<p class="muted">Product not found.</p>';
    return;
  }

  host.innerHTML = render(item);

  // Buy button → simple cart in localStorage + link to checkout
  document.getElementById('buyBtn').addEventListener('click', () => {
    const cart = FC.storage.get('cart', []);
    const existing = cart.find(i => i.sku === item.sku);
    if (existing) existing.qty += 1; else cart.push({ sku: item.sku, title: item.title, price: item.price, qty: 1 });
    FC.storage.set('cart', cart);
    location.href = 'checkout.html';
  });

  function render(p){
    const img = p.images && p.images.length ? `<img src="${p.images[0]}" alt="${escapeHtml(p.title)}">` : '<div class="ph" style="height:320px"></div>';
    const sold = p.qty <= 0;
    return `
      <div class="product">
        <div class="gallery">${img}</div>
        <div class="info">
          <div class="sku muted">SKU: ${escapeHtml(p.sku)}</div>
          <h1>${escapeHtml(p.title)}</h1>
          <div class="price">${FC.formatPrice(p.price)}</div>
          <p>${escapeHtml(p.description || '')}</p>
          <div class="buy-row">
            ${sold ? '<span class="btn danger">Sold Out</span>' : '<button id="buyBtn" class="btn">Buy Now</button>'}
            <a href="index.html">Back to Shop</a>
          </div>
        </div>
      </div>`;
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
})();