// assets/js/checkout.js (FIXED)
(function () {
  'use strict';

  const tableSel = 'table.cart-table tbody';
  function fmt(n){ return `$${Number(n||0).toFixed(2)}`; }

  function render() {
    const tbody = document.querySelector(tableSel);
    const totalEl = document.getElementById('cartTotal');
    if (!tbody) return;

    const cart = window.readCart();
    tbody.innerHTML = '';
    let total = 0;

    for (const item of cart) {
      const line = (item.price || 0) * (item.qty || 1);
      total += line;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="row middle">
            ${item.meta?.image ? `<img src="${item.meta.image}" alt="" class="thumb">` : ''}
            <div>
              <div class="bold">${item.name}</div>
              ${item.meta?.branch ? `<div class="muted small">Branch: ${item.meta.branch}</div>` : ''}
            </div>
          </div>
        </td>
        <td><input type="number" min="1" value="${item.qty || 1}" data-key="${item.key}" class="qty-input" /></td>
        <td>${fmt(item.price)}</td>
        <td>${fmt(line)}</td>
        <td><button class="link danger remove" data-key="${item.key}">Remove</button></td>
      `;
      tbody.appendChild(tr);
    }

    if (totalEl) totalEl.textContent = fmt(total);
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: window.cartCount(cart), cart } }));
  }

  function onTableClick(e) {
    const key = e.target?.dataset?.key;
    if (e.target.matches('button.remove')) {
      const cart = window.readCart().filter(i => i.key !== key);
      window.saveCart(cart);
      render();
    }
  }

  function onQtyInput(e) {
    if (!e.target.matches('input.qty-input')) return;
    const key = e.target.dataset.key;
    let val = parseInt(e.target.value, 10);
    if (!Number.isFinite(val) || val < 1) val = 1;
    const cart = window.readCart();
    const idx = cart.findIndex(i => i.key === key);
    if (idx >= 0) {
      cart[idx].qty = val;
      window.saveCart(cart);
      render();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tbl = document.querySelector('table.cart-table');
    if (!tbl) return;
    tbl.addEventListener('click', onTableClick);
    tbl.addEventListener('input', onQtyInput);
    render();
  });
})();
