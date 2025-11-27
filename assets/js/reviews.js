// assets/js/reviews.js
(async function () {
  const listEl = document.getElementById('reviewsList');
  const avgEl = document.getElementById('avgRating');
  const countEl = document.getElementById('reviewCount');
  const starsEl = document.getElementById('avgStars');
  const ldScript = document.getElementById('seo-ld-json');

  if (!listEl || !avgEl || !countEl || !starsEl || !ldScript) return;

    async function loadReviews() {
    try {
      const res = await fetch('/.netlify/functions/fcc-get-reviews', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('Failed to load reviews from fcc-get-reviews', e);
      return [];
    }
  }


  function renderStars(n, max = 5) {
    const wrap = document.createElement('span');
    wrap.className = 'stars';
    for (let i = 1; i <= max; i++) {
      const s = document.createElement('span');
      s.className = 'star' + (i <= Math.round(n) ? ' filled' : '');
      s.setAttribute('aria-hidden', 'true');
      s.textContent = '★';
      wrap.appendChild(s);
    }
    wrap.setAttribute('aria-label', `${n} out of ${max} stars`);
    return wrap;
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  }

  function injectSEO(company, avg, count) {
    const data = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Freedom Crate Co.",
      "url": "https://freedomcrateco.com",
      "image": "https://freedomcrateco.com/assets/img/Logo.png",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": avg.toFixed(2),
        "reviewCount": String(count)
      }
    };
    ldScript.textContent = JSON.stringify(data);
  }

  const reviews = await loadReviews();

  // Sort newest first
  reviews.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Aggregate
  const count = reviews.length;
  const avg = count ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / count) : 0;

  // Summary
  avgEl.textContent = avg.toFixed(1);
  countEl.textContent = count === 1 ? '1 review' : `${count} reviews`;
  starsEl.replaceWith(renderStars(avg));
  injectSEO('Freedom Crate Co.', avg, count);

  // List
  if (!count) {
    listEl.innerHTML = `<div class="card">Be the first to review!</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  for (const r of reviews) {
    const card = document.createElement('article');
    card.className = 'card review';

    const header = document.createElement('div');
    header.className = 'header';

    const left = document.createElement('div');
    left.appendChild(renderStars(r.rating));

    const when = document.createElement('div');
    when.className = 'date';
    when.textContent = fmtDate(r.date);

    header.append(left, when);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = r.name || 'Verified Buyer';

    const product = document.createElement('div');
    product.className = 'product';
    product.textContent = r.product || '';

    const text = document.createElement('p');
    text.textContent = r.text || '';

    card.append(header, name, product, text);

    if (r.photo) {
      const img = document.createElement('img');
      img.className = 'photo';
      img.src = r.photo;
      img.alt = `${r.product || 'Product'} review photo`;
      card.appendChild(img);
    }

    frag.appendChild(card);
  }
  listEl.appendChild(frag);
})();