// assets/js/util.js
(function () {
  'use strict';

  const CART_KEY = 'cart';

  // Read the cart array from localStorage
  window.readCart = function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  };

  // Save the cart and emit a consistent event
  window.setCart = function setCart(cart) {
    const safe = Array.isArray(cart) ? cart : [];
    localStorage.setItem(CART_KEY, JSON.stringify(safe));

    // Calculate item count for the badge
    const count = safe.reduce((sum, i) => sum + (Number(i.qty) || 1), 0);

    // Fire a CustomEvent with the shape that cart.js expects
    window.dispatchEvent(
      new CustomEvent('cart:updated', { detail: { cart: safe, count } })
    );
  };
})();