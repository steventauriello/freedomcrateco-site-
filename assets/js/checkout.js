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
    const qty  = Number(item.qty || 1);
    const price = Number(item.price || 0);
    const sub  = qty * price;
    total += sub;

    const tr = document.createElement('tr');
    tr.dataset.sku = item.sku;

    tr.innerHTML = `
      <td>${escapeHtml(item.name || item.sku)}</td>
      <td>
        <input class="qty" type="number" min="1" value="${qty}" style="width:70px" />
      </td>
      <td>${money(price)}</td>
      <td class="subtotal">${money(sub)}</td>
      <td><button class="remove">Remove</button></td>
    `;

    body.appendChild(tr);
  });

  totalE.textContent = money(total);
  updateCartBadge(cartCount(cart)); // keep the header badge in sync
}

// Handle qty changes and removes
document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('cartBody');
  if (!body) return;

  body.addEventListener('change', (e) => {
    if (!e.target.classList.contains('qty')) return;

    const row = e.target.closest('tr');
    const sku = row?.dataset.sku;
    const qty = Math.max(1, Number(e.target.value || 1));

    let cart = readCart();
    const item = cart.find(i => i.sku === sku);
    if (item) {
      item.qty = qty;
      setCart(cart);   // from util.js (this also dispatches 'cart:updated')
      renderCart();
    }
  });

  body.addEventListener('click', (e) => {
    if (!e.target.classList.contains('remove')) return;

    const row = e.target.closest('tr');
    const sku = row?.dataset.sku;

    let cart = readCart().filter(i => i.sku !== sku);
    setCart(cart);
    renderCart();
  });

  // Initial paint
  renderCart();
});

// Also repaint if something else updates the cart
window.addEventListener('cart:updated', renderCart);
window.addEventListener('storage', (e) => {
  if (e.key === 'cart') renderCart();
});
