// assets/js/checkout.js

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
  const cart   = readCart(); // from util.js

  if (!body || !totalE) return;

  body.innerHTML = '';
  let total = 0;

  if (!cart.length) {
    body.innerHTML = `<tr><td colspan="5" class="muted">Your cart is empty.</td></tr>`;
    totalE.textContent = money(0);
    updateCartBadge(cartCount(cart)); // from cart.js
    return;
  }

  cart.forEach(item => {
    const qty   = Number(item.qty || 1);
    const price = Number(item.price || 0);
    const sub   = qty * price;
    total += sub;

    const tr = document.createElement('tr');
    tr.dataset.sku = item.sku;

    tr.innerHTML = `
      <td>${escapeHtml(item.name || item.sku)}</td>

      <td class="qty-cell">
        <button class="qty-dec" type="button" aria-label="Decrease quantity">−</button>
        <input class="qty" type="number" inputmode="numeric" pattern="[0-9]*" min="1" value="${qty}" style="width:70px" />
        <button class="qty-inc" type="button" aria-label="Increase quantity">+</button>
      </td>

      <td>${money(price)}</td>
      <td class="subtotal">${money(sub)}</td>

      <td><button class="remove" type="button">Remove</button></td>
    `;

    body.appendChild(tr);
  });

  totalE.textContent = money(total);
  updateCartBadge(cartCount(cart)); // keep the header badge in sync
}

document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('cartBody');
  if (!body) return;

  // Typing directly in the qty input
  body.addEventListener('change', (e) => {
    if (!e.target.classList.contains('qty')) return;

    const row = e.target.closest('tr');
    const sku = row?.dataset.sku;
    const qty = Math.max(1, Number(e.target.value || 1));

    let cart = readCart();
    const item = cart.find(i => i.sku === sku);
    if (item) {
      item.qty = qty;
      setCart(cart);       // from util.js (dispatches 'cart:updated')
      renderCart();
    }
  });

  // Clicks for + / − / Remove
  body.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const sku = row.dataset.sku;

    let cart = readCart();
    let item = cart.find(i => i.sku === sku);

    if (e.target.classList.contains('qty-inc')) {
      if (item) {
        item.qty = (Number(item.qty) || 1) + 1;
        setCart(cart);
        renderCart();
      }
      return;
    }

    if (e.target.classList.contains('qty-dec')) {
      if (item) {
        item.qty = Math.max(1, (Number(item.qty) || 1) - 1);
        setCart(cart);
        renderCart();
      }
      return;
    }

    if (e.target.classList.contains('remove')) {
      cart = cart.filter(i => i.sku !== sku);
      setCart(cart);
      renderCart();
      return;
    }
  });

  // Initial paint
  renderCart();
});

// Also repaint if something else updates the cart
window.addEventListener('cart:updated', renderCart);
window.addEventListener('storage', (e) => {
  if (e.key === 'cart') renderCart();
});
