// assets/js/checkout.js

// Render the number in the header badge and (if available) call updateCartBadge()
function renderCartCount(n) {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = n;
  if (typeof updateCartBadge === 'function') updateCartBadge(n);
}

// Get cart array using your helper if present, otherwise from localStorage
function getCart() {
  if (typeof readCart === 'function') return readCart();
  try { return JSON.parse(localStorage.getItem('cart') || '[]'); }
  catch { return []; }
}

// Compute count using your helper if present, otherwise sum qty
function getCount(cart) {
  if (typeof cartCount === 'function') return cartCount(cart);
  return cart.reduce((n, i) => n + (i.qty || 1), 0);
}

// 1) On page load, sync the badge
document.addEventListener('DOMContentLoaded', () => {
  const cart = getCart();
  renderCartCount(getCount(cart));
});

// 2) Listen for updates that checkout makes and refresh the badge
window.addEventListener('cart:updated', (e) => {
  const detail = e && e.detail ? e.detail : {};
  if (typeof detail.count === 'number') {
    renderCartCount(detail.count);
  } else {
    // Fallback: recompute from storage
    const cart = getCart();
    renderCartCount(getCount(cart));
  }
});