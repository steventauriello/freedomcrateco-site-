/* assets/js/cart.js
   Lightweight cart helpers stored in localStorage.
   Exposes: readCart(), saveCart(), addToCart(), buyNow(), cartCount()
*/

(function () {
  // --- storage helpers ---
  function readCart() {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); }
    catch { return []; }
  }

  function cartCount(cart) {
    return (cart || []).reduce((sum, item) => sum + (item.qty || 1), 0);
  }

  function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    // Keep header badge in sync across pages/tabs
    const count = cartCount(cart);
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart, count } }));
  }

  // --- main API ---
  // NOTE: supports a 5th "meta" arg (e.g., { image: 'url' })
  function addToCart(sku, name, price, qty = 1, meta = {}) {
    // Optional lookup if only sku is provided
    if ((name == null || price == null) && window.PRODUCTS && window.PRODUCTS[sku]) {
      const p = window.PRODUCTS[sku];
      name  = name  ?? p.title;
      price = price ?? Number(p.price || 0);
      if (!meta.image && p.image_url) meta.image = p.image_url;
    }

    const cart = readCart();
    const found = cart.find(i => i.sku === sku);

    if (found) {
      found.qty = (found.qty || 0) + qty;
      // merge in meta so later adds can update image, etc.
      Object.assign(found, meta || {});
    } else {
      cart.push({ sku, name, price: Number(price || 0), qty: Number(qty || 1), ...(meta || {}) });
    }

    saveCart(cart);
  }

  function buyNow(sku, name, price, qty = 1, meta = {}) {
    addToCart(sku, name, price, qty, meta);
    window.location.href = 'checkout.html';
  }

  // --- header badge bootstrap + cross-tab sync ---
  function updateCartBadge(count) {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = count;
  }

  window.addEventListener('cart:updated', (e) => updateCartBadge(e.detail.count));
  document.addEventListener('DOMContentLoaded', () => updateCartBadge(cartCount(readCart())));
  window.addEventListener('storage', (e) => { if (e.key === 'cart') updateCartBadge(cartCount(readCart())); });

  // expose globally for inline/onclick usage
  window.readCart  = readCart;
  window.saveCart  = saveCart;
  window.addToCart = addToCart;
  window.buyNow    = buyNow;
  window.cartCount = cartCount;
})();