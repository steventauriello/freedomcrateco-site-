// assets/js/product.js
(function(){
  // --- Rangemaster 400 block wiring ---
  const imgEl   = document.getElementById('rm400Img');
  const pkgEl   = document.getElementById('rm400Variant');
  const hwEl    = document.getElementById('rm400Hardware');
  const priceEl = document.getElementById('rm400Price');
  const addBtn  = document.getElementById('rm400Add');
  const buyBtn  = document.getElementById('rm400Buy');

  if (!imgEl || !pkgEl || !hwEl) return;

  const fmt = (n) => '$' + Number(n).toFixed(2);
  const KEY = 'fcc-rm400';
  const getPkg = () => pkgEl.options[pkgEl.selectedIndex];
  const getHW  = () => hwEl.options[hwEl.selectedIndex];

  function updateFromSelection(animate=true){
    const opt   = getPkg();
    const img   = opt.dataset.img || imgEl.src;
    const price = Number(opt.dataset.price || '49.99');

    const tmp = new Image();
    tmp.onload = () => { imgEl.src = img; };
    tmp.src = img;

    if (animate){
      const from = Number(String(priceEl.textContent).replace(/[^0-9.]/g,'')) || price;
      const to   = price;
      const t0 = performance.now();
      const step = (t)=>{
        const k = Math.min(1,(t-t0)/160);
        priceEl.textContent = fmt(from + (to-from)*k);
        if (k<1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } else {
      priceEl.textContent = fmt(price);
    }
    saveState();
  }

  function buildSkuNamePrice(){
    const p = getPkg();
    const h = getHW();
    const baseSku = p.dataset.sku || 'RM400-BASE';
    const hwCode  = h.dataset.code || 'STN';
    const sku  = `${baseSku}-${hwCode}`;
    const name = `${p.text} • ${h.text}`;
    const price = Number(p.dataset.price || '49.99');
    return { sku, name, price };
  }

  function addToCartSafe(sku, name, price, qty, meta){
    if (typeof window.addToCart === 'function') return window.addToCart(sku, name, price, qty, meta);
    console.warn('Cart not ready: addToCart() missing');
  }
  function buyNowSafe(sku, name, price, qty, meta){
    if (typeof window.buyNow === 'function') return window.buyNow(sku, name, price, qty, meta);
    console.warn('Cart not ready: buyNow() missing');
  }

  function saveState(){
    try{ localStorage.setItem(KEY, JSON.stringify({ pkg: pkgEl.value, hw: hwEl.value })); }catch(_){}
  }
  function restoreState(){
    try{
      const s = JSON.parse(localStorage.getItem(KEY)||'null');
      if (!s) return;
      if (s.pkg) pkgEl.value = s.pkg;
      if (s.hw)  hwEl.value  = s.hw;
    }catch(_){}
  }

  // Optional: scroll to RM400 when linked with #rm400
  if (location.hash === '#rm400') {
    document.getElementById('rm400Block')?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  restoreState();
  updateFromSelection(false);
  pkgEl.addEventListener('change', ()=> updateFromSelection(true));
  hwEl .addEventListener('change', ()=> saveState());
  addBtn.addEventListener('click', ()=>{
    const { sku, name, price } = buildSkuNamePrice();
    addToCartSafe(sku, name, price, 1, { image: imgEl.src });
  });
  buyBtn.addEventListener('click', ()=>{
    const { sku, name, price } = buildSkuNamePrice();
    buyNowSafe(sku, name, price, 1, { image: imgEl.src });
  });
})();