// assets/js/util.js
// Global "Add to Cart" blip helper so all pages can use it
(function () {
  'use strict';

  function flashAddToCart(button) {
    if (!button) return;
    button.classList.remove('btn-blip');
    button.offsetWidth;
    button.classList.add('btn-blip');
  }

  if (typeof window.flashAddToCart !== 'function') {
    window.flashAddToCart = flashAddToCart;
  }
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
  const ON = false;               // <-- flip to false to turn OFF

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

// Homepage-only navigation cleanup and footer links.
(function updateHomepageNavigation() {
  function updateNavigation() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const isHomepage = path === '/' || path === '/index.html';
    if (!isHomepage) return;

    const nav = document.getElementById('primaryNav');
    if (nav) {
      const removeHrefs = [
        '/about.html',
        '/rd-materials-coatings-engineering.html',
        '/about.html#final-salute-project'
      ];

      nav.querySelectorAll('a').forEach(link => {
        if (removeHrefs.includes(link.getAttribute('href') || '')) {
          link.remove();
        }
      });
    }

    const companySection = Array.from(document.querySelectorAll('.fcc-footer .footer-accordion details'))
      .find(section => section.querySelector('summary')?.textContent.trim() === 'Company');

    if (!companySection) return;

    const footerLinks = [
      { href: '/about.html', label: 'About Us' },
      { href: '/reviews.html', label: 'Reviews' },
      { href: '/registry.html', label: 'Official Crate Registry' },
      { href: '/about.html#final-salute-project', label: 'Final Salute Project' },
      { href: '/rd-materials-coatings-engineering.html', label: 'R&D' },
      { href: '/engineering-notebook.html', label: 'Engineering Notebook' }
    ];

    footerLinks.forEach(item => {
      if (companySection.querySelector(`a[href="${item.href}"]`)) return;
      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;
      companySection.appendChild(link);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNavigation);
  } else {
    updateNavigation();
  }
})();