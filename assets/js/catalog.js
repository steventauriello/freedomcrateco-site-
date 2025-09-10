// assets/js/catalog.js (FIXED)
(function () {
  'use strict';

  const IMAGE_MAP = {
    blank:      'assets/img/blank.jpg',
    army:       'assets/img/army.jpg',
    marines:    'assets/img/marines.jpg',
    navy:       'assets/img/navy.jpg',
    airforce:   'assets/img/airforce.jpg',
    coastguard: 'assets/img/coastguard.jpg'
  };

  function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; }

  async function loadProducts() {
    const res = await fetch('assets/data/products.json', { cache: 'no-cache' });
    const map = await res.json();
    // Convert keyed object to array of products
    return Object.entries(map).map(([sku, p]) => ({ sku, ...p }))
      .filter(p => p.status !== 'hidden');
  }

  function cardHtml(p) {
    if (p.sku === 'FC-CLASSIC') {
      return `
      <article class="product-card" data-sku="${p.sku}" data-product="freedom-crate-classic">
        <img class="product-image" src="${p.image_url || IMAGE_MAP.blank}" alt="${p.title}" />
        <div class="product-body">
          <h3>${p.title}</h3>
          <div class="price">$${Number(p.price).toFixed(2)}</div>
          <label class="mt-1">Branch Stencil</label>
          <select name="branch" class="branch-select">
            <option value="blank">Blank</option>
            <option value="army">U.S. Army</option>
            <option value="marines">U.S. Marines</option>
            <option value="navy">U.S. Navy</option>
            <option value="airforce">U.S. Air Force</option>
            <option value="coastguard">U.S. Coast Guard</option>
          </select>
          <div class="buy-row">
            <button class="btn add-to-cart">Add to Cart</button>
            <button class="btn ghost buy-now">Buy Now</button>
          </div>
        </div>
      </article>`;
    }

    return `
    <article class="product-card" data-sku="${p.sku}">
      <img class="product-image" src="${p.image_url}" alt="${p.title}" />
      <div class="product-body">
        <h3>${p.title}</h3>
        <div class="price">$${Number(p.price).toFixed(2)}</div>
        <div class="buy-row">
          <button class="btn add-to-cart">Add to Cart</button>
          <a class="btn ghost" href="product.html?sku=${encodeURIComponent(p.sku)}">Details</a>
        </div>
      </div>
    </article>`;
  }

  function bindCardEvents(card, p) {
    const price = Number(p.price);

    // Variant preview for Classic
    const branchSel = card.querySelector('.branch-select');
    const imgEl = card.querySelector('.product-image');
    function updateImage() {
      if (!branchSel) return;
      const val = branchSel.value;
      imgEl.src = IMAGE_MAP[val] || IMAGE_MAP.blank;
      imgEl.alt = `${p.title} – ${val}`;
    }
    if (branchSel) {
      branchSel.addEventListener('change', updateImage);
      updateImage();
    }

    // Add to Cart
    const addBtn = card.querySelector('.add-to-cart');
    addBtn?.addEventListener('click', () => {
      const branch = branchSel ? branchSel.value : undefined;
      const meta = { branch, image: imgEl?.src };
      window.addToCart(p.sku + (branch ? '-' + branch : ''), p.title, price, 1, meta);
    });

    // Buy now
    const buyBtn = card.querySelector('.buy-now');
    buyBtn?.addEventListener('click', () => {
      const branch = branchSel ? branchSel.value : undefined;
      const meta = { branch, image: imgEl?.src };
      window.buyNow(p.sku + (branch ? '-' + branch : ''), p.title, price, 1, meta);
    });
  }

  async function render() {
    const container = document.getElementById('catalog');
    if (!container) return;
    const products = await loadProducts();

    // sort active first
    products.sort((a,b) => (a.status === 'active' ? -1 : 1));

    const frag = document.createDocumentFragment();
    products.forEach(p => {
      const card = el(cardHtml(p));
      frag.appendChild(card);
      bindCardEvents(card, p);
    });
    container.innerHTML = '';
    container.appendChild(frag);
  }

  document.addEventListener('DOMContentLoaded', render);
})();
