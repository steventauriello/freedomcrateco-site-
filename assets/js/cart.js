/* assets/js/cart.js (FIXED)
   LocalStorage cart with simple API.
   Exposes: readCart(), saveCart(), addToCart(), buyNow(), cartCount()
*/
(function () {
  'use strict';

  const CART_KEY = 'cart';

  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart || []));
    const count = cartCount(cart);
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { count, cart } }));
  }

  function cartCount(cart) {
    return (cart || []).reduce((sum, item) => sum + (item.qty || 1), 0);
  }

  function addToCart(sku, name, price, qty = 1, meta = {}) {
    const cart = readCart();
    const key = `${sku}${meta.branch ? ':' + meta.branch : ''}`;
    const idx = cart.findIndex(i => i.key === key);
    if (idx >= 0) {
      cart[idx].qty += qty;
    } else {
      cart.push({ key, sku, name, price, qty, meta });
    }
    saveCart(cart);
  }

  function buyNow(sku, name, price, qty = 1, meta = {}) {
    addToCart(sku, name, price, qty, meta);
    location.href = 'checkout.html';
  }

  function updateCartBadge(count) {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = count;
  }

  // Initial badge + cross-tab sync
  document.addEventListener('DOMContentLoaded', () => updateCartBadge(cartCount(readCart())));
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) updateCartBadge(cartCount(readCart()));
  });
  window.addEventListener('cart:updated', (e) => updateCartBadge(e.detail.count));

  // Expose globally
  window.readCart  = readCart;
  window.saveCart  = saveCart;
  window.addToCart = addToCart;
  window.buyNow    = buyNow;
  window.cartCount = cartCount;
})();
