/* assets/js/cart.js (dual-key compatibility)
   Lightweight cart helpers stored in localStorage.
   Exposes: readCart(), saveCart(), addToCart(), buyNow(), cartCount(),
            setQty(), removeItem(), clearCart(), cartTotal()
*/
(function () {
  if (window.__FCC_CART_INIT__) return; // singleton guard
  window.__FCC_CART_INIT__ = true;

  // Primary + legacy keys (we read from both; we write to both)
  const KEY_PRIMARY = 'fcc_cart_v1';
  const KEY_LEGACY  = 'cart';

  // --- utilities ---
  const toNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const clampQty = (q) => Math.max(0, Math.floor(toNum(q, 0)));

  // --- storage helpers ---
  function _read(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  function _write(key, cart) {
    try { localStorage.setItem(key, JSON.stringify(cart)); } catch (_) {}
  }

  function _mergeCarts(a, b) {
    // merge by sku (prefer quantities from 'a', then add items from 'b' not in 'a')
    const out = Array.isArray(a) ? [...a] : [];
    const bySku = new Map(out.map(it => [it.sku, it]));
    (Array.isArray(b) ? b : []).forEach(it => {
      if (!it || !it.sku) return;
      if (!bySku.has(it.sku)) out.push(it);
    });
    return out;
  }

  function readCart() {
    const p = _read(KEY_PRIMARY);
    const l = _read(KEY_LEGACY);
    // If either has data, merge (handles mixed usage across pages)
    const merged = _mergeCarts(p, l);
    return merged;
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
    // Write to BOTH keys to keep legacy pages in sync
    _write(KEY_PRIMARY, cart);
    _write(KEY_LEGACY,  cart);
    const count = cartCount(cart);
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart, count } }));
  }

  // --- main API ---
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

  function removeItem(sku) { setQty(sku, 0); }

  function clearCart() {
    saveCart([]); // writes to both keys and dispatches event
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

  // Listen to storage for BOTH keys (cross-tab or legacy code writes)
  window.addEventListener('storage', (e) => {
    if (e.key === KEY_PRIMARY || e.key === KEY_LEGACY) {
      updateCartBadge(cartCount(readCart()));
    }
  });

  // expose globally
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