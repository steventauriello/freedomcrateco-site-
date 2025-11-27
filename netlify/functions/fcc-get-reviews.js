// netlify/functions/fcc-get-reviews.js

// Same origin list you use in fcc-review
const ALLOW_ORIGINS = [
  'https://freedomcrateco.com',
  'https://www.freedomcrateco.com',
  'https://finalsaluteproject.org',
  'https://www.finalsaluteproject.org',
  'http://localhost:8888',
  'http://localhost:3000'
];

const respond = (status, body, origin) => ({
  statusCode: status,
  headers: {
    'Access-Control-Allow-Origin': origin || '*',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  const origin = ALLOW_ORIGINS.includes(event.headers.origin)
    ? event.headers.origin
    : ALLOW_ORIGINS[0];

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return respond(405, { ok: false, error: 'Method Not Allowed' }, origin);
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[fcc-get-reviews] Missing Supabase env vars.');
    return respond(500, { ok: false, error: 'Server misconfigured' }, origin);
  }

  try {
    // Build Supabase REST URL
    const url = new URL('/rest/v1/product_reviews', SUPABASE_URL);
    url.searchParams.set('select', 'created_at,name,product,rating,text,photo_url');
    url.searchParams.set('is_approved', 'eq.true');
    url.searchParams.set('order', 'created_at.desc');
    url.searchParams.set('limit', '50');

    const res = await fetch(url.toString(), {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json'
      }
    });

    const rows = await res.json().catch(() => []);

    if (!res.ok) {
      console.error('[fcc-get-reviews] Supabase error', res.status, rows);
      return respond(500, { ok: false, error: 'Database error' }, origin);
    }

    // Map Supabase rows into the same shape reviews.js already expects
    const reviews = rows.map((r) => ({
      date: r.created_at,
      name: r.name || null,
      product: r.product || null,
      rating: Number(r.rating || 0),
      text: r.text || '',
      photo: r.photo_url || null
    }));

    return respond(200, reviews, origin);
  } catch (err) {
    console.error('[fcc-get-reviews] Exception', err);
    return respond(500, { ok: false, error: 'Server exception' }, origin);
  }
};
