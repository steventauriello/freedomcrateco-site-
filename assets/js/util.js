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
// ---- Maintenance mode (banner + disabled checkout) ----
(function maintenanceMode(){
  const ON = true;               // <-- flip to false to turn OFF

  if (!ON) return;

  function activate(){
    // add class so CSS dims/disables buy buttons & checkout link
    document.body.classList.add('maintenance');

    // inject the red banner at the top of the header
    const header = document.querySelector('.site-header');
    if (header && !header.querySelector('.maint-banner')) {
      const div = document.createElement('div');
      div.className = 'maint-banner';
      div.setAttribute('role','status');
      div.innerHTML = '🚧 <strong>Website under construction.</strong> Checkout is temporarily disabled.';
      header.prepend(div);
    }

    // extra guard: neuter any checkout links
    document.querySelectorAll('a[href*="checkout.html"]').forEach(a=>{
      a.setAttribute('aria-disabled','true');
      a.addEventListener('click', e => e.preventDefault());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activate);
  } else {
    activate();
  }
})();