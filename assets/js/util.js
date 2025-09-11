// assets/js/util.js
(function () {
  'use strict';

  const CART_KEY = 'cart';

  // --- hoisted so setCart can call it ---
  function cartCount(cart) {
    const arr = cart || readCart();
    return arr.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
  }
  // expose
  window.cartCount = cartCount;

  // Read the cart array from localStorage
  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  }
  window.readCart = readCart;

  // Save the cart and emit a consistent event
  function setCart(cart) {
    const safe = Array.isArray(cart) ? cart : [];
    localStorage.setItem(CART_KEY, JSON.stringify(safe));

    window.dispatchEvent(
      new CustomEvent('cart:updated', { detail: { cart: safe, count: cartCount(safe) } })
    );
  }
  window.setCart = setCart;

  // Update any badge element
  function updateCartBadge(count) {
    const n = (typeof count === 'number') ? count : cartCount();
    const badge = document.querySelector('[data-cart-badge], #cart-badge, .cart-badge');
    if (badge) badge.textContent = n;
  }
  window.updateCartBadge = updateCartBadge;

  // Keep badge in sync across tabs/pages
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) updateCartBadge();
  });

  // Listen to our own event
  window.addEventListener('cart:updated', (e) => {
    updateCartBadge(e && e.detail ? e.detail.count : undefined);
  });

  // Draw badge once on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => updateCartBadge());
  } else {
    updateCartBadge();
  }
})();
