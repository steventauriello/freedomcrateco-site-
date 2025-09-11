/* assets/js/cart.js (hardened)
   Lightweight cart helpers stored in localStorage.
   Exposes: readCart(), saveCart(), addToCart(), buyNow(), cartCount(),
            setQty(), removeItem(), clearCart(), cartTotal()
*/
(function () {
  if (window.__FCC_CART_INIT__) return; // singleton guard
  window.__FCC_CART_INIT__ = true;

  const KEY = 'fcc_cart_v1';

  // --- utilities ---
  const toNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const clampQty = (q) => Math.max(0, Math.floor(toNum(q, 0)));

  // --- storage helpers ---
  function readCart() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }

  function cartCount(cart) {
    return (cart || []).reduce((sum, item) => sum + clampQty(item.qty || 1), 0);
  }

  function cartTotal(cart) {
    return (cart || []).reduce((sum, item) => {
      const qty = clampQty(item.qty || 1);
      const price = toNum(item.price, 0);
      return sum + qty * price;
    }, 0);
  }

  function saveCart(cart) {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (_) {}
    const count = cartCount(cart);
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart, count } }));
  }

  // --- main API ---
  // meta is stored under a 'meta' object so it can't overwrite core fields
  function addToCart(sku, name, price, qty = 1, meta = {}) {
    const addQty = clampQty(qty || 1);
    if (!sku || addQty <= 0) return;

    // Optional lookup if only sku is provided
    if ((name == null || price == null) && window.PRODUCTS && window.PRODUCTS[sku]) {
      const p = window.PRODUCTS[sku];
      name  = name  ?? p.title;
      price = price ?? toNum(p.price, 0);
      if (meta && !meta.image && p.image_url) meta.image = p.image_url;
    }

    const cart = readCart();
    const idx = cart.findIndex(i => i.sku === sku);

    if (idx >= 0) {
      const found = cart[idx];
      found.qty = clampQty((found.qty || 0) + addQty);
      found.price = toNum(found.price ?? price, 0); // keep original unless missing
      found.meta = { ...(found.meta || {}), ...(meta || {}) };
      if (found.qty === 0) cart.splice(idx, 1);
    } else {
      cart.push({
        sku,
        name: String(name || sku),
        price: toNum(price, 0),
        qty: addQty,
        meta: { ...(meta || {}) }
      });
    }

    saveCart(cart);
  }

  function setQty(sku, qty) {
    if (!sku) return;
    const cart = readCart();
    const idx = cart.findIndex(i => i.sku === sku);
    if (idx < 0) return;

    const q = clampQty(qty);
    if (q <= 0) cart.splice(idx, 1);
    else cart[idx].qty = q;

    saveCart(cart);
  }

  function removeItem(sku) {
    setQty(sku, 0);
  }

  function clearCart() {
    saveCart([]);
  }

  function buyNow(sku, name, price, qty = 1, meta = {}) {
    addToCart(sku, name, price, qty, meta);
    window.location.href = 'checkout.html';
  }

  // --- header badge bootstrap + cross-tab sync ---
  function updateCartBadge(count) {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = String(toNum(count, cartCount(readCart())));
  }

  window.addEventListener('cart:updated', (e) => {
    const c = e?.detail?.count;
    updateCartBadge(c);
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge(cartCount(readCart()));
  });

  window.addEventListener('storage', (e) => {
    if (e.key === KEY) updateCartBadge(cartCount(readCart()));
  });

  // expose globally for inline/onclick or other modules
  window.readCart   = readCart;
  window.saveCart   = saveCart;
  window.addToCart  = addToCart;
  window.buyNow     = buyNow;
  window.cartCount  = cartCount;
  window.cartTotal  = () => cartTotal(readCart());
  window.setQty     = setQty;
  window.removeItem = removeItem;
  window.clearCart  = clearCart;
})();