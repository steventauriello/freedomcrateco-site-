// assets/js/checkout.js
// Minimal + robust: typed qty + "Update Cart" button + Remove button

(function () {
  'use strict';

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

  function renderCart() {
    const body   = document.getElementById('cartBody');
    const totalE = document.getElementById('cartTotal');
    if (!body || !totalE) return;

    const cart = readCart(); // from util.js
    body.innerHTML = '';
    let total = 0;

    if (!cart.length) {
      body.innerHTML = `<tr><td colspan="4" class="muted">Your cart is empty.</td></tr>`;
      totalE.textContent = money(0);
      if (typeof updateCartBadge === 'function') updateCartBadge(0);
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
        <td class="num">
          <input class="qty" type="number" min="1" step="1"
                 inputmode="numeric" pattern="[0-9]*"
                 value="${qty}" style="width:80px;text-align:center" />
        </td>
        <td class="num">${money(price)}</td>
        <td class="num subtotal">${money(sub)}</td>
        <td class="num">
          <button class="remove" type="button" aria-label="Remove item">Remove</button>
        </td>
      `;
      body.appendChild(tr);
    });

    totalE.textContent = money(total);
    if (typeof cartCount === 'function' && typeof updateCartBadge === 'function') {
      updateCartBadge(cartCount(cart));
    }
  }

  // Apply current table inputs to the cart
  function applyTableToCart() {
    const body = document.getElementById('cartBody');
    if (!body) return;

    const rows = Array.from(body.querySelectorAll('tr[data-sku]'));
    const next = [];
    rows.forEach(row => {
      const sku = row.dataset.sku;
      const input = row.querySelector('input.qty');
      const qty = Math.max(1, parseInt(input?.value, 10) || 1);

      // Find matching item in current cart to keep name/price
      const current = readCart();
      const item = current.find(i => i.sku === sku) || { sku };
      next.push({
        sku,
        name: item.name || sku,
        price: Number(item.price || 0),
        qty
      });
    });

    setCart(next);   // from util.js (emits 'cart:updated')
    renderCart();    // repaint
  }

  document.addEventListener('DOMContentLoaded', () => {
    const body = document.getElementById('cartBody');
    const updateBtn = document.getElementById('updateCartBtn');

    // Update Cart button
    updateBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      applyTableToCart();
    });

    // Remove buttons (delegated)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#cartBody .remove');
      if (!btn) return;

      const row = btn.closest('tr[data-sku]');
      const sku = row?.dataset.sku;
      if (!sku) return;

      const next = readCart().filter(i => i.sku !== sku);
      setCart(next);
      renderCart();
    });

    // Initial paint
    renderCart();
  });

  // Keep view in sync if cart changes elsewhere
  window.addEventListener('cart:updated', renderCart);
  window.addEventListener('storage', (e) => { if (e.key === 'cart') renderCart(); });

})();