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
(function () {
  // Normalize current page (handle "/" + query + hash)
  let here = location.pathname.split('/').pop() || 'index.html';
  here = here.toLowerCase();

  // Map certain pages to an existing tab
  const alias = { 'product.html': 'index.html' };
  if (alias[here]) here = alias[here];

  document.querySelectorAll('.nav a').forEach(a => {
    // Normalize target href (strip path, query, hash)
    const href = (a.getAttribute('href') || '').split('/').pop();
    const target = href.split('?')[0].split('#')[0].toLowerCase();

    const isActive = target === here;
    a.classList.toggle('active', isActive);

    if (isActive) {
      a.setAttribute('aria-current', 'page');
    } else {
      a.removeAttribute('aria-current');
    }
  });
})();