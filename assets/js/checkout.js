(function(){
  const cart = FC.storage.get('cart', []);
  const tbody = document.getElementById('cartBody');
  const totalEl = document.getElementById('cartTotal');
  const hidden = document.getElementById('cartJson');

  if (tbody && totalEl){
    let total = 0;
    cart.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(item.title)}</td>
                      <td class="num">${item.qty}</td>
                      <td class="num">${FC.formatPrice(item.price)}</td>
                      <td class="num">${FC.formatPrice(item.price * item.qty)}</td>`;
      total += item.price * item.qty;
      tbody.appendChild(tr);
    });
    totalEl.textContent = FC.formatPrice(total);
    hidden.value = JSON.stringify({items: cart, total: total});
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
})();