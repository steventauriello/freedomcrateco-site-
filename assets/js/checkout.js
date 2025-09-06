// assets/js/checkout.js
// Checkout table + qty +/- + Remove + Update button

(function () {
  'use strict';

  // --- helpers --------------------------------------------------------------

  function money(n) {
    n = Number(n || 0);
    return `$${n.toFixed(2)}`;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // readCart(), setCart() come from util.js
  // cartCount(), updateCartBadge() come from cart.js

  function syncHiddenCart() {
    const hidden = document.getElementById('cartJson');
    if (!hidden) return;
    const cart = readCart();
    const total = cart.reduce((sum, i) =>
      sum + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    hidden.value = JSON.stringify({
      items: cart,
      total: Number(total.toFixed(2))
    });
  }

  // --- renderer -------------------------------------------------------------

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
      const qty   = Math.max(1, Number(item.qty || 1));
      const price = Number(item.price || 0);
      const sub   = qty * price;
      total += sub;

      const tr = document.createElement('tr');
      tr.dataset.sku = item.sku;

      tr.innerHTML = `
        <td>${escapeHtml(item.name || item.sku)}</td>

        <td class="qty-cell">
          <button class="qty-dec" type="button" aria-label="Decrease quantity">−</button>
          <input class="qty" type="number" inputmode="numeric" pattern="[0-9]*"
                 min="1" value="${qty}" style="width:70px" />
          <button class="qty-inc" type="button" aria-label="Increase quantity">+</button>
        </td>

        <td>${money(price)}</td>
        <td class="subtotal">${money(sub)}</td>
        <td><button class="remove" type="button">Remove</button></td>
      `;

      body.appendChild(tr);
    });

    totalE.textContent = money(total);
    updateCartBadge(cartCount(cart)); // header badge
    syncHiddenCart();                 // Netlify hidden field
  }

  // --- events ---------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', () => {
    const body = document.getElementById('cartBody');
    if (!body) return;

    // 1) Typing directly into qty input
    body.addEventListener('change', (e) => {
      const qtyInput = e.target.closest('#cartBody .qty');
      if (!qtyInput) return;

      const row = qtyInput.closest('tr');
      const sku = row?.dataset.sku;
      const qty = Math.max(1, Number(qtyInput.value || 1));

      const cart = readCart();
      const item = cart.find(i => i.sku === sku);
      if (!item) return;

      item.qty = qty;
      setCart(cart);   // persists + emits 'cart:updated'
      renderCart();
    });

    // 2) Clicks for + / − / Remove (robust with .closest)
    document.addEventListener('click', (e) => {
      const incBtn    = e.target.closest('#cartBody .qty-inc');
      const decBtn    = e.target.closest('#cartBody .qty-dec');
      const removeBtn = e.target.closest('#cartBody .remove');

      if (!incBtn && !decBtn && !removeBtn) return;

      const row = e.target.closest('#cartBody tr');
      if (!row) return;
      const sku = row.dataset.sku;

      let cart = readCart();
      let item = cart.find(i => i.sku === sku);

      if (incBtn && item) {
        item.qty = (Number(item.qty) || 1) + 1;
      } else if (decBtn && item) {
        item.qty = Math.max(1, (Number(item.qty) || 1) - 1);
      } else if (removeBtn) {
        cart = cart.filter(i => i.sku !== sku);
      } else {
        return;
      }

      setCart(cart);
      renderCart();
    });

    // 3) Update Cart button (reads every row's qty and saves)
    document.getElementById('updateCartBtn')?.addEventListener('click', () => {
      const rows = document.querySelectorAll('#cartBody tr');
      if (!rows.length) return;

      const cart = readCart();
      rows.forEach(row => {
        const sku = row.dataset.sku;
        const input = row.querySelector('.qty');
        if (!sku || !input) return;
        const item = cart.find(i => i.sku === sku);
        if (item) {
          item.qty = Math.max(1, Number(input.value || 1));
        }
      });

      setCart(cart);
      renderCart();
    });

    // Initial paint
    renderCart();
  });

  // Repaint if something else updates the cart (another tab, addToCart, etc.)
  window.addEventListener('cart:updated', renderCart);
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart') renderCart();
  });
})();