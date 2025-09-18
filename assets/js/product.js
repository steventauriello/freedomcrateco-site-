// assets/js/product.js
(async function () {
  const params  = new URLSearchParams(location.search);
  const sku     = params.get('sku');

  const classic = document.getElementById('classicBlock');
  const dynamic = document.getElementById('dynamicBlock');
  if (!classic || !dynamic) return;

  // If classic or no SKU, show Classic and bail (keeps your dropdown box untouched)
  if (!sku || sku === 'FC-STD-BOX' || sku === 'FC-CLASSIC') {
    classic.hidden = false;
    dynamic.hidden = true;
    return;
  }

  // --- Load product data safely ---
  let p;
  try {
    const res = await fetch('assets/data/products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch failed');
    const products = await res.json();
    p = products[sku];
    if (!p) throw new Error('sku not found');
  } catch (e) {
    // Fallback to Classic (no white screen)
    classic.hidden = false;
    dynamic.hidden = true;
    console.warn('Product load failed:', e);
    return;
  }

  // --- Toggle to dynamic view ---
  classic.hidden = true;
  dynamic.hidden = false;

  // --- Fill text fields ---
  const titleEl = document.getElementById('p-title-2');
  const descEl  = document.getElementById('p-desc-2');
  const priceEl = document.getElementById('p-price-2');
  const gallery = dynamic.querySelector('.gallery');

  titleEl.textContent = p.title || '';
  descEl.textContent  = p.description || '';
  priceEl.textContent = '$' + Number(p.price || 0).toFixed(2);

  // --- Build image list (force image_url first, then the rest de-duped) ---
  let imgs = [];
  if (p.image_url) imgs.push(p.image_url);
  if (Array.isArray(p.images) && p.images.length) imgs.push(...p.images);

  // de-dup while preserving order (prevents double-first image)
  {
    const seen = new Set();
    imgs = imgs.filter(src => src && !seen.has(src) && (seen.add(src), true));
  }

  if (!imgs.length) {
    // No images? Bounce safely.
    classic.hidden = false;
    dynamic.hidden = true;
    return;
  }

  // --- Render gallery (main image + thumb strip) ---
  gallery.innerHTML = `<img src="${imgs[0]}" alt="${p.title}" class="product-hero">`;
  const mainImgEl = gallery.querySelector('img');
  let currentIdx = 0;

  if (imgs.length > 1) {
    const strip = document.createElement('div');
    strip.className = 'thumbs';
    imgs.forEach((src, i) => {
      if (i === 0) return; // don't duplicate main image
      const t = document.createElement('img');
      t.src = src;
      t.alt = '';
      t.addEventListener('click', () => {
        currentIdx = i;
        mainImgEl.src = src;
      });
      t.addEventListener('dblclick', () => openLightbox(i));
      strip.appendChild(t);
    });
    gallery.appendChild(strip);
  }

  // --- Lightbox wiring (uses #lightbox markup already in product.html) ---
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lightboxImg');
  const lbPrev  = lb.querySelector('.prev');
  const lbNext  = lb.querySelector('.next');
  const lbClose = lb.querySelector('.close');
  let lbIndex = 0;

  function openLightbox(i = 0){
    lbIndex = i;
    lbImg.src = imgs[lbIndex];
    lb.classList.add('open');
    lb.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }
  function step(dir){
    lbIndex = (lbIndex + dir + imgs.length) % imgs.length;
    lbImg.src = imgs[lbIndex];
  }

  mainImgEl.style.cursor = 'zoom-in';
  mainImgEl.addEventListener('click', () => openLightbox(currentIdx));
  lbPrev.addEventListener('click', () => step(-1));
  lbNext.addEventListener('click', () => step(1));
  lbClose.addEventListener('click', closeLightbox);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft')  step(-1);
  });

  let startX = null;
  lb.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (startX == null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    startX = null;
  });

  // --- Dynamic Add/Buy wiring (uses your existing cart helpers) ---
  const addBtn2 = document.getElementById('addBtn2');
  const buyBtn2 = document.getElementById('buyBtn2');
  const safe = fn => (typeof fn === 'function') ? fn : () => console.warn('Cart not ready');

  addBtn2?.addEventListener('click', () => {
    safe(window.addToCart)(sku, p.title, Number(p.price || 0), 1, { image: imgs[0] });
  });

  buyBtn2?.addEventListener('click', () => {
    safe(window.buyNow)(sku, p.title, Number(p.price || 0), 1, { image: imgs[0] });
  });
})();

(function(){
  // Elements
  const imgEl   = document.getElementById('rm400Img');
  const pkgEl   = document.getElementById('rm400Variant');
  const hwEl    = document.getElementById('rm400Hardware');
  const priceEl = document.getElementById('rm400Price');
  const addBtn  = document.getElementById('rm400Add');
  const buyBtn  = document.getElementById('rm400Buy');

  if (!imgEl || !pkgEl || !hwEl) return; // RM400 block not on this page

  // Helpers
  const fmt = (n) => '$' + Number(n).toFixed(2);
  const KEY = 'fcc-rm400';
  const getPkg = () => pkgEl.options[pkgEl.selectedIndex];
  const getHW  = () => hwEl.options[hwEl.selectedIndex];

  function updateFromSelection(animate=true){
    const opt   = getPkg();
    const img   = opt.dataset.img || imgEl.src;
    const price = Number(opt.dataset.price || '49.99');

    // swap image (preload for smoothness)
    const tmp = new Image();
    tmp.onload = () => { imgEl.src = img; };
    tmp.src = img;

    // update price
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

  // cart helpers
  function addToCartSafe(sku, name, price, qty, meta){
    if (typeof window.addToCart === 'function') return window.addToCart(sku, name, price, qty, meta);
    console.warn('Cart not ready: addToCart() missing');
  }
  function buyNowSafe(sku, name, price, qty, meta){
    if (typeof window.buyNow === 'function') return window.buyNow(sku, name, price, qty, meta);
    console.warn('Cart not ready: buyNow() missing');
  }

  // state
  function saveState(){
    try{
      localStorage.setItem(KEY, JSON.stringify({
        pkg: pkgEl.value,
        hw:  hwEl.value
      }));
    }catch(_){}
  }
  function restoreState(){
    try{
      const s = JSON.parse(localStorage.getItem(KEY)||'null');
      if (!s) return;
      if (s.pkg) pkgEl.value = s.pkg;
      if (s.hw)  hwEl.value  = s.hw;
    }catch(_){}
  }

  // init
  restoreState();
  updateFromSelection(false);

  // events
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