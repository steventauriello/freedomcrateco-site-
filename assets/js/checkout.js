// assets/js/checkout.js (updated to match cart.js API)
(function () {
  'use strict';

  const money = (n) => `$${Number(n || 0).toFixed(2)}`;
  const escapeHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Stable key for cart items
  const getKey = (item) => item?.sku ?? item?.id ?? item?.key ?? null;

  // Keep a hidden <input id="cartJson"> in sync if present (optional)
  function syncHiddenCart() {
    const hidden = document.getElementById('cartJson');
    if (!hidden) return;
    const cart = readCart();
    const total = cartTotal(cart);
    hidden.value = JSON.stringify({ items: cart, total: Number(total.toFixed(2)) });
  }

  function renderCart() {
    const body   = document.getElementById('cartBody');
    const totalE = document.getElementById('cartTotal');
    if (!body || !totalE) return;

    const cart = readCart();
    body.innerHTML = '';

    if (!cart.length) {
      body.innerHTML = `<tr><td colspan="5" class="muted">Your cart is empty.</td></tr>`;
      totalE.textContent = money(0);
      syncHiddenCart();
      return;
    }

    cart.forEach(item => {
      const key   = getKey(item);
      const qty   = Math.max(0, Number(item.qty || 0)); // allow 0 (we'll remove on update)
      const price = Number(item.price || 0);
      const sub   = qty * price;

      const tr = document.createElement('tr');
      tr.dataset.key = key;

      tr.innerHTML = `
        <td>
          <div style="display:flex;align-items:center;gap:.75rem;">
            <img src="${escapeHtml(item?.meta?.image || item.image || 'assets/img/blank.jpg')}"
                 alt="${escapeHtml(item.name || 'Item')}"
                 width="64" height="64" style="border-radius:6px;object-fit:cover">
            <div>
              <div style="font-weight:600">${escapeHtml(item.name || item.sku || 'Item')}</div>
              <div class="muted">SKU: ${escapeHtml(item.sku || '')}</div>
            </div>
          </div>
        </td>

        <td class="qty-cell" style="min-width:120px;">
          <!-- PLUS ON TOP -->
          <button class="qty-inc" type="button" aria-label="Increase quantity">+</button>
          <input class="qty" type="number" inputmode="numeric" pattern="[0-9]*"
                 min="0" value="${qty}" style="width:70px" />
          <!-- MINUS ON BOTTOM -->
          <button class="qty-dec" type="button" aria-label="Decrease quantity">−</button>
        </td>

        <td>${money(price)}</td>
        <td class="subtotal">${money(sub)}</td>
        <td><button class="remove" type="button">Remove</button></td>
      `;

      body.appendChild(tr);
    });

    totalE.textContent = money(cartTotal(readCart()));
    syncHiddenCart();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const body = document.getElementById('cartBody');
    if (!body) return;

    // Change qty by typing
    body.addEventListener('change', (e) => {
      if (!e.target.matches('.qty')) return;
      const row = e.target.closest('tr');
      const key = row?.dataset.key;
      const raw = Number(e.target.value || 0);

      if (!key) return;
      if (!Number.isFinite(raw) || raw <= 0) removeItem(key);
      else setQty(key, raw);
      // cart:updated event will call renderCart; calling directly is fine too:
      renderCart();
    });

    // + / − / Remove (delegated)
    document.addEventListener('click', (e) => {
      const incBtn    = e.target.closest('#cartBody .qty-inc');
      const decBtn    = e.target.closest('#cartBody .qty-dec');
      const removeBtn = e.target.closest('#cartBody .remove');
      if (!incBtn && !decBtn && !removeBtn) return;

      const row = e.target.closest('#cartBody tr');
      const key = row?.dataset.key;
      if (!key) return;

      const current = readCart().find(i => getKey(i) === key);
      const curQty = Number(current?.qty || 0);

      if (incBtn) {
        setQty(key, curQty + 1);
      } else if (decBtn) {
        const next = curQty - 1;
        if (next <= 0) removeItem(key);
        else setQty(key, next);
      } else if (removeBtn) {
        removeItem(key);
      }
      renderCart();
    });

    // "Update Cart" button (if you keep one on the page)
    document.getElementById('updateCartBtn')?.addEventListener('click', () => {
      const rows = document.querySelectorAll('#cartBody tr');
      if (!rows.length) return;

      rows.forEach(row => {
        const key = row.dataset.key;
        const input = row.querySelector('.qty');
        if (!key || !input) return;

        const raw = Number(input.value || 0);
        if (!Number.isFinite(raw) || raw <= 0) removeItem(key);
        else setQty(key, raw);
      });

      renderCart();
    });

    renderCart();
  });

  // Repaint when cart changes elsewhere
  window.addEventListener('cart:updated', renderCart);
  // You can keep this for belt-and-suspenders cross-tab updates (cart.js dispatches cart:updated already)
  window.addEventListener('storage', renderCart);
})();