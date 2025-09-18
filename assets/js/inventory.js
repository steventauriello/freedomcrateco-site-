/* assets/js/inventory.js */
// Inventory override disabled – products.json is now the single source of truth.
(function () {
  // When products finish loading, just notify listeners so the grid can rerender.
  window.addEventListener('products:loaded', () => {
    window.dispatchEvent(new Event('inventory:updated'));
  });
})();