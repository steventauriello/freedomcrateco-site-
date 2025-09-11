// assets/js/checkout.js
(function () {
  'use strict';

  const money = (n) => `$${Number(n || 0).toFixed(2)}`;
  const escapeHtml = (s) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // from util.js / cart.js
  // readCart(), setCart()
  // cartCount(), updateCartBadge()

  const getKey = (item) => item?.sku ?? item?.id ?? item?.key ?? null;

  function syncHiddenCart() {
    const hidden = document.getElementById('cartJson');
    if (!hidden) return;
    const cart = readCart();
    const total = cart.reduce((sum, i) =>
      sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    hidden.value = JSON.stringify({ items: cart, total: Number(total.toFixed(2)) });
  }

  function renderCart() {
    const body   = document.getElementById('cartBody');
    const totalE = document.getElementById('cartTotal');
    const cart   = readCart();
    if (!body || !totalE) return;

    body.innerHTML = '';
    let total = 0;

    if (!cart.length) {
      body.innerHTML = `<tr><td colspan="5" class="muted">Your cart is empty.</td></tr>`;
      totalE.textContent = money(0);
      updateCartBadge(cartCount(cart));
      syncHiddenCart();
      return;
    }

    cart.forEach(item => {
      const key   = getKey(item);
      const qty   = Math.max(0, Number(item.qty || 0)); // allow 0
      const price = Number(item.price || 0);
      const sub   = qty * price;
      total += sub;

      const tr = document.createElement('tr');
      tr.dataset.key = key;

      tr.innerHTML = `
        <td>${escapeHtml(item.name || item.sku || item.id || 'Item')}</td>

        <td class="qty-cell">
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

    totalE.textContent = money(total);
    updateCartBadge(cartCount(cart));
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

      let cart = readCart();
      const idx = cart.findIndex(i => getKey(i) === key);
      if (idx === -1) return;

      if (!Number.isFinite(raw) || raw <= 0) cart.splice(idx, 1);
      else cart[idx].qty = raw;

      setCart(cart);
      renderCart();
    });

    // + / − / Remove (delegated)
    document.getElementById('cartBody')?.addEventListener('click', (e) => {
      const incBtn    = e.target.closest('#cartBody .qty-inc');
      const decBtn    = e.target.closest('#cartBody .qty-dec');
      const removeBtn = e.target.closest('#cartBody .remove');
      if (!incBtn && !decBtn && !removeBtn) return;

      const row = e.target.closest('#cartBody tr');
      if (!row) return;
      const key = row.dataset.key;

      let cart = readCart();
      const idx = cart.findIndex(i => getKey(i) === key);
      if (idx === -1) return;

      if (incBtn) {
        cart[idx].qty = (Number(cart[idx].qty) || 0) + 1;
      } else if (decBtn) {
        const next = (Number(cart[idx].qty) || 0) - 1;
        if (next <= 0) cart.splice(idx, 1);
        else cart[idx].qty = next;
      } else if (removeBtn) {
        cart.splice(idx, 1);
      }

      setCart(cart);
      renderCart();
    });

    // Update Cart button
    document.getElementById('updateCartBtn')?.addEventListener('click', () => {
      const rows = document.querySelectorAll('#cartBody tr');
      if (!rows.length) return;

      let cart = readCart();
      const pos = new Map(cart.map((it, i) => [getKey(it), i]));

      rows.forEach(row => {
        const key = row.dataset.key;
        const input = row.querySelector('.qty');
        if (!key || !input) return;

        const raw = Number(input.value || 0);
        const idx = pos.get(key);
        if (idx == null) return;

        if (!Number.isFinite(raw) || raw <= 0) cart[idx] = null;
        else cart[idx].qty = raw;
      });

      cart = cart.filter(Boolean);
      setCart(cart);
      renderCart();
    });

    renderCart();
  });

  // repaint if cart changes elsewhere
  window.addEventListener('cart:updated', renderCart);
  window.addEventListener('storage', (e) => { if (e.key === 'cart') renderCart(); });
})();
