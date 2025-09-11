// assets/js/util.js
(function () {
  'use strict';

  const CART_KEY = 'cart';

  window.readCart = function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  };

  window.setCart = function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart || []));
    window.dispatchEvent(new Event('cart:updated'));
  };
})();