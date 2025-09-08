// assets/js/inventory.js
// Loads live quantities from assets/data/inventory.json and
// merges them into window.PRODUCTS, then notifies the catalog to re-render.

window.INVENTORY = {};

(async function loadInventory() {
  // 1) fetch JSON (no cache)
  try {
    const url = 'assets/data/inventory.json?v=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    window.INVENTORY = res.ok ? await res.json() : {};
  } catch (_) {
    window.INVENTORY = {};
  }

  // 2) ensure products are loaded first (FC.loadProducts provided by data.js)
  try {
    if (!window.PRODUCTS || !Object.keys(window.PRODUCTS).length) {
      if (typeof window.FC?.loadProducts === 'function') {
        const arr = await window.FC.loadProducts(); // populates window.PRODUCTS
        // ensure map (some loaders return array)
        if (Array.isArray(arr)) {
          window.PRODUCTS = Object.fromEntries(arr.map(p => [p.sku, p]));
        }
      } else if (typeof window.loadProducts === 'function') {
        await window.loadProducts();
      }
    }
  } catch (_) {}

  // 3) merge quantities into PRODUCTS (by SKU)
  if (window.PRODUCTS && window.INVENTORY) {
    for (const [sku, qty] of Object.entries(window.INVENTORY)) {
      if (window.PRODUCTS[sku]) {
        window.PRODUCTS[sku].qty = Number(qty) || 0;
      }
    }
  }

  // 4) tell the catalog to re-render
  window.dispatchEvent(new CustomEvent('inventory:updated', {
    detail: { inventory: window.INVENTORY }
  }));
})();