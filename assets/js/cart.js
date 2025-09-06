// --- Cart helpers ---
function readCart() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]'); }
  catch { return []; }
}

function cartCount(cart) {
  return cart.reduce((sum, item) => sum + (item.qty || 1), 0);
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  // Dispatch an event so all pages update instantly
  window.dispatchEvent(new CustomEvent('cart:updated', {
    detail: { cart, count: cartCount(cart) }
  }));
}

function addToCart(sku, name, price, qty = 1) {
  // If name/price not supplied, pull from PRODUCTS (loaded by data.js)
  if ((name == null || price == null) && window.PRODUCTS && window.PRODUCTS[sku]) {
    const p = window.PRODUCTS[sku];
    name = name ?? p.title;
    price = price ?? Number(p.price || 0);
  }

  let cart = readCart();
  let found = cart.find(i => i.sku === sku);

  if (found) {
    found.qty = (found.qty || 0) + qty;
  } else {
    cart.push({ sku, name, price, qty });
  }

  saveCart(cart);
}

function buyNow(sku, name, price, qty = 1) {
  addToCart(sku, name, price, qty);
  window.location.href = 'checkout.html';
}


// --- Cart badge updater ---
function updateCartBadge(count) {
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

// Keep badge in sync
window.addEventListener('cart:updated', (e) => updateCartBadge(e.detail.count));
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge(cartCount(readCart()));
});
// Also update if another tab changes localStorage
window.addEventListener('storage', (e) => {
  if (e.key === 'cart') updateCartBadge(cartCount(readCart()));
});

// Expose functions for your inline onclick handlers
window.addToCart = addToCart;
window.buyNow    = buyNow;
