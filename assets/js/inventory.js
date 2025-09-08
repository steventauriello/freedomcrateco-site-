// assets/js/inventory.js
// Loads live quantities from assets/data/inventory.json and
// merges them into window.PRODUCTS, then re-renders the grid.

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

  // 2) ensure products are loaded
  try {
    if (!window.PRODUCTS || !Object.keys(window.PRODUCTS).length) {
      if (typeof loadProducts === 'function') {
        await loadProducts();
      }
    }
  } catch (_) {}

  // 3) merge quantities into PRODUCTS
  if (window.PRODUCTS) {
    Object.entries(window.INVENTORY).forEach(([sku, qty]) => {
      if (window.PRODUCTS[sku]) {
        window.PRODUCTS[sku].qty = Number(qty) || 0;
      }
    });
  }

  // 4) re-render shop grid if present
  if (document.getElementById('products') && typeof renderShopGrid === 'function') {
    renderShopGrid('#products');
  }
})();