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
  let here = location.pathname.split('/').pop() || 'index.html';
  here = here.toLowerCase();

  const alias = { 'product.html': 'index.html' };
  if (alias[here]) here = alias[here];

  document.querySelectorAll('.nav a').forEach(a => {
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
  const ON = false;
  if (!ON) return;

  function activate(){
    document.body.classList.add('maintenance');

    const header = document.querySelector('.site-header');
    if (header && !header.querySelector('.maint-banner')) {
      const div = document.createElement('div');
      div.className = 'maint-banner';
      div.setAttribute('role','status');
      div.innerHTML = '🚧 <strong>Website under construction.</strong> Checkout is temporarily disabled.';
      header.prepend(div);
    }

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
  function isHomepage() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    return path === '/' || path === '/index.html';
  }

  function normalizePath(href) {
    try {
      const url = new URL(href, location.origin);
      return url.pathname.replace(/\/+$/, '') + url.hash;
    } catch (_) {
      return String(href || '').trim();
    }
  }

  function removeSecondaryHeaderLinks() {
    if (!isHomepage()) return;

    // CSS fallback guarantees these links stay hidden even if another script
    // rebuilds the header after this script runs.
    if (!document.getElementById('fcc-home-nav-cleanup')) {
      const style = document.createElement('style');
      style.id = 'fcc-home-nav-cleanup';
      style.textContent = `
        body.homepage-clean-nav #primaryNav a[href$="about.html"],
        body.homepage-clean-nav #primaryNav a[href*="rd-materials-coatings-engineering.html"],
        body.homepage-clean-nav #primaryNav a[href*="about.html#final-salute-project"],
        body.homepage-clean-nav #primaryNav .nav-cta a:not(.btn) {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.classList.add('homepage-clean-nav');

    const nav = document.getElementById('primaryNav');
    if (!nav) return;

    nav.querySelectorAll('a').forEach(link => {
      const path = normalizePath(link.getAttribute('href'));
      const label = (link.textContent || '').trim().toLowerCase();

      const shouldRemove =
        path === '/about.html' ||
        path === '/rd-materials-coatings-engineering.html' ||
        path === '/about.html#final-salute-project' ||
        label === 'about' ||
        label === 'r&d' ||
        label === 'final salute project';

      if (shouldRemove) link.remove();
    });
  }

  function rebuildCompanyFooter() {
    if (!isHomepage()) return;

    const companySection = Array.from(document.querySelectorAll('.fcc-footer .footer-accordion details'))
      .find(section => section.querySelector('summary')?.textContent.trim() === 'Company');

    if (!companySection) return;

    companySection.querySelectorAll('a').forEach(link => link.remove());

    const footerLinks = [
      { href: '/about.html', label: 'About Us' },
      { href: '/reviews.html', label: 'Reviews' },
      { href: '/registry.html', label: 'Official Crate Registry' },
      { href: '/about.html#final-salute-project', label: 'Final Salute Project' },
      { href: '/rd-materials-coatings-engineering.html', label: 'R&D' },
      { href: '/engineering-notebook.html', label: 'Engineering Notebook' }
    ];

    footerLinks.forEach(item => {
      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;
      companySection.appendChild(link);
    });
  }

  function applyChanges() {
    removeSecondaryHeaderLinks();
    rebuildCompanyFooter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyChanges);
  } else {
    applyChanges();
  }

  // Run once more after deferred page scripts finish in case they rebuild the nav.
  window.addEventListener('load', removeSecondaryHeaderLinks, { once: true });
  setTimeout(removeSecondaryHeaderLinks, 500);
})();
