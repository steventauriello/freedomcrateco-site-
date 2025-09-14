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
// Auto-set active nav link based on current page
(function(){
  let here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  // Treat product pages as part of "Shop"
  const alias = { 'product.html': 'index.html' };
  if (alias[here]) here = alias[here];

  document.querySelectorAll('.nav a').forEach(a => {
    const target = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
    if (target === here) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
})();